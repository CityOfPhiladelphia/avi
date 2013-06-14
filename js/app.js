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
    
    /**
     * Property Model
     * Calculates 2013 tax
     */
    app.Models.Property = Backbone.Model.extend({
        initialize: function() {
            var value2013market = this.get("value2013market")
                ,extcondition = this.get("extcondition")
                ,extconditionLabel;
            if(value2013market) {
                this.set("tax2013", Math.max(0, (value2013market - this.get("value2013exempt") || 0) * 0.32 * 0.09771));
            }
            // Lookup ext condition value. Small enough table that we can store the values here
            if(extcondition !== undefined) {
                switch(extcondition) {
                    case "0": extconditionLabel = window.D("cond_0"); break;
                    case "1": extconditionLabel = window.D("cond_1"); break;
                    case "2": extconditionLabel = window.D("cond_2"); break;
                    case "3": extconditionLabel = window.D("cond_3"); break;
                    case "4": extconditionLabel = window.D("cond_4"); break;
                    case "5": extconditionLabel = window.D("cond_5"); break;
                    case "6": extconditionLabel = window.D("cond_6"); break;
                    case "7": extconditionLabel = window.D("cond_7"); break;
                    default: extconditionLabel = ""; break;
                }
                this.set("extcondition", extconditionLabel);
            }
        }
    });
    
    /**
     * Properties Collection (ArcGIS)
     * Lookup properties in db by OPA Account Number
     */
    app.Collections.Properties = Backbone.Collection.extend({
        model: app.Models.Property
        ,settings: {
            apiHost: "http://gis.phila.gov/ArcGIS/rest/services/OPA/AVI_2013_2014_ADDL/MapServer/0/query"
            ,params: {
                text: ""
                ,geometry: ""
                ,geometryType: "esriGeometryPoint"
                ,spatialRel: "esriSpatialRelIntersects"
                ,relationParam: ""
                ,objectIds: ""
                ,where: ""
                ,time: ""
                ,returnCountOnly: "false" // Should be string since it's for the URL
                ,returnIdsOnly: "false"
                ,returnGeometry: "false"
                ,maxAllowableOffset: ""
                ,outSR: "" // Would be 4326 if we wanted geometry
                ,outFields: "*"
                ,f: "pjson"
            }
            ,fields: {
                actnum: "ACCT_NUM"
                ,address: "ADDRESS"
                ,unit: "UNIT"
                ,homestead: "HOMESTD_EX"
                ,category: "PROP_CAT"
                ,type: "PROP_TYPE"
                ,stories: "NUM_STOR"
                ,value2013market: "MKTVAL_13"
                ,value2013land: "LANDVAL_13"
                ,value2013imp: "IMPVAL_13"
                ,value2013exempt: "ABAT_EX_13"
                ,value2014market: "MKTVAL_14"
                ,value2014land: "LANDVAL_14"
                ,value2014imp: "IMPVAL_14"
                ,value2014exempt: "ABAT_EX_14"
                // Property lookup fields
                ,owner1: "OWNR_NAM"
                ,owner2: "SECD_NAME"
                ,zip: "PLOC_ZIP5"
                ,landarea: "PLOTAREA"
                ,imparea: "TOTDWELLAREA"
                ,beginpoint: "DIST_FROM"
                ,extcondition: "EXTCOND"
                ,zoning: "ZONE_"
                ,saledate: "TITL_DATE"
                ,saleprice: "SALE_PRICE"
            }
        }
        ,initialize: function(models, options) {
            this.actnum = options.actnum || null;
            this.offset = 0;
            this.limit = 30;
            this.moreAvailable = false;
        }
        /**
         * Generate URL
         * If actnum is an array, use BRT_ID IN ('xxx','xxx','xxx') and only get basic fields; otherwise use BRT_ID = 'xxx' and get all fields
         */
        ,url: function() {
            var data = _.clone(this.settings.params);
            if(typeof this.actnum === "object" && this.actnum.length) {
                var searchList = this.actnum.slice(this.offset, this.offset + this.limit);
                this.moreAvailable = this.actnum.length > this.offset + this.limit ? true : false;
                
                data.where = this.settings.fields.actnum + " IN ('" + searchList.join("','") + "')";
                data.outFields = [this.settings.fields.actnum, this.settings.fields.address, this.settings.fields.unit].join(",");
            } else {
                data.where = this.settings.fields.actnum + " = '" + this.actnum + "'";
            }
            return this.settings.apiHost + "?" + $.param(data);
        }
        /**
        * Override sync to test if response has an error because the API always returns status 200 with jsonp
        */
        ,sync: function(method, collection, options) {
            var oldOptions = _.clone(options);
            options.success = function(collection, response, options) {
                if(response.error !== undefined) {
                    oldOptions.error(collection, {status: response.error.code, responseText: response.error.message}, options);
                } else if(response.features === undefined || ! response.features.length) {
                    oldOptions.error(collection, {status: 404}, options);
                } else {
                    oldOptions.success(collection, response, options);
                }
            };
            Backbone.sync(method, collection, options);
        }
        /**
         * Return attributes property and change keys to our own
         * Changing the keys isn't necessary but we're already looping and this helps the app remain somewhat API agnostic
         */
        ,parse: function(response) {
            var self = this
                ,newRows = [];
            _.each(response.features, function(feature) {
                var newRow = {};
                _.each(self.settings.fields, function(val, key) {
                    newRow[key] = feature.attributes[val] !== undefined ? feature.attributes[val] : null;
                });
                newRows.push(newRow);
            });
            return newRows;
        }
    });
    
    /**
     * Account Numbers Collection
     * Lookup OPA Account Number by Address in ulrs311 web service
     */
    app.Collections.AccountNumbers = Backbone.Collection.extend({
        url: function() { return "http://services.phila.gov/ulrs311/data/opakey/" + this.input || ""; }
        ,input: null
        ,initialize: function(models, options) {
            this.input = options.input || null;
        }
        /**
        * Override sync to return 404 if no records
        */
        ,sync: function(method, collection, options) {
            var oldOptions = _.clone(options);
            options.success = function(collection, response, options) {
                if(response.TopicKeys === undefined || ! response.TopicKeys.length) {
                    oldOptions.error(collection, {status: 404}, options);
                } else {
                    oldOptions.success(collection, response, options);
                }
            };
            Backbone.sync(method, collection, options);
        }
        ,parse: function(response, options) {
            return response.TopicKeys;
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
            _.bindAll(this, "estimate");
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
            this.title = this.model.get("address");
            return this;
        }
        /*,activateSlider: function() {
            var sliderNode = this.$("#slider")
                ,rateNode = this.$("#rate")
                ,self = this;
            sliderNode.slider({
                orientation: "horizontal",
                range: "min",
                min: 0,
                max: 250,
                value: 0,
                slide: function (event, ui) {
                    rateNode.val(ui.value / 100);
                    self.estimate();
                    self.$(".above button").removeClass("disabled");
                }
            });
            rateNode.val(sliderNode.slider("value") / 100);
            
        }*/
        /*,activateSpinner: function() {
            this.$("#rate-container").spinner({min: 0, max: 9999, value: 1.34, step: 0.01});
        }
        ,incrementDecrement: function(e) {
            //e.preventDefault();
            var rateNode = this.$("#rate")
                ,rate = parseFloat(rateNode.val()) || 0
                ,buttonNode = $(e.currentTarget)
                ,step = buttonNode.data("step")
                ,delta = buttonNode.hasClass("decrement") ? step * -1 : step
                ,button = this.$(".above button");
            rateNode.val(Math.max(0, rate + delta).toFixed(2));
            
            if(button.hasClass("disabled")) button.removeClass("disabled");
            
            this.estimate();
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
        /*,activateTooltip: function() {
            this.$("[rel=\"tooltip\"]").tooltip();
        }*/
        ,estimate: function() {
            var marketValue = this.model.get("value2014market")
                ,exemptValue = this.model.get("value2014exempt")
                ,homestead = parseInt(this.$("#homestead").val(), 0)
                //,rate = parseFloat(this.$("#rate").val())
                ,rate = 1.34
                ,taxableValue = marketValue - exemptValue - homestead
                ,tax = Math.max(0, taxableValue * (rate / 100));
            
            // Show taxable market value
            this.$("#taxable-value").text("$" + util.formatNumber(taxableValue));
                
            // Show new tax
            this.$("#tax").text("$" + util.formatNumber(tax, 2));
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
     * Properties View
     * When multiple properties are found for the user's input, this renders a list
     */
    app.Views.PropertiesView = Backbone.View.extend({
        className: "properties"
        ,initialize: function() {
            _.bindAll(this, "onClickMore");
            this.template = _.template($("#tmpl-properties").html());
            this.collection.on("add", this.addRow, this);
            this.title = window.D("multiple_properties_found");
        }
        ,events: {
            "click .more": "onClickMore"
        }
        ,render: function() {
            var list;
            this.$el.html(this.template({properties: this.collection.toJSON()}));
            list = this.$("#list");
            this.collection.each(function(model) {
                // TODO: Ideally I'd only call append() once to limit DOM insertions, but how do I append an array of el's?
                list.append((new app.Views.PropertiesRowView({model: model})).render().el);
            });
            this.checkMoreButton();
            return this;
        }
        ,addRow: function(model) {
            this.$("#list").append((new app.Views.PropertiesRowView({model: model})).render().el);
            this.checkMoreButton();
        }
        ,onClickMore: function(e) {
            e.preventDefault();
            var button = $(e.currentTarget);
            button.button("loading");
            this.collection.offset = this.collection.offset + this.collection.limit;
            this.collection.fetch({
                update: true // Not sure why properties collection is being *replaced* with these, but it doesn't really matter
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
     * Property Row View
     * The individual row in the list of multiple properties found in a search result
     * Separated in order to add the 'more' button with 'add' events
     */
    app.Views.PropertiesRowView = Backbone.View.extend({
        tagName: "li"
        ,initialize: function() {
            this.template = _.template($("#tmpl-properties-row").html());
        }
        ,render: function() {
            this.$el.html(this.template({property: this.model.toJSON()}));
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
            ,"view/:actnum": "view"
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
        ,view: function(actnum) {
            var self = this;
            actnum = decodeURIComponent(actnum);
            app.properties = new app.Collections.Properties(null, {actnum: actnum});
            util.loading(true);
            app.properties.fetch({
                success: function(collection, response, options) {
                    util.loading(false);
                    app.propertyView = new app.Views.PropertyView({model: collection.at(0)});
                    self.showView(app.propertyView);
                }
                ,error: function(collection, xhr, options) {
                    util.loading(false);
                    self.error(collection, xhr, options
                        ,window.D("error_database")
                        ,{field: "actnum", input: actnum, noresults: true}
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
            app.accountNumbers = new app.Collections.AccountNumbers(null, {input: input});
            util.loading(true);
            app.accountNumbers.fetch({
                success: function(collection, response, options) {
                    if(collection.length === 1) {
                        // If we found 1 account number, view it
                        self.navigate("view/" + collection.at(0).get("TopicID"), {trigger: true, replace: true});
                    } else {
                        // If we found multiple account numbers, get the addresses of each
                        self.multiple(collection.pluck("TopicID"));
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
         * Address search produced multiple account numbers, so fetch their addresses and show the user a list
         * Takes an array of account number strings. Called internally, not by a route.
         */
        ,multiple: function(accountNumbers) {
            var self = this;
            app.properties = new app.Collections.Properties(null, {actnum: accountNumbers});
            util.loading(true);
            app.properties.fetch({
                success: function(collection, response, options) {
                    util.loading(false);
                    // We'll assume we never get a length of 1 from ArcGIS if ulrs311 gives us multiple account numbers
                    app.propertiesView = new app.Views.PropertiesView({collection: collection});
                    self.showView(app.propertiesView);
                }
                ,error: function(collection, xhr, options) {
                    util.loading(false);
                    self.error(collection, xhr, options
                        ,window.D("error_database")
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
            this.logError(xhr.status || "N/A", url);
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