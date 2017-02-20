
var THREE = THREE || require('three');

var FLOW = FLOW || {};

FLOW.THREE = FLOW.THREE || require('flow-three');
FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.MathUtils = FLOW.MathUtils || require('flow-math-utils');
FLOW.EventUtils = FLOW.EventUtils || require('flow-event-utils');
FLOW.Animation = FLOW.Animation|| require('flow-animation');

FLOW.Perspective = {};

function RotateAroundCameraPerspective(app) {
    this.name = "RotateAroundCameraPerspective";
    this.app = app;
    this.translationObject = new THREE.Object3D();
    this.translationObject.position.set(0, 0, 25);
    this.intermediateRotationObject = new THREE.Object3D();
    this.intermediateRotationObject.rotateX(THREE.Math.degToRad(-20))
    this.rotationObject = new THREE.Object3D();
    this.intermediateRotationObject.add(this.translationObject);
    this.rotationObject.add(this.intermediateRotationObject);
    if (this.app) this.app.scene.add(this.rotationObject);
    this.rotationSpeed = 5;
    this.zeroVector = new THREE.Vector3();
    return this;
}

RotateAroundCameraPerspective.prototype.start = function() {
    return this;
};

RotateAroundCameraPerspective.prototype.update = function(delta) {
    this.rotationObject.rotateY(THREE.Math.degToRad(this.rotationSpeed) * delta);
    this.rotationObject.updateMatrixWorld(true);
    this.app.camera.position.set(this.translationObject.matrixWorld.elements[12], this.translationObject.matrixWorld.elements[13], this.translationObject.matrixWorld.elements[14]);
    this.app.camera.lookAt(this.zeroVector);
    return this;
};

function RemoteUserCameraPerspective(app) {
    this.name = "RemoteUserCameraPerspective";
    this.app = app;
    this.remoteUser = null;
    return this;
}

RemoteUserCameraPerspective.prototype.start = function() {
    this.remoteUser = null;
    return this;
};

RemoteUserCameraPerspective.prototype.update = function(delta) {
    if (! this.app.clientHelper ) { return; }
    var remoteUsers = this.app.clientHelper.getClient().getRemoteUsers();
    // Verify that the reference to the remote user is still valid (did not disconnect)
    if (this.remoteUser) {
        if (!remoteUsers[this.remoteUser.getId()]) {
            this.remoteUser = null;
        }
    }
    if (this.remoteUser === null) {
        var remoteUserIds = [];
        for (var id in remoteUsers) {
            remoteUserIds.push(id);
        }
        this.remoteUser = remoteUsers[remoteUserIds[Math.floor(Math.random() * remoteUserIds.length)]];
    }
    if (this.remoteUser) {
        var object3d = this.remoteUser.getObject3D();
        object3d.updateMatrixWorld(true);
        this.app.camera.position.set(object3d.matrixWorld.elements[8], object3d.matrixWorld.elements[9], object3d.matrixWorld.elements[10]).multiplyScalar(-0.45).add(object3d.position);
        this.app.camera.quaternion.copy(object3d.quaternion);
    }
    return this;
};

function ZenithCameraPerspective(app) {
    RotateAroundCameraPerspective.call(this, app);
    this.translationObject.position.set(0, 0, 15);
    this.intermediateRotationObject.rotateX(THREE.Math.degToRad(-40));
    this.rotationSpeed = 1;
    this.name = "ZenithCameraPerspective";
    return this;
}

FLOW.OOPUtils.prototypalInheritance(ZenithCameraPerspective, RotateAroundCameraPerspective);

function PanelCameraPerspective(app) {
    this.name = "PanelCameraPerspective";
    this.app = app;
    this.cameraPosition = new THREE.Vector3();
    this.cameraLookAtPosition = new THREE.Vector3();
    return this;
}

PanelCameraPerspective.prototype.start = function() {
    var currentPanel = this.app.panels[this.app.currentPanelIndex];
    currentPanel.parent.updateMatrixWorld(true);
    var zaxis = new THREE.Vector3();
    zaxis.set(currentPanel.mesh.matrixWorld.elements[8], 0, currentPanel.mesh.matrixWorld.elements[10]);
    zaxis.multiplyScalar(20);
    this.cameraLookAtPosition.set(currentPanel.mesh.matrixWorld.elements[12], currentPanel.mesh.matrixWorld.elements[13] - 5, currentPanel.mesh.matrixWorld.elements[14]);
    this.cameraPosition.copy(this.cameraLookAtPosition).add(zaxis);
    return this;
};

PanelCameraPerspective.prototype.update = function(delta) {
    this.app.camera.position.copy(this.cameraPosition);
    this.app.camera.lookAt(this.cameraLookAtPosition);
    return this;
};

function DoNothingCameraPerspective(app) {
    this.name = "DoNothingCameraPerspective";
    this.app = app;
    return this;
};

DoNothingCameraPerspective.prototype.start = function() {
    return this;
};

DoNothingCameraPerspective.prototype.update = function(delta) {
    return this;
};

function SurveilanceCameraPerspective(app) {
    this.name = "SurveilanceCameraPerspective";
    this.app = app;
    return this;
}

SurveilanceCameraPerspective.prototype.start = function() {
    if (! this.app.clientHelper ) { return; }
    this.animation = null;
    var remoteUsers = this.app.clientHelper.getClient().getRemoteUsers();
    var initialValues = null;
    var xs = [];
    var ys = [];
    var zs = [];
    for (var id in remoteUsers) {
        var object3d = remoteUsers[id].getObject3D();
        if (!initialValues) {
            initialValues = [object3d.position.x, object3d.position.y, object3d.position.z];
        }
        else {
            xs.push(object3d.position.x);
            ys.push(object3d.position.y);
            zs.push(object3d.position.z);
        }
    }
    if (initialValues === null) return this; // There are no remote users
    xs.push(initialValues[0]);
    ys.push(initialValues[1]);
    zs.push(initialValues[2]);
    var finalValues = [xs, ys, zs];
    this.positionToLookAt = new THREE.Vector3();
    this.animation = new FLOW.Animation.Animation({
        initialValues: initialValues,
        finalValues: finalValues,
        duration: 20000,
        repeat: Infinity,
        interpolationFunction: (xs.length < 4 ? FLOW.Animation.Interpolation.CatmullRom : FLOW.Animation.Interpolation.Bezier),
        onUpdated: function(values, deltas, t) {
            this.positionToLookAt.set(values[0], values[1], values[2]);
            this.app.camera.lookAt(this.positionToLookAt);
        }.bind(this)
    }).start();
    this.app.camera.position.set((0.5 - Math.random()) * 30, 10, (0.5 - Math.random()) * 30);
    return this;
};

SurveilanceCameraPerspective.prototype.update = function(delta) {
    if (this.animation) {
        this.animation.update();
    }
    return this;
};

function CameraPerspectives(app) {
    this.app = app;
    var params = FLOW.Net.parseQueryArguments();
    this.iterateCameraPerspectives = [
        new RotateAroundCameraPerspective(app),
        new RemoteUserCameraPerspective(app),
        new ZenithCameraPerspective(app),
        new SurveilanceCameraPerspective(app)
    ];
    this.stillCameraPerspectives = [
        new PanelCameraPerspective(app),
        new DoNothingCameraPerspective(app)
    ];
    this.currentIterateCameraPerspectiveIndex = 2;
    this.currentStillCameraPerspective = null;
    this.iterate = true;
    this.fadeOutAnimation = new FLOW.Animation.Animation({
        initialValues: [0],
        finalValues: [1],
        duration: 250,
        onUpdated: function(values, deltas, t) {
            this.app.fadeMesh.material.opacity = values[0];
        }.bind(this)
    });
    this.fadeInAnimation = new FLOW.Animation.Animation({
        initialValues: [1],
        finalValues: [0],
        duration: 250,
        onUpdated: function(values, deltas, t) {
            this.app.fadeMesh.material.opacity = values[0];
        }.bind(this)
    });
    this.animations = new FLOW.Animation.Animations([
        this.fadeInAnimation,
        this.fadeOutAnimation
    ]);
    this.accumTime = 0;
    this.timeToGoToNextCameraPespective = 5;
    this.firstUpdate = true;
    if (params.cameraPerspective) {
        this.setCurrentCameraPerspective(params.cameraPerspective, true);
    }
    return this;
}

CameraPerspectives.prototype.update = function(delta) {
    if (! this.app.clientHelper || this.app.clientHelper.isUser()) return this;
    if (this.iterate) {
        if (this.firstUpdate) {
            this.iterateCameraPerspectives[this.currentIterateCameraPerspectiveIndex].start();
            this.firstUpdate = false;
        }
        this.accumTime += delta;
        if (this.accumTime >= this.timeToGoToNextCameraPespective) {
            var newCameraPerspectiveIndex = this.currentIterateCameraPerspectiveIndex + 1;
            if (newCameraPerspectiveIndex >= this.iterateCameraPerspectives.length) {
                newCameraPerspectiveIndex = 0;
            }
            this.setCurrentCameraPerspective(this.iterateCameraPerspectives[newCameraPerspectiveIndex].name);
            this.accumTime = 0;
        }
        this.iterateCameraPerspectives[this.currentIterateCameraPerspectiveIndex].update(delta);
    }
    else {
        if (this.firstUpdate) {
            this.currentStillCameraPerspective.start();
            this.firstUpdate = false;
        }
        this.currentStillCameraPerspective.update(delta);
    }
    this.animations.update();
    return this;
};

CameraPerspectives.prototype.setCurrentCameraPerspective = function(name, noFade) {
    var newCameraPerspectiveIndex = -1;
    for (var i = 0; newCameraPerspectiveIndex === -1 && i < this.iterateCameraPerspectives.length; i++) {
        if (this.iterateCameraPerspectives[i].name === name) {
            newCameraPerspectiveIndex = i;
        }
    }
    if (newCameraPerspectiveIndex >= 0) {
        if (noFade) {
            this.iterate = true;
            this.currentIterateCameraPerspectiveIndex = newCameraPerspectiveIndex;
            this.iterateCameraPerspectives[this.currentIterateCameraPerspectiveIndex].start();
        }
        else {
            this.fadeOutAnimation.start();
            this.fadeOutAnimation.setOnCompleted(function(newCameraPerspectiveIndex) {
                this.iterate = true;
                this.fadeInAnimation.start();
                this.currentIterateCameraPerspectiveIndex = newCameraPerspectiveIndex;
                this.iterateCameraPerspectives[this.currentIterateCameraPerspectiveIndex].start();
            }.bind(this, newCameraPerspectiveIndex));
        }
    }
    else {
        // HACK: Do not allow to change the camera perspective if the current one is the DoNothingCameraPerspective
        if (this.currentStillCameraPerspective && this.currentStillCameraPerspective.name === "DoNothingCameraPerspective") {
            return this;
        }
        var newCameraPerspective = null;
        for (var i = 0; !newCameraPerspective && i < this.stillCameraPerspectives.length; i++) {
            if (this.stillCameraPerspectives[i].name === name) {
                newCameraPerspective = this.stillCameraPerspectives[i];
            }
        }
        if (newCameraPerspective) {
            if (noFade) {
                this.iterate = false;
                this.currentStillCameraPerspective = newCameraPerspective;
                this.currentStillCameraPerspective.start();
            }
            else {
                this.fadeOutAnimation.start();
                this.fadeOutAnimation.setOnCompleted(function(newCameraPerspective) {
                    this.iterate = false;
                    this.fadeInAnimation.start();
                    this.currentStillCameraPerspective = newCameraPerspective;
                    this.currentStillCameraPerspective.start();
                }.bind(this, newCameraPerspective));
            }
        }
    }
    return this;
};


FLOW.Perspective.moveCameraToNodeVertex = function(object, node, zDistance, onComplete) {
    if (!node) {
        return;
    }
    var vPositions = this.dataPointsMesh.geometry.vertices;
    var vPosition = vPositions[node.vertexIndex];
    var nodePosition = new THREE.Vector3(vPosition.x, vPosition.y, vPosition.z);

    var pos = this.object.getWorldPosition();
    nodePosition.add(pos);

    FLOW.Perspective.moveCameraTo(object, nodePosition, zDistance, onComplete);
};

FLOW.Perspective.setCameraTo= function(object, app, zDistance, xDistance, yDistance) {
    xDistance = typeof (xDistance) === "number" ? xDistance : 0;
    yDistance = typeof (yDistance) === "number" ? yDistance : 0;
    if (!object || !object.getWorldPosition) {
        throw "moveCameraTo: no object available";
    }
    var pos = object.getWorldPosition();
    var newPosition = new THREE.Vector3(pos.x, pos.y, pos.z);
    var moveObject = app.isFlyCamera ? app.camera : app.scene;

    if (!app.isFlyCamera) {
        var scenePosition = moveObject.getWorldPosition();
        newPosition.sub(scenePosition);
        newPosition.negate();
        newPosition.z -= zDistance;
        newPosition.x -= xDistance;
        newPosition.y -= yDistance;
    } else {
        newPosition.z += zDistance;
        newPosition.x += xDistance;
        newPosition.y += yDistance;
    }
    moveObject.position.set(newPosition.x,newPosition.y, newPosition.z);
};

FLOW.Perspective.moveCameraTo = function(object, app, zDistance, duration, initialDelay, onComplete, easingFunction, xDistance, yDistance) {
    xDistance = typeof (xDistance) === "number" ? xDistance : 0;
    yDistance = typeof (yDistance) === "number" ? yDistance : 0;

    if (!object || !object.getWorldPosition) {
        throw "moveCameraTo: no object available";
    }
    var pos = object.getWorldPosition();
    var nodePosition = new THREE.Vector3(pos.x, pos.y, pos.z);
    var moveObject = app.isFlyCamera ? app.camera : app.scene;

    if (!app.isFlyCamera) {
        var scenePosition = moveObject.getWorldPosition();
        nodePosition.sub(scenePosition);
        nodePosition.negate();
        nodePosition.z -= zDistance;
        nodePosition.x -= xDistance;
        nodePosition.y -= yDistance;
    } else {
        nodePosition.z += zDistance;
        nodePosition.x += xDistance;
        nodePosition.y += yDistance;
    }

    var animateTo = new FLOW.Animation.Animation({
        // initialValues: [moveObject.position.x, moveObject.position.y, moveObject.position.z],
        attributeObject: moveObject,
        attributes: ["position.x", "position.y", "position.z"],
        setInitialValueFromCurrentValue: true,
        finalValues: [nodePosition.x, nodePosition.y, nodePosition.z],
        duration: duration,
        initialDelay: 0,
        easingFunction: easingFunction ? easingFunction : null,
        onUpdated: function (values, deltas, t, data, object, attributes) {
            this.position.set(values[0], values[1], values[2]);

            /* for (var p = 0; p < attributes.length; p++) {
             object[attributes[p]] = values[p];
             }*/
        }.bind(moveObject),
        onCompleted: onComplete,
        //removeSelfAfterCompleted: app.animations
    });
    app.animations.addAnimation(animateTo);
    //animateTo.start();
    return animateTo;
};


(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Perspective;
}));
