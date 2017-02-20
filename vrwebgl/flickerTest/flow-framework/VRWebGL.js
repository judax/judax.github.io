(function() {

    window.VRWebGL = "VRWebGL";

    if (typeof(window.VRWebGLRenderingContext) !== "undefined") {

        var makeOriginalWebGLCalls = false;

        if (location.search.includes("fullwebvrapi")) {
            // FULL WEBVR 1.0 API
            function notifyVRDisplayPresentChangeEvent(vrDisplay) {
                var event = new CustomEvent('vrdisplaypresentchange', {detail: {vrdisplay: self}});
                window.dispatchEvent(event);
                if (typeof(window.onvrdisplaypresentchange) === "function") {
                    window.onvrdisplaypresentchange(event);
                }
            }

            var nextDisplayId = 1000;

            VRDisplay = function() {
                var _layers = null;
                var _rigthEyeParameters = new VREyeParameters();
                var _leftEyeParameters = new VREyeParameters();
                var _pose = new VRPose();
                _pose.orientation = new Float32Array(4);

                this.isConnected = false;
                this.isPresenting = false;
                this.capabilities = new VRDisplayCapabilities();
                this.capabilities.hasOrientation = true;
                this.capabilities.canPresent = true;
                this.capabilities.maxLayers = 1;
                // this.stageParameters = null; // OculusMobileSDK (Gear VR) does not support room scale VR yet, this attribute is optional.
                this.getEyeParameters = function(eye) {
                    var eyeParameters = null;
                    console.log("VRWebGL.getEyeParameters ->");
                    if (vrWebGLRenderingContexts.length > 0) {
                        eyeParameters = vrWebGLRenderingContexts[0].getEyeParameters();
                    }
                    console.log("VRWebGL.getEyeParameters -> eyeParameters: " + eyeParameters);

                    if (eyeParameters !== null && eye === 'left') {
                        eyeParameters.offset = -eyeParameters.offset;
                    }
                    return eyeParameters;
                };
                this.displayId = nextDisplayId++;
                this.displayName = 'VRWebGL Oculus Mobile deviceName';
                this.getPose = function() {
                    var pose = null;
                    //console.log("VRWebGL.getPose ->");

                    if (vrWebGLRenderingContexts.length > 0) {
                        pose = vrWebGLRenderingContexts[0].getPose();
                    }
                    return pose;
                };
                this.getImmediatePose = function() {
                    return getPose();
                };
                this.resetPose = function() {
                    // TODO: Make a call to the native extension to reset the pose.
                };
                this.depthNear = 0.01;
                this.depthFar = 10000.0;
                this.requestAnimationFrame = function(callback) {
                    return window.requestAnimationFrame(callback);
                };
                this.cancelAnimationFrame = function(handle) {
                    return window.cancelAnimationFrame(handle);
                };
                this.requestPresent = function(layers) {
                    var self = this;
                    return new Promise(function(resolve, reject) {
                        self.isPresenting = true;
                        notifyVRDisplayPresentChangeEvent(self);
                        _layers = layers;
                        resolve();
                    });
                };
                this.exitPresent = function() {
                    var self = this;
                    return new Promise(function(resolve, reject) {
                        self.isPresenting = false;
                        resolve();
                    });
                };
                this.getLayers = function() {
                    return _layers;
                };
                this.submitFrame = function(pose) {
                    // TODO: Learn fom the WebVR Polyfill how to make the barrel distortion.
                };
                return this;
            };

            VRLayer = function() {
                this.source = null;
                this.leftBounds = [];
                this.rightBounds = [];
                return this;
            };

            VRDisplayCapabilities = function() {
                this.hasPosition = false;
                this.hasOrientation = false;
                this.hasExternalDisplay = false;
                this.canPresent = false;
                this.maxLayers = 0;
                return this;
            };

            VREye = {
                left: "left",
                right: "right"
            };

            VRFieldOfView = function() {
                this.upDegrees = 0;
                this.rightDegrees = 0;
                this.downDegrees = 0;
                this.leftDegrees = 0;
                return this;
            };

            VRPose = function() {
                this.timeStamp = 0;
                this.position = null;
                this.linearVelocity = null;
                this.linearAcceleration = null;
                this.orientation = null;
                this.angularVelocity = null;
                this.angularAcceleration = null;
                return this;
            };

            VREyeParameters = function() {
                this.offset = 0;
                this.fieldOfView = new VRFieldOfView();
                this.renderWidth = 0;
                this.renderHeight = 0;
                return this;
            };

            VRStageParameters = function() {
                this.sittingToStandingTransform = null;
                this.sizeX = 0;
                this.sizeZ = 0;
                return this;
            };

            // The VR displayes
            var displays = [ new VRDisplay() ];
            // The promise resolvers for those promises created before the start event is received === devices are created.
            var resolvers = [];

            navigator.getVRDisplays = function() {
                return new Promise(
                    function(resolve, reject) {
                        resolve(displays);
                    });
            };
        }
        else {
            // FAKE WEBVR 1.0 API
            // This is a fake WebVR API polyfill so VRWebGL works on WebVR based web apps.
            // WebVR polyfills will find these definitions and think WebVR is available (when is clearly not).
            window.VRDisplay = function() {};
            navigator.getVRDevices = navigator.getVRDisplays = function() { return new Promise(function(resolve, reject) { resolve([]); })};
        }

        // Store the original requestAnimationFrame function as we want to inject ours.
        // We need to have control over the requestAnimationFrame to identify the webGL calls that should be performes in the native render loop/function.
        var originalRequestAnimationFrame = window.requestAnimationFrame;

        // We will store all the request animation frame callbacks in a queue, the same way the native side does it.
        // If, for some reason, more than one callback is set before the previous one is processed, we need to make sure that
        // we hold on to the previous functions too to keep their context/closures.
        var requestAnimationFrameCallbacks = [];

        var vrWebGLRenderingContexts = [];
        var vrWebGLVideos = [];

        function vrWebGLequestAnimationFrame() {
            for (var i = 0; i < vrWebGLVideos.length; i++) {
                var vrWebGLVideo = vrWebGLVideos[i];
                if (!vrWebGLVideo.prepared && vrWebGLVideo.checkPrepared()) {
                    vrWebGLVideo.callEventListeners("canplaythrough");
                }
                if (!vrWebGLVideo.ended && vrWebGLVideo.checkEnded()) {
                    vrWebGLVideo.callEventListeners("ended");
                }
            }
            if ( ! window.vrWebGlAlready ) {
                console.log("VRWebGL.vrWebGLequestAnimationFrame -> vrWebGLRenderingContexts.length:" + vrWebGLRenderingContexts.length);
                window.vrWebGlAlready = true;
            }
            for (var i = 0; i < vrWebGLRenderingContexts.length; i++) {
                vrWebGLRenderingContexts[i].startFrame();
            }

            var argumentsArray = Array.prototype.slice.apply(arguments);
            requestAnimationFrameCallbacks[0].apply(this, argumentsArray);
            requestAnimationFrameCallbacks.splice(0, 1);

            for (var i = 0; i < vrWebGLRenderingContexts.length; i++) {
                vrWebGLRenderingContexts[i].endFrame();
            }
        }

        window.requestAnimationFrame = function(callback) {
            requestAnimationFrameCallbacks.push(callback);
            originalRequestAnimationFrame.call(this, vrWebGLequestAnimationFrame);
        };

        // Replace the original WebGLRenderingContext for the VRWebGLRenderingContext
        var originalWebGLRenderingContext = window.WebGLRenderingContext;
        window.WebGLRenderingContext = window.VRWebGLRenderingContext;

        // Store the original VRWebGL texImage2D function prototype as we will slightly change it but still call it.
        var originalVRWebGLTexImage2D = window.VRWebGLRenderingContext.prototype.texImage2D;
        window.VRWebGLRenderingContext.prototype.texImage2D = function() {
            var argumentsArray = Array.prototype.slice.apply(arguments);
            var result = undefined;
            // These are all the possible call options according to the WebGL spec
            // 1.- void gl.texImage2D(target, level, internalformat, width, height, border, format, type, ArrayBufferView? pixels);
            // 2.- void gl.texImage2D(target, level, internalformat, format, type, ImageData? pixels);
            // 3.- void gl.texImage2D(target, level, internalformat, format, type, HTMLImageElement? pixels);
            // 4.- void gl.texImage2D(target, level, internalformat, format, type, HTMLCanvasElement? pixels);
            // 5.- void gl.texImage2D(target, level, internalformat, format, type, HTMLVideoElement? pixels);
            if (argumentsArray.length === 6) {
                if (argumentsArray[5] instanceof HTMLCanvasElement) {
                    // Let's assume that the parameter is a canvas.
                    var canvas = argumentsArray[5]
                    var canvasInBase64 = canvas.toDataURL();
                    var image = new Image();
                    image.src = canvasInBase64;
                    argumentsArray[5] = image;
                }
                // TODO: Still 2 calls are not being handled: the ones that pass these parameters. ImageData and HTMLVideoElement
            }
            return originalVRWebGLTexImage2D.apply(this, argumentsArray);
        }

        // Store the original HTMLCanvasElement getContext function as we want to inject ours.
        var originalHTMLCanvasElementPrototypeGetContextFunction = HTMLCanvasElement.prototype.getContext;
        // Replace the HTMLCanvasElement getContext function with out own version
        HTMLCanvasElement.prototype.getContext = function() {
            var argumentsArray = Array.prototype.slice.apply(arguments);
            console.log("VRWebGl -> HTMLCanvasElement.prototype.getContext");
            if (typeof(argumentsArray[0]) === "string" && (argumentsArray[0] === "webgl" || argumentsArray[0] === "experimental-webgl")) {
                console.log("VRWebGl -> typeof arguments match");
                if (vrWebGLRenderingContexts.length == 0) {
                    vrWebGLRenderingContexts.push(new VRWebGLRenderingContext());
                }
                return vrWebGLRenderingContexts[0];
            }
            else {
                console.log("VRWebGl -> originalGetContextFunction");
                return originalHTMLCanvasElementPrototypeGetContextFunction.apply(this, argumentsArray);
            }
        };

        if (location.search.includes("vrwebglvideo")) {
            // Replace the original document.createElement function with our own to be able to create the correct video element for VRWebGL
            var originalDocumentCreateElementFunction = document.createElement;
            document.createElement = function() {
                var argumentsArray = Array.prototype.slice.apply(arguments);
                if (typeof(argumentsArray[0]) === "string" && argumentsArray[0] === "video") {
                    var vrWebGLVideo = new VRWebGLVideo();
                    vrWebGLVideos.push(vrWebGLVideo);

                    vrWebGLVideo.listeners = { };
                    vrWebGLVideo.addEventListener = function(eventType, callback) {
                        var listeners = this.listeners[eventType];
                        if (!listeners) {
                            listeners = [];
                            this.listeners[eventType] = listeners;
                        }
                        if (listeners.indexOf(callback) < 0) {
                            listeners.push(callback);
                        }
                        return this;
                    };
                    vrWebGLVideo.removeEventListener = function(eventType, callback) {
                        var listeners = this.listeners[eventType];
                        if (listeners) {
                            var i = listeners.indexOf(callback);
                            if (i >= 0) {
                                this.listeners[eventType] = listeners.splice(i, 1);
                            }
                        }
                        return this;
                    };
                    vrWebGLVideo.callEventListeners = function(eventType) {
                        var event = { target : this };
                        var onEventType = 'on' + eventType;
                        if (typeof(this[onEventType]) === 'function') {
                            this[onEventType](event)
                        }
                        var listeners = this.listeners[eventType];
                        if (listeners) {
                            for (var i = 0; i < listeners.length; i++) {
                                listeners[i](event);
                            }
                        }
                        return this;
                    };

                    return vrWebGLVideo;
                }
                else {
                    return originalDocumentCreateElementFunction.apply(this, argumentsArray);
                }
            };

            document.deleteElement = function(obj) {
                for (var i =0; i < vrWebGLVideos.length; i++) {
                    if (vrWebGLVideos[i] === obj) {
                        vrWebGLVideos.splice(i, 1);
                        break;
                    }
                }
                return this;
            };
        }
    }
})();
