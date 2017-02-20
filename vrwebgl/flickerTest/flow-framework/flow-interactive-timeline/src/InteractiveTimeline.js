var THREE = THREE || require('three');

var d3 = d3 || require("d3");

var FLOW = FLOW || {};
FLOW.THREE = FLOW.THREE || require('flow-three');
FLOW.D3 = FLOW.D3 || require('flow-d3');
FLOW.Text = FLOW.Text || require('flow-text');
FLOW.Color = FLOW.Color || require('flow-color-utils');
FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.Lines = FLOW.Lines || require('flow-lines');
FLOW.Ui = FLOW.Ui || require('flow-ui');
FLOW.Dialog = FLOW.Dialog || require ('flow-dialog');

FLOW.InteractiveTimeline = {};

var Z_DIMENSION = 0.0001;

FLOW.InteractiveTimeline = function (params) {
    this.events = params.events || [];
    this.picker = params.picker;
    this.camera = params.camera;
    this.scene = params.scene;
    this.defaultEvent = params.defaultEvent || 0;
    this.maxFlagHeight = 0;
    this.flags = [];

    /* tick params */
    params.timeRange = params.timeRange;
    params.ticks = params.ticks;
    params.tickFormat = params.tickFormat || FLOW.D3.Axis.format("%Y");

    /* color params */
    params.axisColor = params.axisColor || "#adabab";
    params.labelColor = params.labelColor || "#ffffff";
    params.labelBackgroundColor = params.labelBackgroundColor || "#abc123";
    params.labelBackgroundOpacity = params.labelBackgroundOpacity || 0.5;
    params.textColor = params.textColor || "#ffffff";
    params.textOpacity = params.textOpacity || 1;
    params.borderColor = params.borderColor || "#aaaaaa";
    params.pointColor = params.pointColor || params.borderColor;

    /* text params */
    params.font = params.font || "Open Sans";
    params.fontSize = params.fontSize || 0.1;

    /* size params */
    params.tickSize = params.tickSize || 0.1;
    params.lineWidth = params.lineWidth || 2;
    params.padding = params.padding || 0.005;
    params.pointRadius = params.pointRadius || 0.005;
    params.borderThickness = params.borderThickness || 0.001;

    this.rootObject = new THREE.Object3D();

    this.axis = this.createTimeline(
        {
            timeRange: params.timeRange,
            ticks: params.ticks,
            tickFormat: params.tickFormat,
        },
        {
            tickSize: params.tickSize,
            lineWidth: params.lineWidth,
        },
        {
            font: params.font,
            fontSize: params.fontSize,
        },
        {
            axisColor: params.axisColor,
            labelColor: params.labelColor
        }
    );

    this.setEvents(
        this.axis,
        params.events,
        {
            color: params.labelBackgroundColor,
            opacity: params.labelBackgroundOpacity,
            padding: params.padding,
            borderThickness: params.borderThickness,
            borderColor: params.borderColor,
        },
        {
            font: params.font,
            fontSize: params.fontSize,
            color: params.textColor,
            opacity: params.textOpacity
        },
        {
            radius: params.pointRadius,
            color: params.pointColor,
        }
    );


    /*this.updateEventPlane(
        params.events[this.defaultEvent],
        {
            font: params.font,
            fontSize: params.fontSize,
            color: params.textColor,
            opacity: params.textOpacity
        },
        {
            padding: params.padding,
            color: params.labelBackgroundColor,
            opacity: params.labelBackgroundOpacity,
        }
    );*/

    this.rootObject.add(this.axis);

    return this;
};

FLOW.InteractiveTimeline.prototype.createTimeline = function (tickParams, sizeParams, textParams, colorParams) {

    var axisYears = new FLOW.D3.Axis()
        .orient("bottom")
        .scale(tickParams.timeRange)
        .ticks(tickParams.ticks)
        .tickFormat(tickParams.tickFormat)
        .tickSize(0, sizeParams.tickSize)
        .tickLineWidth(sizeParams.lineWidth)
        .axisLineWidth(sizeParams.lineWidth)
        .labelPadding(0, 0, - sizeParams.tickSize * 1.5, - 0.01)
        .font(textParams.font)
        .fontSize(textParams.fontSize)
        .axisLineColor(colorParams.axisColor)
        .tickLabelColor(colorParams.labelColor)
        .tickLineColor(colorParams.axisColor);

    var axisYearsObject = axisYears.create();
    axisYearsObject.position.set(0,0, -0.5);
    return axisYearsObject;
};

FLOW.InteractiveTimeline.prototype.setEvents = function (axis, events, flagBackgroundParams, textParams, pointParams) {

    for(var i in events) {
        var stem, plane, point;
        createPoint(events[i]);
        createFlag.call(this, events[i]);

        axis.add(stem.buildMesh());
        axis.add(plane);
        axis.add(point);

        plane.onSelected = function (intersection) {
            this.picker.removeCollider(intersection.object);
            for (var flag of this.flags)
             this.picker.removeCollider(flag);
             var dialog = new FLOW.Dialog({
                 distance: 0.2,
                 wrapType : FLOW.Text.WrapType.WRAP_BY_NUMBER_OF_CHARACTERS,
                 wrapValue : 30,
                 margin: 0.005,
                 dialogText: events[i].event,
                 camera: this.camera,
                 picker: this.picker,
                 rootScene: app.rootScene,
                 isModal: true,
                 borderThickness: flagBackgroundParams.borderThickness,
                 parentObject: app.rootScene,
                 fontSize: textParams.fontSize,
                 onOkSelected: function() {
                     this.picker.addColliders(this.flags);
                 }.bind(this),
             });

            //this.updateEventPlane(intersection.object.event, textParams);
        }.bind(this);

        point.onCollisionStarted = function (intersection) {
            intersection.object.plane.material.color = new THREE.Color("#ffffff");
            for (var flag of this.flags) {
                if (flag.point != intersection.object) {
                    flag.visible = false;
                    flag.point.visible = false;
                    flag.stem.getMesh().visible = false;
                }
            }
        }.bind(this);

        point.onCollisionFinished = function () {
            for (var flag of this.flags) {
                flag.visible = true;
                flag.point.visible = true;
                flag.stem.getMesh().visible = true;
                flag.material.color = new THREE.Color(flagBackgroundParams.backgroundColor);
            }
        }.bind(this);

        point.waitTime = 0;

        this.picker.addColliders(plane);
        this.picker.addColliders(point);

        plane.event = events[i];
        plane.stem = stem;
        plane.point = point;
        point.stem = stem;
        point.plane = plane;
        this.flags.push(plane);
        this.axis = axis;
    }


    function createFlag(event) {
        var labelParams = {
            text: event.summary,
            font: textParams.font,
            color: textParams.color,
            opacity: textParams.opacity,
            fontSize: textParams.fontSize,
            wrapValue: 20,
            align: FLOW.Text.ALIGN_LEFT,
            hAlign: FLOW.Text.ALIGN_LEFT,
            wrapType: FLOW.Text.WrapType.WRAP_BY_NUMBER_OF_CHARACTERS,
        };

        var labelText = new FLOW.Text.Text(labelParams);
        labelText.mesh = labelText.buildMesh();
        labelText.mesh.position.z = Z_DIMENSION;

        var planeWidth = labelText.getBoundingBox().getMax().x - labelText.getBoundingBox().getMin().x + flagBackgroundParams.padding * 2;
        var planeHeight = labelText.getBoundingBox().getMax().y - labelText.getBoundingBox().getMin().y + flagBackgroundParams.padding * 2;

        flagBackgroundParams.width = planeWidth;
        flagBackgroundParams.height = planeHeight;
        plane = new FLOW.Ui.Button(flagBackgroundParams,{borderThickness: flagBackgroundParams.borderThickness, color: flagBackgroundParams.borderColor}, labelText);
        plane.line.getMesh().visible = true;

        plane.position.set(event.x + planeWidth / 2, (i% 3)/25 + 0.05, FLOW.MathUtils.randomBetweenFloat(-Z_DIMENSION, Z_DIMENSION));

        var flowLine = new FLOW.Lines.Line();
        flowLine.setWidth(flagBackgroundParams.borderThickness);
        flowLine.setColor(new THREE.Color(flagBackgroundParams.borderColor));
        flowLine.addPoint(new THREE.Vector3(event.x, 0, 0));
        flowLine.addPoint(plane.position.clone().add(new THREE.Vector3(- planeWidth / 2, - planeHeight / 2, 0)));
        stem = new FLOW.Lines.Lines();
        stem.addLine(flowLine);

        if (plane.position.y + planeHeight / 2 > this.maxFlagHeight)
            this.maxFlagHeight = plane.position.y + planeHeight / 2;
    }

    function createPoint(event) {
        var geometry = new THREE.CircleGeometry(pointParams.radius, 20);
        var material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, color: pointParams.color});

        point = new THREE.Mesh(geometry, material);
        point.position.set(event.x, 0, Z_DIMENSION);
    }
};

FLOW.InteractiveTimeline.prototype.updateEventPlane = function (event, textParams, backgroundParams) {
    if (this.eventPlane){
        this.axis.remove(this.eventPlane);
        var backgroundParams = this.eventPlane.backgroundParams;
    }

    var labelParams = {
        text: event.event,
        font: textParams.font,
        color: textParams.color,
        opacity: textParams.opacity,
        fontSize: textParams.fontSize,
        wrapValue: 30,
        align: FLOW.Text.ALIGN_LEFT,
        hAlign: FLOW.Text.ALIGN_LEFT,
        wrapType: FLOW.Text.WrapType.WRAP_BY_NUMBER_OF_CHARACTERS,
    };

    var labelText = new FLOW.Text.Text(labelParams);
    labelText.mesh = labelText.buildMesh();
    labelText.mesh.position.z = Z_DIMENSION;

    var planeWidth = labelText.getBoundingBox().getMax().x - labelText.getBoundingBox().getMin().x + backgroundParams.padding * 2;
    var planeHeight = labelText.getBoundingBox().getMax().y - labelText.getBoundingBox().getMin().y + backgroundParams.padding * 2;

    var geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    var material = new THREE.MeshBasicMaterial({color: backgroundParams.color, transparent: true, opacity: backgroundParams.opacity });
    var eventPlane = new THREE.Mesh(geometry, material);

    eventPlane.text = labelText;
    eventPlane.backgroundParams = backgroundParams;
    this.eventPlane = eventPlane;

    this.eventPlane.add(labelText.mesh);
    this.eventPlane.position.set(0, this.maxFlagHeight + planeHeight / 2, 0);

    this.axis.add(eventPlane);
};

FLOW.InteractiveTimeline.prototype.remove = function () {
  for (var flag of this.flags) {
      this.picker.removeCollider(flag);
      this.picker.removeCollider(flag.point);
  }
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.InteractiveTimeline;
}));
