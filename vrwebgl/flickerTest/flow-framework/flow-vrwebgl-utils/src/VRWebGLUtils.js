var THREE = THREE || require("three");

var FLOW = FLOW || {};

FLOW.VRWebGLUtils = {
	setCameraWorldMatrix: function() {
		var usageMessage = "Possible call arguments are: 1) VRWebGLUtils.setCameraWorldMatrix(WebGLRenderingContext, Array) 2) VRWebGLUtils.setCameraWorldMatrix(THREE.WebGLRenderer, THREE.Camera)";
		if (!window.VRWebGLRenderingContext) return this;
		if (arguments.length != 2) throw "ERROR: VRWebGLUtils.setCameraWorldMatrix requires 2 arguments. " + usageMessage;
		var arg0 = arguments[0];
		var arg1 = arguments[1];
		// Check first argument
		var vrWebGLContext;
		if (arg0 instanceof VRWebGLRenderingContext) {
			vrWebGLContext = arg0;
		} else if (arg0 instanceof THREE.WebGLRenderer) {
			vrWebGLContext = arg0.getContext();
		}
		else {
			throw "ERROR: Incorrect first argunent. " + usageMessage;
		}
		// Check second argument
		var cameraWorldMatrix;
		if (arg1 instanceof Array && arg1.length === 16) {
			cameraWorldMatrix = arg1;
		}
		else if (arg1 instanceof THREE.Camera) {
			arg1.updateMatrixWorld(true);
			cameraWorldMatrix = arg1.matrixWorld.elements;
		}
		else {
			throw "ERROR: Incorrect second argument. " + usageMessage;
		}
		// Perform the operation
		if (vrWebGLContext && vrWebGLContext.setCameraWorldMatrix) {
			vrWebGLContext.setCameraWorldMatrix(cameraWorldMatrix);
        } else {
            console.log("VRWebGLUtils.setCameraWorldMatrix.vrWebGLContext: null");
        }
		return this;
	},
	setCameraProjectionMatrix: function() {
		var usageMessage = "Possible call arguments are: 1) VRWebGLUtils.setCameraProjectionMatrix(WebGLRenderingContext, Array) 2) VRWebGLUtils.setCameraProjectionMatrix(THREE.WebGLRenderer, THREE.Camera)";
		if (!window.VRWebGLRenderingContext) return this;
		if (arguments.length != 2) throw "ERROR: VRWebGLUtils.setCameraProjectionMatrix requires 2 arguments. " + usageMessage;
		var arg0 = arguments[0];
		var arg1 = arguments[1];
		// Check first argument
		var vrWebGLContext;
		if (arg0 instanceof VRWebGLRenderingContext) {
			vrWebGLContext = arg0;
		} else if (arg0 instanceof THREE.WebGLRenderer) {
			vrWebGLContext = arg0.getContext();
		}
		else {
			throw "ERROR: Incorrect first argunent. " + usageMessage;
		}
		// Check second argument
		var cameraProjectionMatrix;
		if (arg1 instanceof Array && arg1.length === 16) {
			cameraProjectionMatrix = arg1;
		}
		else if (arg1 instanceof THREE.Camera) {
			cameraProjectionMatrix = arg1.projectionMatrix.elements;
		}
		else {
			throw "ERROR: Incorrect second argument. " + usageMessage;
		}
		// Perform the operation
        if (vrWebGLContext && vrWebGLContext.setCameraWorldMatrix) {
            vrWebGLContext.setCameraProjectionMatrix(cameraProjectionMatrix);
        } else {
            console.log("VRWebGLUtils.setCameraWorldMatrix.vrWebGLContext: null");
		}
		return this;
	},
	setThreeJSCameraMatrices: function(renderer, camera) {
		this.setCameraWorldMatrix(renderer, camera);
		this.setCameraProjectionMatrix(renderer, camera);
		return this;
	}
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.VRWebGLUtils;
}));