
var THREE = THREE || require('three');

var FLOW = FLOW || {};
FLOW.Text = FLOW.Text || require('flow-text');

FLOW.Image = function( parentObject3D, params) {//id, imageUrl, parentObject3D, position, labelString, thumbnailUrl, imageAlphaTexture, alphaImageUrl){
   this.id = params.id;
    this.imageUrl = params.imageUrl;
    this.parentObject3D = parentObject3D;
    this.position = params.position;
    this.labelString = params.label;
    this.thumbnailUrl = params.thumbnailUrl;
    this.alphaImageTexture = params.alphaImageTexture; //reusable texture
    this.alphaImageUrl = params.alphaImageUrl; //use this if not resusable
    this.width = params.width || 4;
    this.height = params.height || 3;
    this.lookAt = params.lookAt || null;

    this.mesh = null;
    this.label = null;
    this.labelMesh = null;


    return this;
};

FLOW.Image.TextureLoader = new THREE.TextureLoader(); //reusable loader

FLOW.Image.prototype.create = function(  ) {
    this.createMesh();
    if (this.labelString) {
        this.createLabel();
    }
};

FLOW.Image.prototype.createMesh = function(  ) {
    if (!this.imageUrl) {
        console.error("No imageURL provided!");
        return;
    }
    var imagesPath = "images/";
    //TOD: implement Thumbnails and LOD
    // var thumbnailTexture = THREE.ImageUtils.loadTexture( imagesPath + "thumbnailUrl", null);

    var imageTexture = FLOW.Image.TextureLoader.load(imagesPath + this.imageUrl);

 /*   if (this.alphaImageUrl ) {
        this.alphaImageTexture = FLOW.Image.TextureLoader.load(imagesPath + this.alphaImageUrl);
    }*/

    var material = new THREE.MeshBasicMaterial({
        map: imageTexture,
        side: THREE.DoubleSide
    });
    if (this.alphaImageTexture ) {
        material.alphaMap = this.alphaImageTexture;
        material.transparent = true;
    }
    var geometry = new THREE.PlaneGeometry(this.width, this.height);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.parentObject3D.add(this.mesh);
    if (this.lookAt) {
        this.mesh.lookAt( new THREE.Vector3(this.lookAt.x, this.lookAt.y, this.lookAt.z));
    }

    return this;
};


FLOW.Image.prototype.createLabel = function() {
    var labelParams = { //TODO: configure all these params
        text: this.labelString,
        font: "Open Sans",
        fontSize:   0.2,
        align: FLOW.Text.ALIGN_CENTER,
        wrapType: FLOW.Text.WrapType.WRAP_BY_WIDTH,
        wrapValue:3.5,
        opacity: 1.0,
        color: "white"
    };

    this.label = new FLOW.Text.Text(labelParams);
    this.label.id = this.labelString;
    this.labelMesh = this.label.buildMesh();
    this.labelMesh.frustumCulled = false;

    var labelObject = new THREE.Object3D();
    labelObject.position.set(this.position.x, this.position.y-0.5, this.position.z  + 0.2); //TODO: configure position offset
    labelObject.add(this.labelMesh);
    this.parentObject3D.add(labelObject);

    return this;
};

FLOW.Image.prototype.getMesh = function(){
    return this.mesh;
};


FLOW.Image.Images = function(parentObject3D, position, imagesParams){
    this.imagesParams = imagesParams;
    this.images = [];
    this.labels = [];
    this.parentObject3D = parentObject3D;

    for (var i = 0; i < this.imagesParams.length; i++) {
        var imageParam = this.imagesParams[i];
        imageParam.position = {x:imageParam.position.x+position.x,
            y:imageParam.position.y+position.y,
            z:imageParam.position.z+position.z };
        var image= new FLOW.Image(parentObject3D, imageParam );
        image.create();
        this.add(image);

    }
    return this;
}

FLOW.Image.Images.prototype.add = function(image){
    this.images.push( image );
    if (image.label) {
         this.labels.push()
    }
    return image;
};


FLOW.Image.Images.prototype.remove = function(index){
    var labelIndex;
    if ( labelIndex = this.findLabelIndex[index] ) {
        this.labels.splice (labelIndex);
    }
    this.images.splice( index );
    return this;
};

FLOW.Image.Images.prototype.getChild = function(index){
    return this.images[ index ];
};


FLOW.Image.Images.prototype.findChild = function(id){
    for (var i=0; i< this.images.length; i++ ){
        if (this.images[i].id == id){
            return this.images[ i ];
        }
    }
    return null;
};

FLOW.Image.Images.prototype.findLabelIndex = function(id){
    for (var i=0; i< this.labels.length; i++ ){
        if (this.labels[i].id == id){
            return i;
        }
    }
    return -1;
};

FLOW.Image.Images.prototype.findLabel = function(id){
    for (var i=0; i< this.images.length; i++ ){
        if (this.images[i].id == id){
            return this.images[i];
        }
    }
    return null;
};


FLOW.Image.Images.prototype.find = function(id) {
    for (var i = 0; i < this.images.length; i++) {
        if (this.images[i].id == id) {
            return this.images[i];
        }
    }
    return null;
}

FLOW.Image.Images.prototype.findLabelMesh = function(id) {
    var image = this.find(id);
    if (image) {
        return image.labelMesh;
    }
};



FLOW.Image.Images.prototype.findImageMesh = function(id){
    var label = this.find(id);
    if (label) {
        return label.mesh;
    }
};




(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Image;
}));