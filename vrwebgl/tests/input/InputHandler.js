// TODO: Just to specify the dependencies for now. This code needs to be refactored to the standard we will be using (ES6 classes, npm, ...?) 
var THREE = THREE || require('three');

var IBIZA = IBIZA || {};

// TODO: Decide if the InputHandling should in fact be called DayDreamController and also handle the controller mesh and arm model, ray visualization, etc. or just logic.
IBIZA.InputHandler = function(object3d) {
	this._raycaster = new THREE.Raycaster();
	this._object3d = object3d;
	this._inputElements = [];
	this._gamepad = null;
	var gamepads = navigator.getGamepads();
	for (var i = 0; !this._gamepad && i < gamepads.length; i++) {
		this._gamepad = gamepads[i];
		if (this._gamepad && (this._gamepad.id !== 'Daydream Controller')) {
			this._gamepad = null;
		}
	}
	this._gamepadOrientation = new THREE.Quaternion();
	return this;
};

IBIZA.InputHandler.prototype.update = function(time) {
	if (typeof(time) !== "number") time = performance.now();
	if (this._gamepad) {
		if (this._gamepad.pose && this._gamepad.pose.orientation) {
			this._gamepadOrientation.fromArray(this._gamepad.pose.orientation);
		}
	}
	this._raycaster.ray.origin.copy(this._object3d.position);
	this._raycaster.ray.direction.set(0, 0, - 1).applyQuaternion(this._gamepadOrientation);
	for (var i = 0; i < this._inputElements.length; i++) {
		var inputElement = this._inputElements[i];
		var intersects = raycaster.intersectObject(inputElement._mesh);
		inputElement.update(time, intersects.length > 0 ? intersects[0] : null, this._gamepad);
	}
	return this;
};

IBIZA.InputHandler.prototype.addInputElement = function(inputElement) {
	// TODO: Check if the element already exists and do not add it again in that case
	this._inputElements.push(inputElement);
	return this;
};

IBIZA.InputHandler.prototype.removeInputElement = function(inputElement) {
	var i = this._inputElements.indexOf(inputElement);
	if (i >= 0) {
		this._inputElements.splice(i, 1);
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
    return IBIZA.InputHandler;
}));
