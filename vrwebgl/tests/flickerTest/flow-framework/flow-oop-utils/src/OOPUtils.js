var FLOW = FLOW || {};

FLOW.OOPUtils = {
	inheritanceByPrototypeCopy: function(finalType) {
		if (typeof(finalType) !== "function") throw "FLOW.OOPUtils.inheritanceByPrototypeCopy: There needs to be at least a one type, the type where all the other types' " +
			"prototypes will be concatenated.";
		var finalTypePrototype = finalType.prototype;
		if (arguments.length <= 1) throw "FLOW.OOPUtils.inheritanceByPrototypeCopy: No other types were specified to be concatenated to type '" + finalType.name + "'."
		var concatenatedFunctionNames = {}; // The structure will be "NAME_OF_THE_CONCATENATED_FUNCTIONS": { concatenatedFrom: [LIST] }
		for (var i = 0; i < arguments.length; i++) {
			var otherType = arguments[i];
			if (typeof(otherType) !== "function") throw "FLOW.OOPUtils.inheritanceByPrototypeCopy: Other type at argument position " + i + " is not a function."
			var otherTypePrototype = otherType.prototype;
			// Store the inherited function names for quick review
			for (var propertyName in otherTypePrototype) {
				// TODO: Decide if properties should also be copied or not.
				// This function only concatenates functions
				if (typeof(otherTypePrototype[propertyName]) === "function") {
					// Check if the finalTypePrototype already has the same function (possible collision).
					if (typeof(finalTypePrototype[propertyName]) !== "undefined") {
						// We have a problem! The prototype of the final type already has a function that is the same as the one in another type.
						// Was the function inherited?
						if (concatenatedFunctionNames[propertyName]) {
							// For ease of use, store a reference to the array that holds the names of the types the function was concatenated from
							var concatenatedFromTypeNames = concatenatedFunctionNames[propertyName].concatenatedFromTypeNames;
							// Add the other type name to the concatenatedFromTypeNames array
							concatenatedFromTypeNames.push(otherType.name);
							// Create a string with all the names of the types involved.
							var concatenatedFromString = "";
							for (var i = 0; i < concatenatedFromTypeNames.length; i++) {
								concatenatedFromString += "'" + concatenatedFromTypeNames[i] + "'" + (i < concatenatedFromTypeNames.length ? ", " : "");
							}
							// Create the message for the exception to be thrown
							var throwMessage = "FLOW.OOPUtils.inheritanceByPrototypeCopy: The function '" + propertyName + "' cannot be directly called from instances of type '" +
								finalType.name + "' as it was found to be concatenated from more than one type: " + concatenatedFromString +
								". Please, use call/apply to perform a direct function call to the specific type's prototype function.";
							// As the function was inherited, then create a new function
							finalTypePrototype[propertyName] = (function(throwMessage) {
								// This is the final function that will be assigned to the propertyName, a function that simply throws an exception if it is called.
								// In the case of function name collision, the developer should call the function using apply/call directly using the prototype of the type he is interested in
								return function() {
									throw throwMessage;
								};
							})(throwMessage); // Pass the throwMessage to create a closure
						}
						else {
							// Do nothing. In this case, the function was already in the final type prototype, so keep it this way.
						}
					}
					// The function did not exist in the prototype yet? Then concatenate the function to the final type prototype and store it in the concatenated function names for future reference if needed (collision)
					else {
						finalTypePrototype[propertyName] = otherTypePrototype[propertyName];
						// Sotre the name of the other type for possible reference if a collision occurs
						concatenatedFunctionNames[propertyName] = { concatenatedFromTypeNames: [otherType.name] }
					}
				}
			}
		}
		// TODO: Are we really sure we want to warn about the function collisions? Calls will throw exceptions.
		// Check if there were any collisions and warn the developer/user about the situation.
		// for (var propertyName in concatenatedFunctionNames) {
		// 	if (concatenatedFunctionNames[propertyName].concatenatedFromTypeNames.length > 1) {
		// 		console.warn("FLOW.inheritanceByPrototypeCopy: The function '" + propertyName + "' showed a collision while being concatenated in type '" + finalType.name + "' '" + finalType.name + "' has two declarations. Please, use call/apply to select the right one.");
		// 	}
		// }

		return this;
	},

	copyProperties: function(finalObject) {
		if (typeof(finalObject) !== "object") throw "FLOW.OOPUtils.copyProperties: There needs to be at least one object to be able to copy the properties to.";
		if (arguments.length <= 1) throw "FLOW.OOPUtils.copyProperties: No other objects were specified to be able to copy their properties to the final obejct."
		for (var i = 0; i < arguments.length; i++) {
			var otherObject = arguments[i];
			if (typeof(otherObject) !== "object") throw "FLOW.OOPUtils.copyProperties: Other object at argument position " + i + " is not an object. Cannot copy properties from a non-object argument.";
			for (var propertyName in otherObject) {
				if (typeof(finalObject[propertyName]) === "undefined") {
					finalObject[propertyName] = otherObject[propertyName];
				}
			}
		}

		return this;
	},

	prototypalInheritance: function (child, parent) {
        child.prototype = new parent();
        child.prototype.constructor = parent;
        return child;
    }
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.OOPUtils;
}));
