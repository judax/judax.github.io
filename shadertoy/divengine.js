
(function() {
	DivEngine = {};

	DivEngine.Div = function() {
		// Hierarchy data
		var _parent = null;
		var _children = [];
		// Transformation data
		var _translation = vec3.create();
		var _rotationRadians = vec3.create();
		var _rotationDegrees = vec3.create();
		var _scale = vec3.create();
		var _pivot = vec3.create();
		var _pivotNeg = vec3.create();
		vec3.set(_scale, 1, 1, 1);
		var _width = 0;
		var _height = 0;
		var _sizeIsDirty = false;
		var _localMatrix = mat4.create();
		var _localMatrixDirty = false;
		var _worldMatrix = mat4.create();
		var _worldMatrixDirty = false;
		// Visual properties
		var _scrollable = false;
		var _visible = true;
		var _opacity = 1;
		var _opacityDirty = false;
		// Animation
		var _tweens = [];
		// The actual DIV dom element
		var _div = document.createElement("div");

		// Setup the div dom element
		_div.style.opacity = _opacity;
		_div.style.position = "absolute";
		// TODO: What could happen if the execution environment does not support the CSS transfrom origin?
		_div.style.webkitTransformOrigin = "0% 0%";
		// By default, all the div dom elements are added to the document body
		document.body.appendChild(_div);

		// By default, this object does not have a parent, so it is stored in the DivEngine.
		_mainDivs.push(this);

		// Force the scrollable feature
		DivEngine.setScrollable(_div, _scrollable);

		// Setup the correct matrix assignment function depending on the underlying execution environment
		var _useWebkitPrefix = document.body.style.webkitTransform !== undefined;
	    var _setMatrix;
	    if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
	        _setMatrix = function(element, matrix) {
	            element.style.zIndex = (matrix[14] * 1000000) | 0;    // fix for Firefox z-buffer issues
	            element.style.transform = "matrix3d(" + DivEngine.matrixToString(matrix) + ")";
	        };
	    }
	    else if (_useWebkitPrefix) {
	        _setMatrix = function(element, matrix) {
	            element.style.webkitTransform = "matrix3d(" + DivEngine.matrixToString(matrix) + ")";
	        };
	    }
	    else {
	        _setMatrix = function(element, matrix) {
	            element.style.transform = "matrix3d(" + DivEngine.matrixToString(matrix) + ")";
	        };
	    }

	    // The public API
		this.getChildrenCount = function() {
			return _children.length;
		};

		this.getChildAt = function(index) {
			if (index < 0 || index >= _children.length) throw "Request child's index '" + index + "' is out of bounds.";
			return _children[index];
		};

		this.setChildAt = function(child, index) {
			if (!child) throw "Cannot set a child that does not exist at position '" + index + "'.";
			_children[index] = child;
			return this;
		};

		this.addChild = function(child) {
			var index;
			if (!child) throw "Cannot add a child that does not exist.";
			index = _children.indexOf(child);
			if (index < 0) {
				_children.push(child);
				child.setParent(this);
				if (_useDOMHierarchy) {
					_div.appendChild(child.getDiv());
				}
			}
			return this;
		};

		this.indexOfChild = function(child) {
			return _children.indexOf(child);
		}

		this.containsChild = function(child) {
			return _children.indexOf(child) >= 0;
		};

		this.removeChild = function(child) {
			var index;
			if (!child) return this;
			do {
				index = _children.indexOf(child);
				if (index >= 0) {
					_children.splice(index, 1);
					child.setParent(null);
					if (_useDOMHierarchy) {
						_div.removeChild(child.getDiv());
					}
				}
			} while(index >= 0);
			return this;
		};

		this.removeChildAt = function(index) {
			if (index < 0 || index >= _children.length) throw "The index '" + index + "' of the child to be removed is out of bounds.";
			var child = _children[index];
			_children.splice(index, 1);
			child.setParent(null);
			return this;
		};

		this.setParent = function(parent) {
			if (_parent !== parent) {
				if (_parent !== null) {
					_parent.removeChild(this);
				}
				_parent = parent;
				if (_parent !== null) {
					_parent.addChild(this);
					removeDivFromMainDivs(this);
				}
				else {
					// As this object is an orphan, add it to the main divs container.
					_mainDivs.push(this);
				}
				_worldMatrixDirty = true;
			}
			return this;
		};

		this.getParent = function() {
			return _parent;
		};

		this.getDiv = function() {
			return _div;
		};

		this.getLocalMatrix = function() {
			return _localMatrix;
		};

		this.getWorldMatrix = function() {
			return _worldMatrix;
		};

		this.isLocalMatrixDirty = function() {
			return _localMatrixDirty;
		};

		this.isWorldMatrixDirty = function() {
			return _worldMatrixDirty;
		};

		this.forceLocalMatrixToBeDirty = function() {
			_localMatrixDirty = true;
			return this;
		};

		this.forceWorldMatrixToBeDirty = function() {
			_worldMatrixDirty = true;
			return this;
		};

		this.setScrollable = function(scrollable) {
			scrollable = !!scrollable;
			if(_scrollable !== scrollable) {
				_scrollable = scrollable;
				DivEngine.setScrollable(_div, _scrollable);
			}
			return this;
		};

		this.isScrollable = function() {
			return _scrollable;
		};

		this.setVisible = function(visible) {
			_visible = !!visible;
			return this;
		};

		this.isVisible = function() {
			return _visible;
		};

		this.update = function() {
			var i;
			// Update the local transformation matrix if it is dirty
			if (_localMatrixDirty) {
				// Calculate the roation angles in radians
				_rotationRadians[0] = _rotationDegrees[0] * DivEngine.PI_DIV_180;
				_rotationRadians[1] = _rotationDegrees[1] * DivEngine.PI_DIV_180;
				_rotationRadians[2] = _rotationDegrees[2] * DivEngine.PI_DIV_180;

				// Negate the pivot
				vec3.negate(_pivotNeg, _pivot);

				// Compose the local transformation matrix: translation * pivotTranslate * scale * rotation * pivotNegTranslate
				mat4.identity(_localMatrix);
				mat4.translate(_localMatrix, _localMatrix, _translation);
				mat4.translate(_localMatrix, _localMatrix, _pivot);
				mat4.scale(_localMatrix, _localMatrix, _scale);
				mat4.rotateX(_localMatrix, _localMatrix, _rotationRadians[0]);
				mat4.rotateY(_localMatrix, _localMatrix, _rotationRadians[1]);
				mat4.rotateZ(_localMatrix, _localMatrix, _rotationRadians[2]);
				mat4.translate(_localMatrix, _localMatrix, _pivotNeg);

				// As the local matrix was dirty, the world matrix should be too!
				_worldMatrixDirty = true;
			}
			// Update the world transformation matrix if it is dirty
			if (_parent === null) {
				if (_worldMatrixDirty) {
					mat4.copy(_worldMatrix, _localMatrix);
				}
			}
			else {
				_worldMatrixDirty = _worldMatrixDirty || _parent.isWorldMatrixDirty();
				if (_worldMatrixDirty) {
					// mat4.identity(_worldMatrix);
					mat4.multiply(_worldMatrix, _parent.getWorldMatrix(), _localMatrix);
				}
			}
			// Update the children
			for (i = 0; i < _children.length; i++) {
				_children[i].update();
			}
			// Setup the CSS for the corresponding div
			if (_visible && (_opacity > 0 || _opacityDirty)) {
				if (_sizeIsDirty) {
					_div.style.width = _width + "px";
					_div.style.height = _height + "px";
					_sizeIsDirty = false;
				}
				if (_useDOMHierarchy) {
					if (_localMatrixDirty) {
						_setMatrix(_div, _localMatrix);
					}
				}
				else {
					if (_worldMatrixDirty) {
						_setMatrix(_div, _worldMatrix);
					}
				}
				if (_opacityDirty) {
					_div.style.opacity = _opacity;
					_opacityDirty = false;
				}
			}
			// Always set the local and world matrices to dirty
			_localMatrixDirty = false;
			_worldMatrixDirty = false;
		};

		this.setX = function(x) {
			_localMatrixDirty = _localMatrixDirty || _translation[0] !== x;
			_translation[0] = x;
			return this;
		};

		this.getX = function() {
			return _translation[0];
		};

		this.setY = function(y) {
			_localMatrixDirty = _localMatrixDirty || _translation[1] !== y;
			_translation[1] = y;
			return this;
		};

		this.getY = function() {
			return _translation[1];
		};

		this.setPosition = function(x, y) {
			this.setX(x);
			this.setY(y);
			return this;
		};

		this.setWidth = function(width) {
			_sizeIsDirty = _sizeIsDirty || _width !== width;
			_width = width;
			return this;
		};

		this.getWidth = function() {
			return _width;
		};

		this.setHeight = function(height) {
			_sizeIsDirty = _sizeIsDirty || _height !== height;
			_height = height;
			return this;
		};

		this.getHeight = function() {
			return _height;
		}

		this.setSize = function(width, height) {
			this.setWidth(width);
			this.setHeight(height);
			return this;
		};

		this.setScaleX = function(x) {
			_localMatrixDirty = _localMatrixDirty || _scale[0] !== x;
			_scale[0] = x;
			return this;
		};

		this.getScaleX = function() {
			return _scale[0];
		};

		this.setScaleY = function(y) {
			_localMatrixDirty = _localMatrixDirty || _scale[1] !== y;
			_scale[1] = y;
			return this;
		};

		this.getScaleY = function() {
			return _scale[1];
		};

		this.setScale = function(x, y) {
			this.setScaleX(x);
			this.setScaleY(y);
			return this;
		};

		this.setRotateX = function(angleInDegrees) {
			_localMatrixDirty = _localMatrixDirty || _rotationDegrees[0] !== angleInDegrees;
			_rotationDegrees[0] = angleInDegrees;
			return this;
		};

		this.getRotateX = function() {
			return _rotationDegrees[0];
		};

		this.setRotateY = function(angleInDegrees) {
			_localMatrixDirty = _localMatrixDirty || _rotationDegrees[1] !== angleInDegrees;
			_rotationDegrees[1] = angleInDegrees;
			return this;
		};

		this.getRotateY = function() {
			return _rotationDegrees[1];
		};

		this.setRotateZ = function(angleInDegrees) {
			_localMatrixDirty = _localMatrixDirty || _rotationDegrees[2] !== angleInDegrees;
			_rotationDegrees[2] = angleInDegrees;
			return this;
		};

		this.getRotateZ = function() {
			return _rotationDegrees[2];
		};

		this.setRotate = function(xAngleInDegrees, yAngleInDegrees, zAngleInDegrees) {
			this.setRotateX(xAngleInDegrees);
			this.setRotateY(yAngleInDegrees);
			this.setRotateZ(zAngleInDegrees);
			return this;
		};

		this.setPivotX = function(x) {
			_localMatrixDirty = _localMatrixDirty || _pivot[0] !== x;
			_pivot[0] = x;
			return this;
		};

		this.getPivotX = function() {
			return _pivot[0];
		};

		this.setPivotY = function(y) {
			_localMatrixDirty = _localMatrixDirty || _pivot[1] !== y;
			_pivot[1] = y;
			return this;
		};

		this.getPivotY = function() {
			return _pivot[1];
		};

		this.setPivot = function(x, y) {
			this.setPivotX(x);
			this.setPivotY(y);
			return this;
		};

		/**
		* params = {
		*   MANDATORY
		* 		type:
		*		to:
		* 		easing: 
		*	OPTIONAL
		*		from:
		*		duration:
		*		yoyo:
		*		repeat:
		* }
		*/
		this.createTween = function(params) {
			var from = params.from;
			if (typeof(from) === "undefined") {
				switch(params.type) {
					case DivEngine.TWEEN_TYPE_TRANSLATION:
						from = { x: _translation[0], y: _translation[1] };
						break;
					case DivEngine.TWEEN_TYPE_SCALE:
						from = { x: _scale[0], y: _scale[1] };
						break;
					case DivEngine.TWEEN_TYPE_ROTATION:
						from = { x: _rotationDegrees[0], y: _rotationDegrees[1], z: _rotationDegrees[2] };
						break;
					case DivEngine.TWEEN_TYPE_OPACITY:
						from = { opacity: _opacity };
						break;
					default:
						throw "Unknown tween type.";
						break;
				}
			}
			var tween = new TWEEN.Tween(from);
			// Set the DivEngine specific attributes
			tween.params = params;
			// Setup the tween
			tween.to(params.to, params.duration);
			tween.easing(params.easing);
			typeof(params.yoyo) !== "undefined" && tween.yoyo(params.yoyo);
			typeof(params.repeat) !== "undefined" && tween.repeat(params.repeat);
			var self = this;
			tween.onUpdate(function() {
				switch(tween.params.type) {
					case DivEngine.TWEEN_TYPE_TRANSLATION:
						typeof(this.x) !== "undefined" && self.setX(this.x);
						typeof(this.y) !== "undefined" && self.setY(this.y);
						break;
					case DivEngine.TWEEN_TYPE_SCALE:
						typeof(this.x) !== "undefined" && self.setScaleX(this.x);
						typeof(this.y) !== "undefined" && self.setScaleY(this.y);
						break;
					case DivEngine.TWEEN_TYPE_ROTATION:
						typeof(this.x) !== "undefined" && self.setRotateX(this.x);
						typeof(this.y) !== "undefined" && self.setRotateY(this.y);
						typeof(this.z) !== "undefined" && self.setRotateZ(this.z);
						break;
					case DivEngine.TWEEN_TYPE_OPACITY:
						typeof(this.opacity) !== "undefined" && self.setOpacity(this.opacity);
						break;
				}
				tween.params.onUpdate && tween.params.onUpdate.apply(this, Array.prototype.slice(arguments));
			});
			tween.onComplete(function() {
				tween.params.onComplete && tween.params.onComplete.apply(this, Array.prototype.slice(arguments));
				var index = _tweens.indexOf(tween);
				if (index < 0) throw "This is not possible! Could not find the tween among the created tweens.";
				_tweens.splice(index, 1);
				tween.onUpdate(null);
				tween.onComplete(null);
				tween = null;
				self = null;
			});
			tween.start();
			tween.tweening = true;
			_tweens.push(tween);
			return this;
		};

		this.destroyAllTweens = function() {
			var i;
			for (i = 0; i < _tweens.length; i++) {
				_tweens[i].stop();
				_tweens.onComplete(null);
				_tweens.onUpdate(null);
			}
			_tweens = [];
			return this;
		};

		this.isTweening = function() {
			return _tweens.length > 0;
		};

		this.setOpacity = function(opacity) {
			_opacityDirty = _opacityDirty || _opacity !== opacity;
			_opacity = opacity;
			return this;
		};

		this.getOpacity = function(opacity) {
			return _opacity;
		};

		this.destroy = function() {
			if (_parent !== null) {
				if (_useDOMHierarchy) {
					_parent._div.removeChild(_div);
				}
				_parent.removeChild(this);
			}
			else {
				removeDivFromMainDivs(this);
			}
			return this;
		};

		return this;
	}

	DivEngine.matrixToString = function(m) {
        // var s = "" + 
        // 	m[ 0].toFixed(10) + ", " + m[ 1].toFixed(10) + ", " + m[ 2].toFixed(10) + ", " + m[ 3].toFixed(10) + ", " + 
        // 	m[ 4].toFixed(10) + ", " + m[ 5].toFixed(10) + ", " + m[ 6].toFixed(10) + ", " + m[ 7].toFixed(10) + ", " + 
        // 	m[ 8].toFixed(10) + ", " + m[ 9].toFixed(10) + ", " + m[10].toFixed(10) + ", " + m[11].toFixed(10) + ", " + 
        // 	m[12].toFixed(10) + ", " + m[13].toFixed(10) + ", " + m[14].toFixed(10) + ", " + m[15].toFixed(10);
        // var s = "" + 
        // 	m[ 0] + "," + m[ 1] + "," + m[ 2] + "," + m[ 3] + "," + 
        // 	m[ 4] + "," + m[ 5] + "," + m[ 6] + "," + m[ 7] + "," + 
        // 	m[ 8] + "," + m[ 9] + "," + m[10] + "," + m[11] + "," + 
        // 	m[12] + "," + m[13] + "," + m[14] + "," + m[15];
        var s = '';
        for (var i = 0; i < 15; i++) {
            s += (m[i] < 0.000001 && m[i] > -0.000001) ? '0,' : m[i] + ',';
        }
        s += m[15];

        // console.log(s);
        return s;
	};

	DivEngine.preventDefault = function(e) {
		e.preventDefault();
		return false;
	};

	DivEngine.stopPropagation = function(e) {
		e.stopPropagation();
		return this;
	};

	DivEngine.PI_DIV_180 = Math.PI / 180.0;

	var _useDOMHierarchy = true;
	var _useDevicePixelRatio = true;

    DivEngine.normalizeRequestAnimationFrame = function() {
        var raf = 
        	window.requestAnimationFrame || 
        	window.webkitRequestAnimationFrame ||
        	window.mozRequestAnimationFrame ||
        	window.oRequestAnimationFrame ||
        	window.msRequestAnimationFrame ||
        	function(callback) {
            	window.setTimeout( callback, 1000 / 60 );
        	};
        window.requestAnimationFrame = raf;
        return this;
    };

    DivEngine.setScrollable = function(element, scrollable) {
    	scrollable = !!scrollable;
    	if (typeof(element._divengine_scrollable) === "undefined") {
    		// As this is the first time, create the attribute and force to set the scrollable
    		element._divengine_scrollable = !scrollable;
    	}
    	if (element._divengine_scrollable !== scrollable) {
    		element._divengine_scrollable = scrollable;
			if (scrollable) {
				element.style.overflow = "hidden";
				element.style.webkitOverflowScrolling = "touch";
				element.addEventListener("touchstart", DivEngine.stopPropagation);
				element.addEventListener("touchmove", DivEngine.stopPropagation);
				element.removeEventListener("touchstart", DivEngine.preventDefault);
				element.removeEventListener("touchmove", DivEngine.preventDefault);
			}
			else {
				element.style.overflow = "hidden";
				element.addEventListener("touchstart", DivEngine.preventDefault);
				element.addEventListener("touchmove", DivEngine.preventDefault);
				element.removeEventListener("touchstart", DivEngine.stopPropagation);
				element.removeEventListener("touchmove", DivEngine.stopPropagation);
			}
		}
		return this;
    };

    // All the divs without a parent end up in this container.
    var _mainDivs = [];

    function removeDivFromMainDivs(div) {
		// As this object has a new parent, check if it should be removed from the main divs container.
		var index = _mainDivs.indexOf(div);
		if (index >= 0) {
			_mainDivs.splice(index, 1);
		}
		return this;
    }

    DivEngine.TWEEN_TYPE_TRANSLATION = 0;
    DivEngine.TWEEN_TYPE_SCALE = 1;
    DivEngine.TWEEN_TYPE_ROTATION = 2;
    DivEngine.TWEEN_TYPE_OPACITY = 3;

    // This function initializes the environment to prepare it for a single page web application
    DivEngine.initialize = function(params) {
    	// The body should not be scrolleable. Use divs for that.
    	DivEngine.setScrollable(document.body, false);
    	// Set the viewport to be full screen
    	var viewport = document.getElementById("viewport");
    	if (!viewport) {
    		viewport = document.createElement("meta");
    		viewport.name = "viewport";
    		viewport = document.getElementsByTagName("head")[0].appendChild(viewport);
    	}
    	viewport.setAttribute("content", "width=device-width; initial-scale=1.0; maximum-scale=1.0;");
    	// Setting the body's margin to 0 provides a real full single page application
    	document.body.style.margin = 0;
    	// Normalize the requestAnimationFrame function
    	DivEngine.normalizeRequestAnimationFrame();

    	return this;
    };

    DivEngine.update = function() {
    	var i;
    	TWEEN.update();
    	for (i = 0; i < _mainDivs.length; i++) {
    		_mainDivs[i].update();
    	}
    	return this;
    };

    DivEngine.finalize = function() {
    	return this;
    };

})();


