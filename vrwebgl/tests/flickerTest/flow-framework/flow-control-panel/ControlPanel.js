
var THREE = THREE || require('three');

var FLOW = FLOW || {};
FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.EventUtils = FLOW.EventUtils || require("flow-event-utils");

FLOW.ControlPanel = function(video, params) {
    FLOW.EventUtils.Observable.call(this);
    ismute = false;
    playing = false;

    this.object = new THREE.Object3D();

    var material = {color: 0x4A483C, transparent: true, opacity: 0.5};
    backgound = createPlane(1.5, 0.8, 0, -0.5, -0.1, material);
    this.object.add(backgound);

    material = {transparent: true};
    this.play = createPlane(0.2, 0.2, -0.5, -0.3, 0, material, "./graphics/flow-control-panel/Icon-Pause.png");
    this.object.add(this.play);

    material = {transparent: true};
    this.mute = createPlane(0.2, 0.2, 0.5, -0.3, 0, material, "./graphics/flow-control-panel/Icon-VolumeMute.png");
    this.object.add(this.mute);

    material = {color: 0x000000};
    this.timebar = createPlane(1.3, 0.2, 0, -0.7, 0, material);
    this.object.add(this.timebar);

    this.progressbar = createPlane(this.timebar.width, this.timebar.height, this.timebar.position.x - this.timebar.width * 0.5, -0.7, 0.01);
    this.progressbar.scale.x = 0.01;
    this.object.add(this.progressbar);

    material = {transparent: true};
    this.volumeUp = createPlane(0.1, 0.1, 0, -0.3, 0, material, "./graphics/flow-control-panel/Icon-VolumeUp.png");
    this.object.add(this.volumeUp);

    this.volumeDown = createPlane(0.1, 0.1, 0, -0.4, 0, material, "./graphics/flow-control-panel/Icon-VolumeDown.png");
    this.object.add(this.volumeDown);

    this.next = createPlane(0.1, 0.1, 0.3, -0.5, 0, material, "./graphics/flow-control-panel/Icon-RightArrow.png");
    this.object.add(this.next);

    this.previous = createPlane(0.1, 0.1, -0.3, -0.5, 0, material, "./graphics/flow-control-panel/Icon-RightArrow.png");
    this.previous.rotation.z = Math.PI;
    this.object.add(this.previous);

    material = {color: 0x000000};
    this.volumeLevel = createPlane(0.2, 0.2, 0, this.volumeDown.position.y - this.volumeDown.height * 0.5, -0.01, material);
    this.volumeLevel.scale.y = 0.01;
    this.object.add(this.volumeLevel);

    backgound.renderOrder = 0
    this.mute.renderOrder = 1
    this.play.renderOrder = 1
    this.next.renderOrder = 1
    this.previous.renderOrder = 1

    this.object.visible = false;
};

var createPlane = function(width, height, x, y, z, material, texture) {
    var geometry = new THREE.PlaneGeometry(width, height, 1, 1);
    var material = new THREE.MeshBasicMaterial(material);
    var plane = new THREE.Mesh(geometry, material);
    if (texture) {
        var loader = new THREE.TextureLoader();
        plane.material.map = loader.load(texture);
    }
    plane.position.x = x;
    plane.position.y = y;
    plane.position.z = z;
    plane.width = width;
    plane.height = height;
    return plane;
};

FLOW.OOPUtils.prototypalInheritance(FLOW.ControlPanel, FLOW.EventUtils.Observable);

FLOW.ControlPanel.prototype.setControls = function(picker, media) {
    this.media = media

    this.previous.onCollisionStarted = function() {
        media.previous()
    }.bind(this);
    picker.addColliders(this.previous);

    this.next.onCollisionStarted = function() {
        media.next()
    }.bind(this);
    picker.addColliders(this.next);

    this.play.onCollisionStarted = function () {
        if (!this.object.visible)
            return;
        this.playButtonPressed();
        (media.isPlaying) ? media.pause() : media.play();
    }.bind(this);
    //this.play.waitTime = 5000;
    picker.addColliders(this.play);

    this.mute.onCollisionStarted = function () {
        this.muteButtonPressed()
        if (!this.object.visible)
            return;
        (media.isMute) ? media.unmute() : media.mute()
    }.bind(this);
    picker.addColliders(this.mute);

    this.volumeUp.onSelected = function () {
        media.increaseVolume();
    }.bind(this)
    this.volumeUp.repeatTime = 100;
    picker.addColliders(this.volumeUp);

    this.volumeDown.onSelected = function () {
        media.decreaseVolume();
    }.bind(this)
    this.volumeDown.repeatTime = 100;
    picker.addColliders(this.volumeDown);

    this.timebar.onCollisionStarted = function (intersection) {
        var pos = new THREE.Vector3();
        pos.setFromMatrixPosition(this.timebar.matrixWorld);
        var rot = this.object.rotation;
        var timebarVector = new THREE.Vector3(this.timebar.width * 0.5, 0, 0);

        var intersectionVector = intersection.point;
        intersectionVector.subVectors(intersectionVector, pos);
        //rotate intersectionVector to aligne it with timebarVector
        intersectionVector.applyAxisAngle(new THREE.Vector3(1, 0, 0), -rot.x);
        intersectionVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rot.y);
        intersectionVector.applyAxisAngle(new THREE.Vector3(0, 0, 1), -rot.z);

        var projection = intersectionVector.projectOnVector(timebarVector);
        var len = this.timebar.width * 0.5;
        len += (projection.x > 0) ? projection.length() : -projection.length();
        newTime = media.getDuration() * (len / this.timebar.width);
        if (!isNaN(newTime))
            media.setTime(newTime);
    }.bind(this);
    picker.addColliders(this.timebar);
};

FLOW.ControlPanel.prototype.update = function() {
    var progress = this.media.getTime() / this.media.getDuration();
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
    this.volumeLevel.position.y = this.volumeDown.position.y - this.volumeDown.height * 0.5 + this.volumeDown.height * volume
};

FLOW.ControlPanel.prototype.panel = function() {
    return this.object;
};

FLOW.ControlPanel.prototype.show = function() {
    this.object.visible = true;
};

FLOW.ControlPanel.prototype.hide = function() {
    this.object.visible = false;
};

FLOW.ControlPanel.prototype.muteButtonPressed = function() {
    var loader = new THREE.TextureLoader();
    if (ismute) {
        this.mute.material.map = loader.load("./graphics/flow-control-panel/Icon-Volume.png");
    } else {
        this.mute.material.map = loader.load("./graphics/flow-control-panel/Icon-VolumeMute.png");
    }
    ismute = !ismute;
};

FLOW.ControlPanel.prototype.playButtonPressed = function() {
    var loader = new THREE.TextureLoader();
    if (playing) {
        this.play.material.map = loader.load("./graphics/flow-control-panel/Icon-Pause.png");
    } else {
        this.play.material.map = loader.load("./graphics/flow-control-panel/Icon-Play.png");
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
    return FLOW.ControlPanel;
}));
