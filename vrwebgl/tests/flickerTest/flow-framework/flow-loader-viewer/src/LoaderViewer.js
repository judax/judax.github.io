var THREE = THREE || require('three');

var FLOW = FLOW || {};

FLOW.Load = FLOW.Load || require("flow-loader");
FLOW.Lines = FLOW.Lines || require('flow-lines');
//FLOW.Text = FLOW.Text || require("flow-text");


FLOW.LoaderViewer = function(  loader, parentObject3D, params ) {
    this.parentObject3D = parentObject3D;
    this.loader = loader;
    params = params || {};
    this.params = params;

    this.lineWidth = params.lineWidth || 0.2;
    this.lineLength = params.lineLength || 8;
    this.timer = 0.0;
    this.loaderIndex = 0;
    this.position = params.position || {x: 0, y :0, z:0.9};
    this.object = new THREE.Object3D();
    this.object.position.set(this.position.x, this.position.y, this.position.z);
    this.parentObject3D.add(this.object);
    this.leftToLoad = this.params.leftToLoad || 0;
};


FLOW.LoaderViewer.prototype.init= function( callback, resetPercentageAt ) {
    if (this.loader) {
        this.loader.addEventListener("onProgressed", this.updateProgress.bind(this));
    }
    if (typeof resetPercentageAt != "undefined" ) {
        this.loader.resetPercentageAt = resetPercentageAt;
    }
    this.callback = callback;
    this.lines = new FLOW.Lines.Lines();

    this.lines.setSize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio);
    this.allLines = [];

    var line = new FLOW.Lines.Line();
    line.addPoint( new THREE.Vector3( -this.lineLength/2,0,-1));
    line.addPoint( new THREE.Vector3( this.lineLength/2,0,-1));
    line.setColor( new THREE.Color ( "#000000" ));
    line.setWidth( this.lineWidth);
    this.lines.addLine(line);
    this.allLines.push(line);

    this.line = new FLOW.Lines.Line();
    this.line.addPoint( new THREE.Vector3(0 - this.lineLength/2, 0, 0));
    this.line.addPoint( new THREE.Vector3(  this.lineLength/2, 0, 0));
    this.line.setColor( new THREE.Color ( "#FFFF00" ));
    this.line.setWidth(this.lineWidth);
    this.lines.addLine(this.line);
    this.allLines.push(this.line);

    /*var loader = new THREE.TextureLoader();
    loader.load( 'graphics/progress.png', function( texture ) {
        this.strokeTexture = texture;
        this.strokeTexture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
        this.strokeTexture.repeat.set( 1, 1 );
        this.lines.setTexture(this.strokeTexture);*/
    var mesh = this.lines.buildMesh();
    mesh.name ="loaderViewer";
    this.object.add(mesh);
        /*this.lines.updateTimeUniform(1.0);
        this.lines.updateUvXOffsetUniform(0);*/
       if (this.callback) {
           this.callback();
       }

   // }.bind(this) );
    
  
};

FLOW.LoaderViewer.prototype.remove = function()
{
    if (this.lines) {
        this.object.remove(this.lines.getMesh());
    }
    if (this.textMesh) {
        this.object.remove(this.textMesh);
    }
    this.lines =null;
    this.line = null;
    this.allLines = [];
};


FLOW.LoaderViewer.prototype.updateProgress = function (  percentComplete ) {
    if (this.lines) {
        console.log(percentComplete)
        this.line.setPoint(0, new THREE.Vector3( -this.lineLength*percentComplete/2,0,0.95));
        this.line.setPoint(1, new THREE.Vector3( this.lineLength*percentComplete/2,0,0.95));
        this.lines.resetLine(this.line);

       /* if (! this.hideText) {
            this.updateTextPercentage(percentComplete);
        }*/

        if (percentComplete >=1) {
            setTimeout(this.remove.bind(this), 1000);
        }
    }
};
/*

FLOW.LoaderViewer.prototype.updateTextPercentage = function (percentComplete) {
    var app = this.loader.app;
    if (! app.fonts ){
        return;
    }

    if (this.textMesh) {
        this.object.remove(this.textMesh);
    }

    // Create the text and precalculate the initial and final positions
    var text = new FLOW.Text.Text({
        text: Math.round(percentComplete *100)+"",
        font: app.fonts.getFont(app.fontsToLoad[0]),
        fontSize: 0.5,
        wrapType: FLOW.Text.WrapType.WRAP_BY_WIDTH,
        wrapValue: 5,
        color: "#FFFF00",
        align: 'center'
    });

    this.textMesh = text.buildMesh();
    text.setPosition( [0, 2, 0 ]);
    text.disableComputeBounds();
    this.textMesh.frustumCulled = false;
    FLOW.Text.lookAt(text, app.camera);
    this.object.add(this.textMesh);
};
*/

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.LoaderViewer;
}));

