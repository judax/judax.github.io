var THREE = THREE || require('three');

var FLOW = FLOW || {};

FLOW.MathUtils = FLOW.MathUtils || require("flow-math-utils");
FLOW.Text = FLOW.Text || require("flow-text");

// Include a performance.now polyfill
(function () {

	if ('performance' in window === false) {
		window.performance = {};
	}

	// IE 8
	Date.now = (Date.now || function () {
		return new Date().getTime();
	});

	if ('now' in window.performance === false) {
		var offset = window.performance.timing && window.performance.timing.navigationStart ? window.performance.timing.navigationStart
		                                                                                    : Date.now();

		window.performance.now = function () {
			return Date.now() - offset;
		};
	}

})();

FLOW.Animation = {};

// Code adapted from tween.js
FLOW.Animation.Easing = {
	Linear: {
		None: function (t) {
			return t;
		}
	},
	Quadratic: {
		In: function (t) {
			return t * t;
		},
		Out: function (t) {
			return t * (2 - t);
		},
		InOut: function (t) {
			if ((t *= 2) < 1) {
				return 0.5 * t * t;
			}
			return - 0.5 * (--t * (t - 2) - 1);
		}
	},
	Cubic: {
		In: function (t) {
			return t * t * t;
		},
		Out: function (t) {
			return --t * t * t + 1;
		},
		InOut: function (t) {
			if ((t *= 2) < 1) {
				return 0.5 * t * t * t;
			}
			return 0.5 * ((t -= 2) * t * t + 2);
		}
	},
	Quartic: {
		In: function (t) {
			return t * t * t * t;
		},
		Out: function (t) {
			return 1 - (--t * t * t * t);
		},
		InOut: function (t) {
			if ((t *= 2) < 1) {
				return 0.5 * t * t * t * t;
			}
			return - 0.5 * ((t -= 2) * t * t * t - 2);
		}
	},
	Quintic: {
		In: function (t) {
			return t * t * t * t * t;
		},
		Out: function (t) {
			return --t * t * t * t * t + 1;
		},
		InOut: function (t) {
			if ((t *= 2) < 1) {
				return 0.5 * t * t * t * t * t;
			}
			return 0.5 * ((t -= 2) * t * t * t * t + 2);
		}
	},
	Sinusoidal: {
		In: function (t) {
			return 1 - Math.cos(t * Math.PI / 2);
		},
		Out: function (t) {
			return Math.sin(t * Math.PI / 2);
		},
		InOut: function (t) {
			return 0.5 * (1 - Math.cos(Math.PI * t));
		}
	},
	Exponential: {
		In: function (t) {
			return t === 0 ? 0 : Math.pow(1024, t - 1);
		},
		Out: function (t) {
			return t === 1 ? 1 : 1 - Math.pow(2, - 10 * t);
		},
		InOut: function (t) {
			if (t === 0) {
				return 0;
			}
			if (t === 1) {
				return 1;
			}
			if ((t *= 2) < 1) {
				return 0.5 * Math.pow(1024, t - 1);
			}
			return 0.5 * (- Math.pow(2, - 10 * (t - 1)) + 2);
		}
	},
	Circular: {
		In: function (t) {
			return 1 - Math.sqrt(1 - t * t);
		},
		Out: function (t) {
			return Math.sqrt(1 - (--t * t));
		},
		InOut: function (t) {
			if ((t *= 2) < 1) {
				return - 0.5 * (Math.sqrt(1 - t * t) - 1);
			}
			return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
		}
	},
	Elastic: {
		In: function (t) {
			if (t === 0) {
				return 0;
			}
			if (t === 1) {
				return 1;
			}
			return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
		},
		Out: function (t) {
			if (t === 0) {
				return 0;
			}
			if (t === 1) {
				return 1;
			}
			return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
		},
		InOut: function (t) {
			if (t === 0) {
				return 0;
			}
			if (t === 1) {
				return 1;
			}
			t *= 2;
			if (t < 1) {
				return -0.5 * Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
			}
			return 0.5 * Math.pow(2, -10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI) + 1;
		}
	},
	Back: {
		In: function (t) {
			var s = 1.70158;
			return t * t * ((s + 1) * t - s);
		},
		Out: function (t) {
			var s = 1.70158;
			return --t * t * ((s + 1) * t + s) + 1;
		},
		InOut: function (t) {
			var s = 1.70158 * 1.525;
			if ((t *= 2) < 1) {
				return 0.5 * (t * t * ((s + 1) * t - s));
			}
			return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
		}
	},
	Bounce: {
		In: function (t) {
			return 1 - FLOW.Animation.Easing.Bounce.Out(1 - t);
		},
		Out: function (t) {
			if (t < (1 / 2.75)) {
				return 7.5625 * t * t;
			}
			else if (t < (2 / 2.75)) {
				return 7.5625 * (t -= (1.5 / 2.75)) * t + 0.75;
			}
			else if (t < (2.5 / 2.75)) {
				return 7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375;
			}
			else {
				return 7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375;
			}
		},
		InOut: function (t) {
			if (t < 0.5) {
				return FLOW.Animation.Easing.Bounce.In(t * 2) * 0.5;
			}
			return FLOW.Animation.Easing.Bounce.Out(t * 2 - 1) * 0.5 + 0.5;
		}
	}
};

FLOW.Animation.Interpolation = {
	Linear: function (v, t) {
		var m = v.length - 1;
		var f = m * t;
		var i = Math.floor(f);
		var fn = FLOW.Animation.Interpolation.Utils.Linear;
		if (t < 0) {
			return fn(v[0], v[1], f);
		}
		if (t > 1) {
			return fn(v[m], v[m - 1], m - f);
		}
		return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);
	},
	Bezier: function (v, t) {
		var b = 0;
		var n = v.length - 1;
		var pw = Math.pow;
		var bn = FLOW.Animation.Interpolation.Utils.Bernstein;
		for (var i = 0; i <= n; i++) {
			b += pw(1 - t, n - i) * pw(t, i) * v[i] * bn(n, i);
		}
		return b;
	},
	CatmullRom: function (v, t) {
		var m = v.length - 1;
		var f = m * t;
		var i = Math.floor(f);
		var fn = FLOW.Animation.Interpolation.Utils.CatmullRom;
		if (v[0] === v[m]) {
			if (t < 0) {
				i = Math.floor(f = m * (1 + t));
			}
			return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);
		} else {
			if (t < 0) {
				return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
			}
			if (t > 1) {
				return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
			}
			return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);
		}
	},
	Utils: {
		Linear: function (p0, p1, t) {
			return (p1 - p0) * t + p0;
		},
		Bernstein: function (n, i) {
			var fc = FLOW.Animation.Interpolation.Utils.Factorial;
			return fc(n) / fc(i) / fc(n - i);
		},
		Factorial: (function () {
			var a = [1];
			return function (n) {
				var s = 1;
				if (a[n]) {
					return a[n];
				}
				for (var i = n; i > 1; i--) {
					s *= i;
				}
				a[n] = s;
				return s;
			};
		})(),
		CatmullRom: function (p0, p1, p2, p3, t) {
			var v0 = (p2 - p0) * 0.5;
			var v1 = (p3 - p1) * 0.5;
			var t2 = t * t;
			var t3 = t * t2;
			return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
		}
	}
};

/**
{
	initialValues: [],
	finalValues: [],
	offset: number,
	length: number,
	easingFunction: FLOW.Animation.Easing,
	interpolationFunction: FLOW.Animation.Interpolation,
	initialDelay: number,
	duration: number,
	yoyo: boolean,
	repeat: number,
	onStarted: function,
	onUpdated: function(values, deltas, t, data),
	onCompleted: function,
	onStopped: function

	You can animate based on currentValue instead of having to set the initial value by using these three params:
	    attributeObject: eval(animToFrame.object),
        attributes: [animToFrame.attributes],
        setInitialValueFromCurrentValue: true,
}
*/
FLOW.Animation.Animation = function(params) {
    if ( typeof params.initialValues == "undefined" && !params.setInitialValueFromCurrentValue ) {
    	throw "ERROR: Cannot create an animation without the initial values, unless setInitialValueFromCurrentValue used with attributeObject and attributes";
    }

    params.initialValues = ( typeof params.initialValues != "undefined") ?
        						(params.initialValues instanceof Array ) ? params.initialValues : [params.initialValues] 
        							: null;

    if ( typeof params.finalValues == "undefined" ) {
        throw "ERROR: Cannot create an animation without the final values";
    }
    params.finalValues = params.finalValues instanceof Array ? params.finalValues : [params.finalValues] ;
    params.offset = typeof(params.offset) === "number" ? params.offset : 0;
    params.attributes = params.attributes? params.attributes instanceof Array? params.attributes : [params.attributes] : null;
    params.length = typeof(params.length) === "number" ? params.length :
        params.initialValues instanceof Array ? params.initialValues.length : params.finalValues.length;
	this._offsetPlusLength = params.offset + params.length;
	//if (this._offsetPlusLength > params.initialValues.length || this._offsetPlusLength > params.finalValues.length) //TODO: reimplement to consider attributes.length
	//	throw "ERROR: The given offset '" + params.offset + "' and length '" + params.length + "' do not match with the given initial '" + params.initialValues.length + "' and/or final '" + params.finalValues.length + "' values array lengths.";

	// Make a copy of the final values.
	// Although this is only necessary in the case of interpolations (there is at least one final value that is an array),
	// we will do the copy in all cases.
	this._finalValues = new Array(params.length);
	for (var i = params.offset, j = 0; i < this._offsetPlusLength; i++, j++) {
		var finalValue = params.finalValues[i];
		if (typeof(finalValue) === "number") {
			this._finalValues[j] = finalValue;
		}
		else if (finalValue instanceof Array) {
			var newFinalValueArray = new Array(finalValue.length + 1);
			newFinalValueArray[0] = params.initialValues[i];
			for (var k = 0; k < finalValue.length; k++) {
				newFinalValueArray[k + 1] = finalValue[k];
			}
			this._finalValues[j] = newFinalValueArray;
		}
		else {
			throw "ERROR: The final values include an element that is either a number or an array.";
		}
	}
	params.easingFunction = typeof(params.easingFunction) === "function" ? params.easingFunction : FLOW.Animation.Easing.Linear.None;
	params.interpolationFunction = typeof(params.interpolationFunction) === "function" ? params.interpolationFunction : FLOW.Animation.Interpolation.Linear;
	params.initialDelay = typeof(params.initialDelay) === "number" ? params.initialDelay : 0;
	params.duration = typeof(params.duration) === "number" ? params.duration : 1000;
	params.yoyo = typeof(params.yoyo) === "boolean" ? params.yoyo : false;
	this._repeat = typeof(params.repeat) === "number" ? params.repeat : 0;
	params.onStarted = typeof(params.onStarted) === "function" ? params.onStarted : false;
	params.onUpdated = typeof(params.onUpdated) === "function" ? params.onUpdated : false;
	params.onCompleted = typeof(params.onCompleted) === "function" ? params.onCompleted : false;
    params.onStopped = typeof(params.onStopped) === "function" ? params.onStopped : false;
    params.removeSelfAfterCompleted = typeof(params.removeSelfAfterCompleted) === "function" ? params.removeSelfAfterCompleted : false;

    params.data = params.data; //Data is an object to pass into the onUpdated

    params.attributeObject;
    params.setInitialValueFromCurrentValue ;
    if(params.attributeObject && !params.name) {
    	params.name = params.attributeObject.uuid
	} 


    this._params = params;
	this._started = false;
	this._completed = false;
	this._reversed = false;
	this._values = new Array(params.length);
    if (! params.setInitialValueFromCurrentValue) {
        for (var i = 0, j = params.offset; i < this._values.length; i++, j++) {
            this._values[i] = params.initialValues[j];
        }
    }
	this._deltas = new Array(params.length);
	this._lastT = -1;

	return this;
};

FLOW.Animation.Animation.prototype.start = function(offset, time) {
	this._started = true;
	this._completed = false;
	this._paused = false;
	this._onStartedCalled = false;
	this._startTime = time !== undefined ? time : window.performance.now();
	this._startTime += this._params.initialDelay;
	// start from the provided time
	if(offset) {
		this._startTime -= offset;
	}
	this._repeat = typeof(this._params.repeat) === "number" ? this._params.repeat : 0;
	return this;
};

FLOW.Animation.Animation.prototype.stop = function() {
	if (!this._started) {
		return this;
	}
	//this.update(this._startTime + this._params.duration);
	this._started = false;
	if (this._params.onStopped) {
		this._params.onStopped.call(this);
	}
	return this;
};

FLOW.Animation.Animation.prototype.play = function() {
	if(this._paused) {
		time = window.performance.now();
		this._startTime += time - this._pauseTime;
		this._paused = false;
	}
}

FLOW.Animation.Animation.prototype.setTime = function(offset) {
	currentTime = window.performance.now()
	this._startTime = currentTime;
	this._startTime -= offset;

	if(this._paused) {
		this._pauseTime = currentTime;
	}

	this.update();
};

FLOW.Animation.Animation.prototype.pause = function() {
	if(!this._paused) {
		this._paused = true;
		this._pauseTime = window.performance.now();
	}
};

FLOW.Animation.Animation.prototype.update = function(time) {
	time = time !== undefined ? time : window.performance.now();
	if (time < this._startTime) {
		return this;
	}

	if (!this._onStartedCalled) {
		if (this._params.onStarted) {
			this._params.onStarted.call(this, this._params.data);
		}
		this._onStartedCalled = true;
	}

    if (! this._notFirstTime){

    	
        this._notFirstTime = true;
        if ( this._params.setInitialValueFromCurrentValue && this._params.attributeObject && this._params.attributes ){
            this._params.initialValues =[];
            for (var o=0; o < this._params.attributes.length; o++) {
                var dotNestings = this._params.attributes[ o].split(".");
                var attr = this._params.attributeObject[dotNestings[0]];
                if (attr instanceof THREE.Vector3){ // assumes that if there is a parameter that is a Vector3, like "scale",then it is the only parameter
                    this._params.initialValues[0] = attr.x;
                    this._params.initialValues[1] = attr.y;
                    this._params.initialValues[2] = attr.z;
                    break;
                } else {
                    for (var p = 1; p < dotNestings.length; p++) {
                        attr = attr[dotNestings[p]];
                    }
                    this._params.initialValues[o] = attr;
                }
            }
        }
    }

	var t = (time - this._startTime) / this._params.duration;
	t = t > 1 ? 1 : t;
	this.progress = (time - this._startTime);

	t = this._params.easingFunction(t);

	if (this._lastT === t) return this;
	this._lastT = t;

	for (var i = this._params.offset, j = 0; i < this._offsetPlusLength; i++, j++) {
		var initialValue = this._reversed ? this._finalValues[j] : this._params.initialValues[i];
		var finalValue = this._reversed ? this._params.initialValues[i] : this._finalValues[j];
		var value;
		if (finalValue instanceof Array) {
			value = this._params.interpolationFunction(finalValue, t);
		}
		else {
			value = initialValue + (finalValue - initialValue) * t;
		}
		this._deltas[j] = value - this._values[j];
		this._values[j] = value;
	}

	if (this._params.onUpdated) {
		this._params.onUpdated.call(this, this._values, this._deltas, t, this._params.data, this._params.attributeObject, this._params.attributes);
	}

	if (t === 1) {
		if (this._repeat > 0) {
			if (isFinite(this._repeat)) {
				this._repeat--;
			}
			if (this._params.yoyo) {
				this._reversed = !this._reversed;
			}
			this._startTime = time + this._params.initialDelay;
			return this;
		} else {
			this._completed = true;
			if (this._params.onCompleted) {
				this._params.onCompleted.call(this);
                if (this._params.removeSelfAfterCompleted) {
                    if  (this._params.removeSelfAfterCompleted instanceof FLOW.Animation.Animations ){
                        this._params.removeSelfAfterCompleted.removeAnimation(this);
                    } else {
                        throw "Animation unable to removeSelf unless removeSelfAfterCompleted is a FLOW.Animation.Animations";
                    }
                }
			}
			return this;
		}
	}
	return this;
};

FLOW.Animation.Animation.prototype.setOnUpdated = function(onUpdated) {
	this._params.onUpdated = typeof(onUpdated) === "function" ? onUpdated : false;
	return this;
};

FLOW.Animation.Animation.prototype.setOnStarted = function(onStarted) {
	this._params.onStarted = typeof(onStarted) === "function" ? onStarted : false;
	return this;
};

FLOW.Animation.Animation.prototype.setOnCompleted = function(onCompleted) {
	this._params.onCompleted = typeof(onCompleted) === "function" ? onCompleted : false;
	return this;
};

FLOW.Animation.Animation.prototype.setOnStopped = function(onStopped) {
	this._params.onStopped = typeof(onStopped) === "function" ? onStopped : false;
	return this;
};

FLOW.Animation.Animation.prototype.isStarted = function() {
	return this._started;
};

FLOW.Animation.Animation.prototype.isCompleted = function() {
	return this._completed;
};

FLOW.Animation.Animations = function(animations) {
	this._animations = [];
	if (animations instanceof Array) {
		for (var i = 0; i < animations.length; i++) {
			this.addAnimation(animations[i]);
		}
	}
	return this;
};

FLOW.Animation.Animations.prototype.addAnimation = function(animationOrParams) {
	var animation = null;
	if (animationOrParams instanceof FLOW.Animation.Animation) {
		animation = animationOrParams;
	}
	else if (typeof(animationOrParams) === "object") {
		animation = new FLOW.Animation.Animation(animationOrParams);
	}
	else {
		throw "ERROR: Unknown parameter. Please, pass an instance of a FLOW.Animation.Animation or an object with the parameters to create one.";
	}
	this._animations.push(animation);
	return this;
};



FLOW.Animation.Animations.prototype.addRippleAnimations = function(params) {
    for (var i=0; i<params.finalValues.length; i+=3){
        this._animations.push( new FLOW.Animation.Animation({
            initialValues: [params.initialValues[i], params.initialValues[i+1], params.initialValues[i+2]],
            finalValues: [params.finalValues[i],params.finalValues[i+1],params.finalValues[i+2]],
            initialDelay: params.rippleDelay * i/3,
            data:{index: i, data: params.additionalValues ? [params.additionalValues[i],
					params.additionalValues[i+1], params.additionalValues[i+2] ] : null},
            duration: params.duration,
            onStarted: params.onStarted,
            onUpdated: params.onUpdated
        }));
    }
    return this;
};



FLOW.Animation.Animations.prototype.startAllAnimations = function( onAllCompleted) {
    for (var i=0; i<this._animations.length; i++){
        this._animations[i].start();
    }
    if (onAllCompleted) {
        this._animations[this._animations.length - 1].setOnCompleted(onAllCompleted);
    }
    return this;
};


FLOW.Animation.Animations.prototype.animationSimpleCreator = function(texts, params) {

    function elementPosition(params) {
        if (!params.element) {
            console.error("elementPosition needs an element!");
        }
        var retPosition = [];
        var position = params.element.getPosition();
        // Store the char pos as the  position
        retPosition.push(position.x);
        retPosition.push(position.y);
        retPosition.push(position.z);
        return retPosition;
    }

    function moreDistant(positionsArray, params) {
        if (! params.distance) {
            console.error("moreDistance needs a distance!");
        }
        if (! params.currentPosition) {
            console.error("moreDistance needs a currentPosition!");
        }
        params.positionY = params.positionY? params.positionY : 1;
        params.randomize = params.randomize || {width:0, height :0, depth :0};

        var randomX = (0.5 - Math.random()) * params.randomize.width;
        var randomY = (0.5 - Math.random()) * params.randomize.height;
        var randomZ =  (0.5 - Math.random()) * params.randomize.depth;


        var retPosition = [];
        // Store the char pos as the  position
        retPosition.push(params.currentPosition[0] + (params.currentPosition[0] * params.distance) + randomX);
        retPosition.push(params.currentPosition[1] + params.positionY + randomY);
        retPosition.push(params.currentPosition[2]+ (params.currentPosition[2] * params.distance) + randomZ);


        return retPosition;

    }

    function randomDistribution(positionsArray, params) {
        if (!params.center || !params.center.hasOwnProperty("x")) {
            console.error("randomDistribution needs a center point!");
        }
        if (!params.bounds || !params.bounds.hasOwnProperty("width")) {
            console.error("randomDistribution needs a bounds!");
        }


        var x = params.center.x + (0.5 - Math.random()) * params.bounds.width;
        var y = params.center.y + (0.5 - Math.random()) * params.bounds.height;
        var z = params.center.z + (0.5 - Math.random()) * params.bounds.depth;
        //retPositions.push(x, y, z);

        if (positionsArray) {
            if (Array.isArray(positionsArray[0])) {
                positionsArray[0].push(x);
                positionsArray[1].push(y);
                positionsArray[2].push(z);
            } else {
                positionsArray.push(x, y, z);
            }
        } else {
            console.error("randomDistribution: Positions array can't be null")
        }

        return positionsArray;
    }



    function mapToTarget(positionsArray, params) {
        if (!params.targetPositionsText ) {
            console.error("mapToTarget needs a targetPositions!");
        }
        if (!params.characterMap ) {
            console.error("mapToTarget needs a mapLetters!");
        }
        var targetPositionsText = params.targetPositionsText;
        var numChars = targetPositionsText.getNumberOfCharacters();
        var characterMap = params.characterMap;
        var index = params.index;
        if ( characterMap.hasOwnProperty (index) ){ //&& (index < numChars)
            // if (index < characterMap.length) {
            var targetChar = targetPositionsText.getCharacter(characterMap[index] );
        }  else{
            return null;
        }

        var targetPosition = targetChar.getPosition();

        if (positionsArray) {
            if (Array.isArray(positionsArray[0])) {
                positionsArray[0].push(targetPosition.x);
                positionsArray[1].push(targetPosition.y);
                positionsArray[2].push(targetPosition.z);
            } else {
                positionsArray.push(targetPosition.x, targetPosition.y, targetPosition.z);
            }
        } else {
            console.error("randomDistribution: Positions array can't be null")
        }

        return positionsArray;
    }


    function waterflowbezier( size, centerPoint ){
        size = size? size : 10;
        centerPoint =centerPoint? centerPoint : {x:-1, y:4, z:-4};
        var jsPoint = function (x, z) {
            return  new THREE.Vector3((x-250)/size + centerPoint.x, centerPoint.y,   (z - 125)/size + centerPoint.z )  ;
        }
        //generated at // http://jsdraw2d.jsfiction.com/demo/curvesbezier.htm
        //    by drawing a circle then through the center
        //these points start with 0,0 at upper left instead of centered
        var points = [new jsPoint(178,32),new jsPoint(135,133),new jsPoint(133,272),new jsPoint(311,323),new jsPoint(529,222),
            new jsPoint(525,52),new jsPoint(357,15),new jsPoint(181,66),new jsPoint(216,116),new jsPoint(424,123),new jsPoint(439,173),
            new jsPoint(355,186),new jsPoint(75,246) ];
        return points;
    }

    function addBezierPoints(array, params) {
        //array needs to already have
        if (array.length) {
            if (Array.isArray(array[0])) {
                var xs = array[0];
                var ys = array[1];
                var zs = array[2];
            } else {
                xs = [array[0]];
                ys = [array[1]];
                zs = [array[2]];
            }
        } else {
            xs = [];
            ys = [];
            zs = [];
        }
        if (params.bezierPoints) {
            if (!params.bezierVariation) {
                for (var j = 0; j < params.bezierPoints.length; j++) {
                    xs.push(params.center.x + params.bezierPoints[j].x);
                    ys.push(params.center.y + params.bezierPoints[j].y);
                    zs.push(params.center.z + params.bezierPoints[j].z);
                }
            } else {
                var variation = params.bezierVariation
                for (var j = 0; j < params.bezierPoints.length; j++) {
                    xs.push(params.center.x + params.bezierPoints[j].x + FLOW.MathUtils.randomBetween(-variation / 2, variation / 2));
                    ys.push(params.center.y + params.bezierPoints[j].y + FLOW.MathUtils.randomBetween(-variation / 2, variation / 2));
                    zs.push(params.center.z + params.bezierPoints[j].z + FLOW.MathUtils.randomBetween(-variation / 2, variation / 2));
                }
            }


        }
        return [xs, ys, zs];
    }

    if (!texts) {
        console.error("animationSimpleCreator needs a text!");
        return;
    }
    params = params || {};
    var randomWidth = params.randomWidth || 30;
    var randomHeight = params.randomHeight || 30;
    var randomDepth = params.randomDepth || 30;
    var randomCenter = params.randomCenter || new THREE.Vector3(params.positionX || 0, params.positionY || -5, params.positionZ || 0);
    var circumferenceRadius = params.circumferenceRadius || 10;
    var pointsInCircumference = params.pointsInCircumference || 5;
    var rippleDelay = params.rippleDelay || 100;
    var duration = params.duration || 3000;
    var initialDelay = params.initialDelay || 0;
    var elementType = params.elementType || "characters";
    var bezierType = params.bezierType || null;
    var waterflowbezierSize = params.waterflowbezierSize || null;
    var waterflowbezierCenter = params.waterflowbezierCenter || null;
    var distance = params.distance || 2;
    var items = params.items;

    var initialPositionType = params.initialPositionType || "current";
    var finalPositionType = params.finalPositionType || "random";

    /* var bezierPoints = [];
     var angleDecrement = Math.PI / pointsInCircumference;
     for (var angle = Math.PI; angle >= 0; angle -= angleDecrement) {
     var point = FLOW.MathUtils.calculateVector3InCircunference(circumferenceRadius, angle);
     bezierPoints.push(point);
     }*/
    if (bezierType == "waterflowbezier") {
        var bezierPoints = waterflowbezier( params.waterflowbezierSize, params.waterflowbezierCenter );
    }

    var newAnimations = [];

    if (typeof texts != "array") {
        texts = [texts];
    }
    for (var i = 0; i < texts.length; i++) {
        var text = texts[i];

        var numberOfElements = elementType === "text" ? 1 : elementType === "lines" ? text.getNumberOfLines() :
            elementType === "words" ? text.getNumberOfWords() : text.getNumberOfCharacters();
        var textPos = text.getPosition();

        for (var k = 0; k < numberOfElements; k++) {
            if (items && items.indexOf(k) == -1) {
                continue;
            }
            var getElementFunction = elementType === "text" ? function () {
                return this;
            } :
                elementType === "lines" ? FLOW.Text.Text.prototype.getLine :
                    elementType === "words" ? FLOW.Text.Text.prototype.getWord : FLOW.Text.Text.prototype.getCharacter;
            var element = getElementFunction.call(text, k);

            var initialPositions = [];
            if (initialPositionType == "current") {
                initialPositions = elementPosition({element: element});
            }

            var finalPositions = [];
            if (bezierPoints) {
                finalPositions = addBezierPoints(finalPositions, {
                    center: randomCenter, bezierPoints: bezierPoints, bezierVariation: 2,
                    bounds: {width: randomWidth, height: randomHeight, depth: randomDepth}
                })
            }

            if (finalPositionType == "random") {
                finalPositions = randomDistribution(finalPositions, {
                    center: randomCenter,
                    bounds: {width: randomWidth, height: randomHeight, depth: randomDepth}
                });
            } else if (finalPositionType == "moreDistant") {
                finalPositions = moreDistant(finalPositions, {
                    currentPosition: elementPosition({element: element}),
                    distance: distance,
                    positionY: params.positionY,
                    randomize: params.randomize
                })
            } else if (finalPositionType == "mapToTarget"){
                finalPositions = mapToTarget( finalPositions,{
                    currentPosition: elementPosition({element: element}),
                    index: k,
                    targetPositionsText: params.targetPositionsText,
                    characterMap: params.characterMap
                }); //will return null if this element shouldn't be animated
            }

            if (finalPositions) { //could be null if this element shouldn't be animated
                element.setPosition(initialPositions, initialPositions.length - 3);

                var animation = new FLOW.Animation.Animation({
                    initialValues: initialPositions,
                    initialDelay: initialDelay + k * rippleDelay,
                    duration: duration || 4000,
                    finalValues: finalPositions,
                    interpolationFunction: FLOW.Animation.Interpolation.Bezier,
                    easingFunction: FLOW.Animation.Easing.Quadratic.InOut,
                    onUpdated: function (values, deltas) {
                        this.setPosition(values);
                    }.bind(element)
                });
                newAnimations.push(animation);
            }
        }
    }

    return newAnimations;

};


FLOW.Animation.Animations.prototype.stopAllAnimations = function() {
    for (var i = 0; i < this._animations.length; i++) {
        var anim = this._animations[i];
        anim.stop();
    }
    return this;
};

FLOW.Animation.Animations.prototype.removeAllAnimations = function() {
	this._animations = [];
	return this;
};

FLOW.Animation.Animations.prototype.stopAndRemoveAllAnimations = function() {
    for (var i = 0; i < this._animations.length; i++) {
        var anim = this._animations[i];
        anim.stop();
    }
    this.removeAllAnimations();
    return this;
};

FLOW.Animation.Animations.prototype.getNumberOfAnimations = function() {
	return this._animations.length;
};

FLOW.Animation.Animations.prototype.getAnimation = function(index) {
    if (index < 0 || index >= this._animations.length) throw "ERROR: The given index is out of the current animations list range. There are currently '" + this._animations.length + "' animations available.";
    return this._animations[index];
};

FLOW.Animation.Animations.prototype.findAnimation = function(animation) {
    for (var i = 0; i < this._animations.length; i++) {
        if (this._animations[i] == animation) {
            return this._animations[i];
        }
    }
    return null;
};

FLOW.Animation.Animations.prototype.removeAnimationIndex = function(index) {
    if (index < 0 || index >= this._animations.length) throw "ERROR: The given index is out of the current animations list range. There are currently '" + this._animations.length + "' animations available.";
    this._animations.splice(index, 1);
    return this;
};

FLOW.Animation.Animations.prototype.removeAnimation = function(animation) {
    for (var i = 0; i < this._animations.length; i++) {
        if (this._animations[i] == animation) {
            this.removeAnimationIndex(i);
            return;
        }
    }
};

FLOW.Animation.Animations.prototype.update = function(time) {
	time = time !== undefined ? time : window.performance.now();
	for (var i = 0; i < this._animations.length; i++) {
		var animation = this._animations[i];
		if (animation._started && !animation._completed && !animation._paused) {
			animation.update(time);
		}
	}
	return this;
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Animation;
}));
