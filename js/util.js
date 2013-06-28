window.jQuery = window.jQuery || {};
window._ = window._ || {};
window.AVI = window.AVI || {Models: {}, Collections: {}, Views: {}, Routers: {}};
window.util = window.util || {};
window.dictionary = window.dictionary || {};
(function(window, $, _, app, util, dictionary) {
    
    util.loading = function(status) {
        $("body").toggleClass("loading", status);
    };

    util.scrollToTop = function() {
		$(window).scrollTop(0);
	};
    
    /**
     * Add commas to numbers in thousands place etc.
     * http://stackoverflow.com/a/2901298/633406
     */
    util.formatNumber = function(x, decimals) {
        if(isNaN(x) || x === null) return x;
        if(decimals !== undefined) x = decimals ? Math.round(x * 100) / 100 : Math.round(x);
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };
    
    /**
     * Dictionary function. Keep in global namespace for easy use in templates
     */
    window.D = function(key, replacements) {
        var i, output = dictionary[app.language] && dictionary[app.language][key] ? dictionary[app.language][key] : key;
        if(replacements) {
            if(typeof replacements === "object" && replacements.length) {
                for(i in replacements) {
                    output = output.replace("%s", replacements[i]);
                }
            } else if(typeof replacements === "string") {
                output = output.replace("%s", replacements);
            }
        }
        return output;
    };
    
    util.friendlyDate = function(timestamp) {
        var date = new Date(timestamp);
        return (date.getMonth() + 1) + '/' + date.getDate() + '/' +  date.getFullYear();
    }
    
})(window, window.jQuery, window._, window.AVI, window.util, window.dictionary);