var IBIZA = IBIZA || {};

IBIZA.InputElement = function(mesh) {
	this._mesh = mesh;
	this._intersected = false;
	this._pressed = false;
	this._touched = false;
	this._listeners = {};
	// Use this object to call the events (improve gc).
	// TODO: We cannot set the type/name of the event in this structure because is shared by the different events. Maybe an instance per event type? cursor, press, touch
	this._event = {
		target: this
	};
	return this;
};

IBIZA.InputElement.prototype.update = function(time, intersection, gamepad) {
	if (typeof(time) !== "number") time = performance.now();

	// Store some useful data in the event
	this._event.intersection = intersection;
	this._event.gamepad = gamepad;
	this._event.time = time;

	// enter, exit, move
	if (!this._intersected && intersection) {
		this._intersected = true;
		this.callEventListeners("cursorenter", this._event);
	}
	else if (this._intersected && !intersection) {
		this._intersected = false;
		this.callEventListeners("cursorexit", this._event);
		if (this._pressed) {
			this._pressed = false;
			this.callEventListeners("pressend", this._event);
		}
		if (this._touched) {
			this._touched = false;
			this.callEventListeners("touchend", this._event);
		}
	}
	else if (this._intersected && intersection) {
		this.callEventListeners("cursormove", this._event);
	}

	// Only if there is a gamepad and the ray intersected with the mesh, presss and/or touch events can be fired.
	if (gamepad && this._intersected) {
		// pressstart, pressend, pressmove (drag)
		var pressed = gamepad.buttons[0].pressed;
		if (!this._pressed && pressed) {
			this._pressed = true;
			this.callEventListeners("pressstart", this._event);
		}
		else if (this._pressed && !pressed) {
			this._pressed = false;
			this.callEventListeners("pressend", this._event);
		}
		else if (this._pressed && pressed) {
			this.callEventListeners("pressmove", this._event);
		}

		// touchstart, touchend, touchmove
		var touched = gamepad.buttons[0].touched; 
		if (!this._touched && touched) {
			this._touched = true;
			this.callEventListeners("touchstart", this._event);
		}
		else if (this._touched && !touched) {
			this._touched = false;
			this.callEventListeners("touchend", this._event);
		}
		else if (this._touched && touched) {
			this.callEventListeners("touchmove", this._event);
		}
	}

	// TODO: Possible interesting additional features/implementations:
	// 1) Only send move events if the coordinate changes? How does HTML mousemove/touchmove do it?
	// 2) Implement a click and double click events taking care of not moving the cursor/touchpad, timing, etc.
	// 3) Should move events be fired along with start/end ones? How does HTML mousemove/touchmove/enter/exit do it?

	return this;
};

IBIZA.InputElement.prototype.addEventListener = function(eventType, callback) {
	var listeners = this._listeners[eventType];
	if (!listeners) {
		listeners = [];
		this._listeners[eventType] = listeners;
	}
	if (listeners.indexOf(callback) < 0) {
		listeners.push(callback);
	}
	return this;
};

IBIZA.InputElement.prototype.removeEventListener = function(eventType, callback) {
	if (this._listeners[eventType]) {
		var i = this._listeners[eventType].indexOf(callback);
		if (i >= 0) {
			this._listeners[eventType].splice(i, 1);
		}
	}
	return this;
};

IBIZA.InputElement.prototype.removeAllEventListeners = function(eventType) {
	if (this._listeners[eventType]) {
		delete this._listeners[eventType];
	}
	return this;
};

IBIZA.InputElement.prototype.callEventListeners = function(eventType, event) {
	if (!event) event = { target : this };
	if (!event.target) event.target = this;
	var onEventType = 'on' + eventType;
	if (typeof(this[onEventType]) === 'function') {
		this[onEventType](event)
	}
	var listeners = this._listeners[eventType];
	if (listeners) {
		for (var i = 0; i < listeners.length; i++) {
			listeners[i](event);
		}
	}
	return this;
};

IBIZA.InputElement.prototype.getMesh = function() {
	return this._mesh;
};

IBIZA.InputElement.prototype.getIntersection = function() {
	return this._intersection;
};

IBIZA.InputElement.prototype.getGamepad = function() {
	return this._gamepad;
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return IBIZA.InputElement;
}));

