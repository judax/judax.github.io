
var THREE = THREE || require('three');

var FLOW = FLOW || {};
FLOW.Text = FLOW.Text || require('flow-text');



/**
 * A Layout is used to arrange items in space.
 *
 *
 * @param params
 * @constructor
 */
FLOW.Layout = function(nodes, categories, params ) {

    //The list of  nodes
    this.nodes = nodes;
    this.params = params;
    this.categories = categories;

    this.scaleAll =100;

    this.categorizedVerticalSpacing =0.01* this.scaleAll;
    this.categorizedOffsetY = 0;// * scaleAll;
    this.categorizedZOffset = 0;// * scaleAll;
    this.categoryWidth = 0.21;
    this.numColumns = 20;

    this.nodeVertices = [];
    this.categoryTexts = [];

    return this;
};

FLOW.Layout.prototype.calculateCategorizedNodePositions= function(whichCategory) {
    this.nodeVertices = [];

    this.sortCategories();

    var numNodes = this.nodes.length;

    var i = 0, j = 0;
    var cols = this.numColumns;

    for (var k = 0; k < numNodes; k++) {

        var theNode = this.nodes[k];
        var thisCategory = this.categories[theNode[whichCategory]];
        if (typeof thisCategory == "undefined") {
            console.log("category missing: " + whichCategory);
        }
        var categoryOffsetX = (thisCategory.ordinal * this.categoryWidth ) * this.scaleAll;
        j = thisCategory.lastIndex % cols;
        i = Math.floor(thisCategory.lastIndex / cols);

        var position = this.positionNode(thisCategory.lastIndex, i, j, categoryOffsetX);
        this.nodeVertices.push(position[0], position[1], position[2] );
        thisCategory.lastIndex++;

    }

};

FLOW.Layout.prototype.positionNode = function(k, i, j, categoryOffsetX) {
    var w = 1;
    var h = 1;
    var spacing = this.categorizedVerticalSpacing ;

    var x = j * w*spacing + categoryOffsetX;
    var y = i * w*spacing + this.categorizedOffsetY;
    var z = 0;

    return [x, y, z ];
};


FLOW.Layout.prototype.sortCategories = function(  ){
    //convert availableCategories to an array; //TODO: get d3 to do this sorting for me
    var categoryOrdinalArray = [];
    var categoryOrdinalIndex = 0;
    for (var item in this.categories) {
        item.categoryOrdinal = categoryOrdinalIndex;
        categoryOrdinalArray.push(item)
        categoryOrdinalIndex++;
    }

    //sort the array:
    var sortedCategories = categoryOrdinalArray.sort(function (a, b) {
        return this.categories[b].count - this.categories[a].count;
    }.bind(this));

    //transfer the ordinals back into the availableCategories array:
    sortedCategories.forEach(function (item, index) {
        this.categories[item].ordinal = index;
    }.bind(this));
};

FLOW.Layout.prototype.createCategoryTitles = function( object ) {
    this.categoryTexts = [];
    //creates the labels for the states in category view
    for (var item in this.categories) {

        thisCategory =this.categories[item];
        //Puts the word at the right category spot, plus an offset to put it in the middle fo the category object
        var categoryOffsetX = ((thisCategory.ordinal * this.categoryWidth ) + (this.categoryWidth / 2))
            * this.scaleAll;

        //TODO: make labelParms configurable
        var labelParams = {
            text: thisCategory.title ? thisCategory.title : thisCategory.name,
            font: app.fonts.getFont("Open Sans"),
            fontSize: 1.9,
            hAlign: FLOW.Text.ALIGN_CENTER,
            opacity: 1.0,
            color: "white"
        };

        var labelText = new FLOW.Text.Text(labelParams);
        labelText.id = thisCategory.name;
        labelText.mesh = labelText.buildMesh()
        labelText.mesh.frustumCulled = false;

        var y = this.categorizedOffsetY - 0.02 * this.scaleAll;
        var z = 0 * this.scaleAll + this.categorizedZOffset;
        thisCategory.position = new THREE.Vector3(categoryOffsetX, y, z);
        labelText.setPosition([categoryOffsetX, y, z]);

        //textSurface.object.scale.set(5,5,5 );
        labelText.mesh.visible = true;
        object.add(labelText.mesh);
        this.categoryTexts.push(labelText);
    }
};



(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Layout;
}));



