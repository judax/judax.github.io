var THREE = THREE || require('three');

var FLOW = FLOW || {};
FLOW.Text = FLOW.Text || require('flow-text');
FLOW.Color = FLOW.Color || require('flow-color-utils');
FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');

FLOW.Belt = function( params ) {
    if(!params) {
        return this;
    }
    if (!params.picker)
        throw "FLOW.Belt picker was not found";
    this.camera = params.camera;
    this.params = params;
    this.picker = params.picker;
    this.object = new THREE.Object3D();
    this.object.visible = false;

    this.radius = params.radius || 5;
    this.height = params.height || 1;
    if(params.angle <= 0) {
        throw "FLOW.Belt params.angle shold be positive";
    }
    this.angle = params.angle || Math.PI/2.5;
    this.totalSegments = params.totalSegments || 8;
    this.segment = this.angle / this.totalSegments;
    this.gap = params.gap || 0;
    this.tilt  = params.tilt || Math.PI/6;
    this.start = params.start;
    this.currentStart = this.start;
    this.startAngle = (2*Math.PI - this.angle)/2;

    this.panels = [];
    this.expanded = null;

    if(params.colorWheelScheme) {
        this.colorWheel = new FLOW.Color.ColorWheel(params.colorWheelScheme);
    }

    this.upAxis = new THREE.Vector3(0,1,0);
    this.upAxis.applyAxisAngle(new THREE.Vector3(1,0,0), this.tilt)
    this.object.rotation.set(-this.tilt, 0, 0);
    var angle = this.camera.rotation.y;
    this.object.rotateOnAxis(this.upAxis, angle);

    this.object.rotation.y += Math.PI/2

    this.rateOfChange = params.rateOfChange || 0.1;
    this.changing = false;
    this.progress = 1;

    this.lastActive = null;

    window.addEventListener("keypress", function(event) {

        if(event.code == "Space") {

            this.object.rotation.set(-params.tilt, 0, 0);
            var angle = this.camera.rotation.y;
            if(this.camera.getWorldDirection().z > 0) {
                angle = Math.PI - angle;
            }
            this.object.rotateOnAxis(this.upAxis, angle);
        }

        else {
            var index =  this.panels.length - (+event.key);
            if(isNaN(index)) {
                return;
            }
            this.activate(index);
        }

    }.bind(this));

    return this;
};

FLOW.Belt.prototype.createPanel = function (length, backgroundParams, buttons) {
     var background = this.createBackground(length, backgroundParams);

     buttons.forEach(function(buttonParams) {
         background.addButton(buttonParams);
     });
     return background;
};

FLOW.Belt.prototype.createButton = function (params, panel) {

    if( typeof params.height === "undefined" ) {
        params.height = this.height;
    }

    if( typeof params.yOffset === "undefined" ) {
        params.yOffset = 0;
    }

    params.color = params.color || "#ffffff";
    params.opacity = ( typeof params.opacity === "undefined" ) ? 1 : params.opacity;
    params.radius = params.radius || this.radius*0.98;
    params.rotation = Math.asin(params.yOffset / this.radius);

    var button = new Button( panel, params );

    if( typeof params.onSelected == "function" ) {
        button.object.onSelected = params.onSelected;
        if(params.repeat) {
            button.object.repeatTime = params.repeat;
        }
        this.picker.addColliders(button.object);
    }

    return button;
};

FLOW.Belt.prototype.createBackground = function (length, params) {
    if (!params)
        params = {};
    params.length = length;

    var panel = new Panel(this, params);

    params.selectable = (typeof params.selectable !== "undefined") ? params.selectable : true;
    if(params.selectable) {
        panel.object.background.onSelected = function() {
            this.parent.activate(this.index);
        }.bind(panel);
        this.picker.addColliders(panel.object.background);
    }

    this.panels.push(panel);
    return panel;
};

FLOW.Belt.prototype.show = function() {
    this.dir = this.camera.getWorldDirection();
    this.object.visible = true;
    this.object.position.set(0, 0, 0);
};

FLOW.Belt.prototype.hide = function() {
    this.object.visible = false;
    for (var i in this.panels) {
        if (this.panels[i].activated)
            this.panels[i].deactivate();
    }
};

FLOW.Belt.prototype.activate = function(index, instant) {
    if(index == this.lastActive) {
        return;
    }

    var panel = this.panels[index];
    if( this.panels[index].expandable ) {
        for(var i in this.panels) {
            var item  = this.panels[i];
            if(item.activated) {
                item.deactivate();
            }
        }

        if(this.lastActive !== null) {
            var lastPanel = this.panels[this.lastActive];
            lastPanel.retract();
            lastPanel.showExtended(false);
            lastPanel.showNormal(true);
        }

        panel.expand();
        this.lastActive = index;

        if(instant) {
            this.progress = 1;
            this.update(true);
        } else {
            if(this.changing != true) {
                this.changing = true;
                this.progress = 0;
            } else {
                this.progress = 1 - this.progress;
            } 
        }
        
    } else {
        if( panel.activated ) {
            panel.deactivate()
        } else {
            panel.activate()
        }

    }
};

FLOW.Belt.prototype.update = function (force) {
    if(this.lastActive === null && this.panels.some((panel)=>panel.expandable)) {
        console.warn("FLOW.Belt none of the expandable panels are activated. Use panel.activate(index, true) after the panel has been created")
    }

    if(this.changing && this.progress < 1) {
        this.progress += this.rateOfChange;
        if(this.progress > 1) {
            this.progress = 1;
            if(this.panels[this.lastActive].expanding) {
                this.panels[this.lastActive].showNormal(false);
                this.panels[this.lastActive].showExtended(true);
            }
        }
    } else {
        this.changing = false;
    }

    var currentStartAngle = this.startAngle;

    if(this.changing || force) {
        for(var i in this.panels) {
            var item  = this.panels[i]
            item.start = currentStartAngle;
            if(item.expanding) {
                item.currentLength = item.length + (item.length_full - item.length)*this.progress
            } else if(item.retracting) {
                item.currentLength = item.length_full - (item.length_full - item.length)*this.progress
            } else {
                item.currentLength = item.length;
            }
            currentStartAngle += item.currentLength;
            item.update();
        }

        if(this.progress == 1) {
            for(var i in this.panels) {
                var item  = this.panels[i];
                item.expanding = false;
                item.retracting = false;
            }
        }
    }
};

class Panel { 
    constructor(root, params) { 
         
        var object = new THREE.Object3D(); 
        var geometry = new THREE.CylinderGeometry(  root.radius,  root.radius,  root.height, 20, 1, true,  root.currentStart, params.length);
     
        if( root.colorWheel && !params.color) { 
            var color = FLOW.Color.nextColor( root.colorWheel); 
        } else 
            var color = params.color; 
        params.opacity = params.opacity || 0; 
        var material = new THREE.MeshBasicMaterial({ 
            color: color, 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: params.opacity 
        });
     
        root.currentStart += params.length;
     
        object.background = new THREE.Mesh( geometry, material ); 
        object.add( object.background ); 
        root.object.add(object);
     
        this.object = object; 
        this.root = root; 
        this.index = root.panels.length; 
        this.parent = root; 
        this.start = root.currentStart; 
        this.length = params.length; 
        this.length_full = params.length_full; 
        this.expandable = params.expandable; 
        this.expanding = false; 
        this.retracting = false; 
        this.currentLength = 0; 
        this.start = root.gap; 
        this.gap = root.gap; 
        this.radius = root.radius; 
        this.height = root.height; 
        this.normalItems = []; 
        this.extendedItems = []; 
    }
     
    expand () { 
        if(this.expandable) { 
            this.expanding = true; 
            this.retracting = false; 
        } 
    } 
     
    retract () { 
        if(this.expandable) { 
            this.expanding = false; 
            this.retracting = true; 
        } 
    }
     
    update () { 
        var geometry = new THREE.CylinderGeometry( this.radius, this.radius, this.height, 20, 1, true, this.start, this.currentLength); 
        this.object.background.geometry = geometry; 
        this.object.background.geometry.computeBoundingSphere();
     
        for(var i in this.normalItems) { 
            var item = this.normalItems[i] 
            item.update(this.start + this.currentLength) 
        }
     
        for(var i in this.extendedItems) { 
            var item = this.extendedItems[i] 
            item.update(this.start  + this.currentLength) 
        }
     
        if (this.label) 
            this.label.lookAt(this.object.position) 
    }
     
    showNormal (show) { 
        this.showItems(this.normalItems, show); 
    }
     
    showExtended (show) { 
        this.showItems(this.extendedItems, show); 
    }
 
    showItems (items, show) { 
        for(var i in items) { 
            var item = items[i]; 
            if(!item.params.keepVisibility && !item.params.neverHide) { 
                item.object.visible = show; 
            } else if(item.params.keepVisibility){ 
                if(!show) { 
                    item.object.priorVisibility = item.object.visible; 
                    item.object.visible = false; 
                } else if(item.object.priorVisibility){ 
                    item.object.visible = item.object.priorVisibility; 
                } 
            } 
        } 
    }
 
    activate () { 
        this.showExtended(true); 
        this.showNormal(false); 
        this.activated = true; 
    }
     
    deactivate () { 
        this.showExtended(false); 
        this.showNormal(true); 
        this.activated = false; 
    }
     
    addButton (params) { 
        var button = this.parent.createButton(params, this); 
        this.object.add(button.object); 
        if (params.normalButton) 
            this.normalItems.push(button); 
        else 
            this.extendedItems.push(button); 
        return button; 
    }
     
    addExtendedButton (params, parentParams) { 
        var button = this.parent.createButton(params, this); 
        this.object.add(button.object); 
        this.extendedItems.push(button); 
        return button; 
    }
     
    findButton ( name ) { 
        for(let button of this.normalItems) { 
            if( button.params.name == name ) { 
                return button; 
            } 
        }
     
        for(let button of this.extendedItems) { 
            if( button.params.name == name ) { 
                return button; 
            } 
        } 
        return null; 
    }
}

class Button {
    constructor ( panel, params) {

        var geometry = new THREE.CylinderGeometry( params.radius, params.radius, params.height, 20, 1, true, params.start, params.length);
        var material = new THREE.MeshBasicMaterial({color: params.color, side: THREE.DoubleSide, transparent: true, opacity: params.opacity});

        this.object = new THREE.Mesh( geometry, material );
        this.object.position.y = params.yOffset;
        this.object.renderOrder = 1;

        this.object.params = {};
        Object.assign(this.object.params, params);

        this.params = params;
        this.texture = params.texture;
        this.active = false;
        this.panel = panel;

        this.object.item = this;

        if(params.texture) {
            this.updateTexture(params.texture);
        }

        if(params.label) {
            params.label.fontSize = params.label.fontSize|| this.params.fontSize || this.height/5
            this.updateLabel(params.label);
        }
    }
     
    updateTexture(texture) { 

        if( typeof texture === "undefined" ) { 
            throw "FLOW.Belt button.updateTexture parameter is missing"; 
        }
     
        if( typeof texture === "string" ) { 
            texture = { location: [texture] } 
        }
     
        if( typeof texture.location === "string" ) { 
            texture.location = [texture.location]; 
        }
     
        if(!texture.offset) { 
            texture.offset = [0, 0]; 
        } else  { 
            if(!Array.isArray(texture.offset) || texture.offset.length != 2) { 
                throw "FLOW.Belt button.updateTexture offset is not an array of two" 
            } 
        }
     
        if(!texture.scale || !Array.isArray(texture.scale) || texture.scale.length != 2 ) { 
            texture.scale = [1,1]; 
        } else { 
            if(!Array.isArray(texture.offset) || texture.offset.length != 2) { 
                throw "FLOW.Belt button.updateTexture scale is not an array of two" 
            } 
        }
     
        var loader = new THREE.TextureLoader(); 
        this.object.material.map = loader.load(texture.location[0]);
     
        if(!texture.flip) { 
            this.object.material.map.repeat.x = -1; 
            this.object.material.map.offset.x = 1; 
        }
     
        this.object.material.map.offset.x += texture.offset[0]; 
        this.object.material.map.offset.y += texture.offset[1];
     
        this.object.material.map.repeat.x *= texture.scale[0]; 
        this.object.material.map.repeat.y *= texture.scale[1];
    }
     
    updateLabel(label) { 

        if(this.object.labelObject) { 
            this.object.remove(this.object.labelObject); 
            this.object.labelObject = null; 
        }
     
        var labelParams = { 
            text: label.text, 
            font: "Open Sans", 
            fontSize: label.fontSize, 
            hAlign: label.hAlign != undefined ? label.hAlign : FLOW.Text.ALIGN_CENTER, 
            opacity: label.opacity || 1.0, 
            color: label.color || "white", 
            wrapType: label.wrapType || FLOW.Text.WrapType.WRAP_BY_NUMBER_OF_CHARACTERS, 
            wrapValue: label.wrapValue || 20, 
            align: label.hRegisterTo || FLOW.Text.ALIGN_LEFT, 
            position: label.position 
        };
     
        var labelText = new FLOW.Text.Text(labelParams); 
        labelText.mesh = labelText.buildMesh(); 
        labelText.mesh.params = labelParams; 
        //FLOW.MathUtils.curve(labelText.mesh.geometry, 20, 1, radius); 
        this.object.add(labelText.mesh); 
        this.object.labelObject = labelText.mesh;
     
        if(this.object.geometry.boundingSphere) { 
            this.updateChildrenPosition(); 
        } 
    }
     
    update(start) { 
        var params = this.params; 
        var cylinderStart = start - this.params.length - this.params.start;  
        var geometry = new THREE.CylinderGeometry( params.radius, params.radius, params.height, 20, 1, true, start - this.params.length - this.params.start, this.params.length); 
        geometry.computeBoundingSphere(); 
        this.object.geometry = geometry; 
        if(!this.object.params.convertYOffsetToRotation) { 
            this.object.position.y = params.yOffset; 
        } else { 
            if(this.params.yOffset > this.params.radius) { 
                console.warn("yOffset is bigger than radius") 
            } 
            this.object.position.set(0,0,0) 
            // rotate not around x but around axis perpendicular to objects z 
            this.object.rotation.x = Math.asin(this.params.yOffset / this.params.radius) 
        }
     
        this.updateChildrenPosition(); 
    }
     
    updateChildrenPosition() { 
        var center = this.object.getWorldPosition(); 
        if(center.length() != 0 ) { 
            center.sub(this.panel.parent.camera.position); 
            center.negate(); 
        } 
        for(var i in this.object.children) { 
            var item  = this.object.children[i] 
            if(item.test) { 
                // works great for timeline but brakes everything else 
                item.position.set(0,0, -this.params.radius); 
                var angle = Math.PI - (this.panel.length_full + 2*this.panel.start)/2; 
                item.position.applyAxisAngle(new THREE.Vector3(0,1,0), -angle); 
                item.lookAt(center); 
                item.updateMatrix(); 
                continue; 
            }
     
            item.position.copy(this.object.geometry.boundingSphere.center); 
            if(item.params && item.params.position) { 
                item.position.add(item.params.position); 
            } 
            item.lookAt(center); 
            item.updateMatrix(); 
        } 
    }
}

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Belt;
}));
