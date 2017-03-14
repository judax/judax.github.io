
var THREE = THREE || require('three');



var FLOW = FLOW || {};
FLOW.Application = FLOW.Application || require("flow-application");
FLOW.Audio = FLOW.Audio || require('flow-audio');
FLOW.Color = FLOW.Color || require('flow-color-utils');
FLOW.Environment = FLOW.Environment || require('flow-environment');
FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.THREE = FLOW.THREE || require('flow-three');
FLOW.Net = FLOW.Net || require('flow-net');
FLOW.Platform = FLOW.Platform || require('flow-platform');
FLOW.Load = FLOW.Load || require('flow-loader');


/**
 *  App inherits from the FLOW.Framework
 *
 *  To showGraphics include:  the showGraphics=true tag:
   /flow-apps/flow-audio-test/index.html?showGraphics=true
 *
 *  To test for a working system that doesn't crash: include the tag: noncrash=true
  /flow-apps/flow-audio-test/index.html?showGraphics=true&noncrash=true

 * @constructor
 */
var App = function() {

    var params = FLOW.Net.parseQueryArguments();
   
    var params= {
        fontsToLoad: ["Times New Roman" ],
         showDatGui: false
    };

    FLOW.Application.call(this, params) ;

}

FLOW.OOPUtils.prototypalInheritance(App, FLOW.Application);


/** overrides FLOW.Application.init */
App.prototype.init = function( ) {

    this.modelsToLoad = this.params.modelsToLoad;
    
   /* this.fontsToLoad = this.params.fontsToLoad;
    if (this.fontsToLoad) {
        this.fonts = new FLOW.Text.Fonts();
        this.fontsToInitialize = null;
    }*/


  /*  this.initThreeJS();
    this.initVR();
    this.initGuiControls();
    this.initScene();
    this.showLoaderViewer( function() {
            this.update();
            setTimeout(  function(){
            this.loadModels( function(){
                setTimeout( function () {
                    this.loadModels( null, 2);
                }.bind(this), 2000)
            }.bind(this), -1);

        }.bind(this), 2000)
    }.bind(this)
    );*/

    //everyone of these functions needs to callback when finished
    this.sceneManager = new FLOW.Load.SceneManager(this,[]);
    this.sceneManager.setLoaderList ( [
        {name: "threejs",   do: this.initThreeJS},
        //{name: "fonts", object: this.fonts, loader: this.fonts.loadFontSet, params: {fontsToLoad: this.fontsToLoad}},
        {name: "vr",           do: this.initVR},
        {name: "gui",         do: this.initGuiControls},
        {name: "scene",     do: this.initScene},
      //  {name:"addLoaderHider", do:this.addLoaderHider},
        //{name: "loaderViewer", do: this.showLoaderViewer, params:{resetPercentage:true}},
        {name: "display",   do: this.initUpdate},
        {name: "delay",     do: this.doDelay, params: {time: 2000}},
      //  {name: "lockScreen", do: this.lockScreen},
        {name: "models" , do: this.loadModels , params:-1},
       // {name: "unlockScreen", do: this.unlockScreen },

        {name: "delay",     do: this.doDelay, params: {time: 2000}},
      //  {name: "lockScreen", do: this.lockScreen},
        {name: "models" , do: this.loadModels, params:1 },
     //   {name: "unlockScreen", do: this.unlockScreen },

        {name: "delay",     do: this.doDelay, params: {time: 2000}},
        {name: "models" , do: this.loadModels, params:3 },
        {name: "delay",     do: this.doDelay, params: {time: 2000}},
        {name: "models" , do: this.loadModels, params:5 },

    ] );




    this.sceneManager.addEventListener("onFinished", this.onLoadFinished.bind(this));

    window.addEventListener('load', function () {
        this.sceneManager.load()
    }.bind(this));
    
};

App.prototype.addLoaderHider = function(callback) {
    this.rootScene.add(this.sceneManager.hiderBox);

    callback();
}
App.prototype.lockScreen = function(callback){
    this.sceneManager.lockScreen(function(){
        callback();
    }.bind(this))
};


App.prototype.unlockScreen = function(callback){
    this.sceneManager.unlockScreen(function(){
        callback();
    }.bind(this))
};

/** inherits from FLOW.Application update */
App.prototype.update = function() {
    FLOW.Application.prototype.update.call(this) ;
    
}

/** overrides loadModels */
FLOW.Application.prototype.loadModels = function( callback, x ) {
    var loadMeshCallback = callback;



    var objLoader = new THREE.OBJLoader().load('models/VRHead.obj', function (object) {
        this.headMesh = object.children[0];
        this.headMesh.scale.set(0.6,0.6,0.6);
        this.headMesh.material.opacity = 0.5; // Set the head to be 100% transparent because it will be added to the scene right away. The correct transparency will be set later when a remote user is connected. This avoids the flickering in the VRWebGL implementation.
        this.headMesh.material.transparent = true;
        this.headMesh.position.set(x,2,0);
        this.setStartLoading();

        this.rootScene.add(this.headMesh); // Add the head to the scene so VRWebGL has executed the necessary synchronous commands. It won't be visible as it is transparent. This avoids the flickering when a remote user connects.
        if (loadMeshCallback){
            loadMeshCallback.call(this);
        }
    }.bind(this));
    return this;
};

/** inherits from FLOW.Framework initGuiControls */
App.prototype.initGuiControls = function( callback ) {
    FLOW.Application.prototype.initGuiControls.call(this) ; //NOTE: since this is not passing the callback, then I am responsible for it

    if (this.params.showDatGui) {
        var datGUIParams = function () {
            this.amount = 50;
            this.autoUpdate = false;
            this.update = function () {
                // init();
            }
        };

        this.params = new datGUIParams();
        this.gui = new dat.GUI();

        this.gui.add(this.params, 'amount', 1, 1000).onChange(this.updateDatGui);
        this.gui.add(this.params, 'autoUpdate').onChange(this.updateDatGui);
        this.gui.add(this.params, 'update');
    }
    if (callback) { callback();  }
    return this;
}

/*
App.prototype.initAudio = function(  ) {
    FLOW.Application.prototype.initAudio.call(this) ;
    
    this.audio.setClips(this.audioToLoad);

  
    this.audio.addEventListener("onLoaderFinished",
        function() {
            this.audio.playClip(this.audioToLoad[0] );
            setTimeout( function(){
                this.audio.playClip(this.audioToLoad[1] );
            }.bind(this), 2000);
            setTimeout( function(){
                this.audio.stopClip(this.audioToLoad[0] );
            }.bind(this), 4000);

        }.bind(this));

   // this.audio.load( );
    return this;
}*/

/** inherits from FLOW.Framework initGuiControls */
App.prototype.initScene = function( callback ) {
    FLOW.Application.prototype.initScene.call(this) ;
    
    this.colorWheel = new FLOW.Color.ColorWheel("aquaTetradShades");

    this.ambientLight = new THREE.AmbientLight(0x101030);

    this.pointLight = new THREE.PointLight(0xffeedd);
    this.pointLight.position.set(0, 5, 0);
    this.rootScene.add(this.ambientLight);
    this.rootScene.add(this.pointLight);


    var boxGeometry = new THREE.BoxGeometry(1, 1, 1);

    var cube = new THREE.Object3D();
    //cube.name = names[i] ;
    var material = new THREE.MeshBasicMaterial({color: FLOW.Color.nextColor()});
    material.originalColor = new THREE.Color(material.color);
    var mesh = new THREE.Mesh(boxGeometry, material);
    cube.add(mesh);
    this.rootScene.add(cube);

    var boxGeometry = new THREE.BoxGeometry(1, 1, 1);

    var cube = new THREE.Object3D();
    //cube.name = names[i] ;
    var material = new THREE.MeshBasicMaterial({color: FLOW.Color.nextColor()});
    material.originalColor = new THREE.Color(material.color);
    var mesh = new THREE.Mesh(boxGeometry, material);
    cube.add(mesh);
    cube.position.set(-5, -1, -1);
    this.rootScene.add(cube);

    this.environment = new FLOW.Environment({
        showColors: true,
        width: 800,
        showParticles: true,
        showFloor: false,
        showTicks: true
    }, this.rootScene);

    if (callback) { callback();  }
    return this;
}

var app = new App( );
app.init( );
