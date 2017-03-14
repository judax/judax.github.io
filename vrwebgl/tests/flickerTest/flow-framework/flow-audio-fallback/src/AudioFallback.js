var FLOW = FLOW || {};

FLOW.AudioFallback = {};

FLOW.AudioFallback.AudioManager = function() {
	this.audioBasePath = "";
    this.audioFileExtension = "wav";
	this.tracks = [];
	return this;
};

FLOW.AudioFallback.AudioManager.prototype.setListenerPosition = function() {
	// DO NOTHING
	return this;
};

FLOW.AudioFallback.AudioManager.prototype.startClipByName = function(trackName, clipKit, name, clipTime, volume) {
	var track = this.findTrack(trackName);
	clipKit.playClip(name, clipTime, null, volume, track.isLooped);
	return this;
};

FLOW.AudioFallback.AudioManager.prototype.stopClipByName = function(trackName, clipKit, name) {
	for (var i = 0; i < clipKit.clips.length; i++) {
		var clip = clipKit.clips[i];
		if (clip.name === name) {
			clip.buffer.pause();
			clip.buffer.currentTime = 0;
			break;
		}
	}
	return this;
};

FLOW.AudioFallback.AudioManager.prototype.setUserOrientation = function() {
	// DO NOTHING
	return this;
};

FLOW.AudioFallback.AudioManager.prototype.fadeClipByName = function(trackName, clipKit, name) {
	// TODO: needs full implementation of fade
	this.stopClipByName(trackName, clipKit, name);
	return this;
}

FLOW.AudioFallback.AudioManager.prototype.findTrack = function(name) {
    for (var i = 0; i < this.tracks.length; i++) {
        if (this.tracks[i].name == name) {
            return this.tracks[i];
        }
    }
    return null;
}

FLOW.AudioFallback.AudioTrack = function(audioManager, params) {
    this.name = params.name || "";
    this.isLooped = params.looped || false;
    this.spatialize = params.spatialize || false;
    this.hasVolumeControl = params.hasVolumeControl || false;

    this.isPlaying = false;

    return this;
};

FLOW.AudioFallback.AudioTrack.prototype.prepareClip = function() {
	// DO NOTHING
	return this;
};

FLOW.AudioFallback.AudioClip = function(params) {
    this.params = params || {};
    this.name = params.name;
    this.file = params.file;
    this.track = params.track;
    this.buffer = new Audio();
    return this;
};

FLOW.AudioFallback.AudioClipKit = function(audioManager, name, clips) {
	this.audioManager = audioManager;
	this.name = name;
	this.clips = clips;
    return this;
}

FLOW.AudioFallback.AudioClipKit.prototype.load = function(onLoaded, onProgress) {
	var counter = 0;
	function canplaythrough(event) {
		counter++;
		console.log("loaded audio: " + counter);
		event.target.removeEventListener("canplaythrough", canplaythroughBind);
		if (counter >= this.clips.length) {
			console.log("all audio loaded");
			onLoaded();
		}
	}
	var canplaythroughBind = canplaythrough.bind(this);
	for (var i = 0; i < this.clips.length; i++) {
		var clip = this.clips[i];
		clip.buffer.addEventListener("canplaythrough", canplaythroughBind);
		console.log("loading audio: " + this.audioManager.audioBasePath + "/" + clip.file + "." + this.audioManager.audioFileExtension);
		try {
			clip.buffer.src = this.audioManager.audioBasePath + "/" + clip.file + "." + this.audioManager.audioFileExtension;
		} catch (e) {
			console.error(" THAT ERROR: " + e)
		}
	}
	return this;
};

FLOW.AudioFallback.AudioClipKit.prototype.findClip = function(name) {
	for (var i = 0; i < this.clips.length; i++) {
		var clip = this.clips[i];
		if (clip.name === name) {
			return clip;
		}
	}
	return null;
};

FLOW.AudioFallback.AudioClipKit.prototype.playClip = function (clipName, contextPlayTime, position, volume, loop) {
	var clip = this.findClip(clipName);
	if (clip) {
		clip.buffer.volume = volume !== undefined ? volume : clip.buffer.volume;
		clip.buffer.loop = !!loop;
		clip.currentTime = contextPlayTime || 0;
		clip.buffer.play();
	}
	return this;
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.AudioFallback;
}));