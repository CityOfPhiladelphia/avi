window.util = window.util || {};
window.jQuery = window.jQuery || {};
window._ = window._ || {};
(function(window, $, _, util) {
    
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
        if(decimals !== undefined) x = x.toFixed(decimals);
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };
    
})(window, window.jQuery, window._, window.util);