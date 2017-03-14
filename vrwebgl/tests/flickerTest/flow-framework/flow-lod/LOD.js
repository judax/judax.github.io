
var THREE = THREE || require('three');

var FLOW = FLOW || {};

FLOW.D3 = FLOW.D3 || require("flow-d3");
FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.THREE = FLOW.THREE || require('flow-three');
FLOW.Lines = FLOW.Lines || require('flow-lines');
FLOW.Text = FLOW.Text || require('flow-text');
FLOW.MathUtils = FLOW.MathUtils || require("flow-math-utils");

/**
 * A FLOW.LOD has an Object which contains multiple geometries that
 * are swapped (visible = true or false) based on the distance from the camera
 *
 * altered from THREE.LOD
 *  Example usage:
 var geometries = [
     [ new THREE.IcosahedronGeometry( 1, 4 ), .5 ],
     [ new THREE.IcosahedronGeometry( 1, 3 ), 3 ],
     [ new THREE.IcosahedronGeometry( 1, 2 ), 10 ],
     [ new THREE.IcosahedronGeometry( 1, 1 ), 20 ],
     [ new THREE.IcosahedronGeometry( 1, 0 ), 80 ]
 ];

 this.lod = new FLOW.LOD();
 this.lod.create(this.scene, geometries,
    new THREE.MeshLambertMaterial( { color: 0xffffff, wireframe: true } ),
    {x: 0, y:0, z:-10});

---OR---
 this.lod = FLOW.LOD.createTimeline(this.scene, {x:0, y:0, z:-150});


 * @param parentObject3D
 * @param params
 * @returns {FLOW.LOD}
 * @constructor
 */
FLOW.LOD = function() {

    this.object = new THREE.Object3D();
    this.object.name = "lod";

    this.type = 'LOD';

    this.levels = [];

    return this;
};

FLOW.LOD.v1 = new THREE.Vector3();
FLOW.LOD.v2 = new THREE.Vector3();


FLOW.LOD.prototype.create = function( parentObject, geometries, material, position ){

    var i, mesh;

    for ( i = 0; i < geometries.length; i ++ ) {
        mesh = new THREE.Mesh(geometries[i][0], material);
        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        this.addLevel(mesh, geometries[i][1]);
    }

    this.object.position.set(position.x, position.y, position.z);
    this.object.updateMatrix();
    this.object.matrixAutoUpdate = false;
    parentObject.add( this.object );

    return this;
};

FLOW.LOD.prototype.addLevel = function ( object, distance, centerObject, replace = false ) {
    if (distance === undefined) distance = 0;
    distance = Math.abs(distance);

    var levels = this.levels;

    for (var l = 0; l < levels.length; l++) {
        if(distance == levels[l].distance && replace) {
            this.object.remove(levels[l].object);
            levels.splice(l, 1);
        }

        if (distance < levels[l].distance) {
            break;
        }
    }

    levels.splice(l, 0, {distance: distance, object: object,  centerObject: centerObject});
    this.object.add(object);
};

FLOW.LOD.prototype.getObjectForDistance = function ( distance ) {

    var levels = this.levels;

    for (var i = 1, l = levels.length; i < l; i++) {
        if (distance < levels[i].distance) {
            break;
        }
    }
    return levels[i - 1].object;
};


FLOW.LOD.prototype.update = function (camera) {

    var levels = this.levels;

    if (levels.length > 1) {
        FLOW.LOD.v1.setFromMatrixPosition(camera.matrixWorld);
        FLOW.LOD.v2.setFromMatrixPosition(this.object.matrixWorld);

        var distance = FLOW.LOD.v1.distanceTo(FLOW.LOD.v2);

        levels[0].object.visible = true;

        for (var i = 1, l = levels.length; i < l; i++) {
            if (distance >= levels[i].distance) {
                levels[i - 1].object.visible = false;
                levels[i].object.visible = true;
            } else {
                break;
            }
        }

        for (; i < l; i++) {
            levels[i].object.visible = false;
        }
    }

};




/* inherits from THREE.LOD */
FLOW.LOD.Timeline = function() {

    FLOW.LOD.call(this);

    this.type = 'TimelineLOD';

    this.levels = [];

    this.timeout = 0;
    this.timeoutStart = 0;
    this.timeoutLimit = 60;
    this.lastCameraPosition = new THREE.Vector3();

    return this;
};

FLOW.OOPUtils.prototypalInheritance(FLOW.LOD.Timeline, FLOW.LOD);

FLOW.LOD.Timeline.Millenia = 0;
FLOW.LOD.Timeline.Centuries = 1;
FLOW.LOD.Timeline.Decades = 2;
FLOW.LOD.Timeline.Years = 3;
FLOW.LOD.Timeline.Month = 4;
FLOW.LOD.Timeline.Days = 5;
FLOW.LOD.Timeline.Hours = 6;
FLOW.LOD.Timeline.Minutes = 7;

FLOW.LOD.Timeline.prototype.coordinateToTime = function(x) {
    return new Date(this.coordinateRange(x));
};

FLOW.LOD.Timeline.prototype.timeToCoordnate = function(time) {
    return this.range(time);
};

FLOW.LOD.Timeline.prototype.getDateVector = function(time) {
    var pos = this.object.position.clone();
    pos.x += this.range(time);
    return pos;
};

FLOW.LOD.Timeline.prototype.currentTimeCoordinate = function() {
    //return this.levels[0].centerObject;
    
    var x = this.timeToCoordnate(this.currentDate);
    var pos = this.object.position.clone();
    pos.copy(this.object.position);
    pos.x += x;
    pos.y += 1.6; //move the camera to where the text is

    // because FLOW.Perspective.moveCameraTo works only with objects
    return {getWorldPosition: function() { return pos }};
};

FLOW.LOD.Timeline.prototype.updateDate = function(camera) {
    var vec = this.object.getWorldPosition();
    var cam_pos = camera.getWorldPosition();
    cam_pos.sub(vec);

    cam_pos.projectOnVector(this.axisVector);
    this.currentPosition = cam_pos.length();
    if(cam_pos.x < 0) {
        this.currentPosition = -this.currentPosition;
    }
    this.currentDate = this.coordinateToTime(this.currentPosition);

    vec = camera.getWorldPosition();
    vec.sub(this.object.getWorldPosition());
    this.distance = vec.distanceTo(cam_pos);
};

var adjustForLevel = function(level, zdepth, levelsRange) {
    var dividers = [1,10,10,12,31,24,60];
    var d = zdepth;
    if(level < levelsRange[0] || level > levelsRange[1]) {
        debugger;
    } else if(level == levelsRange[0]) {
        return 0;
    } else if(level == levelsRange[0] +1 && levelsRange[0] != levelsRange[1]) {
        return zdepth;
    } else {
        var distance = zdepth
        for(var i = levelsRange[0] + 1; i < level; i++) {
            distance += zdepth/dividers[i]
        }
        return distance;
    }
};

var fullDate = function(date, year) {
    date.setFullYear(year);
    return date;
};

FLOW.LOD.Timeline.prototype.update = function (camera) {

    var levels = this.levels;

    
    if ( levels.length > 1 ) {

        this.updateDate(camera);

        var depth = 0;
        for (var i = 0, l = levels.length; i < l; i++) {
            var item = levels[i];
            if (this.distance < item.distance) {
                item.object.visible = true;
                depth += 1;
            } else {
                item.object.visible = false;
            }
        }

        if(this.currentDate > this.dateRange.start && this.currentDate  < this.dateRange.end) {
            this.updateAxis(depth);
        }

        this.focus.x = this.range(this.currentDate) + this.object.position.x;
    }
};

FLOW.LOD.Timeline.prototype.updateAxis = function(depth) {

    if((this.minLevel <= 0 && this.maxLevel >= 0) && !this.centuriesList[0].visible  ) {
        this.centuriesRedraw = true;  
    }
    if((this.minLevel <= 0 && this.maxLevel >= 0) && this.centuriesList[0].visible   ) {
        if(this.centuriesRedraw) {
            this.centuriesRedraw = false;
            this.loadCenturies();
        }
        else if(this.currentDate > this.nextCenturiesRedraw) {
            this.loadCenturies("next");
        }

        else if(this.currentDate < this.previousCenturiesRedraw) {
            this.loadCenturies("previous");
        }
    }

    if((this.minLevel <= 1 && this.maxLevel >= 1) && !this.decadesList[0].visible  ) {
        this.decadesRedraw = true;  
    }
    if((this.minLevel <= 1 && this.maxLevel >= 1) && this.decadesList[0].visible   ) {
        if(this.decadesRedraw) {
            this.decadesRedraw = false;
            this.loadDecades();
        }
        else if(this.currentDate > this.nextDecadesRedraw) {
            this.loadDecades("next");
        }

        else if(this.currentDate < this.previousDecadesRedraw) {
            this.loadDecades("previous");
        }
    }

    if((this.minLevel <= 2 && this.maxLevel >= 2) && !this.yearsList[0].visible  ) {
        this.yearsRedraw = true;  
    }
    if((this.minLevel <= 2 && this.maxLevel >= 2) &&  this.yearsList[0].visible   ) {
        if(this.yearsRedraw) {
            this.yearsRedraw = false;
            this.loadYears();
        }
        else if(this.currentDate > this.nextYearsRedraw) {
            this.loadYears("next");
        }

        else if(this.currentDate < this.previousYearsRedraw) {
            this.loadYears("previous");
        }
    }

    if((this.minLevel <= 3 && this.maxLevel >= 3) && !this.monthList[0].visible  ) {
        this.monthRedraw = true;  
    }
    if((this.minLevel <= 3 && this.maxLevel >= 3) &&  this.monthList[0].visible   ) {
        if(this.monthRedraw) {
            this.monthRedraw = false;
            this.loadMonth();
        }
        else if(this.currentDate > this.nextMonthRedraw) {
            this.loadMonth("next");
        }
        else if(this.currentDate < this.previousMonthRedraw) {
            this.loadMonth("previous");
        }
    }

    if((this.minLevel <= 4 && this.maxLevel >= 4) && !this.daysList[0].visible  ) {
        this.redrawDays = true;  
    }
    if((this.minLevel <= 4 && this.maxLevel >= 4) &&  this.daysList[0].visible  ) {
        if(this.redrawDays) {
            this.redrawDays = false;
            this.loadDays();
        }
        else if(this.currentDate > this.nextDaysRedraw) {
            this.loadDays("next");
        }
        else if(this.currentDate < this.previousDaysRedraw) {
            this.loadDays("previous");
        }
        
    } 
    
    if(this.minLevel <= 6 && this.maxLevel >= 6) {
        this.updateHours();
    }

    if(this.minLevel <= 7 && this.maxLevel >= 7) {
        this.updateMinutes();
    }

};

FLOW.LOD.Timeline.prototype.loadYearsGeneric = function(magnitude, list, params, direction, previousRedraw, nextRedraw) {
    magnitude = 10*magnitude;
    if(!direction) {
        if(list.length != 0) {
            for(var i = list.length; i >= 0; i--) {
                this.object.remove(list[i]);
                list[i] = null;
                list.splice(i, 1);
            }
        }
        list = []
       
        if(isFinite(params.numberShown)) { 

            var center = (params.numberShown-1)/2;
            var year = this.currentDate.getFullYear() - this.currentDate.getFullYear() % magnitude;
            previousRedraw = fullDate(new Date(year, 0, 1), year);
            nextRedraw     = new Date(previousRedraw);
            nextRedraw.setFullYear(nextRedraw.getFullYear() + magnitude);

            for(var i = 0; i < params.numberShown; i++) {
                var time1 = fullDate(new Date(year, 0, 1), year);
                if(i < (center - 1) ) {
                    var time1_year = time1.getFullYear() - magnitude*(center - i);
                } else {
                    var time1_year = time1.getFullYear() + magnitude*(i -center); 
                }
                time1.setFullYear(time1_year);
                var time2 = new Date(time1);
                time2.setFullYear(time1.getFullYear() + magnitude);

                var domain = [time1, time2];
                var range  = [this.range(time1), this.range(time2)];
                var items = this.createTimeLine(domain, range, params);
                if(items != null) {
                    list.push(items);
                }
            }

        } else {

            time1 = this.dateRange.start;
            time2 = this.dateRange.end;
            var domain = [time1, time2];
            var range  = [this.range(time1), this.range(time2)];
            var items = this.createTimeLine(domain, range, params);
            if(items != null) {
                list.push(items);
            }

        }
    }

    else if(direction == "next") {
        var offset = (params.numberShown - 1) / 2; 
        var year = this.currentDate.getFullYear() - this.currentDate.getFullYear()%magnitude;
        var time1 = fullDate(new Date(year + magnitude*offset, 0, 1), year + magnitude);
        var time2 = new Date(time1);
        time2.setFullYear(time1.getFullYear()+ magnitude);

        var domain = [time1, time2];
        var range  = [this.range(time1), this.range(time2)];
        var items = this.createTimeLine(domain, range, params);
        if(items != null) {
            list.push(items);

            this.object.remove(list[0]);
            list[0] = null;
            list.splice(0, 1);

        }
        nextRedraw.setFullYear(nextRedraw.getFullYear() + magnitude);
        previousRedraw.setFullYear(previousRedraw.getFullYear() + magnitude);
    }

    else if(direction == "previous") {
        var offset = (params.numberShown - 1) / 2;
        var year = this.currentDate.getFullYear() - this.currentDate.getFullYear()%magnitude;
        var time1 = fullDate(new Date(year - magnitude*offset, 0, 1), year - magnitude);
        var time2 = new Date(time1);
        time2.setFullYear(time1.getFullYear() + magnitude);

        var domain = [time1, time2];
        var range  = [this.range(time1), this.range(time2)];
        var items = this.createTimeLine(domain, range, params);
        if(items != null) { 
            list.unshift(items);

            this.object.remove(list[list.length - 1]);
            list[list.length - 1] = null;
            list.splice(list.length - 1, 1);
        }
        nextRedraw.setFullYear(nextRedraw.getFullYear() - magnitude);
        previousRedraw.setFullYear(previousRedraw.getFullYear() - magnitude);
    }
    return [list, previousRedraw, nextRedraw];
};

FLOW.LOD.Timeline.prototype.loadMillennia = function(direction) {
    this.loadYearsGeneric(1000, this.millenniaList, this.millenniaParams, direction, this.previousMillenniaRedraw, this.nextMillenniaRedraw);
};

FLOW.LOD.Timeline.prototype.loadCenturies = function(direction) {
    var r =this.loadYearsGeneric(100, this.centuriesList, this.centuriesParams, direction, this.previousCenturiesRedraw, this.nextCenturiesRedraw);
    this.centuriesList = r[0];
    this.previousCenturiesRedraw = r[1];
    this.nextCenturiesRedraw = r[2];
};

FLOW.LOD.Timeline.prototype.loadDecades = function(direction) {
    var r = this.loadYearsGeneric(10, this.decadesList, this.decadesParams, direction, this.previousDecadesRedraw, this.nextDecadesRedraw);
    this.decadesList = r[0];
    this.previousDecadesRedraw = r[1];
    this.nextDecadesRedraw = r[2]
    //[this.decadesList, this.previousDecadesRedraw, this.nextDecadesRedraw] = r;
};

FLOW.LOD.Timeline.prototype.loadYears = function(direction) {
    var r = this.loadYearsGeneric(1, this.yearsList, this.yearsParams, direction, this.previousYearsRedraw, this.nextYearsRedraw); 
    this.yearsList = r[0];
    this.previousYearsRedraw = r[1];
    this.nextYearsRedraw = r[2];
    //[this.yearsList, this.previousYearsRedraw, this.nextYearsRedraw] = r;
};

FLOW.LOD.Timeline.prototype.loadMonth = function(direction) {

    if(!direction) {
        if(this.monthList.length != 0) {
            for(var i = this.monthList.length; i >= 0; i--) {
                this.object.remove(this.monthList[i]);
                this.monthList[i] = null;
                this.monthList.splice(i, 1);
            }
        }
        this.monthList = []
        var center = (this.monthParams.numberShown-1)/2;

        this.previousMonthRedraw = fullDate(new Date(this.currentDate.getFullYear(), 0, 1), this.currentDate.getFullYear());
        this.nextMonthRedraw     = new Date(this.previousMonthRedraw);
        this.nextMonthRedraw.setFullYear(this.nextMonthRedraw.getFullYear() + 1);

        for(var i = 0; i < this.monthParams.numberShown; i++) {
            var time1 = fullDate(new Date(this.currentDate.getFullYear(), 0, 1), this.currentDate.getFullYear());
            if(i < (center - 1) ) {
                time1.setFullYear(time1.getFullYear() - (center - i) );
            } else {
                time1.setFullYear(time1.getFullYear() + (i -center) );
            }
            var time2 = new Date(time1);
            time2.setFullYear(time1.getFullYear()+1);

            var domain = [time1, time2];
            var range  = [this.range(time1), this.range(time2)];
            var month = this.createTimeLine(domain, range, this.monthParams);
            if(month != null) {
                this.monthList.push(month);
            }
            /*
            can be used to set redraw dates to ends of the interval
            if(i == 0) {
                this.previousMonthRedraw = new Date(time1);
                this.previousMonthRedraw.setMonth(6)
            } else if(i == this.monthParams.numberShown - 1) {
                this.nextMonthRedraw = new Date(time1);
                this.nextMonthRedraw.setMonth(6);
            }
            */
        }
    }

    else if(direction == "next") {
        var offset = (this.monthParams.numberShown - 1) / 2 
        var time1 = fullDate(new Date(this.currentDate.getFullYear() + offset, 0, 1), this.currentDate.getFullYear() + 1);
        var time2 = new Date(time1);
        time2.setFullYear(time1.getFullYear()+1);

        var domain = [time1, time2];
        var range  = [this.range(time1), this.range(time2)];
        var month = this.createTimeLine(domain, range, this.monthParams);
        if(month != null) {
            this.monthList.push(month);

            this.object.remove(this.monthList[0]);
            this.monthList[0] = null;
            this.monthList.splice(0, 1);

            this.nextMonthRedraw.setFullYear(this.nextMonthRedraw.getFullYear() + 1);
            this.previousMonthRedraw.setFullYear(this.previousMonthRedraw.getFullYear() + 1);
        }


    }

    else if(direction == "previous") {
        var offset = (this.monthParams.numberShown - 1) / 2 
        var time1 = fullDate(new Date(this.currentDate.getFullYear() - offset, 0, 1), this.currentDate.getFullYear() - 1);
        var time2 = new Date(time1);
        time2.setFullYear(time1.getFullYear()+1);

        var domain = [time1, time2];
        var range  = [this.range(time1), this.range(time2)];
        var month = this.createTimeLine(domain, range, this.monthParams);
        if(month != null) {
            this.monthList.unshift(month);

            this.object.remove(this.monthList[this.monthList.length - 1]);
            this.monthList[this.monthList.length - 1] = null;
            this.monthList.splice(this.monthList.length - 1, 1);

            this.nextMonthRedraw.setFullYear(this.nextMonthRedraw.getFullYear() - 1);
            this.previousMonthRedraw.setFullYear(this.previousMonthRedraw.getFullYear() - 1);
        }
    }
};

FLOW.LOD.Timeline.prototype.loadDays    = function(direction) {

    if(!direction) {
        if(this.daysList.length != 0) {
            for(var i = this.daysList.length; i >= 0; i--) {
                this.object.remove(this.daysList[i]);
                this.daysList[i] = null;
                this.daysList.splice(i, 1);
            }
        }
        this.daysList = []
        var center = (this.daysParams.numberShown-1)/2;

        this.previousDaysRedraw = fullDate(new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1), this.currentDate.getFullYear());
        this.nextDaysRedraw     = new Date(this.previousDaysRedraw);
        this.nextDaysRedraw.setMonth(this.nextDaysRedraw.getMonth() + 1);

        for(var i = 0; i < this.daysParams.numberShown; i++) {
            var time1 = fullDate(new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1), this.currentDate.getFullYear());
            if(i < (center - 1) ) {
                time1.setMonth(time1.getMonth() - (center - i) );
            } else {
                time1.setMonth(time1.getMonth() + (i -center) );
            }
            var time2 = new Date(time1);
            time2.setMonth(time1.getMonth()+1);

            var domain = [time1, time2];
            var range  = [this.range(time1), this.range(time2)];
            var month = this.createTimeLine(domain, range, this.daysParams);
            if(month != null) {
                this.daysList.push(month);
            }
            /*
            if(i == 0) {
                this.previousMonthRedraw = new Date(time1);
                time1.setMonth(time1.getMonth() + 1);
                time1.setDate(0);
                this.previousMonthRedraw.setDate(time1.getDate()*0.5)
            } else if(i == this.monthParams.numberShown - 1) {
                this.nextMonthRedraw = new Date(time2);
                time2.setDate(0)
                this.nextMonthRedraw.setDate(time2.getDate()*0.5);
            }
            */
        }
    }

    else if(direction == "next") {
        var offset = (this.daysParams.numberShown - 1) / 2 
        var time1 = fullDate(new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1), this.currentDate.getFullYear());
        time1.setMonth(time1.getMonth()+offset);
        var time2 = new Date(time1);
        time2.setMonth(time1.getMonth()+1);

        var domain = [time1, time2];
        var range  = [this.range(time1), this.range(time2)];
        var month = this.createTimeLine(domain, range, this.daysParams);
        if(month != null) {
            this.daysList.push(month);

            this.object.remove(this.daysList[0]);
            this.daysList[0] = null;
            this.daysList.splice(0, 1);

            this.nextDaysRedraw.setMonth(this.nextDaysRedraw.getMonth() + 1);
            this.previousDaysRedraw.setMonth(this.previousDaysRedraw.getMonth() + 1);
        }
    }

    else if(direction == "previous") {
        var offset = (this.daysParams.numberShown - 1) / 2 
        var time1 = fullDate(new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1), this.currentDate.getFullYear());
        time1.setMonth(time1.getMonth()-offset);
        var time2 = new Date(time1);
        time2.setMonth(time1.getMonth()+1);

        var domain = [time1, time2];
        var range  = [this.range(time1), this.range(time2)];
        var month = this.createTimeLine(domain, range, this.daysParams);
        if(month != null) {
            this.daysList.unshift(month);

            this.object.remove(this.daysList[this.daysList.length - 1]);
            this.daysList[this.daysList.length- 1] = null;
            this.daysList.splice(this.daysList.length - 1, 1);

            this.nextDaysRedraw.setMonth(this.nextDaysRedraw.getMonth() - 1);
            this.previousDaysRedraw.setMonth(this.previousDaysRedraw.getMonth() - 1);
        }
    }
};

FLOW.LOD.Timeline.prototype.updateHours   = function() {
    var date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate() + 1);
    var x = this.timeToCoordnate(date);
    this.hours.position.x = x - this.hours.center;
    this.hours.updateMatrix();
};

FLOW.LOD.Timeline.prototype.updateMinutes = function() {
    var date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate(), this.currentDate.getHours() + 1);
    var x = this.timeToCoordnate(date);
    this.minutes.position.x = x - this.minutes.center;
    this.minutes.updateMatrix();
};

FLOW.LOD.Timeline.prototype.createTimeLine = function(domain, range, params) {
    
    if(domain[1] <= this.dateRange.start || domain[0] >= this.dateRange.end) {
        return null;
    }

    if(domain[0] < this.dateRange.start) {
        domain[0] = new Date(this.dateRange.start);
        range[0] = this.range(domain[0]);
    }

    if(domain[1] > this.dateRange.end) {
        domain[1] = new Date(this.dateRange.end);
        range[1] = this.range(domain[1]);
    }
    
    var timeRange = d3.time.scale()
        .domain(domain)
        .range(range);

    var axis = new FLOW.D3.Axis()
        .scale(timeRange)
        .orient(params.orient)
        .ticks(params.ticks)
        .tickSize(params.tickSize[0],params.tickSize[1])
        .tickFormat(FLOW.D3.Axis.format(params.tickFormat))
        .tickLineWidth(params.tickLineWidth)
        .axisLineWidth(params.axisLineWidth)
        .font(params.font)
        .fontSize(params.fontSize)
        .tickLabelColor(params.tickLabelColor)
        .tickLineColor(params.tickLineColor)
        .labelPadding(...params.labelPadding);

    var axisObject = axis.create(this.object);
    axisObject.position.set(0,0,params.zdepth);

    axisObject.updateMatrix();
    axisObject.matrixAutoUpdate = false;
    if(!axis.getCenterObject()) {
        debugger;
    }
    this.addLevel(axisObject, params.distance, axis.getCenterObject());

    return axisObject;
};

FLOW.LOD.Timeline.prototype.create = function(params) {

    parseMilleniaParams = function(params, orient, zdepth) {
        fontSizeWidthRatio = (params && params.fontSizeWidthRatio) ? params.fontSizeWidthRatio : this.fontSizeWidthRatio;
        var fontSize = (params && params.fontSize) ? params.fontSize : this.yearWidth*1000 / (7 * fontSizeWidthRatio);
        this.tickSize += fontSize;

        var milleniaParams = {
            orient: this.orient,
            ticks: d3.time.millennia,
            tickSize:       (params && params.tickSize) ? params.tickSize : [this.tickSize, this.tickSize],
            tickFormat:     (params && params.tickFormat) ? params.tickFormat : "BC",
            tickLineWidth:  (params && params.tickLineWidth) ? params.tickLineWidth : 10,
            axisLineWidth:  (params && params.axisLineWidth) ? params.axisLineWidth : 2,
            font:           (params && params.font) ? params.font: "Open Sans",
            fontSize:       fontSize,
            tickLineColor:  (params && params.tickLineColor)  ? params.tickLineColor  : "#ffffff",
            axisLineColor:  (params && params.axisLineColor)  ? params.axisLineColor  : "#000000",
            tickLabelColor: (params && params.tickLabelColor) ? params.tickLabelColor : "#000000",
            labelPadding:   (params && params.labelPadding) ? params.labelPadding : [0,0,0,0] ,
            zdepth:         (params && params.zdepth) ? params.zdepth : -adjustForLevel(0,zdepth, [this.minLevel, this.maxLevel]),
            distance:       (params && params.distance) ? params.distance : 5000,
            numberShown:    (params && params.numberShown) ? params.numberShown: Infinity
        }

        return milleniaParams;
    }.bind(this);

    parseCenturiesParams = function(params) {
        fontSizeWidthRatio = (params && params.fontSizeWidthRatio) ? params.fontSizeWidthRatio : this.fontSizeWidthRatio;
        var fontSize = (params && params.fontSize) ? params.fontSize : this.yearWidth*100 / (7 * fontSizeWidthRatio);
        this.tickSize += fontSize;

        var centuriesParams = {
            orient: this.orient,
            ticks: d3.time.centuries,
            tickSize:       (params && params.tickSize) ? params.tickSize : [this.tickSize, this.tickSize],
            tickFormat:     (params && params.tickFormat) ? params.tickFormat : "BC",
            tickLineWidth:  (params && params.tickLineWidth) ? params.tickLineWidth : 10,
            axisLineWidth:  (params && params.axisLineWidth) ? params.axisLineWidth : 2,
            font:           (params && params.font) ? params.font: "Open Sans",
            fontSize:       fontSize,
            tickLineColor:  (params && params.tickLineColor)  ? params.tickLineColor  : "#000000",
            axisLineColor:  (params && params.axisLineColor)  ? params.axisLineColor  : "#ffffff",
            tickLabelColor: (params && params.tickLabelColor) ? params.tickLabelColor : "#ffffff",
            labelPadding:   (params && params.labelPadding) ? params.labelPadding : [0,0,0,0] ,
            zdepth:         (params && params.zdepth) ? params.zdepth : -adjustForLevel(1, this.zdepth, [this.minLevel, this.maxLevel]),
            distance:       (params && params.distance) ? params.distance : 3000,
            numberShown:    (params && params.numberShown) ? params.numberShown: 10
        }

        this.tickSize += centuriesParams.fontSize;

        return centuriesParams;
    }.bind(this);

    parseDecadesParams = function(params) {
        fontSizeWidthRatio = (params && params.fontSizeWidthRatio) ? params.fontSizeWidthRatio : this.fontSizeWidthRatio;
        var fontSize = (params && params.fontSize) ? params.fontSize : this.yearWidth*10 / (7 * fontSizeWidthRatio);
        this.tickSize += fontSize;

        var decadesParams = {
            orient: this.orient,
            ticks: d3.time.decades,
            tickSize:       (params && params.tickSize) ? params.tickSize : [this.tickSize, this.tickSize],
            tickFormat:     (params && params.tickFormat) ? params.tickFormat : "BC",
            tickLineWidth:  (params && params.tickLineWidth) ? params.tickLineWidth : 10,
            axisLineWidth:  (params && params.axisLineWidth) ? params.axisLineWidth : 2,
            font:           (params && params.font) ? params.font: "Open Sans",
            fontSize:       fontSize,
            tickLineColor:  (params && params.tickLineColor)  ? params.tickLineColor  : "#ffffff",
            axisLineColor:  (params && params.axisLineColor)  ? params.axisLineColor  : "#000000",
            tickLabelColor: (params && params.tickLabelColor) ? params.tickLabelColor : "#000000",
            labelPadding:   (params && params.labelPadding) ? params.labelPadding : [0,0,0,0] ,
            zdepth:         (params && params.zdepth) ? params.zdepth : -adjustForLevel(2, this.zdepth, [this.minLevel, this.maxLevel]),
            distance:       (params && params.distance) ? params.distance : 100,
            numberShown:    (params && params.numberShown) ? params.numberShown: 3
        }

        this.tickSize += decadesParams.fontSize;

        return decadesParams;
    }.bind(this);

    parseYearsParams = function(params) {
        fontSizeWidthRatio = (params && params.fontSizeWidthRatio) ? params.fontSizeWidthRatio : this.fontSizeWidthRatio;
        var fontSize = (params && params.fontSize) ? params.fontSize : this.yearWidth / (7 * fontSizeWidthRatio);
        this.tickSize += fontSize;

        var yearsParams = {
            orient: this.orient,
            ticks: d3.time.years,
            tickSize:       (params && params.tickSize) ? params.tickSize : [this.tickSize, this.tickSize],
            tickFormat:     (params && params.tickFormat) ? params.tickFormat : "BC",
            tickLineWidth:  (params && params.tickLineWidth) ? params.tickLineWidth : 10,
            axisLineWidth:  (params && params.axisLineWidth) ? params.axisLineWidth : 2,
            font:           (params && params.font) ? params.font: "Open Sans",
            fontSize:       fontSize,
            tickLineColor:  (params && params.tickLineColor)  ? params.tickLineColor  : "#000000",
            axisLineColor:  (params && params.axisLineColor)  ? params.axisLineColor  : "#ffffff",
            tickLabelColor: (params && params.tickLabelColor) ? params.tickLabelColor : "#ffffff",
            labelPadding:   (params && params.labelPadding) ? params.labelPadding : [0,0,0,0] ,
            zdepth:         (params && params.zdepth) ? params.zdepth : -adjustForLevel(3, this.zdepth, [this.minLevel, this.maxLevel]),
            distance:       (params && params.distance) ? params.distance : 50,
            numberShown:    (params && params.numberShown) ? params.numberShown: 3
        }

        return yearsParams;
    }.bind(this);

    parseMonthParams = function(params) {
        fontSizeWidthRatio = (params && params.fontSizeWidthRatio) ? params.fontSizeWidthRatio : this.fontSizeWidthRatio;
        var fontSize = (params && params.fontSize) ? params.fontSize : this.yearWidth / (12 * (10 * fontSizeWidthRatio));
        this.tickSize += fontSize;

        var monthParams = {
            orient: this.orient,
            ticks: d3.time.month,
            tickSize:       (params && params.tickSize) ? params.tickSize : [this.tickSize, this.tickSize],
            tickFormat:     (params && params.tickFormat) ? params.tickFormat : "%B",
            tickLineWidth:  (params && params.tickLineWidth) ? params.tickLineWidth : 10,
            axisLineWidth:  (params && params.axisLineWidth) ? params.axisLineWidth : 2,
            font:           (params && params.font) ? params.font: "Open Sans",
            fontSize:       fontSize,
            tickLineColor:  (params && params.tickLineColor)  ? params.tickLineColor  : "#339976",
            axisLineColor:  (params && params.axisLineColor)  ? params.axisLineColor  : "#000000",
            tickLabelColor: (params && params.tickLabelColor) ? params.tickLabelColor : "#000000",
            labelPadding:   (params && params.labelPadding) ? params.labelPadding : [0,0,0,0] ,
            zdepth:         (params && params.zdepth) ? params.zdepth : -adjustForLevel(4, this.zdepth, [this.minLevel, this.maxLevel]),
            distance:       (params && params.distance) ? params.distance : 7,
            numberShown:    (params && params.numberShown) ? params.numberShown: 3
        }

        return monthParams;
    }.bind(this);

    parseDaysParams = function(params) {
        fontSizeWidthRatio = (params && params.fontSizeWidthRatio) ? params.fontSizeWidthRatio : this.fontSizeWidthRatio;
        var fontSize = (params && params.fontSize) ? params.fontSize : this.yearWidth / (366 * (2 * fontSizeWidthRatio));
        this.tickSize += fontSize;

        var daysParams = {
            orient: this.orient,
            ticks: d3.time.days,
            tickSize:       (params && params.tickSize) ? params.tickSize : [this.tickSize, this.tickSize],
            tickFormat:     (params && params.tickFormat) ? params.tickFormat : "%e",
            tickLineWidth:  (params && params.tickLineWidth) ? params.tickLineWidth : 5,
            axisLineWidth:  (params && params.axisLineWidth) ? params.axisLineWidth : 5,
            font:           (params && params.font) ? params.font: "Open Sans",
            fontSize:       fontSize,
            tickLineColor:  (params && params.tickLineColor)  ? params.tickLineColor  : "#000000",
            axisLineColor:  (params && params.axisLineColor)  ? params.axisLineColor  : "#ffffff",
            tickLabelColor: (params && params.tickLabelColor) ? params.tickLabelColor : "#ffffff",
            labelPadding:   (params && params.labelPadding) ? params.labelPadding : [0,0,0,0] ,
            zdepth:         (params && params.zdepth) ? params.zdepth : -adjustForLevel(5, this.zdepth, [this.minLevel, this.maxLevel]),
            distance:       (params && params.distance) ? params.distance : 2,
            numberShown:    (params && params.numberShown) ? params.numberShown: 3
        }

        return daysParams;
    }.bind(this);

    parseHoursParams = function(params) {
        fontSizeWidthRatio = (params && params.fontSizeWidthRatio) ? params.fontSizeWidthRatio : this.fontSizeWidthRatio;
        var fontSize = (params && params.fontSize) ? params.fontSize : this.yearWidth / (8784 * (7 * fontSizeWidthRatio)); //8784 number of hours in a leap year
        this.tickSize += fontSize;

        var hoursParams = {
            orient: this.orient,
            ticks: d3.time.hours,
            tickSize:       (params && params.tickSize) ? params.tickSize : [this.tickSize, this.tickSize],
            tickFormat:     (params && params.tickFormat) ? params.tickFormat : "%_I%p",
            tickLineWidth:  (params && params.tickLineWidth) ? params.tickLineWidth : 2,
            axisLineWidth:  (params && params.axisLineWidth) ? params.axisLineWidth : 2,
            font:           (params && params.font) ? params.font: "Open Sans",
            fontSize:       fontSize,
            tickLineColor:  (params && params.tickLineColor)  ? params.tickLineColor  : "#ffffff",
            axisLineColor:  (params && params.axisLineColor)  ? params.axisLineColor  : "#000000",
            tickLabelColor: (params && params.tickLabelColor) ? params.tickLabelColor : "#000000",
            labelPadding:   (params && params.labelPadding) ? params.labelPadding : [0,0,0,0] ,
            zdepth:         (params && params.zdepth) ? params.zdepth : -adjustForLevel(6, this.zdepth, [this.minLevel, this.maxLevel]),
            distance:       (params && params.distance) ? params.distance : 0.5,
            numberShown:    (params && params.numberShown) ? params.numberShown: 3
        }

        return hoursParams;
    }.bind(this);

    parseMinutesParams = function(params) {
        fontSizeWidthRatio = (params && params.fontSizeWidthRatio) ? params.fontSizeWidthRatio : this.fontSizeWidthRatio;
        var fontSize = (params && params.fontSize) ? params.fontSize : this.yearWidth / (527040 * (2 * fontSizeWidthRatio));
        this.tickSize += fontSize;

        var minutesParams = {
            orient: this.orient,
            ticks: d3.time.minutes,
            tickSize:       (params && params.tickSize) ? params.tickSize : [this.tickSize, this.tickSize],
            tickFormat:     (params && params.tickFormat) ? params.tickFormat : "%M",
            tickLineWidth:  (params && params.tickLineWidth) ? params.tickLineWidth : 2,
            axisLineWidth:  (params && params.axisLineWidth) ? params.axisLineWidth : 2,
            font:           (params && params.font) ? params.font: "Open Sans",
            fontSize:       fontSize,
            tickLineColor:  (params && params.tickLineColor)  ? params.tickLineColor  : "#000000",
            axisLineColor:  (params && params.axisLineColor)  ? params.axisLineColor  : "#000000",
            tickLabelColor: (params && params.tickLabelColor) ? params.tickLabelColor : "#ffffff",
            labelPadding:   (params && params.labelPadding) ? params.labelPadding : [0,0,0,0] ,
            zdepth:         (params && params.zdepth) ? params.zdepth : -adjustForLevel(7, this.zdepth, [this.minLevel, this.maxLevel]),
            distance:       (params && params.distance) ? params.distance : .5,
            numberShown:    (params && params.numberShown) ? params.numberShown: 3
        }

        return minutesParams;
    }.bind(this);

    if(!params.parentObject) {
        throw "FLOW.LOD.Timeline parentObject is missing";
    }
    this.parentObject = params.parentObject;

    this.zdepth = (typeof params.zdepth !== "undefined") ? params.zdepth : 0.05;
    this.orient = (typeof params.orient !== "undefined") ? params.orient : "bottom";

    if (typeof params.date === "undefined") { 
        var today = new Date(); 
    } else if(params.date instanceof Date) {
        var today = params.date;
    } else {
        throw "FLOW.LOD.Timeline date is not instanceof Date";
    }
    this.currentDate = today;

    this.axisWidth = (typeof params.axisWidth !== "undefined") ? params.axisWidth : 100;
    this.axisVector = new THREE.Vector3(this.axisWidth, 0, 0);

    if(typeof params.position.x === "undefined" || typeof params.position.y === "undefined" || typeof params.position.z === "undefined") {
        throw "FLOW.LOD.Timeline params.position should be an object with x,y,z properties";
    }
    this.position = (typeof params.position !== "undefined") ? params.position : {x:0, y:0, z: 0};


    var minLevel = (typeof params.minLevel !== "undefined") ? params.minLevel : 3;
    var maxLevel = (typeof params.maxLevel !== "undefined") ? params.maxLevel : 7;
    if(minLevel < 0 || minLevel > 7 || maxLevel < 0 || maxLevel > 7 || minLevel > maxLevel) {
        throw "FLOW.LOD.Timeline levels not in range [0, 7] or maxLevel < minLevel"
    }
    this.minLevel = minLevel;
    this.maxLevel = maxLevel;

    this.dateRange = {};
    var rangeStart = (typeof params.rangeStart !== "undefined") ? params.rangeStart : new Date();
    var rangeEnd = (typeof params.rangeEnd !== "undefined") ? params.rangeEnd : fullDate(new Date(rangeStart.getFullYear(), 0 , 1), rangeStart.getFullYear());
    if(typeof rangeStart === "number" && typeof rangeEnd === "number") {
        this.dateRange.start = fullDate(new Date(rangeStart,0,1), rangeStart);
        this.dateRange.end   = fullDate(new Date(rangeEnd,0,1), rangeEnd);
        if( isNaN(this.dateRange.start.getDate()) || isNaN(this.dateRange.end.getDate()) ) {
            throw "FLOW.LOD.Timeline invalid range date";
        }
    } else if(rangeStart instanceof Date && rangeEnd instanceof Date){
        this.dateRange ={start: rangeStart, end: rangeEnd};
    } else {
        throw "FLOW.LOD.Timeline range contains neither Date objects nor numbers";
    }

    this.fontSizeWidthRatio = (typeof params.fontSizeWidthRatio !== "undefined") ? params.fontSizeWidthRatio / 1.8 : 1.11;
    this.tickSize = (typeof params.tickSize !== "undefined") ? params.tickSize : 1;

    var begginingDate;
    var endingDate;

    if(this.minLevel == 0) {
        var year = this.dateRange.start.getFullYear();
        var reminder = year%1000;
        year = year - reminder;
        begginingDate = fullDate(new Date(year, 0, 1), year); 
        year = this.dateRange.end.getFullYear();
        reminder = year % 1000;
        if(reminder != 0) {
            year = year - reminder + 1000;
        }
        endingDate = fullDate(new Date(year, 0, 1), year);
    }
    else if(this.minLevel == 1) {
        var year = this.dateRange.start.getFullYear();
        var reminder = year%100;
        year = year - reminder;
        begginingDate = fullDate(new Date(year, 0, 1), year); 
        year = this.dateRange.end.getFullYear();
        reminder = year % 100;
        if(reminder != 0) {
            year = year - reminder + 100;
        }
        endingDate = fullDate(new Date(year, 0, 1), year);
    }
    else if(this.minLevel == 2) {
        var year = this.dateRange.start.getFullYear();
        var reminder = year%10
        year = year - reminder;
        begginingDate = fullDate(new Date(year, 0, 1), year); 
        year = this.dateRange.end.getFullYear();
        reminder = year % 10;
        if(reminder != 0) {
            year = year - reminder + 10;
        }
        endingDate = fullDate(new Date(year, 0), year);
    }
    else if(this.minLevel == 3) {
        begginingDate = fullDate(new Date(this.dateRange.start.getFullYear(), 0, 1), this.dateRange.start.getFullYear()); 
        endingDate = fullDate(new Date(this.dateRange.end.getFullYear(), 0, 1), this.dateRange.end.getFullYear());
    }
    else if(this.minLevel == 4) {
        var month = fullDate(new Date(this.dateRange.start.getFullYear(), this.dateRange.start.getMonth(), 1), this.dateRange.start.getFullYear());
        begginingDate = month; 
        endingDate = fullDate(new Date(month.getFullYear(), month.getMonth()+1, 1), month.getFullYear());
    }
    else if(this.minLevel == 5) {
        var date = fullDate(new Date(this.dateRange.start.getFullYear(), this.dateRange.start.getMonth(), this.dateRange.start.getDate()), this.dateRange.start.getFullYear());
        begginingDate = date; 
        endingDate = fullDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()+1), date.getFullYear());
    }
    else if(this.minLevel == 6 || this.minLevel == 6) {
        var hour = fullDate(new Date(this.dateRange.start.getFullYear(), this.dateRange.start.getMonth(), this.dateRange.start.getDate(), this.getHours()), this.dateRange.start.getFullYear());
        begginingDate = hour; 
        endingDate = fullDate(new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours()+1), this.dateRange.end.getDate());
    }

    this.dateRange = {start: begginingDate, end: endingDate};

    this.range = d3.time.scale()
        .domain([begginingDate, endingDate])
        .range([0, this.axisWidth]);

    this.coordinateRange = d3.time.scale()
        .domain([0, this.axisWidth])
        .range([begginingDate, endingDate]);

    var x1 = this.timeToCoordnate(begginingDate);
    var tempDate = fullDate(new Date(begginingDate.getFullYear() + 1, 0, 1), begginingDate.getFullYear() + 1);
    var x2 = this.timeToCoordnate(tempDate);
    this.yearWidth = x2-x1;

    //***************** Timeline on the minute scale 
    if(this.minLevel <= 7 && this.maxLevel >= 7) {
        this.minutesParams   = parseMinutesParams(params.minutes);
        var firstMinute = fullDate(new Date(this.dateRange.start.getFullYear(), 0, 1, 0, 0), this.dateRange.start.getFullYear());
        
        var centerDate = new Date(firstMinute)
        centerDate.setHours(centerDate.getHours() + (this.minutesParams.numberShown-1));
        var center = this.range(centerDate);

        var lastMinute = new Date(firstMinute);
        lastMinute.setHours(lastMinute.getHours() + this.minutesParams.numberShown)
        var domain = [ firstMinute, 
                       lastMinute ];

        var range  = [ this.range(firstMinute), 
                       this.range(lastMinute) ];


        this.minutes = this.createTimeLine(domain, range, this.minutesParams);

        firstMinute.setMilliseconds(firstMinute.getMilliseconds() + (lastMinute-firstMinute)/2)
        this.minutes.center = center - range[0];

        this.updateMinutes()
    }

        //***************** Timeline on the hour scale
    if(this.minLevel <= 6 && this.maxLevel >= 6) {
        this.hoursParams     = parseHoursParams(params.hours);
        var firstHour = fullDate(new Date(this.dateRange.start.getFullYear(), 0, 1), this.dateRange.start.getFullYear());
        
        var centerDate = new Date(firstHour)
        centerDate.setDate(centerDate.getDate() + (this.hoursParams.numberShown-1));
        var center = this.range(centerDate);

        var lastHour = new Date(firstHour);
        lastHour.setDate(lastHour.getDate() + this.hoursParams.numberShown);

        var domain = [ firstHour, 
                       lastHour ]

        var range  = [ this.range(firstHour), 
                       this.range(lastHour)];

        this.hours = this.createTimeLine(domain, range, this.hoursParams);
        this.hours.center = center - range[0];

        this.updateHours();
    }
        //***************** Timeline on the day scale
    if(this.minLevel <= 5 && this.maxLevel >= 5) {
        this.daysParams      = parseDaysParams(params.days);
        this.daysList = [];
        this.loadDays();
    }

        //***************** Timeline on the month scale
    if(this.minLevel <= 4 && this.maxLevel >= 4) {    
        this.monthParams     = parseMonthParams(params.month);
        this.monthList = [];
        this.loadMonth();
    }

        //***************** Timeline on the year scale
    if(this.minLevel <= 3 && this.maxLevel >= 3) {
        this.yearsParams     = parseYearsParams(params.years);
        if(this.minLevel == 3) {
            this.yearsParams.numberShown = Infinity;
        }
        this.yearsList = [];
        this.previousYearsRedraw = this.dateRange.start;
        this.nextYearsRedraw = this.dateRange.end;
        this.loadYears();
    }

        //***************** Timeline on the century scale
    if(this.minLevel <= 2 && this.maxLevel >= 2) {
        this.decadesParams   = parseDecadesParams(params.decades);
        if(this.minLevel == 2) {
            this.decadesParams.numberShown = Infinity;
        }
        this.decadesList = [];
        this.previousDecadesRedraw = this.dateRange.start;
        this.nextDecadesRedraw = this.dateRange.end;
        this.loadDecades();
    }

        //***************** Timeline on the century scale
    if(this.minLevel <= 1 && this.maxLevel >= 1) {
        this.centuriesParams = parseCenturiesParams(params.centuries);
        if(this.minLevel == 1) {
            this.centuriesParams.numberShown = Infinity;
        }
        this.centuriesList = [];
        this.previousCenturiesRedraw = this.dateRange.start;
        this.nextCenturiesRedraw = this.dateRange.end;
        this.loadCenturies();
    }

        //***************** Timeline on the millennia scale
    if(this.minLevel == 0) {
        this.millenniaParams = parseMilleniaParams(params.millennia);
        this.millenniaList = [];
        this.loadMillennia();
    }


    var nowPosition = this.range(today);

    // this.object.position.set(position.x - axisWidth/2, position.y, position.z);
    this.object.position.set(-nowPosition, this.position.y+0.001, this.position.z);
    this.focus = this.object.position.clone();
    // this.object.scale.set(2,2,2);
    this.object.updateMatrix();
    this.object.matrixAutoUpdate = false;
    this.parentObject.add( this.object );

    return this;
};

/* inherits from THREE.LOD */
FLOW.LOD.TextLayout = function() {

    FLOW.LOD.call(this);

    this.type = 'TimelineLOD';

    return this;
};

FLOW.OOPUtils.prototypalInheritance(FLOW.LOD.TextLayout, FLOW.LOD);


FLOW.LOD.TextLayout.prototype.update = function (camera) {

    var levels = this.levels;
    if (levels.length > 1) {
        FLOW.LOD.v1.setFromMatrixPosition(camera.matrixWorld);

        for (var i = 0, l = levels.length; i < l; i++) {
            FLOW.LOD.v2.setFromMatrixPosition(levels[i].object.matrixWorld);
            var distance = FLOW.LOD.v1.distanceTo(FLOW.LOD.v2);
            if (distance < levels[i].distance) {
                levels[i].object.visible = true;
                levels[i].object.track();
                //levels[i].object.track()
                if(this.plane) {
                    this.plane.track();
                    this.plane.visible = true;
                }
            } else {
                levels[i].object.visible = false;
                //this.object.stopTracking()
                levels[i].object.stopTracking();
                if(this.plane) {
                    this.plane.stopTracking();
                    this.plane.visible = false;
                }
            }
        }
    }
};


FLOW.LOD.TextLayout.prototype.create = function(levelsDef, params, position) {

    this.params = params;
    this.levelsDef = levelsDef;


    var level = FLOW.D3.select();
    level.createMesh(this.object);
    this.object = level.node().getMesh();

    if (this.params.drawTopLevelText ) {
        //Top level text
        var mainParams = {
            text: this.levelsDef.text,
            font: "Open Sans",
            fontSize: 1,
            hAlign: FLOW.Text.ALIGN_CENTER,
            opacity: 1.0,
            color: "white"
        };

        var mainText = new FLOW.Text.Text(mainParams);
        mainText.mesh = mainText.buildMesh();
        mainText.mesh.frustumCulled = false;

        if (position) {
            mainText.setPosition([position.x, position.y, position.z]);
        }
        this.object.add(mainText.mesh);
    }

    this.params.drawBackground = true;
    if (this.params.drawBackground){
        var planeGeometry = new THREE.PlaneGeometry(3.3, 2.3);
        var material = new THREE.MeshPhongMaterial( {color:"#000000", transparent:true, opacity:0.7 });
        this.plane = new THREE.Mesh(planeGeometry, material);
        this.plane.position.set(0,-0.8,-1);
        this.plane.visible = false;
        this.object.add(this.plane);

    }

    if (this.levelsDef.items) {
        var selection = level.selectAll("text")
            .data(this.levelsDef.items)
            .enter()
            .append("text")
            .params({
                font: "Open Sans",
                fontSize: 0.7,
                align: FLOW.Text.ALIGN_CENTER,
                wrapType: FLOW.Text.WrapType.WRAP_BY_WIDTH,
                wrapValue: 8,
                opacity: 1.0,
                color: "yellow"
            })
            .param("text", function (d) {
                return d.text;
            })
            .param("font", function (d) {
                return d.font?  d.font : undefined;
            })
            .param("fontSize", function (d) {
                return d.fontSize;
            })

            .each(function (d, index, foo3, lod) {
                //NOte: instead of calling .create on the selection, we'll build it by hand:
                this.object = new FLOW.Text.Text( this.params );
                this.mesh = this.object.buildMesh();
                this.mesh.frustumCulled = false;
                if (d.position) {
                    this.mesh.position.set( d.position[0], d.position[1], d.position[2] );
                }

                lod.addLevel(this.mesh, d.detailDistance, lod) ;

                // this.mesh.position.set(d.position[0], d.position[1], d.position[2]);
                if (d.rotation) {
                    this.mesh.rotation.set(d.rotation[0]*FLOW.MathUtils.degreesToRadians,
                        d.rotation[1]*FLOW.MathUtils.degreesToRadians,
                        d.rotation[2]*FLOW.MathUtils.degreesToRadians);
                }
                this.mesh.name= d.text;
                // this.mesh.lookAt(new THREE.Vector3(0,0,0))

            }, this)
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
    return FLOW.LOD;
}));
