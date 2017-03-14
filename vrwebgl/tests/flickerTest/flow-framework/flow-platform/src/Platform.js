
var FLOW = FLOW || {};

FLOW.Platform = {
    _isCardboard: false,
    _isCarmel: false,

    isGear: function() {
        var isGear = window.VRWebGLRenderingContext;
        return isGear;
    },

    isVive: function( vrDisplay ) {
        var isVive = vrDisplay && vrDisplay.displayName == "HTC Vive DVT";
        return isVive;
    },

    isCardboard : function( value ){
        if (typeof value == "undefined") { return this._isCardboard ;}
        this._isCardboard = value;
    },

    isCarmel: function(vrDisplay){
        if (typeof vrDisplay == "undefined") {return this._isCarmel;}
        this._isCarmel = vrDisplay.displayName.indexOf ( "GearVR" ) != -1;
        return this._isCarmel;
    }

};


(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Platform;
}));