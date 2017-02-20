var THREE = THREE || require("three");

var FLOW = FLOW || {};
FLOW.Lines = FLOW.Lines || require("flow-lines");
FLOW.MathUtils = FLOW.MathUtils || require("flow-math-utils");

/**
 * An FLOW.Environment is the non-data generated background and environmental effects for a SceneView
 *
 * @param params
 * @returns {FLOW.Environment}
 * @constructor
 */

FLOW.Environment = function( params , rootScene ) {
    this.rootScene = rootScene;
    if (this.environment) {
        this.rootScene.remove(this.environment.object);
    }

    //only one global environment allowed at a time
    this.environment = this;

    params = params || {};
    this.params = params;
    params.colors = params.colors ||   [
        ['0.000', 'rgb(43, 146, 194)'],
        ['0.116', 'rgb(53, 92, 164)'],
        ['0.344', 'rgb(74, 116, 157)'],
        ['0.586', 'rgb(27, 107, 191)'],
        ['0.766', 'rgb(28, 60, 98)'],
        ['1.000', 'rgb(43, 146, 194)']
    ];
    params.width = params.width ;
    params.url = params.url || null;
    params.showParticles = (typeof params.showParticles !== "undefined") ? params.showParticles : false;
    params.showColors =(typeof params.showColors !== "undefined") ? params.showColors  : true;
    params.showFloor =(typeof params.showFloor !== "undefined") ? params.showFloor  : false;
    params.showTicks =(typeof params.showTicks !== "undefined") ? params.showTicks  : false;
    params.ticksDistance = params.ticksDistance ? params.ticksDistance :10;
    params.ticksDeep = params.ticksDeep ? params.ticksDeep : 7;
    params.tickSize= params.tickSize ? params.tickSize  : 0.1;
    params.tickLineWidth= params.tickLineWidth ? params.tickLineWidth  : 0.01;
    params.sizeAttenuation= (typeof params.sizeAttenuation !== "undefined")  ? params.sizeAttenuation  : false;
    params.showBoxPoints = (typeof params.showBoxPoints !== "undefined") ? params.showBoxPoints : false;

    this.object = new THREE.Object3D();
    this.object.add( this.loadBackgroundEnvironment(params.url, params.colors, params.width) );
    if (params.showParticles) {
        this.object.add(this.createParticles() );
    }
    if (params.showFloor) {
        this.object.add(this.createFloor());
    }
    if (params.showTicks) {
        this.object.add(this.create3dTicks());
    }
    if (params.showBoxPoints){
        this.object.add(this.createBoxPoints(params.boxSize));
    }

   this.rootScene.add(this.object);
    return this;
};

FLOW.Environment.prototype.clear = function() {
    if (environment) {
        this.rootScene.remove(environment.object);
    }
    environment = null;
};


FLOW.Environment.prototype.loadBackgroundEnvironment = function(url, colors, width) {
    var geometry = new THREE.SphereGeometry(width, 60,60);
    geometry.scale(1, 1, 1);
    var material = new THREE.MeshBasicMaterial({ side:THREE.DoubleSide});
    this.skysphere =  new THREE.Mesh(geometry, material);

    if (url) {
        var imageSource = url;
        var loader = new THREE.TextureLoader();
        loader.load(
            // resource URL
            imageSource,
            // Function when resource is loaded
            function (texture) {
                // alert("loading new texture");
                material.map = texture;
                material.needsUpdate = true;
            },
            // Function called when download progresses
            function (xhr) {
                //console.log( (xhr.loaded / xhr.total * 100) + '% loaded' ); //TODO: add a loader progress bar
            },
            // Function called when download errors
            function (xhr) {
                //console.log( 'An error happened' );
            }
        );
    } else if (this.params.showColors ) {
        var texture =  this.createSkyTexture( colors );
        material.map = texture;
        material.needsUpdate = true;
    } else {
        material.color =new THREE.Color("#000000");
        material.needsUpdate = true;
    }

    return this.skysphere;
};

FLOW.Environment.prototype.createSkyTexture = function(colors) {
    var S = 512;

    var canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;

    var ctx = canvas.getContext('2d');

    var grd = ctx.createLinearGradient(0,0, 0,S);

    if (colors.length == 1)
        colors[1] = colors[0];


    for (var i = 0; i < colors.length; i++) {
        var c = colors[i];
        var stop  = Array.isArray(c) ? c[0] : i * 1/(colors.length-1);
        var color = Array.isArray(c) ? c[1] : c;
        grd.addColorStop(stop, color);
    }

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, S, S);

    var texture = new THREE.Texture(canvas);

    texture.needsUpdate = true;

    return texture;
};

FLOW.Environment.prototype.createParticles = function() {

    function getColor(type) {


        function c(start, end) {
            return FLOW.MathUtils.randomBetween(start, end);
        }

        type = !type ? "#ffffff" : type;
        switch (type) {
            case  'green-bluish' :
                return "#" + "00" + c(100, 200) + c(100, 200);
            case  'cyanish' :
                //return "#" + "17" + c(215, 230) + c(240, 255);
                return new THREE.Color(22 / 256, c(215, 230) / 256, c(240, 255) / 256);
            case  'bluish' :
                var color = new THREE.Color(0, c(100, 120) / 256, c(180, 255) / 256);
                return color;
            case "purplish":
                return "#" + c(100, 200) + "cc" + "ff";
            default:
                return type;
        }

    }

    var geometry = new THREE.Geometry;

    var fieldWidth = 100;
    for (var i = 0; i < 200; i++) {

        var x = (0.5 - Math.random()) * fieldWidth;
        var y = (0.5 - Math.random()) * fieldWidth;
        var z = (0.5 - Math.random()) * fieldWidth;
        // console.log(z);
        var vert = new THREE.Vector3(x, y, z);

        // don't stand, don't stand so close to me
        if (vert.length() > 4) {
            geometry.vertices.push(vert);
            var color = getColor("cyanish");

            geometry.colors.push(color);
        }

        //var r = Math.random(), g = Math.random(), b = Math.random();

    }

    geometry.verticesNeedUpdate = true;

    // var map = THREE.ImageUtils.loadTexture("graphics/spark3.png")
    var particles = 500;
    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array( particles * 3 );
    var colors = new Float32Array( particles * 3 );
    var color = new THREE.Color();
    var n = 1000, n2 = n / 2; // particles spread in the cube
    for ( var i = 0; i < positions.length; i += 3 ) {
        // positions
        var x = Math.random() * n - n2;
        var y = Math.random() * n - n2;
        var z = Math.random() * n - n2;
        positions[ i ]     = x;
        positions[ i + 1 ] = y;
        positions[ i + 2 ] = z;
        // colors
        var vx = ( x / n ) + 0.5;
        var vy = ( y / n ) + 0.5;
        var vz = ( z / n ) + 0.5;
        color.setRGB( vx, vy, vz );
        colors[ i ]     = color.r;
        colors[ i + 1 ] = color.g;
        colors[ i + 2 ] = color.b;
    }
    geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
    geometry.computeBoundingSphere();
    //
    var material = new THREE.PointsMaterial( { size: 4, vertexColors: THREE.VertexColors } );
    particleSystem = new THREE.Points( geometry, material );

    // obj.addComponent(new glam.RotateBehavior({autoStart:true, duration:900}));
    return particleSystem;
};


FLOW.Environment.prototype.createFloor = function() {
    var floorRadius = 4;//useVive ? 3 : 4;

    var glowSpanTexture = THREE.ImageUtils.loadTexture('graphics/glowspan.png');

    var cylinderMaterial = new THREE.MeshBasicMaterial({
        map: glowSpanTexture,
        //blending: THREE.AdditiveBlending,
        transparent: true,
        depthTest: true,
        depthWrite: true,
        wireframe: true,
        opacity: 0.1
    })
    var cylinderGeo = new THREE.CylinderGeometry( floorRadius, 0, 0, (360/8) - 1, 20 );
    var matrix = new THREE.Matrix4();
    matrix.scale( new THREE.Vector3(1,0.0001,1) );
    cylinderGeo.applyMatrix( matrix );
    cylinderMaterial.map.wrapS = THREE.RepeatWrapping;
    cylinderMaterial.map.wrapT = THREE.RepeatWrapping;
    // cylinderMaterial.map.needsUpdate = true;
    this.floor = new THREE.Mesh( cylinderGeo, cylinderMaterial );
    this.floor.position.set(0, -1.7, 0);
    return this.floor;

};


FLOW.Environment.prototype.create3dTicks = function() {
    this.tickLines = new FLOW.Lines.Lines() ;
    this.tickLines.sizeAttenuation = true;
    this.tickLines.setSize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio);

    this.allLines = [];
    var tickSize =  this.params.tickSize;
    var tickDistance = this.params.ticksDistance;
    var ticksDeep = this.params.ticksDeep;
    var tickLineWidth = this.params.tickLineWidth;//!Platform.isGear() ? this.params.tickLineWidth : this.params.tickLineWidth *6;

    var numObjects = ticksDeep * ticksDeep * ticksDeep;

    for ( var i = 0; i < numObjects; i ++ ) {
        var x = ( ( i % ticksDeep ) * tickDistance ) ;
        var y = ( -( Math.floor(i / ticksDeep) % ticksDeep ) * tickDistance ) ;
        var z = ( Math.floor(i / (ticksDeep*ticksDeep)) ) * tickDistance ;


        var line = new FLOW.Lines.Line();
        line.addPoint(new THREE.Vector3(-tickSize / 2 + x, 0 + y, 0 + z)); //x
        line.addPoint(new THREE.Vector3(tickSize / 2 + x, 0 + y, 0 + z));
        line.setColor(new THREE.Color(0xaaaaaa));
        line.setWidth(tickLineWidth);
        this.tickLines.addLine(line);

        line = new FLOW.Lines.Line();
        line.addPoint(new THREE.Vector3(0 + x, -tickSize / 2 + y, 0 + z)); //y
        line.addPoint(new THREE.Vector3(0 + x, tickSize / 2 + y, 0 + z));
        line.setColor(new THREE.Color(0xaaaaaa));
        line.setWidth(tickLineWidth);
        this.tickLines.addLine(line);

        line = new FLOW.Lines.Line();
        line.addPoint(new THREE.Vector3(0 + x, 0 + y, -tickSize / 2 + z)); //z
        line.addPoint(new THREE.Vector3(0 + x, 0 + y, tickSize / 2 + z));
        line.setColor(new THREE.Color(0xaaaaaa));
        line.setWidth(tickLineWidth);
        this.tickLines.addLine(line);
        this.allLines.push(line);
    }

    var mesh =   this.tickLines.buildMesh();
    mesh.position.set(-(tickDistance * (ticksDeep-1)) /2  -1 ,( tickDistance * (ticksDeep-1)) /2  -1,(- tickDistance * (ticksDeep-1))/2 +1 ); //-1 to keep us from being in the middle of a tick
    //mesh.position.set(-1 , -1, 0 ); //offset the center a bit so we are not in the middle of a tick
    return mesh;
};

FLOW.Environment.prototype.createBoxPoints = function(size) {
    var particles, uniforms;
    size = size || 200;
    var PARTICLE_SIZE = 20;

    var geometry1 = new THREE.BoxGeometry( size, size, size, 32, 32, 32 );
    var vertices = geometry1.vertices;
    var positions = new Float32Array( vertices.length * 3 );
    var colors = new Float32Array( vertices.length * 3 );
    var sizes = new Float32Array( vertices.length );
    var vertex;
    var color = new THREE.Color();
    for ( var i = 0, l = vertices.length; i < l; i ++ ) {
        vertex = vertices[ i ];
        vertex.toArray( positions, i * 3 );
        color.setHSL(  FLOW.MathUtils.randomBetweenFloat( 0.1,0.3)  + 0.1 * ( i / l ), FLOW.MathUtils.randomBetweenFloat( 0.7,0.9), FLOW.MathUtils.randomBetweenFloat( 0.3,0.6) )
        color.toArray( colors, i * 3 );
        sizes[ i ] = PARTICLE_SIZE * 0.5;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.addAttribute( 'customColor', new THREE.BufferAttribute( colors, 3 ) );
    geometry.addAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
    //
   var  vertexShader = [
       'attribute float size;',
        'attribute vec3 customColor;',
        'varying vec3 vColor;',
        'void main() {',
        'vColor = customColor;',
        'vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
        'gl_PointSize = size * ( 300.0 / -mvPosition.z );',
       'gl_Position = projectionMatrix * mvPosition;',
    '}'
    ].join('\n');
    var fragmentShader = [
        'uniform vec3 color;',
        'uniform sampler2D texture;',
        'varying vec3 vColor;',
        'void main() {',
            'gl_FragColor = vec4( color * vColor, 1.0 );',
           ' gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );',
           ' if ( gl_FragColor.a < ALPHATEST ) discard;',
       ' }'
    ].join('\n');


    var material = new THREE.ShaderMaterial( {
        uniforms: {
            color:   { value: new THREE.Color( 0xffffff ) },
            texture: { value: new THREE.TextureLoader().load( "graphics/disc.png" ) }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        alphaTest: 0.9
    } );
    //
    this.particles = new THREE.Points( geometry, material );
    return this.particles;
};

FLOW.Environment.prototype.update = function() {
    if ( this.floor) {
        this.floor.material.map.offset.y -= 0.001;
        this.floor.material.map.needsUpdate = true;
    }
};



(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Environment;
}));
