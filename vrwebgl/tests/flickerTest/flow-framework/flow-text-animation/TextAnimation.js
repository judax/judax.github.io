var THREE = THREE || require('three');

var FLOW = FLOW || {};

FLOW.Text = FLOW.Text || require('flow-text');
FLOW.Animation = FLOW.Animation || require('flow-animation');
FLOW.MathUtils = FLOW.MathUtils || require("flow-math-utils");

/**
 * Routines for animating text.

 */
FLOW.TextAnimation = function(params) {

    return this;
};

FLOW.TextAnimation.dropWords = function(originalString, dropWordsList,  text, animations) {

    var newDropWords = [];
    for (var i=0; i< dropWordsList.length; i++) {
        newDropWords.push( dropWordsList[ i] -1 ); //dropwords is 1-based
    }
    var newAnimations = this.animationSimpleCreator( text,
        { elementType:"words", items: newDropWords,  finalPositionType:"moreDistant", distance:1.5, positionY:25,
            randomize: {width:10, height :3, depth :5}, duration: 2000, rippleDelay: 10});

    for (var j = 0; j< newAnimations.length; j++) {
        animations.addAnimation(newAnimations[j]);
        newAnimations[j].start();
    }

};

//Creates the positions for moving the letters
FLOW.TextAnimation.remapTargetText = function(originalString, dropWordsList, mapLetters, text, textParams, app) {
    var calculateNewString = function (originalString, dropWords) {
        if (!dropWords) {
            return ""
        }
        var retString = "";
        var originalWords = originalString.split(" ");
        originalWords.forEach(function (item, index, array) {
            if (dropWords.indexOf(index + 1) == -1) { //not zero-based
                retString += item + " ";
            }
        }, this);

        return retString;
    };


    var targetString = calculateNewString(originalString, dropWordsList);

    //TODO: use textParams to set these params
    var targetText = new FLOW.Text.Text({
        text: targetString,
        font: app.fonts.getFont("DejaVu Sans Mono"),
        fontSize: 1,
        wrapType: FLOW.Text.WrapType.WRAP_BY_WIDTH,
        wrapValue: 20,
        align: 'center'
    });
    var textMesh = targetText.buildMesh();
    textMesh.frustumCulled = false;
    targetText.disableComputeBounds();
    var textPosition = text.getPosition();
    targetText.setPosition([textPosition.x, textPosition.y, textPosition.z]);
    FLOW.Text.lookAt(targetText, app.camera);

    FLOW.TextAnimation.remapCharacters(text, mapLetters, targetText, app.animations);
};

/**
 *
 * @param text The FLOW.Text.Text object that contains the letters
 * @param mapLetters given a set of letters starting with the start letter up until the end letter, move that
 *    block of letters to the position of the targetText letter number newStart.
 *    ie. mapLetters: [ {start:7, end:29, newStart:1 }   ] (1-based) (inclusive of end)
 * @param targetText The FLOW.Text.Text object that contains the positions of where the letters should move to.
 *  NOTE: the targetText is never displayed to the user, it is merely created to discover the letter positions.
 *  @app the application's FLOW.Animations object
 *
 */
FLOW.TextAnimation.remapCharacters = function(text, mapLetters, targetText, animations) {
    var characterMap = FLOW.TextAnimation._convertMapLettersToCharacterMap(mapLetters);

    var reLayoutAnimations = FLOW.TextAnimation.animationSimpleCreator(text,   {
        elementType: "characters", finalPositionType: "mapToTarget",
        characterMap: characterMap, targetPositionsText: targetText,
        rippleDelay: 10, initialDelay: 1800, duration: 1000
    });

    for (var j = 0; j < reLayoutAnimations.length; j++) {
        animations.addAnimation(reLayoutAnimations[j]);
        reLayoutAnimations[j].start();
    }
};


/**
 * convert from mapLetters
 *  ie. mapLetters: [ {start:7, end:29, newStart:1 }   ] (1-based) (inclusive of end)
 *  to characterMap :[ [6,0], [7,1],[8,2] .. [28,22] (not 1-based)
 * @param mapLetters
 * @returns {Array}
 */
FLOW.TextAnimation._convertMapLettersToCharacterMap = function( mapLetters) {
    var retArray = [];
    for (var i=0; i< mapLetters.length;i++) {
        var def = mapLetters[i];
        var index =0;
        for (var j=def.start-1; j< def.end; j++){
            retArray[ j] = def.newStart-1 +index ;//+1 because not zero based
            index++;
        }
    }
    return retArray
};


/**
 * Ex:
 var newAnimations = this.animationSimpleCreator( panel.text,
 { elementType:"words", items: newDropWords,  finalPositionType:"moreDistant", distance:1.5, positionY:25,
     randomize: {width:10, height :3, depth :5}, duration: 2000, rippleDelay: 10});

 newAnimations = newAnimations.concat( this.animationSimpleCreator(text,
 {elementType: "characters", rippleDelay:rippleDelay, initialDelay: nextStartDelay, bezierType: "waterflowbezier", duration:4000} ) );

 * @param texts
 * @param params
 * @returns {Array}
 */
FLOW.TextAnimation.animationSimpleCreator = function(texts, params) {

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
        var bezierPoints = FLOW.TextAnimation.waterflowbezier( params.waterflowbezierSize, params.waterflowbezierCenter );
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
                initialPositions = FLOW.TextAnimation.elementPosition({element: element});
            } else  if (initialPositionType == "random") {
                initialPositions = FLOW.TextAnimation.randomDistribution(initialPositions, {
                    center: randomCenter,
                    bounds: {width: randomWidth, height: randomHeight, depth: randomDepth}
                });
            }
            var finalPositions = [];


            if (finalPositionType == "current") {
                finalPositions = FLOW.TextAnimation.elementPosition({element: element});
            } else if (finalPositionType == "random") {
                finalPositions = FLOW.TextAnimation.randomDistribution(finalPositions, {
                    center: randomCenter,
                    bounds: {width: randomWidth, height: randomHeight, depth: randomDepth}
                });
            } else if (finalPositionType == "moreDistant") {
                finalPositions = FLOW.TextAnimation.moreDistant(finalPositions, {
                    currentPosition: FLOW.TextAnimation.elementPosition({element: element}),
                    distance: distance,
                    positionY: params.positionY,
                    randomize: params.randomize
                })
            } else if (finalPositionType == "mapToTarget"){
                finalPositions = FLOW.TextAnimation.mapToTarget( finalPositions,{
                    currentPosition: FLOW.TextAnimation.elementPosition({element: element}),
                    index: k,
                    targetPositionsText: params.targetPositionsText,
                    characterMap: params.characterMap
                }); //will return null if this element shouldn't be animated
            }

            if (bezierPoints) {
                finalPositions = FLOW.TextAnimation.addBezierPoints(finalPositions, {
                    center: randomCenter, bezierPoints: bezierPoints, bezierVariation: 2,
                    bounds: {width: randomWidth, height: randomHeight, depth: randomDepth}
                })
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

FLOW.TextAnimation.elementPosition= function(params) {
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
};

FLOW.TextAnimation.moreDistant = function(positionsArray, params) {
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

};

FLOW.TextAnimation.randomDistribution= function(positionsArray, params) {
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
};



FLOW.TextAnimation.mapToTarget= function(positionsArray, params) {
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
};

FLOW.TextAnimation.waterflowbezier = function( size, centerPoint  ){
    var size = size*0.01 || 0.1;
    var centerPoint =centerPoint ||  {x:-1, y:4, z:-4};
    var jsPoint = function (x, z) {
        return  new THREE.Vector3((x-250)*size + centerPoint.x, centerPoint.y,   (z - 125)*size + centerPoint.z )  ;
    };
    //generated at // http://jsdraw2d.jsfiction.com/demo/curvesbezier.htm
    //    by drawing a circle then through the center
    //these points start with 0,0 at upper left instead of centered
    var points = [new jsPoint(178,32),new jsPoint(135,133),new jsPoint(133,272),new jsPoint(311,323),new jsPoint(529,222),
        new jsPoint(525,52),new jsPoint(357,15),new jsPoint(181,66),new jsPoint(216,116),new jsPoint(424,123),new jsPoint(439,173),
        new jsPoint(355,186),new jsPoint(75,246) ];
    return points;
};

FLOW.TextAnimation.addBezierPoints = function(array, params) {
    //array needs to already have
   /* if (array.length) { //TODO: this block should be used when the animation is starting with the position...
        if (Array.isArray(array[0])) {
            var xs = array[0];
            var ys = array[1];
            var zs = array[2];
        } else {
            xs = [array[0]];
            ys = [array[1]];
            zs = [array[2]];
        }
    } else {*/
        xs = [];
        ys = [];
        zs = [];
  //  }
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
    if (array.length) { //we will end at this position
            xs.push( array[0]);
            ys.push(  array[1]);
            zs.push(  array[2]);
    }
    return [xs, ys, zs];
};


(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.TextAnimation;
}));