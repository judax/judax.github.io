/*
 Based off of https://github.com/sghall/subunit

 http://www.delimited.io/blog/2015/1/21/selections-in-threejs

 */
var THREE = THREE || require('three');
var d3 = d3 || require("d3");
var topojson = topojson || require("topojson");

var FLOW = FLOW || {};

FLOW.MathUtils = FLOW.MathUtils || require("flow-math-utils");
FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.Lines = FLOW.Lines || require('flow-lines');
FLOW.Text = FLOW.Text || require('flow-text');
FLOW.Color = FLOW.Color || require('flow-color-utils');


var d3_time = d3.time;
var d3_time_interval = d3.time_interval;

d3_time.century = d3_time_interval(
function(date) {
    date = d3_time.day(date);
    date.setMonth(0, 1);
    var offset = date.getFullYear()%100;
    if(date.getFullYear() < 0) {
        offset = 100 + offset;
    }
    date.setFullYear(date.getFullYear() - offset);
    return date;
},
function(date, offset) {
    date.setFullYear(date.getFullYear() + 100*offset);
},
function(date) {
    return date.getFullYear() - date.getFullYear()%100;
}
);
d3_time.centuries = d3_time.century.range;

d3_time.millennium = d3_time_interval(
function(date) {
    date = d3_time.day(date);
    date.setMonth(0, 1);
    var offset = date.getFullYear()%1000;
    if(date.getFullYear() < 0) {
        offset = 1000 + offset;
    }
    date.setFullYear(date.getFullYear() - offset);
    return date;
},
function(date, offset) {
    date.setFullYear(date.getFullYear() + 1000*offset);
},
function(date) {
    return date.getFullYear() - date.getFullYear()%1000;
}
);
d3_time.millennia = d3_time.millennium.range;

d3_time.decade = d3_time_interval(
function(date) {
    date = d3_time.day(date);
    date.setMonth(0, 1);
    var offset = date.getFullYear()%10;
    if(date.getFullYear() < 0) {
        offset = 10 + offset;
    }
    date.setFullYear(date.getFullYear() - offset);
    return date;
},
function(date, offset) {
    date.setFullYear(date.getFullYear() + 10*offset);
},
function(date) {
    return date.getFullYear() - date.getFullYear()%10;
}
);
d3_time.decades = d3_time.decade.range;

FLOW.D3 = FLOW.D3 || {};

FLOW.D3.Node = function(parentNode){
    this.children = [];
    this.parentNode = parentNode;
    this.type = "";

    return this;
};

FLOW.D3.Node.prototype.traverse = function(callback) {
    callback(this);
    var children = this.children;
    for (var i = 0, l = children.length; i < l; i++) {
        children[i].traverse(callback);
    }

};

FLOW.D3.Node.prototype.add = function(node) {
    this.children.push(node);
    node.parentNode = this;
    return this;
};

FLOW.D3.Node.prototype.remove = function(node) {
    node.parentNode = null;
    var index = this.children.indexOf(node);
    this.children.splice(index,1);
}

FLOW.D3.Node.prototype.createMesh = function( parentObject ) {
    this.mesh = this.__createFunc? new this.__createFunc() : new THREE.Object3D();
    if ( parentObject ){
        this.parentObject = parentObject;
        this.parentObject.add(this.mesh);
        this.mesh.frustumCulled = false;
    }
    /*if (this.parentNode && this.parentNode.mesh) {
     this.parentMesh = this.parentNode.mesh;
     this.parentMesh.add(this.mesh);
     }*/
    return this;
};


FLOW.D3.Node.prototype.create = function( parent3DObject ) {
    if (! this.__createFunc) {
        throw("Create the object using append('text') before calling create");
    }
    this.object = new this.__createFunc() ;

    this.object.create(parent3DObject);
    this.mesh = this.object.mesh;

    return this;
};


FLOW.D3.Node.prototype.getMesh = function(){
    return this.mesh;
};

FLOW.D3.Node.prototype.getChild = function(index){
    return this.children[ index ];
};

FLOW.D3.Node.prototype.getData = function(){
    return this.__data__;
};

FLOW.D3.select = function (parent) {
    var node =new FLOW.D3.Node(); //object;//typeof object === "function" ? object(): object;
    node.__type = "root";
    node.__createFunc = THREE.Object3D ;

    var root =  FLOW.D3.Selection.from([[ node ]]);
    //var rootObj = new THREE.Object3D();
    //node.add(rootObj);
    //root.push([node]);

    root[0][0].__data__ = {};
    root[0][0].__tags__ = [];
    root[0][0].parentNode = parent;

    return root;



};

FLOW.D3.object = function (object) {
    return FLOW.D3.Selection.from([[object]]);
};


FLOW.D3.search =function(node, selector) {
    var result = [], tagsArray;

    if (typeof selector === "string") {
        tagsArray = selector.replace(/\./g, " ").trim().split(" ");
    }

    var searchIterator = function (node) {

        if (typeof selector === "string") {

            if ( typeof node.__data__ == "undefined") {
                return;
            }

            for (var i = 0; i < tagsArray.length; i++) {
                if (node.__tags__.indexOf(tagsArray[i]) < 0) {
                    return;
                }
            }
        } else {
            for (var s in selector) {
                if (node[s] !== selector[s]) {
                    return;
                }
            }
        }

        return result.push(node);
    };

    node.traverse(searchIterator);

    return result;
};

FLOW.D3.toArray = function(list) {
    return Array.prototype.slice.call(list);
};

FLOW.D3.toObject = function(val) {
    if (val === null) {
        throw new TypeError('Object.assign cannot be called with null or undefined');
    }

    return Object(val);
};


FLOW.D3.assign= function(target, source)  {
    var pendingException;
    var from;
    var keys;
    var to = FLOW.D3.toObject(target);

    if (!source) {
        throw new Error("No source(s) provided to assign.");
    }

    for (var s = 1; s < arguments.length; s++) {
        from = arguments[s];
        keys = Object.keys(Object(from));

        for (var i = 0; i < keys.length; i++) {
            try {
                to[keys[i]] = from[keys[i]];
            } catch (err) {
                if (pendingException === undefined) {
                    pendingException = err;
                }
            }
        }
    }

    if (pendingException) {
        throw pendingException;
    }

    return to;
};


FLOW.D3.getBind= function(enter, update, exit, key) {
    return function (group, groupData) {
        var i, node, nodeData;
        var n = group.length;
        var m = groupData.length;
        var n0 = Math.min(n, m);

        var updateNodes = new Array(m);
        var enterNodes = new Array(m);
        var exitNodes = new Array(n);

        if (key) {
            var nodeByKeyValue = new FLOW.SubUnitMap();
            var dataByKeyValue = new FLOW.SubUnitMap();
            var keyValues = [], keyValue;

            for (i = -1; ++i < n; ) {
                keyValue = key.call(node = group[i], node.__data__, i);
                if (nodeByKeyValue.has(keyValue)) {
                    exitNodes[i] = node; // duplicate selection key
                } else {
                    nodeByKeyValue.set(keyValue, node);
                }
                keyValues.push(keyValue);
            }

            for (i = -1; ++i < m; ) {
                keyValue = key.call(groupData, nodeData = groupData[i], i);
                if (node = nodeByKeyValue.get(keyValue)) {
                    updateNodes[i] = node;
                    node.__data__ = nodeData;
                } else if (!dataByKeyValue.has(keyValue)) { // no duplicate data key
                    enterNodes[i] = FLOW.D3._selectionDataNode(nodeData);
                }
                dataByKeyValue.set(keyValue, nodeData);
                nodeByKeyValue.remove(keyValue);
            }

            for (i = -1; ++i < n; ) {
                if (nodeByKeyValue.has(keyValues[i])) {
                    exitNodes[i] = group[i];
                }
            }
        } else {
            for (i = -1; ++i < n0; ) {
                node = group[i];
                nodeData = groupData[i];
                if (node) {
                    node.__data__ = nodeData;
                    updateNodes[i] = node;
                } else {
                    enterNodes[i] = FLOW.D3._selectionDataNode(nodeData);
                }
            }
            for (; i < m; ++i) {
                enterNodes[i] = FLOW.D3._selectionDataNode(groupData[i]);
            }
            for (; i < n; ++i) {
                exitNodes[i] = group[i];
            }
        }

        enterNodes.update = updateNodes;
        enterNodes.parentNode = updateNodes.parentNode = exitNodes.parentNode = group.parentNode;

        enter.push(enterNodes);
        update.push(updateNodes);
        exit.push(exitNodes);
    };
};

FLOW.D3._selectionDataNode = function(nodeData) {
    var store = {};
    store.__data__ = nodeData;
    store.__tags__ = [];
    return store;
};


//Array.from polyfill fromhttps://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from

// Production steps of ECMA-262, Edition 6, 22.1.2.1
// Reference: https://people.mozilla.org/~jorendorff/es6-draft.html#sec-array.from
if (!Array.from) {
    Array.from = (function () {
        var toStr = Object.prototype.toString;
        var isCallable = function (fn) {
            return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
        };
        var toInteger = function (value) {
            var number = Number(value);
            if (isNaN(number)) { return 0; }
            if (number === 0 || !isFinite(number)) { return number; }
            return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
        };
        var maxSafeInteger = Math.pow(2, 53) - 1;
        var toLength = function (value) {
            var len = toInteger(value);
            return Math.min(Math.max(len, 0), maxSafeInteger);
        };

        // The length property of the from method is 1.
        return function from(arrayLike/*, mapFn, thisArg */) {
            // 1. Let C be the this value.
            var C = this;

            // 2. Let items be ToObject(arrayLike).
            var items = Object(arrayLike);

            // 3. ReturnIfAbrupt(items).
            if (arrayLike == null) {
                throw new TypeError("Array.from requires an array-like object - not null or undefined");
            }

            // 4. If mapfn is undefined, then var mapping be false.
            var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
            var T;
            if (typeof mapFn !== 'undefined') {
                // 5. else
                // 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
                if (!isCallable(mapFn)) {
                    throw new TypeError('Array.from: when provided, the second argument must be a function');
                }

                // 5. b. If thisArg was supplied, var T be thisArg; else var T be undefined.
                if (arguments.length > 2) {
                    T = arguments[2];
                }
            }

            // 10. Let lenValue be Get(items, "length").
            // 11. Let len be ToLength(lenValue).
            var len = toLength(items.length);

            // 13. If IsConstructor(C) is true, then
            // 13. a. Let A be the result of calling the [[Construct]] internal method of C with an argument list containing the single item len.
            // 14. a. Else, Let A be ArrayCreate(len).
            var A = isCallable(C) ? Object(new C(len)) : new Array(len);

            // 16. Let k be 0.
            var k = 0;
            // 17. Repeat, while k < len… (also steps a - h)
            var kValue;
            while (k < len) {
                kValue = items[k];
                if (mapFn) {
                    A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
                } else {
                    A[k] = kValue;
                }
                k += 1;
            }
            // 18. Let putStatus be Put(A, "length", len, true).
            A.length = len;
            // 20. Return A.
            return A;
        };
    }());
}



/*******************FLOW.D3.SubUnitArray ******************************************************************/



FLOW.D3.SubUnitArray = function(input) {
    Array.call();
    return this;
};

FLOW.OOPUtils.prototypalInheritance(FLOW.D3.SubUnitArray, Array);


FLOW.D3.SubUnitArray.prototype.append = function(name) {
    var nodeCreator = this.selectionCreator(name);

    return this.select(function () {
        var ret = nodeCreator.apply(this, arguments);
        ret.parentNode.children.push(ret);
        return ret;
    });
};

FLOW.D3.SubUnitArray.prototype.selectionCreator = function(name) {
    var Func;

    if (typeof name === "function") {
        Func = name; // SEND ANY CONSTRUCTOR
    } else if (name === "mesh") {
        Func = THREE.Mesh;
    } else if (name === "line") {
        Func = THREE.Line;
    } else if (name === "object") {
        Func = FLOW.D3.Object3D;
    } else if (name === "text") {
        Func = FLOW.D3.Text;
    } else if (name === "g") {
        Func = THREE.Object3D;
    } else if (name === "empty") {
        Func = null;
    } else {
        throw new Error("Cannot append: ", name);
    }

    return function (data) {
        var node = new FLOW.D3.Node(this);
        node.__type = name;
        node.__createFunc = Func;
        node.__data__  = data;
        node.__tags__  = [];
        return node;
    };
};

FLOW.D3.SubUnitArray.prototype.createMesh = function( parentObject3D ) {
    this.node().createMesh(parentObject3D);

    /* this[0][0].mesh = this.Func? new Func() : new THREE.Object3D();
     if (parentObject) {
     this[0][0].parentObject = parentObject;
     this[0][0].parentObject.add(this[0][0].mesh);
     }
     return this;*/
}

/** sets the params (copied) on each node */
FLOW.D3.SubUnitArray.prototype.params = function( params  ) {
    return this.select(function () {
        this.params = Object.assign( {}, params );
        return this;
    });
    return this;
};

/** adds a param to each node */
FLOW.D3.SubUnitArray.prototype.param = function( name, value  ) {
    return this.select(function () {
        this.params = this.params || {};
        if (typeof value === "function" ) {
            var newValue = value.call(this, this.__data__);
            this.params[name] = typeof newValue != "undefined" ? newValue: this.params[name];
        } else {
            this.params[name] = value;
        }
        return this;
    });
    return this;
};

FLOW.D3.SubUnitArray.prototype.create = function(   ) {

    return this.select(function (d, foo, foo2) {
        if (! this.__createFunc) {
            throw("Create the object using append('text') before calling create");
        }
        this.__createFunc.call(this, this.params, this.parentNode.mesh) ;
        // this.object.create(this.parentNode.parentObject);
        // this.mesh = this.object.buildMesh();;

        return this;
    });

};

FLOW.D3.SubUnitArray.prototype.empty = function() {
    return !this.node();
}

FLOW.D3.SubUnitArray.prototype.node = function() {
    for (var j = 0, m = this.length; j < m; j++) {
        for (var group = this[j], i = 0, n = group.length; i < n; i++) {
            var nodeGroup = group[i];
            if (nodeGroup) {
                return nodeGroup;
            }
        }
    }
    return null;
};

FLOW.D3.SubUnitArray.prototype.getNodeMesh = function() {
    var node = this.node();
    return node.getMesh();
};



FLOW.D3.SubUnitArray.prototype.pass = function(callback) {
    var args = FLOW.D3.toArray(arguments);
    callback.apply(args[0] = this, args);
    return this;
};

FLOW.D3.SubUnitArray.prototype.use = function(model, callback) {
    return selectionUse(this, function (node, i, j) {
        callback.call(model, node.__data__, i, j);
    });


    function selectionUse(groups, callback) {
        for (var j = 0, m = groups.length; j < m; j++) {
            for (var group = groups[j], i = 0, n = group.length, node; i < n; i++) {
                if (node = group[i]) {
                    callback(node, i, j);
                }
            }
        }
        return groups;
    }
}


/********************* FLOW.D3.Selection ********************************************************************/


var FLOW = FLOW || {};
FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');

FLOW.D3.Selection = function(input) {
    FLOW.D3.SubUnitArray.call();
    return  this;
};

FLOW.OOPUtils.prototypalInheritance(FLOW.D3.Selection, FLOW.D3.SubUnitArray);

//Inheritance doesn't work on static methods, so we need to be explicit
if (!FLOW.D3.Selection.from) {
    FLOW.D3.Selection.from = Array.from;
}


FLOW.D3.Selection.prototype.tagged = function(name, value) {
    if (arguments.length < 2) {

        if (typeof name === "string") {
            var node = this.node();
            var n = (name = FLOW.D3.Selection.selectionTags(name)).length;
            var i = -1;

            if (value = node.__tags__.length) {
                while (++i < n) {
                    if (value.indexOf(name[i]) === -1) {
                        return false;
                    }
                }
            }

            return true;
        }

        for (value in name) {
            this.each(FLOW.D3.Selection.selectionTagged(value, name[value]));
        }

        return this;
    }

    return this.each(FLOW.D3.Selection.selectionTagged(name, value));
};


FLOW.D3.Selection.selectionTags = function(name) {
    return (name + "").trim().split(/^|\s+/);
};

FLOW.D3.Selection.selectionTagged = function(name, value) {
    name = FLOW.D3.Selection.selectionTags(name)
        .map(FLOW.D3.Selection.selectionTaggedName);

    var n = name.length;

    function taggedConstant() {
        var i = -1;
        while (++i < n) {
            name[i](this, value);
        }
    }

    function taggedFunction() {
        var i = -1, x = value.apply(this, arguments);
        while (++i < n) {
            name[i](this, x);
        }
    }

    return typeof value === "function" ?
        taggedFunction:
        taggedConstant;
}

FLOW.D3.Selection.selectionTaggedName= function(name) {
    return function(node, value) {
        var index;

        if (node.__tags__) {
            index = node.__tags__.indexOf(name);
            if (value && index === -1) {
                return node.__tags__.push(name);
            } else if (index !== -1){
                return delete node.__tags__[index];
            }
        }

        return null;
    };
};

FLOW.D3.Selection.prototype.remove = function(){
    return this.each(function() {
        var parent = this.parentNode;
        if (parent) {
            parent.remove(this);
        }
    });
};

FLOW.D3.Selection.prototype.removeChildren = function(){
    if (!this.length || ! this[0].length || ! this[0][0] || this[0][0].children.length<2) {return this}
    return this.each(function() {
        this.children = [this.children[0]];
        /*for (var i=0;i<this.children.length;i++){
         var item = this.children[i];
         var parent = item.parentNode;
         if (parent) {
         parent.children.remove(item);
         }
         }*/
    });
};

FLOW.D3.Selection.prototype.filter = function(fun){
    var subgroups = [], subgroup, group, node;

    if (typeof fun !== "function") {
        fun = FLOW.D3.Selection.selectionFilter(fun);
    }

    for (var j = 0, m = this.length; j < m; j++) {
        subgroups.push(subgroup = []);
        subgroup.parentNode = (group = this[j]).parentNode;
        for (var i = 0, n = group.length; i < n; i++) {
            if ((node = group[i]) && fun.call(node, node.__data__, i, j)) {
                subgroup.push(node);
            }
        }
    }
    return FLOW.D3.Selection.from(subgroups);
};

FLOW.D3.Selection.selectionFilter = function(selector) {
    return function() {
        return FLOW.D3.search(this, selector, true);
    };
}

FLOW.D3.Selection.prototype.datum = function(value){
    return arguments.length ? this.prop("__data__", value) : this.prop("__data__");
};


FLOW.D3.Selection.prototype.data = function(value,key){
    var i = -1, n = this.length, group, node;

    if (!arguments.length) {
        value = new Array(n = (group = this[0]).length);
        while (++i < n) {
            if (node = group[i]) {
                value[i] = node.__data__;
            }
        }
        return value;
    }

    var enter  = new FLOW.D3.EnterSelection();
    var update = new FLOW.D3.Selection();
    var exit   = new FLOW.D3.Selection();

    var bind = FLOW.D3.getBind(enter, update, exit, key);

    if (typeof value === "function") {
        while (++i < n) {
            bind(group = this[i], value.call(group, group.parentNode.__data__, i));
        }
    } else {
        while (++i < n) {
            bind(group = this[i], value);
        }
    }

    update.enter = function() {
        return enter;
    };
    update.exit  = function() { return exit; };
    return update;
};

FLOW.D3.Selection.prototype.attr = function(name, value){
    if (arguments.length < 2) {
        for (value in name) {
            this.each(FLOW.D3.Selection.selectionAttr(value, name[value]));
        }
        return this;
    }
    return this.each(FLOW.D3.Selection.selectionAttr(name, value));
};

FLOW.D3.Selection.selectionAttr = function(name, value) {

    function attrNull() {
        delete this[name];
    }

    function attrConstant() {
        if (name === "tags" || name === "class") {
            var arr = value.split(" ");
            for (var i = 0; i < arr.length; i++) {
                this.__tags__.push(arr[i]);
            }
        } else if (name === "position" || name === "scale") {
            if (this.mesh){
                this.mesh[name].copy(value);
            }
        } else if (name === "rotation" ) {
            if (this.mesh){
                this.mesh.rotation.x = (value.x || 0);
                this.mesh.rotation.y = (value.y || 0);
                this.mesh.rotation.z = (value.z || 0);
            }
        } else if (name === "translation" ) {
            if (this.mesh){
                this.mesh.position.x += (value.x || 0); //TODO: update needed?
                this.mesh.position.y += (value.y || 0);
                this.mesh.position.z += (value.z || 0);
            }
        } else if (name === "lookAt") {
            if (this.mesh){
                this.mesh.lookAt(value);
            }
        } else if (name === "material") {
            if (this.mesh){
                this.mesh.material =value;
            }
        } else if (name === "geometry") {
            if (this.mesh){
                this.mesh.geometry =value;
            }
        } else {
            this[name] = value;
        }
    }

    function attrFunction() {
        var res = value.apply(this, arguments);
        if (res === null) {
            return this[name] && delete this[name];
        } else if (name === "position" || name === "scale") {
            if (this.mesh) {
                this.mesh[name].copy(res);
            }
        } else if (name === "rotation" ) {
            if (this.mesh) {
                this.mesh.rotation.x = (res.x || 0);
                this.mesh.rotation.y = (res.y || 0);
                this.mesh.rotation.z = (res.z || 0);
            }
        } else if (name === "translation" ) {
            if (this.mesh) {
                this.mesh.position.x += (res.x || 0);
                //TODO: update needed?
                this.mesh.position.y += (res.y || 0);
                this.mesh.position.z += (res.z || 0);
            }
        } else if (name === "lookAt") {
            if (this.mesh) {
                this.mesh.lookAt(res);
            }
        } else if (name === "material") {
            if (this.mesh) {
                this.mesh.material =res;
            }
        } else if (name === "geometry") {
            if (this.mesh) {
                this.mesh.geometry = res;
            }
        } else {
            this[name] = res;
        }
    }
    return value === null ? attrNull: (typeof value === "function" ? attrFunction: attrConstant);
}


FLOW.D3.Selection.prototype.prop = function(name, value){
    if (arguments.length < 2) {

        if (typeof name === "string") {
            return this.node()[name];
        }

        for (value in name) {
            this.each(FLOW.D3.Selection.getProperty(value, name[value]));
        }
        return this;
    }
    return this.each(FLOW.D3.Selection.getProperty(name, value));
};

FLOW.D3.Selection.getProperty = function(name, value) {

    function propertyNull() {
        delete this[name];
    }

    function propertyConstant() {
        this[name] = value;
    }

    function propertyFunction() {
        var x = value.apply(this, arguments);
        if (x == null) {
            delete this[name];
        } else {
            this[name] = x;
        }
    }

    return value == null ?
        propertyNull : (typeof value === "function" ?
        propertyFunction : propertyConstant);
}


FLOW.D3.Selection.prototype.sort = function(comparator){
    comparator = FLOW.D3.Selection.selectionSortComparator.apply(this, arguments);
    for (var j = -1, m = this.length; ++j < m; ) {
        this[j].sort(comparator);
    }
    return this;
};

FLOW.D3.Selection.selectionSortComparator = function(comparator) {
    if (!arguments.length) {
        comparator = FLOW.D3.Selection.ascending;
    }
    return function(a, b) {
        return a && b ? comparator(a.__data__, b.__data__) : !a - !b;
    };
}

FLOW.D3.Selection.ascending = function(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}


FLOW.D3.Selection.prototype.each = function(callback, args){
    return this.selectionEach(this, function (node, i, j) {
        callback.call(node, node.__data__, i, j, args);
    });
};

FLOW.D3.Selection.prototype.selectionEach = function(groups, callback, args){
    for (var j = 0, m = groups.length; j < m; j++) {
        for (var group = groups[j], i = 0, n = group.length, node; i < n; i++) {
            if (node = group[i]) {
                callback(node, i, j, args);
            }
        }
    }
    return groups;
};

FLOW.D3.Selection.prototype.on = function(type, listener){
    return this.each(FLOW.D3.Selection.selectionOn(type, listener));
};

FLOW.D3.Selection.selectionOn = function(type, listener) {

    function onRemove(d, i, j) { // NEEDS WORK
        this.mesh.removeEventListener(type, (function () {
            return function (event) {
                return listener.call(this, event, this.__data__, i, j);
            };
        }()));
    }

    function onAdd(d, i, j) {
        this.mesh.addEventListener(type, (function () {
            return function (event) {
                return listener.call(this, event, this.__data__, i, j);
            };
        }()));
    }

    return listener === null ? onRemove: onAdd;
}


FLOW.D3.Selection.prototype.select = function(selector){
    var subgroups = [], subgroup, subnode, group, node;

    selector = FLOW.D3.Selection.selectionSelector(selector);

    for (var j = -1, m = this.length; ++j < m; ) {
        subgroup = []
        subgroups.push(subgroup);
        group = this[j];
        subgroup.parentNode = group.parentNode;

        for (var i = -1, n = group.length; ++i < n; ) {
            node = group[i]
            if (node) {
                subnode = selector.call(node, node.__data__, i, j)
                subgroup.push(subnode);
                if (subnode && "__data__" in node) {
                    subnode.__data__ = node.__data__;
                }
            } else {
                subgroup.push(null);
            }
        }
    }
    var selection =FLOW.D3.Selection.from(subgroups)
    return selection;
};


FLOW.D3.Selection.selectionSelector = function(selector) {
    return typeof selector === "function" ? selector : function() {
        return FLOW.D3.search(this, selector);
    };
}


FLOW.D3.Selection.prototype.selectAll = function(selector){
    var subgroups = [], subgroup, node;

    selector = this.selectionSelectorAll(selector);

    for (var j = -1, m = this.length; ++j < m; ) {
        var group = this[j];
        for (var  i = -1, n = group.length; ++i < n; ) {
            if (node = group[i]) {
                subgroups.push(subgroup = FLOW.D3.toArray(selector.call(node, node.__data__, i, j)));
                subgroup.parentNode = node;
            }
        }
    }

    return FLOW.D3.Selection.from(subgroups);
};

FLOW.D3.Selection.prototype.selectionSelectorAll = function(selector){
    return typeof selector === "function" ? selector : function() {
        return FLOW.D3.search(this, selector);
    };
};



FLOW.D3.Selection.transitionID = 0;
FLOW.D3.Selection.transitionInherit = null;
FLOW.D3.Selection.transitionInheritID = null;

FLOW.D3.Selection.prototype.transition = function(name){

    var id = FLOW.D3.Selection.transitionInheritID || ++FLOW.D3.Selection.transitionID;
    var ns = FLOW.D3.Selection.transitionNamespace(name);
    var subgroups = [], subgroup, node;

    var props = FLOW.D3.Selection.transitionInherit || {time: Date.now(), ease: FLOW.D3.Selection.easeCubicInOut, delay: 0, duration: 250};

    for (var j = -1, m = this.length; ++j < m; ) {
        subgroups.push(subgroup = []);
        for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
            if (node = group[i]) {
                Transition.transitionNode(node, i, ns, id, props);
            }
            subgroup.push(node);
        }
    }

    return FLOW.D3.Selection.transitionFactory(subgroups, ns, id);
};

FLOW.D3.Selection.easeCubicInOut = function(t) {
    if (t <= 0) {
        return 0;
    }
    if (t >= 1) {
        return 1;
    }
    var t2 = t * t, t3 = t2 * t;
    return 4 * (t < .5 ? t3 : 3 * (t - t2) + t3 - .75);
}

FLOW.D3.Selection.transitionNamespace = function(name) {
    return name == null ? "__transition__" : "__transition_" + name + "__";
}

FLOW.D3.Selection.transitionFactory = function(groups, ns, id) {
    var trans = Transition.from(groups);
    trans.namespace = ns;
    trans.id = id;

    return trans;
}


/*

 FLOW.D3.Selection.prototype.selectionCreator = function(name) {
 var Func;

 if (typeof name === "function") {
 Func = name; // SEND ANY CONSTRUCTOR
 } else if (name === "mesh") {
 Func = THREE.Mesh;
 } else if (name === "line") {
 Func = THREE.Line;
 } else if (name === "object") {
 Func = THREE.Object3D;
 } else if (name === "g") {
 Func = THREE.Object3D;
 } else {
 throw new Error("Cannot append: ", name);
 }

 return function (data) {
 var node = new Func();
 node.__data__  = data;
 node.__tags__  = [];
 node.parentNode = this;
 this.add(node);
 return node;
 };
 };
 */


/******************** FLOW.D3.EnterSelection *****************************************/


var FLOW = FLOW || {};
FLOW.OOPUtils = FLOW.OOPUtils// || require('flow-oop-utils');

FLOW.D3.EnterSelection = function(input) {
    FLOW.D3.SubUnitArray.call(input);
    return this;
};


FLOW.OOPUtils.prototypalInheritance(FLOW.D3.EnterSelection, FLOW.D3.SubUnitArray);


//Inheritance doesn't work on static methods, so we need to be explicit
if (!FLOW.D3.EnterSelection.from) {
    FLOW.D3.EnterSelection.from =  Array.from
}


FLOW.D3.EnterSelection.prototype.select = function (selector) {
    var subgroups = [], subgroup, upgroup, group;
    var subnode, node;

    for (var j = -1, m = this.length; ++j < m; ) {
        group = this[j]
        upgroup = group.update;
        subgroup = []
        subgroups.push(subgroup);
        subgroup.parentNode = group.parentNode;
        for (var i = -1, n = group.length; ++i < n; ) {
            node = group[i]
            if (node) {
                upgroup[i] = subnode = selector.call(group.parentNode, node.__data__, i, j)
                subgroup.push(upgroup[i]);
                subnode.__data__ = node.__data__;
            } else {
                subgroup.push(null);
            }
        }
    }
    return FLOW.D3.Selection.from(subgroups);
};



/******************** SubUnitMap *****************************************/

FLOW.SubUnitMap= function() {}

FLOW.SubUnitMap.defineProperties=function(ctor, properties) {


    try {
        for (var key in properties) {
            Object.defineProperty(ctor.prototype, key, {
                value: properties[key],
                enumerable: false
            });
        }
    } catch (e) {
        ctor.prototype = properties;
    }
}

var mapPrefix = "\0";
var mapPrefixCode = mapPrefix.charCodeAt(0);

FLOW.SubUnitMap.mapHas = function(key) {
    return mapPrefix + key in this;
}

FLOW.SubUnitMap.mapRemove = function(key) {
    key = mapPrefix + key;
    return key in this && delete this[key];
}

FLOW.SubUnitMap.mapKeys = function() {
    var keys = [];
    this.forEach(function (key) { keys.push(key); });
    return keys;
};

FLOW.SubUnitMap.mapSize = function() {
    var size = 0;
    for (var key in this) {
        if (key.charCodeAt(0) === mapPrefixCode) {
            ++size;
        }
    }
    return size;
};

FLOW.SubUnitMap.mapEmpty = function() {
    for (var key in this) {
        if (key.charCodeAt(0) === mapPrefixCode) {
            return false;
        }
    }
    return true;
};



FLOW.SubUnitMap.defineProperties(FLOW.SubUnitMap, {
    has: FLOW.SubUnitMap.mapHas,
    get: function(key) {
        return this[mapPrefix + key];
    },
    set: function(key, value) {
        this[mapPrefix + key] = value;
        return value;
    },
    remove: FLOW.SubUnitMap.mapRemove,
    keys: FLOW.SubUnitMap.mapKeys,
    values: function() {
        var values = [];
        this.forEach(function (key, value) { values.push(value); });
        return values;
    },
    entries: function() {
        var entries = [];
        this.forEach(function (key, value) { entries.push({key: key, value: value}); });
        return entries;
    },
    size: FLOW.SubUnitMap.mapSize,
    empty: FLOW.SubUnitMap.mapEmpty,
    forEach: function(f) {
        for (var key in this) {
            if (key.charCodeAt(0) === mapPrefixCode) {
                f.call(this, key.substring(1), this[key]);
            }
        }
    }
});



/************** Timer ********************************************************/
FLOW.Timer = {};

FLOW.Timer.timerqueueHead, FLOW.Timer.timerqueueTail;

FLOW.Timer.timerinterval; // is an interval (or frame) active?
FLOW.Timer.timertimeout;  // is a timeout active?

FLOW.Timer.activeTimer;   // active timer object


// The timer will continue to fire until callback returns true.
FLOW.Timer.createTimer = function(callback, delay, then) {
    var n = arguments.length;
    if (n < 2) {
        delay = 0;
    }
    if (n < 3) {
        then = Date.now();
    }

    var time = then + delay;
    var timer = {c: callback, t: time, f: false, n: null};

    if (FLOW.Timer.timerqueueTail) {
        FLOW.Timer.timerqueueTail.n = timer;
    } else {
        FLOW.Timer.timerqueueHead = timer;
    }

    FLOW.Timer.timerqueueTail = timer;

    if (!FLOW.Timer.timerinterval) {
        FLOW.Timer.timertimeout = clearTimeout(FLOW.Timer.timertimeout);
        FLOW.Timer.timerinterval = 1;
        window.requestAnimationFrame(FLOW.Timer.timerstep);
    }
};

FLOW.Timer.timerstep= function() {
    var now = FLOW.Timer.timermark();
    var delay = FLOW.Timer.timersweep() - now;

    if (delay > 24) {
        if (isFinite(delay)) {
            clearTimeout(FLOW.Timer.timertimeout);
            FLOW.Timer.timertimeout = setTimeout(FLOW.Timer.timerstep, delay);
        }
        FLOW.Timer.timerinterval = 0;
    } else {
        FLOW.Timer.timerinterval = 1;
        window.requestAnimationFrame(FLOW.Timer.timerstep);
    }
}

FLOW.Timer.flush = function() {
    FLOW.Timer.timermark();
    FLOW.Timer.timersweep();
};

FLOW.Timer.timermark = function() {
    var now = Date.now();
    FLOW.Timer.activeTimer = FLOW.Timer.timerqueueHead;
    while (FLOW.Timer.activeTimer) {
        if (now >= FLOW.Timer.activeTimer.t) {
            FLOW.Timer.activeTimer.f = FLOW.Timer.activeTimer.c(now - FLOW.Timer.activeTimer.t);
        }
        FLOW.Timer.activeTimer = FLOW.Timer.activeTimer.n;
    }
    return now;
}

// Flush after callbacks to avoid concurrent queue modification.
// Returns the time of the earliest active timer, post-sweep.
FLOW.Timer.timersweep = function() {
    var t0, t1 = FLOW.Timer.timerqueueHead, time = Infinity;

    while (t1) {
        if (t1.f) {
            t1 = t0 ? t0.n = t1.n :FLOW.Timer.timerqueueHead = t1.n;
        } else {
            if (t1.t < time) {
                time = t1.t;
            }
            t1 = (t0 = t1).n;
        }
    }
    FLOW.Timer.timerqueueTail = t0;
    return time;
}

/************** Transition ********************************************************/
var Transition = function(input) {
    FLOW.D3.SubUnitArray.call();
    return  this;
};

FLOW.OOPUtils.prototypalInheritance(Transition, FLOW.D3.SubUnitArray);

//Inheritance doesn't work on static methods, so we need to be explicit
if (!Transition.from) {
    Transition.from = Array.from;
}


Transition.transitionID = 0;
Transition.transitionInherit = null;
Transition.transitionInheritId = null;

//TODO: why is this different than FLOW.D3.Selection.transition?
Transition.prototype.transition = function() {
    var id0 = this.id;
    var id1 = Transition.transitionInheritId;
    var ns = this.namespace;
    var subgroups = [], subgroup, node;
    var trans;

    for (var j = 0, m = this.length; j < m; j++) {
        subgroups.push(subgroup = []);
        for (var group = this[j], i = 0, n = group.length; i < n; i++) {
            if (node = group[i]) {
                trans = node[ns][id0];
                Transition.transitionNode(node, i, ns, id1, {time: trans.time, ease: trans.ease, delay: trans.delay + trans.duration, duration: trans.duration});
            }
            subgroup.push(node);
        }
    }

    return FLOW.D3.Selection.transitionFactory(subgroups, ns, id1);
};

Transition.transitionSelection = function(selection, name) {
    if (selection && selection.transition) {
        return Transition.transitionInheritId ? selection.transition(name) : selection;
    } else {
        return FLOW.D3.Selection.from([]).transition(selection);
    }
};



Transition.transitionNode = function(node, i, ns, id, inherit) {
    var lock = node[ns] || (node[ns] = {active: 0, count: 0});
    var transition = lock[id];

    if (!transition) {
        var time = inherit.time;

        transition = lock[id] = {
            tween: new FLOW.SubUnitMap(),
            time: time,
            delay: inherit.delay,
            duration: inherit.duration,
            ease: inherit.ease,
            index: i
        };

        inherit = null; // allow gc

        ++lock.count;

        FLOW.Timer.createTimer(function(elapsed) {
            var delay = transition.delay;
            var duration, ease;
            var timer = FLOW.Timer.activeTimer;
            var tweened = [];

            timer.t = delay + time;

            if (delay <= elapsed) {
                return start(elapsed - delay);
            }

            timer.c = start;

            function start(elapsedMinusDelay) {

                if (lock.active > id) {
                    return stop();
                }

                var active = lock[lock.active];

                if (active) {
                    --lock.count;
                    delete lock[lock.active];

                    if (active.event) {
                        active.event.interrupt.call(node, node.__data__, active.index);
                    }
                }

                lock.active = id;

                if (transition.event) {
                    transition.event.start.call(node, node.__data__, i);
                }

                transition.tween.forEach(function(key, value) {
                    if (value = value.call(node, node.__data__, i)) {
                        tweened.push(value);
                    }
                });

                // Deferred capture to allow tweens to initialize ease & duration.
                ease = transition.ease;
                duration = transition.duration;

                FLOW.Timer.createTimer(function() { // defer to end of current frame
                    timer.c = tick(elapsedMinusDelay || 1) ? function() { return true} : tick;
                    return 1;
                }, 0, time);
            }

            function tick(haveElapsed) {
                if (lock.active !== id) {
                    return 1;
                }

                var t = haveElapsed / duration;
                var e = ease(t);
                var n = tweened.length;

                while (n > 0) {
                    tweened[--n].call(node, e);
                }

                if (t >= 1) {
                    if (transition.event) {
                        transition.event.end.call(node, node.__data__, i);
                    }
                    return stop();
                }
            }

            function stop() {
                if (--lock.count) {
                    delete lock[id];
                } else {
                    delete node[ns];
                }
                return 1;
            }
        }, 0, time);
    }
}


Transition.prototype.attr = function(name, value) {

    if (arguments.length < 2) {
        for (value in name) {
            this.attr(value, name[value]);
        }
        return this;
    }

    var interpolate = d3.interpolateObject;

    function attrNull() {}

    function attrTween(b) {
        if (b == null) {
            return attrNull;
        } else {
            return function () {

                var a = {
                    x: this[name].x,
                    y: this[name].y,
                    z: this[name].z
                };

                for (var key in a) {
                    if (!b[key]) {
                        delete a[key];
                    }
                }

                var i = interpolate(a, b);

                return function (t) {
                    var update = i(t);
                    for (var key in update) {
                        this[name][key] = update[key];
                    }
                };
            };
        }
    }

    return this.transitionTween(this, "attr." + name, value, attrTween);
}

Transition.prototype.transitionTween = function(groups, name, value, tween) {
    var id = groups.id, ns = groups.namespace;
    var callback;

    if (typeof value === "function") {
        callback = function(node, i, j) {
            var d = value.call(node, node.__data__, i, j);
            node[ns][id].tween.set(name, tween(d));
        };
    } else {
        value = tween(value);
        callback = function(node) {
            node[ns][id].tween.set(name, value);
        };
    }

    return this.selectionEach(groups, callback);
}

Transition.prototype.delay = function(value) {
    var id = this.id;
    var ns = this.namespace;
    var callback;

    if (arguments.length < 1) {
        return this.node()[ns][id].delay;
    }

    if (typeof value === "function") {
        callback = function(node, i, j) {
            node[ns][id].delay = +value.call(node, node.__data__, i, j);
        };
    } else {
        value = +value;

        callback = function(node) {
            node[ns][id].delay = value;
        };
    }

    return this.selectionEach(this, callback);
}


Transition.prototype.duration = function(value) {
    var id = this.id;
    var ns = this.namespace;
    var callback;

    if (arguments.length < 1) {
        return this.node()[ns][id].duration;
    }

    if (typeof value === "function") {
        callback = function (node, i, j) {
            node[ns][id].duration = Math.max(1, value.call(node, node.__data__, i, j));
        };
    } else {
        value = Math.max(1, value);
        callback = function (node) {
            node[ns][id].duration = value;
        };
    }

    return this.selectionEach(this, callback);
}

Transition.prototype.each = function(type, listener) {
    var id = this.id, ns = this.namespace;
    if (arguments.length < 2) {
        throw new Error('type and listener required');
    } else {
        this.selectionEach(this, function(node) {
            var transition = node[ns][id];
            (transition.event || (transition.event = d3.dispatch("start", "end", "interrupt"))).on(type, listener);
        });
    }
    return this;
};

//TODO: copied from FLOW.D3.Selection
Transition.prototype.selectionEach = function(groups, callback){
    for (var j = 0, m = groups.length; j < m; j++) {
        for (var group = groups[j], i = 0, n = group.length, node; i < n; i++) {
            if (node = group[i]) {
                callback(node, i, j);
            }
        }
    }
    return groups;
};

Transition.prototype.ease = function(value) {
    var id = this.id;
    var ns = this.namespace;

    if (arguments.length < 1) {
        return this.node()[ns][id].ease;
    }
    if (typeof value !== "function") {
        value = d3.ease.apply(d3, arguments);
    }
    return this.selectionEach(this, function(node) {return node[ns][id].ease = value});
};



Transition.prototype.filter = function(value) {
    var subgroups = [], subgroup, group, node;

    if (typeof value !== "function") {
        value = FLOW.D3.Selection.selectionFilter(value);
    }

    var j, m;
    for (j = 0, m = this.length; j < m; j++) {
        subgroups.push(subgroup = []);
        var i, n;
        for (group = this[j], i = 0, n = group.length; i < n; i++) {
            if ((node = group[i]) && value.call(node, node.__data__, i, j)) {
                subgroup.push(node);
            }
        }
    }

    return Transition.from(subgroups, this.namespace, this.id);
};



Transition.prototype.select = function(selector) {
    var id = this.id;
    var ns = this.namespace;
    var subgroups = [], subgroup;
    var subnode, node;

    selector = this.selectionSelectorAll(selector);

    for (var j = -1, m = this.length; ++j < m; ) {
        subgroups.push(subgroup = []);
        for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
            if ((node = group[i]) && (subnode = selector.call(node, node.__data__, i, j))) {
                if ("__data__" in node) {
                    subnode.__data__ = node.__data__;
                }
                Transition.transitionNode(subnode, i, ns, id, node[ns][id]);
                subgroup.push(subnode);
            } else {
                subgroup.push(null);
            }
        }
    }

    return Transition.from(subgroups, ns, id);
};

Transition.prototype.selectAll = function(selector) {
    var id = this.id;
    var ns = this.namespace;
    var subgroups = [], subgroup;
    var subnodes, subnode, node;
    var transition;

    selector = this.selectionSelectorAll(selector);

    for (var j = -1, m = this.length; ++j < m; ) {
        for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
            if (node = group[i]) {
                transition = node[ns][id];
                subnodes = selector.call(node, node.__data__, i, j);
                subgroups.push(subgroup = []);
                for (var k = -1, o = subnodes.length; ++k < o; ) {
                    if (subnode = subnodes[k]) {
                        Transition.transitionNode(subnode, k, ns, id, transition);
                    }
                    subgroup.push(subnode);
                }
            }
        }
    }

    return Transition.from(subgroups, ns, id);
};




/**
 * based on d3.svg.axis (D3 version 3)
 *
 * @returns {FLOW.D3.Axis}
 * @constructor
 *
 * @example
 var categories = [];
 var size = [100, 60]; // Width, Height

 for (var i=0 ; i < data.length; i++){
            categories.push(data[i].letter);
        }

 var categoriesRange = d3.scale.ordinal()
 .domain(categories)
 .rangeRoundBands([0,size[0]], 0.1);

 var xAxis = new FLOW.D3.Axis()
 .scale(categoriesRange)
 .tickValues(categories)
 .orient("top")
 .tickSize(3, 1)
 .tickLineWidth(0.3)
 .axisLineWidth(1);

 axisObject = xAxis.create(parentObject);
 */
FLOW.D3.Axis = function(app  ) {
    this.app = app;
    this._scale = d3.scale.linear();
    this._orient = "bottom";
    this._innerTickSize = 6;
    this._outerTickSize = 6;
    this._tickPadding = 3;
    this._divisions = 10;
    this._tickArguments_ = [this._divisions];
    this._axisLineWidth = 1;
    this._tickLineWidth = 0.3;
    this._tickValues = null;
    this._tickFormat_;
    this._font = "DejaVu Sans Mono";
    this._fontSize = 1;
    this._wrapValue = 25;
    this._tickLabelColor = 0x000000;
    this._tickLineColor = 0x000000;
    this._axisLineColor = 0x000000;
    this._labelPaddingTop ;
    this._labelPaddingBottom;
    this._labelPaddingLeft;
    this._labelPaddingRight;
    this._labelVRegisterTo;
    this._labelHRegisterTo;
    this._lineTexture;
    this._isZAxis;
    this._position = {x:0, y:0, z:0};
    this._axisNumberOfSegments = 1;


    return this;
};

FLOW.D3.Axis.format = function(pattern) {
    if(pattern == "BC") {
        var bc_format = function(date) {
            var result = d3.time.format("%-Y")(date);
            if(date.getFullYear() < 0) {
                result = result.substr(1,result.length - 1) + " BC";
            }
            return result;
        }
        return bc_format;
    } else {
        return d3.time.format(pattern);
    }
}

FLOW.D3.Axis.prototype.create = function (parentObject, trackLabels) {

    this.d3root = FLOW.D3.select();
    var d3root = this.d3root;

    d3root.createMesh(parentObject);

    this.object = d3root.node().getMesh();

    this.lines = new FLOW.Lines.Lines();
    this.lines.sizeAttenuation = false;

    this.lines.setSize(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio);

    this.trackLabels = trackLabels;

    var scale0 = this.__chart__ || this._scale,
        scale1 = this.__chart__ = this._scale.copy();
    var ticks = this._tickValues == null ? scale1.ticks ? scale1.ticks.apply(scale1, this._tickArguments_) : scale1.domain() : this._tickValues; //ticks is the data, same as tickValues
    var tickFormat = this._tickFormat_ == null ?
        scale1.tickFormat ? scale1.tickFormat.apply(scale1, this._tickArguments_) :
            d3.identity :  this._tickFormat_ ;//String to represent format information for svg code
    var tick = d3root.selectAll("tick");
    var tickData = tick.data(ticks);//, scale1);
    var tickTags = tickData.enter();
    var tickTags = tickTags.append("empty")
        .attr("tags", "tick");



    //var    tickExit = d3.transition(tick.exit()).style("opacity", ?).remove() //fades out any ticks end then removes them
    // var    tickUpdate = d3.transition(tick.order()).style("opacity", 1) //when tick gets draw, fades it in
    var range = d3.scaleRange(scale1); //creates the range array [0,940]

    //var lineEnter = tickEnter.select("line"),
    //    lineUpdate = tickUpdate.select("line");

    // var    textEnter = tickEnter.select("text")
    // var   textUpdate = tickUpdate.select("text")
    var sign = this._orient === "top" || this._orient === "left" ? -1 : 1
    //var x2,  y2;


    //draws the major axis line
    var axisLine = new FLOW.Lines.Line();
    var step = ( range[1] - range[0] ) / this._axisNumberOfSegments
    if (this._orient === "bottom" || this._orient === "top") {
        //  x2 = "x2",
        //      y2 = "y2";

        if (this._isZAxis) {
            for(var z = range[0]; z <= range[1]; z+= step) {
                axisLine.addPoint(new THREE.Vector3(0, 0, z));
            }
            //axisLine.addPoint(new THREE.Vector3(0, 0, range[0]));
            //axisLine.addPoint(new THREE.Vector3(0, 0, range[1]));
        } else {
            for(var x = range[0]; x <= range[1]; x+= step) {
                axisLine.addPoint(new THREE.Vector3(x, 0, 0));
            }
            //axisLine.addPoint(new THREE.Vector3(range[0], 0, 0));
            //axisLine.addPoint(new THREE.Vector3(range[1], 0, 0));
        }
    } else {
        //   x2 = "y2",
        //       y2 = "x2";

        axisLine.addPoint(new THREE.Vector3(0, range[0], 0));
        axisLine.addPoint(new THREE.Vector3(0, range[1], 0));
    }
    axisLine.setColor(new THREE.Color(this._axisLineColor));
    axisLine.setWidth(this._axisLineWidth);
    this.lines.addLine(axisLine);

    //tickTags.attr(y2, sign * this._innerTickSize);
    // tickTags.attr(x2, 0).attr(y2, sign * this._innerTickSize);
    /* if (scale1.rangeBand) {
     var x = scale1
     var dx = x.rangeBand()  / 2 -3;
     scale0 = scale1 = function (d) {
     return x(d) + dx;
     };
     } else if (scale0.rangeBand) {
     scale0 = scale1;
     } else {
     // tickExit.call(tickTransform, scale1, scale0);
     }*/

    this._axisLabelParams = this._axisLabelParams || {};
    this._axisLabelParams.text = this._axisLabel;
    this._axisLabelParams.font = this._axisLabelParams.font || this._font;
    this._axisLabelParams.color = this._axisLabelParams.color || "#FFFFFF";
    this._axisLabelParams.fontSize = this._axisLabelParams.fontSize || this._fontSize;
    this._axisLabelParams.color = this._axisLabelParams.color || this._tickLabelColor;
    this._axisLabelParams.align = this._axisLabelParams.align || this._orient == "left" ? FLOW.Text.ALIGN_RIGHT : FLOW.Text.ALIGN_LEFT;

    if (this._orient === "bottom" || this._orient === "top") {
        tickTags.each(
            function (d, foo, foo1, parentAxis) {
                var labelText = tickFormat(d); // returns a string
                var v0 = scale0(d);
                v0 = (isFinite(v0) ? v0 : scale1(d));
                if (parentAxis._isZAxis) {
                    this.start = {x: 0, y: sign * parentAxis._innerTickSize, z: v0}; //adds the tick placement into the FLOW.D3.Node
                    this.end = {x: 0, y: -sign * parentAxis._outerTickSize, z: v0};
                } else {
                    this.start = {x: v0, y: sign * parentAxis._innerTickSize, z: 0}; //adds the tick placement into the FLOW.D3.Node
                    this.end = {x: v0, y: -sign * parentAxis._outerTickSize, z: 0};
                }
                var axisLine = new FLOW.Lines.Line();
                axisLine.addPoint(new THREE.Vector3(this.start.x, this.start.y, this.start.z));
                axisLine.addPoint(new THREE.Vector3(this.end.x, this.end.y, this.end.z));
                axisLine.setColor(new THREE.Color( parentAxis._tickLineColor ));
                axisLine.setWidth(parentAxis._tickLineWidth);
                parentAxis.lines.addLine(axisLine);

                if (labelText) {

                    this.labelText = new FLOW.Text.Text({
                        text: labelText,
                        font: parentAxis._font,
                        fontSize: parentAxis._fontSize,
                        wrapType: FLOW.Text.WrapType.WRAP_BY_NUMBER_OF_CHARACTERS,
                        wrapValue: parentAxis._wrapValue,//25,
                        align: FLOW.Text.ALIGN_CENTER,
                        color: parentAxis._tickLabelColor
                    });

                    var labelObj = this.labelText.getLayoutObject();
                    this.labelText.setLayoutParams(
                        parentAxis._orient == "top" ? {
                            vRegisterTo: typeof parentAxis._labelVRegisterTo != "undefined" ?  parentAxis._labelVRegisterTo :FLOW.Text.ALIGN_TOP,
                            hRegisterTo: typeof parentAxis._labelHRegisterTo != "undefined" ?
                                typeof parentAxis._labelHRegisterTo == "function"? parentAxis._labelHRegisterTo(d) :
                                    parentAxis._labelHRegisterTo : FLOW.Text.ALIGN_LEFT,
                            paddingTop: typeof parentAxis._labelPaddingTop != "undefined" ? parentAxis._labelPaddingTop : -0.5,
                            paddingLeft: typeof parentAxis._labelPaddingLeft != "undefined" ? parentAxis._labelPaddingLeft : 1
                        } :
                        {
                            vRegisterTo: typeof parentAxis._labelVRegisterTo != "undefined" ?  parentAxis._labelVRegisterTo :FLOW.Text.ALIGN_BOTTOM,
                            hRegisterTo: typeof parentAxis._labelHRegisterTo != "undefined" ?
                                typeof parentAxis._labelHRegisterTo == "function"? parentAxis._labelHRegisterTo(d) :
                                    parentAxis._labelHRegisterTo : FLOW.Text.ALIGN_LEFT,
                            paddingBottom: typeof parentAxis._labelPaddingBottom != "undefined" ? parentAxis._labelPaddingBottom : -0.5,
                            paddingLeft: typeof parentAxis._labelPaddingLeft != "undefined" ? parentAxis._labelPaddingLeft : 1
                        }
                    );
                    labelObj.position.set(this.start.x, this.start.y, this.start.z + 0.001);
                    if (parentAxis._isZAxis) {
                        labelObj.rotation.set( 0, -Math.PI / 2, 0);
                    }
                    parentAxis.object.add(labelObj);
                    if(parentAxis.trackLabels) {
                        this.labelText.getMesh().track();
                    }
                }

            }, this
        );
        if ( this._axisLabel) {


            this.axisLabelText = new FLOW.Text.Text(this._axisLabelParams);
            var labelObj = this.axisLabelText.getLayoutObject();
            this.axisLabelText.setLayoutParams(
                this._orient == "top" ? {
                    vRegisterTo: FLOW.Text.ALIGN_TOP,
                    hRegisterTo: FLOW.Text.ALIGN_CENTER,
                    paddingTop: (typeof this._axisLabelPaddingBottom != "undefined" ? this._axisLabelPaddingBottom : 2) + ( -sign * this._innerTickSize), //TODO: if shown on bottom, use this._innerTickSize
                    paddingLeft: 0
                } :
                {
                    vRegisterTo: FLOW.Text.ALIGN_BOTTOM,
                    hRegisterTo: FLOW.Text.ALIGN_CENTER,
                    paddingBottom: (typeof this._axisLabelPaddingBottom != "undefined" ? this._axisLabelPaddingBottom : 2) + (-sign * this._innerTickSize),
                    paddingLeft: 0
                }
            );
            if (this._isZAxis) {
                labelObj.position.set(0, 0, (range[1] - range[0]) / 2);
                labelObj.rotation.set(0, -Math.PI / 2, 0);
            } else {
                labelObj.position.set((range[1] - range[0]) / 2, 0, 0.001);

            }
            this.object.add(labelObj);
        }
    } else { //LEFT || RIGHT
        tickTags.each(
            function (d, foo, foo1, parentAxis) {
                var labelText = tickFormat(d); // returns a string

                var v0 = scale0(d);
                v0 = (isFinite(v0) ? v0 : scale1(d));

                var axisLine = new FLOW.Lines.Line();
                axisLine.addPoint(new THREE.Vector3(-sign * parentAxis._innerTickSize, v0, 0));
                axisLine.addPoint(new THREE.Vector3(sign * parentAxis._outerTickSize, v0, 0));
                axisLine.setColor(new THREE.Color(parentAxis._tickLineColor));
                axisLine.setWidth(parentAxis._tickLineWidth);
                parentAxis.lines.addLine(axisLine);

                if (labelText) {

                    this.labelText = new FLOW.Text.Text({
                        text: labelText,
                        font: parentAxis._font,
                        fontSize: parentAxis._fontSize,
                        wrapType: FLOW.Text.WrapType.WRAP_BY_NUMBER_OF_CHARACTERS,
                        wrapValue: parentAxis._wrapValue,
                        align: parentAxis._orient == "left" ? FLOW.Text.ALIGN_RIGHT : FLOW.Text.ALIGN_LEFT,
                        color: parentAxis._tickLabelColor
                    });

                    var labelObj = this.labelText.getLayoutObject();
                    this.labelText.setLayoutParams(
                        parentAxis._orient == "left" ? {
                            vRegisterTo: typeof parentAxis._labelVRegisterTo != "undefined" ?  parentAxis._labelVRegisterTo :FLOW.Text.ALIGN_BOTTOM,
                            hRegisterTo: typeof parentAxis._labelHRegisterTo != "undefined" ?
                                typeof parentAxis._labelHRegisterTo == "function"? parentAxis._labelHRegisterTo(d) :
                                    parentAxis._labelHRegisterTo : FLOW.Text.ALIGN_RIGHT,
                            paddingBottom: typeof parentAxis._labelPaddingBottom != "undefined" ? parentAxis._labelPaddingBottom : 2,
                            paddingRight: typeof parentAxis._labelPaddingRight != "undefined" ? parentAxis._labelPaddingRight : -2
                        } :
                        {
                            vRegisterTo: typeof parentAxis._labelVRegisterTo != "undefined" ?  parentAxis._labelVRegisterTo :FLOW.Text.ALIGN_BOTTOM,
                            hRegisterTo: typeof parentAxis._labelHRegisterTo != "undefined" ?
                                typeof parentAxis._labelHRegisterTo == "function"? parentAxis._labelHRegisterTo(d) :
                                    parentAxis._labelHRegisterTo : FLOW.Text.ALIGN_LEFT,
                            paddingBottom: typeof parentAxis._labelPaddingBottom != "undefined" ? parentAxis._labelPaddingBottom : 2,
                            paddingLeft: typeof parentAxis._labelPaddingLeft != "undefined" ? parentAxis._labelPaddingLeft : 1
                        }
                    );
                    labelObj.position.set(sign * parentAxis._outerTickSize, v0, 0.01);
                    parentAxis.object.add(labelObj);
                    if(parentAxis.trackLabels) {
                        this.labelText.getMesh().track();
                    }
                }
            }, this

        );

        if ( this._axisLabel) {

            this.axisLabelText = new FLOW.Text.Text(this._axisLabelParams);
            var labelObj = this.axisLabelText.getLayoutObject();
            this.axisLabelText.setLayoutParams(
                this._orient == "left" ? {
                    vRegisterTo: FLOW.Text.ALIGN_BOTTOM,
                    hRegisterTo: FLOW.Text.ALIGN_CENTER,
                    paddingTop: 0,
                    paddingLeft: 0//(typeof this._axisLabelPaddingLeft != "undefined" ? this._axisLabelPaddingLeft : 5) + (sign * this._outerTickSize)
                } :
                {
                    vRegisterTo: FLOW.Text.ALIGN_BOTTOM,
                    hRegisterTo: FLOW.Text.ALIGN_CENTER,
                    paddingBottom: 0,//(typeof this._axisLabelPaddingLeft != "undefined" ? this._axisLabelPaddingLeft : -5) + (-sign * this._outerTickSize),
                    paddingLeft: 0
                }
            );
            labelObj.rotation.set( 0, (this._isZAxis)? -Math.PI / 2 : 0 , -Math.PI/2)

            labelObj.position.set(   (typeof this._axisLabelPaddingRight != "undefined" ? this._axisLabelPaddingRight: 4*sign) + (sign * this._outerTickSize),
                (range[1] - range[0]) / 2,  0.001);
            this.object.add(labelObj);
        }
    }


    var linesMesh = this.lines.buildMesh();
    if (this._lineTexture) {
        this.lines.setTexture(this._lineTexture);
    }
    this.object.add(linesMesh);
    this.object.position.set(this._position.x, this._position.y, this._position.z);
    return this.object;
};

/** Call update to get the labels to look toward the camera */
FLOW.D3.Axis.prototype.update = function(){
    var ticks = this.d3root.selectAll("tick");
};

FLOW.D3.Axis.prototype.getCenterObject = function() {
    var middleTick =  Math.round(this.d3root.node().mesh.children.length/2);
    return this.d3root.node().mesh.children[middleTick ];
};

FLOW.D3.Axis.prototype.scale = function (x) {
    if (!arguments.length) return this._scale;
    this._scale = x;
    return this;
};
FLOW.D3.Axis.prototype.axisNumberOfSegments = function(x) {
    if(x < 1) {
        throw "FLOW.D3.Axis axisNumberOfPoints can't be less than 1";
    }
    this._axisNumberOfSegments = x;
    return this;
};
FLOW.D3.Axis.prototype.orient = function (x) {
    if (!arguments.length) return this._orient;
    this._orient = x in  {top: 1, right: 1, bottom: 1, left: 1} ? x + "" : "bottom";
    return this;
};
FLOW.D3.Axis.prototype.ticks = function () {
    if (!arguments.length) return this._tickArguments_;
    this._tickArguments_ = d3.array(arguments);
    return this;
};
FLOW.D3.Axis.prototype.divisions = function (x) {
    if (!arguments.length) return this._divisions;
    this._divisions = x;
    this._tickArguments_[0] = this._divisions;
    return this;
};
FLOW.D3.Axis.prototype.tickValues = function (x) {
    if (!arguments.length) return this._tickValues;
    this._tickValues = x;
    return this;
};
FLOW.D3.Axis.prototype.tickFormat = function (x) {
    if (!arguments.length) return this._tickFormat_;
    this._tickFormat_ = x;
    return this;
};
FLOW.D3.Axis.prototype.tickSize = function (x) {
    var n = arguments.length;
    if (!n) return this._innerTickSize;
    this._innerTickSize = +x;
    this._outerTickSize = +arguments[n - 1];
    return this;
};
FLOW.D3.Axis.prototype.innerTickSize = function (x) {
    if (!arguments.length) return this._innerTickSize;
    this._innerTickSize = +x;
    return this;
};
FLOW.D3.Axis.prototype.outerTickSize = function (x) {
    if (!arguments.length) return this._outerTickSize;
    this._outerTickSize = +x;
    return this;
};
FLOW.D3.Axis.prototype.tickPadding = function (x) {
    if (!arguments.length) return this._tickPadding;
    this._tickPadding = +x;
    return this;
};
FLOW.D3.Axis.prototype.tickSubdivide = function () {
    return arguments.length && this;
};
FLOW.D3.Axis.prototype.axisLineWidth = function (x) {
    if (!arguments.length) return this._axisLineWidth;
    this._axisLineWidth = +x;
    return this;
};
FLOW.D3.Axis.prototype.tickLineWidth = function (x) {
    if (!arguments.length) return this._tickLineWidth;
    this._tickLineWidth = +x;
    return this;
};
FLOW.D3.Axis.prototype.font = function (x) {
    if (!arguments.length) return this._font;
    this._font = x;
    return this;
};
FLOW.D3.Axis.prototype.fontSize = function (x) {
    if (!arguments.length) return this._fontSize;
    this._fontSize = x;
    return this;
};
FLOW.D3.Axis.prototype.wrapValue = function (x) {
    if (!arguments.length) return this._wrapValue;
    this._wrapValue = x;
    return this;
};
FLOW.D3.Axis.prototype.tickLabelColor = function (x) {
    if (!arguments.length) return this._tickLabelColor;
    this._tickLabelColor = x;
    return this;
};
FLOW.D3.Axis.prototype.tickLineColor = function (x) {
    if (!arguments.length) return this._tickLineColor;
    this._tickLineColor = x;
    return this;
};
FLOW.D3.Axis.prototype.axisLineColor = function (x) {
    if (!arguments.length) return this._axisLineColor;
    this._axisLineColor = x;
    return this;
};
FLOW.D3.Axis.prototype.labelPadding = function (top, right, bottom, left) {
    if (!arguments.length) return [this._labelPaddingTop, this._labelPaddingRight, this._labelPaddingBottom, this._labelPaddingLeft ];
    this._labelPaddingTop = top;
    this._labelPaddingRight = right;
    this._labelPaddingBottom = bottom;
    this._labelPaddingLeft = left;
    return this;
};
FLOW.D3.Axis.prototype.labelPaddingTop = function (x) {
    if (!arguments.length) return this._labelPaddingTop;
    this._labelPaddingTop = x;
    return this;
};
FLOW.D3.Axis.prototype.labelPaddingBottom = function (x) {
    if (!arguments.length) return this._labelPaddingBottom;
    this._labelPaddingBottom = x;
    return this;
};
FLOW.D3.Axis.prototype.labelPaddingLeft = function (x) {
    if (!arguments.length) return this._labelPaddingLeft;
    this._labelPaddingLeft = x;
    return this;
};
FLOW.D3.Axis.prototype.labelPaddingRight = function (x) {
    if (!arguments.length) return this._labelPaddingRight;
    this._labelPaddingRight = x;
    return this;
};
FLOW.D3.Axis.prototype.labelHRegisterTo = function (x) {
    if (!arguments.length) return this._labelHRegisterTo;
    this._labelHRegisterTo = x;
    return this;
};
FLOW.D3.Axis.prototype.labelVRegisterTo = function (x) {
    if (!arguments.length) return this._labelVRegisterTo;
    this._labelVRegisterTo = x;
    return this;
};
FLOW.D3.Axis.prototype.lineTexture = function (x) {
    if (!arguments.length) return this._lineTexture;
    this._lineTexture = x;
    return this;
};
FLOW.D3.Axis.prototype.isZAxis = function (x) {
    if (!arguments.length) return this._isZAxis;
    this._isZAxis = x;
    return this;
};
FLOW.D3.Axis.prototype.axisLabel = function (x) {
    if (!arguments.length) return this._axisLabel;
    this._axisLabel = x;
    return this;
};
FLOW.D3.Axis.prototype.axisLabelParams = function (x) {
    if (!arguments.length) return this._axisLabelParams;
    this._axisLabelParams = x;
    return this;
};
FLOW.D3.Axis.prototype.axisLabelPaddingBottom = function (x) {
    if (!arguments.length) return this._axisLabelPaddingBottom;
    this._axisLabelPaddingBottom = x;
    return this;
};
FLOW.D3.Axis.prototype.axisLabelPaddingRight = function (x) {
    if (!arguments.length) return this._axisLabelPaddingRight;
    this._axisLabelPaddingRight = x;
    return this;
};
FLOW.D3.Axis.prototype.position = function (x) {
    if (!arguments.length) return this._position;
    this._position = x;
    return this;
};



FLOW.D3.Text = function( params, parentObject3D ) {
    this.object = new FLOW.Text.Text( params );
    this.mesh = this.object.buildMesh();
    this.mesh.frustumCulled = false;
    if (this._position) {
        this.mesh.position = this._position;
    }
    parentObject3D.add(this.mesh);
    return this;
};



FLOW.D3.Object3D = function( params, parentObject3D ) {
    this.object = new THREE.Object3D(  );
    // this.layout = this.object.create(this.__data__, params, this._position);
    parentObject3D.add(this.object);
    return this;
};



FLOW.D3.TextLayout = function() {

    return this;
};

/*
 [
 {"text":"Information Overload", "items":[
 {"text":"We receive\nmore information than we did in 1986",  "fontSize":0.2, "font":"Space Mono Bold", "position":[0,0,0] },
 {"text":"5x",  "fontSize":0.5, "font":"Space Mono Bold",   "position":[1,0,0] }
 ]},
 {"text":"100 Million", "items":[
 {"text":"hours of video are watched each day on",  "fontSize":0.2, "font":"Space Mono Bold", "position":[0,0,0] },
 {"text":"YouTube",  "fontSize":0.5, "font":"Space Mono Bold",   "position":[1,0,0] }
 ]}
 ]
 */
FLOW.D3.TextLayout.prototype.create = function(dataSource, params, parentObject3D, position, callback) {

    this.params = params;

    var root = FLOW.D3.select();
    root.createMesh();
    this.rootNode = root.node();
    root.object = root.node().getMesh();
    if (position) {
        root.object.position.set(position.x, position.y, position.z);
    }
    parentObject3D.add(root.object);


    d3.json( dataSource, function (err, data) {
        var dataLength = data.length;

        var selection = root.selectAll("text")
            .data(data)
            .enter()
            .append("object")
            .create()
            .each(function (d, index, foo, rootObject3D) {
                if (d.bounds) {
                    params.bounds = d.bounds;
                }
                if (d.text) {
                    FLOW.D3.createTextFromData(d, this, this.object, rootObject3D, index, data.length, params);
                }

            }, parentObject3D);

        if (callback) callback();
    });

    return this;

};


FLOW.D3.TextLayouts = function() {
    this.object = null; //the 3DObject
    return this;
};

/*
 [
 {"text":"Information Overload", "items":[
 {"text":"We receive\nmore information than we did in 1986",  "fontSize":0.2, "font":"Space Mono Bold", "position":[0,0,0] },
 {"text":"5x",  "fontSize":0.5, "font":"Space Mono Bold",   "position":[1,0,0] }
 ]},
 {"text":"100 Million", "items":[
 {"text":"hours of video are watched each day on",  "fontSize":0.2, "font":"Space Mono Bold", "position":[0,0,0] },
 {"text":"YouTube",  "fontSize":0.5, "font":"Space Mono Bold",   "position":[1,0,0] }
 ]}
 ]
 */
FLOW.D3.TextLayouts.prototype.create = function(dataSource, params, parentObject3D, position, callback) {

    this.params = params;

    var root = FLOW.D3.select();
    root.createMesh(parentObject3D);
    this.rootNode = root.node();
    this.object = root.node().getMesh();
    var object = this.object;
    parentObject3D.add(this.object);

    d3.json( dataSource, function (err, data) {

        var selection = root.selectAll("text")
            .data(data)
            .enter()
            .append("object")
            .create()
            .each(function (d, index) {
                if (d.text) {
                    // FLOW.D3.createTextFromData(d, this.object, parentObject3D);
                    var params = {
                        text: d.text,
                        font: "Open Sans",
                        fontSize: 0.2,
                        align: FLOW.Text.ALIGN_CENTER,
                        wrapType: FLOW.Text.WrapType.WRAP_BY_WIDTH,
                        wrapValue: 40,
                        opacity: 1.0,
                        color: "white"
                    };
                    this.mainText = new FLOW.Text.Text(params);
                    var textMesh = this.mainText.buildMesh();
                    textMesh.position.set(0, 1, 0);
                    if (d.parentObjectId) {
                        var theObject = parentObject3D.parent.getObjectByName(d.parentObjectId);
                        if (! theObject) {
                            throw "FLOW.D3.TextLayout: can't find parent object id" + d.parentObjectId
                        }
                        theObject.add(textMesh);
                    } else {
                        this.object.add(textMesh);
                    }

                    if (d.position) {
                        this.mainText.setPosition([d.position.x, d.position.y, d.position.z]);
                    }
                }


                if (d.items) {
                    //TODO: synchronize this code with FLOW.LOD.TextLayout and
                    //    FLOW.D3.TextLayoutSphere and maybe FLOW.D3.TextCloudLayout
                    //  What is the right way to do nested TextLayouts N-levels deep?
                    // Document all teh different overlappign funcitonalities and build a single system that
                    //    can handle all the permuations, and is flexible enough to add new permutations.

                    /* var itemsLayout = new FLOW.D3.TextLayout();
                     itemsLayout.create(d.items, this.params, )*/
                    var dataItems = FLOW.D3.select();
                    var selection = dataItems.selectAll("text")
                        .data(d.items)
                        .enter()
                        .append("text")
                        .params({
                            font: "Open Sans",
                            fontSize: 0.7,
                            align: FLOW.Text.ALIGN_CENTER,
                            wrapType: FLOW.Text.WrapType.WRAP_BY_WIDTH,
                            wrapValue: 16,
                            opacity: 1.0,
                            color: "yellow"
                        })
                        .param("text", function (d) {
                            return d.text;
                        })
                        .param("font", function (d) {
                            return d.font ? d.font : undefined;
                        })
                        .param("fontSize", function (d) {
                            return d.fontSize;
                        })

                        .each(function (d, index, foo3, parentNode) {
                            //NOte: instead of calling .create on the selection, we'll build it by hand:
                            this.textObject = new FLOW.Text.Text(this.params);
                            this.mesh = this.textObject.buildMesh();
                            this.mesh.frustumCulled = false;
                            if (d.position) {
                                this.mesh.position.set(d.position[0], d.position[1], d.position[2]);
                            }

                            if (parentNode.__data__.parentObjectId) {
                                var theObject = parentObject3D.parent.getObjectByName(parentNode.__data__.parentObjectId);
                                if (! theObject) {
                                    throw "FLOW.D3.TextLayout: can't find parent object id" + parentNode.__data__.parentObjectId
                                }
                                theObject.add(this.mesh);
                            } else {
                                parentNode.object.add(this.mesh);
                            }

                            if (d.rotation) {
                                this.mesh.rotation.set(d.rotation[0] * FLOW.MathUtils.degreesToRadians,
                                    d.rotation[1] * FLOW.MathUtils.degreesToRadians,
                                    d.rotation[2] * FLOW.MathUtils.degreesToRadians);
                            }
                            this.mesh.name = d.text;
                            // this.mesh.lookAt(new THREE.Vector3(0,0,0))
                            parentNode.children.push(this);
                        }, this);
                }

                if (d.positioning) {
                    if (d.positioning == "byObject") {
                        var theObject = parentObject3D.parent.getObjectByName(d.objectId);
                        if (! theObject) {
                            throw "FLOW.D3.TextLayout: can't find object" + d.objectId
                        }
                        if (d.position) {
                            this.object.position.set(d.position.x +theObject.position.x, d.position.y + theObject.position.y, d.position.z + theObject.position.z);
                        } else {
                            this.object.position.set(theObject.position.x, theObject.position.y, theObject.position.z);
                        }
                    }
                } else {
                    if (d.position) {
                        this.object.position.set(d.position.x , d.position.y , d.position.z );
                    }
                }
                /*var position = FLOW.MathUtils.sphere(index, dataLength, sphereRadius);
                 this.object.position.set(position.x, position.y, position.z);
                 this.object.lookAt(new THREE.Vector3(0,0,0))//root.node().getMesh().position);*/


            })

        if (callback) callback();
    });

    return this;
};

FLOW.D3.createTextFromData = function( d, node, groupObject, rootObject3D, index, dataLength, parentParams, priorBounds ) {
    priorBounds = priorBounds || [];
    if (d.text) {
        node.params = node.params || {};
        var params = {
            text: d.text || node.params.text,
            font: d.font || node.params.font || "Open Sans",
            fontSize: d.fontSize || node.params.fontSize || 1,
            align: FLOW.Text.getAlignmentValue( d.align )|| FLOW.Text.ALIGN_CENTER,
            wrapType: d.wrapType || FLOW.Text.WrapType.WRAP_BY_WIDTH,
            wrapValue: d.wrapValue || 40,
            opacity: 1.0,
            color: d.color || node.params.color || "white"
        };

        node.text = new FLOW.Text.Text(params);

        node.mesh = node.text.buildMesh();
        node.mesh.name = d.text;
        node.mesh.frustumCulled = false;

        if (d.parentObjectId) {
            var theObject = rootObject3D.getObjectByName(d.parentObjectId);
            if (!theObject) {
                throw "FLOW.D3.TextLayout: can't find parent object id" + d.parentObjectId
            }
            theObject.add(node.mesh);
        } else {
            groupObject.add(node.mesh);
        }

        var bBox = node.text.getBoundingBox();
        paddingLeft = d.paddingLeft || 0;
        paddingRight = d.paddingRight ||0;
        paddingTop = d.paddingTop || 0;
        paddingBottom = d.paddingBottom || 0;
        vRegisterTo= FLOW.Text.getAlignmentValue( d.vRegisterTo );
        hRegisterTo= FLOW.Text.getAlignmentValue( d.hRegisterTo );

        var offsetH = hRegisterTo == FLOW.Text.ALIGN_LEFT ? -bBox._min.x + paddingLeft:
            hRegisterTo == FLOW.Text.ALIGN_RIGHT ? -bBox._max.x - paddingRight : 0;
        var offsetV = vRegisterTo == FLOW.Text.ALIGN_TOP ? -bBox._min.y - paddingTop:
            vRegisterTo == FLOW.Text.ALIGN_BOTTOM ? -bBox._max.y + paddingBottom : 0;


        position = d.position ? {x: d.position[0]+ offsetH, y: d.position[1]+ offsetV, z:d.position[2]  } :
            {x:0 + offsetH, y:0+ offsetV, z:0 };


        if (d.rotation) {
            node.mesh.rotation.set(d.rotation[0] * FLOW.MathUtils.degreesToRadians,
                d.rotation[1] * FLOW.MathUtils.degreesToRadians,
                d.rotation[2] * FLOW.MathUtils.degreesToRadians);
        }

        if (d.positioning == "sphere") {
            var sphere = FLOW.MathUtils.sphere(index, dataLength, parentParams.sphereRadius || 7);
            groupObject.position.set(position.x + sphere.x, position.y +sphere.y, position.z +sphere.z);
            groupObject.lookAt(new THREE.Vector3(position.x, position.y, position.z)); //root.node().getMesh().position);

        } else if (d.positioning == "circle") {
            var vector = FLOW.MathUtils.distributeVector3InCircumference(parentParams.circleRadius, index, dataLength, "yAxis", 0);
            groupObject.position.set(position.x +vector.x, position.y + vector.y, position.z +vector.z);
            groupObject.rotation.set(0, index * 360 / dataLength * FLOW.MathUtils.degreesToRadians, 0);
            groupObject.lookAt(new THREE.Vector3(position.x, position.y, position.z)); //root.node().getMesh().position);

        } else if (d.positioning == "wordcloud") {
            var isIntersected = false;
            var isDone = false;
            for (var k = 0; k < 100 && !isDone; k++) { //try 100 times before giving up
                //TODO: be more efficient than using random: spiral out from center?
                var proposedPosition = {
                    x: FLOW.MathUtils.randomBetweenFloat(parentParams.bounds.minX, parentParams.bounds.maxX),
                    y: FLOW.MathUtils.randomBetweenFloat(parentParams.bounds.minY, parentParams.bounds.maxY)
                };
                var bBox = node.text.getBoundingBox();
                var bBoxMin = bBox.getMin();
                var bBoxMax = bBox.getMax();
                var widthDiv2 = Math.abs(bBoxMax.x - bBoxMin.x) / 2;
                var heightDiv2 = Math.abs(bBoxMax.y - bBoxMin.y) / 2;

                var proposedRect = [{x: proposedPosition.x - widthDiv2, y: proposedPosition.y + heightDiv2},
                    {x: proposedPosition.x + widthDiv2, y: proposedPosition.y + heightDiv2},
                    {x: proposedPosition.x + widthDiv2, y: proposedPosition.y - heightDiv2},
                    {x: proposedPosition.x - widthDiv2, y: proposedPosition.y - heightDiv2}];

                for (var i = 0; i < priorBounds.length; i++) {
                    // console.log("testing " + d.text + " against #" +i );
                    isIntersected = FLOW.MathUtils.doPolygonsIntersect(proposedRect, priorBounds[i]);
                    if (isIntersected) {
                        break; //try again
                    }
                }
                if (!isIntersected) {
                    node.mesh.position.set(proposedPosition.x + position.x, proposedPosition.y + position.y, position.z);
                    priorBounds.push(proposedRect);
                    isDone = true
                }
            }
            if (!isDone) {
                console.log("FLOW.D3.TextCloudLayout: text '" + d.text + "' is too big to fit in the wordcloud.")
            }

        } else if (d.positioning == "topdown") {
            var isIntersected = false;
            var isDone = false;

            var bBox = node.text.getBoundingBox();
            var bBoxMin = bBox.getMin();
            var bBoxMax = bBox.getMax();
            var widthDiv2 = Math.abs(bBoxMax.x - bBoxMin.x) / 2;
            var heightDiv2 = Math.abs(bBoxMax.y - bBoxMin.y) / 2;

            var x = FLOW.MathUtils.randomBetweenFloat(parentParams.bounds.minX, parentParams.bounds.maxX);
            if (priorBounds.length) {
                var y = priorBounds[priorBounds.length - 1][3].y - heightDiv2 - 0.1;
            } else {
                y = heightDiv2 +parentParams.bounds.minY;
            }

            node.mesh.position.set(x +position.x, y +position.y, position.z);
            priorBounds.push(   [{x: x - widthDiv2, y: y + heightDiv2},
                {x: x + widthDiv2, y: y + heightDiv2},
                {x: x + widthDiv2, y: y - heightDiv2},
                {x: x - widthDiv2, y: y - heightDiv2}] );

        } else {
            var x = parentParams.bounds ? parentParams.bounds.minX || 0 : 0;
            var y = parentParams.bounds ? parentParams.bounds.minY || 0 : 0;
            node.mesh.position.set(x+position.x, y+position.y, position.z);
        }

        if (d.items) {
            var dataItems = FLOW.D3.select();
            dataItems.createMesh();
            dataItems.rootNode = dataItems.node();
            node.add(dataItems.rootNode);
            dataItems.object = dataItems.node().getMesh();
            groupObject.add(dataItems.object);
            var dataLength = d.items.length;
            // var priorBounds = [];
            var selection = dataItems.selectAll("text")
                .data(d.items)
                .enter()
                .append("object")
                .create()
                /*  .params({
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
                 return d.font ? d.font : undefined;
                 })
                 .param("fontSize", function (d) {
                 return d.fontSize;
                 })
                 */
                .each(function (d, index, foo3, rootObject3D) {

                    FLOW.D3.createTextFromData(d, this, this.object, rootObject3D, index, dataLength, parentParams, priorBounds);
                    //this.parentNode.add(this);
                    // this.parentNode.children.push(this);


                }, dataItems.object);
        }
    }
};


FLOW.D3.TextCloudLayout = function() {
    this.object = null; //the 3DObject
    return this;
};

/*
 TODO: word rotation not implemented. Need to get worldspace corners when rotated
 Example data:
 [
 {"text":"hours ",  "fontSize":0.2, "font":"Space Mono Bold", "rotDegrees":90 },
 {"text":"YouTube",  "fontSize":0.5, "font":"Space Mono Bold" }
 ]
 */
FLOW.D3.TextCloudLayout.prototype.create = function(dataSource, params, parentObject3D, position, callback) {

    var root = FLOW.D3.select();
    root.createMesh(parentObject3D);
    this.rootNode = root.node();
    this.rootNode.params = params;
    this.object = root.node().getMesh();
    var object = this.object;
    parentObject3D.add(this.object);
    var priorBounds =[];

    d3.json( dataSource, function (err, data) {
        var selection = root.selectAll("text")
            .data(data)
            .enter()
            .append("object")
            .create()
            .each(function (d, index) {
                if (d.text) {
                    var params = {
                        text: d.text,
                        font: d.font || "Open Sans",
                        fontSize: d.fontSize ||1,
                        align: FLOW.Text.ALIGN_CENTER,
                        wrapType: FLOW.Text.WrapType.WRAP_BY_WIDTH,
                        wrapValue: 40,
                        opacity: 1.0,
                        color: "white"
                    };
                    this.text = new FLOW.Text.Text(params);
                    var textMesh = this.text.buildMesh();
                    if (d.rotation) { //TODO: implement rotation
                        //  textMesh.rotation.set(0, 0, d.rotation * FLOW.MathUtils.degreesToRadians);
                    }
                    object.add(textMesh);
                    var isIntersected = false;
                    var isDone = false;
                    for  ( var k= 0; k < 100 && ! isDone ; k++) { //try 100 times before giving up
                        //TODO: be more efficient than using random: spiral out from center?
                        var proposedPosition = {
                            x: FLOW.MathUtils.randomBetween(this.parentNode.params.bounds.minX, this.parentNode.params.bounds.maxX),
                            y: FLOW.MathUtils.randomBetween(this.parentNode.params.bounds.minY, this.parentNode.params.bounds.maxY)
                        };
                        var bBox = this.text.getBoundingBox();
                        var bBoxMin = bBox.getMin();
                        var bBoxMax = bBox.getMax();
                        var widthDiv2 =Math.abs(bBoxMax.x - bBoxMin.x) /2;
                        var heightDiv2 = Math.abs(bBoxMax.y - bBoxMin.y) /2;

                        var proposedRect = [{x: proposedPosition.x - widthDiv2, y: proposedPosition.y + heightDiv2},
                            {x: proposedPosition.x + widthDiv2, y: proposedPosition.y + heightDiv2},
                            {x: proposedPosition.x + widthDiv2, y: proposedPosition.y - heightDiv2},
                            {x: proposedPosition.x - widthDiv2, y: proposedPosition.y - heightDiv2}];

                        for (var i = 0; i < priorBounds.length; i++) {
                            // console.log("testing " + d.text + " against #" +i );
                            isIntersected = FLOW.MathUtils.doPolygonsIntersect(proposedRect, priorBounds[i]);
                            if (isIntersected) {
                                break; //try again
                            }
                        }
                        if (!isIntersected){
                            textMesh.position.set(proposedPosition.x, proposedPosition.y, 0 );
                            priorBounds.push( proposedRect );
                            isDone = true
                        }
                    }
                    if (!isDone) {
                        console.log("FLOW.D3.TextCloudLayout: text '" + d.text +"' is too big to fit in the wordcloud.")
                    }
                }
            },this, dataSource)

        if (callback) callback();
    });

    return this;

};

FLOW.D3.loadTopologyFile = function(topologyFile, callback){
    d3.json( topologyFile,
        function (error, topology) {
            if (error) {
                console.log( error.response);
                if (callback) {callback( null) }
                return;
            }
            callback(topology);
        }
    );
};


/**
 *
 * @param texture
 * @param canvas
 * @param width
 * @param height
 * @param topoJsonFile
 * @param d3GeoProjection, ex: d3.geo.equirectangular
 * @param callback
 */
FLOW.D3.drawMapToCanvas = function( texture, canvas, width, height, topology,
                                    d3GeoProjection, topologyItem, callback ) {

    var projection = d3GeoProjection()
        .translate([width / 2, height / 2])
        .scale(height / Math.PI)

    var svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgElement.style.visibility = 'hidden';
    document.body.appendChild(svgElement);

    var svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)

    var path = d3.geo.path()
        .projection(projection);

    var g = svg.append("g");

    g.selectAll("path")
        .data(topojson.object(topology, topology.objects[topologyItem]) //topology.objects.SYR_adm1 //topology.objects.countries
            .geometries)
        .enter()
        .append("path")
        .attr("d", path)
        .style('fill', '#444')
        .style('stroke', '#777')
        .style('stroke-width', '0.5px')


    // select a country by Id and change its styling
    g.selectAll('path')
        .filter(function (d) {
            return d.id === 760
        })
        .style('fill', 'red')
        .style('stroke', '#fff')
        .style('stroke-width', '2px');

    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");

    var img = new Image();
    img.width = width;
    img.height = height;

    svgElement.style.visibility = 'visible';
    var svgData = (new XMLSerializer()).serializeToString(svgElement);
    img.setAttribute("src", "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(svgData))));
    svgElement.style.visibility = 'hidden';
    document.body.removeChild(svgElement);

    img.onload = function () {
        ctx.drawImage(img, 0, 0);//, 4096, 2048);

        texture.needsUpdate = true;

        if (callback) {
            callback(texture)
        }
    };


};

/**
 * this.categorizedPositions is a map that holds all the arrays of categorized positions,.
 * For Example: this.categorizedPositions["count"] = [ array of Vectors ]
 *
 * @param params
 * @param animations
 * @returns {FLOW.D3.PointData}
 * @constructor
 */
FLOW.D3.PointData = function(params, animations) {
    this.params = params || {};

    this.params.pointsPerColumn = this.params.pointsPerColumn || 4;
    this.scaleAll = this.params.scaleAll || 0.01;
    this.params.categoryWidth = this.params.categoryWidth ? this.params.categoryWidth * this.scaleAll : 50 *this.scaleAll;
    this.params.position = this.params.position || {x:0, y:0, z:0};
    this.params.position.x = this.params.position.x * this.scaleAll;
    this.params.position.y = this.params.position.y * this.scaleAll;
    this.params.position.z = this.params.position.z * this.scaleAll;
    this.categorizedVerticalSpacing = this.params.categorizedVerticalSpacing  ?
        this.params.categorizedVerticalSpacing * this.scaleAll : 1 * this.scaleAll;
    this.gridVerticalSpacing = this.params.gridVerticalSpacing  ?
        this.params.gridVerticalSpacing * this.scaleAll : 1 * this.scaleAll;
    this.animations = animations;
    this.onCollisionStarted = this.params.onCollisionStarted || null;
    this.onCollisionFinished = this.params.onCollisionFinished || null;
    this.onSelected = this.params.onSelected || null;

    //TODO: make this parameterizable
    this.labelParams = {
        font: "Open Sans" ,
        fontSize: 0.2,
        align: FLOW.Text.ALIGN_CENTER,
        wrapType: FLOW.Text.WrapType.WRAP_BY_WIDTH,
        wrapValue: 40,
        opacity: 1.0,
        color: "white",
        orient: "top",
        labelVRegisterTo: FLOW.Text.ALIGN_TOP,
        labelHRegisterTo : FLOW.Text.ALIGN_CENTER,
        labelPaddingTop : 0,//0.1,
        labelPaddingLeft:0,// 0.1,
        labelPaddingBottom: 0,//0.1,
        labelPaddingRight: 0,//0.1,
        trackLabels:true
    };
    this.categorizedPositions = {};

    return this;
};


FLOW.D3.PointData.prototype.loadGeoData = function(whichDataFile, whichAttribute, mapView, countriesMap, parentObject, callback) {

    this.countriesMap = countriesMap;
    this.mapView = mapView;
    this.parentObject = parentObject

    d3.csv(whichDataFile, function (err, json) {
        console.log("loadGeoData");

        //calculate  counts in each category.
        json.forEach(function (d, i) {
            /*
             Lat  :  "39.9075"
             Lon : "116.39723"
             capitalcity  : "Beijing"
             country  :  "CN"
             pop  : "20693000"
             */
            if (!  this.countriesMap[d[whichAttribute]] ){
                console.log("countriesMap missing: "+ d[whichAttribute])
                return;
            }
            this.countriesMap[d[whichAttribute]].count++;
        }, this);


        //this.removeData();
        //TODO: implement lines and columns as well in these funcitons or somewhere else?
        this.showLines = false;//templateSelect.value == "lines" || templateSelect.value == "both";
        this.showColumns = true;//templateSelect.value == "columns" || templateSelect.value == "both";

        var maxRange = d3.max(json, function(d) { return Number(d["pop"]); });
        this.mapView.magScale = d3.scale.sqrt()
            .range([0, this.mapView.maxBarHeight]).domain([0, maxRange]);

        this.mapView.sizeScale = d3.scale.sqrt()
            .range([0, this.mapView.maxBarWidth]).domain([0, maxRange]);
        if (callback) {
            callback(json)
        }
       // this.renderData( json, "geo");//whichAttribute); "country" or "geo"


    }.bind(this));

};

FLOW.D3.PointData.prototype.createPointCloud = function(parentObject, totalNodeCount) {
    console.log("createPointCloud")
    var geometry = new THREE.Geometry();
    //TODO: how to instantiate an array full of Vector3s
    // this.vertices = [];//new Float32Array( totalNodeCount  * 3 ); // three components per vertex
    //this.colors =[];//new Float32Array(totalNodeCount * 3);


    geometry.vertices = [];
    geometry.colors = [];

    var material = new THREE.PointsMaterial({
        vertexColors: true,
        size: this.params.pointSize * this.scaleAll,//this.nodeSize,
        //sizeAttenuation:false
    });
    if (this.params.map) {
        material.map = this.params.map;
        material.transparent = true;
        material.depthTest = false;
       // material.depthWrite = true;
    }
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.name = "points";

    //TODO: move the onCollisionStarted out to the root level
    if (this.onCollisionStarted) {
        this.points.onCollisionStarted = function (obj) {

            var tmp = app.mapView.root.selectAll("point")[0]       
            var point;
            if(obj.index == 0) {
                point = tmp[tmp.length - 1];
            } else if(obj.index == tmp.length - 1){
                point = tmp[0];
            } else {
                point = tmp[obj.index - 1];
            }

            //var point = app.mapView.root.selectAll("point")[0][obj.index];
            if (! point ) {
                console.log("PointData onCollision failed");
                return;
            }
            console.log("PointData onCollisionStarted: " + point.__data__.city);
            this.onCollisionStarted(point, obj);
        }.bind(this);
    }
    if (this.onCollisionFinished) {
        this.points.onCollisionFinished = function (obj) {
            var point = app.mapView.root.selectAll("point")[0][obj.index]
            console.log("PointData onCollisionFinished: " + point.__data__.city);
            this.onCollisionFinished(point);
        }.bind(this);
    }
    if (this.onSelected) {
        this.points.onSelected = function (obj) {
            var point = app.mapView.root.selectAll("point")[0][obj.index]
            console.log("PointData onSelected: " + point.__data__.city);
            this.onSelected(point, obj);
        }.bind(this);
    }

    return this.points;
};

FLOW.D3.PointData.prototype.setPointSize = function(newSize) {
    this.points.material.size = newSize * this.scaleAll;
}


FLOW.D3.PointData.prototype.renderData= function(json, whichAttribute){
    //limits the data set to 1000 items
    var data = json;// d3.shuffle(json).slice(0, 1000);
    var categoryWidth = this.params.categoryWidth;

    var availableCategoriesBBox = this.calculateCategoryPositions( this.countriesMap, categoryWidth, this.params.position, "count" );//


    var pointVertices = [];
    var pointColors = [];

    //calculates the max extent of each dimension
    var center = availableCategoriesBBox.getCenter();

    var categorizationAttribute = "code2" ; //TODO: parameterize this

    this.positionsOfCitiesCategorizedByCountry = [];

    //Calculate positions for categorized by country
    var points = this.mapView.root.selectAll("point")
        .data(data).enter()
        .append("empty").each(function (d) {
            //calculate positions and place in teh datastructure

            var thisCategory = this.countriesMap[d[categorizationAttribute]];
            if (typeof thisCategory == "undefined") {
                console.log("category missing: " + d[categorizationAttribute]);
            }
            j = thisCategory.priorIndex % this.params.pointsPerColumn;
            i = Math.floor(thisCategory.priorIndex / this.params.pointsPerColumn);

            var position = this.positionNodeFlatCategory(thisCategory.priorIndex, i, j, thisCategory.countPosition, this.categorizedVerticalSpacing);
            d[whichAttribute + "Position"] = position;
            this.positionsOfCitiesCategorizedByCountry.push(position[0] - center.x + this.params.position.x);
            this.positionsOfCitiesCategorizedByCountry.push(position[1] - center.y + this.params.position.y);
            this.positionsOfCitiesCategorizedByCountry.push(position[2] - center.z + this.params.position.z);
            thisCategory.priorIndex++;
        }.bind(this));

    this.geoPositions = [];

    //Calculate positions for on-spherical map
    var points = this.mapView.root.selectAll("point")
        .data(data).enter()
        .append("empty").each(function (d) {
            //calculate positions and place in teh datastructure
            var lat = Number(d.Lat);
            var lng = Number(d.Lon);
            if (d.fName) { //hack for alglita data format
                var latSplit = d.Lat.split(/[,,\s]+/);
                var lat = Number(latSplit[0]) + Number(latSplit[1]) / 60;
                var longSplit = d.Lon.split(/[,,\s]+/);
                var lng = Number(longSplit[0]) + Number(longSplit[1]) / 60;
            }

            var position = getCoords(lat, lng, this.mapView.radius - 1* this.scaleAll);
            d["geo" +"Position"]= [position.x,position.y, position.z];
            this.geoPositions.push(position.x);  this.geoPositions.push(position.y);  this.geoPositions.push( position.z);
        }.bind(this));

    var points = this.mapView.root.selectAll("point")
        .data(data).enter()
        .append("mesh").each( function() {
            if (this.showColumns) {
                this.createMesh(this.mapView.pointsObjects )
            }
        } )
        .attr("tags", "point")
        .each(function (d) {
            var lat = Number(d.Lat);
            var lng = Number(d.Lon);
            if (d.fName) { //hack for alglita data format
                var latSplit = d.Lat.split(/[,,\s]+/);
                var lat = Number(latSplit[0]) + Number(latSplit[1]) / 60;
                var longSplit = d.Lon.split(/[,,\s]+/);
                var lng = Number(longSplit[0]) + Number(longSplit[1]) / 60;
            }
            if (this.mapView.usePointCloud){ //usePointCloud
                var attributePosition = d[whichAttribute +"Position"];

                pointVertices.push(new THREE.Vector3( attributePosition[0], attributePosition[1], attributePosition[2]) );
                if (d[categorizationAttribute]) { //TODO: build a data structure so we know whether this can be categorized by country or not
                    pointColors.push(app.countriesMap[d[categorizationAttribute]].color);
                } else {
                    pointColors.push( new THREE.Color("#ffffff") );
                }

            }/* else {
             if (this.showColumns) {
             this.mesh.position.copy(getCoords(lat, lng, sphereView.radius - 0.1* this.scaleAll));

             this.mesh.lookAt(sphereView.globe.node().getMesh().position);

             this.mesh.scale.z = Math.min(-sphereView.magScale(+d[whichAttribute] + 0.001), -0.1);
             this.mesh.scale.x = Math.max(sphereView.sizeScale(+d[whichAttribute]), 1);
             this.mesh.scale.y = Math.max(sphereView.sizeScale(+d[whichAttribute]), 1);
             this.mesh.updateMatrix();
             }

             if (this.showLines) {
             var axisLine = new FLOW.Lines.Line();

             axisLine.addPoint(sphereView.sourceVector);
             var targetCoords = getCoords(lat, lng, sphereView.radius - 0.1* this.scaleAll);

             axisLine.addPoint(new THREE.Vector3(targetCoords.x, targetCoords.y, targetCoords.z));

             axisLine.setColor(new THREE.Color(sphereView.lineColor));
             axisLine.setWidth(sphereView.lineWidth);
             sphereView.lines.addLine(axisLine);
             }
             }*/


        }.bind(this));


    /* if (this.showLines && ! sphereView.usePointCloud) {
     sphereView.linesMesh = sphereView.lines.buildMesh();
     if (typeof sphereView.lineTexture !== "undefined") {
     sphereView.lines.setTexture(sphereView.lineTexture);
     }
     sphereView.root.node().getMesh().add(sphereView.linesMesh);
     }*/


    this.mapView.object = this.mapView.root.node().getMesh();

    this.mapView.pointCloud.geometry.vertices = pointVertices;
    this.mapView.pointCloud.geometry.colors = pointColors;
    this.mapView.pointCloud.geometry.verticesNeedUpdate = true;
    this.mapView.pointCloud.geometry.colorsNeedUpdate = true;
    this.mapView.pointCloud.geometry.elementssNeedUpdate = true;
    this.mapView.pointCloud.name = "point cloud";

    this.mapView.object.add(this.mapView.pointCloud);

    this.parentObject.add(this.mapView.object);


    this.mapView.object.scale.set(-1, 1, 1);
};



FLOW.D3.PointData.prototype.initiateAnimation = function (initialValues, finalValues, additionalValues) {
    this.animations.stopAndRemoveAllAnimations();

    this.animations.addRippleAnimations({
        initialValues: initialValues,
        finalValues: finalValues,
        additionalValues: additionalValues,
        duration: 400,
        rippleDelay: 1,
        onStarted: function( paramData) {
            if (paramData && paramData.data && paramData.data.length) {
                this.array[paramData.index] = paramData.data[0];
                this.array[paramData.index + 1] = paramData.data[1];
                this.array[paramData.index + 2] = paramData.data[2];
                this.needsUpdate = true;
            }
        }.bind(this.mapView.pointCloud.geometry.getAttribute("color")),
        onUpdated: function (values, deltas, t, data) {
            if (Number.isNaN(values[0])){
                //debugger;
                return
            }
            
            this.array[data.index] = values[0]; //values will contain [x,y,z]
            this.array[data.index+1] = values[1];
            this.array[data.index+2] = values[2];
            this.needsUpdate = true;
        }.bind(this.mapView.pointCloud.geometry.getAttribute("position"))
    });

    function startAnimations() {
        for (var i = 0; i < this.animations.getNumberOfAnimations(); i++) {
            var animation = this.animations.getAnimation(i);
            if(i == this.animations.getNumberOfAnimations() - 1) {
                animation._params.onCompleted = function() { this.mapView.pointCloud.geometry.computeBoundingSphere(); }.bind(this);
            }
            animation.start();

        }
    }

    startAnimations.bind(this)();

};


/**
 *
 * @param categories map of the categories, which will have new attributes populated into them to identify their positions
 * @param categoryWidth
 * @param position
 * @param attribute
 * @returns bounding box of all the points in this categorization
 */
FLOW.D3.PointData.prototype.calculateCategoryPositions= function( categories, categoryWidth, position, attribute ) {

    if (!attribute) { attribute = "count"} //TODO: default for backwards compatibility for now

    this.colorWheel = this.params.colorWheel ?
        typeof this.params.colorWheel == "string" ? new FLOW.Color.ColorWheel(this.params.colorWheel) : this.params.colorWheel
        :null;

    //convert categories to an array; //TODO: get d3 to do this sorting for me
    var categoryOrdinalArray = [];
    //var categoryOrdinalIndex =0;
    for (var item in categories) {
        //categories[item].originalOrdinal = categoryOrdinalIndex;
        categoryOrdinalArray.push(item)
        //categoryOrdinalIndex ++;
    }

    //sort the array:
    var sortedCategories = categoryOrdinalArray.sort(function(a,b) {
        return categories[b][attribute] - categories[a][attribute];
    }.bind(this) );

    var categorizedItemsBoundingBox = new FLOW.MathUtils.BoundingBox();
    var position = position;

    //transfer the ordinals back into the categories array and add the position:
    sortedCategories.forEach( function(item, index){
        categories[item].ordinal = index;
        var categoryOffset = (index *  categoryWidth )  ;
        categories[item].priorIndex = 0;//used by the data positioning
        categories[item].priorGridIndex = 0;

        if (this.params.primaryAxis != "z") {
            categories[item][attribute+"Position"] = {x:categoryOffset + position.x, y:position.y, z:position.z};
            var maxPosition = [categoryOffset + position.x,
                categories[item][attribute] * this.categorizedVerticalSpacing /this.params.pointsPerColumn + position.y,
                position.z];
        } else {
            categories[item][attribute+"Position"] = {x: position.x, y:position.y, z:categoryOffset + position.z};
            var maxPosition = [ position.x,
                categories[item][attribute] * this.categorizedVerticalSpacing /this.params.pointsPerColumn + position.y,
                categoryOffset + position.z];
        }
        categorizedItemsBoundingBox.update(maxPosition);
        categories[item].color = this.colorWheel ? new THREE.Color(FLOW.Color.nextColor(this.colorWheel)) :  new THREE.Color(FLOW.Color.randomColor());

    },this);

    return categorizedItemsBoundingBox;

};

/**
 *
 * @param categories map of the categories, which will have new attributes populated into them to identify their positions
 * @param categoryWidth
 * @param position
 * @param attribute
 * @returns bounding box of all the points in this categorization
 */
FLOW.D3.PointData.prototype.calculateCategoryPositionsInCountry = function( categories, categoryWidth, position, attribute ) {

    if (!attribute) { attribute = "geo"} //TODO: default for backwards compatibility for now

    this.colorWheel = this.params.colorWheel ?
        typeof this.params.colorWheel == "string" ? new FLOW.Color.ColorWheel(this.params.colorWheel) : this.params.colorWheel
        :null;

    var position = position;

    //transfer the ordinals back into the categories array and add the position:
    for (var name in categories) {
        var item = categories[name];
        var lat = Number(item.Lat);
        var lng = Number(item.Lon);

        if (app.currentProjectionName != "spherical") {
            var xycoordinate = app.projection([lng, lat]);
            var position = {
                x: -xycoordinate[0], y: -xycoordinate[1],
                z: (0 - app.zPointFloatDistance) * app.scaleAll
            };
        } else {
            var position = FLOW.D3.getCoords(lat, lng, app.mapView.radius - 1 * app.scaleAll);
        }
        //TODO: get the columns to lookat the center of the sphere

        item.priorIndex = 0;//used by the data positioning
        item.priorGridIndex = 0;//used by the data grid positioning

        if (Number.isNaN(position.x)){
            console.log("missing lat/lon for country: " + item.name);
        }
        item[attribute+"Position"] = {x: position.x, y:position.y, z: position.z};


    }

    return ;

};



FLOW.D3.PointData.prototype.removeData = function() {
    //if (!this.mapView.usePointCloud){
    if (this.mapView && this.mapView.root) {
        this.mapView.root.node().getMesh().remove(this.mapView.pointsObjects);
        this.mapView.root.removeChildren();
        this.mapView.root.node().getMesh().remove(this.mapView.linesMesh);
        this.mapView.lines.removeAllLines();
    }
    var obj, i;
    /*for ( i = this.mapView.modelLabelGroup.children.length - 1; i >= 0 ; i -- ) {
        obj = this.mapView.modelLabelGroup.children[ i ];
        this.mapView.modelLabelGroup.remove(obj);

    }*/
    //}
};



FLOW.D3.PointData.prototype.positionNodeFlatCategory = function(k, row, column, categoryPosition, categorizedVerticalSpacing) {
    var w = 1;
    var h = 1;
    var spacing = categorizedVerticalSpacing ;

    if (this.params.primaryAxis != "z") {
        var x = column * w * spacing +  categoryPosition.x;
        var z = categoryPosition.z;
    } else {
        var x = categoryPosition.z;
        var z = column * w * spacing + categoryPosition.z;
    }
    var y = row * w * spacing + categoryPosition.y;


    return [x, y, z ];
};


FLOW.D3.PointData.prototype.positionNodeGridCategory = function(gridPoints, indexInCategory, categorizedVerticalSpacing) {
    var pointsInLayer = gridPoints.points.length;
    var layerNumber = Math.floor( indexInCategory / pointsInLayer );

    var positionWithinCategory = indexInCategory % pointsInLayer;

    if (!gridPoints || !gridPoints.points  ) {
        debugger;
    }
    var latLong = gridPoints.points[positionWithinCategory];
    if (!latLong){
        debugger;
    }

    if (app.currentProjectionName != "spherical") {
        var xycoordinate = app.projection([latLong[0], latLong[1]]);
        var position = {
            x: -xycoordinate[0], y: -xycoordinate[1],
            z: (layerNumber * categorizedVerticalSpacing - app.zPointFloatDistance) * app.scaleAll
        };
    } else {
        position = FLOW.D3.getCoords(latLong[0], latLong[1], app.mapView.radius - categorizedVerticalSpacing - (layerNumber * categorizedVerticalSpacing) * app.scaleAll);
    }
    return [position.x, position.y, position.z ];
};



FLOW.D3.PointData.prototype.positionNodeColumnCategory = function(row, column, layer, categoryPosition, spacing) {
    var columnSpacing = 1;
    var rowSpacing = 1;
    var layerSpacing = 1;

    if (this.params.primaryAxis != "z") {
        var x = column * columnSpacing * spacing +  categoryPosition.x;
        var z = layer * layerSpacing * spacing + categoryPosition.z;
    } else {
        var x = layer * layerSpacing * spacing + categoryPosition.z;
        var z = column * columnSpacing * spacing + categoryPosition.z;
    }
    var y = row * rowSpacing * spacing + categoryPosition.y;


    return [x, y, z ];
};


FLOW.D3.PointData.prototype.createQuantitiesAsPoints = function(data, attribute, pointsPerValue) {
    var dataPoints = [];

    function findCountryCodeFromName(country) {
        for (var i = 0; i < app.countryCodesJson.length; i++) {
            if (app.countryCodesJson[i].country == country) {
                return app.countryCodesJson[i].code2;
            }
        }
        console.log("unable to findCountryCodeFromName: " + country);
        debugger
        return null;
    }

    for (var i=0; i < data.length; i++) {
        var d = {
            Lat:data[i].Lat,
            Lon:data[i].Lon,
            code2: data[i].code2,
            category: data[i][app.currentScene.dataKeyForCategorization],
            value: Number(data[i][attribute]),
            pop: data.length,
            //label:app.currentScene.dataKeyForCategorization //TODO: make this a label attribute or something
        };

        //Lat,Lon,pop,code2,city

        var numPoints = Number(data[i][attribute]) / pointsPerValue;
        for (var j=0; j < numPoints; j++ ){
            dataPoints.push( d );
        }
    }
    return dataPoints;
};

/**
 *
 * @param point - FLOW.D3.Node
 * @param labelFunction function to callback with the point data to create the label text
 */
FLOW.D3.PointData.prototype.showLabel = function(point, labelFunction, positionFunction, fontSize) {

    if (this.priorLabel == point ){
        return;
    }
    this.priorLabel = point;

    var labelText =  labelFunction( point.getData() );

    if (!labelText) {
        return;
    }
    if (!this.labelObject3Ds){
        this.labelObject3Ds = [];
    }

    this.labelText = new FLOW.Text.Text({
        text: labelText,
        font: this.labelParams.font || "Open Sans",
        fontSize: fontSize || this.labelParams.fontSize || 1,
        wrapType: FLOW.Text.WrapType.WRAP_BY_NUMBER_OF_CHARACTERS,
        wrapValue: this.labelParams.wrapValue || 40,
        align: FLOW.Text.ALIGN_CENTER,
        color: this.labelParams.color
    });

    var labelObj = this.labelText.getLayoutObject();
    this.labelText.setLayoutParams(
        this.labelText.orient == "top" ? {
            vRegisterTo: typeof this.labelParams.labelVRegisterTo != "undefined" ? this.labelParams.labelVRegisterTo : FLOW.Text.ALIGN_TOP,
            hRegisterTo: typeof this.labelParams.labelHRegisterTo != "undefined" ?
                typeof this.labelParams.labelHRegisterTo == "function" ? this.labelParams.labelHRegisterTo(d) :
                    this.labelParams.labelHRegisterTo : FLOW.Text.ALIGN_LEFT,
            paddingTop: typeof this.labelParams.labelPaddingTop != "undefined" ? this.labelParams._labelPaddingTop : 0,//-0.5,
            paddingLeft: typeof this.labelParams.labelPaddingLeft != "undefined" ? this.labelParams.labelPaddingLeft : 0,//1
        } :
            {
                vRegisterTo: typeof this.labelParams.labelVRegisterTo != "undefined" ? this.labelParams.labelVRegisterTo : FLOW.Text.ALIGN_BOTTOM,
                hRegisterTo: typeof this.labelParams.labelHRegisterTo != "undefined" ?
                    typeof this.labelParams.labelHRegisterTo == "function" ? this.labelParams.labelHRegisterTo(d) :
                        this.labelParams.labelHRegisterTo : FLOW.Text.ALIGN_LEFT,
                paddingBottom: typeof this.labelParams.labelPaddingBottom != "undefined" ? this.labelParams.labelPaddingBottom : 0,//-0.5,
                paddingLeft: typeof this.labelParams.labelPaddingLeft != "undefined" ? this.labelParams.labelPaddingLeft : 0,//1
            }
    );
    var pos = positionFunction(point.getData());
    labelObj.position.set(pos.x, pos.y, pos.z);

    this.labelObject3Ds.push(labelObj);
    if (this.labelObject3Ds.length > 1) { //TODO: make the maxNumLabelsVisible parameterized
        //time to remove one
        this.parentObject.remove(this.labelObject3Ds[0]);
        this.labelObject3Ds = this.labelObject3Ds.slice(1);
    }
    this.parentObject.add(labelObj);
    if (this.labelParams.trackLabels) {
        this.labelText.getMesh().track();
    }
};

FLOW.D3.PointData.prototype.removeLabels = function() {
    if(this.labelObject3Ds && this.labelObject3Ds.length > 0) {
        for(var i in this.labelObject3Ds) {
            this.parentObject.remove(this.labelObject3Ds[i])
            this.labelObject3Ds[i] = null;
        }
        this.labelObject3Ds = [];
    }
};

FLOW.D3.getCoords = function(lat, lng, radius, returnVector) {
    var gamma = (90  - lat) * Math.PI / 180;
    var theta = (180 - lng) * Math.PI / 180;

    var x = radius * Math.sin(gamma) * Math.cos(theta);
    var y = radius * Math.cos(gamma);
    var z = radius * Math.sin(gamma) * Math.sin(theta);

    if (returnVector) {
        return new THREE.Vector3(x, y, z);
    }

    return {x: x, y: y, z: z};
};


FLOW.D3.Map = function( params ) {
    params.separateGeometries = (typeof params.separateGeometries !== "undefined") ? params.separateGeometries : false;
    params.sizeAttenuation = (typeof params.sizeAttenuation !== "undefined") ? params.sizeAttenuation : true;
    params.scale = (typeof params.scale !== "undefined") ? params.scale : 0.1;
    params.width = (typeof params.width !== "undefined") ? params.width : 0.1;
    params.color = (typeof params.color !== "undefined") ? params.color : "white";
    params.step = (typeof params.step !== "undefined") ? params.step : 1;
    this.params = params;

    this.object = new THREE.Object3D();
    if(params.parent) {
        params.parent.add(this.object);
    }
    return this;
};

FLOW.D3.Map.prototype.buildMesh = function( callback ) {

    return new Promise(

        (resolve, reject) => {
                function createLines(polygon, arcs, transform, highlight, params, parent) {

                    for( let arc of polygon ) {
                        let line = new FLOW.Lines.Line();
                        let x = 0;
                        let y = 0;
                        if(arc < 0) {
                            arc = ~arc
                        }

                        var add = false
                        for( let index = 0; index < arcs[arc].length; index += 1) {
                            let arcLine = arcs[arc][index]

                            let offsetX = (highlight) ? params.highlight.position.x : 0;
                            let offsetY = (highlight) ? params.highlight.position.y : 0;

                            if ( params.transform ) {
                                var currentX = params.scale* ( (arcLine[0]+x)*transform.scale[0] + transform.translate[0] ) + offsetX;
                                var currentY = params.scale* ( (arcLine[1]+y)*transform.scale[1] + transform.translate[1] ) + offsetY;
                            } else {
                                var currentX = params.scale* ( arcLine[0]+x ) + offsetX;
                                var currentY = params.scale* ( arcLine[1]+y ) + offsetY;   
                            }

                            let currentZ = (highlight) ? params.highlight.position.z : 0; 
                            if(index % params.step == 0 ) {
                                line.addPoint(new THREE.Vector3(currentX, currentY, currentZ));
                                add  = true
                            } else {
                                add = false
                            }
                            x += arcLine[0]
                            y += arcLine[1]
                        }

                        if( !add ) {
                            let arcLine = arcs[arc][arcs[arc].length - 1]

                            let offsetX = (highlight) ? params.highlight.position.x : 0;
                            let offsetY = (highlight) ? params.highlight.position.y : 0;

                            if ( params.transform ) {
                                var currentX = params.scale* ( (arcLine[0]+x)*transform.scale[0] + transform.translate[0] ) + offsetX;
                                var currentY = params.scale* ( (arcLine[1]+y)*transform.scale[1] + transform.translate[1] ) + offsetY;
                            } else {
                                var currentX = params.scale* ( arcLine[0]+x ) + offsetX;
                                var currentY = params.scale* ( arcLine[1]+y ) + offsetY;   
                            }

                            let currentZ = (highlight) ? params.highlight.position.z : 0; 
                            line.addPoint(new THREE.Vector3(currentX, currentY, currentZ));
                            x += arcLine[0]
                            y += arcLine[1]
                        }

                        line.setColor(new THREE.Color(params.color));
                        line.setWidth(params.width);

                        if(highlight) {
                            line.setColor(new THREE.Color(params.highlight.color))
                            line.setWidth(params.highlight.width)
                        }
                        parent.addLine(line)
                    }
                }

                function processGeometry( index, topology, parent, params ) {

                    let geometry = topology.objects[params.object].geometries[index];

                    if( params.highlight ) {
                        if(params.highlight.key) {
                            var highlight = geometry[params.highlight.key] == params.highlight.value 
                        } else if(params.highlight.index) {
                            var highlight = index == params.highlight.index
                        }  
                    }

                    if(geometry.type == "Polygon") {
                        for( let polygon of geometry.arcs ) {
                           createLines(polygon, topology.arcs, topology.transform ,highlight, params, parent)
                        }
                    } else if(geometry.type == "MultiPolygon") {
                        for( let polygons of geometry.arcs) {
                            for( let polygon of polygons ) {
                                createLines(polygon, topology.arcs, topology.transform ,highlight, params, parent)
                            }
                        }
                    } else {
                        // not supported 
                        debugger;
                    }
                }

                var params = this.params;

                FLOW.D3.loadTopologyFile( params.data,
                    ( topology ) => {

                            if (!topology) { throw "No topology" }

                                let lines = []
                                if( !params.separateGeometries ) {
                                    var parent = new FLOW.Lines.Lines();
                                    parent.sizeAttenuation = params.sizeAttenuation;
                                }

                                for(let index in topology.objects[params.object].geometries) {

                                    if( params.separateGeometries ) {
                                        var parent = new FLOW.Lines.Lines();
                                        parent.sizeAttenuation = params.sizeAttenuation;
                                    }

                                    processGeometry(index, topology, parent, params);

                                    if( params.separateGeometries ) {
                                        parent.object = parent.buildMesh();
                                        this.object.add(parent.object);
                                        lines.push(parent);
                                    }
                                }

                                if( !params.separateGeometries ) {
                                    parent.object = parent.buildMesh();
                                    this.object.add(parent.object);
                                    lines.push(parent);
                                }

                                this.lines = lines;

                            if( callback ) {
                                callback(this);
                            } 
                            resolve(this);       
                        }
                );
        }

    );
};


(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.D3;
}));
