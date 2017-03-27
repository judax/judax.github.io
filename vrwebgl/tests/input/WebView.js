var THREE = THREE || require("three");

var IBIZA = IBIZA || {};
IBIZA.InputElement = IBIZA.InputElement || require("inputelement");

IBIZA.WebView = function() {

	// Internal function to create the THREE.Mesh that will represent the webview.
	function createWebViewMesh(webview, fallbackVideoPath) {
		var geometry = new THREE.BufferGeometry();

		// The camera or video and the texture coordinates may vary depending if the vrDisplay has the see through camera.
		if (webview) {
			// HACK: Needed to tell the THREE.VideoTexture that the "video" is ready and that the texture needs to update.
			webview.readyState = 2;
			webview.HAVE_CURRENT_DATA = 2;
		}
		else {
			webview = document.createElement("video");
			webview.src = typeof(fallbackVideoPath) === "string" ? fallbackVideoPath : "firefox.ogv";
			webview.play();
		}

        geometry.VRWebGL_textureCoords = [ new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]) ];

		geometry.addAttribute("position", new THREE.BufferAttribute( new Float32Array([
			-0.5,  0.5, 0.0, 
			-0.5, -0.5, 0.0,
			 0.5,  0.5, 0.0, 
			 0.5, -0.5, 0.0
		]), 3));

		geometry.setIndex(new THREE.BufferAttribute( new Uint16Array([0, 1, 2, 2, 1, 3]), 1));
		geometry.VRWebGL_textureCoordIndex = 0;
		var textureCoords = geometry.VRWebGL_textureCoords[geometry.VRWebGL_textureCoordIndex];

		geometry.addAttribute("uv", new THREE.BufferAttribute( new Float32Array(textureCoords), 2 ));
		geometry.computeBoundingSphere();

		var texture = new THREE.VideoTexture(webview);
		texture.minFilter = THREE.NearestFilter;
		texture.magFilter = THREE.NearestFilter;
		texture.format = THREE.RGBFormat;			
		texture.flipY = false;

	   	// texture = new THREE.Texture(webview);
	    // texture.generateMipmaps = false;
	    // texture.minFilter = THREE.LinearFilter;
	    // texture.magFilter = THREE.LinearFilter;
	    // texture.format = THREE.RGBFormat;

		// The material is different if we are using a real VRWebGLWebView or just an ordinary element.
		var material;
		if (window.VRWebGLWebView) {
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

		    material = new THREE.RawShaderMaterial({
		        uniforms: {
		            map: {type: 't', value: texture},
		        },
		        vertexShader: vertexShaderSource.join( '\r\n' ),
		        fragmentShader: fragmentShaderSource.join( '\r\n' ),
		        side: THREE.DoubleSide,
		    });
		}
		else {
			material = new THREE.MeshBasicMaterial( {color: 0xFFFFFF, side: THREE.DoubleSide, map: texture } );
		}

		var mesh = new THREE.Mesh(geometry, material);

		return mesh;
	}

	this._calculateIntersectionPoint = function(event) {
		// TODO: Decide if we want to calculate the inverse every time or consider that the WebView won't change its transformations for our purpose and calculate it only once.
		// Only recalculate if it is a new event depending on the time. These operations are expensive and they need to be executed more than once per frame (more then one event can be fired)
		if (event.intersection && event.time !== this._eventTime) {
			// Normalize the intersection point using the mesh world matrix inverse. The mesh is originally a 1x1 normalized plane.
			this._mesh.updateMatrixWorld(true);
			this._meshInverseMatrixWorld.getInverse(this._mesh.matrixWorld);
			this._normalizedIntersectionPoint.copy(event.intersection.point);
			this._normalizedIntersectionPoint.applyMatrix4(this._meshInverseMatrixWorld);
			// Set the point to reference the 0,0 2D view coordinate system (0,0 is the left top corner, not like in 3D that is the left bottom corner)
			this._normalizedIntersectionPoint.x += 0.5;
			this._normalizedIntersectionPoint.y = 1.0 - (this._normalizedIntersectionPoint.y + 0.5);
			this._eventTime = event.time;
		}
		return this;
	};

	// Properties
	this._webview = window.VRWebGLWebView ? document.createElement("webview") : null;
	this._mesh = createWebViewMesh(this._webview);
	this._normalizedIntersectionPoint = new THREE.Vector3();
	this._meshInverseMatrixWorld = new THREE.Matrix4();
	this._inputElement = new IBIZA.InputElement(this._mesh);
	this._eventTime = -1;
	this._touchEvent = null;
	this._touchEventName = null;
	this._pressEvent = null;
	this._pressEventName = null;
	this._touchpadPos = new THREE.Vector3();
	this._normalizedIntersectionPointForTouch = new THREE.Vector3();

	// Reimplement InputElement's update function so we can get a hold of it and do the right calls to the webview depending on the events.
	// We need to do this because the webview is a very particular case where the press and touch events overlap. If there has been a press event, the touch event should not be taken into consideration.
	this._inputElement.update = function() {
		// Reset all the touch and press event data.
		this._touchEvent = this._touchEventName = this._pressEvent = this._pressEventName = null;
		var argumentsArray = Array.prototype.slice.call(arguments);
		// Call the original update method from InputElement
		IBIZA.InputElement.prototype.update.apply(this._inputElement, argumentsArray);
		if (this._webview) {
			// At this point all the events have been fired if there was any touch or press events, process them correctly. Press events override touch events for the webview.
			if (this._pressEvent) {
				this._calculateIntersectionPoint(this._pressEvent);
				if (this._pressEventName === "pressstart") {
					this._webview.touchstart(this._normalizedIntersectionPoint.x, this._normalizedIntersectionPoint.y);
				}
				else if (this._pressEventName === "pressend") {
					this._webview.touchend(this._normalizedIntersectionPoint.x, this._normalizedIntersectionPoint.y);
				}
				else if (this._pressEventName === "pressmove") {
					this._webview.touchmove(this._normalizedIntersectionPoint.x, this._normalizedIntersectionPoint.y);
				}
			}
			else if (this._touchEvent) {
				this._calculateIntersectionPoint(this._touchEvent);
				var action = null;
				if (this._touchEventName === "touchstart") {
					// Store the touchpadPos for the first time when the touch starts
					this._touchpadPos.set(this._touchEvent.gamepad.axes[0], this._touchEvent.gamepad.axes[1], 0);
					// Store the current normalized intersection poisition as we will pivot/offset around it
					this._normalizedIntersectionPointForTouch.copy(this._normalizedIntersectionPoint);
					action = VRWebGLWebView.prototype.touchstart;
				}
				else if (this._touchEventName === "touchend") {
					action = VRWebGLWebView.prototype.touchend;
				}
				else if (this._touchEventName === "touchmove") {
					action = VRWebGLWebView.prototype.touchmove;
				}
				// Calculate the offset from the normalized intersection position for touch
				var offsetX = this._touchEvent.gamepad.axes[0] - this._touchpadPos.x;
				var offsetY = this._touchEvent.gamepad.axes[1] - this._touchpadPos.y;
				this._normalizedIntersectionPoint.x = this._normalizedIntersectionPointForTouch.x + offsetX;
				this._normalizedIntersectionPoint.y = this._normalizedIntersectionPointForTouch.y + offsetY;

				// Store the touchpad pos and the normalized intersection point for the next possible event
				this._touchpadPos.set(this._touchEvent.gamepad.axes[0], this._touchEvent.gamepad.axes[1], 0);
				this._normalizedIntersectionPointForTouch.copy(this._normalizedIntersectionPoint);

				// Make the actual call.
				action.call(this._webview, this._normalizedIntersectionPoint.x, this._normalizedIntersectionPoint.y);
			}
		}
		return this._inputElement;
	}.bind(this);

	// Listen to the InputElement events.
	// Cursor events can be fired immediately.
	this._inputElement.addEventListener("cursorenter", function(event) {
		if (this._webview) {
			this._calculateIntersectionPoint(event);
			this._webview.cursorenter(this._normalizedIntersectionPoint.x, this._normalizedIntersectionPoint.y);
		}
		return this._inputElement;
	}.bind(this));
	this._inputElement.addEventListener("cursorexit", function(event) {
		if (this._webview) {
			this._webview.cursorexit();
		}
		return this._inputElement;
	}.bind(this));
	this._inputElement.addEventListener("cursormove", function(event) {
		if (this._webview) {
			this._calculateIntersectionPoint(event);
			this._webview.cursormove(this._normalizedIntersectionPoint.x, this._normalizedIntersectionPoint.y);
		}
		return this._inputElement;
	}.bind(this));

	// Press and touch events are stored because press events override touch events. They will be processed in the overloaded InputElement update method above.
	this._inputElement.addEventListener("pressstart", function(event) {
		this._pressEvent = event;
		this._pressEventName = "pressstart";
		return this._inputElement;
	}.bind(this));
	this._inputElement.addEventListener("pressend", function(event) {
		this._pressEvent = event;
		this._pressEventName = "pressend";
		return this._inputElement;
	}.bind(this));
	this._inputElement.addEventListener("pressmove", function(event) {
		this._pressEvent = event;
		this._pressEventName = "pressmove";
		return this._inputElement;
	}.bind(this));
	this._inputElement.addEventListener("touchstart", function(event) {
		this._touchEvent = event;
		this._touchEventName = "touchstart";
		return this._inputElement;
	}.bind(this));
	this._inputElement.addEventListener("touchend", function(event) {
		this._touchEvent = event;
		this._touchEventName = "touchend";
		return this._inputElement;
	}.bind(this));
	this._inputElement.addEventListener("touchmove", function(event) {
		this._touchEvent = event;
		this._touchEventName = "touchmove";
		return this._inputElement;
	}.bind(this));

	return this;
};

IBIZA.WebView.prototype.getMesh = function() {
	return this._mesh;
};

IBIZA.WebView.prototype.getInputElement = function() {
	return this._inputElement;
};

IBIZA.WebView.prototype.getWebView = function() {
	return this._webview;
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return IBIZA.WebView;
}));
