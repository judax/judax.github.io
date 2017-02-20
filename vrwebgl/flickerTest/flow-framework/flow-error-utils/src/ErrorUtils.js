var FLOW = FLOW || {};

FLOW.ErrorUtils = {
	alertIfError: function() {
		window.addEventListener('error', function(event) {
		    var errorMessage = event.message;
		    var url = event.filename;
		    var lineNumber = event.lineno;
		    var columnNumber = event.colno;
		    alert("ERROR: " + errorMessage + " at " + url + " : " + lineNumber + " : " + columnNumber);
		});
	}
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.ErrorUtils;
}));