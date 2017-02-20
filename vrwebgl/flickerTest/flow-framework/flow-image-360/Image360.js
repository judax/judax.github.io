
var THREE = THREE || require('three');

var FLOW = FLOW || {};
FLOW.Animation = FLOW.Animation || require("flow-animation");
FLOW.Text = FLOW.Text || require('flow-text');
FLOW.Dialog = FLOW.Dialog || require('flow-dialog');


FLOW.Image360 = function( parentObject3D, params) {//id, imageUrl, parentObject3D, position, labelString, thumbnailUrl, imageAlphaTexture, alphaImageUrl){
    this.id = params.id;
    this.imageUrl = params.imageUrl;
    this.parentObject3D = parentObject3D;
    this.position = params.position;
    this.labelString = params.label;
    this.thumbnailUrl = params.thumbnailUrl;
    /*this.alphaImageTexture = params.alphaImageTexture; //reusable texture
    this.alphaImageUrl = params.alphaImageUrl; //use this if not resusable
*/
    this.width = params.width || 4;
    this.height = params.height || 3;
    this.lookAt = params.lookAt || null;

    this.mesh = null;
    this.label = null;
    this.labelMesh = null;

    return this;
};

FLOW.Image360.TextureLoader = new THREE.TextureLoader(); //reusable loader

FLOW.Image360.prototype.create = function(  ) {
    this.createMesh();
    if (this.labelString) {
        this.createLabel();
    }
};
/*
FLOW.Image360.prototype.createMesh = function(  ) {
    if (!this.imageUrl) {
        console.error("No imageURL provided!");
        return;
    }
    var imagesPath = "images/";
    //TOD: implement Thumbnails and LOD
    // var thumbnailTexture = THREE.ImageUtils.loadTexture( imagesPath + "thumbnailUrl", null);

    var imageTexture = FLOW.Image.TextureLoader.load(imagesPath + this.imageUrl);

 /!*   if (this.alphaImageUrl ) {
        this.alphaImageTexture = FLOW.Image.TextureLoader.load(imagesPath + this.alphaImageUrl);
    }*!/

    var material = new THREE.MeshBasicMaterial({
        map: imageTexture,
        side: THREE.DoubleSide
    });
    if (this.alphaImageTexture ) {
        material.alphaMap = this.alphaImageTexture;
        material.transparent = true;
    }
    var geometry = new THREE.PlaneGeometry(this.width, this.height);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.parentObject3D.add(this.mesh);
    if (this.lookAt) {
        this.mesh.lookAt( new THREE.Vector3(this.lookAt.x, this.lookAt.y, this.lookAt.z));
    }

    return this;
};*/


FLOW.Image360.prototype.createLabel = function() {
    var labelParams = { //TODO: configure all these params
        text: this.labelString,
        font: "Open Sans",
        fontSize:   0.2,
        align: FLOW.Text.ALIGN_CENTER,
        wrapType: FLOW.Text.WrapType.WRAP_BY_WIDTH,
        wrapValue:3.5,
        opacity: 1.0,
        color: "white"
    };

    this.label = new FLOW.Text.Text(labelParams);
    this.label.id = this.labelString;
    this.labelMesh = this.label.buildMesh();
    this.labelMesh.frustumCulled = false;

    var labelObject = new THREE.Object3D();
    labelObject.position.set(this.position.x, this.position.y-0.5, this.position.z  + 0.2); //TODO: configure position offset
    labelObject.add(this.labelMesh);
    this.parentObject3D.add(labelObject);

    return this;
};

FLOW.Image360.prototype.getMesh = function(){
    return this.mesh;
};


FLOW.Image360.prototype.createStreetMapBubble = function(params) {

    var animateCallback = function (params) { //callback when image is loaded
        //animate it out
        var sphereAnimation = new FLOW.Animation.Animation({
            initialValues: [params.initialPosition.x, params.initialPosition.y, params.initialPosition.z, params.initialScale],
            finalValues: [params.finalPosition.x, params.finalPosition.y, params.finalPosition.z, 1],
            duration: params.zoomDuration,
            easingFunction: FLOW.Animation.Easing.Exponential,
            onUpdated: function (values) {
                this.position.set(values[0], values[1], values[2]);
                this.scale.set(values[3], values[3], values[3]);
            }.bind(this.mesh)
        });
        app.animations.addAnimation(sphereAnimation);
        sphereAnimation.start();
    }.bind(this, params);

    var pano360Url = params.panoUrl ? params.panoUrl :'graphics/placeholder.jpg';
    var material = new THREE.MeshBasicMaterial({
        side: THREE.FrontSide
    });

    if (params.panoUrl) {
        material.map = THREE.ImageUtils.loadTexture(pano360Url, null, animateCallback);
        this.createSphereGeometry(params, material);

    } else {
        var myLatlng = new google.maps.LatLng(params.location[0], params.location[1]);//48.85756457845009, 2.293175671878622);//this.currentFocusedNode.lat, this.currentFocusedNode.lg );
        this.loadGSVPanorama(material, myLatlng, params.panoId, function() {
            this.createSphereGeometry(params, material); //TODO: show the small shpere before loading
            animateCallback();
            app.picker.dialog = this.dismissDialog;
        }.bind(this))

    }
};

FLOW.Image360.prototype.createSphereGeometry = function(params, material) {
    var geometry = new THREE.SphereGeometry(params.radius, 60);
    geometry.scale(-1, 1, 1);
    this.mesh = new THREE.Mesh(geometry, material);
    if (params.initialPosition) {
        this.mesh.position.set(params.initialPosition.x, params.initialPosition.y, params.initialPosition.z);
    } else {
        this.mesh.position.set(params.finalPosition.x, params.finalPosition.y, params.finalPosition);
    }
    this.mesh.scale.set(params.initialScale, params.initialScale, params.initialScale);
    this.parentObject3D.add(this.mesh);

    this.dismissDialog = new FLOW.Dialog({
        dialogText: "Exit bubble?",
        rootScene: app.rootScene,
        camera: app.camera,
        picker: app.picker,
        cancelButton: false,
        isModal: true,
        verticalAngle : -Math.PI / 3,
       distance: 4,
        parentObject: app.rootScene,
        onOkSelected: function () {
            app.mapView.object.visible = true;
            if (app.createButtonsForCityLabel) {
                app.createButtonsForCityLabel();
            }
            app.picker.addColliders(app.mapView.pointCloud);
            app.picker.dialog = null;
            console.log("OK");
            app.enableNavigation();
            this.parentObject3D.remove(this.mesh);
            this.dismissDialog.removeDialog();
        }.bind(this)
    });
    app.disableNavigation();
    this.dismissDialog.object.visible = false;
}


FLOW.Image360.prototype.loadGSVPanorama = function( material, location, panoId, onLoaded ) {

    //setProgress( 0 );
    //showProgress( true );

    var gsvPano = new FLOW.Image360.GSVPANO( {
        useWebGL: false,
        zoom: 3
    } );
    gsvPano.onSizeChange = function() {

    };
    gsvPano.onProgress = function( p ) {
        //setProgress( p );
    };
    gsvPano.onError = function( message ) {
        console.log(message);

        // showError( message );
        // showProgress( false );
    };
    gsvPano.onPanoramaLoad = function() {

        var source = this.canvas[ 0 ];
        material.map = new THREE.Texture( source );
        material.map.needsUpdate = true;

        var canvas = document.createElement( 'canvas' );
        var s = 2;
        canvas.width = source.width / s;
        canvas.height = source.height / s;
        var ctx = canvas.getContext( '2d' );
        ctx.drawImage( source, 0, 0, source.width, source.height, 0, 0, canvas.width, canvas.height );

        if (onLoaded) {
            onLoaded();
        }

        //showProgress( false );
    };


    if (panoId){
        gsvPano.loadFromId( panoId ); //"zo5MuEyyBsa4wE7fl_D6Aw" )
    } else {
        gsvPano.isPresent(location, function(location, id) {
            gsvPano.loadPano(location, id);
        }, function(location){
            //TODO: pop up a dialog message letting the user know
        });

    }

    //To obtain an pano ID: http://stackoverflow.com/questions/32523173/google-maps-embed-api-panorama-id
    // <img src="//geo0.ggpht.com/cbk?panoid=wRbzqQN7ZOG5ho0oc6cTZg&amp;output=thumbnail&amp;cb_client=maps_sv.tactile.gps&amp;thumb=2&amp;w=203&amp;h=100&amp;yaw=332.06937&amp;pitch=0&amp;thumbfov=100" class="widget-runway-card-background-flicker-hack">
    //copy out html:
    /*<img src="//geo0.ggpht.com/cbk?panoid=02Urcfjt8FbKaWyHy_uUDw&amp;output=thumbnail&amp;cb_client=maps_sv.tactile.gps&amp;thumb=2&amp;w=203&amp;h=100&amp;yaw=271.30206&amp;pitch=0&amp;thumbfov=100"
     class="widget-runway-card-background-flicker-hack">*/

};




//https://github.com/konforti/GSVPano

FLOW.Image360.GSVPANO = function (parameters) {

    'use strict';
    google.maps.streetViewViewer = 'photosphere';//added per https://code.google.com/p/gmaps-api-issues/issues/detail?id=7452#c51
    var _parameters = parameters || {},
        _location,
        _zoom,
        _panoId,
        _panoClient = new google.maps.StreetViewService(),
        _count = 0,
        _total = 0,
        _canvas = [],
        _ctx = [],
        _wc = 0,
        _hc = 0,
        _panoWidth, _panoHeight,
        result = null,
        rotation = 0,
        copyright = '',
        onSizeChange = null,
        onPanoramaLoad = null;

    var levelsW = [ 1, 2, 4, 7, 13, 26 ],
        levelsH = [ 1, 1, 2, 4, 7, 13 ];

    var widths = [ 416, 832, 1664, 3328, 6656, 13312 ],
        heights = [ 416, 416, 832, 1664, 3328, 6656 ];

    var gl = null;
    try{
        var canvas = document.createElement( 'canvas' );
        gl = canvas.getContext('experimental-webgl');
        if(gl == null){
            gl = canvas.getContext('webgl');
        }
    }
    catch(error){}

    var maxW = 1024,
        maxH = 1024;

    if( gl ) {
        var maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        console.log( 'MAX_TEXTURE_SIZE ' + maxTexSize );
        maxW = maxH = maxTexSize;
    }

    this.maxTexSize = maxW;

    this.setProgress = function (p) {

        if (this.onProgress) {
            this.onProgress(p);
        }

    };

    this.throwError = function (message) {

        if (this.onError) {
            this.onError(message);
        } else {
            console.error(message);
        }

    };

    this.adaptTextureToZoom = function () {

        var w = widths [ _zoom ],
            h = heights[ _zoom ];

        _panoWidth = w;
        _panoHeight = h;

        _wc = Math.ceil( w / maxW );
        _hc = Math.ceil( h / maxH );

        _canvas = []; _ctx = [];

        var ptr = 0;
        for( var y = 0; y < _hc; y++ ) {
            for( var x = 0; x < _wc; x++ ) {
                var c = document.createElement('canvas');
                if( x < ( _wc - 1 ) ) c.width = maxW; else c.width = w - ( maxW * x );
                if( y < ( _hc - 1 ) ) c.height = maxH; else c.height = h - ( maxH * y );
                console.log( 'New canvas of ' + c.width + 'x' + c.height );
                c.GSVPANO = { x: x, y: y };
                _canvas.push( c );
                _ctx.push( c.getContext('2d') );
                ptr++;
            }
        }

        //console.log( _canvas );

    };

    this.composeFromTile = function (x, y, texture) {

        x *= 512;
        y *= 512;
        var px = Math.floor( x / maxW ), py = Math.floor( y / maxH );

        x -= px * maxW;
        y -= py * maxH;

        _ctx[ py * _wc + px ].drawImage(texture, 0, 0, texture.width, texture.height, x, y, 512, 512 );
        this.progress();

    };

    this.progress = function() {

        _count++;

        var p = Math.round(_count * 100 / _total);
        this.setProgress(p);

        if (_count === _total) {
            this.canvas = _canvas;
            this.panoId = _panoId;
            this.zoom = _zoom;
            this.panoWidth = _panoWidth;
            this.panoHeight = _panoHeight;
            if (this.onPanoramaLoad) {
                this.onPanoramaLoad();
            }
        }
    }

    this.loadFromId = function( id ) {

        _panoId = id;
        this.composePanorama();

    };

    this.composePanorama = function () {

        this.setProgress(0);
        //console.log('Loading panorama for zoom ' + _zoom + '...');

        var w = levelsW[ _zoom ],
            h = levelsH[ _zoom ],
            self = this,
            url,
            x,
            y;

        //console.log( w, h, w * 512, h * 512 );

        _count = 0;
        _total = w * h;

        var self = this;
        for( var y = 0; y < h; y++ ) {
            for( var x = 0; x < w; x++ ) {
                //key: AIzaSyBcWq7mlUL-CZkuSSvwBQ_QaAwGWUWXRWc
                var url = 'https://cbks2.google.com/cbk?cb_client=maps_sv.tactile&authuser=0&hl=en&panoid=' + _panoId + '&output=tile&zoom=' + _zoom + '&x=' + x + '&y=' + y + '&' + Date.now();
                url = 'https://geo0.ggpht.com/cbk?cb_client=maps_sv.tactile&authuser=0&hl=en&panoid=' + _panoId + '&output=tile&x=' + x + '&y=' + y + '&zoom=' + _zoom + '&nbt&fover=2';

                ( function( x, y ) {
                    if( _parameters.useWebGL ) {
                        var texture = THREE.ImageUtils.loadTexture( url, null, function() {
                            //console.log( 'loaded ' + url );
                            self.composeFromTile( x, y, texture );
                        } );
                    } else {
                        var img = new Image();
                        img.addEventListener( 'load', function() {
                            self.composeFromTile( x, y, this );
                        } );
                        img.crossOrigin = '';
                        img.src = url;
                    }
                } )( x, y );
            }
        }

    };

    this.isPresent = function (location, successCallback, failureCallback) {

        //console.log('Load for', location);
        var self = this;

        var url = 'https://maps.google.com/cbk?output=json&hl=x-local&ll=' + location.lat() + ',' + location.lng() + '&cb_client=maps_sv&v=3';
        url = 'https://cbks0.google.com/cbk?cb_client=maps_sv.tactile&authuser=0&hl=en&output=polygon&it=1%3A1&rank=closest&ll=' + location.lat() + ',' + location.lng() + '&radius=350';

        var http_request = new XMLHttpRequest();
        http_request.open( "GET", url, true );
        http_request.onreadystatechange = function () {
            if ( http_request.readyState == 4 && http_request.status == 200 ) {
                var data = JSON.parse( http_request.responseText );
                //self.loadPano( location, data.Location.panoId );
                if (data.result) {
                    successCallback(location, data.result[0].id);
                    //self.loadPano(location, data.result[0].id);
                } else {
                    self.throwError("No street found for that location.")
                    if (failureCallback) {
                        failureCallback(location);
                    }
                }
            }
        };
        http_request.send(null);

    };

    this.loadPano = function( location, id ) {

        //console.log( 'Load ' + id );
        var self = this;
        google.maps.streetViewViewer = 'photosphere';//added per https://code.google.com/p/gmaps-api-issues/issues/detail?id=7452#c51
        _panoClient.getPanoramaById( id, function (result, status) {
            if (status === google.maps.StreetViewStatus.OK) {
                self.result = result;
                if( self.onPanoramaData ) self.onPanoramaData( result );
                var h = google.maps.geometry.spherical.computeHeading(location, result.location.latLng);
                rotation = (result.tiles.centerHeading - h) * Math.PI / 180.0;
                copyright = result.copyright;
                self.copyright = result.copyright;
                _panoId = result.location.pano;
                self.location = location;
                self.composePanorama();
            } else {
                if( self.onNoPanoramaData ) self.onNoPanoramaData( status );
                self.throwError('Could not retrieve panorama for the following reason: ' + status);
            }
        });

    };

    this.setZoom = function( z ) {
        _zoom = z;
        console.log( z );
        this.adaptTextureToZoom();
    };

    this.setZoom( _parameters.zoom || 1 );

};



(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Image360;
}));