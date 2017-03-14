var THREE = THREE || require('three');


var FLOW = FLOW || {};
/**
 * Textures is used to initialize/load textures at startup for runtime smoothness and texture reuse.
 *
 * This is implemented as a singleton
 *
 * @constructor
 */
FLOW.Textures = function(  ) {
    this.textures = {};
    return this;
};

FLOW.Textures.getInstance = function() {
    if (! window.textures){
        window.textures = new FLOW.Textures();
    }
    return window.textures;
}

FLOW.Textures.prototype.parseTextures= function( texture, typeParams, callback ) {
    if ( texture) {
        this.textures[ texture ] = null;
    }

    if (typeParams) { //this typically comes from a ForceDirectedGraph
        for (var i = 0; i < typeParams.length; i++) {
            if (typeParams[i].params.hasOwnProperty("backgroundTexture")) {
                var theTexture = typeParams[i].params.backgroundTexture;
                if (! this.textures[theTexture]) {
                    this.textures[theTexture] = null;
                }
            }
        }
    }

    for (var item in this.textures){
        if (! this.textures[item] ){
            this.textures[item] = this.createTexture("graphics/" + item, callback);
        }
    }

    return this;
};


// this creates the reusable textures that the ForceGraph or the MultiText uses behind blocks of text.
FLOW.Textures.prototype.createTexture = function( imagePath, onLoad) {
    var textureHolder = {};
    var loader = new THREE.TextureLoader();
    textureHolder.map = loader.load( //assign this to the textureHolder
        // resource URL
        imagePath,
        // Function when resource is loaded
        function ( image ) {
            var backgroundTexture = image;
            backgroundTexture.needsUpdate = true;
            if (onLoad !== undefined){
                onLoad();
            }
        }
    );
    loader.premultiplyAlpha = false;

    return textureHolder;
};

FLOW.Textures.prototype.getTexture = function(textureName) {
    return this.textures[textureName];
};


(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Textures;
}));




