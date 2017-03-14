var FLOW = FLOW || {};

var THREE = THREE || require('three');

FLOW.THREE = {};

// Extend THREE with some interesting functionalities
THREE.Points.prototype.raycast = function raycast( raycaster, intersects ) {
	var inverseMatrix = new THREE.Matrix4();
	var ray = new THREE.Ray();
	var sphere = new THREE.Sphere();

	var object = this;
	var geometry = this.geometry;
	var matrixWorld = this.matrixWorld;
	var threshold = raycaster.params.Points.threshold;
	if (object.thresholdMultiplyer) {
		threshold *= object.thresholdMultiplyer;
	}

	// Checking boundingSphere distance to ray

	if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();

	sphere.copy( geometry.boundingSphere );
	sphere.applyMatrix4( matrixWorld );

	if ( raycaster.ray.intersectsSphere( sphere ) === false ) return;

	//

	inverseMatrix.getInverse( matrixWorld );
	ray.copy( raycaster.ray ).applyMatrix4( inverseMatrix );

	var localThreshold = threshold / ( ( this.scale.x + this.scale.y + this.scale.z ) / 3 );
	var localThresholdSq = localThreshold * localThreshold;
	var position = new THREE.Vector3();

	function testPoint( point, index ) {

		var rayPointDistanceSq = ray.distanceSqToPoint( point );
		// updated to work with variable thresholds for each point
		if(object.variableThresholds) {
			var threshold = object.variableThresholds[index];
			if (object.thresholdMultiplyer) {
				threshold *= object.thresholdMultiplyer;
			}
			var localThreshold = threshold / ( ( object.scale.x + object.scale.y + object.scale.z ) / 3 );
			localThresholdSq = localThreshold * localThreshold;
		}
		//

		if ( rayPointDistanceSq < localThresholdSq ) {

			var intersectPoint = ray.closestPointToPoint( point );
			intersectPoint.applyMatrix4( matrixWorld );

			var distance = raycaster.ray.origin.distanceTo( intersectPoint );

			if ( distance < raycaster.near || distance > raycaster.far ) return;

			intersects.push( {

				distance: distance,
				distanceToRay: Math.sqrt( rayPointDistanceSq ),
				point: intersectPoint.clone(),
				index: index,
				face: null,
				object: object

			} );

		}

	}

	if ( (geometry && geometry.isBufferGeometry) ) {

		var index = geometry.index;
		var attributes = geometry.attributes;
		var positions = attributes.position.array;

		if ( index !== null ) {

			var indices = index.array;

			for ( var i = 0, il = indices.length; i < il; i ++ ) {

				var a = indices[ i ];

				position.fromArray( positions, a * 3 );

				testPoint( position, a );

			}

		} else {

			for ( var i = 0, l = positions.length / 3; i < l; i ++ ) {

				position.fromArray( positions, i * 3 );

				testPoint( position, i );

			}

		}

	} else {

		var vertices = geometry.vertices;

		for ( var i = 0, l = vertices.length; i < l; i ++ ) {

			testPoint( vertices[ i ], i );

		}

	}

};


THREE.Quaternion.prototype.setFromRotationMatrix3 = function ( m ) {

	// http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm

	// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

	var te = m.elements,

		m11 = te[ 0 ], m12 = te[ 3 ], m13 = te[ 6 ],
		m21 = te[ 1 ], m22 = te[ 4 ], m23 = te[ 7 ],
		m31 = te[ 2 ], m32 = te[ 5 ], m33 = te[ 8 ],

		trace = m11 + m22 + m33,
		s;

	if ( trace > 0 ) {

		s = 0.5 / Math.sqrt( trace + 1.0 );

		this._w = 0.25 / s;
		this._x = ( m32 - m23 ) * s;
		this._y = ( m13 - m31 ) * s;
		this._z = ( m21 - m12 ) * s;

	} else if ( m11 > m22 && m11 > m33 ) {

		s = 2.0 * Math.sqrt( 1.0 + m11 - m22 - m33 );

		this._w = ( m32 - m23 ) / s;
		this._x = 0.25 * s;
		this._y = ( m12 + m21 ) / s;
		this._z = ( m13 + m31 ) / s;

	} else if ( m22 > m33 ) {

		s = 2.0 * Math.sqrt( 1.0 + m22 - m11 - m33 );

		this._w = ( m13 - m31 ) / s;
		this._x = ( m12 + m21 ) / s;
		this._y = 0.25 * s;
		this._z = ( m23 + m32 ) / s;

	} else {

		s = 2.0 * Math.sqrt( 1.0 + m33 - m11 - m22 );

		this._w = ( m21 - m12 ) / s;
		this._x = ( m13 + m31 ) / s;
		this._y = ( m23 + m32 ) / s;
		this._z = 0.25 * s;

	}

	this.onChangeCallback();

	return this;

};

THREE.Matrix3.prototype.makeRotationFromQuaternion = function ( q ) {

	var te = this.elements;

	var x = q.x, y = q.y, z = q.z, w = q.w;
	var x2 = x + x, y2 = y + y, z2 = z + z;
	var xx = x * x2, xy = x * y2, xz = x * z2;
	var yy = y * y2, yz = y * z2, zz = z * z2;
	var wx = w * x2, wy = w * y2, wz = w * z2;

	te[ 0 ] = 1 - ( yy + zz );
	te[ 3 ] = xy - wz;
	te[ 6 ] = xz + wy;

	te[ 1 ] = xy + wz;
	te[ 4 ] = 1 - ( xx + zz );
	te[ 7 ] = yz - wx;

	te[ 2 ] = xz - wy;
	te[ 5 ] = yz + wx;
	te[ 8 ] = 1 - ( xx + yy );

	return this;

};

THREE.Matrix3.prototype.lookAt = (function () {

	var x, y, z;

	return function ( eye, target, up ) {

		if ( x === undefined ) {

			x = new THREE.Vector3();
			y = new THREE.Vector3();
			z = new THREE.Vector3();

		}

		var te = this.elements;

		z.subVectors( eye, target ).normalize();

		if ( z.lengthSq() === 0 ) {

			z.z = 1;

		}

		x.crossVectors( up, z ).normalize();

		if ( x.lengthSq() === 0 ) {

			z.z += 0.0001;
			x.crossVectors( up, z ).normalize();

		}

		y.crossVectors( z, x );


		te[ 0 ] = x.x; te[ 3 ] = y.x; te[ 6 ] = z.x;
		te[ 1 ] = x.y; te[ 4 ] = y.y; te[ 7 ] = z.y;
		te[ 2 ] = x.z; te[ 5 ] = y.z; te[ 8 ] = z.z;

		return this;

	};

})();

THREE.Matrix3.prototype.scale = function ( v ) {

	var te = this.elements;
	var x = v.x, y = v.y, z = v.z;

	te[ 0 ] *= x; te[ 3 ] *= y; te[ 6 ] *= z;
	te[ 1 ] *= x; te[ 4 ] *= y; te[ 7 ] *= z;
	te[ 2 ] *= x; te[ 5 ] *= y; te[ 8 ] *= z;

	return this;

};

THREE.Matrix3.prototype.getMaxScaleOnAxis = function () {

	var te = this.elements;

	var scaleXSq = te[ 0 ] * te[ 0 ] + te[ 1 ] * te[ 1 ] + te[ 2 ] * te[ 2 ];
	var scaleYSq = te[ 3 ] * te[ 3 ] + te[ 4 ] * te[ 4 ] + te[ 5 ] * te[ 5 ];
	var scaleZSq = te[ 6 ] * te[ 6 ] + te[ 7 ] * te[ 7 ] + te[ 8 ] * te[ 8 ];

	return Math.sqrt( Math.max( scaleXSq, scaleYSq, scaleZSq ) );

};

THREE.Matrix3.prototype.makeRotationX = function ( theta ) {

	var c = Math.cos( theta ), s = Math.sin( theta );

	this.set(

		1, 0,  0,
		0, c, - s,
		0, s,  c

	);

	return this;

},

THREE.Matrix3.prototype.makeRotationY = function ( theta ) {

	var c = Math.cos( theta ), s = Math.sin( theta );

	this.set(

		 c, 0, s,
		 0, 1, 0,
		- s, 0, c

	);

	return this;

};

THREE.Matrix3.prototype.makeRotationZ = function ( theta ) {

	var c = Math.cos( theta ), s = Math.sin( theta );

	this.set(

		c, - s, 0,
		s,  c, 0,
		0,  0, 1

	);

	return this;

};

THREE.Matrix3.prototype.makeRotationAxis = function ( axis, angle ) {

	// Based on http://www.gamedev.net/reference/articles/article1199.asp

	var c = Math.cos( angle );
	var s = Math.sin( angle );
	var t = 1 - c;
	var x = axis.x, y = axis.y, z = axis.z;
	var tx = t * x, ty = t * y;

	this.set(

		tx * x + c, tx * y - s * z, tx * z + s * y,
		tx * y + s * z, ty * y + c, ty * z - s * x,
		tx * z - s * y, ty * z + s * x, t * z * z + c

	);

	 return this;

};

THREE.Matrix3.prototype.makeScale = function ( x, y, z ) {

	this.set(

		x, 0, 0,
		0, y, 0,
		0, 0, z

	);

	return this;

};

THREE.Matrix3.prototype.compose = function ( quaternion, scale ) {

	this.makeRotationFromQuaternion( quaternion );
	this.scale( scale );

	return this;

};

THREE.Matrix3.prototype.decompose = (function () {

	var vector, matrix;

	return function ( quaternion, scale ) {

		if ( vector === undefined ) {

			vector = new THREE.Vector3();
			matrix = new THREE.Matrix3();

		}

		var te = this.elements;

		var sx = vector.set( te[ 0 ], te[ 1 ], te[ 2 ] ).length();
		var sy = vector.set( te[ 3 ], te[ 4 ], te[ 5 ] ).length();
		var sz = vector.set( te[ 6 ], te[ 7 ], te[ 8 ] ).length();

		// if determine is negative, we need to invert one scale
		var det = this.determinant();
		if ( det < 0 ) {

			sx = - sx;

		}

		// scale the rotation part

		matrix.elements.set( this.elements ); // at this point matrix is incomplete so we can't use .copy()

		var invSX = 1 / sx;
		var invSY = 1 / sy;
		var invSZ = 1 / sz;

		matrix.elements[ 0 ] *= invSX;
		matrix.elements[ 1 ] *= invSX;
		matrix.elements[ 2 ] *= invSX;

		matrix.elements[ 3 ] *= invSY;
		matrix.elements[ 4 ] *= invSY;
		matrix.elements[ 5 ] *= invSY;

		matrix.elements[ 6 ] *= invSZ;
		matrix.elements[ 7 ] *= invSZ;
		matrix.elements[ 8 ] *= invSZ;

		quaternion.setFromRotationMatrix3( matrix );

		scale.x = sx;
		scale.y = sy;
		scale.z = sz;

		return this;

	};

})();

//TODO: moved to FLOW.Picker
/**
{
	object: THREE.Object3D,
	colliders: [],
	near: number
	far: number,
	onCollisionStarted: function({distance, }),
	onCollisionFinished: function(),
	onCollided: function([distance, ])
}
*/
FLOW.THREE.ObjectZRaycaster = function(params) {
	if (typeof(params) !== "object") throw "ERROR: No paramaters provided.";
	if (!(params.object instanceof THREE.Object3D)) throw "ERROR: A THREE.Object3D is needed in order to initialize the instance.";
	this._params = params;
	this.setColliders(params.colliders);
	params.near = params.near || 0;
	params.far = params.far || Infinity;
	this._raycaster = new THREE.Raycaster();
	this._isCamera = params.object instanceof THREE.Camera;
	this._z = new THREE.Vector3();
	this._pos = new THREE.Vector3();
	params.onCollisionStarted = typeof(params.onCollisionStarted) === "function" ? params.onCollisionStarted : false;
	params.onCollisionFinished = typeof(params.onCollisionFinished) === "function" ? params.onCollisionFinished : false;
	params.onCollided = typeof(params.onCollided) === "function" ? params.onCollided : false;
	return this;
};

FLOW.THREE.ObjectZRaycaster.prototype._findColliderRecursive = function(object) {
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

FLOW.THREE.ObjectZRaycaster.prototype.update = function() {
	this._params.object.updateMatrixWorld();
	var objectMatrixWorld = this._params.object.matrixWorld.elements;
	this._z.set(objectMatrixWorld[8], objectMatrixWorld[9], objectMatrixWorld[10]);
	if (this._isCamera) { 
		this._z.negate();
	}
	this._pos.set(objectMatrixWorld[12], objectMatrixWorld[13], objectMatrixWorld[14]);
	this._raycaster.set(this._pos, this._z);
	var intersections = this._raycaster.intersectObjects(this._params.colliders, true);
	for (var i = 0; i < intersections.length; i++) {
		var intersection = intersections[i];
		var collider = this._findColliderRecursive(intersection.object);
		if (!collider.collides && this._params.onCollisionStarted) { 
			this._params.onCollisionStarted.call(this, collider.object, intersection);
		}
		if (this._params.onCollided) {
			this._params.onCollided.call(this, collider.object, intersection);
		}
		collider.collides = true;
		collider.partOfIntersection = true;
	}
	for (var i = 0; i < this._colliders.length; i++) {
		var collider = this._colliders[i];
		if (!collider.partOfIntersection && collider.collides) {
			if (this._params.onCollisionFinished) {
				this._params.onCollisionFinished.call(this, collider.object, intersection);
			}
			collider.collides = false;
		}
		// Prepare collider for next update
		collider.partOfIntersection = false;
	}
	return this;
};

FLOW.THREE.ObjectZRaycaster.prototype.setColliders = function(colliders) {
    if (!(colliders instanceof Array)){
        colliders= [colliders];
    }
    if (! this._colliders){
        this._colliders = new Array(colliders.length);
    }
    this._colliders = new Array(colliders.length);
	for (var i = 0; i < colliders.length; i++) {
		var collider = colliders[i];
		this._colliders[i] = { object: collider, collides: false, partOfIntersection: false };
	}
	this._params.colliders = colliders;
	return this;
};


FLOW.THREE.ObjectZRaycaster.prototype.addColliders = function(colliders) {
    if (!(colliders instanceof Array)){
        colliders= [colliders];
    }
    if (! this._colliders){
        this._colliders = new Array(colliders.length);
    }
    for (var i = 0; i < colliders.length; i++) {
        var collider = colliders[i];
        this._colliders[i].push( { object: collider, collides: false, partOfIntersection: false });
    }
    this._params.colliders = colliders;
    return this;
};

FLOW.THREE.ObjectZRaycaster.prototype.getNumberOfColliders = function() {
	return this._colliders.length;
};

FLOW.THREE.ObjectZRaycaster.prototype.getCollider = function(i) {
	if (i < 0 || i >= this._colliders.length) throw "ERROR: The given index '" + i + "' is out of bounds. Possible range is between 0 and " + this._colluders.length;
	return this._params.colliders[i];
};

FLOW.THREE.ObjectZRaycaster.prototype.removeCollider = function(i) {
	if (i < 0 || i >= this._colliders.length) throw "ERROR: The given index '" + i + "' is out of bounds. Possible range is between 0 and " + this._colluders.length;
	this._colliders.splice(i, 1);
	this._params.colliders.splice(i, 1);
	return this;
};

FLOW.THREE.ObjectZRaycaster.prototype.removeAllColliders = function() {
	this._colliders = [];
	this._params.colliders = [];
	return this;
};

FLOW.THREE.ObjectZRaycaster.prototype.setOnCollisionStarted = function(onCollisionStarted) {
	this._params.onCollisionStarted = typeof(onCollisionStarted) === "function" ? onCollisionStarted : false;
	return this;
};

FLOW.THREE.ObjectZRaycaster.prototype.setOnCollisionFinished = function(onCollisionFinished) {
	this._params.onCollisionFinished = typeof(onCollisionFinished) === "function" ? onCollisionFinished : false;
	return this;
};

FLOW.THREE.ObjectZRaycaster.prototype.setOnCollided = function(onCollided) {
	this._params.onCollided = typeof(onCollided) === "function" ? onCollided : false;
	return this;
};

THREE.ConstantSpline = function() {

	this.p0 = new THREE.Vector3();
	this.p1 = new THREE.Vector3();
	this.p2 = new THREE.Vector3();
	this.p3 = new THREE.Vector3();

	this.tmp = new THREE.Vector3();
	this.res = new THREE.Vector3();
	this.o = new THREE.Vector3();

	this.points = [];
	this.lPoints = [];
	this.steps = [];

	this.inc = .01;
	this.d = 0;

	this.distancesNeedUpdate = false;

};

THREE.ConstantSpline.prototype.calculate = function() {

	this.d = 0;
	this.points = [];

	this.o.copy( this.p0 );

	for( var j = 0; j <= 1; j += this.inc ) {

		var i = ( 1 - j );
		var ii = i * i;
		var iii = ii * i;
		var jj = j * j;
		var jjj = jj * j;

		this.res.set( 0, 0, 0 );

		this.tmp.copy( this.p0 );
		this.tmp.multiplyScalar( iii );
		this.res.add( this.tmp );

		this.tmp.copy( this.p1 );
		this.tmp.multiplyScalar( 3 * j * ii );
		this.res.add( this.tmp );

		this.tmp.copy( this.p2 );
		this.tmp.multiplyScalar( 3 * jj * i );
		this.res.add( this.tmp );

		this.tmp.copy( this.p3 );
		this.tmp.multiplyScalar( jjj );
		this.res.add( this.tmp );

		this.points.push( this.res.clone() );

	}

	this.points.push( this.p3.clone() );

	this.distancesNeedUpdate = true;

};

THREE.ConstantSpline.prototype.calculateDistances = function() {

	this.steps = [];
	this.d = 0;

	var from, to, td = 0;

	for( var j = 0; j < this.points.length - 1; j++ ) {

		this.points[ j ].distance = td;
		this.points[ j ].ac = this.d;

		from = this.points[ j ],
			to = this.points[ j + 1 ],
			td = to.distanceTo( from );

		this.d += td;

	}

	this.points[ this.points.length - 1 ].distance = 0;
	this.points[ this.points.length - 1 ].ac = this.d;

}

THREE.ConstantSpline.prototype.reticulate = function( settings ) {

	if( this.distancesNeedUpdate ) {
		this.calculateDistances();
		this.distancesNeedUpdate = false;
	}

	this.lPoints = [];

	var l = [];

	var steps, distancePerStep;

	if( settings.steps) {
		steps = settings.steps;
		distancePerStep = this.d / steps;
	}

	if( settings.distancePerStep ) {
		distancePerStep = settings.distancePerStep;
		steps = this.d / distancePerStep;
	}

	var d = 0,
		p = 0;

	this.lPoints = [];

	var current = new THREE.Vector3();
	current.copy( this.points[ 0 ].clone() );
	this.lPoints.push( current.clone() );

	function splitSegment( a, b, l ) {

		var t = b.clone();
		var d = 0;
		t.sub( a );
		var rd = t.length();
		t.normalize();
		t.multiplyScalar( distancePerStep );
		var s = Math.floor( rd / distancePerStep );
		for( var j = 0; j < s; j++ ) {
			a.add( t );
			l.push( a.clone() );
			d += distancePerStep;
		}
		return d;
	}

	for( var j = 0; j < this.points.length; j++ ) {

		if( this.points[ j ].ac - d > distancePerStep ) {

			d += splitSegment( current, this.points[ j ], this.lPoints );

		}

	}
	this.lPoints.push( this.points[ this.points.length - 1 ].clone() );


};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.THREE;
}));