/**
IMPORTANT NOTE:

This code is maintaining two implementations:
1. Font management based on the original code from Jason Marsh.
2. Font and text management based on BMFont format and some code from the Jam3 BMFont and text libraries.

Both options have been deeply modified/adapted by Iker Jamardo to get the desired results.

It is very likely that option 2 will be the only one to be used in the future. In this case, remove the option 1
for the sake of readability/maintainability.
*/

    /*
     AVAILABLE FONTS:
     "Times New Roman"  "DejaVu Sans Mono" "Lato-Regular"  "Open Sans"
      "Open Sans Light" "Open Sans Bold"  "Marcellus SC Regular  "Tangerine Bold"
     */

var FLOW = FLOW || {};

FLOW.THREE = FLOW.THREE || require('flow-three');
FLOW.MathUtils = FLOW.MathUtils || require('flow-math-utils');
FLOW.EventUtils = FLOW.EventUtils ||require('flow-event-utils');
FLOW.OOPUtils = FLOW.OOPUtils ||require('flow-oop-utils');

var THREE = THREE || require('three');

FLOW.Text = {};
FLOW.Text.setFonts = function(fonts){
    FLOW.Text._fonts = fonts;
};

/**
TODO: This function should go to its own module: flow-core maybe?
*/
FLOW.Text.number = function(num, def) {
	return typeof num === 'number' ? num : (typeof def === 'number' ? def : 0);
};

/**
TODO: This function should go to its own module: flow-core maybe?
*/
FLOW.Text.xtend = function() {
    var target = {};
    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }
    }
    return target;
};


FLOW.Text.Font = function() {
	return this;
}

FLOW.Text.Font.SIZE = 90;
FLOW.Text.Font.LOAD_TIMEOUT = 3000;
FLOW.Text.Font.TEXTURE_LETTERS_PER_SIDE = 16;
FLOW.Text.Font.TRIM_EXTRA_WHITE_SPACE_IN_TEXTURE = 0.8;

FLOW.Text.Font._createSpan = function(name, font) {
    var span = document.createElement('span');
    span.setAttribute('data-fontfamily', name);
    span.style.cssText = 'position:absolute; left:-5000px; top:-5000px; visibility:hidden;' +
    'font-size:100px; font-family:"' + name + '", Helvetica;font-weight: ' + font._params.weight + ';' +
    'font-style:' + font._params.style + ';';
    span.innerHTML = 'BESs';
    return span;
};

FLOW.Text.Font._indexOfElementInArrayThatContainsSubstring = function(array, substring) {
	for (var i = 0; i < array.length; i++) {
		if (array[i].includes(substring)) {
			break;
		}
	}
	if (i === array.length) {
		throw "ERROR: Could not find '" + substring + "' in array!";
	}
	return i;
}

FLOW.Text.Font.prototype._createSpans = function() {
	this._defaultSpan = Font._createSpan("Helvetica". this);
	this._testSpan = Font._createSpan(this._params.name, this);
	document.body.appendChild(this._defaultSpan);
	document.body.appendChild(this._testSpan);
};

FLOW.Text.Font.prototype._removeSpans = function() {
	if (this._defaultSpan) {
    	document.body.removeChild(this._defaultSpan);
    }
    if (this._testSpan) {
    	document.body.removeChild(this._testSpan);
    }
}

FLOW.Text.Font.prototype._calculateMetrics = function() {
    var offsets = this._params.offsets || {};
    var charWidths = {};
    var kernPairs = {};

    if (this.afm) {
        var afmArray = this.afm.split("\n");
        var charMetricsStart = FLOW.Text.Font._indexOfElementInArrayThatContainsSubstring(afmArray, "StartCharMetrics") + 1;
        var charMetricsEnd = afmArray.indexOf("EndCharMetrics");

        for (var i = charMetricsStart; i < charMetricsEnd; i++) {
            var charMetrics = afmArray[i].split(" ; "); // "C 111 ; WX 604 ; N o ; B 56 -10 548 545 ;"
            var name = charMetrics[2].substring(2, charMetrics[2].length)

            var charCode = Number(charMetrics[0].substring(2, charMetrics[0].length));
            var charWidth = Number(charMetrics[1].substring(3, charMetrics[1].length));
            var bbox = charMetrics[3].substring(2, charMetrics[3].length - 1).split(" ");
            var leftX = Number(bbox[0]);
            var rightX = Number(bbox[2]);
            //var calculatedActualWidth = ( (charWidth - rightX + leftX )/ charWidth);
            //var calculatedActualWidth = charWidth/1000;
            var calculatedActualWidth = (charWidth - leftX ) / 1000;

            charWidths[charCode] = {width: calculatedActualWidth, name: name};

        }

        var startKernData = afmArray.indexOf("StartKernData") + 2;
        var endKernData = afmArray.indexOf("EndKernData") - 1;

        for (var i = startKernData; i < endKernData; i++) {
            var kernMetrics = afmArray[i].split(" "); //"KPX o w -20\n"
            var firstChar = kernMetrics[1];
            var secondChar = kernMetrics[2];
            var kernString = kernMetrics[3];

            if (!kernPairs.hasOwnProperty(firstChar)) {
                kernPairs[firstChar] = {};
            }
            kernPairs[firstChar][secondChar] = Number(kernString) / 1000;
        }
    }

    var c = document.createElement('canvas');
    var self = this;
    var measureCharWidth = function(char){
        var ctx = c.getContext('2d');
        ctx.font = "normal " + FLOW.Text.Font.FONTSIZE + 'px ' + self._params.name;
        return ctx.measureText(char).width;
    }

    for (var name in offsets){
        var charCode = name.charCodeAt(0);//TODO: only offsets for single chars will work
        if (! charWidths[charCode]) {
            charWidths[charCode] = {};
        }
        if (offsets[name].hasOwnProperty("leftOffset")) {
            charWidths[charCode].leftOffset = offsets[name].leftOffset;
        }
        if (offsets[name].hasOwnProperty("widthOffset")) {
            charWidths[charCode].width = charWidths[charCode].hasOwnProperty("width") ?
            charWidths[charCode].width * offsets[name].widthOffset :
            measureCharWidth(name)/100 * offsets[name].widthOffset ;
        }
        if (offsets[name].hasOwnProperty("drawLeft")) {
            charWidths[charCode].drawLeft = offsets[name].drawLeft;
        }
    };

    this._charWidths = charWidths;
    this._kernPairs = kernPairs;
};

FLOW.Text.Font.prototype._createFontTexture = function() {
    var fontSize = FLOW.Text.Font.SIZE; //TODO: calculate this dynamically to end up with a 2048 texture
    this._size = fontSize;
    this._lineHeight = fontSize * 1.4; //TODO: make the lineHeight a param

    var lettersPerSide = FLOW.Text.Font.TEXTURE_LETTERS_PER_SIDE;
    var drawCharSpacing = 1.4; //draw plenty of white space between each character, multiplier where 1= normal

    var fontName = this._params.name;
    var c = document.createElement('canvas');

    if (drawCharSpacing * fontSize * lettersPerSide > 2048) {
        throw "Font size is too large for 2048 texture map. drawCharSpacing = " + drawCharSpacing + ", fontSize = " + fontSize + ", lettersPerSide = " + lettersPerSide;
    }
    c.width = c.height = 2048; // TODO: Select the closest power of two value that fits. Try to optimize this.
    this._textureMapWidth = c.width;
    var ctx = c.getContext('2d');

    ctx.font = "normal " + fontSize+'px ' + fontName;
    var i=0;

    var charSizeMap =  new Map();
    this._charSizeMap = charSizeMap;
    var charKerningMap = new Map();
    this._charKerningMap = charKerningMap;

    var measureCharWidth = function(char) {
        var ctx = c.getContext('2d');
        ctx.font = "normal " + fontSize+'px ' + fontName;
        return ctx.measureText(char).width;
    }
    // var fontFace = findFont(fontName);
    var charWidths =   this._charWidths ;

    var drawCharOffsetX = 4;
    var differenceBetweenFontSizeAndActualHeight = 1.015;//1.02;

    ctx.fillStyle="#FFFFFF";

    for (var y = 0; y < lettersPerSide; y++) {
        for (var x = 0; x < lettersPerSide; x++, i++) {
            var ch = String.fromCharCode(i);

            ctx.fillText(ch, x * fontSize * drawCharSpacing + (x * 1.5)  + drawCharOffsetX,
                -0.1 * fontSize + ((y * drawCharSpacing * differenceBetweenFontSizeAndActualHeight) + 1) * fontSize );
            var charKerning ;
            if (charWidths && charWidths.hasOwnProperty(i)) {
                charKerningMap.set(ch, charWidths[i]); //TODO charKerningMap is actually charWidthMap
                charKerning = charWidths[i].width;
            } else {
                charKerning = measureCharWidth(ch)/100;
                charKerningMap.set(ch, charKerning ); //TODO charKerningMap is actually charWidthMap
            }
            /* if (charWidths && charWidths.hasOwnProperty(i)){
             var charKerning = charWidths[i].width;
             } else {
             charKerning = measureCharWidth(ch)*10;
             }
             charKerningMap.set(ch, charKerning); //TODO charKerningMap is actually charWidthMap
            */
            var explicitWidth = charKerning ? charKerning : 1.0;
            //charSizeMap.set(i, measureCharWidth(ch)* explicitWidth / fontSize );
            charSizeMap.set(i, explicitWidth);
            //console.log(ch + ": "+ measureCharWidth(ch) / fontSize );
        }
    }

    var tex = new THREE.Texture(c);
    tex.flipY = false;
    tex.needsUpdate = true;

    this._texture = tex;

	if (typeof(this._params.maxAnisotropy) === "number") {
		this._texture.needsUpdate = true;
		this._texture.minFilter = THREE.LinearMipMapLinearFilter;
		this._texture.magFilter = THREE.LinearFilter;
		this._texture.generateMipmaps = true;
		this._texture.anisotropy = this._params.maxAnisotropy;
	}

    return this;
}

/**
Code adapted from https://github.com/mattdesl/parse-bmfont-ascii/blob/master/index.js
*/
FLOW.Text.Font._parseBMFontAscii = function(data) {
	function splitLine(line, idx) {
		line = line.replace(/\t+/g, ' ').trim();
		if (!line)
			return null;

		var space = line.indexOf(' ');
		if (space === -1) 
			throw new Error("no named row at line " + idx);

		var key = line.substring(0, space);

		line = line.substring(space + 1);
		//clear "letter" field as it is non-standard and
		//requires additional complexity to parse " / = symbols
		line = line.replace(/letter=[\'\"]\S+[\'\"]/gi, '');
		line = line.split("=");
		line = line.map(function(str) {
			return str.trim().match((/(".*?"|[^"\s]+)+(?=\s*|\s*$)/g));
		});

		var data = [];
		for (var i = 0; i < line.length; i++) {
			var dt = line[i];
			if (i === 0) {
				data.push({
					key: dt[0],
					data: ""
				});
			} 
			else if (i === line.length - 1) {
				data[data.length - 1].data = parseData(dt[0]);
			} 
			else {
				data[data.length - 1].data = parseData(dt[0]);
				data.push({
					key: dt[1],
					data: ""
				});
			}
		}

		var out = {
			key: key,
			data: {}
		};

		data.forEach(function(v) {
			out.data[v.key] = v.data;
		});

		return out;
	}

	function parseData(data) {
		if (!data || data.length === 0)
			return "";

		if (data.indexOf('"') === 0 || data.indexOf("'") === 0)
			return data.substring(1, data.length - 1);
		if (data.indexOf(',') !== -1)
			return parseIntList(data);
		return parseInt(data, 10);
	}

	function parseIntList(data) {
		return data.split(',').map(function(val) {
			return parseInt(val, 10);
		});
	}

	if (!data)
		throw new Error('no data provided');

	data = data.toString().trim();

	var output = {
		pages: [],
		chars: [],
		kernings: []
	};

	var lines = data.split(/\r\n?|\n/g);

	if (lines.length === 0)
		throw new Error('no data in BMFont file');

	for (var i = 0; i < lines.length; i++) {
		var lineData = splitLine(lines[i], i);
		if (!lineData) //skip empty lines
			continue

		if (lineData.key === 'page') {
			if (typeof lineData.data.id !== 'number')
				throw new Error('malformed file at line ' + i + ' -- needs page id=N');
			if (typeof lineData.data.file !== 'string')
				throw new Error('malformed file at line ' + i + ' -- needs page file="path"');
			output.pages[lineData.data.id] = lineData.data.file;
		} 
		else if (lineData.key === 'chars' || lineData.key === 'kernings') {
			//... do nothing for these two ...
		} 
		else if (lineData.key === 'char') {
			output.chars.push(lineData.data);
		} 
		else if (lineData.key === 'kerning') {
			output.kernings.push(lineData.data);
		} 
		else {
			output[lineData.key] = lineData.data;
		}
	}

	return output;
};

/**
TODO: This function should go to a separate module: flow-net-utils maybe?
*/
FLOW.Text.Font._load = function(url) {
	if (typeof(url) !== "string") throw "ERROR: The given URL is not a string.";
	return new Promise(function(resolve, reject) {
		var xhr = new XMLHttpRequest();
		xhr.addEventListener('load', function() {
			resolve(this.responseText);
		});
		xhr.addEventListener('error', function() {
			var errorMessage = "Error while loading the file: '" + url + "'";
			reject(errorMessage);
		});
		xhr.addEventListener('readystatechange', function() {
			if (this.readyState === 4 && this.status !== 200) {
				var errorMessage = "Error '" + this.status + "' while loading the file: '" + url + "'";
				reject(errorMessage);
			}
		});
		xhr.open("GET", url, true);
		xhr.send();
	});
};

FLOW.Text.Font._findCharInBMFont = function(array, value, start) {
	start = start || 0;
	for (var i=start; i<array.length; i++)
		if (array[i]['id'] === value)
			return i;
	return -1;
};

/**
{
	fntPath: string
	texturePath: string,
	sdf: boolean,
	maxAnisotropy: number // Max anisotropy (get from the renderer);
	onLoadSucceeded: function(),
	onLoadFailed: function(errorMessage),
}
*/
FLOW.Text.Font.prototype._loadBM = function(params) {
	if (!params || typeof(params) !== "object") throw "ERROR: No parameters specified.";
	if (typeof(params.fntPath) !== "string") throw "ERROR: No fntPath parameter specified.";
	if (typeof(params.texturePath) !== "string") throw "ERROR: No texturePath parameter specified.";
    params.fontsDirectory = params.fontsDirectory || "fonts/";
	this._params = params;
	var thisFont = this;
	FLOW.Text.Font._load(params.fontsDirectory + params.fntPath).then(function success(data) {
		thisFont._bmFont = FLOW.Text.Font._parseBMFontAscii(data);
		var textureLoader = new THREE.TextureLoader();
		textureLoader.load(params.fontsDirectory + params.texturePath, function success(texture) {
			thisFont._texture = texture;

			if (typeof(thisFont._params.maxAnisotropy) === "number") {
				thisFont._texture.needsUpdate = true;
				thisFont._texture.minFilter = THREE.LinearMipMapLinearFilter;
				thisFont._texture.magFilter = THREE.LinearFilter;
				thisFont._texture.generateMipmaps = true;
				thisFont._texture.anisotropy = thisFont._params.maxAnisotropy;
			}

			params.onLoadSucceeded.call(thisFont);
		}, null, function fail() {
			params.onLoadFailed.call(thisFont, "ERROR: Could not load the associated texture '" + params.fontsDirectory + params.texturePath + "' for the BMFont.");
		});

	}, function fail(errorMessage) {
		params.onLoadFailed.call(thisFont, errorMessage);
	});
	return this;
};

/**
params = {
	name: "",
	path: "",
	weight: "",
	style: "",
	afmPath: "",
	maxAnisotropy: number // Max anisotropy (get from the renderer);
	onLoadSucceeded: function(),
	onLoadFailed: function(errorMessage),
	offsets: {}
}

OR

params = {
	// Check loadBM
}
*/
FLOW.Text.Font.prototype.load = function(params) {
	if (!params || typeof(params) !== "object") throw "ERROR: No parameters specified.";
	if (typeof(params.fntPath) === "string") return this._loadBM(params);
	if (typeof(params.name) !== "string") throw "ERROR: In order to load a font a name needs to be provided in the loading parameters.";
	this._params = params;
	params.weight = (params.weight || params.weight === 0) ? params.weight : 400;
	params.style = params.style || "normal";
	var thisFont = this;
	new Promise(function(resolve, reject) {
		if (typeof(params.afmPath) === "string") {
			FLOW.Text.Font._load(params.fontsDirectory + params.afmPath).then(function success(data) {
				thisFont.afm = data;
				resolve();
			}, function fail(errorMessage) {
				reject(errorMessage);
			});
		}
		else {
			resolve();
		}
	}).then(function success() {
		thisFont._calculateMetrics();
		new Promise(function(resolve, reject) {
		    if (!thisFont.path) {
		    	resolve();
		    }
		    else {
		    	this._createSpans();
		    	var startTime = Data.now();
		    	var interval = setInterval(function() {
			        var currWidth = thisFont._testSpan.getBoundingClientRect().width;
			        var defaultWidth = thisFont.defaultSpan.getBoundingClientRect().width;
			        var loaded = currWidth !== defaultWidth;

			        if (loaded) {
			        	clearInterval(interval);
			            resolve();
			        } else if (Date.now() - startTime >= Font.LOAD_TIMEOUT) {
			        	clearInterval(interval);
			        	reject("Waited '" + Font.LOAD_TIMEOUT + "' milliseconds to load '" + thisFont._params.name + "' but the font did not load correctly.");
			        }
		    	}, 100);
		    }
		}).then(function success() {
			thisFont._removeSpans();
			thisFont._createFontTexture();
			if (typeof(thisFont._params.onLoadSucceeded) === "function") {
				thisFont._params.onLoadSucceeded.call(thisFont);
			}
		}, function fail(errorMessage) {
			thisFont._removeSpans();
			if (typeof(thisFont._params.onLoadFailed) === "function") {
				thisFont._params.onLoadFailed.call(thisFont, errorMessage);
			}
		});
	}, function fail(errorMessage) {
		if (typeof(thisFont._params.onLoadFailed) === "function") {
			thisFont._params.onLoadFailed.call(thisFont, errorMessage);
		}
	});
	return this;
};

FLOW.Text.Font.prototype.getName = function() {
	return this._bmFont ? this._bmFont.info.face : this._params.name;
};

FLOW.Text.Fonts = function() {
	FLOW.EventUtils.Observable.call(this);
	this._fonts = {};
    FLOW.Text.setFonts( this ); //used to all the text object to get to the FLOW.Text.Fonts singleton

	return this;	
};

FLOW.OOPUtils.prototypalInheritance(FLOW.Text.Fonts, FLOW.EventUtils.Observable);

FLOW.Text.Fonts.prototype.getFont = function(name) {
	return this._fonts[name];
};

/**
Check FLOW.Text.Font.load
*/
FLOW.Text.Fonts.prototype.loadFont = function(params) {
	if (!params || typeof(params) !== "object") throw "ERROR: No parameters specified.";
	var font = null;
	if (typeof(params.name) === "string") {
		font = this._fonts[params.name];
	}
	if (!font) {
		var thisFonts = this;
		var originalOnLoadSucceeded = params.onLoadSucceeded;
		function onFontLoadSucceeded() {
			thisFonts._fonts[this.getName()] = this;
			if (typeof(originalOnLoadSucceeded) === "function") {
				originalOnLoadSucceeded.call(this);
			}
		}
		params.onLoadSucceeded = onFontLoadSucceeded;
		var font = new FLOW.Text.Font();
		font.load(params);
	}
	else if (typeof(params.onLoadSucceeded) === "function") {
		params.onLoadSucceeded.call(this, font);
	}
	return this;
};

FLOW.Text.Fonts.prototype.unloadFont = function(name) {
	var font = this._fonts[name];
	if (!font) throw "ERROR: There is not font that matches the give name '" + name + "'.";
	delete this._fonts[name];
	return this;
}



FLOW.Text.Fonts.prototype.loadFontSet =  function ( app, params) {
	var fonts = this;
	if (!fonts){
		console.error("onLoaderFailed", "no FLOW.Text.Fonts specified" );
		return;
	}
	if (!params || !params.fontsToLoad) {
		fonts.callEventListeners("onLoaderFailed", "no fonts specified to load" );
		return;
	}

	var fontsAvailable = [];
	var fontsToLoad = params.fontsToLoad;
    var fontsDirectory = params.useLocalFonts? "fonts/" : "../../flow-resources/fonts/" ;
	for (var i=0; i< fontsToLoad.length; i++) {
		var item = fontsToLoad[i];
		switch (item) {
            case "Times New Roman":
                fontsAvailable.push({
                    fntPath: "TimesNewRoman.fnt",
                    texturePath: "TimesNewRoman.png",
                    maxAnisotropy: app.renderer.getMaxAnisotropy(),
                    sdf: false
                });
                break;
            case "Times New Roman SDF":
                fontsAvailable.push({
                    fntPath: "TimesNewRoman-sdf.fnt",
                    texturePath: "TimesNewRoman-sdf.png",
                    maxAnisotropy: app.renderer.getMaxAnisotropy(),
                    sdf: true
                });
                break;
            case "DejaVu Sans Mono":
				fontsAvailable.push({
					fntPath: "DejaVu-sdf.fnt",
					texturePath: "DejaVu-sdf.png",
					maxAnisotropy: app.renderer.getMaxAnisotropy(),
					sdf: true
				});
				break;
			case "Lato-Regular":
				fontsAvailable.push({
					fntPath: "Lato-Regular-64.fnt",
					maxAnisotropy: app.renderer.getMaxAnisotropy(),
					texturePath: "Lato-Regular-64.png"
				});
				break;
			case "Open Sans":
				fontsAvailable.push({
					fntPath: "OpenSansRegular-sdf.fnt",
					maxAnisotropy: app.renderer.getMaxAnisotropy(),
					texturePath: "OpenSansRegular-sdf.png",
					sdf: true
				});
				break;
			case "Open Sans Light":
				fontsAvailable.push({
					fntPath: "OpenSansLight-sdf.fnt",
					maxAnisotropy: app.renderer.getMaxAnisotropy(),
					texturePath: "OpenSansLight-sdf.png",
					sdf: true
				});
				break;
			case "Open Sans Bold":
				fontsAvailable.push({
					fntPath: "OpenSansBold-sdf.fnt",
					maxAnisotropy: app.renderer.getMaxAnisotropy(),
					texturePath: "OpenSansBold-sdf.png",
					sdf: true
				});
				break;
			case "Marcellus SC Regular":
				fontsAvailable.push({
					fntPath: "MarcellusSC-sdf.fnt",
					maxAnisotropy: app.renderer.getMaxAnisotropy(),
					texturePath: "MarcellusSC-sdf.png",
					sdf: true
				});
				break;
            case "Tangerine Bold":
                fontsAvailable.push({
                    fntPath: "tangerine.fnt",
                    maxAnisotropy: app.renderer.getMaxAnisotropy(),
                    texturePath: "tangerine.png",
                    sdf: false
                });
                break;
            case "Space Mono Bold":
                fontsAvailable.push({
                    fntPath: "SpaceMonoBold.fnt",
                    maxAnisotropy: app.renderer.getMaxAnisotropy(),
                    texturePath: "SpaceMonoBold.png",
                    sdf: false
                });
                break;
            case "flowlogo":
                fontsAvailable.push({
                    fntPath: "flowlogo.fnt",
                    maxAnisotropy: app.renderer.getMaxAnisotropy(),
                    texturePath: "flowlogo.png",
                    sdf: true
                });
                break;

		}
	};


	fonts.loadFonts({ fonts: fontsAvailable, fontsDirectory:fontsDirectory  });
};



/**
params = {
	fonts: [ 
		{
			// Check FLOW.Text.Font.load
		}
	}],
	onFontLoadSucceeded: function(Font font),
	onFontLoadFailed: function(Font font, String errorMessage),
	onAllFontsLoadFinished: function(boolean allFontsLoadSucceeded),
}
*/
FLOW.Text.Fonts.prototype.loadFonts = function(params) {
	if (!params || typeof(params) !== "object") throw "ERROR: No parameters specified.";
	if (!(params.fonts instanceof Array)) throw "ERROR: To load some fonts you need to provide a fonts array inside the parameters.";
	this._params = params;
	var self = this;
	var fontCounter = 0;
	var atLeastOneFontFailedToLoad = false;
	function checkAllFontsLoadFinished() {
		fontCounter++;
		if (fontCounter === params.fonts.length ) {
			self.callEventListeners("onLoaderFinished", !atLeastOneFontFailedToLoad);
		}
	}
	function onFontLoadSucceeded() {
		self.callEventListeners("onLoaderProgressed", {name: "fonts"}, (fontCounter+ 1) / params.fonts.length);
		checkAllFontsLoadFinished();
	}
	function onFontLoadFailed(errorMessage) {
		atLeastOneFontFailedToLoad = true;
		self.callEventListeners("onLoaderFailed", self, errorMessage);
		checkAllFontsLoadFinished();
	}
	for (var i = 0; i < params.fonts.length; i++) {
		var fontParams = params.fonts[i];
        fontParams.fontsDirectory = params.fontsDirectory || "fonts/";
		fontParams.onLoadSucceeded = onFontLoadSucceeded;
		fontParams.onLoadFailed = onFontLoadFailed;
		this.loadFont(fontParams);
	}
	return this;
};


// FLOW.Text.Texts = function(fonts) {
// 	if (!(fonts instanceof FLOW.Text.Fonts)) throw "ERROR: Fonts are necessary in order to create texts.";
// 	this._fonts = fonts;
// 	this._texts = [];
// 	this._mesh = null;
// 	this._bufferGeometry = null;
// 	return this;
// };

// FLOW.Text.Texts.prototype._checkTextIndex = function(index) {
// 	if (typeof(index) !== "number") {
// 		throw "ERROR: The passed text index is not a number.";
// 	}		
// 	else if (this._texts.length === 0) {
// 		throw "ERROR: There are no texts yet so why are you trying to get one at '" + index + "' index?";
// 	}
// 	else if (index < 0 || index >= this._texts.length) {
// 		throw "ERROR: The passed text index '" + index + "' is out of bounds. Possible range is 0-" + this._texts.length + ".";
// 	}	
// }

// FLOW.Text.Texts.prototype.containsText = function(text) {
// 	return this._texts.indexOf(text) >= 0;
// };

// FLOW.Text.Texts.prototype.addText = function(text) {
// 	if (!(text instanceof FLOW.Text.Text)) throw "ERROR: The given text is not a FLOW.Text.Text instance.";
// 	if (text._texts instanceof FLOW.Text.Texts && text._texts !== this) throw "ERROR: The given text has been added to a different instance of Texts. Please, remove it first and then add it to this instance.";
// 	text._index = this._texts.length;
// 	text._texts = this;
// 	this._texts.push(text);
// 	return this;
// };

// FLOW.Text.Texts.prototype.removeText = function(text) {
// 	if (!(text instanceof FLOW.Text.Text)) throw "ERROR: The given text is not a FLOW.Text.Text instance.";
// 	if (text._texts !== this) throw "ERROR: The given text is not part of this Texts instance.";
// 	return this;
// };

// FLOW.Text.Texts.prototype.resetAllTexts = function() {
// 	return this;
// };

// FLOW.Text.Texts.prototype.buildMesh = function() {

// };

// FLOW.Text.Texts.prototype.getMesh = function() {

// };

FLOW.Text.WrapType = {
	NO_WRAP: 0,
	WRAP_BY_WIDTH: 1,
	WRAP_BY_NUMBER_OF_CHARACTERS: 2
};

FLOW.Text.calculateStringWidth = function(str, font, fontSize, letterSpacing) {
	var width = 0
    letterSpacing = letterSpacing - 1;
	for (var i = 0; i < str.length; i++) {
	    var charCode = str.charCodeAt(i);
	    var charWidth = font._charSizeMap.get(charCode);
	    var moveLeft = 0;
	    if (font._charWidths && font._charWidths.hasOwnProperty(charCode)) {
	        var charKerning = font._charWidths[charCode];
	        moveLeft = charKerning.moveLeft ? charKerning.moveLeft : 0;
	    }
		width += charWidth + letterSpacing - moveLeft;
	}
	return width * fontSize;
};

FLOW.Text.splitStringIntoLines = function(str) {
	return str.split("\n");
};

FLOW.Text.splitStringIntoWords = function(str) {
	return str.split(/\b/);
};

/**
Code adapted from https://github.com/mattdesl/word-wrapper/blob/master/index.js

text = string
opt = {
	mode: string, // possible values are: nowrap, pre
	start: number, // the character index where to start. 0 by default
	end: number, // the character index where to end. text.length by default
	width: number, // the max width of a line (real meaning depends on the measure function)
	measure: function(text, start, end, width) // determines the size of the line. returns a { start: number, end: number } object
}

Returns an array of { start: number, end: number } for each line identifying the indices of the characters where each line starts and ends.
*/
FLOW.Text.getLinesFromTextWrap = function(text, opt) {
	var newline = /\n/
	var newlineChar = '\n'
	var whitespace = /\s/

	function idxOf(text, chr, start, end) {
	    var idx = text.indexOf(chr, start)
	    if (idx === -1 || idx > end)
	        return end
	    return idx
	}

	function isWhitespace(chr) {
	    return whitespace.test(chr)
	}

	function pre(measure, text, start, end, width) {
	    var lines = []
	    var lineStart = start
	    for (var i=start; i<end && i<text.length; i++) {
	        var chr = text.charAt(i)
	        var isNewline = newline.test(chr)

	        //If we've reached a newline, then step down a line
	        //Or if we've reached the EOF
	        if (isNewline || i===end-1) {
	            var lineEnd = isNewline ? i : i+1
	            var measured = measure(text, lineStart, lineEnd, width)
	            lines.push(measured)
	            
	            lineStart = i+1
	        }
	    }
	    return lines
	}

	function greedy(measure, text, start, end, width, mode) {
	    //A greedy word wrapper based on LibGDX algorithm
	    //https://github.com/libgdx/libgdx/blob/master/gdx/src/com/badlogic/gdx/graphics/g2d/BitmapFontCache.java
	    var lines = []

	    var testWidth = width
	    //if 'nowrap' is specified, we only wrap on newline chars
	    if (mode === 'nowrap')
	        testWidth = Number.MAX_VALUE

	    while (start < end && start < text.length) {
	        //get next newline position
	        var newLine = idxOf(text, newlineChar, start, end)

	        //eat whitespace at start of line
	        while (start < newLine) {
	            if (!isWhitespace( text.charAt(start) ))
	                break
	            start++
	        }

	        //determine visible # of glyphs for the available width
	        var measured = measure(text, start, newLine, testWidth)

	        var lineEnd = start + (measured.end-measured.start)
	        var nextStart = lineEnd + newlineChar.length

	        //if we had to cut the line before the next newline...
	        if (lineEnd < newLine) {
	            //find char to break on
	            while (lineEnd > start) {
	                if (isWhitespace(text.charAt(lineEnd)))
	                    break
	                lineEnd--
	            }
	            if (lineEnd === start) {
	                if (nextStart > start + newlineChar.length) nextStart--
	                lineEnd = nextStart // If no characters to break, show all.
	            } else {
	                nextStart = lineEnd
	                //eat whitespace at end of line
	                while (lineEnd > start) {
	                    if (!isWhitespace(text.charAt(lineEnd - newlineChar.length)))
	                        break
	                    lineEnd--
	                }
	            }
	        }
	        if (lineEnd >= start) {
	            var result = measure(text, start, lineEnd, testWidth)
	            lines.push(result)
	        }
	        start = nextStart
	    }
	    return lines
	}

    opt = opt||{}

    //zero width results in nothing visible
    if (opt.width === 0 && opt.mode !== 'nowrap') 
        return []

    text = text||''
    var width = typeof opt.width === 'number' ? opt.width : Number.MAX_VALUE
    var start = Math.max(0, opt.start||0)
    var end = typeof opt.end === 'number' ? opt.end : text.length
    var mode = opt.mode

    var measure = opt.measure || FLOW.Text._getTextBoundsByChar;
    if (mode === 'pre')
        return pre(measure, text, start, end, width)
    else
        return greedy(measure, text, start, end, width, mode)

};

/**
Check getLinesFromTextWrap to understand the parameters.

Returns a text that is wrapped.
*/
FLOW.Text.wrapText = function(text, opt) {
    var lines = FLOW.Text.getLinesFromTextWrap(text, opt)
    return lines.map(function(line) {
        return text.substring(line.start, line.end)
    }).join('\n')
};

FLOW.Text.UP_VECTOR = new THREE.Vector3(0, 1, 0);


FLOW.Text.lookAt = function( text, target ){
	var matrix = text.getMatrix();
	// Lookat is the z negative, so swap the positions
    var foo=text.getPosition()
	matrix.lookAt(target.position, text.getPosition(), FLOW.Text.UP_VECTOR);
	text.setMatrix(matrix);
}

FLOW.Text._getTextBoundsByChar = function(text, start, end, width) {
    var glyphs = Math.min(width, end-start)
    return {
        start: start,
        end: start+glyphs,
        width: width
    }
};

FLOW.Text.ALIGN_LEFT = 0;
FLOW.Text.ALIGN_CENTER = 1;
FLOW.Text.ALIGN_RIGHT = 2;
FLOW.Text.ALIGN_TOP = 3;
FLOW.Text.ALIGN_MIDDLE = 4;
FLOW.Text.ALIGN_BOTTOM = 5;

FLOW.Text.getAlignmentValue = function(value){
	switch (value) {
        case "left":
            return FLOW.Text.ALIGN_LEFT;
        case "center":
            return FLOW.Text.ALIGN_CENTER;
        case "right":
            return FLOW.Text.ALIGN_RIGHT;
        case "top":
            return FLOW.Text.ALIGN_TOP;
        case "middle":
            return FLOW.Text.ALIGN_MIDDLE;
        case "bottom":
            return FLOW.Text.ALIGN_BOTTOM;
        default:
            return undefined;

    }
};

/**
Code adapted from https://github.com/Jam3/layout-bmfont-text/blob/master/index.js

{
	text: string,
	font: BMFont
	mode: string, // 'pre', 'nowrap'
	measure: function,
	start: number,
	end: number,
	tabSize: number,
	align: string, // 'left', 'right', 'center', FLOW.Text.ALIGN_RIGHT, FLOW.Text.ALIGN_CENTER, FLOW.Text.ALIGN_LEFT
}
*/
FLOW.Text._layoutText = function(opt) {
	var X_HEIGHTS = ['x', 'e', 'a', 'o', 'n', 's', 'r', 'c', 'u', 'm', 'v', 'w', 'z']
	var M_WIDTHS = ['m', 'w']
	var CAP_HEIGHTS = ['H', 'I', 'N', 'E', 'F', 'K', 'L', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']

	var TAB_ID = '\t'.charCodeAt(0)
	var SPACE_ID = ' '.charCodeAt(0)


	function TextLayout(opt) {
	  this.glyphs = []
	  this._measure = this.computeMetrics.bind(this)
	  this.update(opt)
	}

	TextLayout.prototype.update = function(opt) {
	  opt = FLOW.Text.xtend({
	    measure: this._measure
	  }, opt)
	  this._opt = opt
	  this._opt.tabSize = FLOW.Text.number(this._opt.tabSize, 4)

	  if (!opt.font)
	    throw new Error('must provide a valid bitmap font')

	  var glyphs = this.glyphs
	  var text = opt.text||'' 
	  var font = opt.font
	  this._setupSpaceGlyphs(font)
	  
	  var lines = FLOW.Text.getLinesFromTextWrap(text, opt)

	  // Store a copy of the lines
	  this._lines = lines;
	  // Also create a structure to hold words
	  this._words = [];

	  //clear glyphs
	  glyphs.length = 0

	  //get max line width
	  var maxLineWidth = lines.reduce(function(prev, line) {
	    return Math.max(prev, line.width)
	  }, 0)

	  //the pen position
	  var x = 0
	  var y = 0
	  var lineHeight = FLOW.Text.number(opt.lineHeight, font.common.lineHeight)
	  var baseline = font.common.base
	  var descender = lineHeight-baseline
	  var letterSpacing = opt.letterSpacing || 0
	  var height = lineHeight * lines.length - descender
	  var align = getAlignType(this._opt.align)

	  //Let's center the text.
	  x = -maxLineWidth / 2;
	  y = height / 2;

	  //the metrics for this text layout
	  this._width = maxLineWidth
	  this._height = height
	  this._descender = lineHeight - baseline
	  this._baseline = baseline
	  this._xHeight = getXHeight(font)
	  this._capHeight = getCapHeight(font)
	  this._lineHeight = lineHeight
	  this._ascender = lineHeight - descender - this._xHeight
	    
	  //layout each glyph
	  var self = this
	  lines.forEach(function(line, lineIndex) {
	    var start = line.start
	    var end = line.end
	    var lineWidth = line.width
	    var lastGlyph
	    var word
	    
	    //for each glyph in that line...
	    for (var i=start; i<end; i++) {
	      var id = text.charCodeAt(i)
	      var glyph = self.getGlyph(font, id)
	      if (glyph) {
	        if (lastGlyph) 
	          x += getKerning(font, lastGlyph.id, glyph.id)

	        var tx = x + glyph.xoffset
	        if (align === FLOW.Text.ALIGN_CENTER)
	          tx += (maxLineWidth-lineWidth)/2
	        else if (align === FLOW.Text.ALIGN_RIGHT)
	          tx += (maxLineWidth-lineWidth)

			// Handle words
			if (glyph.width * glyph.height > 0) {
				if (!lastGlyph || (lastGlyph.width * lastGlyph.height <= 0)) {
					word = { start: i };
				}
			}
			else {
				if (word) {
					word.end = i;
					self._words.push(word);
					word = null;
				}
			}

	        glyphs.push({
	          position: [tx, y],
	          data: glyph,
	          index: i,
	          line: lineIndex,
	          word: word ? self._words.length : undefined
	        })  

	        //move pen forward
	        x += glyph.xadvance + letterSpacing
	        lastGlyph = glyph
	      }
	    }

	    // If this line is completely empty (line break), just add a space glyph
	    if (start >= end) {
	        glyphs.push({
	          position: [x, y],
	          data: self.getGlyph(font, SPACE_ID),
	          index: start,
	          line: lineIndex,
	          word: undefined
	        })  
	    }

		// If a word was being filled when the line end happened, store it.
		if (word) {
			word.end = i;
			self._words.push(word);
			word = null;
		}

	    //next line down
	    y -= lineHeight
		x = -maxLineWidth / 2;
	  })
	  this._linesTotal = lines.length;
	}

	TextLayout.prototype._setupSpaceGlyphs = function(font) {
	  //These are fallbacks, when the font doesn't include
	  //' ' or '\t' glyphs
	  this._fallbackSpaceGlyph = null
	  this._fallbackTabGlyph = null

	  if (!font.chars || font.chars.length === 0)
	    return

	  //try to get space glyph
	  //then fall back to the 'm' or 'w' glyphs
	  //then fall back to the first glyph available
	  var space = getGlyphById(font, SPACE_ID) 
	          || getMGlyph(font) 
	          || font.chars[0]

	  //and create a fallback for tab
	  var tabWidth = this._opt.tabSize * space.xadvance
	  this._fallbackSpaceGlyph = space
	  this._fallbackTabGlyph = FLOW.Text.xtend(space, {
	    x: 0, y: 0, xadvance: tabWidth, id: TAB_ID, 
	    xoffset: 0, yoffset: 0, width: 0, height: 0
	  })
	}

	TextLayout.prototype.getGlyph = function(font, id) {
	  var glyph = getGlyphById(font, id)
	  if (glyph)
	    return glyph
	  else if (id === TAB_ID) 
	    return this._fallbackTabGlyph
	  else if (id === SPACE_ID) 
	    return this._fallbackSpaceGlyph
	  return null
	}

	TextLayout.prototype.computeMetrics = function(text, start, end, width) {
	  var letterSpacing = this._opt.letterSpacing || 0
	  var font = this._opt.font
	  var curPen = 0
	  var curWidth = 0
	  var count = 0
	  var glyph
	  var lastGlyph

	  if (!font.chars || font.chars.length === 0) {
	    return {
	      start: start,
	      end: start,
	      width: 0
	    }
	  }

	  end = Math.min(text.length, end)
	  for (var i=start; i < end; i++) {
	    var id = text.charCodeAt(i)
	    var glyph = this.getGlyph(font, id)

	    if (glyph) {
	      //move pen forward
	      var xoff = glyph.xoffset
	      var kern = lastGlyph ? getKerning(font, lastGlyph.id, glyph.id) : 0
	      curPen += kern

	      var nextPen = curPen + glyph.xadvance + letterSpacing
	      var nextWidth = curPen + glyph.width

	      //we've hit our limit; we can't move onto the next glyph
	      if (nextWidth >= width || nextPen >= width)
	        break

	      //otherwise continue along our line
	      curPen = nextPen
	      curWidth = nextWidth
	      lastGlyph = glyph
	    }
	    count++
	  }
	  
	  //make sure rightmost edge lines up with rendered glyphs
	  if (lastGlyph)
	    curWidth += lastGlyph.xoffset

	  return {
	    start: start,
	    end: start + count,
	    width: curWidth
	  }
	}

	//getters for the private vars
	;['width', 'height', 
	  'descender', 'ascender',
	  'xHeight', 'baseline',
	  'capHeight',
	  'lineHeight' ].forEach(addGetter)

	function addGetter(name) {
	  Object.defineProperty(TextLayout.prototype, name, {
	    get: wrapper(name),
	    configurable: true
	  })
	}

	//create lookups for private vars
	function wrapper(name) {
	  return (new Function([
	    'return function '+name+'() {',
	    '  return this._'+name,
	    '}'
	  ].join('\n')))()
	}

	function getGlyphById(font, id) {
	  if (!font.chars || font.chars.length === 0)
	    return null

	  var glyphIdx = FLOW.Text.Font._findCharInBMFont(font.chars, id)
	  if (glyphIdx >= 0)
	    return font.chars[glyphIdx]
	  return null
	}

	function getXHeight(font) {
	  for (var i=0; i<X_HEIGHTS.length; i++) {
	    var id = X_HEIGHTS[i].charCodeAt(0)
	    var idx = FLOW.Text.Font._findCharInBMFont(font.chars, id)
	    if (idx >= 0) 
	      return font.chars[idx].height
	  }
	  return 0
	}

	function getMGlyph(font) {
	  for (var i=0; i<M_WIDTHS.length; i++) {
	    var id = M_WIDTHS[i].charCodeAt(0)
	    var idx = FLOW.Text.Font._findCharInBMFont(font.chars, id)
	    if (idx >= 0) 
	      return font.chars[idx]
	  }
	  return 0
	}

	function getCapHeight(font) {
	  for (var i=0; i<CAP_HEIGHTS.length; i++) {
	    var id = CAP_HEIGHTS[i].charCodeAt(0)
	    var idx = FLOW.Text.Font._findCharInBMFont(font.chars, id)
	    if (idx >= 0) 
	      return font.chars[idx].height
	  }
	  return 0
	}

	function getKerning(font, left, right) {
	  if (!font.kernings || font.kernings.length === 0)
	    return 0

	  var table = font.kernings
	  for (var i=0; i<table.length; i++) {
	    var kern = table[i]
	    if (kern.first === left && kern.second === right)
	      return kern.amount
	  }
	  return 0
	}

	function getAlignType(align) {
	  if (align === 'center' || align === FLOW.Text.ALIGN_CENTER )
	    return FLOW.Text.ALIGN_CENTER
	  else if (align === 'right' || align === FLOW.Text.ALIGN_RIGHT )
	    return FLOW.Text.ALIGN_RIGHT
	  return FLOW.Text.ALIGN_LEFT
	}

	return new TextLayout(opt);
};

/**
This class represents a text. A text is composed by lines, words and characters. Each type of element has its own 
class below.
Some interesting facts about the text class:
- The text is created using a bitmap font. The fontSize is maintaned as specified in the paramter for the text 
regardless of the font size used to create the bitmap font.
- The text returns a THREE mesh that represents it. By default, the text is correctly aligned and set to be in 0, 0, 0
being its center (in the middle of the text).
- It is possible to wrap a text by number of characters or by space width size.
- In order to transform a whole text, it is recommended to use the THREE Object3D transformations. It is very performant.
- Each element (including the text instance) provides absolute positioning through the getPosition/setPosition functions.
These functions are recommended to be used if the individual elements are to be manipulated. It is recommended that the THREE
Mesh instance not to be transformed or the world absolute positioning will be messed up.
- Each element provides a local 3x3 matrix that can be used to perform rotation and scaling transformations around the
center/position of each element. The hierarchical positioning of the elements is internally correctly calculated.

IDEAS:
- Research on using vertex shaders to improve performance.
- Research an option to provide direct access to modify the position attributes of each element (star/end indices) and then 
update the position of each element.

{
	text: string,
	font: FLOW.Text.Font / string
	fontSize: number,
	letterSpacing: number,
	wrapType: FLOW.Text.WrapType,
	wrapValue: number,
	align: string // 'right', 'left', 'center'
}
*/
FLOW.Text.Text = function(params) {

	function _check( value, defaultValue ) {
		if( value === undefined ) return defaultValue;
		return value;
	}
	
	if (!params || typeof(params) !== "object") throw "ERROR: No parameters specified.";
	if (typeof(params.text) !== "string" || params.text === "") throw "ERROR: Cannot create a text without a text string :).";
	if (!(params.font instanceof FLOW.Text.Font)) {
        if (typeof params.font == "string"&& FLOW.Text._fonts ){
            params.font = FLOW.Text._fonts.getFont(params.font);
        } else {
            throw "ERROR: Cannot create text without a font.";
        }
    }
	if (params.wrapType && (typeof(params.wrapValue) !== "number" || params.wrapValue <= 0)) throw "ERROR: A wrapType was specified but no wrapValue.";
	this._computeBoundsEnabled = true;
	params.fontSize = params.fontSize || 1;
	params.color = _check(params.color ,"#FFFFFF");
    params.color = params.color instanceof THREE.Color ? params.color : new THREE.Color(params.color);
	params.opacity = _check(params.opacity ,1);
	params.letterSpacing = params.letterSpacing || 1;
	this._params = params;
	this._createLines();
	this._position = new THREE.Vector3();
	this._positionCopy = new THREE.Vector3(); // The _position cannot be modified from outside. Use this to provide the position and avoid garbage collection.
	this._matrix = new THREE.Matrix3();
	return this;
};



FLOW.Text.Text.prototype.setOpacity = function( value ){
    this._params.opacity = value;
    this._material.uniforms.opacity.value = this._params.opacity;
};

FLOW.Text.Text._getSDFShader = function(opt) {
	opt = opt || {}
	var opacity = typeof opt.opacity === 'number' ? opt.opacity : 1
	var alphaTest = typeof opt.alphaTest === 'number' ? opt.alphaTest : 0.0001
	var precision = opt.precision || 'highp'
	var color = opt.color instanceof THREE.Color ? opt.color : new THREE.Color(opt.color)
	var map = opt.map

	// remove to satisfy r73
	delete opt.map
	delete opt.color
	delete opt.precision
	delete opt.opacity

	opt.uniforms = {
		opacity: { type: 'f', value: opacity },
		map: { type: 't', value: map || new THREE.Texture() },
		color: { type: 'c', value:  color }
	};
	opt.vertexShader = [
		'attribute vec2 uv;',
		'attribute vec4 position;',
		'uniform mat4 projectionMatrix;',
		'uniform mat4 modelViewMatrix;',
		'varying vec2 vUv;',
		'void main() {',
		'vUv = uv;',
		'gl_Position = projectionMatrix * modelViewMatrix * position;',
		'}'
	].join('\n');
	opt.fragmentShader = [
		'#ifdef GL_OES_standard_derivatives',
		'#extension GL_OES_standard_derivatives : enable',
		'#endif',
		'precision ' + precision + ' float;',
		'uniform float opacity;',
		'uniform vec3 color;',
		'uniform sampler2D map;',
		'varying vec2 vUv;',

		'float aastep(float value) {',
		'  #ifdef GL_OES_standard_derivatives',
		'    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;',
		'  #else',
		'    float afwidth = (1.0 / 32.0) * (1.4142135623730951 / (2.0 * gl_FragCoord.w));',
		'  #endif',
		'  return smoothstep(0.5 - afwidth, 0.5 + afwidth, value);',
		'}',

		'void main() {',
		'  vec4 texColor = texture2D(map, vUv);',
		'  float alpha = aastep(texColor.a);',
		'  gl_FragColor = vec4(color, opacity * alpha);',
		alphaTest === 0
		? ''
		: '  if (gl_FragColor.a < ' + alphaTest + ') discard;',
		'}'
	].join('\n');

	return opt;
};

FLOW.Text.Text._Material = function( parameters ) {
	var vertexShaderSource = [
		'precision highp float;',
		'',
		'attribute vec3 position;',
		'attribute vec3 color;',
		'attribute vec2 uv;',
		'',
		'uniform mat4 projectionMatrix;',
		'uniform mat4 modelViewMatrix;',
		'uniform float opacity;',
		'',
		'varying vec2 vUV;',
		'varying vec4 vColor;',
		'',
		'void main() {',
		'',
		'    vColor = vec4( color, opacity );',
		'    vUV = uv;',
		'',
		'    mat4 m = projectionMatrix * modelViewMatrix;',
		'    vec4 finalPosition = m * vec4( position, 1.0 );',
		'    gl_Position = finalPosition;',
		'',
		'}' ];

	var fragmentShaderSource = [
		'#extension GL_OES_standard_derivatives : enable',
		'precision mediump float;',
		'',
		'varying vec2 vUV;',
		'varying vec4 vColor;',
		'',
		'uniform sampler2D map;',		
		'',
		'void main() {',
		'',
		'    vec4 c = vColor;',
		'    c *= texture2D( map, vUV );',
		'    gl_FragColor = c;',
		'',   
		'}' ];

	function _check( value, defaultValue ) {
		if( value === undefined ) return defaultValue;
		return value;
	}

	THREE.Material.call( this );

	parameters = parameters || {};

	this.color = _check( parameters.color, new THREE.Color( 0xffffff ) );
	this.opacity = _check( parameters.opacity, 1 );
	this.map = _check( parameters.map, null );

	var material = new THREE.RawShaderMaterial( { 
		uniforms:{
			map: { type: 't', value: this.map },
            opacity: { type: 'f', value: this.opacity }
		},
		vertexShader: vertexShaderSource.join( '\r\n' ),
		fragmentShader: fragmentShaderSource.join( '\r\n' )
	});

	delete parameters.opacity;
	delete parameters.map;
	delete parameters.color;
	delete parameters.precision;
	delete parameters.opacity;

	material.type = 'FLOW.Text.Text._Material';

	material.setValues( parameters );

	return material;
};

FLOW.Text.Text._Material.prototype = Object.create( THREE.Material.prototype );
FLOW.Text.Text._Material.prototype.constructor = FLOW.Text.Text._Material;

FLOW.Text.Text._Material.prototype.copy = function ( source ) {

	THREE.Material.prototype.copy.call( this, source );

	this.opacity = source.opacity;

	return this;
};

FLOW.Text.Text.prototype._computeBounds = function() {
	if (!this._computeBoundsEnabled) return this;
	this._bufferGeometry.boundingBox.min.copy(this._boundingBox.getMin());
	this._bufferGeometry.boundingBox.max.copy(this._boundingBox.getMax());
	var center = this._boundingBox.getCenter();
	// Use the center of the boundingsphere to calculate the radius (avoid garbage collection)
	boundingSphere.radius = this._bufferGeometry.boundingSphere.center.copy(center).sub(this._bufferGeometry.boundingBox.min).length();
	// Reassign the center
	this._bufferGeometry.boundingSphere.center.copy(center);
	return this;
}

FLOW.Text.Text.prototype._createLines = function() {
	this._lines = [];
	this._words = [];
	this._characters = [];
	this._bufferGeometry = null;
	this._attributes = null;
	this._positions = [];
	this._colors = [];
	this._indices = [];
	this._uvs = [];
	this._x = 0;
	this._y = 0;
	this._index = 0;
	var wrapType = this._params.wrapType;
	var wrapValue = this._params.wrapValue;
	var font = this._params.font;

	// BMFonts have a different setup
	if (font._bmFont) {
		var opts = {
			text: this._params.text,
			font: font._bmFont,
			align: this._params.align,
			width: Number.MAX_VALUE
		};
		if (wrapType === FLOW.Text.WrapType.WRAP_BY_WIDTH) {
			// fontSize is the size that the text should have. 
			// BMFonts already have a size.
			// The width to use to wrap is the wrapValue scaled to meet the font size depending on the size of the BMFont.
			opts.width = wrapValue * font._bmFont.info.size / this._params.fontSize;
		}
		else if (wrapType === FLOW.Text.WrapType.WRAP_BY_NUMBER_OF_CHARACTERS) {
			// This is just an aproximation
			var totalCharWidth = 0;
			var totalNumberOfChars = 0;
			font._bmFont.chars.forEach(function(char) {
				if (char.width > 0) {
					totalCharWidth += char.width;
					totalNumberOfChars++;
				}
			});
			var averageCharWidth = totalCharWidth / totalNumberOfChars;
			opts.width = wrapValue * averageCharWidth;
		}
		// As the BMFont has a size but the user specified a fontSize, we need a scale factor.
		var scaleFactor = this._params.fontSize / font._bmFont.info.size;
		var fontTextureWidth = font._bmFont.common.scaleW;
		var fontTextureHeight = font._bmFont.common.scaleH;
  		var textLayout = FLOW.Text._layoutText(opts);
		var currentLineIndex = -1;
		var currentLine = null;
		var currentWordIndex = -1;
		var currentWord = null;
		var currentCharacter = null;
        var maxWidth = -Infinity;
		this._lines.length = textLayout._lines.length;
		this._words.length = textLayout._words.length;
		var lastGlyph = null;
		for (var i = 0; i < textLayout.glyphs.length; i++) {
			var glyph = textLayout.glyphs[i];
			// Is this a new line?
			if (currentLineIndex !== glyph.line) {
				// If there was a line already, set its end index
				if (currentLine) {
					currentLine._endIndex = this._positions.length - 1;
					currentLine._boundingBox = this._calculateInitialBoundingBox(currentLine._startIndex, currentLine._endIndex);
					currentLine._position.copy(currentLine._boundingBox.getCenter());
					// Store the line in the text
					this._lines[currentLineIndex] = currentLine;
					// When a line ends, the current word needs to be ended
					if (currentWord) {
						currentWord._endIndex = this._positions.length - 1;
						currentWord._boundingBox = this._calculateInitialBoundingBox(currentWord._startIndex, currentWord._endIndex);
						currentWord._position.copy(currentWord._boundingBox.getCenter());
						// Store the word in the text and in the line
						this._words[currentWordIndex] = currentWord;
						currentLine._words.push(currentWord); // TODO: We could improve this by calculating how many words are in the line beforehand.
						currentWord = null;
					}
					currentLine = null;
				}
				currentLineIndex = glyph.line;
				// Create a new line and set its start index
				currentLine = new FLOW.Text.Line({ 
					text: this, 
					line: this._params.text.substring(textLayout._lines[currentLineIndex].start, textLayout._lines[currentLineIndex].end)
				});
				currentLine._words = [];
				currentLine._characters = [];
				currentLine._startIndex = this._positions.length;
			}
			// Is the glyph visible, ergo, is it part of a word?
			if (typeof(glyph.word) === "number") {
				// Is a new word?
				if (currentWordIndex !== glyph.word) {
					// If there was a word already, set its end index
					if (currentWord) {
						currentWord._endIndex = this._positions.length - 1;
						currentWord._boundingBox = this._calculateInitialBoundingBox(currentWord._startIndex, currentWord._endIndex);
						currentWord._position.copy(currentWord._boundingBox.getCenter());
						// Store the word in the text and in the line
						this._words[currentWordIndex] = currentWord;
						currentLine._words.push(currentWord); // TODO: We could improve this by calculating how many words are in the line beforehand.
						currentWord = null;
					}
					currentWordIndex = glyph.word;
					// Create a new word and set its start index
					currentWord = new FLOW.Text.Word({
						line: currentLine,
						word: this._params.text.substring(textLayout._words[currentWordIndex].start, textLayout._words[currentWordIndex].end)
					});
					currentWord._characters = [];
					currentWord._startIndex = this._positions.length;
				}
				// Create a new character
				var character = new FLOW.Text.Character({
					word: currentWord,
					character: this._params.text[glyph.index]
				});
				// Store the character in the text, the line and the word
				this._characters.push(character); // TODO: We could improve this by calculating how many visible characters are in the text beforehand
				currentLine._characters.push(character); // TODO: We could improve this by calculating how many visible characters are in the line beforehand
				currentWord._characters.push(character); // TODO: We could improve this by calculating how many visible characters are in the word beforehand
				// Create the positions and UVs for the character based on the glyph
				character._startIndex = this._positions.length;

				// Positions
			    // bottom left position
			    var x = (glyph.position[0] + glyph.data.xoffset) * scaleFactor;
			    var y = (glyph.position[1] - glyph.data.yoffset) * scaleFactor;
			    // quad size
			    var w = glyph.data.width * scaleFactor;
			    var h = glyph.data.height * scaleFactor;

			    // BL
			    this._positions.push(x, y, 0);
			    // TL
			    this._positions.push(x, y - h, 0);
			    // TR
			    this._positions.push(x + w, y - h, 0);
			    // BR
			    this._positions.push(x + w, y, 0);

                maxWidth = (maxWidth < x+w) ? x+w : maxWidth;

			    // UVs
			    var bw = (glyph.data.x + glyph.data.width)
			    var bh = (glyph.data.y + glyph.data.height)
			    // top left position
			    var u0 = glyph.data.x / fontTextureWidth
			    var v1 = glyph.data.y / fontTextureHeight
			    var u1 = bw / fontTextureWidth
			    var v0 = bh / fontTextureHeight
			    if (font._texture.flipY) {
			      v1 = (fontTextureHeight - glyph.data.y) / fontTextureHeight
			      v0 = (fontTextureHeight - bh) / fontTextureHeight
			    }
			    // BL
			    this._uvs.push(u0, v1);
			    // TL
			    this._uvs.push(u0, v0);
			    // TR
			    this._uvs.push(u1, v0);
			    // BR
			    this._uvs.push(u1, v1);

			    // Colors
				this._colors.push(this._params.color.r, this._params.color.g, this._params.color.b);
				this._colors.push(this._params.color.r, this._params.color.g, this._params.color.b);
				this._colors.push(this._params.color.r, this._params.color.g, this._params.color.b);
				this._colors.push(this._params.color.r, this._params.color.g, this._params.color.b);

				// Indices
				this._indices.push(this._index, this._index + 1, this._index + 2);
				this._indices.push(this._index, this._index + 2, this._index + 3);
				this._index += 4;

			    // Set the end index of the character
				character._endIndex = this._positions.length - 1;
				character._boundingBox = this._calculateInitialBoundingBox(character._startIndex, character._endIndex);
				character._position.copy(character._boundingBox.getCenter());
			}
		}
		// Handle the closing of a line and word once there are no more glyphs
		// If there was a line already, set its end index
		if (currentLine) {
			currentLine._endIndex = this._positions.length - 1;
			currentLine._boundingBox = this._calculateInitialBoundingBox(currentLine._startIndex, currentLine._endIndex);
			currentLine._position.copy(currentLine._boundingBox.getCenter());
			// Store the line in the text
			this._lines[currentLineIndex] = currentLine;
			// When a line ends, the current word needs to be ended
			if (currentWord) {
				currentWord._endIndex = this._positions.length - 1;
				currentWord._boundingBox = this._calculateInitialBoundingBox(currentWord._startIndex, currentWord._endIndex);
				currentWord._position.copy(currentWord._boundingBox.getCenter());
				// Store the word in the text and in the line
				this._words[currentWordIndex] = currentWord;
				currentLine._words.push(currentWord); // TODO: We could improve this by calculating how many words are in the line beforehand.
				currentWord = null;
			}
			currentLine = null;
		}
		this._startIndex = 0;
		this._endIndex = this._positions.length - 1;
		this._boundingBox = this._calculateInitialBoundingBox(this._startIndex, this._endIndex, maxWidth);
	}
	// All other fonts...
	else {
		var lineStrings = FLOW.Text.splitStringIntoLines(this._params.text);
		for (var i = 0; i < lineStrings.length; i++) {
			var lineString = lineStrings[i];
			if (!wrapType || wrapType === FLOW.Text.NO_WRAP) {
				if (i === 0) {
					this._lines.length = lineStrings.length;
				}
				var line = new FLOW.Text.Line({
					text: this,
					line: lineString
				});
				this._lines[i] = line;

				// Increment the y by the fontSize for the next line.
				this._y -= this._params.fontSize;
				// Reset the x for the next line
				this._x = 0;
		}
			else {
				var words = FLOW.Text.splitStringIntoWords(lineString);
				// Some kind of wrapping was specified so the current line might not be the one.
				// Go word by word and calculate the words that fit depending on the specified constraint (width or number of characters).
				while(words.length > 0) {
					// Value represents either the accumulated with or the accumulated number of characters depending on the wrap type.
					// See the if below inside the for loop.
					var value = 0;
					var valueIncrement = 0;
					var lineText = "";
					for (var j = 0; value < wrapValue && j < words.length;) {
						var word = words[j];
						if (wrapType === FLOW.Text.WrapType.WRAP_BY_WIDTH) {
							var wordWidth = FLOW.Text.calculateStringWidth(word, this._params.font, this._params.fontSize, this._params.letterSpacing);
							valueIncrement = wordWidth;
						}
						else if (wrapType == FLOW.Text.WrapType.WRAP_BY_NUMBER_OF_CHARACTERS) {
							valueIncrement = word.length;
						}
						value += valueIncrement;
						// The j === 0 is in case not even one word fits in the constraint. In this case, the word goes into the line alone.
						if (value <= wrapValue || j === 0) {
							lineText += word;
							j++;
						}
					}
					// Create a new line with the text that fits 
					var newLine = new FLOW.Text.Line({
						text: this,
						line: lineText
					});
					this._lines.push(newLine);
					// Remove all the words used in the line we just created.
					words.splice(0, j);

					// Increment the y by the fontSize for the next line.
					this._y -= this._params.fontSize;
					// Reset the x for the next line
					this._x = 0;
				}
			}
		}
	}

	// No matter if we used a BMFont or not, all the date should have been created at this point so create the buffer geometry!
	this._bufferGeometry = new THREE.BufferGeometry();		
	this._attributes = {};

	// Create each attribute
	this._attributes.position = new THREE.BufferAttribute( new Float32Array( this._positions ), 3 );
	this._attributes.color = new THREE.BufferAttribute( new Float32Array( this._colors ), 3 );
	this._attributes.uv = new THREE.BufferAttribute( new Float32Array( this._uvs ), 2 );
	this._attributes.index = new THREE.BufferAttribute( new Uint32Array( this._indices ), 1 );

	// Add each attribute to the geometry.
	this._bufferGeometry.addAttribute( 'position', this._attributes.position );
	this._bufferGeometry.addAttribute( 'color', this._attributes.color );
	this._bufferGeometry.addAttribute( 'uv', this._attributes.uv );
	this._bufferGeometry.setIndex( this._attributes.index );

	// We no longer need some of the original arrays. The _attributes property will handle them from now on.
	//this._positions = [];
	this._uvs = [];
	this._colors = [];
	this._indices = [];

	// BMFont based texts are already centered when they are layouted so nothing to do here.
	if (!font._bmFont) {
		this._bufferGeometry.computeBoundingBox();

		// Now that we know the final dimensions of the text, we can center it.
		var center = new THREE.Vector3().copy(this._bufferGeometry.boundingBox.max).sub(this._bufferGeometry.boundingBox.min).divideScalar(2);
		for (var i = 0; i < this._positions.length; i += 3) {
			this._attributes.position.array[i] = this._positions[i] -= center.x;
			this._attributes.position.array[i + 1] = this._positions[i + 1] += center.y;
		}
		this._attributes.position.needsUpdate = true;
	}

	this._bufferGeometry.computeBoundingBox();
	this._bufferGeometry.computeBoundingSphere();

	return this;
}

FLOW.Text.Text.prototype._transform = function(transformationMatrix, startIndex, endIndex, boundingBox) {
	var position = new THREE.Vector3();
	var center = boundingBox.getCenter();
	for (var index = startIndex; index <= endIndex; index += 3) {
		position.set(this._attributes.position.array[index], this._attributes.position.array[index + 1], this._attributes.position.array[index + 2]);
		position.sub(center);
		position.applyMatrix3(transformationMatrix);
		position.add(boundingBox.center);
		this._attributes.position.array[index] = position.x;
		this._attributes.position.array[index + 1] = position.y;
		this._attributes.position.array[index + 2] = position.z;
		boundingBox.update(position);
	}
	this._attributes.position.needsUpdate = true;
	this._computeBounds(boundingBox);
	return this;
};



FLOW.Text.Text.prototype._calculateInitialBoundingBox = function(startIndex, endIndex, maxCalculatedX) {
    // As the text is first created around 0,0,0 and in order, the edge vertices provide the bounding box information
    // At the moment where this function is called, the this._positions array is enabled.
    var minX = this._positions[startIndex]; // The initial vertex x
    var maxY = this._positions[startIndex + 1]; // The initial vertex y
    var maxX =maxCalculatedX >  this._positions[endIndex -5]? maxCalculatedX :  this._positions[endIndex - 5]; // The previous to the last vertex x
    var minY = this._positions[endIndex - 4]; // The previous to the last vertex y
    var boundingBox = new FLOW.MathUtils.BoundingBox();
    boundingBox.update([minX, minY, 0, maxX, maxY, 0]);
    return boundingBox;
};


FLOW.Text.Text.prototype.buildMesh = function() {
	if (!this._mesh) {
		var font = this._params.font;
		if (font._bmFont && font._params.sdf) {
			this._material = new THREE.RawShaderMaterial(FLOW.Text.Text._getSDFShader({
				map: font._texture,
				side: THREE.DoubleSide,
				transparent: true,
				color: this._params.color,
				opacity: this._params.opacity
				// color: 'rgb(230, 230, 230)'
			}));
		}
		else {
			this._material = new FLOW.Text.Text._Material( { 
				opacity: this._params.opacity,
				depthTest: (this._params.opacity<1) ,
				// blending: this._texture ? THREE.AdditiveBlending : THREE.NormalBlending,
				transparent: true,
				side: THREE.DoubleSide,
				map: font._texture,
				color: this._params.color,
			});
		}

		this._mesh = new THREE.Mesh( this._bufferGeometry, this._material );
	}
	return this._mesh;
};

FLOW.Text.Text.prototype.getMesh = function() {
	return this._mesh;
};

/**
 * A Text can be placed in a parent Object3D to provide different registratoin and padding
 * ie, align to left-most bounding point with a 0.1 padding.
 */
FLOW.Text.Text.prototype.getLayoutObject = function(){
    if (!this.layoutObj){
        this.layoutObj = new THREE.Object3D();
        var mesh = this.buildMesh();
        mesh.frustumCulled = false;
        this.layoutObj.add(mesh);
    }
    return this.layoutObj;
};

/**
 *
 * @param params
 * params.paddingLeft
 params.paddingRight
 params.paddingTop
 params.paddingBottom
 params.vRegisterTo =FLOW.Text.ALIGN_LEFT | FLOW.Text.ALIGN_CENTER | FLOW.Text.ALIGN_RIGHT
 params.hRegisterTo = FLOW.Text.ALIGN_TOP | FLOW.Text.ALIGN_MIDDLE | FLOW.Text.ALIGN_BOTTOM
 */
FLOW.Text.Text.prototype.setLayoutParams = function(params) {
    params = params || {};
    params.paddingLeft = params.paddingLeft || 0;
    params.paddingRight =params.paddingRight ||0;
    params.paddingTop = params.paddingTop || 0;
    params.paddingBottom = params.paddingBottom || 0;
    params.vRegisterTo = typeof params.vRegisterTo !="undefined"  ? params.vRegisterTo : FLOW.Text.ALIGN_CENTER;
    params.hRegisterTo = typeof params.hRegisterTo !="undefined" ? params.hRegisterTo : FLOW.Text.ALIGN_MIDDLE;

	 if (! this.layoutObj) {
        this.getLayoutObject();
    }
   var bBox = this.getBoundingBox();
    var offsetH = params.hRegisterTo == FLOW.Text.ALIGN_LEFT ? -bBox._min.x + params.paddingLeft:
        params.hRegisterTo == FLOW.Text.ALIGN_RIGHT ? -bBox._max.x - params.paddingRight : 0;
    var offsetV = params.vRegisterTo == FLOW.Text.ALIGN_TOP ? -bBox._min.y - params.paddingTop:
        params.vRegisterTo == FLOW.Text.ALIGN_BOTTOM ? -bBox._max.y + params.paddingBottom : 0;
    this.setPosition( [offsetH, offsetV, 0] );
};

FLOW.Text.Text.prototype.getNumberOfLines = function() {
	return this._lines.length;
};

FLOW.Text.Text.prototype.getLine = function(i) {
	if (typeof(i) !== "number" || i < 0 || i >= this._lines.length) throw "ERROR: The given index is not correct. Provide a value between 0 and " + this._lines.length + ",";
	return this._lines[i];
};

FLOW.Text.Text.prototype.getNumberOfWords = function() {
	return this._words.length;
};

FLOW.Text.Text.prototype.getWord = function(i) {
	if (typeof(i) !== "number" || i < 0 || i >= this._words.length) throw "ERROR: The given index is not correct. Provide a value between 0 and " + this._words.length + ",";
	return this._words[i];
};

FLOW.Text.Text.prototype.getNumberOfCharacters = function() {
	return this._characters.length;
};

FLOW.Text.Text.prototype.getCharacter = function(i) {
	if (typeof(i) !== "number" || i < 0 || i >= this._characters.length)
		throw "ERROR: The given index is not correct. Provide a value between 0 and " + this._characters.length + ",";
	return this._characters[i];
};

FLOW.Text.Text.prototype.getString = function() {
	return this._params.text;
};

FLOW.Text.Text._DEFAULT_PIVOT = new THREE.Vector3(0, 0, 0);

FLOW.Text.Text.prototype.enableComputeBounds = function() {
	this._computeBoundsEnabled = true;
	return this;
};

FLOW.Text.Text.prototype.disableComputeBounds = function() {
	this._computeBoundsEnabled = false;
	return this;
};

FLOW.Text.Text.prototype.getPosition = function() {
    this._positionCopy.copy(this._position);
    return this._positionCopy;
};

FLOW.Text.Text.prototype.getBoundingBox = function() {
   // this._boundingBox = this._calculateInitialBoundingBox(this._startIndex, this._endIndex);
    return this._boundingBox.copy(this._boundingBox);
};

FLOW.Text.Text.prototype.setPosition = function(position, offset) {
	offset = offset || 0;
	// Use this._position to avoid new object creation / garbage collection
	this._position.negate();
	if (position instanceof THREE.Vector3) {
		this._position.add(position);
	}
	else {
		this._position.x += position[offset];
		this._position.y += position[offset + 1];
		this._position.z += position[offset + 2];
	}
	for (var i = 0; i < this._lines.length; i++) {
		var line = this._lines[i];
		line._addPosition(this._position);
	}
	// TODO
	// this._boundingBox.addPosition(this._position);
	if (position instanceof THREE.Vector3) {
		this._position.copy(position);
	}
	else {
		this._position.set(position[offset], position[offset + 1], position[offset + 2]);
	}
	return this;
};

FLOW.Text.Text.prototype.getMatrix = function() {
	return this._matrix;
};

FLOW.Text.Text.prototype.setMatrix = function(matrix) {
	if (!(matrix instanceof THREE.Matrix3)) throw "ERROR: The given matrix needs to be an instance of THREE.Matrix3.";
	if (this._matrix !== matrix) {
		this._matrix.copy(matrix);
	}
	for (var i = 0; i < this._lines.length; i++) {
		var line = this._lines[i];
		line._applyMatrix(matrix, this._position);
	}
	// TODO: Update the bounding boxes
	return this;
};


/**
{
	text: FLOW.Text.Text,
	line: string,
}
*/
FLOW.Text.Line = function(params) {
	if (!params || typeof(params) !== "object") throw "ERROR: No parameters specified.";
	if (typeof(params.line) !== "string") throw "ERROR: Cannot create a line without a line string :).";
	if (!(params.text instanceof FLOW.Text.Text)) throw "ERROR: A line needs to be part of a text.";
	this._params = params;
	if (!params.text._params.font._bmFont) {
		this._startIndex = params.text._positions.length;
		this._createWords();
		this._endIndex = params.text._positions.length - 1;
	}
	this._position = new THREE.Vector3();
	this._positionCopy = new THREE.Vector3(); // The _position cannot be modified from outside. Use this to provide the position and avoid garbage collection.
	this._matrix = new THREE.Matrix3();
	return this;
}

FLOW.Text.Line.prototype._createWords = function() {
	this._characters = [];
	var wordStrings = FLOW.Text.splitStringIntoWords(this._params.line);
	// To optimize, as we know the size of the array, create an array of the size and increment other array sizes.
	this._words = new Array(wordStrings.length);
	var numberOfWordsInText = this._params.text._words.length;
	this._params.text._words.length += wordStrings.length;
	for (var i = 0; i < wordStrings.length; i++) {
		var wordString = wordStrings[i];
		var word = new FLOW.Text.Word({
			line: this,
			word: wordString
		});
		this._words[i] = word;
		this._params.text._words[numberOfWordsInText + i] = word;
	}
	return this;
};

FLOW.Text.Line.prototype._addPosition = function(position) {
	for (var i = 0; i < this._words.length; i++) {
		var word = this._words[i];
		word._addPosition(position);
	}
	// TODO
	// this._boundingBox.addPosition(position);
	this._position.add(position);
	return this;
};

FLOW.Text.Line.prototype._applyMatrix = function(matrix, center) {
	for (var i = 0; i < this._words.length; i++) {
		var word = this._words[i];
		word._applyMatrix(matrix, center);
	}
	// TODO: Update the bounding boxes
	this._position.sub(center);
	this._position.applyMatrix3(matrix);
	this._position.add(center);
	return this;
};

FLOW.Text.Line.prototype.getNumberOfWords = function() {
	return this._words.length;
};

FLOW.Text.Line.prototype.getWord = function(i) {
	if (typeof(i) !== "number" || i < 0 || i >= this._words.length) throw "ERROR: The given index is not correct. Provide a value between 0 and " + this._words.length + ",";
	return this._words[i];
};

FLOW.Text.Line.prototype.getNumberOfCharacters = function() {
	return this._characters.length;
};

FLOW.Text.Line.prototype.getCharacter = function(i) {
	if (typeof(i) !== "number" || i < 0 || i >= this._characters.length) throw "ERROR: The given index is not correct. Provide a value between 0 and " + this._characters.length + ",";
	return this._characters[i];
};

FLOW.Text.Line.prototype.getString = function() {
	return this._params.line;
};

FLOW.Text.Line.prototype.getPosition = function() {
	this._positionCopy.copy(this._position);
	return this._positionCopy;
};

FLOW.Text.Line.prototype.setPosition = function(position, offset) {
	offset = offset || 0;
	// Use this._position as the position increment to avoid new object creation === garbage collection
	this._position.negate();
	if (position instanceof THREE.Vector3) {
		this._position.add(position);
	}
	else {
		this._position.x += position[offset];
		this._position.y += position[offset + 1];
		this._position.z += position[offset + 2];
	}
	for (var i = 0; i < this._words.length; i++) {
		var word = this._words[i];
		word._addPosition(this._position);
	}
	// TODO
	// this._boundingBox.addPosition(this._position);
	// Update parent bounding box
	// this._params.text._boundingBox.update(this._boundingBox);
	// Set this_position to position
	if (position instanceof THREE.Vector3) {
		this._position.copy(position);
	}
	else {
		this._position.set(position[offset], position[offset + 1], position[offset + 2]);
	}
	return this;
};

FLOW.Text.Line.prototype.getMatrix = function() {
	return this._matrix;
};

FLOW.Text.Line.prototype.setMatrix = function(matrix) {
	if (!(matrix instanceof THREE.Matrix3)) throw "ERROR: The given matrix needs to be an instance of THREE.Matrix3.";
	if (this._matrix !== matrix) {
		this._matrix.copy(matrix);
	}
	for (var i = 0; i < this._words.length; i++) {
		var word = this._words[i];
		word._applyMatrix(matrix, this._position);
	}
	// TODO: Update the bounding boxes
	return this;
};


/**
{
	line: FLOW.Text.Line
	word: string
}
*/
FLOW.Text.Word = function(params) {
	if (!params || typeof(params) !== "object") throw "ERROR: No parameters specified.";
	if (typeof(params.word) !== "string") throw "ERROR: Cannot create a word without a word string :).";
	if (!(params.line instanceof FLOW.Text.Line)) throw "ERROR: A word needs to be part of a line.";
	this._params = params;
	var text = params.line._params.text;
	if (!text._params.font._bmFont) {
		this._startIndex = text._positions.length;
		this._createCharacters();
		this._endIndex = text._positions.length - 1;
	}
	this._position = new THREE.Vector3();
	this._positionCopy = new THREE.Vector3(); // The _position cannot be modified from outside. Use this to provide the position and avoid garbage collection.
	this._matrix = new THREE.Matrix3();
	return this;
};

FLOW.Text.Word.prototype._createCharacters = function() {
	var numberOfCharacters = this._params.word.length;
	// To optimize, as we know the size of the array, create an array of the size and increment other array sizes.
	this._characters = new Array(numberOfCharacters);
	var numberOfCharactersInLine = this._params.line._characters.length;
	this._params.line._characters.length = numberOfCharactersInLine + numberOfCharacters;
	var numberOfCharactersInText = this._params.line._params.text._characters.length;
	this._params.line._params.text._characters.length = numberOfCharactersInText + numberOfCharacters;
	for (var i = 0; i < numberOfCharacters; i++) {
		var characterString = this._params.word[i];
		var character = new FLOW.Text.Character({
			word: this,
			character: characterString
		});
		this._characters[i] = character;
		this._params.line._characters[numberOfCharactersInLine + i] = character;
		this._params.line._params.text._characters[numberOfCharactersInText + i] = character;
	}
	return this;
};

FLOW.Text.Word.prototype._addPosition = function(position) {
	for (var i = 0; i < this._characters.length; i++) {
		var character = this._characters[i];
		character._addPosition(position);
	}
	// TODO
	// this._boundingBox.addPosition(position);
	this._position.add(position);
	return this;
};

FLOW.Text.Word.prototype._applyMatrix = function(matrix, center) {
	for (var i = 0; i < this._characters.length; i++) {
		var character = this._characters[i];
		character._applyMatrix(matrix, center);
	}
	// TODO: Update the bounding boxes
	this._position.sub(center);
	this._position.applyMatrix3(matrix);
	this._position.add(center);
	return this;
};

FLOW.Text.Word.prototype.getNumberOfCharacters = function() {
	return this._characters.length;
};

FLOW.Text.Word.prototype.getCharacter = function(i) {
	if (typeof(i) !== "number" || i < 0 || i >= this._characters.length) throw "ERROR: The given index is not correct. Provide a value between 0 and " + this._characters.length + ",";
	return this._characters[i];
};

FLOW.Text.Word.prototype.getString = function() {
	return this._params.word;
};

FLOW.Text.Word.prototype.getPosition = function() {
	this._positionCopy.copy(this._position);
	return this._positionCopy;
};

FLOW.Text.Word.prototype.setPosition = function(position, offset) {
	offset = offset || 0;
	// Use this._position as the position increment to avoid new object creation === garbage collection
	this._position.negate();
	if (position instanceof THREE.Vector3) {
		this._position.add(position);
	}
	else {
		this._position.x += position[offset];
		this._position.y += position[offset + 1];
		this._position.z += position[offset + 2];
	}
	for (var i = 0; i < this._characters.length; i++) {
		var character = this._characters[i];
		character._addPosition(this._position);
	}
	// TODO
	// this._boundingBox.addPosition(this._position);
	// Update parent bounding box
	// this._params.line._boundingBox.update(this._boundingBox);
	// this._params.line._params.text._boundingBox.update(this._boundingBox);
	// Set this._position to position
	if (position instanceof THREE.Vector3) {
		this._position.copy(position);
	}
	else {
		this._position.set(position[offset], position[offset + 1], position[offset + 2]);
	}
	return this;
};

FLOW.Text.Word.prototype.getMatrix = function() {
	return this._matrix;
};

FLOW.Text.Word.prototype.setMatrix = function(matrix) {
	if (!(matrix instanceof THREE.Matrix3)) throw "ERROR: The given matrix needs to be an instance of THREE.Matrix3.";
	if (this._matrix !== matrix) {
		this._matrix.copy(matrix);
	}
	for (var i = 0; i < this._characters.length; i++) {
		var character = this._characters[i];
		character._applyMatrix(matrix, this._position);
	}
	// TODO: Update the bounding boxes
	return this;
};

/**
{
	word: FLOW.Text.Word,
	character: string
}
*/
FLOW.Text.Character = function(params) {
	if (!params || typeof(params) !== "object") throw "ERROR: No parameters specified.";
	if (typeof(params.character) !== "string") throw "ERROR: Cannot create a character without a character string :).";
	if (!(params.word instanceof FLOW.Text.Word)) throw "ERROR: A character needs to be part of a word.";
	var text = params.word._params.line._params.text;
	this._params = params;
	if (!text._params.font._bmFont) {
		this._startIndex = text._positions.length;
		this._createMesh();
		this._endIndex = text._positions.length - 1;
	}
	this._position = new THREE.Vector3();
	this._positionCopy = new THREE.Vector3(); // The _position cannot be modified from outside. Use this to provide the position and avoid garbage collection.
	this._matrix = new THREE.Matrix3();
	return this;
};

FLOW.Text.Character.prototype._createMesh = function() {
	var character = this._params.character;
	var text = this._params.word._params.line._params.text;
	var font = text._params.font;
	var fontSize = text._params.fontSize;
	var letterSpacing = text._params.letterSpacing;
	var charWidth = FLOW.Text.calculateStringWidth(character, font, fontSize, letterSpacing);
    var charCode = this._params.character.charCodeAt(0);

    var leftOffset = 0;
    var drawLeft = 0;
    var moveLeft = 0;
    var widthOffset = 0;
    if (font._charWidths && font._charWidths.hasOwnProperty(charCode)) {
        var charKerning = font._charWidths[charCode];
        leftOffset = charKerning.leftOffset ? charKerning.leftOffset : 0;
        moveLeft = charKerning.moveLeft ? charKerning.moveLeft  : 0;
        drawLeft = charKerning.drawLeft ? charKerning.drawLeft  : 0;
        widthOffset = charKerning.widthOffset ? charKerning.widthOffset : 0;
    }

    var u = (charCode % FLOW.Text.Font.TEXTURE_LETTERS_PER_SIDE) / FLOW.Text.Font.TEXTURE_LETTERS_PER_SIDE;
    var v = Math.floor(charCode / FLOW.Text.Font.TEXTURE_LETTERS_PER_SIDE) / FLOW.Text.Font.TEXTURE_LETTERS_PER_SIDE;

    u += leftOffset ? -leftOffset / font._textureMapWidth : 0;
    v += drawLeft ? -drawLeft / font._textureMapWidth : 0;

    var offU = 0.95 / FLOW.Text.Font.TEXTURE_LETTERS_PER_SIDE * FLOW.Text.Font.TRIM_EXTRA_WHITE_SPACE_IN_TEXTURE;
    offU += widthOffset ? widthOffset / font._textureMapWidth : 0;
    var offV = 0.95 / FLOW.Text.Font.TEXTURE_LETTERS_PER_SIDE;

	text._positions.push(text._x, text._y, 0);
	text._positions.push(text._x + charWidth, text._y, 0);
	text._positions.push(text._x + charWidth, text._y - fontSize, 0);
	text._positions.push(text._x, text._y - fontSize, 0);
	text._colors.push(1, 1, 1);
	text._colors.push(1, 1, 1);
	text._colors.push(1, 1, 1);
	text._colors.push(1, 1, 1);
	text._uvs.push(u, v);
	text._uvs.push(u + offU, v);
	text._uvs.push(u + offU, v + offV);
	text._uvs.push(u, v + offV);
	// text._uvs.push(0, 1);
	// text._uvs.push(1, 1);
	// text._uvs.push(1, 0);
	// text._uvs.push(0, 0);
	text._indices.push(text._index, text._index + 1, text._index + 2);
	text._indices.push(text._index, text._index + 2, text._index + 3);
	text._x += charWidth;
	text._index += 4;
};

FLOW.Text.Character.prototype._addPosition = function(position) {
	var text = this._params.word._params.line._params.text;
	for (var i = this._startIndex; i <= this._endIndex; i += 3) {
		text._attributes.position.array[i    ] += position.x; 
		text._attributes.position.array[i + 1] += position.y; 
		text._attributes.position.array[i + 2] += position.z; 
	}
	// TODO
	// this._boundingBox.addPosition(position);
	this._position.add(position);
	text._attributes.position.needsUpdate = true;
	return this;
};

FLOW.Text.Character.prototype._applyMatrix = function(matrix, center) {
	var text = this._params.word._params.line._params.text;
	for (var i = this._startIndex; i <= this._endIndex; i += 3) {
		text._attributes.position.array[i    ] -= center.x; 
		text._attributes.position.array[i + 1] -= center.y; 
		text._attributes.position.array[i + 2] -= center.z; 
		matrix.applyToVector3Array(text._attributes.position.array, i, 3);
		text._attributes.position.array[i    ] += center.x; 
		text._attributes.position.array[i + 1] += center.y; 
		text._attributes.position.array[i + 2] += center.z; 
	}
	// TODO: Update the bounding boxes
	this._position.sub(center);
	this._position.applyMatrix3(matrix);
	this._position.add(center);
	text._attributes.position.needsUpdate = true;
	return this;
};

FLOW.Text.Character.prototype.getString = function() {
	return this._params.character;
};

FLOW.Text.Character.prototype.getPosition = function() {
	this._positionCopy.copy(this._position);
	return this._positionCopy;
};

FLOW.Text.Character.prototype.setPosition = function(position, offset) {
	var text = this._params.word._params.line._params.text;
	offset = offset || 0;
	// Use this._position as the position increment to avoid new object creation === garbage collection
	this._position.negate();
	if (position instanceof THREE.Vector3) {
		this._position.add(position);
	}
	else {
		this._position.x += position[offset];
		this._position.y += position[offset + 1];
		this._position.z += position[offset + 2];
	}
	for (var i = this._startIndex; i <= this._endIndex; i += 3) {
		text._attributes.position.array[i    ] += this._position.x; 
		text._attributes.position.array[i + 1] += this._position.y; 
		text._attributes.position.array[i + 2] += this._position.z; 
	}
	text._attributes.position.needsUpdate = true;
	// TODO
	// this._boundingBox.addPosition(this._position);
	// Update parent bounding box
	// this._params.word._boundingBox.update(this._boundingBox);
	// this._params.word._params.line._boundingBox.update(this._boundingBox);
	// text._boundingBox.update(this._boundingBox);
	// Set this._position to position
	if (position instanceof THREE.Vector3) {
		this._position.copy(position);
	}
	else {
		this._position.set(position[offset], position[offset + 1], position[offset + 2]);
	}
	return this;
};

FLOW.Text.Character.prototype.getMatrix = function() {
	return this._matrix;
};

FLOW.Text.Character.prototype.setMatrix = function(matrix) {
	if (!(matrix instanceof THREE.Matrix3)) throw "ERROR: The given matrix needs to be an instance of THREE.Matrix3.";
	if (this._matrix !== matrix) {
		this._matrix.copy(matrix);
	}
	var text = this._params.word._params.line._params.text;
	for (var i = this._startIndex; i <= this._endIndex; i += 3) {
		text._attributes.position.array[i    ] -= this._position.x; 
		text._attributes.position.array[i + 1] -= this._position.y; 
		text._attributes.position.array[i + 2] -= this._position.z; 
		this._matrix.applyToVector3Array(text._attributes.position.array, i, 3);
		text._attributes.position.array[i    ] += this._position.x; 
		text._attributes.position.array[i + 1] += this._position.y; 
		text._attributes.position.array[i + 2] += this._position.z; 
	}
	text._attributes.position.needsUpdate = true;
	// TODO: Update the bounding boxes
	return this;
};



(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Text;
}));