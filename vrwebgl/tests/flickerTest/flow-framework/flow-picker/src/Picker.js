
var THREE = THREE || require('three');

var FLOW = FLOW || {};
FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.EventUtils = FLOW.EventUtils || require("flow-event-utils");


/**
 {
     object: THREE.Object3D,
     colliders: [],
     near: number
     far: number,
     wait: true | false default false
     onCollisionStarted: function({distance, }),
     onCollisionFinished: function(),
     onSelected: function([distance, ])
 }
 */
FLOW.Picker = function(params) {
    FLOW.EventUtils.Observable.call(this);
    if (typeof(params) !== "object") throw "ERROR: No paramaters provided.";
    if (!(params.object instanceof THREE.Object3D)) throw "ERROR: A THREE.Object3D is needed in order to initialize the instance.";
    this._params = params;
    this._colliderObjects = [];
    this.addColliders(params.colliders);
    params.near = params.near || 0;
    params.far = params.far || Infinity;
    this._raycaster = new THREE.Raycaster();
    this._isCamera = params.object instanceof THREE.Camera;
    this.camera = (this._isCamera) ? params.object : null
    this._z = new THREE.Vector3();
    this._pos = new THREE.Vector3();
    params.onCollisionStarted = typeof(params.onCollisionStarted) === "function" ? params.onCollisionStarted : false;
    params.onCollisionFinished = typeof(params.onCollisionFinished) === "function" ? params.onCollisionFinished : false;
    params.onSelected = typeof(params.onSelected) === "function" ? params.onSelected : false;
    //params.onCollided = typeof(params.onCollided) === "function" ? params.onCollided : false;
    this.wait = params.wait || false;
    this.waitTime = params.waitTime || FLOW.Picker.GazeCursor.GAZE_AND_WAIT_TIME;
    this.repeatTime = (typeof params.repeatTimeout !== "undefined") ? params.repeatTimeout : FLOW.Picker.GazeCursor.REPEAT_TIME;
    this.showCursorOnlyOnLookDown = typeof params.showCursorOnlyOnLookDown != "undefined" ? params.showCursorOnlyOnLookDown : true;
    this.cursor = new FLOW.Picker.GazeCursor(this._params.object, null, {showCursorOnlyOnLookDown: this.showCursorOnlyOnLookDown, distance: params.cursorDistance});
    this.action = null;
    this.currentIntersection = null;
    this.currentCollider = null;
    this.pointThreshold = params.pointThreshold || 1;

    this.updateCursorPosition = (typeof params.updateCursorPosition !== "undefined") ? params.updateCursorPosition : true;
    if(this.updateCursorPosition) {
        this.frustum = new THREE.Frustum();
    }

    currentTime = 0;
    lookDownAngle = (typeof this._params.lookDownAngle !== 'undefined') ? this._params.lookDownAngle*(Math.PI/180) : -30*(Math.PI/180);
    lookUpAngle = (typeof this._params.lookUpAngle !== 'undefined') ? this._params.lookUpAngle*(Math.PI/180) : -20*(Math.PI/180);
    panelDistance = (typeof this._params.panelDistance !== 'undefined') ? this._params.panelDistance : 2;

    this.controlPanel = null;
    priorVisibility = false;
    initialCameraPosition = new THREE.Vector3();
    currentCameraPosition = new THREE.Vector3();
    initialPanelPosition = new THREE.Vector3();
};

FLOW.OOPUtils.prototypalInheritance(FLOW.Picker, FLOW.EventUtils.Observable);

FLOW.Picker.prototype._findColliderRecursive = function(object) {
    var collider = null;
    for (var i = 0; !collider && i < this._colliders.length; i++) {
        if (object === this._colliders[i].object) {
            collider = this._colliders[i];
        }
    }
    // If collider was not found, look for it up in the hierarchy.
    if (!collider) {
        if (!object.parent) throw "ERROR: Could not find the corresponding collider for the give object. This should never happen!";
        this._findColliderRecursive(object.parent);
    }
    return collider;
};

FLOW.Picker.prototype.update = function() {
    this._params.object.updateMatrixWorld();
    var objectMatrixWorld = this._params.object.matrixWorld.elements;
    this._z.set(objectMatrixWorld[8], objectMatrixWorld[9], objectMatrixWorld[10]);
    if (this._isCamera) {
        this._z.negate();
    }
    this._pos.set(objectMatrixWorld[12], objectMatrixWorld[13], objectMatrixWorld[14]);

    this._raycaster.params.Points.threshold  = this.pointThreshold;

    this._raycaster.set(this._pos, this._z);
    var intersections = this._raycaster.intersectObjects(this._colliderObjects, true);
    var collider = null;
    this.intersections = intersections;
    if(intersections.length > 0) {
      if(this.order) {
        this.order(intersections);
      } 
      for(var i in intersections) {
          collider = this._findColliderRecursive(intersections[i].object);
          if(collider) {
              this.currentIntersection = intersections[i];
              if(this.currentCollider && this.currentCollider.index != intersections[i].index) {
                this.cursor.stop()
              }
              collider.index = intersections[i].index
              break;
          }
      }

      if(!collider) {
          console.warn("FLOW.Picker.update no colliders found");
      } else {

          if(collider.onCollisionStarted && !this.cursor.startHandled) {
            collider.onCollisionStarted(this.currentIntersection);
            this.cursor.startHandled = true;
          }

          if (this.wait) {
              if (!this.cursor.isGazing) {
                  this.currentCollider = collider;
                  this.cursor.start();
              } else if (this.cursor.isGazing && this.cursor.progress < 1) {
                  var now = new Date().getTime();
                  var millisecondsPassed = now - this.cursor.timerStartTime;
                  var timeout = (typeof collider.waitTime === 'undefined') ? this.waitTime : collider.waitTime;
                  var progress = millisecondsPassed / timeout;
                  var distance = this.camera.getWorldPosition().distanceTo(this.currentIntersection.point)
                  this.cursor.update(progress, distance);
              }
          }

          if ((this.currentCollider != collider && this.currentCollider) && this.cursor.isGazing) {
              this.cursor.stop();
              this.action = null;
              if(this.currentCollider && this.currentCollider.onCollisionFinished) {
                  this.currentCollider.onCollisionFinished();
              }
              this.currentCollider = null;
          }


          if (this.cursor.progress == 1) {
              if (!this.cursor.eventHandled) {
                  if (typeof collider.onSelected === "function") {
                      this.action = collider.onSelected;
                      this.action(this.currentIntersection);
                  }
                  this.cursor.eventHandled = true;
              }

              if (!collider.collides && this._params.onCollisionStarted) {
                  this._params.onCollisionStarted.call(this, collider.object, this.currentIntersection);
              }

              if (this._params.onSelected) {
                  this._params.onSelected.call(this, collider.object, this.currentIntersection);
              }

              if (collider.onSelected && ((this.wait && this.cursor.progress == 1) || !this.wait)) {
                  if (!currentTime) {
                      currentTime = window.performance.now();
                  }
                  var delta = window.performance.now() - currentTime;
                  var timeout = (typeof collider.repeatTime !== 'undefined') ? collider.repeatTime : this.repeatTime;
                  if (timeout != -1 && delta >= timeout) { //-1 means don't repeat fire
                      currentTime = 0;
                      this.action = collider.onSelected;
                      this.action(this.currentIntersection);
                  }
              }

              collider.collides = true; //Keeps track of whether this is a new collision
              collider.partOfIntersection = true;
          }
      }
    } else {
        this.cursor.stop();
        this.action = null;
        if(this.currentCollider && this.currentCollider.onCollisionFinished) {
            this.currentCollider.onCollisionFinished();
        }
        this.currentCollider = null;  

        if( this.updateCursorPosition ) {
            // sets cursor positon based on closest visible collider

            this.camera.updateMatrix(); 
            this.camera.updateMatrixWorld(); 
            this.camera.matrixWorldInverse.getInverse( this.camera.matrixWorld );
            this.frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices ( this.camera.projectionMatrix, this.camera.matrixWorldInverse ) );

            checkVisibility = function(object) {
                if(object.visible == false) {
                    return false;
                } else {
                    if(object.parent) {
                        return checkVisibility(object.parent)
                    } else {
                        return true;
                    }
                }
            }

            var distance = this.cursor.params.distance;
            var collidersVisible = false;
            for( var item of this._colliderObjects ) {
                var distanceFromItem = this.camera.getWorldPosition().distanceTo(item.getWorldPosition());
                if( distanceFromItem < distance && distanceFromItem > 0 ) {
                    let visible = checkVisibility(item) 
                    if( this.frustum.intersectsObject(item) && visible ) {
                        distance = distanceFromItem;
                        collidersVisible = true;
                    }
                }
            }

            if( collidersVisible ) {
                this.cursor.update(0, distance);
            }

        }
    }

    for (var i = 0; i < this._colliders.length; i++) {
        var collider = this._colliders[i];
        if (!collider.partOfIntersection && collider.collides) {
            if (collider.onCollisionFinished) {
                collider.onCollisionFinished.call(this, collider.object, this.currentIntersection);
            }
            if (this._params.onCollisionFinished) {
                this._params.onCollisionFinished.call(this, collider.object, this.currentIntersection);
            }
            collider.collides = false;
        }
        // Prepare collider for next update
        collider.partOfIntersection = false;
    }

    if(this._isCamera && this.controlPanel) {

      var cameraLookVector = this.cameraLookDir(this._params.object);

      if(cameraLookVector.y < lookDownAngle) {
        if(!priorVisibility) {           

            if (this.showCursorOnlyOnLookDown){
                this.cursor.show();
            }

            var worldDir = this.camera.getWorldDirection();
            worldDir.setLength(panelDistance);

            if (this.dialog) {
                this.dialog.object.position.copy(worldDir);
                this.dialog.object.quaternion.copy(this.camera.quaternion);
                this.dialog.object.visible = true;
            } else {
                this.controlPanel.object.position.copy(worldDir);
                this.controlPanel.object.quaternion.copy(this.camera.quaternion);
                this.controlPanel.show();
            }

            priorVisibility = true;
        }
     } else if(cameraLookVector.y > lookUpAngle && priorVisibility) {
          if (this.showCursorOnlyOnLookDown){
              this.cursor.hide();
          }
          if (this.dialog)
              this.dialog.object.visible = false;
          else
              this.controlPanel.hide();
          priorVisibility = false;
      }
    }
    return this;
};

FLOW.Picker.prototype.click = function(mouseEvent) {

    var mouse = new THREE.Vector2();
    mouse.x = ( mouseEvent.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( mouseEvent.clientY / window.innerHeight ) * 2 + 1;

    this._raycaster.setFromCamera( mouse, this.camera );
    var intersections = this._raycaster.intersectObjects(this._colliderObjects, true);
    var collider = null;
    if(intersections.length > 0) {
      for(i in intersections) {
          collider = this._findColliderRecursive(intersections[i].object);
          if(collider) {
              this.currentIntersection = intersections[i];
              break;
          }
      }

      if(!collider) {
          console.warn("FLOW.Picker.update no colliders found");
      } else { 
          this.action = collider.onCollisionStarted || collider.onSelected;
          this.action(this.currentIntersection);
      }
    }
};

FLOW.Picker.prototype.performAction = function() {
  if(this.action) {
    this.action(this.currentIntersection);
  }
};

FLOW.Picker.prototype.addColliders = function(colliders) {
    if (!(colliders instanceof Array)){
        colliders= [colliders];
    }
    if (! this._colliders){
        this._colliders = new Array(colliders.length);
    }
    for (var i = 0; i < colliders.length; i++) {
        var collider = colliders[i];
        this._colliders.push({ object: collider,
                               collides: false,
                               partOfIntersection: false,
                               onCollisionStarted: typeof(collider.onCollisionStarted) === "function" ? collider.onCollisionStarted : false,
                               onCollisionFinished : typeof(collider.onCollisionFinished) === "function" ? collider.onCollisionFinished : false,
                               onSelected : typeof(collider.onSelected) === "function" ? collider.onSelected : false,
                               waitTime: collider.waitTime,
                               repeatTime: collider.repeatTime
        } );
        this._colliderObjects.push(collider);
    }
    return this;
};

FLOW.Picker.prototype.getNumberOfColliders = function() {
    return this._colliders.length;
};

FLOW.Picker.prototype.getCollider = function(i) {
    if (i < 0 || i >= this._colliders.length) throw "ERROR: The given index '" + i + "' is out of bounds. Possible range is between 0 and " + this._colliders.length;
    return this._colliderObjects[i];
};

FLOW.Picker.prototype.getColliderFromObject = function(obj) {
    for (var i = 0; i < this._colliderObjects.length; ++i){
        if (this._colliderObjects[i] == obj) {
            return this._colliders[i];
        }
    }
};

FLOW.Picker.prototype.removeCollider = function(collider) {
    if (typeof collider === "object") {
        for (var i = 0; i < this._colliderObjects.length; ++i){
            if (this._colliderObjects[i] == collider) {
                this._colliders.splice(i, 1);
                this._colliderObjects.splice(i, 1);
                break;
            }
        }
    } else {
        if (collider < 0 || collider >= this._colliders.length) throw "ERROR: The given index '" + i + "' is out of bounds. Possible range is between 0 and " + this._colliders.length;
        this._colliders.splice(collider, 1);
        this._colliderObjects.splice(collider, 1);
    }
    return this;
};


FLOW.Picker.prototype.removeAllColliders = function() {
    this._colliders = [];
    this._colliderObjects = [];
    return this;
};

FLOW.Picker.prototype.setOnCollisionStarted = function(onCollisionStarted) {
    this._params.onCollisionStarted = typeof(onCollisionStarted) === "function" ? onCollisionStarted : false;
    return this;
};

FLOW.Picker.prototype.setOnCollisionFinished = function(onCollisionFinished) {
    this._params.onCollisionFinished = typeof(onCollisionFinished) === "function" ? onCollisionFinished : false;
    return this;
};

FLOW.Picker.prototype.setOnSelected = function(onSelected) {
    this._params.onSelected = typeof(onSelected) === "function" ? onSelected : false;
    return this;
};

FLOW.Picker.prototype.cameraLookDir = function(camera) {
    var vector = new THREE.Vector3(0, 0, -1);
    vector.applyEuler(camera.rotation, camera.rotation.order);
    return vector;
}

FLOW.Picker.GazeCursor = function(camera, gaze, params) {
    this.params = params || {};
    this.params.distance = params.distance || 100;
    this.showCursorOnlyOnLookDown = typeof this.params.showCursorOnlyOnLookDown != "undefined"  ? this.params.showCursorOnlyOnLookDown : true;

    var cursorMaterial = new THREE.MeshBasicMaterial({
        color: 0xAAAAAA,
        opacity: 0.5,
        depthTest: false,
        depthWrite: false,
        transparent: true
    });
    var cursorGeometry = new THREE.RingGeometry(0.005, 0.01, 50, 1, 0, Math.PI * 2);
    this.object = new THREE.Mesh(cursorGeometry, cursorMaterial);
    this.distance = params.distance;
    this.object.position.set(0, 0, -this.distance);
    this.object.scale.set(this.distance, this.distance, this.distance);
    this.object.visible =   ! this.showCursorOnlyOnLookDown;
    this.object.renderOrder = Infinity;
    camera.add(this.object);
    this.isGazing = false;
    this.eventHandled = false;
    this.startHandled = false;
    this.progress = (this.wait) ? 0 : 1;
};

FLOW.Picker.GazeCursor.GAZE_AND_WAIT_TIME = 2000;

FLOW.Picker.GazeCursor.REPEAT_TIME = -1;//125; //-1 means don't repeat fire

FLOW.Picker.GazeCursor.prototype.show = function(){
    this.object.visible =true;
};

FLOW.Picker.GazeCursor.prototype.hide = function(){
    this.object.visible = false;
};

FLOW.Picker.GazeCursor.prototype.update = function(progress, distance){
    this.distance = distance;
    this.object.position.z = -distance;
    this.object.scale.set(distance, distance, distance);
    if( (1 - progress) < 0.005)
      progress = 1;
    var angle = progress*Math.PI*2
    this.progress = progress;
    this.object.parent.remove(this.progressBar);
    this.progressBar = this.updatedProgressBar(angle);
    this.object.parent.add(this.progressBar);
};

FLOW.Picker.GazeCursor.prototype.updatedProgressBar = function(angle) {
  cursorMaterial = new THREE.MeshBasicMaterial({
    color: 0xAAAAFF,
    opacity: 0.5,
    depthTest: false,
    depthWrite: false,
    transparent: true
  });
  var cursorGeometry = new THREE.RingGeometry( 0.01, 0.015, 50, 1, Math.PI/2, angle);
  var progressBar = new THREE.Mesh( cursorGeometry, cursorMaterial );
  progressBar.position.set(0, 0, -this.distance);
  progressBar.scale.set(this.distance, this.distance, this.distance);
  progressBar.renderOrder = Infinity;
  return progressBar;
};

FLOW.Picker.GazeCursor.prototype.start = function() {
    this.timerStartTime =  new Date().getTime();
    this.isGazing = true;
    this.progress = 0;
    this.eventHandled = false;
    this.startHandled = false;
};

FLOW.Picker.GazeCursor.prototype.stop = function() {
    this.isGazing = false;
    this.progress = 0;
    this.object.parent.remove(this.progressBar);

    this.distance = this.params.distance;
    this.object.position.z = -this.distance;
    this.object.scale.set(this.distance, this.distance, this.distance);
};


(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Picker;
}));
