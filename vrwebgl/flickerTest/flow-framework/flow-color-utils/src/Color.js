var THREE = THREE || require('three');


var FLOW = FLOW || {};
FLOW.MathUtils = FLOW.MathUtils || require('flow-math-utils');
//TODO: how to reference the MathUtils module from within this module without a require error?
/*
var randomBetween = function(min,max)   {
    return Math.floor(Math.random()*(max-min+1)+min);
}
*//**
 * We want o always keep any nodes from being exactly on the same point in space.
 * Add this to most likely the z for any point
 * @returns {number}
 *//*
var uniqueness = function() {
    return Math.random()  *0.0001;
}*/

FLOW.Color = {};

FLOW.Color.findColor = function(color) {

    color = !color ? "#ffffff" : color;
    if (color =="transparent") {
        return "rgb(0, 0, 0)";
    }
    if (typeof color == "number") { //returns for 0x values
        return color;
    }
    if (typeof color == "string" && color.charAt( 0) =="#") { //returns for #ffffff values
        return color;
    }


    switch (color) {
        case  'green-bluish' :
            return "#" + "00" + FLOW.Color._cHex(100,200) + FLOW.Color._cHex(100,200);
        case  'greenish' :
            return "#" + "00" + FLOW.Color._cHex(200,255) + FLOW.Color._cHex(100,150);
        case  'cyanish' :
            return "#" + "17" + FLOW.Color._cHex(215,230) + FLOW.Color._cHex(240,255);
        case  'bluish' :
            return "#" + "00" + FLOW.Color._cHex(100,120) + FLOW.Color._cHex(180,255);
        case "purplish":
            return "#" + FLOW.Color._cHex(100,200) + "cc" + "ff";
        default: //uses the dom to convert "red" to a usable color
            var d = document.createElement("div");
            d.style.color = color;
            document.body.appendChild(d)

            var computedColor = window.getComputedStyle(d).color;
            return computedColor;
    }

}

FLOW.Color.convertHexColorToRGB = function (hex){
    hex = hex.replace('#','');
    var r = parseInt(hex.substring(0,2), 16);
    var g = parseInt(hex.substring(2,4), 16);
    var b = parseInt(hex.substring(4,6), 16);

    return {r:r, g:g, b:b};
    /* result = 'rgba('+r+','+g+','+b+','+opacity/100+')';
     return result;*/
}

FLOW.Color._cDecimal = function(start, end) {
    return FLOW.MathUtils.randomBetween(start,end);
}

FLOW.Color._cHex = function(start, end) {
    return FLOW.MathUtils.randomBetween(start,end).toString(16);
}

FLOW.Color.colorToRgb = function (color, alpha) {
    if (color =="transparent") {
        return "rgba(0, 0, 0, " + alpha +")";
    }

    var computedColor = FLOW.Color.findColor(color);
    var index = computedColor.lastIndexOf(")");
    var string= computedColor.substr(0, index) +", "+ alpha + ")";
    string = string.replace(/rgb/, "rgba");
    return string;
}




FLOW.Color.COLOR_SCHEMES = {
    "default" : [  "#F30375", "#93B400", "#F2B700", "#B644AA", "#F24402",
        "#A58111", "#18F4C1", "#365B32", "#3D8BF4", "#615C8E",
        "#F5BD7B", "#9B978B", "#C1A36A", "#8CDA83", "#B213BF" ] ,
    "bright" : [  "#F30375", "#93B400", "#F2B700", "#B644AA", "#F24402",
        "#e4b31b", "#18F4C1", "#7ed574", "#3D8BF4", "#a49cf1",
        "#F5BD7B", "#edb85c", "#e2ab43", "#8CDA83", "#B213BF" ] ,
    "sandy stone beach" : [ "#E6E2AF",  "#A7A37E",  "#EFECCA",  "#046380",  "#002F2F" ], // from Kuler
    "firenze" : [ "#468966",  "#FFF0A5",  "#FFB03B",  "#B64926",  "#8E2800" ], // from Kuler
    "vitamin c" : [ "#004358",  "#1F8A70",  "#BEDB39",  "#FFE11A",  "#FD7400" ], // from Kuler
    "summer twilight" : [ "#3B596A",  "#427676",  "#3F9A82",  "#A1CD73",  "#ECDB60" ], // from Kuler
    "qb studio" : [ "#FFBC67",  "#DA727E",  "#AC6C82",  "#685C79",  "#685C79" ], // from Kuler
    "avant" : [ "#0E3D59",  "#88A61B",  "#F29F05",  "#F25C05",  "#D92525" ] , // from Kuler
    "aquaTetrad": ["#009999","#640CAB", "#FFF500" ,"#FF7400"] ,//Paletton, base color #009999, Tetrad
    "aquaTetradShades": ["#009999","#640CAB", "#FFF500" ,"#FF7400",
        "#46B2B2","#8F53C0", "#FFF963" ,"#FFAA63",
        "#249F9F","#7731B0", "#FFF839" ,"#FF9339",
        "#007676","#4D0884", "#C5BD00" ,"#C55900",
        "#005D5D","#3C0568", "#9B9500" ,"#9B4600"   ], //Paletton, base color #009999, Tetrad
    "12color": [ "#FF0000", "#FF7400", "#CD0074" , "#FFD300" , "#FFFF00" , "#FFAA00" ,
        "#00CC00" , "#009999" , "#9FEE00" , "#2A00AF" , "#6E00AA" , "#0034AB" ],
    "su_logo": [ "#2A64AF", "#EB6529", "#E2188C"  ],
    "su_impact": [ "#7099D0", "#F8B67D", "#B86B79" , "#9F9433" , "#F0E048" , "#FFF9F0" ],
    "su_bluescale": [ "#E2E4E1", "#AFBCC7", "#7994AD" , "#7099D0" , "#0A1B2F"  ],
    "grayscale": [ "#313131" ,"#555555"],
    "su_grayscale": [ "#313131" ,"#A1A5A7","#D7D7D6",   "#FFD300"],
    "su_all": [ "#2A64AF", "#EB6529", "#E2188C"  , "#7099D0", "#F8B67D", "#B86B79" , "#9F9433" ,
        "#F0E048" , "#FFF9F0" , "#E2E4E1", "#AFBCC7", "#7994AD" , "#7099D0" , "#0A1B2F"  ,
        "#D7D7D6", "#A1A5A7", "#313131" , "#FFD300"],
    // movie color schemes: http://dillonbaker.com/#/spectrum/
    "blade_runner": [ "#353223", "#867b67", "#978875", "#484c46"  , "#1c4340", "#F8B67D", "#342417" , "#88bbb0" ,
        "#4d9d92" , "#83c7c6" , "#2e575b", "#1d3b49", "#bddad9" , "#42bbbd" , "#8fdddf"  ,
        "#5c7467","#1c4340", "#978875", "#a18653" , "#412d14" , "#739d9f" , "#472f28" , "#2a361b"  , "#459ca0", "#5d704d"  ],
    "royal_tenenbaums": [ "#ffffef", "#5e220c", "#705f40", "#6f1f0f"  , "#894f36", "#b68b60", "#d8ae78" , "#916a4d" ,
        "#485542" , "#82381f" , "#b08e72", "#996553", "#a64d28" , "#42bbbd" , "#a19e83"  ,
        "#28667e","#a37947" ],
    "aladin": [ "#a30415", "#5e1105", "#1831ad"  ,"#c76291","#b5425b", "#231d63", "#1e0aa1", "#8e5995" , "#b72c3d" ,
        "#d27457" , "#8c1e32" , "#071b6b", "#e1a160", "#b8056a" , "#bb5e2d" , "#364623"  ,
        "#415b7a", "#df7c22","#6f2587","#cd2711" ],
    "finding_nemo": [ "#282e5e", "#326888", "#c880d8", "#7a4b92"  ,"#161741","#b15f5e", "#7e6378", "#509ba8", "#6a726f" , "#2c4a5d" ,
        "#58363f" , "#2980b3" , "#b58eea", "#4d64c7" , "#5c9731" , "#30544e"  ,
        "#965254", "#527777","#95514a" ]



};

/**
 * Creates a ColorWheel which is used to manage a color scheme by name and always deliver a
 *   well-known nextColor
 *
 * @param name
 * @returns {FLOW.Color.ColorWheel}
 * @constructor
 */
FLOW.Color.ColorWheel = function(name){
    this._name = name || "default";
    this.setScheme(this._name);
    this._colorWheelIndex =0;
    return this;
}


FLOW.Color.ColorWheel.prototype.setScheme = function(schemeName) {
    if ( ! FLOW.Color.COLOR_SCHEMES.hasOwnProperty( schemeName) ) {
        console.error("FLOW.Color.ColorWheel: No matching color scheme found: " + schemeName);
        schemeName = "default";
    }
    this._scheme = FLOW.Color.COLOR_SCHEMES[schemeName];
}


FLOW.Color.defaultColorWheel = new FLOW.Color.ColorWheel();


/**
 *
 * @param schemeName
 * @param scheme Array of colors
 */
FLOW.Color.setColorScheme = function( schemeName, scheme ){
    FLOW.Color.COLOR_SCHEMES[ schemeName ] = scheme;
}

FLOW.Color.resetNextColor = function(colorWheel) {
    colorWheel = colorWheel || FLOW.Color.defaultColorWheel ;
    colorWheel._colorWheelIndex =0;
}

FLOW.Color.nextColor = function( colorWheel ) {
    colorWheel = colorWheel || FLOW.Color.defaultColorWheel ;
    if (colorWheel._colorWheelIndex == colorWheel._scheme.length) {
        colorWheel._colorWheelIndex =0;
    }
    return (colorWheel._scheme[colorWheel._colorWheelIndex++]);
};


FLOW.Color.nextColorVaried = function( colorWheel, delta ) {
    delta = delta || 25;
    var color = colorWheel.nextColor();
    return FLOW.Color.randomizeColor(color, delta);
};


FLOW.Color.randomizeColor = function(color, delta) {
    delta = delta || 0.02;
    return new THREE.Color ( color).offsetHSL( FLOW.MathUtils.randomBetween( -1, 1 ) * delta, 0, 0 );
};

FLOW.Color.randomizeChannel = function(channel, delta) {
    var val = Math.max(Math.min( channel + FLOW.Color._cDecimal(- delta/2, delta/2), 255),0 ).toString(16);
    val =  (val.length<2) ? "0"+ val: val;
    return val;
};

FLOW.Color.randomColor = function(){
    return "#" +  FLOW.Color._cHex(100,255) + FLOW.Color._cHex(100,255) + FLOW.Color._cHex(100,255);
};



(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Color;
}));