var THREE = THREE || require('three');

var FLOW = FLOW || {};
FLOW.Text = FLOW.Text || require('flow-text');
FLOW.Color = FLOW.Color || require('flow-color-utils');
FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.Lines = FLOW.Lines || require('flow-lines')

FLOW.Ui = {};

FLOW.Ui.OptionSelect = function (params) {
    /* size params */
    params.borderThickness = params.borderThickness || 0.008;
    params.offset = params.offset + params.borderThickness / 2|| params.borderThickness / 2;
    params.padding = params.padding || 0.02;
    params.buttonWidth = params.width || 0.1;
    params.buttonHeight = params.height || 0.05;

    /* text params */
    params.font = params.font || "Open Sans";
    params.fontSize = params.fontSize || 0.02;

    /* color params */
    params.backgroundOpacity =  params.backgroundOpacity || 1;
    this.usualBackgroundColor = params.backgroundColor || "#8d95a4";
    this.selectedBackgroundColor = params.selectedBackgroundColor || "#1e4b8e";
    this.hoveredBackgroundColor = params.hoveredBackgroundColor || "#018bce";
    this.selectedLabelColor = params.selectedLabelColor || "#2765ae";
    this.usualLabelColor = params.usualLabelColor || "#000000";
    this.hoveredLabelColor = params.hoveredLabelColor || "#14bae7";
    this.usualBorderColor = params.usualBorderColor || "#989ea4";
    this.hoveredBorderColor = params.hoveredBorderColor || "#20c2eb";
    this.selectedBorderColor =  params.selectedBorderColor || "#2368b1";

    this.navHierarchy = params.navHierarchy;
    this.picker = params.picker;

    this.root = {};
    this.root.children = [];
    this.rootObject = new THREE.Object3D();

    this.longWaitTime = params.waitTime || params.longWaitTime || 3000;
    this.shortWaitTime = params.waitTime || params.shortWaitTime || 1500;

    this._createLabels({ font: params.font, fontSize: params.fontSize, color: this.usualLabelColor, wrapType: params.wrapType, wrapValue: params.wrapValue });
    var sizes = this._computeSizes({ buttonWidth: params.buttonWidth, buttonHeight: params.buttonHeight, padding: params.padding });
    sizes.offset = params.offset;

    /* create root button */
    var rootBackgroundParams = {
        backgroundColor: this.usualBackgroundColor,
        opacity: params.backgroundOpacity,
        width: sizes.buttonWidth,
        height: sizes.buttonHeight,
    };
    var rootBorderParams = {
        color: this.usualBorderColor,
        borderThickness: params.borderThickness,
        visible: true
    };
    var rootLabelParams = {};
    Object.assign(rootLabelParams, this.root.children[0].label.params);
    var rootLabel = new FLOW.Ui.Label(rootLabelParams);
    this.root.button = this.createRootButton(rootBackgroundParams, rootBorderParams, rootLabel, params.rootGeometry);

    /* create children buttons */
    // TODO: split params
    this.loadLayeredButtons(params.navHierarchy.items, {
        backgroundColor: this.usualBackgroundColor,
        borderColor: this.usualBorderColor,
        borderThickness: params.borderThickness,
        offset: params.offset,
        opacity: params.backgroundOpacity,
        width: sizes.buttonWidth,
        height: sizes.buttonHeight,
        isBorderVisible: true
    });

    /* set last selected button to the first button in navHierarchy */
    /* TODO: add parameter for choosing root button */
    this.updateButton(this.root.children[0], {color: this.selectedBackgroundColor}, {color: this.selectedLabelColor}, {color: this.selectedBorderColor});
    this.lastSelection = this.root.children[0].object;

    this._setObjects(this.root.button.object, this.root.children, sizes);

    return this;
};

FLOW.Ui.OptionSelect.prototype.createRootButton = function (backgroundParams, borderParams, label, geometry) {
    var object;
    if (!geometry) {
        object = new FLOW.Ui.Button(backgroundParams, borderParams, label.labelText);
    }
    else {
        var geometry = geometry;
        var material = new THREE.MeshBasicMaterial({ color: backgroundParams.backgroundColor, transparent: true, opacity: backgroundParams.opacity});
        var object = new THREE.Mesh(geometry, material);

        var lines = new FLOW.Lines.Lines();
        var line = new FLOW.Lines.Line();

        if (!(borderParams.color instanceof THREE.Color))
            borderParams.color = new THREE.Color(borderParams.color);

        line.setColor(borderParams.color);
        line.setWidth(borderParams.borderThickness);

        for (var i in geometry.vertices) {
            line.addPoint(geometry.vertices[i]);
        }
        line.addPoint(geometry.vertices[0]);

        lines.addLine(line);
        lines.buildMesh();
        lines.getMesh().visible = borderParams.visible ? borderParams.visible : false;
        lines.getMesh().position.set(0, 0, 0.001);

        lines.line = line;
        object.add(lines.getMesh());
        object.line = lines;
        object.add(label.labelText.buildMesh());
    }
    var button = {};
    button.object = object;
    button.label = label;

    button.object.onSelected = function () {
        this.selected = false;
        for (var button of this.root.children) {
            var collider = this.picker.getColliderFromObject(button.object);
            collider.waitTime = this.longWaitTime;
        }

        collider = this.picker.getColliderFromObject(this.root.button.object);
        collider.waitTime = this.longWaitTime;

        this.expand();
    }.bind(this);

    button.object.onCollisionFinished = function () {
        if (this.selected) {
            var collider = this.picker.getColliderFromObject(button.object);
            collider.waitTime = this.shortWaitTime;
        }
    }.bind(this);
    return button;
};

FLOW.Ui.OptionSelect.prototype._setObjects = function (rootButton, children, sizes) {
    this.rootObject.add(rootButton);
    var y = - (children.length - 1) * (sizes.buttonHeight / 2);
    for (var i in children) {
        children[i].object.position.set(0, y, 0.001);
        this.rootObject.add(children[i].object);
        y += sizes.buttonHeight + sizes.offset;
    }
};

FLOW.Ui.OptionSelect.prototype._createLabels = function (params) {
    for (var i in this.navHierarchy.items) {
        var textParams = {};
        textParams.text = this.navHierarchy.items[i].title;
        Object.assign(textParams, params);

        var button = {};
        button.label = new FLOW.Ui.Label(textParams);
        this.root.children.push(button);
    }
};

FLOW.Ui.OptionSelect.prototype._computeSizes = function (params) {
    for (var i in this.root.children) {
        var button = this.root.children[i];

        if (button.label.width + params.padding * 2 > params.buttonWidth)
            params.buttonWidth = button.label.width + params.padding * 2;
        if (button.label.height + params.padding * 2 > params.buttonHeight)
            params.buttonHeight = button.label.height + params.padding * 2;
    }
    return { buttonWidth: params.buttonWidth, buttonHeight: params.buttonHeight };
};

FLOW.Ui.OptionSelect.prototype.loadLayeredButtons = function (items, params) {
    var offset = params.offset + params.height;

    for (var i=0; i < items.length; i++) {

        var backgroundParams = {
            width: params.width,
            height: params.height,
            backgroundColor: params.backgroundColor,
            transparent: true,
            opacity: params.opacity
        };

        var borderParams = {
            color: params.borderColor,
            borderThickness: params.borderThickness,
            visible: params.isBorderVisible
        };
        var onSelected = items[i].onSelected;

        var button = this.createButton(backgroundParams, borderParams, this.root.children[i].label, onSelected);

        button.object.visible = false;
        Object.assign(this.root.children[i], button);
    };
};

FLOW.Ui.OptionSelect.prototype.createButton = function (backgroundParams, borderParams, label, onSelected) {
    var obj = new FLOW.Ui.Button(backgroundParams, borderParams, label.labelText);
    var button = {};
    button.object = obj;
    button.onSelected = onSelected;
    button.label = label;

    button.object.onCollisionStarted = function () {
        this.updateButton(button, {color: this.hoveredBackgroundColor}, {color: this.hoveredLabelColor}, {color: this.hoveredBorderColor});
    }.bind(this);

    button.object.onSelected = function (intersection) {
        if (!button.isRoot) {
            this.selectItem(button);
            button.onSelected();
        }
    }.bind(this);

    button.object.onCollisionFinished = function () {
        if (this.lastSelection == button.object)
            this.updateButton(button, {color: this.selectedBackgroundColor}, {color: this.selectedLabelColor}, {color: this.selectedBorderColor});
        else
            this.updateButton(button, {color: this.usualBackgroundColor}, {color: this.usualLabelColor}, {color: this.usualBorderColor});
        for (var b of this.root.children) {
            var collider = this.picker.getColliderFromObject(b.object);
            collider.waitTime = this.shortWaitTime;
        }
        this.delayReSelection();
    }.bind(this);

    this.picker.addColliders(button.object);

    return button;
};

FLOW.Ui.OptionSelect.prototype.expand = function () {
    for(var i in this.root.children) {
        var item = this.root.children[i];
        item.object.visible = true;
    }
    this.root.button.object.visible = false;
    this.root.button.label.labelText.mesh.visible = false;
};

FLOW.Ui.OptionSelect.prototype.hide = function () {
    for(var i in this.root.children) {
        var item = this.root.children[i];
        item.object.visible = false;
    }
    this.root.button.object.visible = true;
    this.root.button.label.labelText.mesh.visible = true;
};

FLOW.Ui.OptionSelect.prototype.selectItem = function (button) {
    if(!(this.lastSelection == button.object)) {
        this.updateButton(this.root.button, {color: this.usualBackgroundColor}, {color: this.usualLabelColor, text: button.label.params.text}, {color: this.usualBorderColor});
    };

    for(var i in this.root.children) {
        var item = this.root.children[i];
        if (item.object == button.object) {
            this.updateButton(item, {color: this.selectedBackgroundColor}, {color: this.selectedLabelColor}, {color: this.selectedBorderColor });
        }
        else {
            this.updateButton(item, {color: this.usualBackgroundColor}, {color: this.usualLabelColor}, {color: this.usualBorderColor });
        }
        item.object.visible = false;
    }
    this.root.button.object.visible = true;
    this.root.button.label.labelText.mesh.visible = true;

    this.lastSelection = button.object;
    this.selected = true;
};

FLOW.Ui.OptionSelect.prototype.updateButton  = function (button, backgroundParams, labelParams, borderParams) {
    /* TODO: add border and opacity updating */
    button.object.material.color = new THREE.Color(backgroundParams.color);

    button.object.remove(button.label.labelText.mesh);
    button.label.params.color = labelParams.color;
    button.label.params.text = labelParams.text || button.label.params.text;
    button.label = new FLOW.Ui.Label(button.label.params);
    button.object.add(button.label.labelText.mesh);

    button.object.line.line.setColor(new THREE.Color(borderParams.color));
    button.object.line.buildMesh();
};

FLOW.Ui.OptionSelect.prototype.delayReSelection = function() {
    var collider = this.picker.getColliderFromObject(this.root.button.object);
    if (collider) {
        setTimeout(function () {
            var collider = this.picker.getColliderFromObject(this.root.button.object);
            if (collider) {
                this.selected = false;
                collider.waitTime = this.shortWaitTime;
            }
        }.bind(this), 10000);
    }
};

/* *************************************** */

FLOW.Ui.Label = function (textParams) {
    var labelText = new FLOW.Text.Text(textParams);
    labelText.mesh = labelText.buildMesh();
    labelText.mesh.position.z = 0.001;

    var boundingBox = labelText.getBoundingBox();

    return {
        labelText: labelText,
        width: boundingBox.getMax().x - boundingBox.getMin().x,
        height: boundingBox.getMax().y - boundingBox.getMin().y,
        params: textParams
    }
};
/* *************************************** */

FLOW.Ui.Button = function (buttonBackgroundParams, borderParams, textParams) {
    buttonBackgroundParams = buttonBackgroundParams || {};
    buttonBackgroundParams.backgroundColor = buttonBackgroundParams.backgroundColor || "#8d95a4";
    buttonBackgroundParams.opacity = buttonBackgroundParams.opacity || 0.8;
    buttonBackgroundParams.width = buttonBackgroundParams.width || 1;
    buttonBackgroundParams.height = buttonBackgroundParams.height || 0.5;
    var button = this._createButtonBackground(buttonBackgroundParams);

    borderParams = borderParams || {};
    borderParams.color = borderParams.color || 0xffffff;
    borderParams.borderThickness = borderParams.borderThickness || 0.008;

    var line = this._createBorder(borderParams, button.geometry);

    if (textParams && textParams.mesh) {
        textParams.mesh.position.set(0, 0, 0.01);
        button.add(textParams.mesh);
    }
    button.add(line.getMesh());
    button.line = line;
    button.width = buttonBackgroundParams.width;
    button.height = buttonBackgroundParams.height;

    return button;
};

FLOW.Ui.Button.prototype._createButtonBackground = function (backgroundParams) {
    if (!(backgroundParams.color instanceof THREE.Color))
        backgroundParams.backgroundColor = new THREE.Color(backgroundParams.backgroundColor);

    var geometry = new THREE.PlaneGeometry(backgroundParams.width, backgroundParams.height);
    var material = new THREE.MeshBasicMaterial({color: backgroundParams.backgroundColor, transparent: true, opacity: backgroundParams.opacity});
    if (backgroundParams.icon) {
        let loader = new THREE.TextureLoader();
        material.map = loader.load(backgroundParams.icon);
    }
    var mesh = new THREE.Mesh(geometry, material);

    return mesh;
};

FLOW.Ui.Button.prototype._createBorder = function (borderParams, geometry) {
    var lines = new FLOW.Lines.Lines();
    var line = new FLOW.Lines.Line();

    if (!(borderParams.color instanceof THREE.Color))
        borderParams.color = new THREE.Color(borderParams.color);

    line.setColor(borderParams.color);
    line.setWidth(borderParams.borderThickness);

    line.addPoint(geometry.vertices[0]); line.addPoint(geometry.vertices[1]);
    line.addPoint(geometry.vertices[3]); line.addPoint(geometry.vertices[2]);
    line.addPoint(geometry.vertices[0]);

    lines.addLine(line);
    lines.buildMesh();
    lines.getMesh().visible = borderParams.visible ? borderParams.visible : false;
    lines.getMesh().position.set(0, 0, 0.01);

    lines.line = line;
    return lines;
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Ui;
}));
