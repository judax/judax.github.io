var THREE = THREE || require('three');

var FLOW = FLOW || {};
FLOW.Platform = FLOW.Platform || require('flow-platform');
FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.EventUtils = FLOW.EventUtils || require("flow-event-utils");

/** best to only create one video element and reuse it by setting the source.
 *  NOTE: be sure to add the '?vrwebglvideo' flag to the browser
 * @param params
 * @returns {FLOW.Video}
 * @constructor
 */
FLOW.Video = function(params) {
    FLOW.EventUtils.Observable.call(this);

    this.params =params || {};
    this.source = this.params.source;
    if (! this.source) {
        console.error("no video source provided");
        return this;
    }
    var initialPlayState = false;
    this.isPlaying = initialPlayState;

    /* if (FLOW.Platform.isIOS() ){// Safari needs  the video tag added to the page, not programmatically
     //var video = document.getElementById('video');
     } else {*/
    var video = window.VRWebGLVideo ? new VRWebGLVideo() : document.createElement("video");
    video.autoplay = false;
    // }

    video.oncanplaythrough =this.onCanPlayThrough.bind(this);
    video.onended= this.onEnded.bind(this);

    video.crossOrigin = "anonymous";

    this.video = video;

    this.isInitialBuffering = true;

    this.isMute = false;
    this.volumeBeforeMute = 1.0
    return this;
}


FLOW.OOPUtils.prototypalInheritance(FLOW.Video, FLOW.EventUtils.Observable);

/** NOTE: the VRWebGL will only fire this after the first initial load, while the browser will call it after every seek as well
 *
 */
FLOW.Video.prototype.onCanPlayThrough= function(){
    this.callEventListeners("canplaythrough");
};

FLOW.Video.prototype.onEnded= function(){
    this.callEventListeners("onended");
};

FLOW.Video.prototype.load = function (){
    var r = /[^\/]*$/;
    var path = location.pathname.replace(r, ''); //removes the filename
    path = location.port ? location.hostname +":" +location.port + path: location.hostname +path;
    var URL = location.protocol + "//" + path
    this.video.src = URL + this.source;
  //  alert("video src:" +this.video.src);

    this.video.loop = true;
    this.videoTime = 0;
    this.video.volume = 1.0;

    /* if (Util.isIOS()){
     //TODO: not sure why the below is failing on iOS Safari
     // if (video.hasOwnProperty("webkitPlaysinline")) { //iOS in case it is added to the homescreen and is navigator.standalone
     video.webkitPlaysinline = true;
     }*/


    //var texture = new THREE.VideoTexture( video );
    this.texture = new THREE.Texture(this.video);
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.format = THREE.RGBFormat;

    this.material = this.videoMaterial();

};

FLOW.Video.prototype.unload = function () {
    if (window.VRWebGLVideo ){
        this.video.deleteElement();
    }
}

FLOW.Video.prototype.create360 = function(){
    // Create the sky sphere geometry
    var geometry = new THREE.SphereGeometry(600, 600,600);
    // We're looking at the inside, and it needs another flip on the Y axis if in VRWebGL
    geometry.applyMatrix( new THREE.Matrix4().makeScale( -1, FLOW.Platform.isGear()? -1: 1, 1 ) );

    // And put the geometry and material together into a mesh
    var sphere = new THREE.Mesh(geometry, this.material);
    sphere.rotation.y = -Math.PI / 2;

    return sphere;
};

FLOW.Video.prototype.createQuad = function( width, height) {
    var geometry = new THREE.PlaneGeometry(width, height);

    // And put the geometry and material together into a mesh
    var quad = new THREE.Mesh(geometry, this.material);

    return quad;
};

FLOW.Video.prototype.play = function() {
    if (this.video){
        this.video.play();
        this.isPlaying = true
    }
};

FLOW.Video.prototype.pause = function() {
    if (this.video){
        this.video.pause();
        this.isPlaying = false;
    }
};


FLOW.Video.prototype.setTime = function( newTime ) {
    if (this.video){
        this.video.currentTime = newTime;
    }
};

FLOW.Video.prototype.getTime = function() {
    return this.video.currentTime;
};

FLOW.Video.prototype.getDuration = function() {
    return this.video.duration;
};

FLOW.Video.prototype.mute = function() {
  if (this.video && !this.isMute) {
    this.volumeBeforeMute = this.video.volume;
    this.video.volume = 0;
    this.isMute = true
  }
}

FLOW.Video.prototype.unmute = function() {
  if (this.video && this.isMute) {
    this.video.volume = (this.volumeBeforeMute) ? this.volumeBeforeMute :1.0;
    this.isMute = false
  }
}

FLOW.Video.prototype.increaseVolume = function() {
  if(this.video && this.video.volume < 1.0 ) {
    this.video.volume += 0.05;
    this.video.volume = this.video.volume.toFixed(2);
  }
}

FLOW.Video.prototype.decreaseVolume = function() {
  if(this.video && this.video.volume > 0 ) {
    this.video.volume -= 0.05;
    this.video.volume = this.video.volume.toFixed(2);
  }
}

FLOW.Video.prototype.getVolume = function() {
  if(this.video)
    return this.video.volume;
}

FLOW.Video.prototype.videoMaterial = function(  ) {
    if (! FLOW.Platform.isGear() ) {
        return  new THREE.MeshBasicMaterial({map: this.texture, side: THREE.DoubleSide});
    }

    /***************** MAJOR IMPORTANT NOTE:  **********************************
     * THREEjs must be altered in order for the VRWebGL version to work:
     * change this line inside getSingularSetter = function( type ) {:
     * case 0x8b5e: return setValueT1; // SAMPLER_2D
     *
     * to this:
     *
     * case 0x8b5e: case 36198: return setValueT1; // SAMPLER_2D  // case 36198: ADDED by FLOW
     */

    var vertexShaderSource = [
        'attribute vec3 position;',
        'attribute vec2 uv;',
        '',
        'uniform mat4 modelViewMatrix;',
        'uniform mat4 projectionMatrix;',
        '',
        'varying vec2 vUV;',
        '',
        'void main(void) {',
        '    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '    vUV = uv;',
        '}'
    ];

    var fragmentShaderSource = [
        '#extension GL_OES_EGL_image_external : require',
        'precision mediump float;',
        '',
        'varying vec2 vUV;',
        '',
        'uniform samplerExternalOES map;',
        '',
        'void main(void) {',
        '   gl_FragColor = texture2D(map, vUV);',
        '}'
    ];

    return  new THREE.RawShaderMaterial(   {
        uniforms: {
            map: {type: 't', value: this.texture},
        },
        vertexShader: vertexShaderSource.join( '\r\n' ),
        fragmentShader: fragmentShaderSource.join( '\r\n' ),
        side: THREE.DoubleSide,
    });

};


FLOW.Video.prototype.update = function(){
    // if( this.video.readyState === this.video.HAVE_ENOUGH_DATA ){
    if ( this.texture) {
        this.callEventListeners("progressUpdate",  this.video.currentTime / this.video.duration);
        this.texture.needsUpdate = true;
    }
    // }
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Video;
}));
