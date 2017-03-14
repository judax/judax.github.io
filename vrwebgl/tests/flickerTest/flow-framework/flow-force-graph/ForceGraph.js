var THREE = THREE || require('three');

var ForceDirectedLayout =ForceDirectedLayout || require("force-directed-layout");

var FLOW = FLOW || {};
FLOW.Lines = FLOW.Lines || require("flow-lines");
FLOW.Color = FLOW.Color || require("flow-color-utils");
FLOW.Graph = FLOW.Graph || require("flow-graph");
FLOW.MathUtils = FLOW.MathUtils || require("flow-math-utils");
FLOW.Textures = FLOW.Textures || require("flow-textures");
FLOW.Data = FLOW.Data || require("flow-data-view");

/**
 based on the work of  David Piegza

 Heavily modified and extended by Jason Marsh.

 Implements a simple graph drawing with force-directed placement in 2D and 3D.

 It uses the force-directed-layout implemented in:
 https://github.com/davidpiegza/Graph-Visualization/blob/master/layouts/force-directed-layout.js

 Parameters:
 options = {
    layout: "2d" or "3d" //default 3d
    showNodes: <bool>, //default true
    showLines: <bool>, //default true
    showLabels: <bool>, //default true
    labelsFaceCamera: <bool> // default false

    selection: <bool>, enables selection of nodes on mouse over (it displays some info
               when the showInfo flag is set)


    limit: <int>, maximum number of nodes, default 10

 randomGeneration: {
    numNodes: <int> - sets the number of nodes to create, default 20
    maxBranches: <int> - sets the maximum number of edges for a node. A node will have
              1 to numEdges edges, this is set randomly. Default 10
              }
    lineColor: "#ffffff" -options are a hexx string or 'bluish'
    nodeColor: "#ffffff" -options are a hexx string or 'bluish'
    graphLayout:{
        attraction: 5,
        repulsion: 0.5,
        width: 2000,
        height : 2000,
        iterations:  100000,
        area: 5000
    },

    labelParams :{
        //size:randomBetween(30,250),
        color:'bluish',
        opacity:0.6,
        font:"tangerinebold"
    }
    nodeTypeParams:[   //used to define label formatting based on the node.data.data.type, if present
                {type:"Family", params:{color:"#ff0000"}}
            ]
    edgeTypeParams:[  //used to define line formatting based on the node.data.data.type, if present
        {type:"Family", params:{color:"#ff0000"}}
    ],
    hiddenNodeTypes = ["characteristic"],//Any nodeTypes where the labels should be hidden can be set in this list;
  }

 */

var Defaults = Defaults || {};

Defaults.ForceDirectedGraph = {};
Defaults.ForceDirectedGraph.DEFAULT_WIDTH = 2;
Defaults.ForceDirectedGraph.DEFAULT_HEIGHT = 2;
Defaults.ForceDirectedGraph.DEFAULT_WIDTH_SEGMENTS = 16;
Defaults.ForceDirectedGraph.DEFAULT_HEIGHT_SEGMENTS = 16;
Defaults.ForceDirectedGraph.DEFAULT_CURVATURE = 0;
Defaults.ForceDirectedGraph.DEFAULT_VALUE = "";
Defaults.ForceDirectedGraph.DEFAULT_COLOR = "black";
Defaults.ForceDirectedGraph.DEFAULT_BACKGROUND_COLOR = "white";
Defaults.ForceDirectedGraph.DEFAULT_FONT_FAMILY = "helvetica";
Defaults.ForceDirectedGraph.DEFAULT_FONT_WEIGHT = "normal";
Defaults.ForceDirectedGraph.DEFAULT_FONT_STYLE = "normal";
Defaults.ForceDirectedGraph.DEFAULT_FONT_SIZE = 1;


var ForceGraph = function (app, param, hierarchy, predefinedGraph ) {
    param = param || {};
    this.app = app;
    this.object = new THREE.Object3D();


    param.width = param.width || Defaults.ForceDirectedGraph.DEFAULT_WIDTH;
    param.height = param.height || Defaults.ForceDirectedGraph.DEFAULT_HEIGHT;
    param.widthSegments = param.width || Defaults.ForceDirectedGraph.DEFAULT_WIDTH_SEGMENTS;
    param.heightSegments = param.height || Defaults.ForceDirectedGraph.DEFAULT_HEIGHT_SEGMENTS;
    param.curvature = param.curvature || Defaults.ForceDirectedGraph.DEFAULT_CURVATURE;
    param.color = param.color || Defaults.ForceDirectedGraph.DEFAULT_COLOR;
    param.backgroundColor = param.backgroundColor || Defaults.ForceDirectedGraph.DEFAULT_BACKGROUND_COLOR;
    param.border = param.border || 0;
    param.borderRadius = param.border || 0;
    param.borderRadiusLeft = param.borderRadiusLeft || 0;
    param.borderRadiusTop = param.borderRadiusTop || 0;
    param.borderRadiusRight = param.borderRadiusRight || 0;
    param.borderRadiusBottom = param.borderRadiusBottom || 0;
    param.showLines = param.showLines !== undefined ? param.showLines : true;


    this.layout = param.layout || "3d";
    this.layout_options = param.graphLayout || {};
    this.labelParams = param.labelParams || {};
    this.imageParams = param.imageParams || {};
    this.nodeTypeParams = param.nodeTypeParams || [];
    this.edgeTypeParams = param.edgeTypeParams || [];
    //this.show_nodes = (typeof param.showNodes === "undefined") ? true : param.showNodes;
    this.showLines = param.showLines;
   // this.show_labels = (typeof param.showLines === "undefined") ? true : param.showLabels;
    this.labelsFaceCamera = param.labelsFaceCamera || false;
    this.lineColor = param.lineColor || "#ffffff";
    this.lineThickness = param.lineThickness || 0.003;
    this.lineOpacity = param.lineOpacity || 1;
    this.nodeColor = param.nodeColor || "#ffffff";
    this.hiddenNodeTypes = param.hiddenNodeTypes || [];//Any nodeTypes where the labels should be hidden can be set in this list;

    this.limit = param.limit || 10;

    this.hierarchy = hierarchy;

    this.randomGeneration = param.randomGeneration;
    if (this.randomGeneration) {
        this.nodes_count = this.randomGeneration.numNodes || 100;
        this.edges_count = this.randomGeneration.maxBranches || 7;
    }
    this.expandOnClick = param.expandOnClick || false;


    if (param.backgroundParams) {
       FLOW.Textures.getInstance().parseTextures(param.backgroundParams.texture, param.nodeTypeParams);
    }

    this.param = param;

    this.object = new THREE.Object3D();


    this.graph = predefinedGraph || new FLOW.Graph.Graph({limit: param.limit});

    this.allLineParams = [];
    this.lines = new FLOW.Lines.Lines();//structure that holds all the line Visuals so that we can update them each render cycle
    this.lines.setSize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio);
    this.lines.setOpacity( this.lineOpacity );
    this.edges = [];

    var that = this;

    if (typeof showNodeCount !== "undefined") {
        var nodeCountTitle = document.createElement('p');
        nodeCountTitle.innerHTML = 'Node count: ';
        var s = nodeCountTitle.style;
        s.position = 'fixed';
        s.left = s.top = '10px';
        document.body.appendChild(nodeCountTitle);

        this.nodeCountElement = document.createElement('span');
        nodeCountTitle.appendChild(this.nodeCountElement);
    }

    if (hierarchy) {
        this.createGraph();
    }
    if (predefinedGraph) {
        this.setGraph(predefinedGraph);
    }

    if(this.labelsFaceCamera) {
        for (var j = 0; j< this.graph.nodes.length; j++) {
            this.graph.nodes[j].component.nodes[0].nodeDesc.label.mesh.track();
        }
    }

    this.initLayout();

    return this;
};


ForceGraph.insertItemsAtNode = function(parentNode, items){
    this.insertItemsAtNode(parentNode, items);
    this.layout.finished = false;
    this.createNodeVisuals();
    this.initLayout(500);
}

ForceGraph.prototype.restartLayout = function(iterations){
    this.layout_options.iterations = iterations;
    this.layout.finished = false;

    this.initLayout(500);
}


ForceGraph.prototype.refreshLayout = function(){
    this.layout_options.iterations = 1000;
    this.resetPositions();
    this.initLayout();
}


/**
 *  Creates a graph with random nodes and edges.
 *  Number of nodes and edges can be set with
 *  numNodes and numEdges.
 */
ForceGraph.prototype.createGraph = function () {
    var retVal;
    if (this.hierarchy) {
        retVal = this.displayHierarchy(this.hierarchy);
    } else {
        retVal = this.generateRandomNodes();
    }
    if ( this.nodeCountElement) {
        this.nodeCountElement.textContent = this.graph.nodes.length;
    }
    return retVal;
};

ForceGraph.prototype.setGraph = function (predefinedGraph) {
    this.graph = predefinedGraph;


    if ( this.nodeCountElement) {
        this.nodeCountElement.textContent = this.graph.nodes.length;
    }
    this.createNodeVisuals();
    // this.resetPositions();
    this.initLayout();

};

ForceGraph.prototype.generateRandomNodes = function() {
    var node = new ForceGraphNode(0);
    node.data.title = "Node " + node.id;//"@auradeluxe Either you smoke it or it #smokesYou";
    if (this.param.initialX != undefined ) {
        node.data.fixedPosition = {
            x: this.param.initialX || 0,
            y: this.param.initialY || 0,
            z: this.param.initialZ || 0
        };
    }
    node.data.type = this.param.rootNodeType || FLOW.TEXT_NODE;

    this.graph.addNode(node);
    this.initNode(node);
    //var initialNode = node;

    var nodes = [];
    nodes.push(node);

    var steps = 1;
    while (nodes.length != 0 && steps < this.nodes_count) {
        var node = nodes.shift();

        var numEdges = FLOW.MathUtils.randomBetween(1, this.edges_count);
        for (var i = 1; i <= numEdges; i++) {
            var target_node = new ForceGraphNode(i * steps);
            if (this.graph.addNode(target_node)) {
                target_node.data.title ="Node " + node.id;// "@auradeluxe Either you smoke it or it #smokesYou";
                target_node.data.text = this.param.subNodeText || "Anonymous";
                target_node.data.type =  this.param.subNodeType || FLOW.TEXT_NODE;
                target_node.titleNodeType = this.param.nodeTypeParams[ FLOW.MathUtils.randomBetween(0, this.param.nodeTypeParams.length - 1)].type;

                this.initNode(target_node);

                nodes.push(target_node);
                if (this.graph.addEdge(node, target_node)) {
                    this.createEdge(node, target_node);
                }
            }
        }
        steps++;
    }

    //just a trick to hook up the first node to a random other node
    /*var connectionNode = this.graph.getNode(randomFromTo(1,this.nodes_count-1))
     if (this.graph.addEdge(connectionNode, initialNode)) {
     createEdge(connectionNode, initialNode);
     }*/

    this.createNodeVisuals();
    this.initLayout();

    return this;
};

/**
 *  Creates a graph from a hierarchy.
 *
 *  example hierarchy:
 *   var hierarchy = {id:"1", title:"1",
            items: [
                {id:"2", title:"1.1", items:[] },
                {id:"3", title:"1.2", items:[] },
                {id:"4", title:"1.3", items:[
                        {id:"5", title:"1.3.1", items:[] }
                    ]
                }
            ]
        };
 */
ForceGraph.prototype.displayHierarchy = function (hierarchy) {
    hierarchy.fixedPosition =hierarchy.fixedPosition?
    { x : this.param.initialX || 0 , y : this.param.initialY || 0, z : this.param.initialZ } : null;

    this.createNode(hierarchy);
    this.createNodeVisuals();
    this.initLayout();

    return this;
};


ForceGraph.prototype.createNodeVisuals = function(){
    for (var i = 0; i < this.graph.nodes.length; i++) {
        this.drawNode(this.graph.nodes[i]);
        this.resetNodePosition(this.graph.nodes[i]);
    }

    if (! this.showLines) { return; }
    for (var j = 0; j < this.graph.edges.length; j++) {
        var edge= this.graph.edges[j];
        this.drawEdge(edge.source, edge.target, this.labelParams, this.allLineParams, this.lines);
    }

};

/* actually display the graph as a force-directed layout */
ForceGraph.prototype.initLayout = function(){

    this.layout_options.width = this.layout_options.width || 2000;
    this.layout_options.height = this.layout_options.height || 2000;
    this.layout_options.iterations = this.layout_options.iterations || 100000;
    this.layout_options.layout = this.layout_options.layout || this.layout;
    this.graph.layout = new ForceDirectedLayout(this.graph, this.layout_options);
    this.graph.layout.init();

     this.object.add(this.lines.buildMesh());

};

ForceGraph.prototype.resetNodePosition = function (node) {
    if (node.data.fixedPosition ) {
        node.position = {x: node.data.fixedPosition.x, y: node.data.fixedPosition.y, z: node.data.fixedPosition.z};
    } else  if (! node.position || typeof node.position.x == "undefined") {
        var area = this.layout_options.area || 40;
        var x = Math.random() * (area * 2 + 1);
        var y = Math.random() * (area * 2 + 1);
        if (this.layout != "2d") {
            var z = Math.random() * (area * 2 + 1) - area * 2;
        } else {
            var z= 0;
        }
       node.position = {x: x, y: y, z: z};
    } else {
        node.position = {x: node.position.x*1, y: node.position.y*1, z: node.position.z*1}; //in case they are strings
    }

    node.data.draw_object.position.set(node.position.x, node.position.y, node.position.z) ;
    node.layout ={};//reset the internal position information

};

ForceGraph.prototype.resetPositions = function(){
    var nodes =  this.graph.nodes;
    for (var i=0; i< nodes.length; i++ ){
        this.resetNodePosition(nodes[i]);
    }


};


ForceGraph.prototype.getNode= function(nodeId){
    return this.graph.getNode(nodeId);
};


ForceGraph.prototype.createNode = function(item, parentNode) {
    this.graph.createNode
    var targetNode = new ForceGraphNode(item.id? item.id :item.title);

    if (this.graph.addNode(targetNode)) {
        targetNode.data.title = item.title;
        targetNode.data.fixedPosition = item.fixedPosition ? item.fixedPosition : null;
        targetNode.data.type = item.data.type || FLOW.TEXT_NODE;
        targetNode.data.text = item.text;
        targetNode.data.title = item.title;
        targetNode.items= item.items;
        targetNode.titleNodeType =(item.data && item.data.type) ? item.data.type :null;
        targetNode.data.imageUrl = item.data.imageUrl;
        targetNode.data.modelUrl = item.data.modelUrl;
        targetNode.data.imageWidth= item.data.imageWidth;
        targetNode.data.imageHeight= item.data.imageHeight;
        targetNode.data.scale= item.data.scale;
        targetNode.data.color= item.data.color;

        this.initNode(targetNode);
        if (parentNode) {
            if (this.graph.addEdge(parentNode, targetNode)) {
                this.createEdge(parentNode, targetNode);
            } else {
                console.log("Failed to addEdge:", targetNode.id, targetNode.title, "to", parentNode.title)
            }
        }

    } else{
        console.log("Failed to addNode:", targetNode.id, targetNode.title)
    }
    if (item.items) {
        for (var index = 0; index < item.items.length; index++) {
            this.createNode(item.items[index], targetNode);
        }
    }
};


ForceGraph.prototype.insertItemsAtNode = function(parentNode, items){
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var targetNode = new ForceGraphNode(item.id? item.id :item.title);
        if (this.graph.addNode(targetNode)) {
            targetNode.title = item.title +"";
            targetNode.data = item;
            targetNode.items = item.items;
            this.initNode(targetNode);
            if (parentNode) {
                if (this.graph.addEdge(parentNode, targetNode)) {
                    this.createEdge(parentNode, targetNode);
                } else {
                    console.log("Failed to addEdge:", targetNode.id, targetNode.title, "to", parentNode.title)
                }
            }

        } else {
            console.log("Failed to addNode:", targetNode.id, targetNode.title)
        }
        if (targetNode.items) {
            for (var index = 0; index < targetNode.items.length; index++) {
                this.insertItemsAtNode(targetNode.items[index], targetNode);
            }
        }
    }
};

/**
 *  Create a node object and position it randomly to begin with
 */
ForceGraph.prototype.initNode= function(node) {
    var param = {}; //TODO: need to use the params
    node.data = node.data || {};
    if (! node.data.fixedPosition) {
        var area = this.layout_options.area || 40;
        var x = Math.floor(Math.random() * (area * 2 + 1));
        var y = Math.floor(Math.random() * (area * 2 + 1));
        var z = Math.floor(Math.random() * (area * 2 + 1) - area * 2);
        node.position = {x: x, y: y, z: z};
    } else {
        node.position = {x: node.data.fixedPosition.x, y: node.data.fixedPosition.y, z: node.data.fixedPosition.z};
    }

};


ForceGraph.prototype.drawNode = function(node) {
    if (node.data.draw_object) {return} //already drawn!

    var param = this.param || {}; //TODO: need to use the params to pick which visual to use for the node

    var labelParams =  param.labelParams || {};
    var backgroundParams = param.backgroundParams || {};
    backgroundParams.showBackground = param.showBackground;
    if (param.nodeTypeParams) {
        for (var i = 0; i < param.nodeTypeParams.length; i++) {
            var parm =  param.nodeTypeParams[i];
            if (node.data.type == parm.type) {
                if (parm.params.color){
                    labelParams.color = parm.params.color;
                }
                if (parm.params.font) {
                    labelParams.fontName = parm.params.font;
                }
                if (parm.params.fontSize) {
                    labelParams.fontSize = parm.params.fontSize;
                }
                if (parm.params.backgroundTexture) {
                    backgroundParams.texture =this.param.backgroundParams.texture;
                }
                if (parm.params.showBackground != undefined) {
                    backgroundParams.showBackground =parm.params.showBackground;
                }
                break;
            }
        }
    }

    var view = new FLOW.Data.View({ node: node, labelParams:labelParams, backgroundParams:backgroundParams,
        }, this.app);//node.data, nodeDesc: node.nodeDesc   });

    node.component = view;//createFunction.call(this, param, node);
    node.component.object.position.set(node.position.x, node.position.y, node.position.z);
    this.object.add(node.component.object);

    node.data.draw_object = node.component.object;

};



/**
 *  Create an edge object (line) and add it to the object.
 */
ForceGraph.prototype.createEdge = function(source, target) {
    if (!this.showLines) {
        return;
    }
    var color = this.lineColor ? this.lineColor : "#ffffff";
    var thickness = this.lineThickness ? this.lineThickness : 0.003;
    var opacity = this.lineOpacity ? this.lineOpacity : 1.0;
    if (target.data) {
        for (var index=0; index< this.edgeTypeParams.length; index++){
            var typeItem = this.edgeTypeParams[index];
            if (target.data.type == typeItem.type) {
                if (typeItem.params.color) {
                    color = typeItem.params.color;
                }
                if (typeItem.params.lineThickness) {
                    thickness = typeItem.params.lineThickness;
                }
                if (typeItem.params.lineOpacity) {
                    opacity = typeItem.params.lineOpacity;
                }
            }
        };
    }
    //TODO: above does nothing.


    //drawEdge(source, target, params)
}

/**
 * NOTE: edge visual elements must be drawn AFTER the node visual elements!
 *
 * @param source
 * @param target
 * @param params
 */
ForceGraph.prototype.drawEdge = function(source, target, params, allLineParams, lines) {
    //TODO: don't redraw a line if it is already drawn!
    params = params || {};
    params.lineColors = this.param.lineColors;
    params.lineColor = this.param.lineColor;
    params.lineThickness = this.param.lineThickness;
    params.lineOpacity = this.param.lineOpacity;

    var line = new FLOW.Force.GraphLine( source, target, params, allLineParams, lines ); //this adds the line into the allLineParams
    this.edges.push(line);
};


ForceGraph.prototype.update = function() {
    if (!this.graph.layout) {
        return;
    }
    // Generate layout if not finished
    if (!this.graph.layout.finished) {
        // info_text.calc = "<span style='color: red'>Calculating layout...</span>";
        this.graph.layout.generate();
    } else {
        //info_text.calc = "";
    }

    if (!this.graph.layout.finished) {
        // Update position of lines (edges) //TODO: only run this if the lines changed position
        for (var j = 0; j< this.edges.length; j++) {
            var theEdge = this.edges[j];
            var theLineParams = this.allLineParams[j];
            //var lineScript = theLine.obj.getComponent(glam.Script);
            var source = theEdge.source.position;
            var target = theEdge.target.position;
            theLineParams.setPoint(0, new THREE.Vector3(source.x, source.y, source.z) );
            theLineParams.setPoint(1, new THREE.Vector3(target.x, target.y, target.z) );

        }
        this.lines.resetAllLines();
    }

    /*
    if (this.labelsFaceCamera){
        for (var j = 0; j< this.graph.nodes.length; j++) {
            //TODO: this is broken for the gearVR.
            //var vCopy = new THREE.Vector3(this.app.camera.position.x, this.app.camera.position.y, this.app.camera.position.z);
            //this.graph.nodes[j].component.object.lookAt(this.app.camera.position);
           // this.app.lookTowardCamera(this.graph.nodes[j].component.object.children[0].children[0]);
           // this.graph.nodes[j].component.nodes[0].nodeDesc.label.lookAt(this.camera);
           // FLOW.Text.lookAt(this.graph.nodes[j].component.nodes[0].nodeDesc.label, this.app.scene)
            this.app.lookTowardCameraText(this.graph.nodes[j].component.nodes[0].nodeDesc.label.mesh);
          //  this.app.lookTowardCamera(this.graph.nodes[j].component.object);

        }
    }
    */

};



// Stop layout calculation
ForceGraph.prototype.stop_calculating = function () {
    this.graph.layout.stop_calculating();
};





/**
 * A GraphLine is the line used to connect nodes in a ForceGraph
 *
 * @param source
 * @param target
 * @param params
 * @param allLineParams
 * @param lines
 * @returns {GraphLine}
 * @constructor
 */
var GraphLine = function(source, target, params, allLineParams, lines) {

    params = params || {};
    this.params = params;

    this.source = source;
    this.target = target;

    this.allLineParams = allLineParams;
    this.lines = lines;

    this.draw();

    return this;
};


/**
 *
 *
 *
 */
GraphLine.prototype.draw = function()
{
    //Don't create the line if the source or target doesn't need it
    if (! this.source || !this.target){
        return;
    }

    var sourcePosition = this.source.data.draw_object.position;
    var targetPosition = this.target.data.draw_object.position;

    var line = new FLOW.Lines.Line();
    line.addPoint( sourcePosition );
    line.addPoint( targetPosition );

    line.setColor(new THREE.Color( FLOW.Color.findColor(this.params.lineColor ? this.params.lineColor: "#ff0000")));
    line.setWidth( this.params.lineThickness );
    this.lines.addLine(line);
    this.allLineParams.push(line);
    this.line = line;

};



FLOW.Force = {
    ForceGraph: ForceGraph,
    GraphLine:  GraphLine
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Force;
}));
