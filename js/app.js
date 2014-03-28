window.AVI = window.AVI || {Models: {}, Collections: {}, Views: {}, Routers: {}};
window.util = window.util || {};
window.jQuery = window.jQuery || {};
window._ = window._ || {};
window.Backbone = window.Backbone || {};
(function(window, $, _, Backbone, app, util) {
    
    /**
     * Config
     * TODO: Override backbone ajax with jquery-jsonp
     * TODO: AccountNumbers just 404s on jsonp, no way to tell if it's a server error or no results
     */
    window.DEBUG = false; // Global
    _.templateSettings.variable = "data"; // Namespace for template data
    $.ajaxSetup({cache: true, timeout: 15000}); // Cache ajax requests (used by typeahead)
    app.language = $.cookie("language") || "en";
    
    /**
     * If no CORS support, use jquery-jsonp library for ajax
     */
    Backbone.ajax = function() {
        if( ! $.support.cors && arguments.length) {
            arguments[0].callbackParameter = "callback";
            arguments[0].cache = "true";
            arguments[0].timeout = 15000;
            return Backbone.$.jsonp.apply(Backbone.$, arguments);
        }
        return Backbone.$.ajax.apply(Backbone.$, arguments);
    };
    
    app.Models.Property = Backbone.Model.extend({
        settings: {
            apiHost: "http://services.phila.gov/OPA/v1.0/"
        }
        ,initialize: function(options) {
            this.input = options.input || "";
        }
        ,url: function() {
            return this.settings.apiHost + "account/" + this.input + "?format=json";
        }
        ,parse: function(response, options) {
            var property = response.data.property;
            
            // If proposed valuation has data, use that as the "new value"; otherwise, use valuation history for values
            if( ! _.isEmpty(property.proposed_valuation)) {
                property.new_value = property.proposed_valuation;
                property.previous_value = property.valuation_history[0];
                property.new_value.certification_year = parseInt(property.previous_value.certification_year, 0) + 1; // proposed_valuation has no year field, so we increment from previous_value's
            } else {
                property.new_value = property.valuation_history[0];
                property.previous_value = property.valuation_history[1];
            }
            
            // If previous value year is < 2014 (prior to AVI), divide the values by 32% to get taxable market value
            if(parseInt(property.previous_value.certification_year, 0) < 2014) {
                property.previous_value.land_taxable /= .32;
                property.previous_value.land_exempt /= .32;
                property.previous_value.improvement_taxable /= .32;
                property.previous_value.improvement_exempt /= .32;
            }
            
            // Parse timestamp from API
            property.sales_information.sales_date = parseInt(property.sales_information.sales_date.replace(/[^-\d]/g, ""), 0);
            
            return property;
        }
        //,sync: function(method, collection, options) {
	});
    
    app.Collections.SearchResults = Backbone.Collection.extend({
        settings: {
            apiHost: "http://services.phila.gov/OPA/v1.0/"
            ,skip: 0
            ,limit: 30
        }
        ,initialize: function(models, options) {
            this.method = options.method || "";
            this.input = options.input || "";
            this.skip = this.settings.skip;
            this.limit = this.settings.limit;
        }
        ,url: function() {
            return this.settings.apiHost + this.method + "/" + this.input + "/?format=json&limit=" + this.limit + "&skip=" + this.skip;
        }
        ,parse: function(response, options) {
            this.moreAvailable = response.total > this.length + response.data.properties.length;
            return response.data.properties;
        }
        /**
        * Override sync to return 404 if no records
        */
        ,sync: function(method, collection, options) {
            var collection = this
                ,oldOptions = _.clone(options);
            options.success = function(response, status, options) {
                if(response.status === "error" || response.data.properties === undefined || ! response.data.properties.length) {
                    oldOptions.error({status: 404});
                } else {
                    oldOptions.success(response, options);
                }
            };
            Backbone.sync(method, collection, options);
        }
    });
    
    /**
     * Home/Search View
     * Handles enhanced <select>, form submission
     */
    app.Views.HomeView = Backbone.View.extend({
        className: "home"
        ,initialize: function() {
            _.bindAll(this, "render", "onSubmit", "onChangeLanguage");
            this.template = _.template($("#tmpl-home").html());
            this.title = window.D("app_title");
        }
        ,events: {
            "click #field a": "onChangeBtnGroup"
            ,"click #language a": "onChangeLanguage"
            ,"submit form": "onSubmit"
        }
        ,render: function() {
            this.$el.html(this.template({field: this.options.field || null, input: this.options.input || null, noresults: this.options.noresults || false}));
            return this;
        }
        ,onChangeBtnGroup: function(e) { // TODO: Change type to "number" for account number..or even phone
            e.preventDefault();
            var anchor = $(e.currentTarget)
                ,btnGroup = anchor.parents(".btn-group");
            btnGroup.find(".dropdown-value").text(anchor.text());
            btnGroup.data("value", anchor.data("value"));
            btnGroup.next("[name=\"input\"]").attr("placeholder", anchor.data("placeholder"));
        }
        ,onChangeLanguage: function(e) {
            e.preventDefault();
            var language = $(e.currentTarget).data("value") || "en";
            $.cookie("language", language);
            app.language = language;
            setTimeout(this.render, 10);
        }
        ,onSubmit: function(e) {
            e.preventDefault();
            var field = $("#field").data("value")
                ,inputNode = e.currentTarget.input
                ,input = $.trim(inputNode.value);
            
            input = this.sanitize(input, field);
            
            if(input && field === "actnum") {
                app.router.navigate("view/" + input, {trigger: true});
            } else if(input && field === "address") {
                app.router.navigate("search/" + encodeURIComponent(input), {trigger: true});
            } else {
                $(inputNode).focus(); // If input is empty, focus on it
            }
        }
        ,sanitize: function(input, type) { // TODO: Remove double spaces (should this allow hyphens?)
            return typeof input === "string" ? input.replace(type === "actnum" ? /[^\d]/g : /[^\w\d\s-]/g, "") : "";
        }
    });
    
    /**
     * Property View
     * Renders the property details and handles user calculations
     * TODO: Perhaps estimate() should use a template?
     */
    app.Views.PropertyView = Backbone.View.extend({
        className: "property"
        ,initialize: function() {
            _.bindAll(this, "estimate"/*, "onChangeRate"*/);
            this.template = _.template($("#tmpl-property").html());
        }
        ,events: {
            "click .above button": "showBeneath"
            //,"change #rate": "onChangeRate"
            ,"change #homestead": "estimate"
            //,"change #rate-container": "onChangeRate"
        }
        ,render: function() {
            this.$el.html(this.template({property: this.model.toJSON()}));
            //this.activateSpinner();
            this.estimate();
            this.title = this.model.get("full_address");
            return this;
        }
        /*,activateSpinner: function() {
            this.$("#rate-container").spinner({min: 0, max: 999999, value: 1.3204, step: 0.0001});
        }
        ,onChangeRate: function(e) {
            var newRate = parseFloat(this.$("#rate").val())
                ,button = this.$(".above button");
            if( ! isNaN(newRate) && newRate !== undefined && newRate > 0) {
                //this.$("#slider").slider("option", "value", newRate * 100);
                if(button.hasClass("disabled")) button.removeClass("disabled");
                this.estimate();
            }
        }*/
        ,estimate: function() {
            var marketValue = this.model.get("new_value").market_value
                ,exemptValue = this.model.get("new_value").land_exempt + this.model.get("new_value").improvement_exempt
                ,homestead = parseInt(this.$("#homestead").val(), 0)
                //,rate = parseFloat(this.$("#rate").val())
                ,rate = 1.34
                ,taxableValue = Math.max(0, marketValue - exemptValue - homestead)
                ,tax = Math.max(0, taxableValue * (rate / 100));
            
            // Show taxable market value
            this.$("#taxable-value").text("$" + util.formatNumber(taxableValue));
                
            // Show new tax
            this.$("#tax").text("$" + util.formatNumber(tax, true));
        }
        ,showBeneath: function(e) {
            e.preventDefault();
            if($(e.currentTarget).hasClass("disabled")) {
                if(typeof window.alert === "function") window.alert("Please select a tax rate to estimate");
            } else {
                $(e.currentTarget).parent(".above").addClass("hidden");
            }
        }
    });
    
    /**
     * Search Results View
     * When multiple properties are found for the user's input, this renders a list
     */
    app.Views.SearchResultsView = Backbone.View.extend({
        className: "search-results"
        ,initialize: function() {
            _.bindAll(this, "onClickMore");
            this.template = _.template($("#tmpl-search-results").html());
            this.collection.on("add", this.addRow, this);
            this.title = window.D("multiple_properties_found");
        }
        ,events: {
            "click .more": "onClickMore"
        }
        ,render: function() {
            var list;
            this.$el.html(this.template({searchResults: this.collection.toJSON()}));
            list = this.$("#list");
            this.collection.each(function(model) {
                // TODO: Ideally I'd only call append() once to limit DOM insertions, but how do I append an array of el's?
                list.append((new app.Views.SearchResultsRowView({model: model})).render().el);
            });
            this.checkMoreButton();
            return this;
        }
        ,addRow: function(model) {
            this.$("#list").append((new app.Views.SearchResultsRowView({model: model})).render().el);
            this.checkMoreButton();
        }
        ,onClickMore: function(e) {
            e.preventDefault();
            var button = $(e.currentTarget);
            button.button("loading");
            this.collection.skip = this.collection.skip + this.collection.limit;
            this.collection.fetch({
                remove: false // Add new models to collection instead of replacing
                ,success: function() {
                    button.button("reset");
                }
                ,error: function() {
                    button.button("error");
                }
            })
        }
        ,checkMoreButton: function() {
            this.$(".more").toggle(this.collection.moreAvailable);
        }
    });
    
    /**
     * Search Results Row View
     * The individual row in the list of multiple properties found in a search result
     * Separated in order to add the 'more' button with 'add' events
     */
    app.Views.SearchResultsRowView = Backbone.View.extend({
        tagName: "li"
        ,initialize: function() {
            this.template = _.template($("#tmpl-search-results-row").html()); // This should be done at page load not on initialize
        }
        ,render: function() {
            this.$el.html(this.template({searchResultsRow: this.model.toJSON()}));
            return this;
        }
    })
    
    /**
     * Error View
     * Displayed when there is an ajax error
     */
    app.Views.ErrorView = Backbone.View.extend({
        className: "error"
        ,initialize: function() {
            this.template = _.template($("#tmpl-error").html());
            this.message = this.options.message;
            this.title = window.D("error");
        }
        ,events: {
            "click [rel=\"reload\"]": "reload"
        }
        ,render: function() {
            this.$el.html(this.template({message: this.message || ""}));
            return this;
        }
        ,reload: function(e) {
            e.preventDefault();
            window.location.reload();
        }
    })
    
    /**
     * Application Router
     */
    app.Routers.AppRouter = Backbone.Router.extend({
        routes: {
            "": "home"
            ,"view/:input": "view"
            ,"search/:input": "search"
            ,"*path": "home"
        }
        /**
         * Ensure Google Analytics array has been created
         * Should be done in index.html but just in case
         */
        ,initialize: function() {
            window._gaq = window._gaq || [];
        }
        /**
         * Switch pages while preserving events
         * Also sets title
         * See: http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/
         */
        ,showView: function(view) {
            if(this.currentView) {
                this.currentView.$el.detach();
            }
            $("#main").empty().append(view.render().el);
            document.title = view.title !== undefined && view.title ? view.title : $("title").text();
            this.currentView = view;
            util.scrollToTop();
            this.logPageView();
        }
        /**
         * Landing / Search page
         */
        ,home: function() {
            app.homeView = new app.Views.HomeView();
            this.showView(app.homeView);
        }
        /**
         * View a specific property by OPA Account Number
         * Called when a user enters an Account # or when the address they enter finds one account # from ulrs311
         */
        ,view: function(input) {
            var self = this;
            input = decodeURIComponent(input);
            //app.properties = new app.Collections.Properties(null, {actnum: actnum});
            app.property = new app.Models.Property({input: input});
            util.loading(true);
            app.property.fetch({
                success: function(model, response, options) {
                    util.loading(false);
                    app.propertyView = new app.Views.PropertyView({model: model});
                    self.showView(app.propertyView);
                }
                ,error: function(model, xhr, options) {
                    util.loading(false);
                    self.error(model, xhr, options
                        ,window.D("error_database")
                        ,{field: "actnum", input: input, noresults: true}
                    );
                }
            });
        }
        /**
         * Find an OPA Account Number by address
         * If 1 result, view it; If multiple results, show list
         */
        ,search: function(input) {
            var self = this;
            input = decodeURIComponent(input);
            app.searchResults = new app.Collections.SearchResults(null, {input: input, method: "address"});
            util.loading(true);
            app.searchResults.fetch({
                success: function(collection, response, options) {
                    util.loading(false);
                    if(collection.length === 1) {
                        // If we found 1 account number, view it
                        self.navigate("view/" + collection.at(0).get("account_number"), {trigger: true, replace: true});
                    } else {
                        // If we found multiple account numbers, get the addresses of each
                        //self.multiple(collection.pluck("TopicID"));
                        app.searchResultsView = new app.Views.SearchResultsView({collection: collection});
                        self.showView(app.searchResultsView);
                    }
                }
                ,error: function(collection, xhr, options) {
                    util.loading(false);
                    self.error(collection, xhr, options
                        ,window.D("error_verifying")
                        ,{field: "address", input: input, noresults: true}
                    );
                }
            });
        }
        /**
         * Common error handling. Optionally brings user back to search/home page on a 404 if home404data is provided
         * TODO: Add Google Analytics/Muscula error logging here
         */
        ,error: function(collection, xhr, options, message, home404data) {
            var url = typeof collection.url === "function" ? collection.url() : collection.url;
            this.logError(typeof xhr === "object" && xhr.status !== undefined ? xhr.status : "N/A", url);
            if(typeof home404data === "object" && typeof xhr === "object" && xhr.status >= 400 && xhr.status < 500) {
                app.homeView = new app.Views.HomeView(home404data);
                this.showView(app.homeView);
            } else {
                app.errorView = new app.Views.ErrorView({message: message || window.D("error_generic")});
                this.showView(app.errorView);
            }
        }
        /**
         * Google Analytics, called on every route if on production domain (see initialize)
         */
        ,logPageView: function() {
            var url = Backbone.history.getFragment();
            window._gaq.push(["_trackPageview", "/" + url]);
            if(window.DEBUG) console.log("Google Analytics", url);
        }
        ,logError: function(error, url) {
            window._gaq.push(["_trackEvent", "ErrorCaught", error + "", url]);
            if(window.DEBUG) console.log("Google Analytics Error", error, url);
        }
    });
    
    /**
     * Initiate application
     */
    $(document).ready(function() {
        app.router = new app.Routers.AppRouter();
        Backbone.history.start();
    });
    
})(window, window.jQuery, window._, window.Backbone, window.AVI, window.util);