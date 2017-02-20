/**
 * Created by jm on 10/4/2016.
 */
var THREE = THREE || require('three');
var FLOW = FLOW || {};


FLOW.Animation = FLOW.Animation || require("flow-animation");
FLOW.Perspective = FLOW.Perspective || require("flow-perspective");

FLOW.SceneTimeline = function( timeline, app, startingFunction, endingFunction, initialPosition, callback){
    this.app = app;
    if (!this.app.animations ){
        this.app.animations = new FLOW.Animation.Animations();
    }

    if(startingFunction) {
        this.startingFunction = startingFunction;
    }

    if(endingFunction) {
        this.endingFunction = endingFunction;
    }

    var lastSequence = timeline[timeline.length - 1];
    this.startTime = 0;
    if(this.app.timeline.timelineList.length != 0) {
        for(var i = 0; i < this.app.timeline.timelineList.length; i++) {
            this.startTime += this.app.timeline.timelineList[i].endTime;
        }
    }

    this.endTime = lastSequence.sceneTime;
    this.sequenceTimes = [];

    this.initialTransitionDone = false;
    this.initialPosition = initialPosition;


    this.activeSeqenceIndex = null;
    this.sequenceList = []

    var firstCameraFound = false;
    for (var i = 0; i < timeline.length; i++) {

        if(this.initialPosition && timeline[i].moveCameraTo && !firstCameraFound) {
            firstCameraFound = true;

            var pos = this.initialPosition.clone();
            if(!this.app.params.isFlyCamera) {
               pos.negate();
            } else {
                pos.add(this.app.scene.position)
            }

            timeline[i].moveCameraTo.from = pos;
        }

        this.sequenceList.push(new FLOW.SceneTimeline.Sequence(timeline[i], this.startTime, app));
        this.sequenceTimes.push(timeline[i].sceneTime);

        var obj = timeline[i];
        var end = obj.sceneTime;
        if(obj.duration) {
            end += obj.duration;
        }
        if(end > this.endTime) {
            this.endTime = end;
        }
    }
    return this;
};

FLOW.SceneTimeline.prototype.startScene = function(pauseAtStart = false, transition = true) {

    if(!this.initialTransitionDone) {
        if(this.startingFunction) {
            this.startingFunction();
        }

        for(i in this.sequenceList) {
            if(this.sequenceList[i].action && this.sequenceList[i].action.type == "Object") {
                this.sequenceList[i].action.params.object.rotationReset = false;
                this.sequenceList[i].action.params.object.positionReset = false;
            }
        }

        for(i in this.sequenceList) {
            var current = this.sequenceList[i];
            if(current.action) {
                this.app.animations.addAnimation(this.sequenceList[i].action);
                if(current.action.type == "Object") {

                    if(current.action.params.isRotation() && !current.action.params.object.rotationReset) {
                        current.action.params.object.rotationReset = true;
                        current.action.setTime(0);
                    } 

                    if(current.action.params.isPosition() && !current.action.params.object.positionReset) {
                        current.action.params.object.positionReset = true;
                        current.action.setTime(0);
                    }    
                    
                } else if(current.action.type == "External") {
                    current.action.setTime(0);
                }
            }
        }
    }

    if(!this.initialPosition || !transition) {
        this.initialTransitionDone = true;
    }

    var obj = (this.app.params.isFlyCamera) ? this.app.camera : this.app.scene;


    if(this.initialPosition) {
        if(this.app.params.isFlyCamera && obj.position.equals(this.initialPosition)) {
            this.initialTransitionDone = true;
        } else if(!this.app.params.isFlyCamera) {
            var temp = obj.position.clone();
            temp.negate();
            if(temp.equals(this.initialPosition)) {
                this.initialTransitionDone = true;
            }
        }
    }


    if(!this.initialTransitionDone && this.initialPosition) {

        var pos = this.initialPosition.clone();
        if(!this.app.params.isFlyCamera) {
           pos.negate();
        } else {
            pos.add(this.app.scene.position)
        }

        var camera = (this.app.params.isFlyCamera) ? this.app.camera : this.app.scene;
        var initialValues = camera.position.clone();
            
        animation = new FLOW.Animation.Animation({
            attributeObject: obj,
            attributes: "position",
            setInitialValueFromCurrentValue: false,
            initialValues: initialValues.toArray(),
            finalValues: pos.toArray(),
            duration: 1500,
            onUpdated: function (values, deltas, t, data, object, attributes) {
                for (var p = 0; p < attributes.length; p++) {
                    if (attributes[p] == "position") {
                        object.position.set(values[0], values[1], values[2]);
                    }
                }
            },
            onCompleted: function() {
                (this.app.params.isFlyCamera) ? this.app.camera.getWorldPosition() : this.app.scene.getWorldPosition();
                this.initialTransitionDone = true;
                this.startScene(pauseAtStart);
            }.bind(this),
            removeSelfAfterCompleted : this.app.animations
        });
        this.app.animations.addAnimation(animation);
        animation.start();
        return;
    }

    this.sceneStartTime = window.performance.now();
    this.pauseTime = this.sceneStartTime;

    this.started = true;
    this.paused = false;
    this.setTime(0);

    if(pauseAtStart == true) {
        this.pause()
    }
};

FLOW.SceneTimeline.prototype.stopScene = function(reset = false) {
    this.started = false;

    if(this.endingFunction) {
        this.endingFunction();
    }

    for(var i = 0; i < this.sequenceList.length; i++){
        if(this.sequenceList[i].action) {
            var action = this.sequenceList[i].action;
            if(action.type != "Camera") {
                if(typeof action.params.duration !== "undefined") {
                    action.setTime( (!reset) ? action.params.duration : 0);
                } else {
                    console.warn("Action does not have a duration");
                }
            }
            action.stop();
        }

        else if(this.sequenceList[i].narration) {
            clip = this.app.audio.findClip(this.sequenceList[i].narration);
            this.app.audio.stopClip(clip, 0);
        }

    }
    this.app.animations.removeAllAnimations();
};

FLOW.SceneTimeline.prototype.play = function() {
    currentCameraPosition = (this.app.params.isFlyCamera) ? this.app.camera.getWorldPosition() : this.app.scene.getWorldPosition();

    if(!this.cameraPosition.equals(currentCameraPosition)) {
        coordinatesArray = [this.cameraPosition.x, this.cameraPosition.y, this.cameraPosition.z]
        animation = new FLOW.Animation.Animation({
            attributeObject: (this.app.params.isFlyCamera) ? this.app.camera : this.app.scene,
            attributes: "position",
            setInitialValueFromCurrentValue: true,
            finalValues: coordinatesArray,
            duration: 1000,
            onUpdated: function (values, deltas, t, data, object, attributes) {
                for (var p = 0; p < attributes.length; p++) {
                    if (attributes[p] == "position") {
                        object.position.set(values[0], values[1], values[2]);
                    }
                }
            },
            onCompleted: function() { this.play(); (this.app.params.isFlyCamera) ? this.app.camera.getWorldPosition() : this.app.scene.getWorldPosition(); }.bind(this),
            removeSelfAfterCompleted : this.app.animations
        });
        this.app.animations.addAnimation(animation);
        animation.start();

        return;
    }

    currentTime = window.performance.now();
    this.sceneStartTime += currentTime - this.pauseTime;
    this.paused = false;
    this.activeSeqenceIndex = 0;
    this.setTime(this.time);
};

FLOW.SceneTimeline.prototype.pause = function() {
    if(!this.initialTransitionDone) {
        return;
    }

    this.paused = true;
    this.pauseTime = window.performance.now();

    for(var i = 0; i <= this.activeSeqenceIndex; i++) {
        if(this.sequenceList[i].action) {
            this.sequenceList[i].action.pause();
        }

        if(this.sequenceList[i].narration) {
            clip = this.app.audio.findClip(this.sequenceList[i].narration);
            this.app.audio.stopClip(clip, 0);
        }
    }

    this.cameraPosition = (this.app.params.isFlyCamera) ? this.app.camera.getWorldPosition() : this.app.scene.getWorldPosition();
};

FLOW.SceneTimeline.prototype.setTime = function(time) {

    if(time < 0) {
        throw "FLOW.SceneTimeline.prototype.setTime  negative time";
    }

    currentTime = window.performance.now();

    this.sceneStartTime = currentTime - time;
    this.time = time;


    for(var i = this.sequenceList.length -1; i > 0; i--) {
        if(this.sequenceList[i].action) {
            this.sequenceList[i].action.setTime(0);
            this.sequenceList[i].action.stop();
        }
    }

    for(var i = 0; i < this.sequenceList.length; i++) {
        if(this.sequenceList[i].startTime <= time) {
            sequenceTime = time - this.sequenceList[i].startTime;
            if(this.sequenceList[i].duration && sequenceTime > this.sequenceList[i].duration) {
                sequenceTime = this.sequenceList[i].duration;
            }

            if(this.sequenceList[i].action) {
                
                if(!this.paused) {
                    this.sequenceList[i].action.start(sequenceTime);
                } else {
                    this.sequenceList[i].action.setTime(sequenceTime);
                }
            
            }

            else if(this.sequenceList[i].functionObject && this.started) {
                this.sequenceList[i].functionObject.start();
                this.sequenceList[i].functionObject.performed = true;
            }

            else if(this.sequenceList[i].narration && this.started && !this.paused ) {
                clip = this.app.audio.findClip(this.sequenceList[i].narration);
                this.app.audio.stopClip(clip, 0);
                this.app.audio.playClip(clip, 0, sequenceTime/1000);
                this.app.audio.setVolume(clip, !this.narrationDisabled);
                this.priorNarration = this.sequenceList[i].narration;
            }

            else if(this.sequenceList[i].music && this.started ) {
                clip = this.app.audio.findClip(this.sequenceList[i].music);
                if(this.sequenceList[i].music != this.priorMusic && (this.sequenceList[i].continue != true || 
                    (this.sequenceList[i].continue == true && !clip.isPlaying))) {
                    if(this.priorMusic) {
                        this.app.audio.fadeClipOutByName(this.priorMusic, 5);
                    }
                    this.app.audio.stopClip(clip, 0);
                    this.app.audio.playClip(clip, 0, sequenceTime/1000);
                    this.app.audio.setVolume(clip, !this.musicDisabled);
                    this.priorMusic = this.sequenceList[i].music;
                } 
            }

            this.activeSeqenceIndex = i;
        } else {
            
            if(this.sequenceList[i].functionObject && this.sequenceList[i].functionObject.cleanup && this.sequenceList[i].functionObject.performed) {
                this.sequenceList[i].functionObject.cleanup();
            }

            else if(this.sequenceList[i].narration) {
                clip = this.app.audio.findClip(this.sequenceList[i].narration);
                this.app.audio.stopClip(clip, 0);
            }

            else if(this.sequenceList[i].music) {
                clip = this.app.audio.findClip(this.sequenceList[i].music);
                this.app.audio.stopClip(clip, 0);
                //this.priorMusic = null;
            }
        }
    }

    if(this.paused) {
        this.pauseTime = currentTime;
        this.cameraPosition = (this.app.params.isFlyCamera) ? this.app.camera.getWorldPosition() : this.app.scene.getWorldPosition();
    }

    if(this.sequenceList.length < 2 || time < this.sequenceList[1].startTime) {
        this.activeSeqenceIndex = 0;
    }
};

FLOW.SceneTimeline.prototype.playSequence = function(index) {
    if(index < 0 || index >= this.timeline.length ) {
        throw "incorrect sequence index: "+index;
    }
    time = this.sequenceList[index].sceneTime;
    this.setTime(time);
};

FLOW.SceneTimeline.prototype.getDuration = function() {
    return this.endTime;
};

FLOW.SceneTimeline.prototype.getSequenceTimes = function() {
    return this.sequenceTimes;
};

FLOW.SceneTimeline.prototype.getTime = function() {
    return this.time;
};

FLOW.SceneTimeline.prototype.update = function() {
    if(this.started && !this.paused) {
        time = window.performance.now();
        delta = time - this.sceneStartTime;
        this.time = delta;
        for(var i = this.activeSeqenceIndex+1; i < this.sequenceList.length; i++) {
            var currentSequence = this.sequenceList[i];
            if(currentSequence.startTime <= delta) {
                if(currentSequence.action) {

                    if(currentSequence.action.type == "Camera" && !currentSequence.positionExplicit) {
                        currentSequence.action._params.initialValues = this.app.scene.getWorldPosition().toArray();
                    }

                    if(currentSequence.action.type == "Camera" && currentSequence.action.params.moveCameraTo.updateWhenExecuted) {
                        var new_final = currentSequence.action.params.object.getWorldPosition();
                        new_final = this.app.scene.getWorldPosition().sub(new_final);

                        var x = currentSequence.action.params.moveCameraTo.xDistance;
                        var y = currentSequence.action.params.moveCameraTo.yDistance;
                        var z = currentSequence.action.params.moveCameraTo.zDistance;
                        var adjustment = new THREE.Vector3( (x) ? -x : 0, (y) ? -y : 0, (z) ? -z : 0);

                        if(!this.app.params.isFlyCamera) {  
                            new_final.add(adjustment); 
                        } else {
                            new_final.sub(adjustment);
                        }

                        currentSequence.action._finalValues = new_final.toArray();
                    }

                    currentSequence.action.start(delta - currentSequence.startTime);
                    if(currentSequence.action.type == "External" ) {
                        console.log("starting external",currentSequence.startTime )
                    }
                }

                else if(currentSequence.functionObject) {
                    currentSequence.functionObject.start();
                    currentSequence.functionObject.performed = true;
                }

                else if(currentSequence.narration) {
                    let clip = this.app.audio.findClip(currentSequence.narration)
                    this.app.audio.playClip(clip);
                    this.app.audio.setVolume(clip, !this.narrationDisabled);
                    this.priorNarration = currentSequence.narration;
                }

                else if(currentSequence.music) {
                    var clip = this.app.audio.findClip(currentSequence.music);
                    if(currentSequence.music != this.priorMusic && (currentSequence.continue != true || 
                    (currentSequence.continue == true && !clip.isPlaying))) {
                        if(this.priorMusic) {
                            this.app.audio.fadeClipOutByName(this.priorMusic, 5);
                        }
                        this.app.audio.stopClip(clip, 0);
                        this.app.audio.playClip(clip, 0, sequenceTime/1000);
                        this.app.audio.setVolume(clip, !this.musicDisabled);
                        this.priorMusic = currentSequence.music;
                    }
                }
                this.activeSeqenceIndex = i;
            } else {
                break;
            }
        }

        if(this.endTime <= delta) {
            this.started = false;
            if(!this.last) {
                this.stopScene();
                this.manager.next();
            }
        }
    }
}

FLOW.SceneTimeline.Sequence = function(params, timelineStartTime, app) {
    this.app = app;
    this.startFunction = params.startFunction;
    this.endFunction = params.endFunction;
    this.startTime = params.sceneTime;
    this.endTime = (params.duration) ? this.startTime + params.duration : this.startTime;
    this.duration = this.endTime - this.startTime;

    if(params.animateObject && params.duration) {
        this.info = {}
        var obj = eval(params.animateObject.object);

        finalState = {};
        initialState = {};

        var addToObjectHistory = true;

        if( params.animateObject.attributes == "position") {
            finalState.position = params.animateObject.endValues;
        }

        else if( params.animateObject.attributes == "rotation") {
            finalState.rotation = params.animateObject.endValues;
            initialState.rotation = params.animateObject.initialValues;
        }

        else if( params.animateObject.attributes == "rotationX" ) {
            finalState.rotation = [params.animateObject.endValues, null, null];
            initialState.rotation = [params.animateObject.initialValues, null, null];
        }

        else if( params.animateObject.attributes == "rotationY" ) {
            finalState.rotation = [null, params.animateObject.endValues, null];
            initialState.rotation = [null, params.animateObject.initialValues, null];
        }

        else if( params.animateObject.attributes == "rotationZ" ) {
            finalState.rotation = [null, null, params.animateObject.endValues];
            initialState.rotation = [null, null, params.animateObject.initialValues];
        }

        else if(params.animateObject.attributes == "scale") {
            finalState.scale = params.animateObject.endValues;;
        } else {
            addToObjectHistory = false;
        }
        if(obj.scale) {
            var initialValue = obj.scale.clone();
        }
        if(addToObjectHistory) {

            var timelineAnimatedObject = this.app.timeline.findObject(obj);
            
            if(timelineAnimatedObject == null) {
                timelineAnimatedObject = new FLOW.SceneTimeline.AnimatedObject(obj, this.startTime + timelineStartTime, this.duration, initialState, finalState, params.animateObject.easingFunction, app);
                this.app.timeline.addObject(timelineAnimatedObject);
            } else {
                if(params.animateObject.attributes == "scale") {
                    initialValue = timelineAnimatedObject.getLastValueOfParameter("scale");
                }
                timelineAnimatedObject.add(this.startTime + timelineStartTime, this.duration, initialState, finalState, params.animateObject.easingFunction, params.animateObject.interpolationFunction);
            }

        }

        console.log("creating animation")
        console.log("initial from current", typeof params.animateObject.initialValues == "undefined")
        console.log("initialValue", (params.animateObject.attributes != "scale") ? params.animateObject.initialValues : initialValue)


        this.action = new FLOW.Animation.Animation({
            attributeObject: obj,
            attributes: params.animateObject.attributes,
            setInitialValueFromCurrentValue: typeof params.animateObject.initialValues == "undefined" && params.animateObject.attributes != "scale",
            initialValues : (params.animateObject.attributes != "scale") ? params.animateObject.initialValues : initialValue.toArray(),
            finalValues: params.animateObject.endValues,
            duration: params.duration,
            repeat: params.repeat,
            easingFunction: params.animateObject.easingFunction,
            name: params.animateObject.object,
            onUpdated: function (values, deltas, t, data, object, attributes) {
                for (var p = 0; p < attributes.length; p++) {
                    if (attributes[p] == "rotationX") {
                        object.rotation.set( values[0], object.rotation.y,  object.rotation.z)
                    } else if (attributes[p] == "rotationY") {
                        object.rotation.set( object.rotation.x, values[0],  object.rotation.z)
                    } else if (attributes[p] == "rotationZ") {
                        object.rotation.set( object.rotation.x,  object.rotation.y, values[0])
                    } else if (attributes[p] == "position") {
                        object.position.set(values[0], values[1], values[2]);
                    } else if (attributes[p] == "rotation") {
                        object.rotation.set(values[0], values[1], values[2]);
                    } else if (attributes[p] == "scale") {
                        object.scale.set(values[0], values[1], values[2]);
                    } else {
                        var dotNestings = attributes[p].split(".");
                        var attr = object[dotNestings[0]];
                        for (var q = 1; q < dotNestings.length; q++) {
                            attr = attr[dotNestings[q]];
                        }
                        object[attributes[p]] = values[p];
                    }
                }

            }.bind(this),
        });
        this.action.type = "Object";
        this.action.params = params;
        this.action.params.object = obj;
        this.action.params.isRotation = function() {
            if(!this.animateObject.attributes) { return false; }
            return this.animateObject.attributes == "rotation"  || this.animateObject.attributes == "rotationX" || 
                   this.animateObject.attributes == "rotationY" || this.animateObject.attributes == "rotationZ";
        }.bind(this.action.params);
        this.action.params.isPosition = function() {
            if(!this.animateObject.attributes) { return false; }
            return this.animateObject.attributes == "position";
        }.bind(this.action.params)
        this.app.animations.addAnimation(this.action);
    }

    else if(params.moveCameraTo) {
        var obj = eval(params.moveCameraTo.object);

        var camera = (this.app.params.isFlyCamera) ? this.app.camera : this.app.scene;

        var cameraPosition = camera.getWorldPosition();
        this.app.scene.worldToLocal(cameraPosition)

        var startPosition;
        
        if(params.moveCameraTo.from) {
            if(params.moveCameraTo.from.isVector3) {
                startPosition = params.moveCameraTo.from.clone();
            } else {

                if(!params.moveCameraTo.from.object) {
                    throw "FLOW.SceneTimeline.Sequence moveCameraTo.from.object is not provided";
                }

                startPosition = this.app.timeline.getObjectPosition(params.moveCameraTo.from.object, params.sceneTime + timelineStartTime);
                
                if(params.moveCameraTo.from.offset) {
                    if(!Array.isArray(params.moveCameraTo.from.offset) || params.moveCameraTo.from.offset.length != 3) {
                        throw "FLOW.SceneTimeline.Sequence moveCameraTo.from.offset shoud be and array of three elemens";
                    }
                    startPosition.sub(new THREE.Vector3(...params.moveCameraTo.from.offset));
                }

            }
            this.positionExplicit = true;
        } else {
            
            var moved = this.app.timeline.objectMoved(camera);
            
            if(!moved) {
                startPosition = camera.position.clone();
            } else {
                var startPosition = this.app.timeline.getObjectPosition(camera, params.sceneTime + timelineStartTime);
            }
            this.positionExplicit = false;
        }   

        if(!params.moveCameraTo.to) {
            var objectFinalPosititon = this.app.timeline.getObjectPosition(obj, params.sceneTime + params.duration + timelineStartTime);
        } else if(params.moveCameraTo.to.isVector3){
            var objectFinalPosititon = params.moveCameraTo.to;
        }

        if(!this.app.params.isFlyCamera) {
            var finalPosition = cameraPosition.clone();
            finalPosition.sub(objectFinalPosititon);
        } else {
            var finalPosition = objectFinalPosititon;
        }
        
        finalState = { position: finalPosition };
        initialState = {};

        var adjustment = new THREE.Vector3(
                (params.moveCameraTo.xDistance) ? -params.moveCameraTo.xDistance : 0,
                (params.moveCameraTo.yDistance) ? -params.moveCameraTo.yDistance : 0,
                (params.moveCameraTo.zDistance) ? -params.moveCameraTo.zDistance : 0)

        if(!this.app.params.isFlyCamera) {  
            finalState.position.add(adjustment); 
        } else {
            finalState.position.sub(adjustment);
        }

        finalState.position = finalState.position.toArray();
 
        var timelineAnimatedObject = this.app.timeline.findObject(camera);

        if(timelineAnimatedObject == null) {
            timelineAnimatedObject = new FLOW.SceneTimeline.AnimatedObject(camera, this.startTime + timelineStartTime, this.duration, initialState, finalState, params.moveCameraTo.easingFunction, app);
            this.app.timeline.addObject(timelineAnimatedObject);
        } else {
            timelineAnimatedObject.add(this.startTime + timelineStartTime, this.duration, initialState, finalState, params.moveCameraTo.easingFunction, params.moveCameraTo.interpolationFunction);
        }

        this.action = new FLOW.Animation.Animation({
            attributeObject: (this.app.params.isFlyCamera) ? this.app.camera : this.app.scene,
            attributes: "position",
            setInitialValueFromCurrentValue: false,
            initialValues: startPosition.toArray(),
            finalValues: finalPosition.toArray(),
            duration: params.duration,
            easingFunction: params.moveCameraTo.easingFunction,
            name: "camera to " + params.moveCameraTo.object + " " + finalPosition.toArray(),
            onUpdated: function (values, deltas, t, data, object, attributes) {
                for (var p = 0; p < attributes.length; p++) {
                    if (attributes[p] == "position") {
                        object.position.set(values[0], values[1], values[2]);
                    }
                }
            },
        });
        this.action.type = "Camera";
        this.action.params = params;
        this.action.params.object = obj;
        this.app.animations.addAnimation(this.action);
    }

    else if(params.action) {
        this.action = params.action;
        this.action.params = params;
        this.action.type = "External";
        this.app.animations.addAnimation(this.action);
    }

    else if(params.functionObject) {
        // { start(), cleanup() }
        if(!params.functionObject.start) {
            throw "functionObject does not have start function";
        }
        this.functionObject = params.functionObject;
        this.functionObject.performed = false;
    }

    else if(params.narration) {
        this.narration = params.narration;
    }

    else if(params.music) {
        if(typeof params.music == "string") {
            this.music = params.music;
            this.continue = false;
        } else if(typeof params.music == "object") {
            if(params.music.continue == true) {

                if(this.app.timeline.timelineList.length == 0) {
                    throw "FLOW.SceneTimeline.Sequence previous timeline is empty. Can't continue playing previous music"
                }

                var result = null;
                for(var i = 1; i <= this.app.timeline.timelineList.length && result == null ; i++) {

                    var previousSequenceList = this.app.timeline.timelineList[this.app.timeline.timelineList.length - i].sequenceList;
                
                    previousSequenceList.reverse();
                    var result = previousSequenceList.find(function(item) { return typeof item.music !== "undefined"; });
                    previousSequenceList.reverse();  

                }

                if(result) {
                    this.music = result.music;
                    this.continue = true;
                } else {
                    throw "FLOW.SceneTimeline.Sequence couldn't find previous music to continue"
                }

            }
        } else {
            throw "FLOW.SceneTimeline.Sequence unsupported type of music parameter";
        }
    }
};

FLOW.SceneTimeline.Manager = function(app) {
    this.timelineList = [];
    this.activeTimeLine = null;
    this.timeline = false;
    this.isPlaying = false;
    this.isMute = false;
    this.objectsPositions = [];
    this.app = app;
    this.narrationDisabled = false;
    this.musicDisabled = false;
    if(this.app.isFlyCamera) {
        this.objectsPositions.push([0, this.app.camera.position]);
    } else {
        this.objectsPositions.push([0, this.app.scene.position]);
    }
};

FLOW.SceneTimeline.Manager.prototype.next = function(transition = true) {
    if(this.activeTimeLine < this.timelineList.length - 1 && (this.timeline.initialTransitionDone || !transition)) {

        this.activeTimeLine += 1;
        var next_timeline = this.timelineList[this.activeTimeLine];
        var next_music = next_timeline.sequenceList.find(function(item) { return item.music});

        if(next_music) {

            if(next_music.music != this.timeline.priorMusic || !next_music.continue) {

                if(this.timeline.priorMusic) {
                    this.app.audio.fadeClipOutByName(this.timeline.priorMusic, 5);
                }

                if(next_music.startTime == 0 && this.isPlaying) {
                    let clip = this.app.audio.findClip(next_music.music)
                    this.app.audio.playClip(clip);
                    this.app.audio.setVolume(clip, !this.musicDisabled);
                }

            } 

            next_timeline.priorMusic = next_music.music;
        } else {
            if(this.timeline.priorMusic) {
                this.app.audio.fadeClipOutByName(this.timeline.priorMusic, 5);
            }  
        }

        if(this.timeline.started) {
            this.timeline.stopScene();
        }

        this.timeline = next_timeline;
        this.timeline.initialTransitionDone = false;
        this.timeline.narrationDisabled = this.narrationDisabled;
        this.timeline.musicDisabled = this.musicDisabled;
        this.timeline.startScene(!this.isPlaying, transition);

    }
};

FLOW.SceneTimeline.Manager.prototype.previous = function(transition = true) {
    if(this.activeTimeLine > 0 && (this.timeline.initialTransitionDone || !transition)) {

        this.activeTimeLine -= 1;
        var next_timeline = this.timelineList[this.activeTimeLine];
        var next_music = next_timeline.sequenceList.find(function(item) { return item.music});

        if(next_music) {

            if(next_music.music != this.timeline.priorMusic) {

                if(this.timeline.priorMusic) {
                    this.app.audio.fadeClipOutByName(this.timeline.priorMusic, 5);
                }

                if(next_music.startTime == 0 && this.isPlaying) {
                    this.app.audio.playClipByName(next_music.music);
                }

            } 

            next_timeline.priorMusic = next_music.music;
        } else {
            if(this.timeline.priorMusic) {
                this.app.audio.fadeClipOutByName(this.timeline.priorMusic, 5);
            }  
        }

        if(this.timeline.started || this.timeline.last) {
            this.timeline.stopScene(true);
        }
        
        this.timeline = next_timeline;
        this.timeline.initialTransitionDone = false;

        this.timeline.narrationDisabled = this.narrationDisabled;
        this.timeline.musicDisabled = this.musicDisabled;
        this.timeline.startScene(!this.isPlaying, transition);
    }
};

FLOW.SceneTimeline.Manager.prototype.selectScene = function( index ) {
    if( index < 0 || index > this.timelineList.length) {
        throw "SelectScene: index is out of range";
    }

    if(index != this.activeTimeLine) {
        // starts playing music 
        while( this.activeTimeLine != index ) {
            if( index > this.activeTimeLine ) {
                this.next(false)
            } else {
                this.previous(false)
            }
        }

        if( this.timeline.initialPosition ) {
            // change for isFlyCmera true
            var obj = (this.app.params.isFlyCamera) ? this.app.camera : this.app.scene;
            obj.position.copy(this.timeline.initialPosition.clone().negate());
        }
    }
    
};

FLOW.SceneTimeline.Manager.prototype.add = function(timeline) {
    if(this.timelineList.length != 0) {
        this.timelineList[this.timelineList.length -1].last = false;
        timeline.startTime = this.timelineList[this.timelineList.length -1].endTime;
    }
    timeline.last = true;
    this.timelineList.push(timeline);
    timeline.manager = this;
    for(i in timeline.sequenceList) {
        var currentTimeline = timeline.sequenceList[i];
        if(currentTimeline.action && currentTimeline.action.params.moveCameraTo) {
            this.objectsPositions.push([currentTimeline.action.params.sceneTime, currentTimeline.action.params.targetPosition]);
        }
    }
}

FLOW.SceneTimeline.Manager.prototype.update = function() {
    if(this.timeline) {
        this.timeline.update();
    }
}

FLOW.SceneTimeline.Manager.prototype.play = function() {
    if(this.timeline) {
        this.timeline.play();
    } else {
        this.activeTimeLine = 0;
        this.timeline = this.timelineList[this.activeTimeLine];
        this.timeline.narrationDisabled = this.narrationDisabled;
        this.timeline.musicDisabled = this.musicDisabled;
        this.timeline.startScene();
    }
    this.isPlaying = true;
};

FLOW.SceneTimeline.Manager.prototype.pause = function() {
    if(this.timeline.initialTransitionDone) {
        this.isPlaying = false;
        this.timeline.pause();
    }
};

FLOW.SceneTimeline.Manager.prototype.mute = function() {
    this.isMute = true;
    this.app.audio.mute();
};

FLOW.SceneTimeline.Manager.prototype.unmute = function() {
    this.isMute = false;
    this.app.audio.unmute();
};

FLOW.SceneTimeline.Manager.prototype.toggleNarration = function() {
    if(this.timeline) {
        this.timeline.narrationDisabled = !this.timeline.narrationDisabled
        clip = this.app.audio.findClip(this.timeline.priorNarration);
        this.app.audio.setVolume(clip, !this.timeline.narrationDisabled);
        console.warn(clip.gainNode)
        this.narrationDisabled = this.timeline.narrationDisabled;
    }
};

FLOW.SceneTimeline.Manager.prototype.toggleMusic = function() {
    if(this.timeline) {
        this.timeline.musicDisabled = !this.timeline.musicDisabled;
        clip = this.app.audio.findClip(this.timeline.priorMusic);    
        this.app.audio.setVolume(clip, !this.timeline.musicDisabled);
        console.warn(clip.gainNode)
        this.musicDisabled = this.timeline.musicDisabled;
    }
};

FLOW.SceneTimeline.Manager.prototype.increaseVolume = function() {
    if(this.timeline && this.app.audio && this.app.audio.trueVolume < 1.0 ) {
      this.app.audio.setMasterVolume(this.app.audio.trueVolume + 0.05);
    }
};

FLOW.SceneTimeline.Manager.prototype.decreaseVolume = function() {
    if(this.timeline && this.app.audio && this.app.audio.trueVolume > 0 ) {
        if(this.app.audio.trueVolume <= 0.05) {
            this.app.audio.mute()
        } else {
            this.app.audio.setMasterVolume(this.app.audio.trueVolume - 0.05);
        }
    }
};

FLOW.SceneTimeline.Manager.prototype.setVolume = function(volume) {
    this.app.audio.setMasterVolume(volume);
};

FLOW.SceneTimeline.Manager.prototype.setTime = function(time) {
    if (this.timeline){
        this.timeline.setTime(time)
    }
};

FLOW.SceneTimeline.Manager.prototype.getDuration = function() {
    return (this.timeline) ? this.timeline.getDuration() : 0;
};

FLOW.SceneTimeline.Manager.prototype.getTotalDuration = function() {
    var totalDuration = 0;
    for(i in this.timelineList) { 
        totalDuration += this.timelineList[i].endTime;
    }
    return totalDuration;
};

FLOW.SceneTimeline.Manager.prototype.getTime = function() {
    return (this.timeline) ? this.timeline.getTime() : 0;
};

FLOW.SceneTimeline.Manager.prototype.getVolume = function() {
    return (this.app.audio) ? this.app.audio.trueVolume : 0;
};

FLOW.SceneTimeline.Manager.prototype.objectMoved = function(object, time) {
    var timelineObject = this.findObject(object)
    if(timelineObject) {
        return true;
    }    

    if(object.parent) {
        var parent = object.parent;
        var result = null;
        while(result == null && parent != null) {
            result = this.findObject(parent);
            parent = parent.parent;
        }

        if(result)
            return true;
    }

    return false;
}

FLOW.SceneTimeline.Manager.prototype.getObjectPosition = function(object, time) {
    var timelineObject = this.findObject(object)
    if(timelineObject) {

        var position = timelineObject.getObjectPosition(time, object.getWorldPosition());

        if(object != this.app.scene && !this.app.params.isFlyCamera) {
           this.app.scene.worldToLocal(position)
        } 
        return position;
    }

    if(!object.parent) {
        var position = object.getWorldPosition();

        if(!this.app.params.isFlyCamera) {
            this.app.scene.worldToLocal(position);
        }

        return position;
    } else {
        var lastParent = null
        var parent = object.parent;
        var result = null;

        while(parent != null) {
            if(!result) {
                result = this.findObject(parent);
            }
            lastParent = parent;
            parent = parent.parent;
        }

        if(result && result.object != this.app.scene) {
            lastParent.updateMatrixWorld(true);
            var position = result.getObjectPosition(time, object.getWorldPosition());

            if(!this.app.params.isFlyCamera) {
                this.app.scene.worldToLocal(position);
            }

            return position;

        } else {
            lastParent.updateMatrixWorld(true);
            var position = object.getWorldPosition();

            if(object != this.app.scene && !this.app.params.isFlyCamera) {
                this.app.scene.worldToLocal(position);
            }

            return position;
        }
    }
};

FLOW.SceneTimeline.Manager.prototype.findObject = function(object) {
    for(i in this.objects) {
        if(this.objects[i].uuid == object.uuid) {
            return this.objects[i];
        }
    }
    return null;
};

FLOW.SceneTimeline.Manager.prototype.addObject = function(object) {
    if(!this.objects) {
        this.objects = [];
    }
    this.objects.push(object);
};

FLOW.SceneTimeline.AnimatedObject = function(object, sceneTime, duration, initialState, finalState, easingFunction, app) {
    this.app = app;
    if(typeof object !== "object" || !object.uuid) {
        throw "SceneTimeLineAnimatedObject object has incorrect type of does not have uuid"
    }
    this.object = object;
    this.uuid = object.uuid;

    var initialPositionVec3 = new THREE.Vector3();
    if(initialState.position) {
        initialPositionVec3.fromArray(initialState.position);
    } else {
        var initialPosition = object.getWorldPosition();
        this.app.scene.worldToLocal(initialPosition);
        initialPositionVec3 = initialPosition;
    }

    var initialRotationVec3 = new THREE.Vector3();
    if(initialState.rotation) {
        initialRotationVec3.fromArray(initialState.rotation);
    } else {
        initialRotationVec3 = object.rotation.toVector3();
    }

    var finalStatePositionVec3 = null;
    if(finalState.position) {
        finalStatePositionVec3 = new THREE.Vector3();
        finalStatePositionVec3.fromArray(finalState.position);
    }

    var finalStateRotationArray = null;
    if(finalState.rotation) {
        finalStateRotationArray = finalState.rotation;
    }

    this.initialPosition = initialPositionVec3;
    this.initialRotation = initialRotationVec3;

    this.changes = [];
    
    var currentChange = {};

    if(typeof sceneTime !== "number") {
        throw "SceneTimeLineAnimatedObject sceneTime is not a number";
    }
    currentChange.start = sceneTime;

    if(typeof duration !== "number" || duration < 0) {
        throw "SceneTimeLineAnimatedObject duration is incorrect";
    }
    currentChange.duration = duration;
    currentChange.end = sceneTime + duration;

    if(typeof finalState !== "object") {
        throw "SceneTimeLineAnimatedObject final state is not provided";
    }
    currentChange.finalPosition = finalStatePositionVec3;
    currentChange.finalRotation = finalStateRotationArray;
    currentChange.initialRotation  = initialPositionVec3;
    currentChange.initialPosition  = initialRotationVec3;

    // set default easing
    currentChange.easingFunction =  (typeof easingFunction === "function") ? easingFunction : FLOW.Animation.Easing.Linear.None;

    this.changes.push(currentChange);
};

FLOW.SceneTimeline.AnimatedObject.prototype.add = function(sceneTime, duration, initialState, finalState, easingFunction) {
    

    var finalStatePositionVec3 = null;
    if(finalState.position) {
        finalStatePositionVec3 = new THREE.Vector3();
        finalStatePositionVec3.fromArray(finalState.position);
        if(this.changes.length > 0) {
            for(var i = this.changes.length - 1; i >=0; i--) {
                if(this.changes[i].finalPosition) {
                    finalStatePositionVec3.sub(this.changes[i].finalPosition);
                }
            }
        }
    }

    var finalStateScaleVec3 = null;
    if(finalState.scale) {
        finalStateScaleVec3 = new THREE.Vector3();
        finalStateScaleVec3.fromArray(finalState.scale);
        if(this.changes.length > 0) {
            for(var i = this.changes.length - 1; i >=0; i--) {
                if(this.changes[i].finalScale) {
                    finalStateScaleVec3.sub(this.changes[i].finalScale);
                }
            }
        }
    }

    var finalStateRotationArray = null;
    if(finalState.rotation) {
        finalStateRotationArray = finalState.rotation;
    }
    
    var currentChange = {};

    if(typeof sceneTime !== "number") {
        throw "SceneTimeLineAnimatedObject sceneTime is not a number";
    }
    currentChange.start = sceneTime;

    if(typeof duration !== "number" || duration < 0) {
        throw "SceneTimeLineAnimatedObject duration is incorrect";
    }
    currentChange.duration = duration;
    currentChange.end = sceneTime + duration;

    if(typeof finalState !== "object") {
        throw "SceneTimeLineAnimatedObject final state is not provided";
    }
    currentChange.finalPosition = finalStatePositionVec3;
    currentChange.finalScale    = finalStateScaleVec3;
    currentChange.finalRotation = finalStateRotationArray;

    //currentChange.initialRotation  = initialPositionVec3;
    //currentChange.initialPosition  = initialRotationVec3;

    // set default easing
    currentChange.easingFunction =  (typeof easingFunction === "function") ? easingFunction : FLOW.Animation.Easing.Linear.None;

    this.changes.push(currentChange);
};

FLOW.SceneTimeline.AnimatedObject.prototype.getLastValueOfParameter = function(parameter) {
    var value;
    if(parameter == "scale") {
        value = "finalScale";
    } else if(parameter == "position") {
        value = "finalPosition";
    } else if(parameter.substr(0,8) == "rotation"){
        value = "finalRotation";
    } else {
        throw "FLOW.SceneTimeline.AnimatedObject.getLastValueOfParameter unrecognized parameter "+parameter;
    }
    for(var i = this.changes.length - 1; i >= 0; i--) {
        if(this.changes[i][value]) {
            return this.changes[i][value];
        }
    }
    return this.object.scale.clone();
};

FLOW.SceneTimeline.AnimatedObject.prototype.getObjectPosition = function(time, originalPosition) {
    var position = null;
    var rotation = [null, null, null];
    var scale = null;

    // get objects own position based on it's history
    for(i in this.changes) {
        if(this.changes[i].end <= time) {

            if(this.changes[i].finalPosition) {
                if(!position) {
                    position = new THREE.Vector3();
                }
                position.add(this.changes[i].finalPosition);
            } 
            else if(this.changes[i].finalRotation) {
                for(var j = 0; j < 3; j++) {
                    if(this.changes[i].finalRotation[j] != null) {
                        if(rotation[j]) {
                            rotation[j] = this.changes[i].finalRotation[j];
                        } else {
                            rotation[j] = this.changes[i].finalRotation[j];
                        }
                    }
                }
            }
            else if(this.changes[i].finalScale) {
                if(!scale) {
                    scale = new THREE.Vector3();
                }
                scale.add(this.changes[i].finalScale);
            }
        } else if(this.changes[i].start < time && this.changes[i].end > time) {
            var t =(time - this.changes[i].start) / this.changes[i].duration;
            var t = this.changes[i].easingFunction(time - this.changes[i].start);

            if(this.changes[i].finalPosition) {
                if(!position) {
                    position = new THREE.Vector3();
                }
                var value = this.changes[i].finalPosition.clone()
                value.multiplyScalar(t)
                position.add(value);
            } 
            else if(this.changes[i].finalRotation) {
                for(var j = 0; j < 3; j++) {
                    if(this.changes[i].finalRotation[j] != null) {
                        if(rotation[j]) {
                            rotation[j] = this.changes[i].finalRotation[j]*t;
                        } else {
                            rotation[j] = this.changes[i].finalRotation[j]*t;
                        }
                    }
                }
            }
            else if(this.changes[i].finalScale) {
                if(!scale) {
                    scale = new THREE.Vector3();
                }
                var value = this.changes[i].finalScale.clone()
                value.multiplyScalar(t)
                scale.add(value);
            } 
        } else {
            break;
        }
    }

    if(rotation[0] != null) {
        rotation[0] = rotation[0] - this.initialRotation.x
    }

    if(rotation[1] != null) {
        rotation[1] = rotation[1] - this.initialRotation.y
    }

    if(rotation[2] != null) {
        rotation[2] = rotation[2] - this.initialRotation.z
    }


    if(originalPosition) {
        this.object.worldToLocal(originalPosition);

        var euler = new THREE.Euler(...rotation)

        var v = originalPosition;
        var parentRotation = this.object.rotation.clone();

        var xaxis = new THREE.Vector3(1,0,0);
        var yaxis = new THREE.Vector3(0,1,0);
        var zaxis = new THREE.Vector3(0,0,1);

        xaxis.applyAxisAngle(yaxis,  -parentRotation.y);
        xaxis.applyAxisAngle(zaxis,  -parentRotation.z);
        yaxis.applyAxisAngle(zaxis,  -parentRotation.z);

        yaxis.normalize();
        xaxis.normalize();

        v.applyAxisAngle(yaxis, euler.y);
        v.applyAxisAngle(zaxis, euler.z);
        v.applyAxisAngle(xaxis, euler.x);

        if(scale != null) {
            var originalScale = this.object.scale.clone();
            scale.divide(originalScale)
            originalPosition.multiply(scale)
        }

        this.object.localToWorld(originalPosition);
                
        if(position != null) {
            var adjustment = this.object.getWorldPosition();
            this.object.parent.localToWorld(position)
            position.sub(adjustment)
            originalPosition.add(position);
        }
                
    }

    // get objects parent rotation
    if(this.object.parent && this.object.parent != this.app.scene) {
        
        var animatedParent = null;
        var parent = this.object.parent
        // direct parent might not be animated
        while(animatedParent == null && parent != null) {
            var animatedParent = this.app.timeline.findObject(parent);
            parent = parent.parent
        }

        if(animatedParent != null && animatedParent.object != this.app.scene) {
            var animatedParentPosition = animatedParent.getObjectPosition(time, originalPosition);
        }
    }

    return originalPosition;
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.SceneTimeline;
}));
