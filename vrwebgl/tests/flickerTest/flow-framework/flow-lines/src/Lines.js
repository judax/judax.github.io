var THREE = THREE || require('three');

var FLOW = FLOW || {};

FLOW.Lines = {};

/**
 * Author: Iker Jamardo for Flow Immersive, Inc.
 *
 The whole idea of the library is simple. There are only 2 types: FLOW.Lines.Line and FLOW.Lines.Lines.
 All the lines need to be handled inside an instance of a Lines. The representation/configuration
 of each line is handled by a FLOW.Lines.Line instance. Lines are represented by a FLOW.Lines.Line instance
 that has a list of THREE.Vector3 to define its points. The FLOW.Lines.Line also change width and color of each line.
 The good thing is that these features can be changed at any time. If a line param is changed, resetLine
 or resetAllLines need to be called in the Lines instance.

 By convention, any attributes, classes or functions that start with an underscore '_'
 is considered private so it should never be called or used directly from outside of the library itself.


 The public APIs of the classes are:

 FLOW.Lines.Line = function()

 FLOW.Lines.Line.prototype.addPoint = function(point)

 FLOW.Lines.Line.prototype.removePoint = function(index)

 FLOW.Lines.Line.prototype.removeAllPoints = function()

 FLOW.Lines.Line.prototype.setPoint = function(index, point)

 FLOW.Lines.Line.prototype.getPoint = function(index)

 FLOW.Lines.Line.prototype.getNumberOfPoints = function()

 FLOW.Lines.Line.prototype.arePointsEqual = function( indexA, indexB )

 FLOW.Lines.Line.prototype.getColor = function()

 FLOW.Lines.Line.prototype.setColor = function(color)

 FLOW.Lines.Line.prototype.setWidth = function(width)

 FLOW.Lines.Line.prototype.getWidth = function()



 FLOW.Lines.Lines = function()

 FLOW.Lines.Lines.prototype.addLine = function(FLOW.Lines.Line)

 FLOW.Lines.Lines.prototype.removeLine = function(FLOW.Lines.Line)

 FLOW.Lines.Lines.prototype.resetLine = function(FLOW.Lines.Line)

 FLOW.Lines.Lines.prototype.buildMesh = function()

 FLOW.Lines.Lines.prototype.resetAllLines = function()

 FLOW.Lines.Lines.prototype.getMesh = function()

 FLOW.Lines.Lines.prototype.setSize = function(width, height)
 */

/**
 Use instances of this type to be able to create and modify lines inside the Lines instances.
 */

/**
 Use instances of this type to handle very performant lines. Lines will be created and handled inside instances of this type. To manage a line please, use FLOW.Lines.Lines.Line.
 */
FLOW.Lines.Line = function() {
	this._pointsDirty = false;
	this._pointsArrayHasChanged = false;
	this._points = [];
	this._color = new THREE.Color( 0xffffff );
	this._colorDirty = false;
	this._width = 0.1;
	this._widthDirty = false;
	// Primarily used by Lines
	this._index = -1;
	this._startIndex = -1;
	this._endIndex = -1;
	this._lines = null;
	return this;
};

FLOW.Lines.Line.prototype._checkPointIndex = function(index) {
	if (typeof(index) !== "number") {
		throw "ERROR: The passed point index is not a number.";
	}
	else if (this._points.length === 0) {
		throw "ERROR: There are no points yet so why are you trying to get one at '" + index + "' index?";
	}
	else if (index < 0 || index >= this._points.length) {
		throw "ERROR: The passed point index '" + index + "' is out of bounds. Possible range is 0-" + this._points.length + ".";
	}
	return this;
};

FLOW.Lines.Line.prototype._clean = function() {
	this._pointsDirty = false;
	this._pointsArrayHasChanged = false;
	this._colorDirty = false;
	this._widthDirty = false;
	return this;
};

// Public API
FLOW.Lines.Line.prototype.addPoint = function(point) {
	if (!point || !(point instanceof THREE.Vector3)) {
		throw "ERROR: To add a point, please, provide a THREE.Vector3 instance.";
	}
	this._points.push(point);
	this._pointsArrayHasChanged = true;
	return this;
};

FLOW.Lines.Line.prototype.removePoint = function(index) {
	this._checkPointIndex(index);
	this_points.splice(index, 1);
	this._pointsArrayHasChanged = true;
	return this;
};

FLOW.Lines.Line.prototype.removeAllPoints = function() {
	this.points = [];
	this._pointsArrayHasChanged = true;
	return this;
};

FLOW.Lines.Line.prototype.setPoint = function(index, point) {
	this._checkPointIndex(index);
	if (!point || !(point instanceof THREE.Vector3)) {
		throw "ERROR: To set a point, please, provide a THREE.Vector3 instance.";
	}
	// if (!point.equals(this._points[index])) {
	this._points[index] = point;
	this._pointsDirty = true;
	// }
	return this;
};

FLOW.Lines.Line.prototype.getPoint = function(index) {
	this._checkPointIndex(index);
	return this._points[index];
};

FLOW.Lines.Line.prototype.getNumberOfPoints = function() {
	return this._points.length;
}

FLOW.Lines.Line.prototype.arePointsEqual = function( indexA, indexB ) {
	this._checkPointIndex(indexA);
	this._checkPointIndex(indexB);
	return 	this._points[indexA].equals(this._points[indexB]);
}

FLOW.Lines.Line.prototype.getColor = function() {
	return this._color;
};

FLOW.Lines.Line.prototype.setColor = function(color) {
	if (!color || !(color instanceof THREE.Color)) {
		throw "ERROR: To set the color, please, provide a THREE.Color instance."
	}
	// if (!color.equals(this._color)) {
	this._color = color;
	this._colorDirty = true;
	// }
};

FLOW.Lines.Line.prototype.setWidth = function(width) {
	if (typeof(width) !== "number") {
		throw "ERROR: To set the width, plseae, provide a number.";
	}
	if (width !== this._width) {
		this._width = width;
		this._widthDirty = true;
	}
};

FLOW.Lines.Line.prototype.getWidth = function() {
	return this._width;
}

FLOW.Lines.Lines = function() {
	this._bufferGeometry = null;
	this._material = null;
	this._texture = null;
	this._mesh = null;
	this._lines = [];
	this._linesArrayChanged = false
	this._positions = [];
	this._previous = [];
	this._next = [];
	this._side = [];
	this._width = [];
    this._opacity = 1;
	this._indices = [];
	this._uvs = [];
	this._colors = [];
	this._index = 0;
	this._attributes = null;
	this._resolution = new THREE.Vector2( window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio );
	this._computeBoundsEnabled = true;

	return this;
};

FLOW.Lines.Lines.prototype._checkLineIndex = function(index) {
	if (typeof(index) !== "number") {
		throw "ERROR: The passed line index is not a number.";
	}
	else if (this._lines.length === 0) {
		throw "ERROR: There are no lines yet so why are you trying to get one at '" + index + "' index?";
	}
	else if (index < 0 || index >= this._lines.length) {
		throw "ERROR: The passed line index '" + index + "' is out of bounds. Possible range is 0-" + this._lines.length + ".";
	}
}

FLOW.Lines.Lines.prototype._buildMeshForLine = function(line) {

	// Check if the line is new or has already been created as a mesh.
	// New lines use internal arrays that are populared.
	// Lines that have been already created as a mesh, just change the corresponding attributes.
	var isNewLine = line._endIndex == -1;

	if (isNewLine) {
		line._startIndex = this._positions.length;
	}

	var numberOfPointsInLine = line.getNumberOfPoints();

	// Some useful variables
	var point, color, width;

	// Indices to access points (i6) and widths (i2)
	var i6 = line._startIndex;
	var i2 = line._startIndex / 6 * 2;

	// We need to calculate the previous point of the line depending if it is a looped line (first and last points are equal) or not.
	if( line.arePointsEqual( 0, numberOfPointsInLine - 1 ) ) {
		point = line.getPoint( numberOfPointsInLine - 2 );
	} else {
		point = line.getPoint( 0 );
	}
	if (isNewLine) {
		this._previous.push( point.x, point.y, point.z );
		this._previous.push( point.x, point.y, point.z );
	}
	else if (line._pointsDirty) {
		this._attributes.previous.array[i6 + 0] = point.x;
		this._attributes.previous.array[i6 + 1] = point.y;
		this._attributes.previous.array[i6 + 2] = point.z;
		this._attributes.previous.array[i6 + 3] = point.x;
		this._attributes.previous.array[i6 + 4] = point.y;
		this._attributes.previous.array[i6 + 5] = point.z;
	}

	for( var j = 0; j < numberOfPointsInLine; j++, i6 += 6, i2 += 2 ) {
		point = line.getPoint(j);
		if (isNewLine) {
			this._positions.push(point.x, point.y, point.z);
			this._positions.push(point.x, point.y, point.z);
		}
		else if (line._pointsDirty) {
			this._attributes.position.array[i6 + 0] = point.x;
			this._attributes.position.array[i6 + 1] = point.y;
			this._attributes.position.array[i6 + 2] = point.z;
			this._attributes.position.array[i6 + 3] = point.x;
			this._attributes.position.array[i6 + 4] = point.y;
			this._attributes.position.array[i6 + 5] = point.z;
		}

		color = line.getColor();
		if (isNewLine) {
			this._colors.push(color.r, color.g, color.b);
			this._colors.push(color.r, color.g, color.b);
		}
		else if (line._colorDirty) {
			this._attributes.color.array[i6 + 0] = color.r;
			this._attributes.color.array[i6 + 1] = color.g;
			this._attributes.color.array[i6 + 2] = color.b;
			this._attributes.color.array[i6 + 3] = color.r;
			this._attributes.color.array[i6 + 4] = color.g;
			this._attributes.color.array[i6 + 5] = color.b;
		}

		if (isNewLine) {
			this._side.push( 1 );
			this._side.push( -1 );
		}
		// Side values are still the same even if it is a line that needs to be rebuilt.

		width = line.getWidth();
		if (isNewLine) {
			this._width.push( width );
			this._width.push( width );
		}
		else if (line._widthDirty) {
			this._attributes.width.array[i2 + 0] = width;
			this._attributes.width.array[i2 + 1] = width;
		}

		if (isNewLine) {
			this._uvs.push( j / ( numberOfPointsInLine - 1 ), 0 );
			this._uvs.push( j / ( numberOfPointsInLine - 1 ), 1 );
		}
		// UV values are still the same even if it is a line that needs to be rebuilt.

		if (j < numberOfPointsInLine - 1) {
			if (isNewLine) {
				this._previous.push( point.x, point.y, point.z );
				this._previous.push( point.x, point.y, point.z );
			}
			else if (line._pointsDirty) {
				this._attributes.previous.array[i6 + 6 + 0] = point.x;
				this._attributes.previous.array[i6 + 6 + 1] = point.y;
				this._attributes.previous.array[i6 + 6 + 2] = point.z;
				this._attributes.previous.array[i6 + 6 + 3] = point.x;
				this._attributes.previous.array[i6 + 6 + 4] = point.y;
				this._attributes.previous.array[i6 + 6 + 5] = point.z;
			}
		}

		if (j >= 1) {
			if (isNewLine) {
				this._next.push( point.x, point.y, point.z );
				this._next.push( point.x, point.y, point.z );
			}
			else if (line._pointsDirty) {
				this._attributes.next.array[i6 - 6 + 0] = point.x;
				this._attributes.next.array[i6 - 6 + 1] = point.y;
				this._attributes.next.array[i6 - 6 + 2] = point.z;
				this._attributes.next.array[i6 - 6 + 3] = point.x;
				this._attributes.next.array[i6 - 6 + 4] = point.y;
				this._attributes.next.array[i6 - 6 + 5] = point.z;
			}
		}
	}

	if( line.arePointsEqual( numberOfPointsInLine - 1, 0 ) ){
		point = line.getPoint( 1 );
	} else {
		point = line.getPoint( numberOfPointsInLine - 1 );
	}
	if (isNewLine) {
		this._next.push( point.x, point.y, point.z );
		this._next.push( point.x, point.y, point.z );
	}
	else if (line._pointsDirty) {
		this._attributes.next.array[i6 - 6 + 0] = point.x;
		this._attributes.next.array[i6 - 6 + 1] = point.y;
		this._attributes.next.array[i6 - 6 + 2] = point.z;
		this._attributes.next.array[i6 - 6 + 3] = point.x;
		this._attributes.next.array[i6 - 6 + 4] = point.y;
		this._attributes.next.array[i6 - 6 + 5] = point.z;
	}

	if (isNewLine) {
		for( var j = 0; j < numberOfPointsInLine - 1; j++ ) {
			var n = this._index + j * 2;
			this._indices.push( n, n + 1, n + 2 );
			this._indices.push( n + 2, n + 1, n + 3 );
		}

		// _index += numberOfPointsInLine * 2;
		this._index = this._indices[this._indices.length - 1] + 1;

		line._endIndex = this._positions.length - 1;
	}

	return this;
};

FLOW.Lines.Lines.prototype._buildMeshForAllLines = function() {
	this._positions = [];
	this._previous = [];
	this._next = [];
	this._side = [];
	this._width = [];
	this._indices = [];
	this._uvs = [];
	this._colors = [];

	this._index = 0;

	var lineIndex = 0;
	var newLines = [];

	for(var i = 0; i < this._lines.length; i++) {
		var line = this._lines[i];

		if (line != null) {
			// Reset the whole line:
			// - Set the index of the line to the index in the line array.
			// - Clean all the dirty flags of the line params.
			// - Reset the start and end indices so the buildMeshForLine can set them correctly.
			line._index = lineIndex;
			line._clean();
			line._startIndex = line._endIndex = -1;
			this._buildMeshForLine(line);
			lineIndex++;
			newLines.push(line);
		}
	}

	this._lines = newLines;

	if (this._attributes) {
		// If the attributes were already generated, remove them
		this._bufferGeometry.removeAttribute( 'position' );
		this._bufferGeometry.removeAttribute( 'color' );
		this._bufferGeometry.removeAttribute( 'previous' );
		this._bufferGeometry.removeAttribute( 'next' );
		this._bufferGeometry.removeAttribute( 'side' );
		this._bufferGeometry.removeAttribute( 'width' );
		this._bufferGeometry.removeAttribute( 'uv' );
	}
	else {
		// If there were no attributes, create the geometry and the attributes object
		this._bufferGeometry = new THREE.BufferGeometry();
		this._attributes = {};
	}

	// Create each attribute
	this._attributes.position = new THREE.BufferAttribute( new Float32Array( this._positions ), 3 );
	this._attributes.color = new THREE.BufferAttribute( new Float32Array( this._colors ), 3 );
	this._attributes.previous = new THREE.BufferAttribute( new Float32Array( this._previous ), 3 ),
		this._attributes.next = new THREE.BufferAttribute( new Float32Array( this._next ), 3 );
	this._attributes.side = new THREE.BufferAttribute( new Float32Array( this._side ), 1 );
	this._attributes.width = new THREE.BufferAttribute( new Float32Array( this._width ), 1 );
	this._attributes.uv = new THREE.BufferAttribute( new Float32Array( this._uvs ), 2 );
	this._attributes.index = new THREE.BufferAttribute( new Uint32Array( this._indices ), 1 );

	// Add each attribute to the geometry.
	this._bufferGeometry.addAttribute( 'position', this._attributes.position );
	this._bufferGeometry.addAttribute( 'color', this._attributes.color );
	this._bufferGeometry.addAttribute( 'previous', this._attributes.previous );
	this._bufferGeometry.addAttribute( 'next', this._attributes.next );
	this._bufferGeometry.addAttribute( 'side', this._attributes.side );
	this._bufferGeometry.addAttribute( 'width', this._attributes.width );
	this._bufferGeometry.addAttribute( 'uv', this._attributes.uv );
	this._bufferGeometry.setIndex( this._attributes.index );

	// We no longer need the original arrays, so get rid of them.
	this._positions = [];
	this._colors = [];
	this._previous = [];
	this._next = [];
	this._side = [];
	this._width = [];
	this._indices = [];
	this._uvs = [];

	this._bufferGeometry.computeBoundingBox();
	this._bufferGeometry.computeBoundingSphere();

	this._linesArrayChanged = false;

	return this;
};

FLOW.Lines.Lines.prototype._areAllLinesBuilt = function() {
	// All the lines are built if:
	// - All lines are not null.
	// - All lines have a _startIndex !== -1.
	// - All lines haven't changed their points array.
	var allLinesBuilt = !this._linesArrayChanged;
	for (var i = 0; allLinesBuilt && i < this._lines.length; i++) {
		var line = this._lines[i];
		allLinesBuilt = line !== null && line._startIndex !== -1 && !line._pointsArrayHasChanged;
	}
	return allLinesBuilt;
};


FLOW.Lines.Lines.prototype.updateTimeUniform = function(time) {
	this._material.uniforms.time.value =  time ;
}

FLOW.Lines.Lines.prototype.updateBaseSpeedUniform = function(baseSpeed) {
	this._material.uniforms.baseSpeed.value =  baseSpeed ;
}

FLOW.Lines.Lines.prototype.updateUvXOffsetUniform = function(uvXOffset) {
	this._material.uniforms.uvXOffset.value =  uvXOffset ;
}

FLOW.Lines.Lines.prototype.updateUvYOffsetUniform = function(uvYOffset) {
	this._material.uniforms.uvYOffset.value =  uvYOffset ;
}

FLOW.Lines.Lines.prototype._computeBounds = function(startIndex, endIndex) {
	if (!this._computeBoundsEnabled) return this;
	var boundingBox = this._bufferGeometry.boundingBox;
	if (!boundingBox) return this;
	var position = new THREE.Vector3();
	for(var i = startIndex; i <= endIndex; i += 3) {
		position.fromArray( this._attributes.position.array, i );
		// Compute the possible new bounding box
		if (position.x < boundingBox.min.x) {
			boundingBox.min.x = position.x;
		}
		if (position.y < boundingBox.min.y) {
			boundingBox.min.y = position.y;
		}
		if (position.z < boundingBox.min.z) {
			boundingBox.min.z = position.z;
		}
		if (position.x > boundingBox.max.x) {
			boundingBox.max.x = position.x;
		}
		if (position.y > boundingBox.max.y) {
			boundingBox.max.y = position.y;
		}
		if (position.z > boundingBox.max.z) {
			boundingBox.max.z = position.z;
		}
	}
	var boundingSphere = this._bufferGeometry.boundingSphere;
	if (!boundingSphere) return this;
	var maxRadiusSq = boundingSphere.radius * boundingSphere.radius;
	var maxRadiusSqHasChanged = false;
	boundingSphere.center.copy(boundingBox.max).sub(boundingBox.min).multiplyScalar(0.5).add(boundingBox.min);
	for(var i = startIndex; i <= endIndex; i += 3) {
		position.fromArray( this._attributes.position.array, i );
		// Compute the possible new bounding sphere
		var distanceSq = boundingSphere.center.distanceToSquared( position );
		if (distanceSq > maxRadiusSq) {
			maxRadiusSq = distanceSq;
			maxRadiusSqHasChanged = true;
		}
	}
	if (maxRadiusSqHasChanged) {
		boundingSphere.radius = Math.sqrt( maxRadiusSq );
	}
	return this;
};

FLOW.Lines.Lines._Material = function( parameters ) {
	var vertexShaderSource = [
		'precision highp float;',
		'',
		'attribute vec3 position;',
		'attribute vec3 color;',
		'attribute vec3 previous;',
		'attribute vec3 next;',
		'attribute float side;',
		'attribute float width;',
		'attribute vec2 uv;',
		'',
		'uniform mat4 projectionMatrix;',
		'uniform mat4 modelViewMatrix;',
		'uniform vec2 resolution;',
		'uniform float lineWidth;',
		// 'uniform vec3 color;',
		'uniform float opacity;',
		'uniform float near;',
		'uniform float far;',
		'uniform float sizeAttenuation;',
		'uniform float time;',
		'uniform float baseSpeed;',
		'uniform float uvXOffset;',
		'uniform float uvYOffset;',
		'',
		'varying vec2 vUV;',
		'varying vec4 vColor;',
		'varying vec3 vPosition;',
		'varying float vTime;',
		'varying float vBaseSpeed;',
		'varying float vUvXOffset;',
		'varying float vUvYOffset;',
		'',
		'vec2 fix( vec4 i, float aspect ) {',
		'',
		'    vec2 res = i.xy / i.w;',
		'    res.x *= aspect;',
		'    return res;',
		'',
		'}',
		'',
		'void main() {',
		'',
		'    float aspect = resolution.x / resolution.y;',
		'	 float pixelWidthRatio = 1. / (resolution.x * projectionMatrix[0][0]);',
		'',
		'    vColor = vec4( color, opacity );',
		'    vUV = uv;',
		'    vTime = time;',
		'    vBaseSpeed = baseSpeed;',
		'    vUvXOffset = uvXOffset;',
		'    vUvYOffset = uvYOffset;',
		'',
		'    mat4 m = projectionMatrix * modelViewMatrix;',
		'    vec4 finalPosition = m * vec4( position, 1.0 );',
		'    vec4 prevPos = m * vec4( previous, 1.0 );',
		'    vec4 nextPos = m * vec4( next, 1.0 );',
		'',
		'    vec2 currentP = fix( finalPosition, aspect );',
		'    vec2 prevP = fix( prevPos, aspect );',
		'    vec2 nextP = fix( nextPos, aspect );',
		'',
		'	 float pixelWidth = finalPosition.w * pixelWidthRatio;',
		'    float w = 1.8 * pixelWidth * lineWidth * width;',
		'',
		'    if( sizeAttenuation == 1. ) {',
		'        w = 1.8 * lineWidth * width;',
		'    }',
		'',
		'    vec2 dir;',
		'    if( nextP == currentP ) dir = normalize( currentP - prevP );',
		'    else if( prevP == currentP ) dir = normalize( nextP - currentP );',
		'    else {',
		'        vec2 dir1 = normalize( currentP - prevP );',
		'        vec2 dir2 = normalize( nextP - currentP );',
		'        dir = normalize( dir1 + dir2 );',
		'',
		// '        vec2 perp = vec2( -dir1.y, dir1.x );',
		// '        vec2 miter = vec2( -dir.y, dir.x );',
		// '        w = clamp( w / dot( miter, perp ), 0., 4. * lineWidth * width );',
		'',
		'    }',
		'',
		'    vec2 normal = ( cross( vec3( dir, 0. ), vec3( 0., 0., 1. ) ) ).xy;',
		// '    vec2 normal = vec2( -dir.y, dir.x );',
		'    normal.x /= aspect;',
		'    normal *= .5 * w;',
		'',
		'    vec4 offset = vec4( normal * side, 0.0, 1.0 );',
		'    finalPosition.xy += offset.xy;',
		'',
		// '	 vPosition = ( modelViewMatrix * vec4( position, 1. ) ).xyz;',
		'    gl_Position = finalPosition;',
		'',
		'}' ];

	var fragmentShaderSource = [
		'#extension GL_OES_standard_derivatives : enable',
		'precision mediump float;',
		'',
		'uniform sampler2D map;',
		'uniform float useMap;',
		'uniform float useDash;',
		'uniform vec2 dashArray;',
		'',
		'varying vec2 vUV;',
		'varying vec4 vColor;',
		'varying float vTime;',
		'varying float vBaseSpeed;',
		'varying float vUvXOffset;',
		'varying float vUvYOffset;',
		// 'varying vec3 vPosition;',
		'',
		'void main() {',
		'',
		'    vec4 c = vColor;',
		'     float baseSpeed = vBaseSpeed;',
		'     float uvXOffset = vUvXOffset;',
		'     float uvYOffset = vUvYOffset;',
		'    vec2 uvTimeShift = vUV + vec2( uvXOffset,uvYOffset) * vTime * baseSpeed ;',
		'    if( useMap == 1. ) c *= texture2D( map, uvTimeShift );',
		'	 if( useDash == 1. ){',
		'	 	 ',
		'	 }',
		'    gl_FragColor =c;',
		'',
		'}' ];

	function _check( value, defaultValue ) {
		if( value === undefined ) return defaultValue;
		return value;
	}

	THREE.Material.call( this );

	parameters = parameters || {};

	this.lineWidth = _check( parameters.lineWidth, 1 );
	this.map = _check( parameters.map, null );
	this.useMap = _check( parameters.useMap, 0 );
	this.color = _check( parameters.color, new THREE.Color( 0xffffff ) );
	this.opacity = _check( parameters.opacity, 1 );
	this.resolution = _check( parameters.resolution, new THREE.Vector2( 1, 1 ) );
	this.sizeAttenuation = _check( parameters.sizeAttenuation, 1 );
	this.near = _check( parameters.near, 1 );
	this.far = _check( parameters.far, 1 );
	this.dashArray = _check( parameters.dashArray, [] );
	this.useDash = ( this.dashArray !== [] ) ? 1 : 0;
	this.baseSpeed =  _check( parameters.baseSpeed, 1 );
	this.uvXOffset =  _check( parameters.uvXOffset, 0 );
	this.uvYOffset =  _check( parameters.uvYOffset, 0 );

	var material = new THREE.RawShaderMaterial( {
		uniforms:{
			lineWidth: { type: 'f', value: this.lineWidth },
			map: { type: 't', value: this.map },
			useMap: { type: 'f', value: this.useMap },
			color: { type: 'c', value: this.color },
			opacity: { type: 'f', value: this.opacity },
			resolution: { type: 'v2', value: this.resolution },
			sizeAttenuation: { type: 'f', value: this.sizeAttenuation },
			near: { type: 'f', value: this.near },
			far: { type: 'f', value: this.far },
			dashArray: { type: 'v2', value: new THREE.Vector2( this.dashArray[ 0 ], this.dashArray[ 1 ] ) },
			useDash: { type: 'f', value: this.useDash },
			time: { type: 'f', value: 0.0},
			baseSpeed:{ type: 'f', value: 1.0},
			uvXOffset: { type: 'f', value: 1.0},
			uvYOffset: { type: 'f', value: 1.0}
		},
		vertexShader: vertexShaderSource.join( '\r\n' ),
		fragmentShader: fragmentShaderSource.join( '\r\n' )
	});

	delete parameters.lineWidth;
	delete parameters.map;
	delete parameters.useMap;
	delete parameters.color;
	delete parameters.opacity;
	delete parameters.resolution;
	delete parameters.sizeAttenuation;
	delete parameters.near;
	delete parameters.far;
	delete parameters.dashArray;
	delete parameters.baseSpeed;
	delete parameters.uvXOffset;
	delete parameters.uvYOffset;

	material.type = 'FLOW.Lines.Lines._Material';

	material.setValues( parameters );

	return material;
}

FLOW.Lines.Lines._Material.prototype = Object.create( THREE.Material.prototype );
FLOW.Lines.Lines._Material.prototype.constructor = FLOW.Lines.Lines._Material;

FLOW.Lines.Lines._Material.prototype.copy = function ( source ) {

	THREE.Material.prototype.copy.call( this, source );

	this.lineWidth = source.lineWidth;
	this.map = source.map;
	this.useMap = source.useMap;
	this.color.copy( source.color );
	this.opacity = source.opacity;
	this.resolution.copy( source.resolution );
	this.sizeAttenuation = source.sizeAttenuation;
	this.near = source.near;
	this.far = source.far;
	this.baseSpeed = source.baseSpeed;
	this.uvXOffset = source.uvXOffset;
	this.uvYOffset = source.uvYOffset;

	return this;
};

// The public API
FLOW.Lines.Lines.prototype.addLine = function(line) {
	if (!(line instanceof FLOW.Lines.Line)) throw "ERROR: To add a line, please, provide a FLOW.Lines.Line instance.";
	if (line._lines instanceof FLOW.Lines.Lines && line._lines !== this) throw "ERROR: The given line has already been added to another Lines instance. Please, remove it first and then add it to this instance.";
	if (line._lines === this) throw "ERROR: This has already been added to this Lines instance.";
	line._lines = this;
	line._index = this._lines.length;
	this._lines.push(line);
	this._linesArrayChanged = true;
	return this;
};

FLOW.Lines.Lines.prototype.removeLine = function(line) {
	if (!(line instanceof FLOW.Lines.Line)) throw "ERROR: To remove a line, please, provide a FLOW.Lines.Line instance.";
	if (line._lines !== this) throw "ERROR: The given line has not been added to this Lines instance.";
	this._lines[line._index] = null;
	this._linesArrayChanged = true;
	line._index = -1;
	line._lines = null;
	line._startIndex = -1;
	line._endIndex = -1;
	line._pointsDirty = true;
	line._colorDirty = true;
	line._widthDirty = true;
	return this;
};

FLOW.Lines.Lines.prototype.removeAllLines = function(line) {
	this._lines = [];
	return this;
};

FLOW.Lines.Lines.prototype.getNumberOfLines = function() {
	if (!this._areAllLinesBuilt()) {
		this._buildMeshForAllLines();
	}
	return this._lines.length;
};

FLOW.Lines.Lines.prototype.getLine = function(index) {
	this._checkLineIndex(index);
	return this._lines[index];
};

FLOW.Lines.Lines.prototype.resetLine = function(line) {
	if (!(line instanceof FLOW.Lines.Line)) throw "ERROR: To remove a line, please, provide a FLOW.Lines.Line instance.";
	if (line._lines !== this) throw "ERROR: The given line has not been added to this Lines instance.";

	// Only do something if the line has already been used to create a mesh
	if (line._startIndex !== -1) {
		// If the new params has a different points array, we need to reset all lines!
		if (line._pointsArrayHasChanged) {
			this.resetAllLines();
		}
		else {

			this._buildMeshForLine(line);

			if (line._pointsDirty) {
				this._attributes.position.needsUpdate = true;
				this._attributes.previous.needsUpdate = true;
				this._attributes.next.needsUpdate = true;
				this._computeBounds(line._startIndex, line._endIndex);
			}
			if (line._widthDirty) {
				this._attributes.width.needsUpdate = true;
			}
			if (line._colorDirty) {
				this._attributes.color.needsUpdate = true;
			}
			line._clean();
		}
	}

	return this;
};

FLOW.Lines.Lines.prototype.buildMesh = function() {

	this.resetAllLines();

	if (!this._mesh) {

		this._material = new FLOW.Lines.Lines._Material( {
			map: this._texture,
			useMap: !!this._texture,
			// color: new THREE.Color( colors[ ~~Maf.randomInRange( 0, colors.length ) ] ),
			opacity: this._opacity,
			dashArray: new THREE.Vector2( 10, 5 ),
			resolution: this._resolution,
			sizeAttenuation: this.sizeAttenuation, //TODO: sizeAttention Not yet implemented
			lineWidth: this.lineWidth,
			near: 0.01,
			far: 1000.0,
			depthTest: true, // this._texture,
			// blending: this._texture ? THREE.AdditiveBlending : THREE.NormalBlending,
			transparent: this._opacity<1 || !!this._texture,
			side: THREE.DoubleSide
		});

		this._mesh = new THREE.Mesh( this._bufferGeometry, this._material );
        this._mesh.frustumCulled = false;
	}

	return this._mesh;
};

FLOW.Lines.Lines.prototype.resetAllLines = function() {

	// If the mesh has not yet been created or not all of the lines have been built
	if (!this._attributes || !this._areAllLinesBuilt()) {
		// Rebuilt all the lines.
		this._buildMeshForAllLines();
	}
	// If the mesh has been created already
	else if (this._attributes) {
		// Go line by line and rebuild the data
		// As we will iterate over all of the lines, buffer the dirty flags.
		var pointsDirty = false;
		var widthDirty = false;
		var colorDirty = false;
		for(var lineIndex = 0; lineIndex < this._lines.length; lineIndex++) {
			var line = this._lines[lineIndex];
			this._buildMeshForLine(line);
			pointsDirty = pointsDirty || line._pointsDirty;
			widthDirty = widthDirty || line._widthDirty;
			colorDirty = colorDirty || line._colorDirty;
			if (line._pointsDirty) {
				this._computeBounds(line._startIndex, line._endIndex);
			}
			// We can clean the line's dirty flags as we have buffered the already
			line._clean();
		}
		if (pointsDirty) {
			this._attributes.position.needsUpdate = true;
			this._attributes.previous.needsUpdate = true;
			this._attributes.next.needsUpdate = true;
		}
		// this._attributes.side.needsUpdate = true;
		if (widthDirty) {
			this._attributes.width.needsUpdate = true;
		}
		if (colorDirty) {
			this._attributes.color.needsUpdate = true;
		}
		// this._attributes.uv.needsUpdate = true;
		// this._attributes.index.needsUpdate = true;
	}

	return this;
};

FLOW.Lines.Lines.prototype.getMesh = function() {
	return this._mesh;
};

FLOW.Lines.Lines.prototype.setSize = function(width, height) {
    if (typeof(width) !== "number" || width < 0) {
        throw "ERROR: The width needs to be a positive number.";
    }
    else if (typeof(height) !== "number" || height < 0) {
        throw "ERROR: The height needs to be a positive number";
    }
    this._resolution.x = width;
    this._resolution.y = height;
    return this;
};

FLOW.Lines.Lines.prototype.setOpacity = function(value) {
    if (typeof(value) !== "number" || value < 0) {
        throw "ERROR: The width needs to be a positive number.";
    }
    this._opacity = value;
    return this;
};

FLOW.Lines.Lines.prototype.setTexture = function(texture) {
	if (texture !== null && !(texture instanceof THREE.Texture)) throw "ERROR: The given texture is not a THREE.Texture instance.";
	this._texture = texture;
	if (this._material) {
		this._material.map = texture;
		this._material.useMap = !!texture;
		this._material.uniforms.map.value = texture;
		this._material.uniforms.useMap.value = texture ? 1 : 0;
		this._material.transparent = !!texture;
		this._material.opacity = 1;
		// this._material.blending = texture ? THREE.AdditiveBlending : THREE.NormalBlending;
		this._material.depthTest = !texture;
	}
};

FLOW.Lines.Lines.prototype.enableComputeBounds = function() {
	this._computeBoundsEnabled = true;
	return this;
};

FLOW.Lines.Lines.prototype.disableComputeBounds = function() {
	this._computeBoundsEnabled = false;
	return this;
};

(function (factory) {
	if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	}
}(function () {
	return FLOW.Lines;
}));