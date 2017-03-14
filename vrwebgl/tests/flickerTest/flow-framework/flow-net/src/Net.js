var FLOW = FLOW || {};

FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.EventUtils = FLOW.EventUtils || require("flow-event-utils");

FLOW.Net = {
	load: function(url, async) {
		if (typeof(url) !== "string") throw "ERROR: The given URL is not a string.";
		return new Promise(function(resolve, reject) {
			var xhr = new XMLHttpRequest();
			xhr.addEventListener('load', function() {
				resolve(this.responseText);
			});
			xhr.addEventListener('error', function() {
				var errorMessage = "Error while loading the url: '" + url + "'";
				reject(errorMessage);
			});
			xhr.addEventListener('readystatechange', function() {
				if (this.readyState === 4 && this.status !== 200) {
					var errorMessage = "Error '" + this.status + "' while loading the url: '" + url + "'";
					reject(errorMessage);
				}
			});
			xhr.open("GET", url, typeof(async) === "boolean" ? async : true);
			xhr.send();
		});
	},
	parseQueryArguments: function() {
		var args = document.location.search.substring(1).split('&');
		var argsParsed = {};
		for (var i=0; i < args.length; i++) {
		    var arg = decodeURIComponent(args[i]);
		    if (arg.indexOf('=') == -1) {
		        argsParsed[arg.trim()] = true;
		    }
		    else {
		        var kvp = arg.split('=');
		        argsParsed[kvp[0].trim()] = kvp[1].trim();
		    }
		}
		return argsParsed;
	}
};

FLOW.Net.WebSocketConnection = function() {
	FLOW.EventUtils.Observable.call(this);
	this._websocket = null;
	this._connected = false;
	return this;
}

FLOW.OOPUtils.prototypalInheritance(FLOW.Net.WebSocketConnection, FLOW.EventUtils.Observable);

FLOW.Net.WebSocketConnection.prototype.connect = function(websocket) {
	this._websocket = websocket;
	return this;
};

FLOW.Net.WebSocketConnection.prototype.sendCommand = function(command) {  
	return this.sendCommandString(JSON.stringify(command));
};

FLOW.Net.WebSocketConnection.prototype.sendCommandString = function(commandString) {  
	// console.log("WebSocketConnection.sendCommandString: " + commandString);
	this._websocket.send(commandString);
	return this;
};

FLOW.Net.WebSocketConnection.prototype.disconnect = function() {
	// console.log("WebSocketConnection.disconnect");
	this._websocket.close();
	this._websocket = null;
	this._connected = false;
	return this;
};

FLOW.Net.WebSocketConnectionClient = function() {
	FLOW.Net.WebSocketConnection.call(this);
	return this;
};

FLOW.OOPUtils.prototypalInheritance(FLOW.Net.WebSocketConnectionClient, FLOW.Net.WebSocketConnection);

FLOW.Net.WebSocketConnectionClient.prototype.connect = function(url) {  
	this._url = url;

	var webSocket = new WebSocket(url);


	webSocket.onopen = function(event) {
		this._connected = true;
		this.callEventListeners("connected");
	}.bind(this);
		webSocket.onclose = function(event) {
		this._connected = false;
		this.callEventListeners("disconnected");
	}.bind(this);
		webSocket.onmessage = function(event) {
		var commandString = event.data;
		var command = JSON.parse(commandString);
		this.callEventListeners("commandreceived", { commandString: commandString, command: command });
	}.bind(this);
		webSocket.onerror = function(event) {
		this.callEventListeners("error", "websocket error");
	}.bind(this);

    FLOW.Net.WebSocketConnection.prototype.connect.call(this, webSocket);

    return this;
};

FLOW.Net.WebSocketConnectionClient.prototype.getUrl = function() {  
	return this._url;
};

FLOW.Net.WebSocketConnectionServer = function() {
	FLOW.Net.WebSocketConnection.call(this);
	return this;
}

FLOW.OOPUtils.prototypalInheritance(FLOW.Net.WebSocketConnectionServer, FLOW.Net.WebSocketConnection);

FLOW.Net.WebSocketConnectionServer.prototype.connect = function(webSocket) {
	FLOW.Net.WebSocketConnection.prototype.connect.call(this, webSocket);

	webSocket.on('message', function(event) {
		var commandString = event.utf8Data;
		var command = JSON.parse(commandString);
		// console.log("WebSocketConnectionServer.message: " + commandString);
		this.callEventListeners("commandreceived", { commandString: commandString, command: command });
	}.bind(this));
		webSocket.on('close', function(event) {
		this.callEventListeners("disconnected");
	}.bind(this));
		webSocket.on('error', function(errorMessage) {
		this.callEventListeners("error", errorMessage);
	}.bind(this));

	// In the server, we assume that we are already _connected (the websocket is provided from outside), so call onConnected.
	this._connected = true;
	this.callEventListeners("connected");

	return this;
};

FLOW.Net.WebSocketServer = function() {
	FLOW.EventUtils.Observable.call(this);
	this._started = false;
	return this;
};

FLOW.OOPUtils.prototypalInheritance(FLOW.Net.WebSocketServer, FLOW.EventUtils.Observable);

FLOW.Net.WebSocketServer.DEFAULT_PORT = 1703;

FLOW.Net.WebSocketServer.prototype.start = function(port) {
	this._port = port || FLOW.Net.WebSocketServer.DEFAULT_PORT;

	var WebSocket_Server = require('websocket').server;
	var http = require('http');

	this._webSocketServer = new WebSocket_Server({
		httpServer: http.createServer().listen(this._port)
	});
	this.callEventListeners('started')

	this._webSocketServer.on('request', function(request) {
		var webSocket = request.accept(null, request.origin);
		var wscs = new FLOW.Net.WebSocketConnectionServer();
		this.callEventListeners('connectioncreated', wscs); 
		wscs.connect(webSocket);
	}.bind(this));

	console.log("Listening to websocket connections at port '" + this._port + "'");

	this._started = true;
	return this;
};

FLOW.Net.WebSocketServer.prototype.stop = function() {
	this._webSocketServer.closeAllConnections();
	this._webSocketServer = null;
	this._started = false;
	this.callEventListeners('stopped'); 
	return this;
};



(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Net;
}));
