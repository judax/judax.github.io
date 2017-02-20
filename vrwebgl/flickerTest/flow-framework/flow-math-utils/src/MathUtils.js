var THREE = THREE || require('three');

var FLOW = FLOW || {};

FLOW.MathUtils = {
    degreesToRadians: Math.PI / 180,

    calculateVector3InCircumference: function (radius, angle) {
        var x = Math.cos(angle) * radius;
        var y = Math.sin(angle) * radius;
        var z = 0;
        return new THREE.Vector3(x, y, z);
    },

    distributeVerticesInCircumference: function (radius, index, outOfTotal, whichAxis) {
        switch (whichAxis) {
            case "yAxis":
                var x = Math.cos(-index / outOfTotal * Math.PI * 2) * radius;
                var y = 0;
                var z = Math.sin(-index / outOfTotal * Math.PI * 2) * radius;
                break;
            case "xAxis":
                var x = 0;
                var y = Math.sin(-index / outOfTotal * Math.PI * 2) * radius;
                var z = Math.cos(-index / outOfTotal * Math.PI * 2) * radius;
                ;
                break;
            case "zAxis":
            default:
                var x = Math.cos(-index / outOfTotal * Math.PI * 2) * radius;
                var y = Math.sin(-index / outOfTotal * Math.PI * 2) * radius;
                var z = 0;
                break;

        }
        return [x, y, z];
    },


    distributeVector3InCircumference: function (radius, index, outOfTotal, whichAxis) {
        var vertices = FLOW.MathUtils.distributeVerticesInCircumference(radius, index, outOfTotal, whichAxis);
        return new THREE.Vector3(vertices[0], vertices[1], vertices[2]);
    },


    calculateVector3InSphere: function (radius, angleInZ, angleInY) {
        var x = Math.cos(angleInZ) * Math.sin(angleInY) * radius;
        var y = Math.sin(angleInZ) * Math.sin(angleInY) * radius;
        var z = Math.cos(angleInY) * radius;
        return new THREE.Vector3(x, y, z);
    },


    sphere: function (index, count, size) {
        var temp = new THREE.Object3D();

        var vector = new THREE.Vector3();

        var phi = Math.acos(-1 + ( 2 * index ) / (count - 1));
        var theta = Math.sqrt((count - 1) * Math.PI) * phi;

        temp.position.x = size * Math.cos(theta) * Math.sin(phi);
        temp.position.y = size * Math.sin(theta) * Math.sin(phi);
        temp.position.z = size * Math.cos(phi);

        vector.copy(temp.position).multiplyScalar(2);

        return {
            x: temp.position.x,
            y: temp.position.y,
            z: temp.position.z
        };
    },

    curve: function(geo, hSegs, vSegs, curvature, radius) {
        var plane = geo;

        curvature /= 100;

        function amount(row, column, factor) {
            var d = Math.abs(0.5 - column) * 2;
            return Math.pow(d, 2) * factor;
        }

        var col = 0, row = 0;
        if(plane.type != "BufferGeometry") {
            for (var i = 0; i < plane.vertices.length; i++) {
                var vert = plane.vertices[i];

                col = (i % (hSegs+1));
                row = Math.floor(i / (hSegs+1));

                vert.z = amount(row/(vSegs), col/(hSegs), curvature);
            }
        } 

        return geo;
    },

    curve1: function(objects, inputAxis, outputAxisArray, func) {
        /*
            inputAxis - "x" | "y" | "z" 
            outputAxisArray - ["x", "y", "z", flag, flag, flag]
                    func will return array x,y,z,focus. if you want to ignore a value
                    you can set it to null like that ["x", null, "z"]
                    flags are used to tell if you want to add value returned by the function 
                    to current value or replace it, true for add, false default to replace
            func - function wich will accept values from axis you've chosen with inputAxis
        */
        if(objects.type != "BufferGeometry") {
            /*
            for (var i = 0; i < objects.vertices.length; i++) {
                var vert = objects.vertices[i];

                col = (i % (hSegs+1));
                row = Math.floor(i / (hSegs+1));

                vert.z = amount(row/(vSegs), col/(hSegs), curvature);
            }
            */
        } else {
            function axisToIndex(axis) {
                if(axis != null) {
                    return (axis == "x") ? 0 : (axis == "y") ? 1 : 2;
                }  
            }

            var positions = objects.attributes.position.array;
            var vertices = []
            var axis = (inputAxis == "x") ? 0 : (inputAxis == "y") ? 1 : 2;
            for(var i = axis; i < positions.length; i+=3) {
                // store original x position and index
                vertices.push( [positions[i], i] )
            }

            //sort by axis
            sf = function(a,b) { return (a[axis] > b[axis]) ? 1 : (a[axis] < b[axis]) ? -1 : 0 }
            vertices.sort(sf)

            // grouped by axis coordinate
            groupedVertices = []
            for(var i in vertices) {
                if( groupedVertices.length == 0 || vertices[i][axis] != groupedVertices[groupedVertices.length -1].value ) {
                    groupedVertices.push([]);
                    groupedVertices[groupedVertices.length -1].value = vertices[i][axis]
                }
                groupedVertices[groupedVertices.length - 1].push(vertices[i])
            }
            
            var center = groupedVertices[0].value + (groupedVertices[groupedVertices.length - 1].value - groupedVertices[0].value) / 2
            for(var i in groupedVertices) {
                var outputArray = func(groupedVertices[i].value, center);

                for(var vertexIndex in groupedVertices[i]) {
                    var index = groupedVertices[i][vertexIndex][1]

                    for(var axisIndex = 0; axisIndex < 3; axisIndex++) {
                        var value = outputArray[axisIndex]

                        if(value != null) {
                            var add = outputAxisArray[axisIndex + 3]
                            if(add) {
                                positions[index + axisToIndex( outputAxisArray[axisIndex] )] += value
                            } else {
                                positions[index + axisToIndex( outputAxisArray[axisIndex] )] = value
                            }
                        }
                    }
                }
            }
        }
        objects.computeBoundingSphere()
    },

    curveAll: function(objects, func) {

            var positions = objects.attributes.position.array;

            minx = maxx = positions[0]
            miny = maxy = positions[1]
            minz = maxz = positions[2]

            let check = (value, max, min) => {
              if( value > max ) {
                max = value;
              }  

              if( value < min ) {
                min = value;
              }

              return [max, min];
            }

            let fullVertices = []
            for( var i = 0; i < positions.length; i+=3) {
                let x = positions[i];
                let y = positions[i+1];
                let z = positions[i+2];

                [ maxx, minx ] = check(x, maxx, minx);
                [ maxy, miny ] = check(y, maxy, miny);
                [ maxz, minz ] = check(z, maxz, minz);

                let point = new THREE.Vector3(positions[i], positions[i+1], positions[i+2])
                fullVertices.push( [point, i] )
            }

            let findCenter = (max, min) => min + (max - min) / 2;
            let center =  new THREE.Vector3( findCenter(maxx, minx), findCenter(maxy, miny), findCenter(maxz, minz) );
            center.maxx = maxx
            center.minx = minx
            center.maxy = maxy
            center.miny = miny
            center.maxz = maxz
            center.minz = minz

            for ( let point of fullVertices ) {
                let result = func(point[0], center);

                positions[point[1]] = result.x;
                positions[point[1] + 1] = result.y;
                positions[point[1] + 2] = result.z;
            }
    },
    
    curveObjects: function(objects, inputAxis, outputAxisArray, func) {
        // works the same way as curve1 but with Objects3D
        objects.sort(function(a,b) { return (a.position[inputAxis] > b.position[inputAxis]) ? 1 : (a.position[inputAxis] < b.position[inputAxis]) ? -1 : 0} );
        groups = [];
        for(var i in objects) {
            var item = objects[i]
            if(groups.length == 0 || groups[groups.length - 1].value != item.position[inputAxis] ) {
                groups.push([])
                groups[groups.length - 1].value = item.position[inputAxis];
            }
            groups[groups.length - 1].push(item);
        }   
        var center = groups[0].value + (groups[groups.length - 1].value - groups[0].value) / 2;
        for(var i in groups) {
            var outputArray = func(groups[i].value, center);
            for(var itemIndex = 0; itemIndex < groups[i].length; itemIndex++) {
                var item = groups[i][itemIndex];
                for(var axisIndex = 0; axisIndex < 3; axisIndex++) {
                    var axis = outputAxisArray[axisIndex]
                    if( axis != null ) {
                        var add = outputAxisArray[axisIndex + 3]
                        if(add) {
                            item.position[axis] += outputArray[axisIndex];
                        } else {
                            item.position[axis] = outputArray[axisIndex];
                        }
                    }
                }
                var focus = outputArray[3];
                focus.y = item.position.y;
                item.lookAt(focus)
            }
        }

    },

    cylynderCurve: function(radius, offset) {
        var radius = radius;
        var offset = offset;
        var focus = new THREE.Vector3(0, 0, radius)
        return function(value, center) {
            var angle =  (value - center) / radius ;
            var zDistance = radius * Math.cos(angle);
            var z = radius;
            if(angle > Math.PI/2 || angle < Math.PI/2) {
                z -= zDistance;
            } else {
                z += zDistance;
            }         
            var x = radius * Math.sin(angle);
            return [x, null, z, focus];
        }
    },
    

    randomBetween: function (min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    },

    randomBetweenFloat: function (min, max) {
        return Math.random() * (max - min) + min;
    },


    randomBetweenWithGap: function (min, max, gap) {
        // min = min-gap;
        // max = max -gap;
        var close = Math.floor(Math.random() * (max - min + 1) + min) - gap;
        var far = Math.floor(Math.random() * (max - min + 1) + min) + gap;
        return Math.random() > 0.5 ? close : far;
    },

    /**
     * We want o always keep any nodes from being exactly on the same point in space.
     * Add this to most likely the z for any point
     * @returns {number}
     */
    uniqueness: function () {
        return Math.random() * 0.0001;
    },

    calculateRandomIndices: function (numberOfRandomIndices, numberOfIndices) {
        if (numberOfRandomIndices > numberOfIndices) throw "ERROR: The number of random indices cannot be bigger than the total number of indices";
        var allIndices = new Array(numberOfIndices);
        for (var i = 0; i < numberOfIndices; i++) {
            allIndices[i] = i;
        }
        var randomIndices = new Array(numberOfRandomIndices);
        for (var i = 0; i < numberOfRandomIndices; i++) {
            var index = Math.floor(Math.random() * allIndices.length);
            randomIndices[i] = allIndices[index];
            allIndices.splice(index, 1);
        }
        return randomIndices;
    },

    /**
     * http://stackoverflow.com/questions/10962379/how-to-check-intersection-between-2-rotated-rectangles
     * http://jsfiddle.net/2VXXP/6/
     *
     * TODO: fails if one polygon is entirely inside another polygon
     *http://stackoverflow.com/questions/2752725/finding-whether-a-point-lies-inside-a-rectangle-or-not
     *for any convex polygon (including rectangle) the test is very simple: check each edge of the polygon, assuming each edge
     * is oriented in counterclockwise direction, and test whether the point lies to the left of the edge (in the left-hand half-plane).
     * If all edges pass the test - the point is inside. If one fails - the point is outside.

     In order to test whether the point (xp, yp) lies on the left-hand side of the edge (x1, y1) - (x2, y2), you need to build the line
     equation for the line containing the edge. The equation is as follows

     A * x + B * y + C = 0
     where

     A = -(y2 - y1)
     B = x2 - x1
     C = -(A * x1 + B * y1)
     Now all you need to do is to calculate

     D = A * xp + B * yp + C
     If D > 0, the point is on the left-hand side. If D < 0, the point is on the right-hand side. If D = 0, the point is on the line.

     *
     * Helper function to determine whether there is an intersection between the two polygons described
     * by the lists of vertices. Uses the Separating Axis Theorem
     *
     * @param a an array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
     * @param b an array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
     * @return true if there is any intersection between the 2 polygons, false otherwise
     */
    doPolygonsIntersect: function (a, b) {
        var polygons = [a, b];
        var minA, maxA, projected, i, i1, j, minB, maxB;

        for (i = 0; i < polygons.length; i++) {

            // for each polygon, look at each edge of the polygon, and determine if it separates
            // the two shapes
            var polygon = polygons[i];
            for (i1 = 0; i1 < polygon.length; i1++) {

                // grab 2 vertices to create an edge
                var i2 = (i1 + 1) % polygon.length;
                var p1 = polygon[i1];
                var p2 = polygon[i2];

                // find the line perpendicular to this edge
                var normal = {x: p2.y - p1.y, y: p1.x - p2.x};

                minA = maxA = undefined;
                // for each vertex in the first shape, project it onto the line perpendicular to the edge
                // and keep track of the min and max of these values
                for (j = 0; j < a.length; j++) {
                   projected = normal.x * a[j].x + normal.y * a[j].y;
                    if (typeof minA == "undefined" || projected < minA) {
                        minA = projected;
                    }
                    if ( typeof maxA == "undefined" || projected > maxA) {
                        maxA = projected;
                    }
                }

                // for each vertex in the second shape, project it onto the line perpendicular to the edge
                // and keep track of the min and max of these values
                minB = maxB = undefined;
                for (j = 0; j < b.length; j++) {
                    projected = normal.x * b[j].x + normal.y * b[j].y;
                    if ( typeof minB== "undefined" || projected < minB) {
                        minB = projected;
                    }
                    if (typeof maxB == "undefined" || projected > maxB) {
                        maxB = projected;
                    }
                }

                // if there is no overlap between the projects, the edge we are looking at separates the two
                // polygons, and we know there is no overlap
                if (maxA < minB || maxB < minA) {
                  //  console.log("polygons don't intersect!");
                    return false;
                }
            }
        }
        //console.log("polygons intersect!");
        return true;
    },

    changeDistanceFromCamera: function(vector, offset, multiply = false) {
        var vectorCopy = vector.clone();
        app.scene.localToWorld(vectorCopy);
        var cameraPosition = app.camera.getWorldPosition();
        vectorCopy.sub(cameraPosition);
        var length = 0;
        if(multiply) {
            length = vectorCopy.length() * offset
        } else {
            length = vectorCopy.length() + offset;
        }
        vectorCopy.setLength(length)
        vectorCopy.add(cameraPosition);
        app.scene.worldToLocal(vectorCopy);
        return vectorCopy;
    }

};

FLOW.MathUtils.BoundingBox = function() {
    this._min = new THREE.Vector3(+Infinity, +Infinity, +Infinity);
    this._max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    this._center = new THREE.Vector3();
    this._dirty = false;
    return this;
};


FLOW.MathUtils.BoundingBox.prototype.copy = function() {
    var retVal = new FLOW.MathUtils.BoundingBox();
    retVal._min =new THREE.Vector3().copy(this._min);
    retVal._max = new THREE.Vector3().copy(this._max);
    retVal._center = new THREE.Vector3().copy(this._center);
    retVal._dirty = false;
    return retVal;
}

FLOW.MathUtils.BoundingBox.prototype.reset = function() {
    this._min.set(+Infinity, +Infinity, +Infinity);
    this._max.set(-Infinity, -Infinity, -Infinity);
    this._dirty = true;
    return this;
};

FLOW.MathUtils.BoundingBox.prototype.update = function(position, offset, length) {
    if (position instanceof FLOW.MathUtils.BoundingBox) {
        this.update(position._min);
        this.update(position._max);
    }
    else if (position instanceof THREE.Vector3) {
        if (position.x < this._min.x) {
            this._min.x = position.x;
            this._dirty = true;
        }
        if (position.y < this._min.y) {
            this._min.y = position.y;
            this._dirty = true;
        }
        if (position.z < this._min.z) {
            this._min.z = position.z;
            this._dirty = true;
        }
        if (position.x > this._max.x) {
            this._max.x = position.x;
            this._dirty = true;
        }
        if (position.y > this._max.y) {
            this._max.y = position.y;
            this._dirty = true;
        }
        if (position.z > this._max.z) {
            this._max.z = position.z;
            this._dirty = true;
        }
    }
    else if (typeof(position.length) === "number") {
        var start = offset || 0;
        var end = start + (length || position.length);
        if (position[0] instanceof THREE.Vector3) {
            for (var i = start; i < end; i++) {
                var p = position[i];
                if (p.x < this._min.x) {
                    this._min.x = p.x;
                    this._dirty = true;
                }
                if (p.y < this._min.y) {
                    this._min.y = p.y;
                    this._dirty = true;
                }
                if (p.z < this._min.z) {
                    this._min.z = p.z;
                    this._dirty = true;
                }
                if (p.x > this._max.x) {
                    this._max.x = p.x;
                    this._dirty = true;
                }
                if (p.y > this._max.y) {
                    this._max.y = p.y;
                    this._dirty = true;
                }
                if (p.z > this._max.z) {
                    this._max.z = p.z;
                    this._dirty = true;
                }
            }
        }
        else if (typeof(position[0] === "number")) {
            for (var i = start; i < end; i+=3) {
                var x = position[i];
                var y = position[i + 1];
                var z = position[i + 2];
                if (x < this._min.x) {
                    this._min.x = x;
                    this._dirty = true;
                }
                if (y < this._min.y) {
                    this._min.y = y;
                    this._dirty = true;
                }
                if (z < this._min.z) {
                    this._min.z = z;
                    this._dirty = true;
                }
                if (x > this._max.x) {
                    this._max.x = x;
                    this._dirty = true;
                }
                if (y > this._max.y) {
                    this._max.y = y;
                    this._dirty = true;
                }
                if (z > this._max.z) {
                    this._max.z = z;
                    this._dirty = true;
                }
            }
        }
    }
    return this;
};

FLOW.MathUtils.BoundingBox.prototype.getCenter = function() {
    if (this._dirty) {
        this._center.copy(this._max).sub(this._min).multiplyScalar(0.5).add(this._min);
        this._dirty = false;
    }
    return this._center;
};

FLOW.MathUtils.BoundingBox.prototype.getMin = function() {
    return this._min;
};

FLOW.MathUtils.BoundingBox.prototype.getMax = function() {
    return this._max;
};

FLOW.MathUtils.BoundingBox.prototype.addPosition = function(position) {
    this.getCenter().add(position);
    this._min.add(position);
    this._max.add(position);
    return this;
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.MathUtils;
}));