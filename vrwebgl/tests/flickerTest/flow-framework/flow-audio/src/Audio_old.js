var THREE = THREE || require('three');

/**
 * AudioManager system functions.
 *
 * This handles all the audio  functionality
 *
 *
 * created by Jason Marsh for Flow  http://flow.gl
 */
var AudioManager = function() {
    this.masterGainNode = null;
    this.audioContext= null; //contains the AudioContext
    this.audioBasePath = "../../flow-resources/sfx";
    this.audioFileExtension = "wav";

    this.isEC3supported = false;
    this.isAudioContextSupported = false;
    this.surroundSound = true;//false;
    this.usePositionalPanner = true; // will be set to false if EC3is supported
    this.useHrtf = false; //If true, then use the HRTF file instead of the audioContext positional panner
    this.hrtfContainer = null;

    this.tracks = [];

    this.isAudioLoaded = false;

    this.checkAudioCompatibility();

    this.initializeAudio();
    return this;
}

AudioManager.prototype.checkAudioCompatibility = function() {
    var contextClass = (window.AudioContext ||
    window.webkitAudioContext ||
    window.oAudioContext ||
    window.msAudioContext);
    if (!contextClass) {
        // Web AudioAPI is not available.
        alert("This browser won't work! Multichannel audio is not available with this browser. \n\n" +
            "Try the following browsers: \n" +
            '    Desktop: Edge, Chrome, Firefox, Opera, Safari \n ' +
            '    Mobile: Android Firefox Mobile, Firefox OS, Chrome for Android. ');
        this.isAudioContextSupported = false;
        this.isEC3supported = false;
        return;
    }
    this.isAudioContextSupported = true;
}


AudioManager.prototype.initializeAudio = function() {
    if (this.audioContext) {
        console.error("Do not call initializeAudio() more than once!");
        return;
    }

    if (window.hasOwnProperty('AudioContext')) {
        this.audioContext = new AudioContext();
    } else if (window.hasOwnProperty('webkitAudioContext')) {
        this.audioContext = new webkitAudioContext();
    } else if (window.hasOwnProperty('oAudioContext')) { //Not sure I need this
        this.audioContext = new oAudioContext();
    } else if (window.hasOwnProperty('msAudioContext')) { //Not sure I need this
        this.audioContext = new msAudioContext();
    }
    if (!this.audioContext) {
        console.error("AudioContext not supported by this browser.");
        return;
    }

    //builds up the audio node connections from the final mix backwards
    var finalMixNode;
    finalMixNode = this.audioContext.destination;
    //console.log("maxChannelCount:" + audioContext.destination.maxChannelCount);

    if (this.surroundSound ) {
        if ( this.audioContext.destination.maxChannelCount >= 6) {
            this.audioContext.destination.channelCount = 6;
        }
        this.splitter = this.audioContext.createChannelSplitter(5);

        this.merger = this.audioContext.createChannelMerger(5);
        /*

         // Reduce the volume of the left channel only
         var gain = this.audioContext.createGain();
         gain.value = 0.5;
         this.splitter.connect(gain, 0);

         // Connect the splitter back to the second input of the merger: we
         // effectively swap the channels, here, reversing the stereo image.
         gain.connect(merger, 0, 1);
         splitter.connect(merger, 1, 0);


         */

        // Because we have used a ChannelMergerNode, we now have a stereo
        // MediaStream we can use to pipe the Web Audio graph to WebRTC,
        // MediaRecorder, etc.
        this.merger.connect(finalMixNode);
    }
    this.masterGainNode = finalMixNode;
    //Adds in a delay to get the visualization to sync up with the audio
    /*var delayNode = audioContext.createDelay(0.2);
     delayNode.connect(finalMixNode);*/

    this.setListenerPosition({x: 0, y: 0, z: 0});

    // Creates master volume.
    // for now, the master volume is static, but in the future there will be a slider
    /* masterGainNode = audioContext.createGain();
     masterGainNode.gain.value = 0.9; // reduce overall volume to avoid clipping
     masterGainNode.connect(fillMixNode); // for use with delay*/
    if (this.usePositionalPanner && this.useHrtf) {
        this.initializeHRTF();
    }
}


AudioManager.prototype.initializeHRTF = function() {
    // load hrir to the container
    this.hrtfContainer = new HRTFContainer();
    this.hrtfContainer.loadHrir("libs/hrtf/hrir/kemar_L.bin");
}

AudioManager.prototype.setListenerPosition = function(p) {
    if (this.usePositionalPanner) {
        if (this.useHrtf) {
            //TODO: put the user back in space correctly, and allow the user to move
            //currently managed in the update loop... is this good enough?
        } else {
            this.audioContext.listener.setPosition(p.x, p.y, p.z);
        }
    }
}


AudioManager.prototype.setUserOrientation= function( camera ) {

    // get the camera's front vector, i. e. its world direction
    var cameraDirection = camera.getWorldDirection();

    // apply some three.js trick to obtain the camera's top vector
    var cameraTop = new THREE.Vector3(0,1,0).applyEuler(camera.getWorldRotation());

    // set the listener's orientation with front and top vector
    this.audioContext.listener.setOrientation(cameraDirection.x, cameraDirection.y, cameraDirection.z, cameraTop.x, cameraTop.y, cameraTop.z);

}

AudioManager.prototype.stopAllAudio = function() {
    for (var i = 0; i < this.tracks.length; i++) {
        this.tracks[i].stopClip();
    }
}


var AudioTrack = function (audio, params) {
    this.audio = audio;
    /*
     if (!audioContext) {
     initializeAudio();
     }*/

    this.name = params.name || "";
    this.isLooped = params.looped || false;
    this.spatialize = params.spatialize || false;
    this.hasVolumeControl = params.hasVolumeControl || false;

    this.isPlaying = false;

    this.bufferSource = null; //The bufferSource can only be created when it is time to play the clip

    return this;
}



AudioTrack.prototype.playClip = function (buffer, clipTime, position, volume) {
    this.prepareClip(buffer, position, volume);
    this.startClip( clipTime);
}

AudioTrack.prototype.prepareClip = function (buffer, position, volume) {

    if (this.isPlaying && ( this.bufferSource !== undefined && this.bufferSource != null)) {

        try {
            var trackBuffer = this.bufferSource;

            trackBuffer.stop(trackBuffer.context.currentTime + 1);// TODO: safari complains if no arg is passed

        } catch (e) {
            console.log(" THAT ERROR: " + e)
        }
        ;
    }


    this.isPlaying = true;
    this.bufferSource = this.audio.audioContext.createBufferSource();
    this.bufferSource.buffer = buffer;
    this.bufferSource.loop = this.isLooped;

    if ( this.audio.surroundSound) {
        //this.gainNode = this.audio.audioContext.createGain();
        this.bufferSource.connect(this.audio.splitter);
        this.audio.splitter.connect( this.audio.merger, 0, 0);
        this.audio.splitter.connect( this.audio.merger, 1, 1);
        this.audio.splitter.connect( this.audio.merger, 0, 2);
        this.audio.splitter.connect( this.audio.merger, 1, 3);
        this.audio.splitter.connect( this.audio.merger, 0, 4);
        this.audio.splitter.connect( this.audio.merger, 1, 4);

        return;
    } else {
        if (this.spatialize || this.hasVolumeControl) {
            this.gainNode = this.audio.audioContext.createGain();
            this.bufferSource.connect(this.gainNode);
        }
    }
    if (this.spatialize) {

        if (this.audio.useHrtf) {
            this.gainNode.gain.value = 0.5;
            // create new hrtf panner, source node gets connected automatically
            this.hrtfPanner = new HRTFPanner(this.audio.audioContext, this.gainNode, this.audio.hrtfContainer);

            // connect the panner to the destination node
            this.hrtfPanner.connect(this.audio.audioContext.destination);

        } else {
            // Connect the sound source to the volume control.
            this.panner = this.audio.audioContext.createPanner();
            this.panner.refDistance = 2;
            this.panner.panningModel = "HRTF"; //uses the high-quality panner
            if (!position) {
                position = {x: 0, y: 0, z: 0};
            }
            console.log( "prepareClip: " + this.name + " " + position.x );
            this.panner.setPosition(position.x, position.y, position.z);

            // Instead of hooking up the volume to the main volume, hook it up to the panner.
            this.gainNode.connect(this.panner);

            // And hook up the panner to the main volume.
            this.panner.connect(this.audio.masterGainNode);

        }
    } else {
        if (this.hasVolumeControl && typeof volume !== "undefined") {
            this.gainNode.connect(this.audio.masterGainNode);
            this.gainNode.gain.value = volume;
        } else {
            this.bufferSource.connect(this.audio.masterGainNode);
        }
    }
}

AudioTrack.prototype.setVolume = function( vol ) {
    if (this.gainNode) {
        this.gainNode.gain.value = vol;
    }
}

AudioTrack.prototype.startClip = function ( clipTime) {
    if (!clipTime) {
        clipTime = 0;
    }
    this.bufferSource.start(clipTime);
}


AudioTrack.prototype.stopClip = function (buffer) {
    this.isPlaying = false;
    if (this.bufferSource !== undefined && this.bufferSource !== null) {
        try {
            var trackBuffer = this.bufferSource;
            trackBuffer.stop(this.audio.audioContext.currentTime + 1);// TODO: safari complains if no arg is passed
        } catch (e) {
            console.log(" THAT ERROR- stopClip: " + e)
        }
    }
}


AudioTrack.prototype.fadeClip = function (buffer) {
    this.isPlaying = false;
    if (this.bufferSource !== undefined && this.bufferSource !== null) {
        try {
            var trackBuffer = this.bufferSource;
            console.log( "fading " + this.name +" at " + this.audio.audioContext.currentTime )
            if (this.gainNode) {
                this.gainNode.gain.exponentialRampToValueAtTime(0.01, this.audio.audioContext.currentTime + 2);
            }
            trackBuffer.stop(this.audio.audioContext.currentTime + 2.1);// TODO: safari complains if no arg is passed
        } catch (e) {
            console.log(" THAT ERROR- fadeClip: " + e)
        }
    }
}


;
/**
 * if using the HRTFPanner we have to update the position on each frame
 * Position coordinates should already include consideration of the camera position and orientation
 */
AudioTrack.prototype.updateHrtf = function (x, y, z) {
    if (!this.audio.useHrtf) {
        return;
    }
    if (!this.priorHRTFUpdateTime) {
        this.priorHRTFUpdateTime = this.audio.audioContext.currentTime - 0.100;
    }
    if (this.audio.audioContext.currentTime > this.priorHRTFUpdateTime + 0.10) { //only update the hrtf if more than 100  milleseconds have passed
        var cords = cartesianToInteraural(x, z, y);
        this.hrtfPanner.update(cords.azm, cords.elv);
        this.priorHRTFUpdateTime = this.audio.audioContext.currentTime;
    }

}


/**
 * An AudioVisualizer brings together the AudioTrack track,  the currently
 * playing audioClip on that track, the 3D Object, the Shader on the 3D Object,
 * and the keyframed Animation for the 3DObject
 *
 * @param params
 * @returns {AudioVisualizer}
 * @constructor
 */
var AudioVisualizer = function (audio, params) {
    this.audio = audio;

    params = params || {};
    if (!params.name) {
        throw ("new AudioVisualizer: AudioVisualizer object cannot be created without name.");
        return;
    }
    this.name = params.name;
    this.audioTrack = new AudioTrack(params);
    this.shader = new Shader(params);
    this.animation = params.animation;
    this.duration = params.duration;
    this.initialClipName = params.initialClipName;
    this.currentClip = null;//which AudioClip is currently playing
    this.clipSelectionIndex = -1;
    this.progressBar = null; // when a selection is made via a Picker, we show a progress bar countdown until the sound starts
    this.progressBarObj = null;// the glam Object for teh progress bar
    this.createVisualizer();
    this.isGazedOver = false;
    return this;
}

AudioVisualizer.prototype.createVisualizer = function () {
    this.analyzer = this.audio.audioContext.createAnalyser();
    this.audioProcessor = this.audio.audioContext.createScriptProcessor(2048, 1, 1);
    ;
    this.volume = 1.0;

    // connects to destination in the playClip() routine
    this.audioProcessor.connect(this.audio.masterGainNode);

    this.analyzer.smoothingTimeConstant = 0.3;
    this.analyzer.fftSize = 1024;

    // setup an analyzer
    this.analyzer.connect(this.audioProcessor);

    var that = this;
    // when the javascript node is called
    // we use information from the analyzer node
    // to draw the volume
    this.audioProcessor.onaudioprocess = function () {
        if (!that.audioTrack || (that.audioTrack && !that.audioTrack.isPlaying)) {
            that.volume = 0;
            return;
        }
        // get the average, bincount is fftsize / 2
        var array = new Uint8Array(that.analyzer.frequencyBinCount);
        that.analyzer.getByteFrequencyData(array);
        that.volume = AudioVisualizer._getAverageVolume(array);
    }

    this.trackObj = null;//once the graphics get created, drop the glam obj into here
}

AudioVisualizer.prototype.update = function (time) {
    this.shader.uniforms.params.time.value = time * 0.001;
    if (this.isHighlighted) {
        this.shader.uniforms.params.amplitude.value = 2;
    } else {
        this.shader.uniforms.params.amplitude.value = AudioVisualizer._rescaleValues(0, 22, 0.1, 1, this.volume);
    }
    //console.log(this.volume + ", " + rescaleValues(0, 22, 0,1, this.volume));
    if (this.audio.usePositionalPanner) {

        if (this.trackObj) {
            // Get the object's position in world coordinates
            var visual = this.trackObj.getComponent(glam.Visual);
            visual.object.updateMatrixWorld();
            var pos = new THREE.Vector3();
            pos.setFromMatrixPosition(visual.object.matrixWorld);

            // And copy the position over to the sound of the object.
            if (this.audioTrack.panner) {
                this.audioTrack.panner.setPosition(pos.x, pos.y, pos.z);
            } else if (this.audioTrack.hrtfPanner) {
                //Adds in the camera position and orientation
                camera.object.matrixWorldInverse.getInverse(camera.object.matrixWorld);
                pos.applyMatrix4(camera.object.matrixWorldInverse);

                this.audioTrack.updateHrtf(pos.x, pos.y, pos.z);
            }
        }
    }


}


/**
 * Given a range from oldMin to oldMax, remap a value to the range newMin to newMax
 *
 * @param originalMin
 * @param originalMax
 * @param newMin
 * @param newMax
 * @param originalValue
 * @returns newValue Scaled proportionally
 */
AudioVisualizer._rescaleValues = function(originalMin, originalMax, newMin, newMax, originalValue) {
    var originalRange = (originalMax - originalMin);
    if (originalRange == 0) {//maintain hard zero
        var newValue = newMin;
    } else {
        var newRange = (newMax - newMin);
        newValue = (((originalValue - originalMin) * newRange) / originalRange) + newMin;
    }
    return newValue;
}

AudioManager.prototype.setTrackPosition = function( trackName, position) {
    var theTrack = this.findTrack(trackName);
    console.log(trackName + ": " +position.x +", " + position.y  +", " +  position.z )
    theTrack.panner.setPosition(position.x, position.y, position.z);
}

AudioManager.prototype.findTrack = function(name) {
//function findAudioVisualizer(name) {
    for (var i = 0; i < this.tracks.length; i++) {
        if (this.tracks[i].name == name) {
            return this.tracks[i];
        }
    }

    return null;
}

AudioManager.prototype.playClipByName = function(trackName, clipKit, name, clipTime, volume) {
    console.log( " play : " + trackName);
    var audioTrack = this.findTrack( trackName );
    var clip = clipKit.findClip( name );
    audioTrack.prepareClip(clip.buffer, 0, volume);
    //audioTrack.bufferSource.connect(this.analyzer, 0, 0);
    audioTrack.startClip( clipTime);
}


AudioManager.prototype.fadeClipByName = function(trackName, clipKit, name, clipTime, volume) {
    var audioTrack = this.findTrack( trackName );
    var clip = clipKit.findClip( name );
    audioTrack.fadeClip(clip.buffer);
}


AudioManager.prototype.startClipByName = function(trackName, clipKit, name, clipTime, volume) {
    var audioTrack = this.findTrack( trackName );
    var clip = clipKit.findClip( name );
    audioTrack.setVolume(volume);
    audioTrack.startClip( clipTime);
}

AudioManager.prototype.stopClipByName = function(trackName, clipKit, name) {
    var audioTrack = this.findTrack( trackName );
    var clip = clipKit.findClip( name );
    audioTrack.stopClip( );
}



AudioVisualizer.prototype.playClip = function (buffer, clipTime) {

    this.audioTrack.prepareClip(buffer, clipTime);
    this.audioTrack.bufferSource.connect(this.analyzer, 0, 0);
    this.audioTrack.startClip(buffer, clipTime);

}

AudioVisualizer.prototype.stopClip = function () {
    this.audioTrack.stopClip();
    this.volume = 0;

}


AudioVisualizer._getAverageVolume = function(array) {
    var values = 0;
    var average;

    var length = array.length;

    // get all the frequency amplitudes
    for (var i = 0; i < length; i++) {
        values += array[i];
    }

    average = values / length;
    return average;
}


var AudioClip = function (params) {
    this.params = params || {};
    this.name = params.name;
    this.file = params.file; //the filename without path or extension
    this.track = params.track;

    this.buffer = null; //this will be filled by the AudioClipKit as it loads a buffer //TODO: refactor to have AudioClip handle more of theese functions

    //TODO: only create this tube once
    //  createMotionPath(this);
}

/**
 *  The AudioClipKit manages a kit (think drumkit) of clips available to swap in and out of an AudioTrack
 *
 * @param name
 * @param clips
 * @constructor
 */
var AudioClipKit = function (audioManager, name, clips) {
    this.audio = audioManager;

    this.audioBasePath =this.audio.audioBasePath;
    this.audioFileExtension = this.audio.audioFileExtension
    this.name = name;
    this.clips = clips;
    this.numInstruments = this.clips.length;

    var i, len = this.clips.length;
    for (i = 0; i < len; i++) {
        this.clips[i].buffer = null;
        this.clips[i].mp3ForABbuffer = null;
    }

    this.startedLoading = false;
    this.isLoaded = false;
    this.instrumentLoadCount = 0;
}

AudioClipKit.prototype.pathName = function () {
    return this.audioBasePath + "/";
};

AudioClipKit.prototype.fileExtension = function () {
    return "." + this.audioFileExtension;
}

AudioClipKit.prototype.load = function (onLoaded, onProgress) {
    if (this.startedLoading) {
        return;
    }

    this.startedLoading = true;

    var i, len = this.clips.length;
    for (i = 0; i < len; i++) {
        console.log("loadSample: " + this.pathName() + this.clips[i].file + this.fileExtension())
        this.loadSample(this.pathName() + this.clips[i].file + this.fileExtension(), this.clips[i].name, onLoaded, onProgress);
    }


};

AudioClipKit.prototype.findClip = function (name) {
    var i, len = this.clips.length;
    for (i = 0; i < len; i++) {
        if (this.clips[i].name == name) {
            return this.clips[i];
        }        ;
    }

    return null;
}


AudioClipKit.prototype.findSharedClips = function (name) {
    var clip = this.findClip(name);
    var track = clip.track;
    var sharedClips = [];
    var i, len = this.clips.length;
    for (i = 0; i < len; i++) {
        if (this.clips[i].track == track) {
            sharedClips.push(this.clips[i]);
        }
        ;
    }

    return sharedClips;
}


//also make a class per buffer/sample? can store prettified name?

//this should definitely be part of a sample class, pass in kit or st
//if we have the name of a sample type, then we can do metaprogramming awesomeness.
AudioClipKit.prototype.loadSample = function (url, instrumentName, onLoaded, onProgress, isMp3sForAB) {
    //need 2 load asynchronously
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    var successHandler = function (buffer) {
        var theClip = kit.findClip(instrumentName);
        //console.log("audioTrack loaded: " + instrumentName)

        if (theClip) {
            if (isMp3sForAB) {
                theClip.mp3ForABbuffer = buffer;
            } else {
                theClip.buffer = buffer;
            }
        }

        kit.instrumentLoadCount++;
        var numToLoad = isMp3sForAB ? kit.numInstruments * 2 : kit.numInstruments;
        console.log(kit.instrumentLoadCount + " " + instrumentName + " loaded " + url);
        if (kit.instrumentLoadCount === numToLoad) {
            kit.isLoaded = true;
            console.log("all audio loaded");
            onLoaded();
        } else {
            onProgress();
        }
    };

    var errorHandler = function (buffer) {
        console.log("Error decoding drum samples!");
    }

    var kit = this;
    var that = this;
    request.onload = function () {
        that.audio.audioContext.decodeAudioData(
            request.response,
            successHandler,
            errorHandler
        );
    }
    request.send();
}

AudioClipKit.prototype.playClip = function (clipName, contextPlayTime, position, volume) {
    var theClip = this.findClip(clipName);
    if (theClip) {
        var theTrack = this.audio.findTrack(theClip.track);
        if (theTrack  ) {
            theTrack.currentClip = theClip;

            theTrack.playClip(theClip.buffer, contextPlayTime, position, volume);
        }
    } else {
        console.log("playClip missing clip: " +clipName);
    }
}

AudioClipKit.prototype.stopClip = function (clipName) {
    var theClip = this.findClip(clipName);
    if (theClip) {

        var theTrack = this.audio.findTrack(theClip.track);
        if (theTrack) {
            theTrack.currentClip = theClip;
            theTrack.stopClip(theClip.buffer);
        }
    }
}


AudioClipKit.prototype.fadeClip = function (clipName) {
    var theClip = this.findClip(clipName);
    if (theClip) {

        var theTrack = this.audio.findTrack(theClip.track);
        if (theTrack) {
            theTrack.currentClip = theClip;
            theTrack.fadeClip(theClip.buffer);
        }
    }
}



AudioClipKit.prototype.stopAll = function () {
    var i, len = this.audio.tracks.length;
    for (i = 0; i < len; i++) {
        if (this.audio.tracks[i].audioTrack.bufferSource) {

            try {
                var trackBuffer = this.audio.tracks[i].audioTrack.bufferSource;

                trackBuffer.stop(trackBuffer.context.currentTime + 1);// TODO: safari complains if no arg is passed

            } catch (e) {
                console.log(" THAT ERROR- stopAll: " + e)
            }


        }
    }
}

var FLOW = FLOW || {};

FLOW.Audio = {
    AudioManager: AudioManager,
    AudioTrack: AudioTrack,
    AudioClip:  AudioClip,
    AudioVisualizer : AudioVisualizer,
    AudioClipKit: AudioClipKit
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Audio;
}));