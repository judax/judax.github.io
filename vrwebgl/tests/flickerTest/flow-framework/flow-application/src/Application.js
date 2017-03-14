//'use strict'

var THREE = THREE || require('three');
THREE.VRControls = THREE.VRControls || require("vrcontrols");
THREE.VREffect = THREE.VREffect || require('vreffect');
//THREE.OBJLoader = THREE.OBJLoader || require("objloader");

var FLOW = FLOW || {};
FLOW.ErrorUtils = FLOW.ErrorUtils || require("flow-error-utils");
FLOW.FlyControls = FLOW.FlyControls || require('flow-fly-controls');
FLOW.VRWebGLUtils = FLOW.VRWebGLUtils || require('flow-vrwebgl-utils');
//FLOW.Animation = FLOW.Animation || require('flow-animation');
FLOW.THREE = FLOW.THREE || require('flow-three');

FLOW.MathUtils = FLOW.MathUtils || require('flow-math-utils');
FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.Text = FLOW.Text || require('flow-text');
FLOW.Color = FLOW.Color || require('flow-color-utils');
FLOW.Audio = FLOW.Audio || require('flow-audio');
FLOW.Environment = FLOW.Environment || require('flow-environment');
FLOW.Platform = FLOW.Platform || require("flow-platform");
FLOW.Load = FLOW.Load || require("flow-loader");
FLOW.LoaderViewer = FLOW.LoaderViewer || require("flow-loader-viewer");

('getVRDisplays' in navigator) || require("webvr-polyfill");

FLOW.Net = FLOW.Net || require('flow-net');
FLOW.Multiuser = FLOW.Multiuser || require('flow-multiuser');
FLOW.MultiuserClient = FLOW.MultiuserClient || require('flow-multiuser-client');


if (FLOW.Platform.isGear()) {
    FLOW.ErrorUtils.alertIfError();
};

FLOW.Application = function (params) {
    

    this.params = params || {};
    this.loggingEnabled = this.params.loggingEnabled || false;
    this.params.showDatGui = this.params.showDatGui || false;
    this.params.showStats = this.params.showStats || false;
    this.params.audioFileExtension = this.params.audioFileExtension || "wav";
    this.params.useLocalFonts = this.params.useLocalFonts || false; //are the fonts in the local fonts folder or in the flow-resources folder?
    this.params.disableSequence = this.params.disableSequence || false;

    this.reusableVector = new THREE.Vector3();

    this.renderer = null,
        this.vrControls = null,
        this.controls = null,
        this.rootScene = null,
        this.camera = null,
        this.clock,
        this.manager,
        this.vrDisplay,
        this.useVive = false,
        this.inVR = false,

        this.isFlyingDisabled = false,

        this.colorWheel,
        this.resolution,

        this.strokeTexture,

        this.environment,

        this.params,
        this.gui,
        this.stats,

        this.renderLoadingCounter = 0;


    this.resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);

};

FLOW.Application.SVG_PATH = "graphics/";

FLOW.Application.prototype.disableNavigation = function () {
    this.isFlyingDisabled = true;
    if (this.controls) {
        this.controls.disableNavigation();
    }
};

FLOW.Application.prototype.enableNavigation = function () {
    this.isFlyingDisabled = false;
    if (this.controls) {
        this.controls.enableNavigation();
    }
};

FLOW.Application.parseQueryArguments = function () {
    var args = document.location.search.substring(1).split('&');
    var argsParsed = {};
    for (var i = 0; i < args.length; i++) {
        var arg = decodeURIComponent(args[i]);
        if (arg.indexOf('=') == -1) {
            argsParsed[arg.trim()] = true;
        }
        else {
            var kvp = arg.split('=');
            argsParsed[kvp[0].trim()] = kvp[1].trim();
        }
    }
    return argsParsed;
};

FLOW.Application.prototype.init = function () {

    this.audioToLoad = this.params.audioToLoad;
    if (this.audioToLoad) {
        this.initAudio();
    }

    //["Times New Roman" , "Open Sans", "Open Sans Bold", "Deja Vu Mono", "Open Sans Light","Tangerine Bold", "Marcellus SC Regular"],
    this.fontsToLoad = this.params.fontsToLoad;
    if (this.fontsToLoad) {
        this.fonts = new FLOW.Text.Fonts(  );
        this.fontsToInitialize = null;
    }

    //everyone of these functions needs to callback when finished
    this.sceneManager = new FLOW.Load.SceneManager(this, [
        {name: "threejs", do: this.initThreeJS},
        {name: "vr", do: this.initVR},
        {name: "scene", do: this.initScene},
        {name: "display", do: this.initUpdate, params: {resetPercentage: true}},
    ]);

    this.sceneManager.addEventListener("onFinished", this.onLoadFinished.bind(this));

    window.addEventListener('load', function () {
        this.sceneManager.load()
    }.bind(this));

};

FLOW.Application.prototype.onLoadFinished = function () {

    //onWindowResize();
    window.addEventListener('resize', function () {
        this.onWindowResize();
    }.bind(this));

    window.addEventListener('vrdisplaypresentchange', function () {
        this.onVRDisplayPresentChange();
    }.bind(this));


    window.addEventListener("keyup", this.onKeyUp.bind(this));

    //this.update();

};

/** This function kicks off the update loop */
FLOW.Application.prototype.initUpdate = function (callback, params) {

    this.update();

    if (params && params.resetPercentage) {
        this.sceneManager.resetPercentageAt = this.sceneManager.loaderIndex;
    }
    if (callback) {
        callback()
    }
};

/** This function just slows everything down for testing */
FLOW.Application.prototype.doDelay = function (callback, params) {
    var time = params && params.time || 2000;
    if (callback) {
        setTimeout(callback, time);
    }
};

FLOW.Application.prototype.showLoaderViewer = function (callback, params) {

    this.loaderViewer = new FLOW.LoaderViewer(this.sceneManager, app.rootScene, params);
    if (params && params.resetPercentage) {
        this.sceneManager.resetPercentageAt = this.sceneManager.loaderIndex;
    }
    this.loaderViewer.init(callback);

};


FLOW.Application.prototype.initThreeJS = function (callback) {

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, .001, 31000);

    this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(new THREE.Color(0x000000), 1);
    this.domElement = this.renderer.domElement;
    document.body.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    if (callback) {
        callback()
    }
};

FLOW.Application.prototype.initPicker = function (callback) {
    this.picker = new FLOW.Picker({
        object: this.camera,
        colliders: []
    });

    if (callback) {
        callback()
    }
};

FLOW.Application.prototype.log = function(message){
    if ( this.loggingEnabled ) {
        console.log(message);
    }
};

FLOW.Application.prototype.initVR = function (callback) {
    this.log( "initVR ->");
    this.vrControls = new THREE.VRControls(this.camera);

    // Apply VR stereo rendering to renderer.
    this.vrEffect = new THREE.VREffect(this.renderer);
    this.vrEffect.setSize(window.innerWidth, window.innerHeight);
    // Get the VRDisplay and save it for later.
    this.vrDisplay = null;
    //pass fullwebvrapi in order to get this real VRWebGL functionality
    navigator.getVRDisplays().then(function (displays) {
        this.log( "getVRDisplays -> displays.length: " + displays.length);
        if (displays.length > 0) {
            this.vrDisplay = displays[0];
            this.log("found vrdisplay:" + this.vrDisplay.displayName);

            if (this.vrDisplay.displayName == 'Cardboard VRDisplay (webvr-polyfill)' ) {
                FLOW.Platform.isCardboard( true );
                console.log("getVRDisplays -> isCardboard: true");
            }

            this.log( "getVRDisplays -> isGear: " + FLOW.Platform.isGear() );
            this.log( "getVRDisplays -> isCarmel: " + FLOW.Platform.isCarmel(this.vrDisplay) );

            if (FLOW.Platform.isCarmel( this.vrDisplay )) {
                var layerSource = this.renderer.domElement;

                //Taken from the CarmelWebVRSamples/HelloWebVR example code ...

                    // We must adjust the canvas (our VRLayer source) to match the VRDisplay
                    var leftEye = this.vrDisplay.getEyeParameters("left");
                    var rightEye = this.vrDisplay.getEyeParameters("right");


                    // This layer source is a canvas so we will update its width and height based on the eye parameters.
                    // For simplicity we will render each eye at the same resolution
                    layerSource.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
                    layerSource.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);

                    // This can normally only be called in response to a user gesture.
                    // In Carmel, we can begin presenting the VR scene right away.
                    this.vrDisplay.requestPresent([{ source: layerSource }]).then(function () { //JM
                        console.log("presenting VR in carmel");
                        // Start our render loop, which is synchronized with the VRDisplay refresh rate
                        //this.vrDisplay.requestAnimationFrame(app.update.bind(app));
                    }).catch(function (err) {
                        // The Carmel Developer preview allows entry into VR at any time because it is a VR first experience.
                        // Other browsers will only allow this to succeed if called in response to user interaction, such as a click or tap though.
                        // We expect this to fail outside of Carmel and would present the user with an "Enter VR" button of some sort instead.
                        console.error("Carmel VRDisplay: Failed to requestPresent.");
                    });

                //... to here
            }


            this.initCardboardButton();

            /** NOTE: must use the "?fullwebvrapi" to get any displays back from VRWebGL app
             *  This is used to make sure that the javascript camera frustrum matches the GearVR
             *  frustrum. If it doesn't, then THREEjs will cause objects to disappear when they leave
             *  the THREEjs frustrum, even though they are still within the view of the Oculus camera../
             */
            if (FLOW.Platform.isGear()) {

                var eyeParams = this.vrDisplay.getEyeParameters("left");
                this.log( "getVRDisplays -> eyeParams: " + eyeParams);

                this.log( "getVRDisplays -> eyeParams.fieldOfView: " + ((eyeParams.fieldOfView )? eyeParams.fieldOfView : "undefined"));

                this.camera.fov = eyeParams.fieldOfView.upDegrees + eyeParams.fieldOfView.downDegrees;
                this.camera.updateProjectionMatrix();
            }
        }

        if ( FLOW.Platform.isCarmel() ) { //TODO: may no tbe needed
            //TODO: this is a major hack because the Cardboard webpolyfill is not doing HMD alterations on this.scene, only on this.rootScene
            this.params.isFlyCamera  = true;
        }

        if (callback) {
            callback();
        }
    }.bind(this));


};

//Don't init the flyControls until we know whether this is a vive or not
FLOW.Application.prototype.initFlyControls = function (isFlyCamera, maxMoveNormalSpeed, stationaryScene) {
    this.isFlyCamera = (typeof isFlyCamera ==  "undefined" )? true : isFlyCamera; //FLOW.Platform.isGear() || FLOW.Platform.isVive(this.vrDisplay)
    this.controls = new FLOW.FlyControls({
        //TODO: on the GearVR we want to affect the scene instead of the camera, but
        // TODO: a) lookAt is broken (see ForceGraph.prototype.update) and
        // TODO: b) FlyControls doesn't fly forward but instead flys down the z direction
        object: this.isFlyCamera? this.camera : this.scene ,
        camera: this.isFlyCamera?  null : this.camera,
        mouseRotationObject :  this.camera,
        domElement: this.renderer.domElement,
        maxMoveNormalSpeed: maxMoveNormalSpeed,
        stationaryScene: stationaryScene
    });
    this.controls.connect();
    this.controls.addEventListener("bGamepadButtonChanged", this.bGamepadButtonChanged.bind(this));

    if (this.isFlyingDisabled) {
        this.controls.disableNavigation();
    }
};



THREE.Object3D.prototype.track = function(trackingType) {
    if(!this.isTrackingInitialized) {
        if(!trackingType) {
            trackingType = "position";
        }

        if(trackingType != "rotation" && trackingType != "position") {
            throw "unrecognized tracking type: "+trackingType+"\navailable tracking types: rotation, position"
        }

        this.trackingType = (trackingType == "rotation") ? 1 : 0;
        this.isTrackingInitialized = true;

        this.onBeforeRender = function(renderer, scene, camera, geometry, material, group) {
            if(!this.trackable) {
                return;
            }
            if(this.trackingType == 0) {

              var up = this.getWorldPosition();
              up.y += 1;
              this.parent.worldToLocal(up);
              up.sub(this.position);
              this.up.copy(up);

              var vec = camera.getWorldPosition();
              this.parent.worldToLocal(vec);
              this.lookAt(vec);

            } else if(this.trackingType == 1) {
                var parentsQuaternion = new THREE.Quaternion();

                var cancelParentRotation = function(object, quaternion) {
                  if(object.parent) {
                    quaternion.multiply(object.parent.quaternion.clone().inverse());
                    if(object.parent.parent) {
                      cancelParentRotation(object.parent, quaternion);
                    }
                  }
                }

                cancelParentRotation(this, parentsQuaternion);

                this.quaternion.copy(parentsQuaternion);
                this.quaternion.multiply(camera.quaternion);

            } else {
                throw "trackingType is invalid";
            }
        }

    } else if(trackingType) {
        if(trackingType != "rotation" && trackingType != "position") {
            throw "unrecognized tracking type: "+trackingType+"\navailable tracking types: rotation, position";
        }
        this.trackingType = (trackingType == "rotation") ? 1 : 0;
    }
    this.trackable =  true;
};

THREE.Object3D.prototype.stopTracking = function() {
  this.trackable = false;
};

THREE.Object3D.prototype.setTrackingType = function(trackingType) {
    if(trackingType != "rotation" && trackingType != "position") {
        throw "unrecognized tracking type: "+trackingType+"\navailable tracking types: rotation, position";
    }
    this.trackingType = (trackingType == "rotation") ? 1 : 0;
};


FLOW.Application.reusableVector = new THREE.Vector3();

THREE.Object3D.prototype.lookAtWorld = function( vector ) {
    FLOW.Application.reusableVector.set(vector.x, vector.y, vector.z);
    this.parent.worldToLocal( FLOW.Application.reusableVector );
    this.lookAt( FLOW.Application.reusableVector );
};

/* TODO:
 (1) lookAt() uses the 'up' property to make sure the object remains upright. This method fails to do that.
 */
THREE.Object3D.prototype.worldToLocal = function ( vector ) {
    if ( !this.__inverseMatrixWorld ) this.__inverseMatrixWorld = new THREE.Matrix4();
    return  vector.applyMatrix4( this.__inverseMatrixWorld.getInverse( this.matrixWorld ));
};

FLOW.Application.reusableVector = new THREE.Vector3();

/** override this in the child class */
FLOW.Application.prototype.initScene = function () {

    this.mainScene = new THREE.Scene();
    this.mainScene.background = new THREE.Color( 0x000000 );
    window.scene = this.mainScene; //only present for the threeJS inspector
    
    this.rootScene = new THREE.Object3D();
    this.mainScene.add(this.rootScene)

    if (FLOW.Platform.isCarmel()) {
        this.scene = this.rootScene; //if you do this on Carmel it makes it jittery!
    } else {
        this.scene = new THREE.Object3D(); //the scene should be the parent of all content except for the environment
        this.mainScene.add(this.scene);
    }
    this.scene.position.set(0, 0, -10); //NOTE: always change the scene position instead of the camera

    this.mainScene.add(this.camera);
    this.initFlyControls( this.params.isFlyCamera, this.params.maxMoveNormalSpeed,
        FLOW.Platform.isVive(this.vrDisplay) ? this.scene : this.rootScene );

    /* build the objects for your scene in your main.js */
};

/**
 *  override this in the child class
 *  this is used to loadTextures that need to be shared and reused throughout your app
 * @param callback
 */
FLOW.Application.prototype.loadTextures = function (callback) {
    /* var loader = new THREE.TextureLoader();
     loader.load( 'assets/onoff.png', function( texture ) {
     this.strokeTexture = texture;
     this.strokeTexture.wrapS = texture.wrapT = THREE.RepeatWrapping;
     this.strokeTexture.repeat.set(2, 2);
     if ( callback ){
     callback();
     }
     } );*/
    if (callback) {
        callback();
    }
};

/** override this class in a child if any models need to be loaded */
FLOW.Application.prototype.loadModels = function (callback) {
    if (callback) {
        callback();
    }
};

/** override this class in a child if any models need to be loaded */
FLOW.Application.prototype.initAudio = function () {
    this.audio = new FLOW.Audio.AudioManager();
    this.audio.audioFileExtension = this.params.audioFileExtension ? this.params.audioFileExtension : "wav";
};


FLOW.Application.prototype.initGuiControls = function (callback) {
    if (this.params.showStats) {
        this.stats = new Stats();
        this.stats.domElement.style.position = 'absolute';
        this.stats.domElement.style.bottom = '0px';
        this.stats.domElement.style.zIndex = 100;
        document.body.appendChild(this.stats.domElement);
    }

    if (!FLOW.Platform.isGear()) {
        //create fullscreen button
        this.fullScreenButton = document.createElement("div");
        this.fullScreenButton.classList.add("btnFS", "btn");
        this.fullScreenButton.title = "Switch to full screen";
        var fullScreenButtonIcon = document.createElement("span");
        fullScreenButtonIcon.classList.add("icon-fullscreen");
        this.fullScreenImage = this.loadIcon("Icon-Enlarge.svg", 50, 50);
        fullScreenButtonIcon.appendChild(this.fullScreenImage);
        this.fullScreenButton.appendChild(fullScreenButtonIcon);

        var playerControls = document.getElementById("player_controls");
        playerControls.appendChild(this.fullScreenButton);

        this.fullScreenButton.addEventListener("click", function () {
            var el = document.documentElement;// this.renderer.domElement;

            if (! this.isFullScreen()  ) {
                if (el.requestFullscreen) {
                    el.requestFullscreen();
                } else if (el.mozRequestFullScreen) {
                    el.mozRequestFullScreen();
                } else if (el.webkitRequestFullscreen) {
                    el.webkitRequestFullscreen();
                } else if (el.msRequestFullscreen) {
                    el.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.mozExitFullscreen) {
                    document.mozExitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        }.bind(this));

        window.addEventListener("keyup", function (evt) {
            if (!evt.shiftKey && !evt.altKey && !evt.ctrlKey && !evt.metaKey &&
                evt.keyCode === 27 &&
                this.vrEffect.isFullScreen) {
                this.vrEffect.setFullScreen(false);
            }
        }.bind(this));
    }
    if (callback) {
        callback();
    }

};



FLOW.Application.prototype.initCardboardButton = function () {
    if (this.vrDisplay && this.vrDisplay.capabilities.canPresent && !FLOW.Platform.isGear()) {
        //create cardboard button
        this.cardboardButton = document.createElement("div");
        this.cardboardButton.classList.add("btnCardboard");
        this.cardboardButton.title = "Switch to Google Cardboard VR";
        var cardboardButtonIcon = document.createElement("span");
        var image = this.loadIcon("Icon-Goggles.svg", 50, 50);
        cardboardButtonIcon.appendChild(image);
        this.cardboardButton.appendChild(cardboardButtonIcon);

        var playerControls = document.getElementById("player_controls");
        playerControls.appendChild(this.cardboardButton);

        this.cardboardButton.addEventListener('click', function () {
            // Set up fullscreen mode handling
            if (! this.isFullScreen() ) { //if it is not fullscreen already, then
                var el = document.documentElement;
                // this.renderer.domElement;
                if (el.requestFullscreen) {
                    el.requestFullscreen();
                } else if (el.mozRequestFullScreen) {
                    el.mozRequestFullScreen();
                } else if (el.webkitRequestFullscreen) {
                    el.webkitRequestFullscreen();
                } else if (el.msRequestFullscreen) {
                    el.msRequestFullscreen();
                }
                window.alert("Please select the the 'Display VR' button again.")
            } else {

                if (this.vrDisplay) {
                    this.vrDisplay.requestPresent([{source: this.renderer.domElement}]);
                    console.log("presenting VR in Cardboard")
                }

                if (this.start){
                    this.start();
                }

            }


        }.bind(this));
    }


};


FLOW.Application.prototype.isFullScreen= function() {
    return (document.fullScreenElement && document.fullScreenElement !== null)
        || document.mozFullScreen
        || document.webkitIsFullScreen;
};

FLOW.Application.prototype.showStartButton = function() {
    if ( !FLOW.Platform.isGear()) {
    
        var playerControls = document.getElementById("player_controls");

        //create start button
        this.startButton = document.createElement("div");
        this.startButton.title = "Start";
        var startButtonIcon = document.createElement("span");
        var image = this.loadIcon("Icon-Play.svg", 50, 50);
        startButtonIcon.appendChild(image);
        this.startButton.appendChild(startButtonIcon);

        //create reset button
        this.resetButton = document.createElement("div");
        this.resetButton.classList.add("btnReset");
        this.resetButton.title = "Reset";
        var resetButtonIcon = document.createElement("span");
        var image = this.loadIcon("Icon-X_close.svg", 15, 15);
        resetButtonIcon.appendChild(image);
        this.resetButton.appendChild(resetButtonIcon);

        playerControls.appendChild(this.startButton);
        playerControls.appendChild(this.resetButton);


        if (this.isMultiUser) {
            this.usersConnectedSpan = document.createElement('span');
            this.usersConnectedSpan.classList.add("usersInfo");
            this.usersReadySpan = document.createElement('span');
            this.usersReadySpan.className  ="usersInfo";
            this.usersReadySpan.className = "readyInfo";
            playerControls.insertBefore(this.usersConnectedSpan, this.fullScreenButton);
            playerControls.insertBefore(this.usersReadySpan, this.fullScreenButton);

            this.remoteUsersReady();
        }
        this.startButton.addEventListener('click', function () {
           if (this.isMultiUser) {
                if ( this.remoteUsersReady() ) {
                    if (this.sendStartCommandBind) {
                        this.sendStartCommandBind();
                    }
                }
            } else {
               playerControls.removeChild(this.startButton);

               if (this.start){
                    this.start();
                }
            }

        }.bind(this));
        this.resetButton.addEventListener('click', function () {
            if (this.isMultiUser) {
                if (this.sendResetCommandBind) {
                    this.sendResetCommandBind();
                }
            } else {
                if (this.reset) {
                    this.reset();
                }
            }

        }.bind(this));
    }
};

FLOW.Application.prototype.remoteUsersReady = function() {
    if (this.isMultiUser) {
        if (this.usersConnectedSpan) {
            var usersConnected = this.clientHelper.getUsersConnectedCount() + (this.connectedToServer ? 1 : 0);
            this.usersConnectedSpan.innerHTML = "Users: " +usersConnected;
            var usersReady = this.clientHelper.getUsersReadyCount() + (this.isReady ? 1 :0);
            this.usersReadySpan.innerHTML = "Ready:" + usersReady;
        }
        if ( this.clientHelper.getClient().areRemoteUsersReady()  ) {
            this.enableStartButton();
            return true;
        } else {
            this.disableStartButton();
            return false;
        }
    }
    return true;
};

FLOW.Application.prototype.disableStartButton = function() {
    if (this.startButton){
        this.startButton.style.color ="#666666" ;
        this.startButton.style.visibility="hidden" ;
    }
};

FLOW.Application.prototype.enableStartButton = function() {
    if (this.startButton){
        this.startButton.style.color ="#FFFFFF" ;
        this.startButton.style.visibility ="visible" ;
    }
};


FLOW.Application.prototype.setButtonState = function () {
    if (!this.isFullScreen) {
        if (this.collapseFullScreenImage) {
            this.collapseFullScreenImage.style.display = "none";
        }
        /* if ( this.closeButton ) {
         this.closeButton.style.display = "none";
         }*/
        if (this.fullScreenImage) {
            this.fullScreenImage.style.display = "block";
        }
    }
};


FLOW.Application.prototype.loadIcon = function (source, width, height) {
    var canvas = document.createElement('canvas');

    var ctx = canvas.getContext('2d');

    var img = new Image();
    img.onload = function () {
        ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = FLOW.Application.SVG_PATH + source;
    img.width = width;
    img.height = height;
    return img;
};

FLOW.Application.prototype.onWindowResize = function () {

    var fullWidth = window.innerWidth,
        fullHeight = window.innerHeight,
        canvasWidth,
        canvasHeight,
        aspectWidth;

    if (this.vrEffect) {//} && this.vrEffect.isFullScreen) {
        /*canvasWidth = this.vrEffect.left.renderRect.width +
         this.vrEffect.right.renderRect.width;
         canvasHeight = Math.max(this.vrEffect.left.renderRect.height,
         this.vrEffect.right.renderRect.height);*/

        // aspectWidth = canvasWidth / 2;
        this.vrEffect.setSize(fullWidth, fullHeight);
        this.camera.aspect = fullWidth / fullHeight;
        this.camera.updateProjectionMatrix();

    } else {
        var ratio = window.devicePixelRatio || 1;
        canvasWidth = fullWidth;// * ratio;
        canvasHeight = fullHeight;// * ratio;
        aspectWidth = canvasWidth;
    }


};

FLOW.Application.prototype.onVRDisplayPresentChange = function () {
    console.log('onVRDisplayPresentChange');
    this.onWindowResize();
};

FLOW.Application.prototype.onKeyUp = function (event) {
    if (event.keyCode == 13) { // enter/return
        this.onEnterKey(event);
    }
};

FLOW.Application.prototype.bGamepadButtonChanged = function(event){
    /** override this in your App */
};

FLOW.Application.prototype.onEnterKey = function (event) {
    /** override this in your App */

};

FLOW.Application.prototype.update = function () {

    if (this.animations) {
        this.animations.update();
    }

    if (this.picker) {
        this.picker.update();
    }

    if (this.environment) {
        this.environment.update();
    }

    if (this.vrControls) {
        this.vrControls.update();
    }


    var delta = this.clock.getDelta();

    // Use the camera direction to cast a ray and calculate the ring position and orientation depending on the intersections.
    this.camera.updateMatrixWorld(true);

    if (this.controls) {
        this.controls.update(delta);
    }

    if (this.stats) {
        this.stats.update();
    }

    if (this.clientHelper) {
        this.clientHelper.update();
    }


    // Pass the world matrix of the camera to VRWebGL so it can use it later on.
    FLOW.VRWebGLUtils.setThreeJSCameraMatrices(this.renderer, this.camera);

    if (this.renderLoadingCounter >= 0) {
        console.log("VRWebGL: counter " + this.renderLoadingCounter);

        this.renderLoadingCounter--;
        if (this.renderLoadingCounter < 0) {
            console.log("VRWebGL: counter done" + this.renderLoadingCounter);
            if (FLOW.Platform.isGear()) {
                this.renderer.getContext().setRenderEnabled(true);
            }
        }
    }


    // Render the scene.
    this.vrEffect.render(this.mainScene, this.camera);

   /* for ( i = app.sphereView.modelLabelGroup.children.length - 1; i >= 0 ; i -- ) {
        obj = app.sphereView.modelLabelGroup.children[ i ].lookAtWorld(this.scene.position);
        
    }*/

   if (FLOW.Platform.isCarmel()) {//TODO: not sure if this is needed or if they are the same thing...
       this.vrDisplay.requestAnimationFrame(
           function () {
               this.update();
           }.bind(this)
       );
   } else {
       this.vrEffect.requestAnimationFrame(function () {
           this.update();
       }.bind(this));
   }

    return this;
};

FLOW.Application.prototype.setStartLoading = function () {
    if (FLOW.Platform.isGear()) {
        this.renderer.getContext().setRenderEnabled(false);

    }
    this.renderLoadingCounter = 1;

};



//TODO: move this multiuser stuff into MultiUserClient helper, which needs to be refactored to remove redundant calls and message passing
FLOW.Application.CommandIds = {
    START: "Start",
    USER_READY: "UserReady",
    RESET: "Reset",
    UPDATE_DATA: "UpdateData"
};

FLOW.Application.HEAD_OPACITY = 0.5;
FLOW.Application.HEAD_SCALE = 0.2;

FLOW.Application.prototype.loadMultiUser = function( callback ){
    if (this.isMultiUser) { //get ready for showing the head with lighting
        /*  this.ambientLight = new THREE.AmbientLight(0x101030);
         this.scene.add(this.ambientLight);
         this.pointLight = new THREE.PointLight(0xffeedd);
         this.pointLight.position.set(0, 5, 0);
         this.scene.add(this.pointLight);*/


        this.loadHeadMesh(function () {
            // Connect
            this.connectToExperience(function () {
                this.connectedToServer = true;
                this.initExperience();
                this.showStartButton();
                if (callback) {
                    callback();
                }
            }.bind(this), function() { //failed ToConnect
                if (callback) {
                    callback();
                }
            });
        }.bind(this));

    } else {
        this.numberOfUsers = 1;
        this.showStartButton();
        if (callback) {
            callback();
        }
    }
};


FLOW.Application.prototype.loadHeadMesh = function(loadHeadMeshCallback) {
    var objLoader = new THREE.OBJLoader().load('objs/VRHead.obj', function (object) {
        this.headMesh = object.children[0];
        this.headMesh.material.opacity = 0; // Set the head to be 100% transparent because it will be added to the scene right away. The correct transparency will be set later when a remote user is connected. This avoids the flickering in the VRWebGL implementation.
        this.headMesh.material.transparent = false;
        // this.rootScene.add(this.headMesh); // Add the head to the scene so VRWebGL has executed the necessary synchronous commands. It won't be visible as it is transparent. This avoids the flickering when a remote user connects.
        loadHeadMeshCallback.call(this);
    }.bind(this));
    return this;
};

FLOW.Application.prototype.remoteUserConnected = function(remoteUser) {
    this.numberOfUsers++;
    this.remoteUsersReady();
};

FLOW.Application.prototype.remoteUserDisconnected = function(remoteUser) {
    this.numberOfUsers--;
    this.remoteUsersReady();
};

//TODO: maintain a list of remoteUsers isntead of just keeping count, so that:
/// if a user connects, but then drops out, then calculations will work out correctly.
FLOW.Application.prototype.remoteUserReady = function(remoteUser) {
    this.remoteUsersReady();
};


FLOW.Application.prototype.failedToConnectToExperience = function() {
    if (confirm("We've failed to connect to the Flow Multiuser server. \nIf you add '?isMultiUser=false' to the URL, you can avoid this message.\n\nWould you like to proceed without multiuser functionality?") ) {
        this.isMultiUser = false;
        this.numberOfUsers = 1;
    } else {
        window.location = "options.html";
    }

}

FLOW.Application.prototype.connectToExperience = function(connectToExperienceCallback, failedToConnectCallback) {
    this.numberOfUsers = 0;
    if (!this.isMultiUser) {
        return;
    }

    var query = FLOW.Net.parseQueryArguments();
    this.serverHostname = query.server ? query.server :window.location.hostname;

    this.clientHelper = new FLOW.MultiuserClient.ClientHelper({
        experienceId:"2",
        object3d: this.camera,
        remoteUserObject3DProvider: FLOW.Application.prototype.remoteUserObject3DProvider.bind(this),
        scene: this.rootScene,
        url: "ws://" + this.serverHostname
    });
    this.clientHelper.addEventListener("error", this.failedToConnectToExperience.bind(this));

    this.clientHelper.addEventListener("connected", connectToExperienceCallback);

    this.clientHelper.addEventListener("error", failedToConnectCallback);

    // this.clientHelper.addEventListener("disconnected", function() {
    // 	// TODO:
    // });

    this.remoteUserConnectedBind = FLOW.Application.prototype.remoteUserConnected.bind(this);
    this.clientHelper.getClient().addEventListener("remoteuserconnected", this.remoteUserConnectedBind);

    this.remoteUserDisconnectedBind = FLOW.Application.prototype.remoteUserDisconnected.bind(this);
    this.clientHelper.getClient().addEventListener("remoteuserdisconnected", this.remoteUserDisconnectedBind);

    this.commandReceivedBind = FLOW.Application.prototype.commandReceived.bind(this);
    this.clientHelper.addEventListener("commandreceived", this.commandReceivedBind);

    this.remoteUserReadyBind = FLOW.Application.prototype.remoteUserReady.bind(this);
    this.clientHelper.getClient().addEventListener("userready", this.remoteUserReadyBind);

    this.clientHelper.connect();
    return this;
};

FLOW.Application.prototype.remoteUserObject3DProvider = function() {
    // this.rootScene.remove(this.headMesh);
    this.headMesh.material.opacity = FLOW.Application.HEAD_OPACITY;
    this.headMesh.material.transparent = ! FLOW.Platform.isGear();
    FLOW.Application.HEAD_SCALE = FLOW.Platform.isGear()? 0.1 : FLOW.Application.HEAD_SCALE;

    var object3d = new THREE.Object3D();
    var headMesh = new THREE.Mesh(this.headMesh.geometry, this.headMesh.material);
    headMesh.rotateY(Math.PI);
    object3d.scale.set(FLOW.Application.HEAD_SCALE, FLOW.Application.HEAD_SCALE, FLOW.Application.HEAD_SCALE);
    object3d.add(headMesh);
    this.rootScene.add(object3d);
    return object3d;
};

FLOW.Application.prototype.commandReceived = function(data) {
    if (data.command.id === FLOW.Application.CommandIds.START) {
        var playerControls = document.getElementById("player_controls");
        if (playerControls && this.startButton) {
            playerControls.removeChild(this.startButton);
        }
        this.start();
    }
    /* else if (data.command.id === FLOW.Application.CommandIds.CURRENT_PANEL_GAZED) {
     this.currentPanelGazed();
     }*/
    else if (data.command.id === FLOW.Application.CommandIds.READY) {
        this.remoteUserReady(data);
    }
    else if (data.command.id === FLOW.Application.CommandIds.RESET) {
        this.reset();
    }
    else if (data.command.id === FLOW.Application.CommandIds.UPDATE_DATA) {
        if (this.remoteDataUpdate){
            this.remoteDataUpdate(data.command);
        }
    }
    return this;
};

FLOW.Application.prototype.sendStartCommand = function() {
    var playerControls = document.getElementById("player_controls");
    if (playerControls) {
        playerControls.removeChild(this.startButton);
    }

    this.start();

    this.clientHelper.sendCommand({
        id: FLOW.Application.CommandIds.START
    });
    return this;
};


FLOW.Application.prototype.start = function() {
    if ( ! this.started ) {
        this.started = true;
        if (this.startCallback) {
            this.startCallback();
        }
    }
};

FLOW.Application.prototype.sendResetCommand = function() {
    this.clientHelper.sendCommand({
        id: FLOW.Application.CommandIds.RESET
    });
    this.reset();
    return this;
};

FLOW.Application.prototype.sendUpdateDataCommand = function(data) {
    this.clientHelper.sendCommand({
        id: FLOW.Application.CommandIds.UPDATE_DATA,
        data:data
    });
    return this;
};

FLOW.Application.prototype.reset = function() {
    location.reload();
};

FLOW.Application.prototype.initExperience = function() {
    this.sendStartCommandBind = FLOW.Application.prototype.sendStartCommand.bind(this);

    this.sendResetCommandBind = FLOW.Application.prototype.sendResetCommand.bind(this);

    if (this.clientHelper && this.clientHelper.isUser()) {
        this.numberOfUsers++;
    }
    return this;
};

FLOW.Application.prototype.readyToStart = function(callback) {

    this.isReady = true;

    this.startCallback = callback;
    if (this.loaderViewer) {
        this.loaderViewer.remove();
    }

    if (FLOW.Platform.isGear() && !this.isMultiUser) {
        //console.log("adding gearVRstart eventListener")
        //this.renderer.domElement.addEventListener( 'touchstart', this.gearVRstart);
        //return;
    }

    if (this.clientHelper){
        this.clientHelper.sendUserReady(  this.clientHelper.getClient().getUserId() );
        this.remoteUsersReady();
    } else {
        this.enableStartButton();
    }
};


FLOW.Application.prototype.gearVRstart = function() {
    console.log("received gearVRstart message");
    if (this.renderer) {
        //this.renderer.domElement.removeEventListener('touchstart', this.gearVRstart);

    }
    console.log("calling this.start()");
    //this.start();
};



(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Application;
}));
