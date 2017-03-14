var FLOW = FLOW || {};

FLOW.FPSUtils = {};

FLOW.FPSUtils.AverageFPS = function(callback, timeForAverage) {
	if (!callback || typeof(callback) !== "function") {
		throw "ERROR: AverageFPS needs a callback function to be called.";
	}
	else if (typeof(timeForAverage) !== "undefined" && typeof(timeForAverage) !== "number") {
		throw "ERROR: The time for average calculation is not a number.";
	}

	this._timeForAverage = typeof(timeForAverage) === "number" ? timeForAverage : 1000;
	this._callback = callback;
	this.reset();

	return this;
};

FLOW.FPSUtils.AverageFPS.prototype.update = function() {
	var currentTime = performance.now();
	if (this._lastTime === -1) {
		this._lastTime = currentTime;
	}
	var elapsedTime = currentTime - this._lastTime;
	this._lastTime = currentTime;

	this._fps = 1000 / ((elapsedTime === 0) ? 16 : elapsedTime);
	this._accumFPS += this._fps;
	this._frames++;
	this._accumTime += elapsedTime;
	if (this._accumTime >= this._timeForAverage) {
		this._averageFPS = this._accumFPS / this._frames;
		this._frames = this._accumTime = this._accumFPS = 0;
		this._callback(this._averageFPS);
	}

	return this;
};

FLOW.FPSUtils.AverageFPS.prototype.reset = function() {
	this._lastTime = -1;
	this._fps = 0;
	this._frames = 0;
	this._accumFPS = 0;
	this._accumTime = 0;
	this._averageFPS = 60;
	return this;
};

FLOW.FPSUtils.AverageFPS.prototype.getFPS = function() {
	return this._fps;
};

FLOW.FPSUtils.AverageFPS.prototype.getAverageFPS = function() {
	return this._averageFPS;
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.FPSUtils;
}));
