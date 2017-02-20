var THREE = THREE || require('three');

var FLOW = FLOW || {};

FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.EventUtils = FLOW.EventUtils || require('flow-event-utils');

/**
 * Based on the DeviceOrientationControls by Rich Tibbett (http://github.com/richtr)
 * License: The MIT License
 *
 * Adapted by Iker Jamardo (aka JudaX) (http://github.com/judax)
 * Adapted by Jason Marsh
 * 
 * params = {
 *   object: 
 *   [domElement]:
 *   [camera]:
 *   [maxMoveNormalSpeed]:
 *   [maxMoveFastSpeed]:
 *   [moveAcceleration]:
 *   [moveDeceleration]:
 *   [keys]: {
		forward: ["KeyW", "ArrowUp", "Numpad8"],
		backward: ["KeyS", "ArrowDown", "Numpad5"],
		right: ["KeyD", "ArrowRight", "Numpad6"],
		left: ["KeyA", "ArrowLeft", "Numpad4"],
		up: ["KeyR", "Numpad7"],
		down: ["F", "Numpad1"],
		fast: ["ShiftLeft", "ShiftRight"]
	 }
 * }
 **/
FLOW.FlyControls = function( params ) {
    FLOW.EventUtils.Observable.call(this);

    if (typeof(params) !== 'object') throw "ERROR: It is mandatory to pass an object to initialize FlyControls with at least the 'object' attribute.";
	if (typeof(params.object) !== 'object') throw "ERROR: It is mandatory pass the 'object' attribute at least inside the parameters to configure FlyControls.";

    	this.params = params;

	this.object = params.object;
	this.element = params.domElement || document;
	this.camera = params.camera;
	this.stationaryScene = params.stationaryScene;
    this.mouseRotationObject = params.mouseRotationObject || this.camera  || this.object;

    this.reusableVector1 = new THREE.Vector3();
    this.reusableVector2 = new THREE.Vector3();

	this.freeze = true;

	this.enableManualDrag = true; // enable manual user drag override control by default
	this.enableManualZoom = true; // enable manual user zoom override control by default
	this.enableTouchMove = false;
    this._disableNavigation = false; // if the navigation should be disallowed in this app, set to true

	this.useQuaternions = true; // use quaternions for orientation calculation by default

	this.deviceOrientation = {};
	this.screenOrientation = window.orientation || 0;
			
	this.moveForwardKeyPressed = false;
	this.moveBackwardKeyPressed = false;
	this.moveRightKeyPressed = false;
	this.moveLeftKeyPressed = false;
	this.moveUpKeyPressed = false;
	this.moveDownKeyPressed = false;
	this.moveFastKeyPressed = false;

	this.moveForward = 0; 
	this.moveLeft = 0; 
	this.moveBackward = 0; 
	this.moveRight = 0; 
	this.moveUp = 0; 
	this.moveDown = 0; 
	this.moveFast = false;

	this.currentMoveDirectionAndSpeed = new THREE.Vector3();
	this.currentMoveForwardSpeed = 0;
	this.currentMoveBackwardSpeed = 0;
	this.currentMoveRightSpeed = 0;
	this.currentMoveLeftSpeed = 0;
	this.currentMoveUpSpeed = 0;
	this.currentMoveDownSpeed = 0;
	this.currentMoveForwardDirectionAndSpeed = new THREE.Vector3();
	this.currentMoveBackwardDirectionAndSpeed = new THREE.Vector3();
	this.currentMoveRightDirectionAndSpeed = new THREE.Vector3();
	this.currentMoveLeftDirectionAndSpeed = new THREE.Vector3();
	this.currentMoveUpDirectionAndSpeed = new THREE.Vector3();
	this.currentMoveDownDirectionAndSpeed = new THREE.Vector3();

	this.currentMoveDirectionAndSpeed = new THREE.Vector3();

    this.resetMoveSpeeds = function(){
        this.maxMoveNormalSpeed = this.params.maxMoveNormalSpeed || 5;
        this.maxMoveFastSpeed = this.params.maxMoveFastSpeed || 100;
        this.moveAcceleration = this.params.moveAcceleration || 100;
        this.moveDeceleration = this.params.moveDeceleration || 100;
    }.bind( this );

    this.setMoveSpeeds = function(params){
        this.maxMoveNormalSpeed = params.maxMoveNormalSpeed || 5;
        this.maxMoveFastSpeed = params.maxMoveFastSpeed || 100;
        this.moveAcceleration = params.moveAcceleration || 100;
        this.moveDeceleration = params.moveDeceleration || 100;
    }.bind( this );

    this.disableNavigation = function() {
        this._disableNavigation = true;
    }.bind( this );

    this.enableNavigation = function() {
        this._disableNavigation = false;
    }.bind( this );



    this.resetMoveSpeeds();

	this.keys = params.keys || {
		forward: ["KeyW", "ArrowUp", "Numpad8"],
		backward: ["KeyS", "ArrowDown", "Numpad5"],
		right: ["KeyD", "ArrowRight", "Numpad6"],
		left: ["KeyA", "ArrowLeft", "Numpad4"],
		up: ["KeyR", "Numpad7"],
		down: ["KeyF", "Numpad1"],
		fast: ["ShiftLeft", "ShiftRight"]
	};

    this.GamepadIndices = {
        /**
        * Represents the button 0 (the A on the XBOX controller, the O on the OUYA controller)
        */
        BUTTON_0                : 0, 
        /**
        * Represents the button 1 (the B on the XBOX controller, the A on the OUYA controller)
        */
        BUTTON_1                : 1,
        /**
        * Represents the button 2 (the X on the XBOX controller, the U on the OUYA controller)
        */
        BUTTON_2                : 2,
        /**
        * Represents the button 3 (the Y on the XBOX controller, the Y on the OUYA controller)
        */
        BUTTON_3                : 3,
        /**
        * Represents the left bumper button.
        */
        BUTTON_LEFT_BUMPER      : 4,
        /**
        * Represents the right bumper button.
        */
        BUTTON_RIGHT_BUMPER     : 5,
        
        /**
        * Represents the left trigger button.
        */
        BUTTON_LEFT_TRIGGER     : 6,
        /**
        * Represents the right trigger button.
        */
        BUTTON_RIGHT_TRIGGER    : 7,
        
        /**
        * Represents the left joystick button.
        */
        BUTTON_LEFT_JOYSTICK    : 10,
        /**
        * Represents the right joystick button.
        */
        BUTTON_RIGHT_JOYSTICK   : 11,
        /**
        * Represents the dpad up button.
        */
        BUTTON_DPAD_UP          : 12,
        /**
        * Represents the dpad down button.
        */
        BUTTON_DPAD_DOWN        : 13,
        /**
        * Represents the dpad left button.
        */
        BUTTON_DPAD_LEFT        : 14,
        /**
        * Represents the dpad right button.
        */
        BUTTON_DPAD_RIGHT       : 15,
        /**
        * Represents the menu button.
        */
        BUTTON_MENU             : 16,
        
        /**
        * Represents the left joystick horizontal axis.
        */
        AXIS_LEFT_JOYSTICK_X     : 0,
        /**
        * Represents the left joystick vertical axis.
        */
        AXIS_LEFT_JOYSTICK_Y     : 1,
        /**
        * Represents the right joystick horizontal axis.
        */
        AXIS_RIGHT_JOYSTICK_X    : 2,
        /**
        * Represents the right joystick vertical axis.
        */
        AXIS_RIGHT_JOYSTICK_Y    : 3
    };

    this.joystickThreshold = 0.2;

    this.systemSupportsGamepads = navigator["getGamepads"] || navigator["webkitGetGamepads"];
    this.gamepad = null;

    if (this.systemSupportsGamepads) 
    {
        if (!navigator.getGamepads)
        {
            console.log("navigator.getGamepads does not exist.");
            if (navigator.webkitGetGamepads)
            {
                console.log("navigator.webkitGamepads exists, navigator.getGamepads points to it.");
                navigator.getGamepads = navigator.webkitGetGamepads;
            }
        }
       /* var gamepads = navigator.getGamepads();
		if (gamepads && gamepads.length > 0) {
			for (var j=0; j<gamepads.length;j++){
				if (gamepads[j] && gamepads[j].id.indexOf("Surface")==-1 ){
					this.gamepad = gamepads[j];
					break;
				}
			}
		}*/
    }

    this.priorBButtonValue = 0;
    this.bButtonValue = 0;
    this.priorXButtonValue = 0;
	this.xButtonValue = 0;

	this.forwardVector = new THREE.Vector3();
	this.rightVector = new THREE.Vector3();
	this.upVector = new THREE.Vector3();

	// Manual rotate override components
	var startX = 0, startY = 0,
	    currentX = 0, currentY = 0,
	    scrollSpeedX, scrollSpeedY,
	    tmpQuat = new THREE.Quaternion();

	// Manual zoom override components
	var zoomStart = 1, zoomCurrent = 1,
	    zoomP1 = new THREE.Vector2(),
	    zoomP2 = new THREE.Vector2(),
	    tmpFOV;

	var CONTROLLER_STATE = {
		AUTO: 0,
		MANUAL_ROTATE: 1,
		MANUAL_ZOOM: 2
	};

	var appState = CONTROLLER_STATE.AUTO;

	var CONTROLLER_EVENT = {
		CALIBRATE_COMPASS:  'compassneedscalibration',
		SCREEN_ORIENTATION: 'orientationchange',
		MANUAL_CONTROL:     'userinteraction', // userinteractionstart, userinteractionend
		ZOOM_CONTROL:       'zoom',            // zoomstart, zoomend
		ROTATE_CONTROL:     'rotate',          // rotatestart, rotateend
	};

	// Consistent Object Field-Of-View fix components
	var startClientHeight = window.innerHeight,
	    startFOVFrustrumHeight = 2000 * Math.tan( THREE.Math.degToRad( ( this.object.fov || 75 ) / 2 ) ),
	    relativeFOVFrustrumHeight, relativeVerticalFOV;

	var deviceQuat = new THREE.Quaternion();

	this.constrainObjectFOV = function () {
		relativeFOVFrustrumHeight = startFOVFrustrumHeight * ( window.innerHeight / startClientHeight );

		relativeVerticalFOV = THREE.Math.radToDeg( 2 * Math.atan( relativeFOVFrustrumHeight / 2000 ) );

		this.object.fov = relativeVerticalFOV;
	}.bind( this );

	this.onDeviceOrientationChange = function ( event ) {
		this.deviceOrientation = event;
	}.bind( this );

	this.onScreenOrientationChange = function () {
		this.screenOrientation = window.orientation || 0;
	}.bind( this );

	this.onCompassNeedsCalibration = function ( event ) {
		event.preventDefault();
	}.bind( this );

	this.onDocumentMouseDown = function ( event ) {
		if ( this.enableManualDrag !== true ) return;

		event.preventDefault();

		appState = CONTROLLER_STATE.MANUAL_ROTATE;

		this.freeze = true;

		tmpQuat.copy( this.mouseRotationObject.quaternion );

		startX = currentX = event.pageX;
		startY = currentY = event.pageY;

		// Set consistent scroll speed based on current viewport width/height
		scrollSpeedX = ( 1200 / window.innerWidth ) * 0.2;
		scrollSpeedY = ( 800 / window.innerHeight ) * 0.2;

		this.element.addEventListener( 'mousemove', this.onDocumentMouseMove, false );
		this.element.addEventListener( 'mouseup', this.onDocumentMouseUp, false );
	}.bind( this );

	this.onDocumentMouseMove = function ( event ) {
		currentX = event.pageX;
		currentY = event.pageY;
	}.bind( this );

	this.onDocumentMouseUp = function ( event ) {
		this.element.removeEventListener( 'mousemove', this.onDocumentMouseMove, false );
		this.element.removeEventListener( 'mouseup', this.onDocumentMouseUp, false );

		appState = CONTROLLER_STATE.AUTO;

		this.freeze = false;
	}.bind( this );

	this.onDocumentTouchStart = function ( event ) {
		if ( ! this.enableTouchMove ) {return}
		event.preventDefault();
		event.stopPropagation();

		switch ( event.touches.length ) {
			case 1: // ROTATE
				if ( this.enableManualDrag !== true ) return;

				appState = CONTROLLER_STATE.MANUAL_ROTATE;

				this.freeze = true;

				tmpQuat.copy( this.mouseRotationObject.quaternion );

				startX = currentX = event.touches[ 0 ].pageX;
				startY = currentY = event.touches[ 0 ].pageY;

				// Set consistent scroll speed based on current viewport width/height
				scrollSpeedX = ( 1200 / window.innerWidth ) * 0.1;
				scrollSpeedY = ( 800 / window.innerHeight ) * 0.1;

				this.element.addEventListener( 'touchmove', this.onDocumentTouchMove, false );
				this.element.addEventListener( 'touchend', this.onDocumentTouchEnd, false );

				break;

			case 2: // ZOOM
				if ( this.enableManualZoom !== true ) return;

				appState = CONTROLLER_STATE.MANUAL_ZOOM;

				this.freeze = true;

				tmpFOV = this.object.fov;

				zoomP1.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				zoomP2.set( event.touches[ 1 ].pageX, event.touches[ 1 ].pageY );

				zoomStart = zoomCurrent = zoomP1.distanceTo( zoomP2 );

				this.element.addEventListener( 'touchmove', this.onDocumentTouchMove, false );
				this.element.addEventListener( 'touchend', this.onDocumentTouchEnd, false );

				break;
		}
	}.bind( this );

	this.onDocumentTouchMove = function ( event ) {
		if ( ! this.enableTouchMove ) {return}
		switch( event.touches.length ) {
			case 1:
				currentX = event.touches[ 0 ].pageX;
				currentY = event.touches[ 0 ].pageY;
				break;

			case 2:
				zoomP1.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				zoomP2.set( event.touches[ 1 ].pageX, event.touches[ 1 ].pageY );
				break;
		}
	}.bind( this );

	this.onDocumentTouchEnd = function ( event ) {
		if ( ! this.enableTouchMove ) {return}
		this.element.removeEventListener( 'touchmove', this.onDocumentTouchMove, false );
		this.element.removeEventListener( 'touchend', this.onDocumentTouchEnd, false );

		if ( appState === CONTROLLER_STATE.MANUAL_ROTATE ) {

			appState = CONTROLLER_STATE.AUTO; // reset control state

			this.freeze = false;

		} else if ( appState === CONTROLLER_STATE.MANUAL_ZOOM ) {

			this.constrainObjectFOV(); // re-instate original object FOV

			appState = CONTROLLER_STATE.AUTO; // reset control state

			this.freeze = false;

		}
	}.bind( this );

	function verifyKey(keyCode, keyConfig, keyConfigName) {
		var result = false;
		if (keyConfig instanceof Array) {
			for (var i = 0; !result && i < keyConfig.length; i++) {
				result = keyCode === keyConfig[i];
			}
		}
		else if (typeof(keyConfig) === "string") {
			result = keyCode === keyConfig;
		}
		else {
			throw "ERROR: The provided key configuration for '" + keyConfigName + "' movement is not an array nor a string.";
		}
		return result;
	}

	this.onKeyDown = function ( event ) {
		// event.preventDefault();
		if (this._disableNavigation) {
			return;
		}

		if (verifyKey(event.code, this.keys.forward, "forward")) {
			this.moveForwardKeyPressed = true;
		}
		if (verifyKey(event.code, this.keys.backward, "backward")) {
			this.moveBackwardKeyPressed = true;
		}
		if (verifyKey(event.code, this.keys.right, "right")) {
			this.moveRightKeyPressed = true;
		}
		if (verifyKey(event.code, this.keys.left, "left")) {
			this.moveLeftKeyPressed = true;
		}
		if (verifyKey(event.code, this.keys.up, "up")) {
			this.moveUpKeyPressed = true;
		}
		if (verifyKey(event.code, this.keys.down, "down")) {
			this.moveDownKeyPressed = true;
		}
		if (verifyKey(event.code, this.keys.fast, "fast")) {
			this.moveFastKeyPressed = true;
		}
	}.bind(this);

	this.onKeyUp = function ( event ) {

		if ( this._disableNavigation ) {
			return;
		}
		if (verifyKey(event.code, this.keys.forward, "forward")) {
			this.moveForwardKeyPressed = false;
		}
		if (verifyKey(event.code, this.keys.backward, "backward")) {
			this.moveBackwardKeyPressed = false;
		}
		if (verifyKey(event.code, this.keys.right, "right")) {
			this.moveRightKeyPressed = false;
		}
		if (verifyKey(event.code, this.keys.left, "left")) {
			this.moveLeftKeyPressed = false;
		}
		if (verifyKey(event.code, this.keys.up, "up")) {
			this.moveUpKeyPressed = false;
		}
		if (verifyKey(event.code, this.keys.down, "down")) {
			this.moveDownKeyPressed = false;
		}
		if (verifyKey(event.code, this.keys.fast, "fast")) {
			this.moveFastKeyPressed = false;
		}
	}.bind(this);


	var createQuaternion = function () {

		var finalQuaternion = new THREE.Quaternion();

		var deviceEuler = new THREE.Euler();

		var screenTransform = new THREE.Quaternion();

		var worldTransform = new THREE.Quaternion( - Math.sqrt(0.5), 0, 0, Math.sqrt(0.5) ); // - PI/2 around the x-axis

		var minusHalfAngle = 0;

		return function ( alpha, beta, gamma, screenOrientation ) {

			deviceEuler.set( beta, alpha, - gamma, 'YXZ' );

			finalQuaternion.setFromEuler( deviceEuler );

			minusHalfAngle = - screenOrientation / 2;

			screenTransform.set( 0, Math.sin( minusHalfAngle ), 0, Math.cos( minusHalfAngle ) );

			finalQuaternion.multiply( screenTransform );

			finalQuaternion.multiply( worldTransform );

			return finalQuaternion;

		}

	}();

	var createRotationMatrix = function () {

		var finalMatrix = new THREE.Matrix4();

		var deviceEuler = new THREE.Euler();
		var screenEuler = new THREE.Euler();
		var worldEuler = new THREE.Euler( - Math.PI / 2, 0, 0, 'YXZ' ); // - PI/2 around the x-axis

		var screenTransform = new THREE.Matrix4();

		var worldTransform = new THREE.Matrix4();
		worldTransform.makeRotationFromEuler(worldEuler);

		return function (alpha, beta, gamma, screenOrientation) {

			deviceEuler.set( beta, alpha, - gamma, 'YXZ' );

			finalMatrix.identity();

			finalMatrix.makeRotationFromEuler( deviceEuler );

			screenEuler.set( 0, - screenOrientation, 0, 'YXZ' );

			screenTransform.identity();

			screenTransform.makeRotationFromEuler( screenEuler );

			finalMatrix.multiply( screenTransform );

			finalMatrix.multiply( worldTransform );

			return finalMatrix;

		}

	}();

	this.updateManualMove = function () {

		var lat, lon;
		var phi, theta;

		var rotation = new THREE.Euler( 0, 0, 0, 'YXZ' );

		var rotQuat = new THREE.Quaternion();
		var objQuat = new THREE.Quaternion();

		var tmpZ, objZ, realZ;

		var zoomFactor, minZoomFactor = 1; // maxZoomFactor = Infinity

		return function (delta) {

			objQuat.copy( tmpQuat );

			if ( appState === CONTROLLER_STATE.MANUAL_ROTATE ) {

				lat = ( startY - currentY ) * scrollSpeedY;
				lon = ( startX - currentX ) * scrollSpeedX;

				phi	 = THREE.Math.degToRad( lat );
				theta = THREE.Math.degToRad( lon );

				rotQuat.set( 0, Math.sin( theta / 2 ), 0, Math.cos( theta / 2 ) );

				objQuat.multiply( rotQuat );

				rotQuat.set( Math.sin( phi / 2 ), 0, 0, Math.cos( phi / 2 ) );

				objQuat.multiply( rotQuat );

				// Remove introduced z-axis rotation and add device's current z-axis rotation

				tmpZ  = rotation.setFromQuaternion( tmpQuat, 'YXZ' ).z;
				objZ  = rotation.setFromQuaternion( objQuat, 'YXZ' ).z;
				realZ = rotation.setFromQuaternion( deviceQuat || tmpQuat, 'YXZ' ).z;

				rotQuat.set( 0, 0, Math.sin( ( realZ - tmpZ  ) / 2 ), Math.cos( ( realZ - tmpZ ) / 2 ) );

				tmpQuat.multiply( rotQuat );

				rotQuat.set( 0, 0, Math.sin( ( realZ - objZ  ) / 2 ), Math.cos( ( realZ - objZ ) / 2 ) );

				objQuat.multiply( rotQuat );

				this.mouseRotationObject.quaternion.copy( objQuat );

			} else if ( appState === CONTROLLER_STATE.MANUAL_ZOOM ) {

				zoomCurrent = zoomP1.distanceTo( zoomP2 );

				zoomFactor = zoomStart / zoomCurrent;

				if ( zoomFactor <= minZoomFactor ) {

					this.object.fov = tmpFOV * zoomFactor;

					this.object.updateProjectionMatrix();

				}

				// Add device's current z-axis rotation

				if ( deviceQuat ) {

					tmpZ  = rotation.setFromQuaternion( tmpQuat, 'YXZ' ).z;
					realZ = rotation.setFromQuaternion( deviceQuat, 'YXZ' ).z;

					rotQuat.set( 0, 0, Math.sin( ( realZ - tmpZ ) / 2 ), Math.cos( ( realZ - tmpZ ) / 2 ) );

					tmpQuat.multiply( rotQuat );

					this.object.quaternion.copy( tmpQuat );

				}
			}

			this.moveForward = this.moveForwardKeyPressed ? 1 : 0;
			this.moveBackward = this.moveBackwardKeyPressed ? 1 : 0;
			this.moveRight = this.moveRightKeyPressed ? 1 : 0;
			this.moveLeft = this.moveLeftKeyPressed ? 1 : 0;
			this.moveUp = this.moveUpKeyPressed ? 1 : 0;
			this.moveDown = this.moveDownKeyPressed ? 1 : 0;
			this.moveFast = this.moveFastKeyPressed ? 1 : 0;

			if (this.systemSupportsGamepads && ! this._disableNavigation ) {
                var gamepads = navigator.getGamepads();
                if (gamepads && gamepads.length > 0) {
                    for (var j=0; j<gamepads.length;j++){
                        if (gamepads[j] && gamepads[j].id.indexOf("Surface")==-1 ){
                            this.gamepad = gamepads[j];
                            break;
                        }
                    }
                }
				if (this.gamepad && this.gamepad.buttons.length>14) { //if this isn't a real gamepad, then it's button list will be shorter.
					var gamepad= this.gamepad;
                    var button;
					var joystick, joystickAbs;
					if (!this.moveForwardKeyPressed) {
						button = gamepad.buttons[this.GamepadIndices.BUTTON_DPAD_UP];
						this.moveForward = window.GamepadButton ? button.value : button;
						if (this.moveForward == 0) {
							joystick = gamepad.axes[this.GamepadIndices.AXIS_LEFT_JOYSTICK_Y];
							joystickAbs = Math.abs(joystick);
							this.moveForward = (joystick < 0 && joystickAbs >= this.joystickThreshold) ? joystickAbs : 0;
						}
					}
					if (!this.moveBackwardKeyPressed) {
						button = gamepad.buttons[this.GamepadIndices.BUTTON_DPAD_DOWN];
						this.moveBackward = window.GamepadButton ? button.value : button;
						if (this.moveBackward == 0) {
							joystick = gamepad.axes[this.GamepadIndices.AXIS_LEFT_JOYSTICK_Y];
							joystickAbs = Math.abs(joystick);
							this.moveBackward = (joystick > 0 && joystickAbs >= this.joystickThreshold) ? joystickAbs : 0;
						}
					}
					if (!this.moveRightKeyPressed) {
						//button = gamepad.buttons[this.GamepadIndices.BUTTON_3];
                        button = gamepad.buttons[this.GamepadIndices.BUTTON_DPAD_RIGHT];

                        this.moveRight = window.GamepadButton ? button.value : button;
						if (this.moveRight == 0) {
							joystick = gamepad.axes[this.GamepadIndices.AXIS_LEFT_JOYSTICK_X];
							joystickAbs = Math.abs(joystick);
							this.moveRight = (joystick > 0 && joystickAbs >= this.joystickThreshold) ? joystickAbs : 0;
						}
					}
					if (!this.moveLeftKeyPressed) {
                        //button = gamepad.buttons[this.GamepadIndices.BUTTON_3];
                        button = gamepad.buttons[this.GamepadIndices.BUTTON_DPAD_LEFT];
                        this.moveLeft = window.GamepadButton ? button.value : button;
						if (this.moveLeft == 0) {
							joystick = gamepad.axes[this.GamepadIndices.AXIS_LEFT_JOYSTICK_X];
							joystickAbs = Math.abs(joystick);
							this.moveLeft = (joystick < 0 && joystickAbs >= this.joystickThreshold) ? joystickAbs : 0;
						}
					}
					if (!this.moveUpKeyPressed) {
						button = gamepad.buttons[this.GamepadIndices.BUTTON_3];

                        this.moveUp = window.GamepadButton ? button.value : button;
						if (this.moveUp == 0) {
							joystick = gamepad.axes[this.GamepadIndices.AXIS_RIGHT_JOYSTICK_Y];
							joystickAbs = Math.abs(joystick);
							this.moveUp = (joystick < 0 && joystickAbs >= this.joystickThreshold) ? joystickAbs : 0;
						}
					}
					if (!this.moveDownKeyPressed) {
						button = gamepad.buttons[this.GamepadIndices.BUTTON_0];
						this.moveDown = window.GamepadButton ? button.value : button;
						if (this.moveDown == 0) {
							joystick = gamepad.axes[this.GamepadIndices.AXIS_RIGHT_JOYSTICK_Y];
							joystickAbs = Math.abs(joystick);
							this.moveDown = (joystick > 0 && joystickAbs >= this.joystickThreshold) ? joystickAbs : 0;
						}
					}

					if (!this.moveFastKeyPressed) {
						button = gamepad.buttons[this.GamepadIndices.BUTTON_RIGHT_TRIGGER];
						this.moveFast = window.GamepadButton ? button.value : button;	
					}

					button = gamepad.buttons[this.GamepadIndices.BUTTON_1]; //"B" button
					this.bButtonValue = button ? button.value : 0;


					button = gamepad.buttons[this.GamepadIndices.BUTTON_2]; //"X" button
					this.xButtonValue = button ? button.value : 0;
						
					
				}
			}

			if (this.camera) {
				this.camera.updateMatrixWorld();
				this.camera.matrixWorld.extractBasis(this.rightVector, this.upVector, this.forwardVector);
			}
			else {
				this.object.updateMatrixWorld();
				this.object.matrixWorld.extractBasis(this.rightVector, this.upVector, this.forwardVector);
			}

			var maxMoveSpeed = this.maxMoveNormalSpeed;

            //Change the speed at which you fly based on how close you are to the centerObject
            if ( this.exponentialCenterObject instanceof THREE.Object3D ) {
                this.reusableVector1.setFromMatrixPosition( this.camera? this.camera.matrixWorld :  this.object.matrixWorld);
                this.exponentialCenterObject.updateMatrixWorld();
                this.reusableVector2.setFromMatrixPosition(this.exponentialCenterObject.matrixWorld);

                var distance = this.reusableVector1.distanceTo(this.reusableVector2);

                maxMoveSpeed = Math.max(Math.min( maxMoveSpeed, 1 - Math.pow(2, - 1 * distance)), 0.001);
               //console.log ("maxMoveSpeed: " + maxMoveSpeed)
            } else if (this.exponentialCenterObject instanceof THREE.Vector3 ) {
            	this.reusableVector1.setFromMatrixPosition( this.camera? this.camera.matrixWorld :  this.object.matrixWorld);
            	this.reusableVector1.y = 0;
            	var distance = this.reusableVector1.distanceTo(this.exponentialCenterObject);
            	maxMoveSpeed = Math.max(Math.min( maxMoveSpeed, 1 - Math.pow(2, - 1 * distance)), 0.001);
            }

            if (this.moveFast > 0) {
                maxMoveSpeed = this.maxMoveNormalSpeed + (this.maxMoveFastSpeed - this.maxMoveNormalSpeed) * this.moveFast;
            }


            if (this.moveForward > 0) {
				this.currentMoveForwardSpeed += this.moveAcceleration * delta;
				this.currentMoveForwardSpeed *= this.moveForward;
				if (this.currentMoveForwardSpeed >= maxMoveSpeed) {
					this.currentMoveForwardSpeed = maxMoveSpeed;
				}
			}
			else {
				this.currentMoveForwardSpeed -= this.moveDeceleration * delta;
				if (this.currentMoveForwardSpeed <= 0) {
					this.currentMoveForwardSpeed = 0;
				}
			}
			if (this.moveBackward > 0) {
				this.currentMoveBackwardSpeed += this.moveAcceleration * delta;
				this.currentMoveBackwardSpeed *= this.moveBackward;
				if (this.currentMoveBackwardSpeed >= maxMoveSpeed) {
					this.currentMoveBackwardSpeed = maxMoveSpeed;
				}
			}
			else {
				this.currentMoveBackwardSpeed -= this.moveDeceleration * delta;
				if (this.currentMoveBackwardSpeed <= 0) {
					this.currentMoveBackwardSpeed = 0;
				}
			}
			if (this.moveRight > 0) {
				this.currentMoveRightSpeed += this.moveAcceleration * delta;
				this.currentMoveRightSpeed *= this.moveRight;
				if (this.currentMoveRightSpeed >= maxMoveSpeed) {
					this.currentMoveRightSpeed = maxMoveSpeed;
				}
			}
			else {
				this.currentMoveRightSpeed -= this.moveDeceleration * delta;
				if (this.currentMoveRightSpeed <= 0) {
					this.currentMoveRightSpeed = 0;
				}
			}
			if (this.moveLeft > 0) {
				this.currentMoveLeftSpeed += this.moveAcceleration * delta;
				this.currentMoveLeftSpeed *= this.moveLeft;
				if (this.currentMoveLeftSpeed >= maxMoveSpeed) {
					this.currentMoveLeftSpeed = maxMoveSpeed;
				}
			}
			else {
				this.currentMoveLeftSpeed -= this.moveDeceleration * delta;
				if (this.currentMoveLeftSpeed <= 0) {
					this.currentMoveLeftSpeed = 0;
				}
			}
			if (this.moveUp > 0) {
				this.currentMoveUpSpeed += this.moveAcceleration * delta;
				this.currentMoveUpSpeed *= this.moveUp;
				if (this.currentMoveUpSpeed >= maxMoveSpeed) {
					this.currentMoveUpSpeed = maxMoveSpeed;
				}
			}
			else {
				this.currentMoveUpSpeed -= this.moveDeceleration * delta;
				if (this.currentMoveUpSpeed <= 0) {
					this.currentMoveUpSpeed = 0;
				}
			}
			if (this.moveDown > 0) {
				this.currentMoveDownSpeed += this.moveAcceleration * delta;
				this.currentMoveDownSpeed *= this.moveDown;
				if (this.currentMoveDownSpeed >= maxMoveSpeed) {
					this.currentMoveDownSpeed = maxMoveSpeed;
				}
			}
			else {
				this.currentMoveDownSpeed -= this.moveDeceleration * delta;
				if (this.currentMoveDownSpeed <= 0) {
					this.currentMoveDownSpeed = 0;
				}
			}

			this.currentMoveForwardDirectionAndSpeed.copy(this.forwardVector);
			this.currentMoveForwardDirectionAndSpeed.multiplyScalar(this.currentMoveForwardSpeed * delta);

			this.currentMoveBackwardDirectionAndSpeed.copy(this.forwardVector);
			this.currentMoveBackwardDirectionAndSpeed.multiplyScalar(this.currentMoveBackwardSpeed * delta);

			this.currentMoveRightDirectionAndSpeed.copy(this.rightVector);
			this.currentMoveRightDirectionAndSpeed.multiplyScalar(this.currentMoveRightSpeed * delta);

			this.currentMoveLeftDirectionAndSpeed.copy(this.rightVector);
			this.currentMoveLeftDirectionAndSpeed.multiplyScalar(this.currentMoveLeftSpeed * delta);

			this.currentMoveUpDirectionAndSpeed.copy(this.upVector);
			this.currentMoveUpDirectionAndSpeed.multiplyScalar(this.currentMoveUpSpeed * delta);

			this.currentMoveDownDirectionAndSpeed.copy(this.upVector);
			this.currentMoveDownDirectionAndSpeed.multiplyScalar(this.currentMoveDownSpeed * delta);

			this.currentMoveDirectionAndSpeed.set(0, 0, 0);
			// if (this.object.fov) {
				this.currentMoveDirectionAndSpeed.sub(this.currentMoveForwardDirectionAndSpeed);
				this.currentMoveDirectionAndSpeed.add(this.currentMoveBackwardDirectionAndSpeed);
				this.currentMoveDirectionAndSpeed.add(this.currentMoveRightDirectionAndSpeed);
				this.currentMoveDirectionAndSpeed.sub(this.currentMoveLeftDirectionAndSpeed);
			// }
			// else {
			// 	this.currentMoveDirectionAndSpeed.add(this.currentMoveForwardDirectionAndSpeed);
			// 	this.currentMoveDirectionAndSpeed.sub(this.currentMoveBackwardDirectionAndSpeed);
			// 	this.currentMoveDirectionAndSpeed.sub(this.currentMoveRightDirectionAndSpeed);
			// 	this.currentMoveDirectionAndSpeed.add(this.currentMoveLeftDirectionAndSpeed);
			// }
			this.currentMoveDirectionAndSpeed.add(this.currentMoveUpDirectionAndSpeed);
			this.currentMoveDirectionAndSpeed.sub(this.currentMoveDownDirectionAndSpeed);

			this.object.position.add(this.currentMoveDirectionAndSpeed);
			this.stationaryScene.position.add(this.currentMoveDirectionAndSpeed);
		};

	}();

	this.updateDeviceMove = function () {

		var alpha, beta, gamma, orient;

		var deviceMatrix;

		return function () {

			alpha  = THREE.Math.degToRad( this.deviceOrientation.alpha || 0 ); // Z
			beta   = THREE.Math.degToRad( this.deviceOrientation.beta  || 0 ); // X'
			gamma  = THREE.Math.degToRad( this.deviceOrientation.gamma || 0 ); // Y''
			orient = THREE.Math.degToRad( this.screenOrientation       || 0 ); // O

			// only process non-zero 3-axis data
			if ( alpha !== 0 && beta !== 0 && gamma !== 0) {

				if ( this.useQuaternions ) {

					deviceQuat = createQuaternion( alpha, beta, gamma, orient );

				} else {

					deviceMatrix = createRotationMatrix( alpha, beta, gamma, orient );

					deviceQuat.setFromRotationMatrix( deviceMatrix );

				}

				if ( this.freeze ) return;

				//this.object.quaternion.slerp( deviceQuat, 0.07 ); // smoothing
				this.object.quaternion.copy( deviceQuat );

			}

		};

	}();

	this.update = function (delta) {
		this.updateDeviceMove();

		// if ( appState !== CONTROLLER_STATE.AUTO ) {
			this.updateManualMove(delta);
		// }

		if (this.priorXButtonValue != this.xButtonValue){
            this.callEventListeners('xGamepadButtonChanged', this.xButtonValue);
			this.priorXButtonValue = this.xButtonValue;
		}
		if (this.priorBButtonValue != this.bButtonValue){
            this.callEventListeners('bGamepadButtonChanged', this.bButtonValue);
			this.priorBButtonValue = this.bButtonValue;
		}
	};

	this.connect = function () {
		window.addEventListener( 'resize', this.constrainObjectFOV, false );

		// If VRWebGL is active we should not use the deviceorientation
		if (!window.VRWebGLRenderingContext) {
            window.addEventListener('orientationchange', this.onScreenOrientationChange, false);
            if ( navigator.appVersion.indexOf("Edge") == -1) { //on Edge on the TabletPC, the accelerometer does strange things, so disable it
                window.addEventListener('deviceorientation', this.onDeviceOrientationChange, false);
            }
			window.addEventListener( 'compassneedscalibration', this.onCompassNeedsCalibration, false );
		}

		this.element.addEventListener( 'mousedown', this.onDocumentMouseDown, false );
		this.element.addEventListener( 'touchstart', this.onDocumentTouchStart, false );

		window.addEventListener("keydown", this.onKeyDown, false);
		window.addEventListener("keyup", this.onKeyUp, false);

		this.freeze = false;
	};

	this.disconnect = function () {
		this.freeze = true;

		window.removeEventListener( 'resize', this.constrainObjectFOV, false );

		if (!window.VRWebGLRenderingContext) {
			window.removeEventListener( 'orientationchange', this.onScreenOrientationChange, false );
			window.removeEventListener( 'deviceorientation', this.onDeviceOrientationChange, false );

			window.removeEventListener( 'compassneedscalibration', this.onCompassNeedsCalibration, false );
		}

		this.element.removeEventListener( 'mousedown', this.onDocumentMouseDown, false );
		this.element.removeEventListener( 'touchstart', this.onDocumentTouchStart, false );

		window.removeEventListener("keydown", this.onKeyDown, false);
		window.removeEventListener("keyup", this.onKeyUp, false);
	};

    this.setExponentialSpeedCenter = function( exponentialCenterObject ) {
        this.exponentialCenterObject = exponentialCenterObject;

    };
};


FLOW.OOPUtils.prototypalInheritance(FLOW.FlyControls, FLOW.EventUtils.Observable);


(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.FlyControls;
}));

