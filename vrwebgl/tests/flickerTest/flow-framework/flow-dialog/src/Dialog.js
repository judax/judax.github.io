var THREE = THREE || require('three');

var FLOW = FLOW || {};

FLOW.Text = FLOW.Text || require('flow-text');
FLOW.Lines = FLOW.Lines || require('flow-lines');
FLOW.Textures = FLOW.Textures || require('flow-textures');
FLOW.Ui = FLOW.Ui || require('flow-ui');
FLOW.Picker = FLOW.Picker || require('flow-picker');

FLOW.Dialog = {};

Z_DIMENSION = 0.01;

FLOW.Dialog = function (params) {

    if (typeof(params) !== "object") throw "ERROR: No parameters provided.";
    if (!(params.picker instanceof FLOW.Picker)) throw "ERROR: No picker was found";
    if (params.isModal === false)
        if (!(typeof params.parentObject === "object"))
            throw "ERROR: need object for isModal parameter";
        else
        if (!(params.rootScene instanceof THREE.Object3D))
            throw "ERROR: need rootScene";

    /* size params */
    params.distance = params.distance || 5;
    params.backgroundWidth = params.backgroundWidth || 0;
    params.backgroundHeight = params.backgroundHeight || 0;
    params.buttonWidth = params.buttonWidth || 0;
    params.buttonHeight = params.buttonHeight || 0;
    params.margin = params.margin || 0.1;
    params.verticalAngle = (typeof params.verticalAngle == "undefined")? 0 : params.verticalAngle;

    /* text params */
    function isStringEmpty (string) {
        var regexp = /^[ ]*$/;
        return regexp.test(string);
    }
    params.dialogText = params.dialogText || "Sample text";
    params.okText = typeof (params.okText) == "undefined" ? "OK": params.okText;
    params.cancelButton = params.cancelButton || false;
    if (params.cancelButton) params.cancelText = typeof (params.cancelText) == "undefined" ? "CANCEL" : params.cancelText;
    params.font = params.font || "Open Sans";
    params.fontSize = params.fontSize || 0.1;
    params.fontColor = params.fontColor;
    params.wrapType = params.wrapType;
    params.wrapValue = params.wrapValue;

    /* icon params */
    params.okIcon = params.okIcon || null;
    if (params.cancelButton) params.cancelIcon = params.cancelIcon || null;

    /* color params */
    params.backgroundColor = params.backgroundColor || "#777fff";
    params.backgroundOpacity =  params.backgroundOpacity || 1;
    params.buttonBackgroundColor = params.buttonBackgroundColor || "#999999";
    params.useBackgroundImage = true;//typeof params.useBackgroundImage === "undefined" ? true : false;
    params.backgroundImage = params.backgroundImage || "./fadedEdgeBlackBkgd.png";
    params.borderColor = params.borderColor || "#cccccc";
    params.borderThickness = params.borderThickness || 0.02;

    /* action params */
    params.onOkSelected = typeof(params.onOkSelected) === "function" ? params.onOkSelected : false;
    params.onCancelSelected = typeof (params.onCancelSelected) === "function" ? params.onCancelSelected : false;

    this.camera = params.camera;
    this.rootScene = params.rootScene;
    this.parentObject = params.parentObject;
    this.isModal = params.isModal;
    this.picker = params.picker;
    this.okWaitTime = params.okWaitTime;
    this.cancelWaitTime = params.cancelWaitTime;
    this.okRepeatTime = params.okRepeatTime;
    this.cancelRepeatTime = params.cancelRepeatTime;
    this.onOkSelected = params.onOkSelected;
    this.onCancelSelected = params.onCancelSelected;
    this.buttons = [];

    /* root object */
    this.object = new THREE.Mesh();

    var dialogText;
    if (!isStringEmpty(params.dialogText)) {
        dialogText = this._createTextMessage({
            text: params.dialogText,
            font: params.font,
            fontSize: params.fontSize,
            color: params.fontColor,
            wrapType: params.wrapType,
            wrapValue: params.wrapValue
        });
    } else {
        dialogText = { width: 0, height: 0, textMesh: null };
    }
    var okText;
    if (!isStringEmpty(params.okText)) {
        var okText = this._createTextMessage({
            text: params.okText,
            font: params.font,
            fontSize: params.fontSize,
            color: params.fontColor
        });
    } else {
        okText = { width: 0, height: 0, textMesh: null }
    }
    var cancelText;
    if (params.cancelButton) {
        if (!isStringEmpty(params.cancelText)) {
            cancelText = this._createTextMessage({
                text: params.cancelText,
                font: params.font,
                fontSize: params.fontSize,
                color: params.fontColor
            });
        } else {
            cancelText = { width: 0, height: 0, textMesh: null }
        }
    }

    var sizes = this._computeSizes(
        {
            cancelButton: params.cancelButton,
            okText: okText,
            cancelText: cancelText,
            dialogText: dialogText
        },
        {
            width: params.backgroundWidth,
            height: params.backgroundHeight,
            buttonWidth: params.buttonWidth,
            buttonHeight: params.buttonHeight,
            margin: params.margin
        });
    this.sizes = sizes;

    var background = this._createBackground({
        useBackgroundImage: params.useBackgroundImage,
        backgroundImage: params.backgroundImage,
        color: params.backgroundColor,
        opacity: params.backgroundOpacity,
        width: sizes.width,
        height: sizes.height,
    });

    var okButton = new FLOW.Ui.Button (
        {
            width: sizes.buttonWidth,
            height: sizes.buttonHeight,
            borderColor: params.borderColor,
            backgroundColor: params.buttonBackgroundColor,
            opacity: params.backgroundOpacity,
            icon: params.okIcon },
        {
            color: new THREE.Color(params.borderColor),
            borderThickness: params.borderThickness },
        {
            mesh: okText.textMesh
        }
    );
    this.buttons.push(okButton);

    okButton.onCollisionStarted = function(){
        okButton.line.getMesh().visible = true;
    };

     okButton.onCollisionFinished = function() {
         okButton.line.getMesh().visible = false;
     };

     okButton.onSelected = function() {
        this.delayReSelection();

        setTimeout(function() {
            this.removeDialog();
            this.onOkSelected();
        }.bind(this), 500);
    }.bind(this);

    okButton.waitTime = this.okWaitTime;
    okButton.repeatTime = this.okRepeatTime;
    this.picker.addColliders(okButton);

    var cancelButton;
    if (params.cancelButton) {
        cancelButton = new FLOW.Ui.Button (
            {
                width: sizes.buttonWidth,
                height: sizes.buttonHeight,
                backgroundColor: params.buttonBackgroundColor,
                opacity: params.backgroundOpacity,
                cancelButton: params.cancelButton,
                icon: params.cancelIcon },
            {
                color: new THREE.Color(params.borderColor),
                borderThickness: params.borderThickness },
            {
                mesh: cancelText.textMesh
            }
        );
        this.buttons.push(cancelButton);

        cancelButton.onCollisionStarted = function(){
            cancelButton.line.getMesh().visible = true;
        };

        cancelButton.onCollisionFinished = function() {
            cancelButton.line.getMesh().visible = false;
        };

        cancelButton.waitTime = this.cancelWaitTime;
        cancelButton.repeatTime = this.repeatTime;
        cancelButton.onSelected = function() {
            cancelButton.line.getMesh().visible = true; //TODO: remove this when the above onCollisionStarted works correctly
            this.delayReSelection();
            setTimeout(function() {
                this.removeDialog();
                this.onCancelSelected();
            }.bind(this), 500);

        }.bind(this);
        this.picker.addColliders(cancelButton);
    }

    this._setObjects(
        {
            okButton: okButton,
            cancelButton: cancelButton,
            background: background,
            dialogText: dialogText},
        sizes);

    this._setPosition({ distance: params.distance, verticalAngle: params.verticalAngle });
    this.object.track();

    this.showCursorOnlyOnLookDown = this.picker.showCursorOnlyOnLookDown;
    this.picker.showCursorOnlyOnLookDown = false;
    this.picker.cursor.show();
};

FLOW.Dialog.prototype.setOnOkSelected = function(onOkSelected) {
    this.onOkSelected = typeof onOkSelected === "function" ? onOkSelected : false;
    return this;
};

FLOW.Dialog.prototype.setOnCancelSelected = function(onCancelSelected) {
    this.onCancelSelected = typeof onCancelSelected === "function" ? onCancelSelected : false;
    return this;
};

FLOW.Dialog.prototype.delayReSelection = function() {
    var collider = this.picker.getColliderFromObject(this.parentObject);
    if (collider) {
        collider.waitTime = 3000;
        setTimeout(function () {
            var collider = this.picker.getColliderFromObject(this.parentObject);
            if (collider) {
                collider.waitTime = 1000;
            }
        }.bind(this), 10000);
    }
};

FLOW.Dialog.prototype.removeDialog = function () {
    if (this.isModal === false) {
        this.parentObject.remove(this.object);
    } else
        this.parentObject.remove(this.object);

    this.picker.removeCollider(this.buttons[0]);
    if (this.buttons.length == 2) {
        this.picker.removeCollider(this.buttons[1]);
    }

    if (this.isModal === false) {
        /* unblock */
       // this.picker.addColliders(this.parentObject);
    }

    this.picker.showCursorOnlyOnLookDown = this.showCursorOnlyOnLookDown;
    if (this.picker.showCursorOnlyOnLookDown)
        this.picker.cursor.hide();
};

/* ------------------------------ */

FLOW.Dialog.prototype._createTextMessage = function(params) {
    var labelText = new FLOW.Text.Text(params);
    labelText.mesh = labelText.buildMesh();

    var boundingBox = labelText.getBoundingBox();

    return {
        textMesh: labelText.mesh,
        width: boundingBox.getMax().x - boundingBox.getMin().x,
        height: boundingBox.getMax().y - boundingBox.getMin().y
    };
};

FLOW.Dialog.prototype._computeSizes = function (params, defaultSizes) {
    var padding = params.okText.height / 2;
    var buttonHeight = Math.max(defaultSizes.buttonHeight, params.okText.height + padding * 2, params.cancelText ? params.cancelText.height + padding * 2 :0);
    var buttonWidth, dialogTextWidth, dialogTextHeight, width, height;
    var margin = defaultSizes.margin;

    if (params.dialogText.width != 0 && params.dialogText.height != 0) {
        dialogTextWidth = params.dialogText.width + padding * 2;
        dialogTextHeight = params.dialogText.height + padding * 2;
    } else {
        dialogTextHeight = 0;
        dialogTextWidth = 0;
    }

    if (params.cancelButton) {
        buttonWidth = Math.max(
            params.okText.width + padding * 2,
            params.cancelText.width + padding * 2,
            defaultSizes.buttonWidth
        );

        if (buttonWidth * 2 + defaultSizes.margin > dialogTextWidth)
            dialogTextWidth = buttonWidth * 2 + defaultSizes.margin;
    } else {
        buttonWidth = Math.max(params.okText.width + padding * 2, defaultSizes.buttonWidth);
        if (buttonWidth > dialogTextWidth)
            dialogTextWidth = buttonWidth;
    }

    width = Math.max(dialogTextWidth + margin * 2, defaultSizes.width);
    var margins = dialogTextHeight == 0 ? margin * 2 : margin * 3;
    height = Math.max(buttonHeight + dialogTextHeight + margins, defaultSizes.height);

    return {
        width: width,
        height: height,
        buttonHeight: buttonHeight,
        buttonWidth: buttonWidth,
        dialogTextWidth: dialogTextWidth,
        dialogTextHeight: dialogTextHeight,
        padding: padding,
        margin: margin
    };
};

FLOW.Dialog.prototype._createBackground = function (backgroundParams) {
    var geometry = new THREE.PlaneGeometry(backgroundParams.width, backgroundParams.height);
    var material = new THREE.MeshBasicMaterial({  transparent: true, opacity: backgroundParams.opacity});
    if (backgroundParams.useBackgroundImage) {
        if (! FLOW.Textures.getInstance().getTexture(backgroundParams.backgroundImage)) {
            material.opacity = 0;
            FLOW.Textures.getInstance().parseTextures(backgroundParams.backgroundImage, null, function () {
                material.map = FLOW.Textures.getInstance().getTexture(backgroundParams.backgroundImage).map;
                material.opacity = this.isModal ? 0.7 : 0.35;
                material.needsUpdate = true;
            }.bind(this));
        } else {
            material.map = FLOW.Textures.getInstance().getTexture(backgroundParams.backgroundImage).map;
            material.opacity = 0.35;
        }
    } else {
        material.color =  backgroundParams.color;
    }
    var background = new THREE.Mesh(geometry, material);

    return background;
};

 /* Moved to FLOW.Ui.Button

 FLOW.Dialog.prototype._createButton = function(buttonBackgroundParams, borderParams, textParams, onSelected) {
    var button = this._createButtonBackground(buttonBackgroundParams);
    var line = this._createBorder(borderParams, button.geometry);

    textParams.mesh.position.set(0, 0.03, 0.06);

    //TODO: Desired behavior is for the onCollisionStarted to highlight the line, and when the wait is exhausted, then the onSelected fires
    //TODO:   The bug is that if the onCollisionStarted is present, then the onSelected doesn't fire.
    //button.onCollisionStarted = function(){
    //    line.getMesh().visible = true;
    //};
    //button.onCollisionFinished = function() {
    //    line.getMesh().visible = false;
    //};
    button.onSelected = function() {
        line.getMesh().visible = true; //TODO: remove this when the above onCollisionStarted works correctly
        this.delayReSelection();
        onSelected();
        setTimeout(this.removeDialog.bind(this), 500);
    }.bind(this);

    button.add(textParams.mesh);
    button.add(line.getMesh());

    this.buttons.push(button);
    this.picker.addColliders(button);

    return button;
};

FLOW.Dialog.prototype._createButtonBackground = function (backgroundParams) {
    var geometry = new THREE.PlaneGeometry(backgroundParams.width, backgroundParams.height);
    var material = new THREE.MeshBasicMaterial({color: backgroundParams.backgroundColor, transparent: true, opacity: backgroundParams.opacity});
    var button = new THREE.Mesh(geometry, material);

    return button;
};

FLOW.Dialog.prototype._createBorder = function (borderParams, geometry) {
    var lines = new FLOW.Lines.Lines();
    var line = new FLOW.Lines.Line();

    line.setColor(borderParams.color);
    line.setWidth(borderParams.width);

    line.addPoint(geometry.vertices[0]); line.addPoint(geometry.vertices[1]);
    line.addPoint(geometry.vertices[3]); line.addPoint(geometry.vertices[2]);
    line.addPoint(geometry.vertices[0]);

    lines.addLine(line);
    lines.buildMesh();
    lines.getMesh().visible = false;
    lines.getMesh().position.set(0, 0, 0.03);

    return lines;
};*/

FLOW.Dialog.prototype._setPosition = function (params) {
    if (this.isModal === false){
        var position = this.parentObject.position.clone();

        if (this.camera.position.z >= this.parentObject.position.z) {
            params.distance = -params.distance;
        }

        /* set distance from parentObject */
        position.x *= params.distance/this.parentObject.position.length();
        position.y *= params.distance/this.parentObject.position.length();
        position.z *= params.distance/this.parentObject.position.length();

        this.object.position.copy(position);
        this.object.quaternion.copy(this.camera.quaternion);
        this.parentObject.add(this.object);
    } else {
        /* in front of the user */

        var position = this.camera.getWorldDirection();
        position.setLength(params.distance);
        if (params.verticalAngle) {
            position.applyAxisAngle(new THREE.Vector3(1, 0, 0), params.verticalAngle);//-Math.PI / 6)
        }

        this.object.position.copy(position);
        this.object.quaternion.copy(this.camera.quaternion);
        this.parentObject.add(this.object);
    }
};

FLOW.Dialog.prototype._setObjects = function(objects, sizes) {
    var x, y = 0, z;
    objects.background.position.set(0, 0, 0);
    this.object.add(objects.background);

    if (objects.dialogText.textMesh) {
        x = 0;
        y = sizes.height / 2 - sizes.margin - sizes.dialogTextHeight / 2;
        z = Z_DIMENSION + 0.01;
        objects.dialogText.textMesh.position.set(x, y, z);
        this.object.add(objects.dialogText.textMesh);
    }

    x = - sizes.buttonWidth / 2 - sizes.margin / 2;
    if (sizes.dialogTextHeight != 0)
        y = sizes.height / 2 - sizes.margin - sizes.dialogTextHeight - sizes.margin - sizes.buttonHeight / 2;
    else
        y = 0 ;
    z = Z_DIMENSION + 0.01;
    objects.okButton.position.set(x, y, z);
    this.object.add(objects.okButton);

    if (objects.cancelButton) {
        x = sizes.buttonWidth / 2 + sizes.margin / 2;
        if (sizes.dialogTextHeight != 0)
            y = sizes.height / 2 - sizes.margin - sizes.dialogTextHeight - sizes.margin - sizes.buttonHeight / 2;
        else
            y = 0;
        z = Z_DIMENSION + 0.01;
        objects.cancelButton.position.set(x, y, z);
        this.object.add(objects.cancelButton);
    }
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Dialog;
}));
