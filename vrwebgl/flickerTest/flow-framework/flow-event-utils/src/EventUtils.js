var FLOW = FLOW || {};

FLOW.EventUtils = {};

FLOW.EventUtils.Observable = function() {
	this._listeners = {};
	return this;
};

FLOW.EventUtils.Observable.prototype.addEventListener = function(eventName, listener) {
	if (typeof(eventName) !== "string") throw "A event name must be a string.";
	if (typeof(listener) !== "function") throw "A listener must be a function callback.";
	var _listeners = this._listeners[eventName];
	if (!_listeners) {
		_listeners = [];
		this._listeners[eventName] = _listeners;
	}
	var listenerIndex = _listeners.indexOf(listener);
	if (listenerIndex < 0) {
		_listeners.push(listener);
	}
	return listener;
};

FLOW.EventUtils.Observable.prototype.removeEventListener = function(eventName, listener) {
	if (typeof(eventName) !== "string") throw "A event name must be a string.";
	if (typeof(listener) !== "function") throw "A listener must be a function callback.";
	var _listeners = this._listeners[eventName];
	if (!_listeners || listener.length === 0) return null;
	var listenerIndex = _listeners.indexOf(listener);
	if (listenerIndex >= 0) {
		_listeners.splice(listenerIndex, 1);
	}
	return listener;
};

FLOW.EventUtils.Observable.prototype.removeAllEventListeners = function(eventName) {
	if (typeof(eventName) !== "string") throw "A event name must be a string.";
	var _listeners = this._listeners[eventName];
	if (_listeners) {
		delete this._listeners[eventName];
	}
	return _listeners;
};

FLOW.EventUtils.Observable.prototype.callEventListeners = function() {
	var argumentsArray = Array.prototype.slice.call(arguments);
	var eventName = argumentsArray.splice(0, 1)[0];
	if (typeof(eventName) !== "string") throw "A event name must be a string.";
	var _listeners = this._listeners[eventName];
	if (_listeners) {
		// console.log("Observable.callEventListeners: " + eventName + ", listeners.length = " + _listeners.length);
		for (var i = 0; i < _listeners.length; i++) {
			var listener = _listeners[i];
			listener.apply(this, argumentsArray);
		}
	}
	var onEventName = "on" + eventName;
	if (this[onEventName]) {
		this[onEventName].apply(this, argumentsArray);
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
    return FLOW.EventUtils;
}));
