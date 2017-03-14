
var THREE = THREE || require('three');

var d3 = d3 || require("d3");

var FLOW = FLOW || {};
FLOW.Text = FLOW.Text || require('flow-text');
FLOW.Lines = FLOW.Lines || require('flow-lines');


FLOW.TEXT_NODE = "text";
FLOW.TITLE_NODE = "title"
FLOW.HEADING1_NODE = "heading1"
FLOW.MODEL_NODE = "model";
FLOW.INVISIBLE_NODE = "invisible";
FLOW.BOX_NODE = "box";
FLOW.IMAGE_NODE ="image";
FLOW.SQUARE_NODE = "square";
FLOW.LOD_TEXT_NODE = "lodtext";

/**
 * A View is both a toplevel View that contains data and Nodes and Layouts.
 *
 *
 * @param params
 * @constructor
 */
var View = function( params, app ) {

    this.params= params;
    this.node = params.node; //TODO this is not used except as a place to get the this.node.data from
    this.app = app;

    //The list of child nodes
    this.nodes = [];

    //a data description contains all the information to pull in data from a file or query
    //   as well as how it is categorized.
    this.dataDesc = null;

    //the internal raw data value object that was loaded as part of the dataDesc
    this.data = this.node.data || {};

    this.params = params || {};

    this.nodeDesc = {}

    this.currentRolloverNode = undefined;
    this.currentFocusedNode = undefined;
    this.labelMesh = null;

    this.nodeHueDelta = 0.01;

 //   this.inflowScale = 0.05;

  //  this.currentLayout = "timelineBox"; //possible layouts:  "timelineBox", "category", "timeline"

    var format = d3.format("+.3f");
    this.parseTime = d3.time.format("%Y,%m");

    this.earliestDate = null;

    /*this.dataDesc = new DataDesc();
    this.nodes = this.dataDesc.loadData( this.parseNodes );*/

    this.object = new THREE.Object3D();
  //  this.object.fustrumCulled = false;


  //  this.raycaster = new THREE.Raycaster();
    this.points = null; //if it generates a PointGeometry, then this will be set
    this.createNodesFromData();

    //TODO: should be parseNodes... need a generic dataDescription that
    // includes mappings from data params into standardized node params

    this.draw();
   // this.object.position.z = -5;

    return this;
};

View.prototype.parseNodes = function() {
    var that = this;
    this.nodes.forEach(function (item) {
        item.date = that.parseTime.parse(item.Year + "," + item.Month);
    });

    this.nodes.sort( function(a, b) {
        return a.date - b.date;
    });
    this.earliestDate = that.nodes[0].date;


    return this;
}

View.prototype.createNodesFromData= function() {
    var dataItems = (Array.isArray( this.data ) )? this.data : [this.data];
    this.usePointGeometry = dataItems[0].type == FLOW.SQUARE_NODE; //TODO: set this explicitly?

    for (var i = 0; i < dataItems.length; i++) {
        var data = dataItems[i];
        switch (data.type) {

            case FLOW.SQUARE_NODE :
                var nodeDesc = {
                    showSquare:true
                }
                break;
            case FLOW.INVISIBLE_NODE :
                //createFunction = this.createInvisibleNode;
                break;
            case FLOW.TEXT_NODE :
            case FLOW.TITLE_NODE :
            case FLOW.HEADING1_NODE :
                nodeDesc = {
                     labelFieldName: "title",
                     showLabel: true,
                     showBackground: this.params.backgroundParams ? this.params.backgroundParams.showBackground === true? true : false :false,
                     name: data.type,
                     labelParams: this.params.labelParams,
                     backgroundParams: this.params.backgroundParams
                 };
                break;
            case FLOW.LOD_TEXT_NODE :
                // createFunction = this.createImageNode;
                break;
            case FLOW.IMAGE_NODE :
                // createFunction = this.createImageNode;
                break;
            case FLOW.MODEL_NODE :
                // createFunction = this.createImageNode;
                break;
            default:
                //If the title is present, then it is a special type, likely text
                nodeDesc = {
                    labelFieldName: "title",
                    showLabel: true,
                    showBackground: false,
                    name: "Text",
                    labelParams: this.params.labelParams
                };
        }

        var param = {nodeDesc: nodeDesc, data: data}
        var node = new FLOW.Data.Node(param, i, this.app);
        this.nodes.push(node);
    }

};


View.prototype.draw = function() {

    if (this.usePointGeometry){
        if (!this.nodeGeometry) {
            this.initSquareGeometry();
        }
        this.vertices = new Float32Array( this.nodes.length  * 3 ); //2 triangles * 3 corners * 3 values (components) per vertex
        this.colors = new Float32Array( this.nodes.length  * 3 );
        //for each node
        for (var i=0; i< this.nodes.length; i++) {
            this.createSquare(this.nodes[i], i );
        }
        // itemSize = 3 because there are 3 values (components) per vertex
        this.nodeGeometry.addAttribute('position', new THREE.BufferAttribute(this.vertices, 3));
        this.nodeGeometry.addAttribute('color', new THREE.BufferAttribute(this.colors, 3));

        var material = new THREE.PointsMaterial({
            vertexColors: true,
            size: 1//this.nodeSize
        });
        this.points = new THREE.Points(this.nodeGeometry, material);
        this.object.add(this.points);
        return;
    }

    //for each node
    for (var i=0; i< this.nodes.length; i++) {
        var thisNode= this.nodes[i];
        thisNode.view = thisNode.draw();

        if (thisNode.view) {
            this.object.add(thisNode.view);
        }
    }
};


View.prototype.initSquareGeometry = function(){
    this.nodeGeometry = new THREE.BufferGeometry();

};

/** requires that this.params.nodeGeometry already be created,
 * requires that nodes already have a position */
View.prototype.createSquare = function(node, index){
    var size =0.1 / 2;
    var x = node.data.position[0];
    var y = node.data.position[1];
    var z = node.data.position[2];

    this.vertices[index *3] = x;
    this.vertices[index *3+1] = y;
    this.vertices[index *3+2] = z;

    var r = node.data.color.r;
    var g = node.data.color.g;
    var b = node.data.color.b;

    this.colors[index *3] = r;
    this.colors[index *3 + 1] = g;
    this.colors[index *3 + 2] = b;

   /* Tehe following was an experiment using BufferGeometry without Points

   var vertexPositions =[
        x-size, y-size, z,
        x+ size,y+ -size, z,
        x+ size, y+ size, z,

        x+size, y+ size, z,
        x-size,  y+size, z,
        x-size, y-size,  z
    ];

    var i = index *18;

    // components of the position vectors for each vertex are stored
    // contiguously in the buffer.
    for (var j= 0; j< vertexPositions.length; j++) {
        this.vertices[i + j] = vertexPositions[j];
    }*/

   /* var r = node.data.color.r;
    var g = node.data.color.g;
    var b = node.data.color.b;

    this.colors[i] = r;
    this.colors[i + 1] = g;
    this.colors[i + 2] = b;

    this.colors[i + 3] = r;
    this.colors[i + 4] = g;
    this.colors[i + 5] = b;

    this.colors[i + 6] = r;
    this.colors[i +7] = g;
    this.colors[i + 8] = b;

    this.colors[i + 9] = r;
    this.colors[i + 10] = g;
    this.colors[i + 11] = b;

    this.colors[i + 12] = r;
    this.colors[i + 13] = g;
    this.colors[i + 14] = b;

    this.colors[i + 15] = r;
    this.colors[i + 16] = g;
    this.colors[i + 17] = b;
*/

};

/********************************************* NODE *******************************/

/**
 * A Node is point of data that can be very simple or very rich in its presentation.
 *
 * @param params
 * @constructor
 */
Node = function( params, index, app ) {

    this.params = params || {};
    this.nodeIndex = index;

    //the list of nodes that this is connected to
    this.nodesTo = [];
    //the list of nodes that are connected to this node
    this.nodesFrom = [];

    //a node description contains all the information to describe how this node should be displayed
    this.params.nodeDesc = this.params.nodeDesc || {};
    this.nodeDesc = new NodeDesc( this.params.nodeDesc, app );


    //the internal raw data value object that was loaded as part of the dataDesc
    this.data = this.params.data;

    return this;

}

Node.prototype.draw = function(){

    return this.nodeDesc.draw( this );


}




/********************************************* NODE DESC *******************************/


/**
 * A NodeDesc contains all the information to describe how to render a node
 * @param params
 * @constructor
 */
var NodeDesc = function ( params, app ) {
    this.params = params || {};
    this.app = app;

    this.params.showLabel = typeof this.params.showLabel =="undefined" ? false : true;
    this.params.showBackground = typeof this.params.showBackground =="undefined" ? false : this.params.showBackground;
    this.params.labelFieldName = this.params.labelFieldName || "title";

    this.labelParams = this.params.labelParams || {};
    this.backgroundParams = this.params.backgroundParams || {};

    this.labelText = null; //This is the textSurface object for the label

    return this;
};


NodeDesc.prototype.drawPoint = function(node) {
   this.square = this.createSquare(node);
    return null; //for the moment return nothing, because we done't have an object yet, just a partially build geometry

}

NodeDesc.prototype.draw = function(node) {
    var object = new THREE.Object3D();

    this.label = null;
    if (this.params.showLabel) {
        this.label = this.createText( node );
        object.add( this.label.mesh );
    }
    if (this.params.showBackground){
        this.background = this.createBackground(node);
        object.add( this.background );
    }


    return object;
};


NodeDesc.prototype.addNodeVertexPositionForPoints = function( node, index ) {

};

NodeDesc.prototype.createText = function( node ) {

    var labelParams = this.labelParams || {};
    labelParams.text = node.data[ this.params.labelFieldName ] || "untitled";
    labelParams.fontName = labelParams.fontName ? labelParams.fontName : "Open Sans";
    labelParams.font = this.app.fonts.getFont( labelParams.fontName ? labelParams.fontName : "Open Sans");
    labelParams.fontSize= labelParams.fontSize ? labelParams.fontSize : 1.0;
    labelParams.color = labelParams.color ? labelParams.color : "white";
    labelParams.opacity = (labelParams.opacity != undefined) ? labelParams.opacity : 1;

    labelParams.hAlign =   labelParams.hAlign || FLOW.Text.ALIGN_CENTER;
    labelParams.hAnchor = labelParams.hAnchor || FLOW.Text.ALIGN_CENTER; //where on the plane should the anchor point be
    labelParams.wrapType = labelParams.wrapType || undefined;
    labelParams.wrapValue = labelParams.wrapValue || undefined;



    this.labelText = new FLOW.Text.Text(labelParams);
    this.labelText.mesh = this.labelText.buildMesh();
    this.labelText.mesh.frustumCulled = false; ///still needed for some reason
    return this.labelText;
};


NodeDesc.prototype.createBackground = function( node ) {
    var param = this.param;
    if (this.labelText) {
        this.boundingBox =  this.labelText.getBoundingBox();
        this.actualWidth = this.boundingBox._max.x -this.boundingBox._min.x ;
        this.actualHeight = this.boundingBox._max.y -this.boundingBox._min.y ;
    }
    var useActualDimensions = true ;//TODO: parameterize
    var leftPadding = 0.1;//TODO: parameterize
    var rightPadding = 0.1;//TODO: parameterize
    var topPadding = 0.1;//TODO: parameterize
    var bottomPadding = 0.1;//TODO: parameterize
    var width = useActualDimensions? this.actualWidth : this.param.width;
    var height = useActualDimensions? this.actualHeight : this.param.height;
    /*var isTransparent = this.param.backgroundTransparency == undefined? false
     : this.param.backgroundTransparency;*/
    width +=  leftPadding + rightPadding;
    height +=  topPadding +bottomPadding;
    var widthSegments = 1;
    var heightSegments = 1;
    var geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);

    /* if (param.curvature){
     NAVI.GeoUtils.curve(geo, param.widthSegments, 1, param.curvature);
     }*/

    /* if (backgroundColor != "none" &&backgroundColor != "transparent") {
     //TODO: create solid color backgoundTexture
     }
     */
    // this.backgroundParams = params.backgroundParams || {};
    var backgroundParams = {
        // margin:             param.margin || this.param.fontSize / 10,//TODO: not yet implemented
        opacity:   ( this.backgroundParams.opacity !=undefined) ?  this.backgroundParams.opacity : 1.0,
        //backgroundColor:    param.backgroundColor || "none" , //null gives a fully transparent background
        texture: ( this.backgroundParams.texture ) ?  this.backgroundParams.texture : undefined,
        sides :  (this.backgroundParams.sides ) ?  this.backgroundParams.sides : THREE.DoubleSide,
        transparency:  ( this.backgroundParams.transparency != undefined ) ?   this.backgroundParams.transparency : false,
        blending:  ( this.backgroundParams.blending != undefined ) ?  this.backgroundParams.blending : THREE.NormalBlending
    }
   // this.backgroundNeedsUpdate = true;

    // background opacity and background color
    var surfaceMaterial = new THREE.MeshBasicMaterial({
        map: FLOW.Textures.getInstance().getTexture( backgroundParams.texture).map,
        side: backgroundParams.sides,
        blending: backgroundParams.blending,
        opacity: backgroundParams.opacity
    });
    surfaceMaterial.transparent = ( backgroundParams.transparency  || backgroundParams.opacity <1);
    surfaceMaterial.depthWrite =  !surfaceMaterial.transparent;//true;//false;//param.hasAlphaTransparency || ! surfaceMaterial.transparent;

   /* this.param.widthSegments = this.param.curvature ? 20 : 1;

    if (this.param.curvature === undefined || this.param.curvature === 0) {
        this.param.heightSegments = 2;
    }*/

    var mesh = new THREE.Mesh(   geometry,  surfaceMaterial   );
    mesh.position.setZ( -0.01 );
    //set the positions based on the anchor
    return mesh;

};

NodeDesc.prototype.createBoxNode = function(param,  graphNode) {
    var obj= new THREE.Object3D();
    var mesh = new THREE.Mesh( new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshBasicMaterial({
            color: "#ff0000",//getLineColor(this.nodeColor),
            opacity: 1.0
        })
    );
    obj.add(mesh);
    return obj;
};

NodeDesc.prototype.createInvisibleNode = function(param, obj, graphNode) {
    var obj= new THREE.Object3D();
    return obj;
};



/* imageParams : {
 opacity: 0.5,
 width:2,
 height:4,
 side: THREE.DoubleSide,
 defaultImageUrl: "graphics/spark3.png"*/


NodeDesc.prototype.createImageNode =  function(param, graphNode) {

    var imageUrl  = graphNode.data.imageUrl ? graphNode.data.imageUrl:
        param.imageParams.defaultImageUrl ? param.imageParams.defaultImageUrl : "graphics/placeholder.jpg" ;
    var imageWidth = graphNode.data.imageWidth ? graphNode.data.imageWidth:
        param.imageParams.width ? param.imageParams.width : 1 ;
    var imageHeight = graphNode.data.imageHeight ? graphNode.data.imageHeight:
        param.imageParams.height ? param.imageParams.height : 1 ;
    var imageOpacity = graphNode.data.imageOpacity ? graphNode.data.imageOpacity:
        param.imageParams.opacity ? param.imageParams.opacity : 1.0 ;
    var imageSide = graphNode.data.imageSide ? graphNode.data.imageSide:
        param.imageParams.sides ? param.imageParams.sides : THREE.DoubleSide ;
    var imageBlending = graphNode.data.imageBlending ? graphNode.data.imageBlending:
        param.imageParams.blending ? param.imageParams.blending : THREE.NormalBlending ;

    var geometry = new THREE.PlaneGeometry(imageWidth, imageHeight, 1, 1);
    var material = new THREE.MeshBasicMaterial({
        side: imageSide,
        blending: imageBlending,
        opacity: imageOpacity
    });
    material.transparent = ( imageOpacity <1);
    material.depthWrite = !material.transparent;

    var image = new THREE.Mesh(geometry, material);

    var loader = new THREE.TextureLoader();
    image.material.map = loader.load(imageUrl);

    var obj= new THREE.Object3D();
    if (graphNode.data.title && param.showLabels ) {
        var text = this.buildTextNode(param, graphNode);
        text.object.position.set( 0, - imageHeight, 0.01);
        obj.add(text.object);
    }
    obj.add(image);
    return obj
};




NodeDesc.prototype.createIModelNode =  function(param, graphNode) {

    var onProgress = function ( xhr ) {
        if ( xhr.lengthComputable ) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round(percentComplete, 2) + '% downloaded' );
        }
    };
    var onError = function ( xhr ) {
    };


    var modelUrl  = graphNode.data.modelUrl ;
    if (!modelUrl) {
        console.error("No model provided!");
        return;
    }
    var scale = graphNode.data.scale ? graphNode.data.scale: 1 ;
    var color = graphNode.data.color ? graphNode.data.color: null ;
    var imageOpacity = graphNode.data.imageOpacity ? graphNode.data.imageOpacity:
        param.imageParams.opacity ? param.imageParams.opacity : 1.0 ;
    var imageSide = graphNode.data.imageSide ? graphNode.data.imageSide:
        param.imageParams.sides ? param.imageParams.sides : THREE.DoubleSide ;
    var imageBlending = graphNode.data.imageBlending ? graphNode.data.imageBlending:
        param.imageParams.blending ? param.imageParams.blending : THREE.NormalBlending ;

    this.loadingManager = this.loadingManager ? this.loadingManager: new THREE.LoadingManager();


    var obj = new THREE.Object3D();
    var loader = new THREE.OBJLoader( this.loadingManager );
    loader.load( modelUrl, function ( object ) {
        /* object.traverse( function ( child ) {
         if ( child instanceof THREE.Mesh ) {
         child.material.map = texture;
         }
         } );*/
        //object.position.y = - 95;
        object.scale.set(scale, scale, scale);
        if (color) {
            for (i = 0; i< object.children.length; i++)  {
                if (object.children[i].material) {
                    object.children[i].material.color = new THREE.Color( color );
                }
            }
        }
        object.rotation.set(0,-1.5, 0);
    }, onProgress, onError );

    /*var geometry = new THREE.PlaneGeometry(imageWidth, imageHeight, 1, 1);
     var material = new THREE.MeshBasicMaterial({
     side: imageSide,
     blending: imageBlending,
     opacity: imageOpacity
     });
     material.transparent = ( imageOpacity <1);
     material.depthWrite = !material.transparent;

     var image = new THREE.Mesh(geometry, material);

     var loader = new THREE.TextureLoader();
     image.material.map = loader.load(imageUrl);*/

    if (graphNode.data.title && param.showLabels ) {
        var multiText = this.buildTextNode(param, graphNode);
        // multiText.object.position.set( 0, - imageHeight, 0.01);
        multiText.object.position.set( 0, -0.6, 0.01);
        obj.add(multiText.object);
    }
    // obj.add(image);
    return obj;
};

NodeDesc.prototype.createRetweet = function(param, obj, graphNode) {
    var param = this.param || {};
    var labelParams = param.labelParams || {};
    labelParams.text = graphNode.data.text || "untitled";
    labelParams.border = 0;
    labelParams.fontSize = 180;
    labelParams.backgroundColor ="transparent";
    labelParams.color ="white";
    labelParams.width = 4;
    labelParams.height = 2;
    //labelParams.multiSurface = false;

    var wrapLayout = new Prefabs.WrapLayout(labelParams);
    // var wrapLayoutObject = wrapLayout.update();

    // obj.transform.scale.set(0.2, 0.2, 0.2);

    obj.addChild(wrapLayout);
};


NodeDesc.prototype.createTweetNode = function(param, obj, graphNode) {
    var tweetLayout = new Prefabs.Tweet(graphNode.data);
    // obj.transform.scale.set(0.2, 0.2, 0.2);
    this.obj.addChild(tweetLayout);
};


FLOW.Data = {
    View: View,
    Node:  Node,
    NodeDesc: NodeDesc
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Data;
}));



