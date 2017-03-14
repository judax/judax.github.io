var THREE = THREE || require('three');

var FLOW = FLOW || {};
FLOW.Lines = FLOW.Lines || require('flow-lines');


FLOW.Svg = function( svg, params) { //scale = 0.001, divisions = 50 ) {

	params = params || {};

	this.color = params.color; //If fndefined, use the color from the svg file.
	this.scale = params.scale || 0.001;
	this.lineDivisions =  params.divisions || 50;
	this.object = new THREE.Mesh();
	this.flowLines = new FLOW.Lines.Lines();
    this.flowLines.setSize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio);
    this.flowLines.sizeAttenuation = typeof (params.sizeAttenuation ) != "undefined" ? params.sizeAttenuation: false;

	if( svg.endsWith(".svg") ) {
		this.loadFile(svg);
	} else if( svg.endsWith("</svg>") ) {
		this.svg = createSvgObject(svg);
		buildLines.call(this, this.svg);
	} else  {
		throw "FLOW.Svg svg parameter is not recognized. Should be svg file locations or its content";
	}

	return this ;

};

FLOW.Svg.prototype.loadFile = function( location ) {

	let client = new XMLHttpRequest();
	client.open('GET', location, false);
	client.onload = () => {
	  this.svg = createSvgObject(client.responseText);
	  buildLines.call(this, this.svg);
	}
	client.send();

};

FLOW.Svg.prototype.connect = function(startObject, endObject, svgStart, svgEnd, distanceFromStart = 0, distanceFromEnd = 0) {
	let worldStart = startObject.position.clone();
	let worldEnd = endObject.position.clone();

	startObject.geometry.computeBoundingSphere();
	endObject.geometry.computeBoundingSphere();

	distanceFromStart += startObject.geometry.boundingSphere.radius;
	distanceFromEnd   += endObject.geometry.boundingSphere.radius;

	worldStart.sub(worldEnd);
	worldStart.setLength(worldStart.length() - distanceFromStart);
	worldStart.add(worldEnd);

	worldEnd.sub(startObject.position);
	worldEnd.setLength(worldEnd.length() - distanceFromEnd);
	worldEnd.add(startObject.position);

	if(!svgStart) {
		svgStart = this.paths[0].at(0).parameterAt(0)
		svgEnd = this.paths[0].at(-1).parameterAt(0)
	} else {
		svgStart.multiplyScalar(this.scale);
		svgEnd.multiplyScalar(this.scale);
	}

	// alight svg pont with svg 0
	this.lines.geometry.translate( -svgStart.x, -svgStart.y, 0);

	// get distances between specifiet points
	const distanceSvg = svgStart.distanceTo(svgEnd);
	const distanceWorld = worldStart.distanceTo(worldEnd);
	
	// rotate svg to align with x
	const svgDiffY = svgEnd.y - svgStart.y;
	const angle = Math.asin(svgDiffY/distanceSvg)
	this.lines.rotateZ(angle);

	// scale svg to span the distance between world points
	this.lines.scale.x = (distanceWorld/distanceSvg);
	this.lines.scale.y = -(distanceWorld/distanceSvg);
	
	this.object.position.copy(worldStart)
	// rotate svg object to align x axis with specified point
	var m1 = new THREE.Matrix4();
    m1.lookAtX = function(eye, target, up) {
        var x, y, z;
        if ( x === undefined ) {
            x = new THREE.Vector3();
            y = new THREE.Vector3();
            z = new THREE.Vector3();
        }

        var te = this.elements;
        x.subVectors( eye, target ).normalize();
        if ( x.lengthSq() === 0 ) {
            x.x = 1;
        }

        z.crossVectors( up, x ).normalize();
        if ( z.lengthSq() === 0 ) {
            x.x += 0.0001;
            z.crossVectors( up, x ).normalize();
        }

        y.crossVectors( z, x );

        te[ 0 ] = x.x; te[ 4 ] = y.x; te[ 8 ] = z.x;
        te[ 1 ] = x.y; te[ 5 ] = y.y; te[ 9 ] = z.y;
        te[ 2 ] = x.z; te[ 6 ] = y.z; te[ 10 ] = z.z;

        return this;
    }
    m1.lookAtX(worldEnd, this.object.position, this.object.up);
    this.object.quaternion.setFromRotationMatrix(m1);

}

function createSvgObject(svgString) {
	let parser = new DOMParser();
	let svgDocument = parser.parseFromString(svgString, "image/svg+xml");
	return svgObject = svgDocument.documentElement;
}

function buildLines(svg) {
	let position = new THREE.Vector2(0,0);
	let originalPosition = position.clone();

	// draw paths
	this.paths = []
	let pathsElements = svg.getElementsByTagName("path")
	for( let currentPath of pathsElements ) {
		let d = currentPath.getAttribute("d");
		let color = this.color? this.color : currentPath.getAttribute("stroke");
		let width = +currentPath.getAttribute("stroke-width");
		let path = new Path();
		path.color  = color;
		path.width = this.flowLines.sizeAttenuation?  this.scale/4*( width || 1 ) : width || 1;
		reg = /[M|L|H|V|z|S|C|Q|T|A].*?(?=[M|L|H|V|z|S|C|Q|T|A]|$)/ig
		group = reg.exec(d);
		while(group != null) {
			instruction = group[0];
			let segment = new PathSegment(instruction, this.scale, path);
			drawSegment(this.flowLines, segment, this.lineDivisions)
			group = reg.exec(d)
		}
		this.paths.push(path);
	}

	// draw separate lines
	let lines = svg.getElementsByTagName("line")
	for( let line of lines ) {
		let x1 = +line.getAttribute("x1");
		let x2 = +line.getAttribute("x2");
		let y1 = +line.getAttribute("y1");
		let y2 = +line.getAttribute("y2");
		let color = this.color? this.color : line.getAttribute("stroke");
        let width = +line.getAttribute("stroke-width");

		line = new FLOW.Lines.Line();
		line.addPoint(new THREE.Vector3(this.scale*x1, this.scale*y1, 0));
		line.addPoint(new THREE.Vector3(this.scale*x2, this.scale*y2, 0));
		line.setColor(new THREE.Color(color));
		line.setWidth(this.flowLines.sizeAttenuation?  this.scale/4*( width || 1 ) : width || 1);
		this.flowLines.addLine(line);
	}

	drawCircle = (color, width, cx, cy, r, start = 0, angle = 2*Math.PI) => {
		drawEllipse(color, width, cx, cy, r, r, start, angle)
	}

	drawEllipse = (color, width, cx, cy, rx, ry, start = 0, angle = 2*Math.PI) => {
		let step = (angle - start)/this.lineDivisions;
		line = new FLOW.Lines.Line();
		start += Math.PI/2

		let x = cx + Math.cos(start)*rx;
		let y = cy + Math.sin(start)*ry;
		line.addPoint(new THREE.Vector3(x, y, 0));
		for( let i = 1; i < this.lineDivisions +1; i++) {
			let x = cx + Math.cos(start + step*i)*rx;
			let y = cy + Math.sin(start + step*i)*ry;
			line.addPoint(new THREE.Vector3(x, y, 0));
		}

		line.setColor(new THREE.Color(color));
		line.setWidth(this.flowLines.sizeAttenuation?  this.scale/4*( width || 1 ) : width || 1);
		this.flowLines.addLine(line);
	}

	// draw cicles as ellipses with same rx ry
	let circles = svg.getElementsByTagName("circle");
	for( let circle of circles ) {
		let cx = +circle.getAttribute("cx")*this.scale;
		let cy = +circle.getAttribute("cy")*this.scale;
		let r = +circle.getAttribute("r")*this.scale;

		let color = this.color? this.color : circle.getAttribute("stroke");
        let width = +circle.getAttribute("stroke-width");
        width = this.flowLines.sizeAttenuation?  this.scale/4*( width || 1 ) : width || 1;

		drawCircle(color, width, cx, cy, r);
	}
	
	// draw ellipses
	let ellipses = svg.getElementsByTagName("ellipse");
	for( let ellipse of ellipses ) {
		let cx = +ellipse.getAttribute("cx")*this.scale;
		let cy = +ellipse.getAttribute("cy")*this.scale;
		let rx = +ellipse.getAttribute("rx")*this.scale;
		let ry = +ellipse.getAttribute("ry")*this.scale;

		let color = this.color? this.color : ellipse.getAttribute("stroke");
        let width = +ellipse.getAttribute("stroke-width");
        width = this.flowLines.sizeAttenuation?  this.scale/4*( width || 1 ) : width || 1;

		drawEllipse(color, width, cx, cy, rx, ry);
	}
	
	drawLine = (color, width, x, y, x1, y1) => {
		line = new FLOW.Lines.Line();
		line.addPoint(new THREE.Vector3(x, y, 0));
		line.addPoint(new THREE.Vector3(x1, y1, 0));
		line.setColor(new THREE.Color(color));
		line.setWidth(this.flowLines.sizeAttenuation?  this.scale/4*( width || 1 ) : width || 1);
		this.flowLines.addLine(line);
	}
	
	// draw rectangles, supoprts rx ry
	let rectangles = svg.getElementsByTagName("rect");
	for( let rectangle of rectangles ) {
		let width = +rectangle.getAttribute("width")*this.scale || 0;
		let height = +rectangle.getAttribute("height")*this.scale || 0;
		let x = +rectangle.getAttribute("x")*this.scale;
		let y = +rectangle.getAttribute("y")*this.scale;
		let rx = +rectangle.getAttribute("rx")*this.scale || 0;
		let ry = +rectangle.getAttribute("ry")*this.scale || 0;

		let color = this.color? this.color : rectangle.getAttribute("stroke");
        let strokeWidth = +rectangle.getAttribute("stroke-width");
        strokeWidth = this.flowLines.sizeAttenuation?  this.scale/4*( strokeWidth || 1 ) : strokeWidth || 1;

		drawLine(color, strokeWidth, x+rx, y, x+width-rx, y);
		drawLine(color, strokeWidth, x+width, y+ry, x+width, y+height-ry);
		drawLine(color, strokeWidth, x+rx, y+height, x+width-rx, y+height);
		drawLine(color, strokeWidth, x, y+ry, x, y+height-ry);

		drawEllipse(color, strokeWidth, x+rx, 	   y+ry,        rx, ry, Math.PI/2,   Math.PI);
		drawEllipse(color, strokeWidth, x+rx,       y+height-ry, rx, ry, 0, 		     Math.PI/2);
		drawEllipse(color, strokeWidth, x+width-rx, y+height-ry, rx, ry, 3*Math.PI/2, 2*Math.PI);	
		drawEllipse(color, strokeWidth, x+width-rx, y+ry,        rx, ry, Math.PI, 	 3*Math.PI/2);	
	}


	drawPolygon = (polygon, closed = false) => {
		let color = this.color? this.color : polygon.getAttribute("stroke");
        let width = +polygon.getAttribute("stroke-width");
        width = this.flowLines.sizeAttenuation?  this.scale/4*( width || 1 ) : width || 1;

		let pointsString = polygon.getAttribute("points");
		let points = PathSegment.getNumbers(pointsString, this.scale)

		line = new FLOW.Lines.Line();
		line.addPoint(new THREE.Vector3(points[0], points[1], 0));
		for(let i = 2; i < points.length; i += 2) {
			line.addPoint(new THREE.Vector3(points[i], points[i+1], 0));
		}

		if(closed) {
			line.addPoint(new THREE.Vector3(points[0], points[1], 0));
		}
		line.setColor(new THREE.Color(color));
		line.setWidth(this.flowLines.sizeAttenuation?  this.scale/4*( width || 1 ) : width || 1);
		this.flowLines.addLine(line);
	}

	let polygons = svg.getElementsByTagName("polygon");
	for( let polygon of polygons ) {
		drawPolygon(polygon, true)
	}

	let polylines = svg.getElementsByTagName("polyline");
	for( let polyline of polylines ) {	
		drawPolygon(polyline);
	}
	

	let obj = this.flowLines.buildMesh();
	obj.scale.y = -1;
	this.lines = obj;
	this.object.add(obj);
}

function drawSegment(parentLine, segment, divisions) {	
	let command = segment.command
	let coordinates = segment.parameters

	let previousSegment = segment.previous
	if( previousSegment ) {
		position = previousSegment.lastParameter
	}

	if( command == "M" || command == "m") {
		// if there are multiple pairs for m in the beggining only the first one will be used
		position = coordinates[0].clone();
	}

	line = new FLOW.Lines.Line();
	line.addPoint(new THREE.Vector3(position.x, position.y, 0));
	line.setColor(new THREE.Color(segment.path.color));
	line.setWidth(+segment.path.width);

	if ( command == "L" ) {

		for(let coordinate of coordinates) {
			line.addPoint(new THREE.Vector3(coordinate.x, coordinate.y, 0));
		}

	} else if ( command == "C") {

		for(let i = 0; i < coordinates.length; i += 3) {
			let a = position;
			if(i != 0) {
				a = coordinates[i-1]
			}
			let b = coordinates[i]
			let c = coordinates[i+1]
			let d = coordinates[i+2]
			if (!a || !b ||!c || !d){
				debugger
			}
			addCurve(line, THREE.CubicBezierCurve, [a, b, c, d], divisions)
		}

	} else if( command == "Q" ) {

		for(let i = 0; i < coordinates.length; i += 2) {
			let a = position;
			if(i != 0) {
				a = coordinates[i-1]
			}
			let b = coordinates[i]
			let c = coordinates[i+1]
			addCurve(line, THREE.QuadraticBezierCurve, [a, b, c], divisions)
		}	

	} else if( command == "A" ) {
		addCurve(line, Arc, [position, ...coordinates], divisions) 
	} 

	if( command.toLowerCase() != "m" ) {
		parentLine.addLine(line);
	}

	function addCurve(line, curveFunction, parameters, divisions) {
		const curve = new curveFunction(...parameters)
		points = curve.getPoints(divisions)
		for(let i = 0; i < points.length; i++) {
			pos = points[i]
			line.addPoint(new THREE.Vector3(pos.x, pos.y, 0));
		}
		return points[points.length - 1];
	}
}

function Arc(p0, r, params, p1) {
	xAxisRotation = params.angle;
	largeArcFlag = params.large;
	sweepFlag = params.sweep;
       // In accordance to: http://www.w3.org/TR/SVG/implnote.html#ArcOutOfRangeParameters
       rx = Math.abs(r.x);
       ry = Math.abs(r.y);
       xAxisRotation = mod(xAxisRotation, 360);
       var xAxisRotationRadians = xAxisRotation * (Math.PI / 180);
       // If the endpoints are identical, then this is equivalent to omitting the elliptical arc segment entirely.
       if(p0.x === p1.x && p0.y === p1.y) {
           return [p0.x, p0.y];
       }
        
    // If rx = 0 or ry = 0 then this arc is treated as a straight line segment joining the endpoints.    
    if(rx === 0 || ry === 0) {
    	this.getPoints = function(t) {
    		points=[p0,p1];
    		return points
    	}
    	return this;
    }
    
    // Following "Conversion from endpoint to center parameterization"
    // http://www.w3.org/TR/SVG/implnote.html#ArcConversionEndpointToCenter
    // Step #1: Compute transformedPoint
    var dx = (p0.x-p1.x)/2;
    var dy = (p0.y-p1.y)/2;
    var transformedPoint = {
        x: Math.cos(xAxisRotationRadians)*dx + Math.sin(xAxisRotationRadians)*dy,
        y: -Math.sin(xAxisRotationRadians)*dx + Math.cos(xAxisRotationRadians)*dy
    };
    // Ensure radii are large enough
    var radiiCheck = Math.pow(transformedPoint.x, 2)/Math.pow(rx, 2) + Math.pow(transformedPoint.y, 2)/Math.pow(ry, 2);
    if(radiiCheck > 1) {
        rx = Math.sqrt(radiiCheck)*rx;
        ry = Math.sqrt(radiiCheck)*ry;
    }

    // Step #2: Compute transformedCenter
    var cSquareNumerator = Math.pow(rx, 2)*Math.pow(ry, 2) - Math.pow(rx, 2)*Math.pow(transformedPoint.y, 2) - Math.pow(ry, 2)*Math.pow(transformedPoint.x, 2);
    var cSquareRootDenom = Math.pow(rx, 2)*Math.pow(transformedPoint.y, 2) + Math.pow(ry, 2)*Math.pow(transformedPoint.x, 2);
    var cRadicand = cSquareNumerator/cSquareRootDenom;
    // Make sure this never drops below zero because of precision
    cRadicand = cRadicand < 0 ? 0 : cRadicand;
    var cCoef = (largeArcFlag !== sweepFlag ? 1 : -1) * Math.sqrt(cRadicand);
    var transformedCenter = {
        x: cCoef*((rx*transformedPoint.y)/ry),
        y: cCoef*(-(ry*transformedPoint.x)/rx)
    };

    // Step #3: Compute center
    var center = {
        x: Math.cos(xAxisRotationRadians)*transformedCenter.x - Math.sin(xAxisRotationRadians)*transformedCenter.y + ((p0.x+p1.x)/2),
        y: Math.sin(xAxisRotationRadians)*transformedCenter.x + Math.cos(xAxisRotationRadians)*transformedCenter.y + ((p0.y+p1.y)/2)
    };

    // Step #4: Compute start/sweep angles
    // Start angle of the elliptical arc prior to the stretch and rotate operations.
    // Difference between the start and end angles
    var startVector = {
        x: (transformedPoint.x-transformedCenter.x)/rx,
        y: (transformedPoint.y-transformedCenter.y)/ry
    };
    var startAngle = angleBetween({
        x: 1,
        y: 0
    }, startVector);
    
    var endVector = {
        x: (-transformedPoint.x-transformedCenter.x)/rx,
        y: (-transformedPoint.y-transformedCenter.y)/ry
    };
    var sweepAngle = angleBetween(startVector, endVector);
    
    if(!sweepFlag && sweepAngle > 0) {
        sweepAngle -= 2*Math.PI;
    }
    else if(sweepFlag && sweepAngle < 0) {
        sweepAngle += 2*Math.PI;
    }
    sweepAngle %= 2*Math.PI;

    function mod(x, m) {
        return (x%m + m)%m;
    }

	function angleBetween(v0, v1) {
	    var p = v0.x*v1.x + v0.y*v1.y;
	    var n = Math.sqrt((Math.pow(v0.x, 2)+Math.pow(v0.y, 2)) * (Math.pow(v1.x, 2)+Math.pow(v1.y, 2)));
	    var sign = v0.x*v1.y - v0.y*v1.x < 0 ? -1 : 1;
	    var angle = sign*Math.acos(p/n);
	  	        
	    return angle;
	}

	this.getPoints = function(divisions) {
		let step = 1/divisions;
		let points = []
		let complete = false;
		let counter = 0;
		let i = 0
		while(counter != (divisions + 1)) {
	        const angle = startAngle+(sweepAngle*i);
	        const ellipseComponentX = rx*Math.cos(angle);
	        const ellipseComponentY = ry*Math.sin(angle);
	       
	        const x = Math.cos(xAxisRotationRadians)*ellipseComponentX - Math.sin(xAxisRotationRadians)*ellipseComponentY + center.x;
	        const y = Math.sin(xAxisRotationRadians)*ellipseComponentX + Math.cos(xAxisRotationRadians)*ellipseComponentY + center.y;
	        points.push(new THREE.Vector2(x, y))
	        i += step
	        counter += 1
 		}
    	return points;
 	}

    return this;
}


class Path {
	constructor() {
		this.segments = []
	}

	add( segment ) {
		segment.path  = this;
		segment.index = this.segments.length;
		this.segments.push(segment);
	}

	at( index ) {
		if( Math.abs(index) > this.segments.length ) {
			return null;
		}
		if( index < 0 ) {
			return this.segments[this.segments.length - 1]
		}
		return this.segments[index]
	} 

	get size() { 
		return this.segments.length;
	}

	get last() {
		return this.segments[this.segments.length - 1];
	}

	get originalPosition() {
		if(this.segments.length > 0) {
			return this.segments[0].parameters[0]
		} else {
			return new THREE.Vector2();
		}
	}
};

class PathSegment {
	constructor(instruction, scale, path) {
		// constructor takes instruction and converts every coordinate to absolute
		// converts L V H Z to L
		// converts shorthand curves to full curves

		let getVectors = (...args) => {
			const result = [];
			for(let i = 0; i < args[0].length; i += 2) {
				result.push(new THREE.Vector2(args[0][i], args[0][i+1]))
			}
			return result;
		}

		let shorthandToNormalCurve = (args, argumentPerCommand) => {

			let parameters = getVectors(args);
			let results = []

			let commandNumber = 0;
			while( commandNumber < parameters.length ) {
				let point, center;
				if( commandNumber == 0 ) {
					if( path.last.command == "C" || path.last.command == "Q") {
						point = path.last.parameterAt(-2).clone();
					} else {
						if( path.last.previous == null ) {
							throw "FLOW.Svg can't build shorthand curve. Not enought points"
						}
						point = path.last.previous.lastParameter.clone();
					}
					center = path.last.lastParameter.clone();
				} else {
					point = results[results.length - 2].clone();
					center = results[results.length - 1].clone();
				}
				// find the first point
				point.sub(center);
				point.multiplyScalar(-1);
				point.add(center);

				// add coordinates to result, convert to absolute if necessary
				results.push(point)
				if( lowerCaseCommand == command ) {
					parameters[commandNumber].add(center);
				}
				results.push(parameters[commandNumber]);

				if(argumentPerCommand > 1) {
					if( lowerCaseCommand == command ) {
						parameters[commandNumber + 1].add(center);
					}
					results.push(parameters[commandNumber+1]);
				}

				commandNumber += argumentPerCommand;
			}

			return results;
		}

		let command = instruction[0];
		// find all numerical aruments
		let args = PathSegment.getNumbers(instruction, scale);		

		let lowerCaseCommand = command.toLowerCase();
		let parameters = []

		// get points that accept simple x,y pairs as parameters
		let simpleGroup = ["m", "l", "c", "q"]
		if ( simpleGroup.indexOf(lowerCaseCommand) != -1) {
			parameters = getVectors(args);
			if( lowerCaseCommand == command ) {
				for(let index in parameters) {
					parameters[index].add(path.last.lastParameter)
				}
				command = command.toUpperCase()	
			}
		}

		// get points for v or h. accpet only one coordinate
		else if ( lowerCaseCommand == "v" || lowerCaseCommand == "h" ) {
			for(let i = 0; i < args.length; i += 1) {
				let coordinate = args[i]
				if( lowerCaseCommand == "v" ) {
					// convert to absolute
					if( lowerCaseCommand == command ) {
						coordinate += path.last.lastParameter.y;
					}
					parameters.push(new THREE.Vector2(path.last.lastParameter.x, coordinate))
				} else {
					if( lowerCaseCommand == command ) {
						coordinate += path.last.lastParameter.x;
					}
					// convert to absolute
					parameters.push(new THREE.Vector2(coordinate, path.last.lastParameter.y));
				}
			}
			command = "L";
		}
		// convert s and S to C
		else if ( lowerCaseCommand == "s" ) {
			parameters = shorthandToNormalCurve(args,2)
			command = "C"
		} 
		// convert t and T to Q
		else if ( lowerCaseCommand == "t" ) {
			parameters = shorthandToNormalCurve(args,1)
			command = "Q";
		}

		else if ( lowerCaseCommand == "a") {
			//rx ry
			parameters.push(new THREE.Vector2(args[0], args[1]))
			let params = {
				//x-axis-rotation 
				angle: args[2],
				//large-arc-flag
				large: args[3],
				//sweep-flag 
				sweep: args[4]
			}
			parameters.push(params)
			//x y 
			parameters.push(new THREE.Vector2(args[5], args[6]))

			if( lowerCaseCommand == command ) {
				parameters[parameters.length - 1].add(path.last.lastParameter);
			}
			command = "A"
		}

		else if ( lowerCaseCommand == "z") {
			command = "L"
			parameters = [path.originalPosition];
		}

		this.command = command;
		this.parameters = parameters;

		path.add(this);	
	}

	static getNumbers(instruction, scale) {
		let numbers = []
		let reg = /([+|-]?(\d)+[\.]?[\d]{0,10})/g 
		let group = reg.exec(instruction);
		while(group != null) {
			let number = group[0];
			numbers.push(+number*scale);
			group = reg.exec(instruction);
		}
		return numbers;
	}

	addParameter( parameter ) {
		this.parameters.push(parameter);
	}

	parameterAt( index ) {
		if( Math.abs(index) > this.parameters.length ) {
			return null;
		}  

		if( index < 0 ) {
			return this.parameters[this.parameters.length + index]
		}
		return this.parameters[index]
	}

	get lastParameter() {
		return this.parameters[this.parameters.length - 1];
	}

	get previous() {
		if(!this.path) {
			return null;
		}
		return this.path.at(this.index - 1);
	}
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Svg;
}));
