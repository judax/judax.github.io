
var FLOW = FLOW || {};

FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.EventUtils = FLOW.EventUtils || require("flow-event-utils");

/**
 * AudioManager system functions.
 *
 * This handles all the audio  functionality
 *
 *
 * created by Jason Marsh for Flow  http://flow.gl
 */
var AudioManager = function() {
    FLOW.EventUtils.Observable.call(this);
    this.masterGainNode = null;
    this.audioContext= null; //contains the AudioContext
    this.audioBasePath = "audio";
    this.audioFileExtension = "wav";

    this.loadOneAtATime = false;
    this.isAudioLoaded = false;
    this.instrumentLoadCount =0;

    this.initializeAudio();

    return this;
};

FLOW.OOPUtils.prototypalInheritance(AudioManager, FLOW.EventUtils.Observable);

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

    // Creates master volume.
     this.masterGainNode = this.audioContext.createGain();
     this.trueVolume = this.masterGainNode.gain.value;
     this.masterVolumeChanging = false;
    //this.masterGainNode.gain.value = 0.9; // reduce overall volume to avoid clipping
    this.masterGainNode.connect(finalMixNode);
    // this.masterGainNode = finalMixNode;

};


/**
 *
 * @param name
 * @param clips an array of AudioClips
 */
AudioManager.prototype.setClips = function (  clips) {
   this.clips = clips;
    this.numInstruments = this.clips.length;

    var i, len = this.clips.length;
    for (i = 0; i < len; i++) {
        this.clips[i].buffer = null;
    }

    this.startedLoading = false;
    this.isAudioLoaded = false;
    this.instrumentLoadCount = 0;
};

AudioManager.prototype.pathName = function () {
    return this.audioBasePath + "/";
};

AudioManager.prototype.fileExtension = function () {
    return "." + this.audioFileExtension;
};

AudioManager.prototype.load = function () {
    if (this.startedLoading) {
        return;
    }

    this.startedLoading = true;

    var i, len = this.clips.length;
    this.loadIndex = 0;
    if (this.loadOneAtATime){
        this.loadNext();
    } else {

        for (i = 0; i < len; i++) {
            console.log("loadSample: " + this.pathName() + this.clips[i].file + this.fileExtension())
            this.loadSample(this.pathName() + this.clips[i].file + this.fileExtension(), this.clips[i]);
        }
    }

};

/**
 *  Only loads one at a time... if you try to load multiple it can crash VRWebGL
 */
AudioManager.prototype.loadNext = function() {
    console.log("loadSample: " + this.pathName() + this.clips[this.loadIndex].file + this.fileExtension());
    this.loadSample(this.pathName() + this.clips[this.loadIndex].file + this.fileExtension(), this.clips[this.loadIndex]);
    this.loadIndex ++;
};



AudioManager.prototype.setTrackPosition = function( trackName, position) {
    var theTrack = this.findTrack(trackName);
    console.log(trackName + ": " +position.x +", " + position.y  +", " +  position.z )
    theTrack.panner.setPosition(position.x, position.y, position.z);
};

AudioManager.prototype.findTrack = function(name) {
//function findAudioVisualizer(name) {
    for (var i = 0; i < this.tracks.length; i++) {
        if (this.tracks[i].name == name) {
            return this.tracks[i];
        }
    }

    return null;
};



AudioManager.prototype.playClipByName = function(name, clipTime, volume) {
    console.log( " play : " + name);
    var clip = this.findClip( name );
    this.playClip(clip, clipTime, volume);
};

AudioManager.prototype.stopClipByName = function(name) {
    console.log( " stop : " + name);
    var clip = this.findClip( name );
    this.stopClip(clip);
};

AudioManager.prototype.fadeClipByName = function(name) {
    console.log( " fade : " + name);
    var clip = this.findClip( name );
    this.fadeClip(clip);
};

AudioManager.prototype.fadeClipOutByName = function(name, overTime) {
    console.log( " fade : " + name);
    var clip = this.findClip( name );
    this.fadeClipOut(clip, overTime);
};





var AudioClip = function (params) {
    this.params = params || {};
    this.file = params.file; //the filename without path or extension

    this.buffer = null; //this will be filled by the AudioClipKit as it loads a buffer //TODO: refactor to have AudioClip handle more of theese functions

    this.name = params.name || "";
    this.isLooped = params.looped || false;

    this.isPlaying = false;

    this.bufferSource = null; //The bufferSource can only be created when it is time to play the clip

    this.hasVolumeControl= typeof params.hasVolumeControl != "undefined" ? params.hasVolumeControl : false;

    this.spatialize = typeof params.spatialize != "undefined" ? params.spatialize : false;

    return this;
};




AudioManager.prototype.findClip = function (name) {
    var i, len = this.clips.length;
    for (i = 0; i < len; i++) {
        if (this.clips[i].name == name) {
            return this.clips[i];
        }
    }

    return null;
};




//also make a class per buffer/sample? can store prettified name?

//this should definitely be part of a sample class, pass in kit or st
//if we have the name of a sample type, then we can do metaprogramming awesomeness.
AudioManager.prototype.loadSample = function (url, clip) {
    //need 2 load asynchronously
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    var theClip = clip;

    var successHandler = function (buffer) {
        if (theClip) {
            theClip.buffer = buffer;
        }

        this.instrumentLoadCount++;
        var numToLoad =  this.numInstruments;
        console.log(this.instrumentLoadCount + " " + theClip.name + " loaded " + url);
        this.callEventListeners("onLoaderProgressed", theClip, this.instrumentLoadCount/numToLoad);

        if (this.instrumentLoadCount === numToLoad) {
            this.isAudioLoaded = true;
            console.log("all audio loaded");
            this.callEventListeners("onLoaderFinished", true);
        } else {
            if (this.loadOneAtATime) {
                this.loadNext();
            }
        }

    }.bind(this);

    var errorHandler = function (buffer) {
        alert("Error decoding audio file!");
        this.callEventListeners("onLoaderFailed", theClip, "Error decoding audio file!");
    }.bind(this);

    request.onload = function () {
        this.audioContext.decodeAudioData(
            request.response,
            successHandler,
            errorHandler
        );
    }.bind(this);
    request.send();
};



AudioManager.prototype.playClip = function (clip, clipTime, offset, volume) {
    if (clip) {
        clip.isPlaying = true;
        clip.bufferSource = this.audioContext.createBufferSource();
        clip.bufferSource.buffer = clip.buffer;
        clip.bufferSource.loop = clip.isLooped;

        if (clip.spatialize || clip.hasVolumeControl) {
            clip.gainNode = this.audioContext.createGain();
            clip.bufferSource.connect(clip.gainNode);
            clip.gainNode.gain.value = typeof volume != "undefined" ? volume : 1.0;
            clip.gainNode.connect(this.masterGainNode);
        } else {
            clip.bufferSource.connect(this.masterGainNode);
        }

        if (clip.spatialize) { //TODO: not tested yet.
            if (clip.audio.useHrtf) {
                clip.gainNode.gain.value = 0.5;
                // create new hrtf panner, source node gets connected automatically
                clip.hrtfPanner = new HRTFPanner(this.audioContext, clip.gainNode, this.hrtfContainer);

                // connect the panner to the destination node
                clip.hrtfPanner.connect(this.audioContext.destination);

            } else {
                // Connect the sound source to the volume control.
                clip.panner = this.audioContext.createPanner();
                clip.panner.refDistance = 2;
                clip.panner.panningModel = "HRTF"; //uses the high-quality panner
                if (!position) {
                    position = {x: 0, y: 0, z: 0};
                }
                console.log("prepareClip: " + clip.name + " " + position.x);
                clip.panner.setPosition(position.x, position.y, position.z);

                // Instead of hooking up the volume to the main volume, hook it up to the panner.
                clip.gainNode.connect(clip.panner);

                clip.gainNode.gain.value = typeof volume != "undefined" ? volume : 1.0;

                // And hook up the panner to the main volume.
                clip.panner.connect(this.masterGainNode);

            }
        }
        clip.bufferSource.start(clipTime || 0, offset);

    } else {
        alert("playClip missing clip: " +clip.name);
    }
};





AudioManager.prototype.stopClip = function (clip, overTime) {
    clip.isPlaying = false;
    overTime = (typeof overTime !== 'undefined') ? overTime : 1;
    if (clip.bufferSource !== undefined && clip.bufferSource !== null) {
        try {
            var trackBuffer = clip.bufferSource;
            trackBuffer.stop(this.audioContext.currentTime + overTime);// TODO: safari complains if no arg is passed
        } catch (e) {
            console.log(" THAT ERROR- stopClip: " + e)
        }
    }
};


AudioManager.prototype.setListenerPosition = function(p) {
    //TODO: implement
}


AudioManager.prototype.stopAll = function () {
    var i, len = this.clips.length;
    for (i = 0; i < len; i++) {
        if (this.clips[i].audioTrack.bufferSource) {

            try {
                var trackBuffer = this.clips[i].audioTrack.bufferSource;
                trackBuffer.stop(trackBuffer.context.currentTime + 1);// TODO: safari complains if no arg is passed
            } catch (e) {
                console.log(" AudioManager ERROR- stopAll: " + e)
            }

        }
    }
};


AudioManager.prototype.setVolume = function( clip, vol ) {
    if (clip.gainNode) {
        clip.gainNode.gain.value = vol;
    }
};

AudioManager.prototype.fadeClip = function (clip, toValue, overTime) {
    this.isPlaying = false;
    toValue = toValue || 0.0001;
    overTime = overTime || 2;

    if (clip.bufferSource !== undefined && clip.bufferSource !== null) {
        try {
            var trackBuffer = clip.bufferSource;
            if (clip.gainNode) {
                clip.gainNode.gain.exponentialRampToValueAtTime(toValue, this.audioContext.currentTime + overTime);
            }
            trackBuffer.stop(this.audioContext.currentTime + overTime +1);// TODO: safari complains if no arg is passed
        } catch (e) {
            console.log(" AudioManager ERROR- fadeClip: " + e)
        }
    }
};


AudioManager.prototype.fadeClipOut = function (clip,  overTime) {
    this.fadeClip(clip, 0.0001, overTime);
    this.stopClip(clip, overTime +1);
};


AudioManager.prototype.setMasterVolume = function ( toValue) {
    this.fadeMaster( toValue, 0.5);
};

AudioManager.prototype.fadeMaster = function ( toValue, overTime) {
    toValue = toValue || 0.01;
    overTime = overTime || 2;

    if (this.masterGainNode) {
        try {
            this.trueVolume = toValue;
            this.masterVolumeChanging = true;
            setTimeout(function() { this.masterVolumeChanging = false}, overTime);
            this.masterGainNode.gain.exponentialRampToValueAtTime(toValue, this.audioContext.currentTime + overTime);
        } catch (e) {
            console.log(" AudioManager ERROR- fadeMaster: " + e)
        }
    }
};

AudioManager.prototype.mute = function ( ) {
    if (this.masterGainNode) {
        this.preMutedValue = (!this.masterVolumeChanging) ? this.masterGainNode.gain.value : this.trueVolume;
        try {
            this.trueVolume = 0;
            rampTime = 0.5
            this.masterVolumeChanging = true;
            setTimeout(function() { this.masterVolumeChanging = false}, rampTime);
            this.masterGainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + rampTime);
        } catch (e) {
            console.log(" AudioManager ERROR- mute: " + e)
        }
    }
};

AudioManager.prototype.unmute = function ( ) {
    if (this.masterGainNode) {
        this.preMutedValue = this.preMutedValue || 1.0;
        this.trueVolume = this.preMutedValue;
        try {
            rampTime = 0.5
            this.masterVolumeChanging = true;
            setTimeout(function() { this.masterVolumeChanging = false}, rampTime);
            this.masterGainNode.gain.exponentialRampToValueAtTime(this.preMutedValue, this.audioContext.currentTime + rampTime);
        } catch (e) {
            console.log(" AudioManager ERROR- unmute: " + e)
        }
    }
};


var FLOW = FLOW || {};

FLOW.Audio = {
    AudioManager: AudioManager,
    AudioClip:  AudioClip
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
