
var THREE = THREE || require('three');

var FLOW = FLOW || {};
FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.EventUtils = FLOW.EventUtils || require("flow-event-utils");
FLOW.MathUtils = FLOW.MathUtils || require("flow-math-utils");
FLOW.Text = FLOW.Text || require('flow-text');

/**
 * example:
 * params = navHierarchy:{items:[
            {id:"globe", title:"Globe", subtitle:"", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png",
                items:[
                { id:"where", title:"Where", subtitle:"Refugee movements", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png",
                    items:[
                    { id:"count", title:"Count", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"},
                    { id:"asylum", title:"Asylum", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"},
                    { id:"naturalized", title:"Naturalized", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"},
                    { id:"resettled", title:"Resettled", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"}
                ]},
                { id:"who", title:"Who", subtitle:"Demographics",icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png",
                    items:[
                    { id:"gender", title:"Gender", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"},
                    { id:"age", title:"Age", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"},
                    { id:"occupation", title:"Occupation", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"},
                    { id:"education", title:"Education", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"}
                ]},
                { id:"journey", title:"Journey", subtitle:"One familiy's journey", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"}
            ] },
            {id:"syria", title:"Syria", subtitle:"", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png",
                items:[
                { id:"warmap", title:"War Map", subtitle:"Refugee movements", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png",
                    items:[
                    { id:"groups", title:"Groups & governments", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"},
                    { id:"population", title:"Population density", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"}
                ]},
                { id:"casualities", title:"War casualities", subtitle:"Demographics", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png",
                    items:[
                    { id:"citymakeup", title:"City", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"},
                    { id:"religion", title:"Religion/ Ethnicity", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"},
                    { id:"killing", title:"Who's killing who?", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"},
                    { id:"deathtoll", title:"Death Toll", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"},
                    { id:"disappearance", title:"Forced Disappearance", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"},
                ]},
                { id:"whyleave", title:"Why Leave?", subtitle:"", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"},
                { id:"whystay", title:"Why Stay?", subtitle:"", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"}
            ] },
            {id:"aleppo", title:"Aleppo", subtitle:"", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png",
                items:[
                { id:"beforeafter", title:"Before/After",  icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png", subtitle:""},
                { id:"casualities", title:"War casualities", subtitle:"Demographics", icon:"../../flow-resources/graphics/flow-control-panel/Icon-Generic.png"}
            ] }
        ] }
 * @param params
 * @param picker
 * @constructor
 */
FLOW.NavPanel = function( params, picker ) {
    FLOW.EventUtils.Observable.call(this);
    this.picker = picker;
    if (!params) {params={}}
    this.params = params;

    params.position = params.position || {x:0, y:-0.3, z:-0.1};
    params.buttonSpacing = params.buttonSpacing || 0.3;

    params.buttonSize = params.buttonSize || 0.2;
    params.buttonYPosition = params.buttonYPosition || -0.3;

    params.backgroundWidth = params.backgroundWidth || 2;
    params.backgroundHeight = params.backgroundHeight || 0.2;
    params.buttonVerticalSpacing = params.buttonVerticalSpacing|| 0.3;

    params.labelParams = params.labelParams || {
        fontSize:0.05,
        color:"black",
        wrapType: FLOW.Text.WrapType.WRAP_BY_NUMBER_OF_CHARACTERS,
        wrapValue: 14,
        align: FLOW.Text.ALIGN_CENTER
    };

    this.navHierarchy = params.navHierarchy;

    this.object = new THREE.Object3D();
    this.object.name = "nav panel";

    this.optionsObject = new THREE.Object3D();
    this.optionsObject.name = "optionsPanel";
    this.object.add(this.optionsObject);

    this.selectionPanel = new THREE.Object3D();
    this.selectionPanel.name = "selectionsPanel";
    this.object.add(this.selectionPanel);



    //this.levelsSelected = ["globe", "where", "count"];
    this.levelsSelected = ["globe", "where"]; //TODO: parameterize

    var backgroundParams = params.backgroundParams || {color: 0xffff00, transparent: true, opacity: 0.5};
    this.background = this.createPlane({width:params.backgroundWidth, height:params.backgroundHeight, curvature:50,
        x:params.position.x, y:params.position.y, z:params.position.z, materialParams:backgroundParams});
    this.background.name="background";
    this.object.add(this.background);

    this.background.renderOrder = 0;
    this.expanded = false;

    params.buttonMaterial = params.buttonMaterial || {transparent: true};

    params.hasThirdLevel = false;
    params.buttonZ = params.buttonZ != undefined ? params.buttonZ : 0.1;

    //TODO: parameterize these root buttons
    this.rootButton  = {id:"root", title:"Global", subtitle:"", icon:params.rootButtonIcon,
        materialParams:params.buttonMaterial,
        onSelected: this.expandNavPanel, onCollisionFinished : this.hideNavPanel};
    var position = {x:params.position.x , y:params.position.y, z:params.buttonZ };
    this.createButton( this.rootButton, params, picker, 0, 0 , null, this.selectionPanel, position);
    this.rootButton.object.visible = true;

    this.level1Button  = {id:"level1", title:"Count", subtitle:"", icon: params.level1ButtonIcon,
        materialParams:params.buttonMaterial, noCollider:true
    };
    var position = {x:params.position.x +params.buttonSpacing, y:params.position.y , z:params.buttonZ };
    this.createButton( this.level1Button, params, picker, 0, 0 , null, this.selectionPanel, position);
    this.level1Button.object.visible = true;

    if (params.hasThirdLevel) {
        this.level2Button = {
            id: "level2", title: "Insight: Count", subtitle: "", icon: params.level2ButtonIcon,
            materialParams: params.buttonMaterial, noCollider: true
        };
        var position = {x: params.position.x, y: params.position.y + params.buttonVerticalSpacing * 2, z: params.buttonZ};
        this.createButton(this.level2Button, params, picker, 0, 0, null, this.selectionPanel, position);
        this.level2Button.object.visible = true;
    }
    var level =0;

    var buttonParams = {};
    Object.assign(buttonParams, params);
    buttonParams.labelParams = {};
    Object.assign(buttonParams.labelParams, params.labelParams);
    buttonParams.labelParams.color = "red";
    for (var i=0; i< this.navHierarchy.items.length; i++) {
        var button = this.navHierarchy.items[i];
        var position = {x: buttonParams.position.x ,
            y: buttonParams.buttonYPosition + (i+1) *buttonParams.buttonVerticalSpacing,
            z: buttonParams.buttonZ};
        this.createButton( button, buttonParams, picker, level, i , null, this.optionsObject, position);

    }

    this.object.visible = false;
};


FLOW.OOPUtils.prototypalInheritance(FLOW.NavPanel, FLOW.EventUtils.Observable);

FLOW.NavPanel.prototype.createButton = function( button, params, picker, level, index, parent, parentObject3D, position) {
    button.parent = parent; // builds a navigable hierarchy
    button.level = level;
    button.object = this.createPlane({
        width: params.buttonSize,
        height: params.buttonSize,
        x: position.x,
        y: position.y,
        z: position.z,
        materialParams: params.buttonMaterial,
        texture: button.icon
    });
    button.object.name = button.id;
    parentObject3D.add(button.object);
    button.object.visible = false;
    // button.object.renderOrder = 2;

    button.text = this.createLabel(button.title, params.labelParams,
        {x: 0.1, y:0 , z: 0.01});
    button.object.add(button.text);
   // button.text.visible = false;
    // button.text.renderOrder = 1;

    if (typeof button.noCollider == "undefined" || button.noCollider == true) {
        button.object.onSelected = function () {
            if (!button.object.visible) {
                return;
            }
            if (button.id != "root") {
                this.showHideLevels(button);
            }
            if (button.onSelected) {
                button.onSelected.bind(this)();
            }
        }.bind(this);

        //TODO: due to the Picker bug, these are never fired.
        if (button.onCollisionFinished) {
            button.object.onCollisionFinished = function () {
                if (!button.object.visible) {
                    return;
                }
                button.onCollisionFinished.bind(this)();
            }.bind(this);
        }
        picker.addColliders(button.object);
    }


    if (button.items) {
        for (var j = 0; j < button.items.length; j++) {
            var position = {x: params.position.x  + (level+1) * params.buttonSpacing, //params.position.x / 2 + j * -params.buttonSpacing,
                y: params.buttonYPosition + (j+1) * params.buttonVerticalSpacing,
                z: params.buttonZ != undefined ? params.buttonZ : 0};
            this.createButton( button.items[j], params, picker, level+1 , j, button, parentObject3D, position);
        }
    }
};

FLOW.NavPanel.prototype.expandNavPanel = function(){
    if (this.expanded) {return}
    this.expanded = true;
    //this.background.scale.setY(3);
    //this.background.position.setY(0);

    this.optionsObject.visible = true;

    var level0buttonSelected = null;
    for (var i=0; i< this.navHierarchy.items.length; i++){
        this.navHierarchy.items[i].object.visible = true;
        if ( this.levelsSelected[0] == this.navHierarchy.items[i].id){
            level0buttonSelected  = this.navHierarchy.items[i];
        }
    }
    
    this.showHideLevels(level0buttonSelected);

};


FLOW.NavPanel.prototype.hideNavPanel = function() {
    if (!this.expanded) {
        return
    }

};

FLOW.NavPanel.prototype.changeButtonText = function(button, newText){

    button.object.remove(button.text);

    button.text = this.createLabel(newText, this.params.labelParams, {x: 0.1, y:0 , z: 0.01} );
    button.object.add(button.text);
};


FLOW.NavPanel.prototype.showHideLevels = function(button){

    this.levelsSelected[button.level] = button.id;
    if (button.level == 0){
        this.changeButtonText(this.rootButton, button.title)
        if (button.items) {
            this.levelsSelected[1] = button.items[0].id; //defaults to first item
            this.changeButtonText(this.level1Button,  button.items[0].title)

            if (this.params.hasThirdLevel && button.items[0].items) {
                this.levelsSelected[2] = button.items[0].items[0].id;
                this.changeButtonText(this.level2Button, "Insight: " + button.items[0].items[0].title)

            }
        }
    } else if (button.level == 1){
        this.changeButtonText(this.level1Button,  button.title)

        if (this.params.hasThirdLevel && button.items) {
            this.levelsSelected[2] = button.items[0].id; //defaults to first item
            this.changeButtonText(this.level2Button, "Insight: " + button.items[0].title)
        }
    } else if ( this.params.hasThirdLevel && button.level == 2) {
        this.changeButtonText(this.level2Button, "Insight: " + button.title)
    }

    for (var k=0; k< this.navHierarchy.items.length; k++) {
    //Sets all the items visibility to false unless the item is selected at the approriate level
        if (this.navHierarchy.items[k].items){
            for (var i = 0; i < this.navHierarchy.items[k].items.length; i++) {
                this.navHierarchy.items[k].items[i].object.visible =
                        (this.navHierarchy.items[k].items[i].id == this.levelsSelected[1] ||
                         this.navHierarchy.items[k].items[i].parent.id == this.levelsSelected[0]);
                if (this.params.hasThirdLevel && this.navHierarchy.items[k].items[i].items){
                    for (var j = 0; j < this.navHierarchy.items[k].items[i].items.length; j++) {
                        this.navHierarchy.items[k].items[i].items[j].object.visible =
                            (this.navHierarchy.items[k].items[i].items[j].id == this.levelsSelected[2]||
                             this.navHierarchy.items[k].items[i].items[j].parent.id == this.levelsSelected[1]);
                    }
                }
            }
        }
    }

    //Sets values for the top levels:

};

FLOW.NavPanel.prototype.createPlane = function(params) {
    //params:width, height, x, y, z, material, texture
    var params = params || {};
    var materialParams = params.materialParams || {color: 0x4A483C, transparent: true, opacity: 0.5};
    params.curvature = params.curvature != undefined ? params.curvature : 0;

    var segments = params.curvature ? 20 : 1;

    var geometry = new THREE.PlaneGeometry(params.width || 0.1, params.height || 0.1, segments, 1);
    if (params.curvature){
        FLOW.MathUtils.curve(geometry, segments, 1, params.curvature);

    }
    var material = new THREE.MeshBasicMaterial(materialParams);
    var plane = new THREE.Mesh(geometry, material);

    if (params.texture) {
        var loader = new THREE.TextureLoader();
        plane.material.map = loader.load(params.texture);
    }
    plane.position.x = params.hasOwnProperty("x") ? params.x : 0;
    plane.position.y = params.hasOwnProperty("y") ? params.y : 0;
    plane.position.z = params.hasOwnProperty("z") ? params.z : 0;
    plane.width = params.width || 0.1;
    plane.height = params.height || 0.1;
    return plane;
};

FLOW.NavPanel.prototype.createLabel = function(text, params, position) {
    var labelParams = {
        text: text,
        font: "Open Sans",
        fontSize: params.fontSize || 0.45,
        hAlign: params.hAlign != undefined ? params.hAlign : FLOW.Text.ALIGN_CENTER,
        opacity: params.opacity || 1.0,
        color: params.color || "white",
        wrapType: params.wrapType || FLOW.Text.WrapType.WRAP_BY_NUMBER_OF_CHARACTERS,
        wrapValue: params.wrapValue || 12,
        align: params.hRegisterTo || FLOW.Text.ALIGN_CENTER
    };

    var labelText = new FLOW.Text.Text(labelParams);
    labelText.id = text;
    labelText.mesh = labelText.buildMesh();
    labelText.mesh.name = text;
    labelText.mesh.frustumCulled = false;
    labelText.mesh.material.depthWrite = true;
    labelText.mesh.material.depthTest = true;
    //labelText.mesh.track();

    position = position || {x:0,y:0,z:0};

    var labelObject = new THREE.Object3D();
    labelObject.position.set(position.x, position.y, position.z);
    labelObject.add(labelText.mesh);

    return labelObject;
};

FLOW.NavPanel.prototype.update = function() {
   /* var progress = this.media.getTime() / this.media.getDuration();
    if (progress > 0) {
        this.progressbar.scale.x = progress;
        this.progressbar.position.x = this.timebar.position.x - this.timebar.width * 0.5 + progress * this.timebar.width * 0.5;
    }

    var volume = this.media.getVolume()
    this.volumeLevel.scale.y = volume;
    if (volume == 0) {
        this.volumeLevel.visible = false;
    } else if (volume && !this.volumeLevel.visible) {
        this.volumeLevel.visible = true;
    }

    if (volume == 0 && !this.media.isMute) {
        this.media.volumeBeforeMute = 1.0;
        this.media.isMute = true;
        this.muteButtonPressed();
    } else if (volume != 0 && this.media.isMute) {
        this.muteButtonPressed();
        this.media.isMute = false;
    }
    this.volumeLevel.position.y = this.volumeDown.position.y - this.volumeDown.height * 0.5 + this.volumeDown.height * volume*/
};

FLOW.NavPanel.prototype.panel = function() {
    return this.object;
};

FLOW.NavPanel.prototype.show = function() {
    this.object.visible = true;
};

FLOW.NavPanel.prototype.hide = function() {
    this.expanded = false;
   /* this.background.scale.setX(1);
    this.background.position.setX(0.6);*/
    this.object.visible = false;

    this.optionsObject.visible = false;
};

FLOW.NavPanel.prototype.muteButtonPressed = function() {
    var loader = new THREE.TextureLoader();
    if (ismute) {
        this.mute.material.map = loader.load("../../flow-resources/graphics/flow-control-panel/Icon-Volume.png");
    } else {
        this.mute.material.map = loader.load("../../flow-resources/graphics/flow-control-panel/Icon-VolumeMute.png");
    }
    ismute = !ismute;
};

FLOW.NavPanel.prototype.playButtonPressed = function() {
    var loader = new THREE.TextureLoader();
    if (playing) {
        this.play.material.map = loader.load("../../flow-resources/graphics/flow-control-panel/Icon-Pause.png");
    } else {
        this.play.material.map = loader.load("../../flow-resources/graphics/flow-control-panel/Icon-Play.png");
    }
    playing = !playing;
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.NavPanel;
}));
