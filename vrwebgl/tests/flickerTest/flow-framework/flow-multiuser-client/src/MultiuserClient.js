var THREE = THREE || require('three');

var FLOW = FLOW || {};

FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.Animation = FLOW.Animation || require('flow-animation');
FLOW.Net = FLOW.Net || require('flow-net');
FLOW.Multiuser = FLOW.Multiuser || require('flow-multiuser');
FLOW.EventUtils = FLOW.EventUtils || require('flow-event-utils');

FLOW.MultiuserClient = {};

FLOW.MultiuserClient.RemoteUser = function(id, object3d) {
	if (typeof(id) !== "string") throw "ERROR: An id is necessary to create a user.";
	this._id = id;
	this._object3d = object3d instanceof THREE.Object3D ? object3d : new THREE.Object3D();
	this._lastPosition = new THREE.Vector3().copy(this._object3d.position);
	this._copyOfLastPosition = new THREE.Vector3();
	this._lastOrientation = new THREE.Quaternion().copy(this._object3d.quaternion);
	this._copyOfLastOrientation = new THREE.Quaternion();
	this._positionDifference = new THREE.Vector3();	
	this._positionAnimation = null;
	this._orientationAnimation = null;
	this._orientationTo = new THREE.Quaternion();
	this._lastPositionTime = -1;
	this._lastOrientationTime = -1;
    this._isUserReady = false;
	return this;
};

FLOW.MultiuserClient.RemoteUser.POSITION_DIFFERENCE_THRESHOLD = 0.1;
FLOW.MultiuserClient.RemoteUser.ORIENTATION_DIFFERENCE_THRESHOLD = 1;
FLOW.MultiuserClient.RemoteUser.DEFAULT_EASING_FUNCTION = FLOW.Animation.Easing.Linear.None;

FLOW.MultiuserClient.RemoteUser.prototype.setPosition = function(position, updateObject3DMatrixWorld, disableAnimation, time) {
	this._copyOfLastPosition.copy(this._lastPosition);
	this._lastPosition.copy(this._object3d.position);
	this._object3d.position.set(position.x, position.y, position.z);
	this._positionDifference.copy(this._object3d.position).sub(this._lastPosition);

	// Calculate the time difference between this update and the last one. This difference will be used to interpolate faster or slower
	// if (typeof(otherPlayer.lastUpdateTimeStamp) === "undefined") {
	// 	otherPlayer.lastUpdateTimeStamp = command.data.timeStamp;
	// } 
	// var timeStampDifference = command.data.timeStamp - otherPlayer.lastUpdateTimeStamp;
	// otherPlayer.lastUpdateTimeStamp = command.data.timeStamp;

	if (!disableAnimation) {
		if (this._positionAnimation) {
			this._positionAnimation.stop();
			this._positionAnimation = null;
		}

		time = time === undefined ? performance.now() : time;
		if (this._lastPositionTime < 0) this._lastPositionTime = time;
		var elapsedTime = time - this._lastPositionTime;
		this._lastPositionTime = time;

		var positionDifferenceLength = this._positionDifference.length();
		if (positionDifferenceLength > FLOW.MultiuserClient.RemoteUser.POSITION_DIFFERENCE_THRESHOLD) {
			// Restore the previous situation 
			this._object3d.position.copy(this._lastPosition);
			this._lastPosition.copy(this._copyOfLastPosition);
			this._positionDifference.copy(this._object3d.position).sub(this._lastPosition);
			this._positionAnimation = new FLOW.Animation.Animation({
				initialValues: [this._object3d.position.x, this._object3d.position.y, this._object3d.position.z],
				finalValues: [position.x, position.y, position.z],
				duration: elapsedTime,
				easingFunction: FLOW.MultiuserClient.RemoteUser.DEFAULT_EASING_FUNCTION,
				onUpdated: function(values) {
					this._lastPosition.copy(this._object3d.position);
					this._object3d.position.set(values[0], values[1], values[2]);
					this._positionDifference.copy(this._object3d.position).sub(this._lastPosition);
				}.bind(this),
				onCompleted: function() {
					this._positionAnimation = null;
				}.bind(this)
			}).start();
		}
	}

	if (updateObject3DMatrixWorld) {
		this._object3d.updateMatrixWorld();
	}

	return this;
};

FLOW.MultiuserClient.RemoteUser.prototype.setOrientation = function(orientation, updateObject3DMatrixWorld, disableAnimation, time) {
	this._copyOfLastOrientation.copy(this._lastOrientation);
	this._lastOrientation.copy(this._object3d.quaternion);
	this._object3d.quaternion.set(orientation._x, orientation._y, orientation._z, orientation._w);

	if (!disableAnimation) {
		if (this._orientationAnimation) {
			this._orientationAnimation.stop();
			this._orientationAnimation = null;
		}

		time = time === undefined ? performance.now() : time;
		if (this._lastOrientationTime < 0) this._lastOrientationTime = time;
		var elapsedTime = time - this._lastOrientationTime;
		this._lastOrientationTime = time;

		// Calculate the angle between the current quaternion and the last quaternion in degrees (thus, the 57.29.... === 360 / 2*PI)
		// We need to clone the lastQuaternion value as we do not want to lose it (will need it to be able to interpolate later)
		var angle = THREE.Math.radToDeg(Math.acos(this._lastOrientation.clone().inverse().multiply(this._object3d.quaternion)._w));
		// If the angle is too big, activate the slerp interpolation
		if (!isNaN(angle) && angle > FLOW.MultiuserClient.RemoteUser.ORIENTATION_DIFFERENCE_THRESHOLD) {
			// The object3d has the orientation we want to animate to
			this._orientationTo.copy(this._object3d.quaternion);
			// Restore the previous situation
			this._object3d.quaternion.copy(this._lastOrientation);
			this._lastOrientation.copy(this._copyOfLastOrientation);
			this._orientationAnimation = new FLOW.Animation.Animation({
				// TODO: We only use the animation to get the t. Maybe avoid the creation/destruction of the animation object using the asing function directly.
				initialValues:[],
				finalValues:[],
				duration: elapsedTime, 
				easingFunction: FLOW.MultiuserClient.RemoteUser.DEFAULT_EASING_FUNCTION,
				onUpdated: function(values, deltas, t) {
					this._lastOrientation.copy(this._object3d.quaternion);
					this._object3d.quaternion.slerp(this._orientationTo, t);				
				}.bind(this),
				onCompleted: function() {
					this._orientationAnimation = null;
				}.bind(this)
			}).start();
		}
	}

	if (updateObject3DMatrixWorld) {
		this._object3d.updateMatrixWorld();
	}
	return this;
};

FLOW.MultiuserClient.RemoteUser.prototype.setPositionAndOrientation = function(position, orientation, updateObject3DMatrixWorld, disableAnimation) {
	this.setPosition(position, false, disableAnimation);
	this.setOrientation(orientation, false, disableAnimation);
	if (updateObject3DMatrixWorld) {
		this._object3d.updateMatrixWorld();
	}
	return this;
};


FLOW.MultiuserClient.RemoteUser.prototype.userReady = function() {
    this._isUserReady = true;
};

FLOW.MultiuserClient.RemoteUser.prototype.update = function(time) {
	if (this._positionAnimation && this._positionAnimation.isStarted() && !this._positionAnimation.isCompleted()) {
		this._positionAnimation.update(time);
	}
	if (this._orientationAnimation && this._orientationAnimation.isStarted() && !this._orientationAnimation.isCompleted()) {
		this._orientationAnimation.update(time);
	}
	return this;
};

FLOW.MultiuserClient.RemoteUser.prototype.setObject3D = function(object3d) {
	if (!(object3d instanceof THREE.Object3D)) return this;
	object3d.position.copy(this._object3d.position);
	object3d.quaternion.copy(this._object3d.quaternion);
	this._object3d = object3d;
	return this;
};

FLOW.MultiuserClient.RemoteUser.prototype.getObject3D = function() {
	return this._object3d;
};

FLOW.MultiuserClient.RemoteUser.prototype.getId = function() {
	return this._id;
};

/**
Events:
	'connectedtoserver'
 'userready'
	'disconnectedfromserver'
	'allexperiencesreceived'
	'availableexperiencesasuserreceived'
	'availableexperiencesasviewerreceived'
	'connectedtoexperienceasuser'
	'connectedtoexperienceasviewer'
	'connectiontoexperienceasuserfailed'
	'connectiontoexperienceasviewerfailed'
	'disconnectedfromexperience'
	'remoteuserconnected'
	'remoteuserdisconnected'
	'commandreceived'
	'error',
}
*/
FLOW.MultiuserClient.Client = function(object3d) {
	FLOW.EventUtils.Observable.call(this);
	this._object3d = (object3d && object3d instanceof THREE.Object3D) ? object3d : new THREE.Object3D();
	this._remoteUsers = {};
	this._connection = null;
	this._lastUpdateTime = -1;
	this._accumUpdateTime = 0;
	this._updateDelay = 0;
	return this;
};

FLOW.OOPUtils.prototypalInheritance(FLOW.MultiuserClient.Client, FLOW.EventUtils.Observable);

FLOW.MultiuserClient.Client.prototype._connection_connected = function() {
    this.callEventListeners('connectedtoserver');
    return this;
};

FLOW.MultiuserClient.Client.prototype._connection_userready = function() {
    this.callEventListeners('userready');
    return this;
};


FLOW.MultiuserClient.Client.prototype._connection_disconnected = function() {
	this.callEventListeners('disconnectedfromserver');
	this._removeConnectionListeners();
	this._userId = null;
	this._connection = null;
	return this;
};


FLOW.MultiuserClient.Client.prototype._connection_commandreceived = function(data) {
	var command = data.command;
	if (command.id === FLOW.Multiuser.CommandIds.REQUEST_ALL_EXPERIENCES_RESPONSE) {
		this.callEventListeners('allexperiencesreceived', command.data);
	}
	else if (command.id === FLOW.Multiuser.CommandIds.REQUEST_AVAILABLE_EXPERIENCES_AS_USER_RESPONSE) {
		this.callEventListeners('availableexperiencesasuserreceived', command.data);
	}
	else if (command.id === FLOW.Multiuser.CommandIds.REQUEST_AVAILABLE_EXPERIENCES_AS_VIEWER_RESPONSE) {
		this.callEventListeners('availableexperiencesasviewerreceived', command.data);
	}
	else if (command.id === FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_USER_RESPONSE) {
		if (command.data.response === FLOW.Multiuser.ConnectToExperienceAsUserResponse.CONNECTED) {
			this._userId = command.data.id;
			this._object3d.position.set(command.data.position.x, command.data.position.y, command.data.position.z);
			this._object3d.quaternion.set(command.data.orientation._x, command.data.orientation._y, command.data.orientation._z, command.data.orientation._w);
			for (var id in command.data.otherUsers) {
				var otherUser = command.data.otherUsers[id];
				var object3d = this._remoteUserObject3DProvider ? this._remoteUserObject3DProvider.call(this) : new THREE.Object3D();
				var remoteUser = new FLOW.MultiuserClient.RemoteUser(otherUser.id, object3d);
                remoteUser._isUserReady = otherUser.isUserReady;
				remoteUser.setPositionAndOrientation(otherUser.position, otherUser.orientation, false, true);
				this._remoteUsers[otherUser.id] = remoteUser;
				this.callEventListeners('remoteuserconnected', remoteUser);
			}
			this.callEventListeners('connectedtoexperienceasuser');
		}
		else {
			this.callEventListeners('connectiontoexperienceasuserfailed', command.data.response);
		}
	}
	else if (command.id === FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_VIEWER_RESPONSE) {
		if (command.data.response === FLOW.Multiuser.ConnectToExperienceAsViewerResponse.CONNECTED) {
			for (var id in command.data.users) {
				var user = command.data.users[id];
				var object3d = this._remoteUserObject3DProvider ? this._remoteUserObject3DProvider.call(this) : new THREE.Object3D();
				var remoteUser = new FLOW.MultiuserClient.RemoteUser(user.id, object3d);
				remoteUser.setPositionAndOrientation(user.position, user.orientation, false, true);
				this._remoteUsers[user.id] = remoteUser;
				this.callEventListeners('remoteuserconnected', remoteUser);
			}
			this.callEventListeners('connectedtoexperienceasviewer');
		}
		else {
			this.callEventListeners('connectiontoexperienceasviewerfailed', command.data.response);
		}
	}
	else if (command.id === FLOW.Multiuser.CommandIds.DISCONNECT_FROM_EXPERIENCE_RESPONSE) {
		this._userId = null;
		this.callEventListeners('disconnectedfromexperience');
	}
	else if (command.id === FLOW.Multiuser.CommandIds.NEW_USER) {
		var user = command.data;
		var object3d = this._remoteUserObject3DProvider ? this._remoteUserObject3DProvider.call(this) : new THREE.Object3D();
		var remoteUser = new FLOW.MultiuserClient.RemoteUser(user.id, object3d);
		remoteUser.setPositionAndOrientation(user.position, user.orientation, false, true);
		this._remoteUsers[user.id] = remoteUser;
		this.callEventListeners('remoteuserconnected', remoteUser);
	}
	else if (command.id === FLOW.Multiuser.CommandIds.USER_UPDATE) {
		var remoteUser = this._remoteUsers[command.data.id];
		remoteUser.setPositionAndOrientation(command.data.position, command.data.orientation);
	}
	else if (command.id === FLOW.Multiuser.CommandIds.USER_DISCONNECTED) {
		var remoteUser = this._remoteUsers[command.data.id];
		delete this._remoteUsers[command.data.id];
		this.callEventListeners('remoteuserdisconnected', remoteUser);
	}
    else if (command.id === FLOW.Multiuser.CommandIds.USER_READY) {
        var remoteUser = this._remoteUsers[command.data.userId];
        if (remoteUser) {
            remoteUser._isUserReady = true;
            this.callEventListeners('userready', remoteUser);
        }
    }
	this.callEventListeners('commandreceived', data);
	return this;
};

FLOW.MultiuserClient.Client.prototype._connection_error = function(errorMessage) {
	this.callEventListeners('error', errorMessage);
	return this;
};

FLOW.MultiuserClient.Client.prototype._removeConnectionListeners = function() {
	// Remove all the listener bindings for the connection
	if (this._connection_connected_bind) {
		this._connection.removeEventListener('connected', this._connection_connected_bind);
		this._connection_connected_bind = null;
	}
	if (this._connection_disconnected_bind) {
		this._connection.removeEventListener('disconnected', this._connection_disconnected_bind);
		this._connection_disconnected_bind = null;
	}
	if (this._connection_commandreceived_bind) {
		this._connection.removeEventListener('commandreceived', this._connection_commandreceived_bind);
		this._connection_commandreceived_bind = null;
	}
	if (this._connection_error_bind) {
		this._connection.removeEventListener('error', this._connection_error_bind);
		this._connection_error_bind = null;	
	}
	return this;
};

FLOW.MultiuserClient.Client.prototype._addConnectionListeners = function() {
	this._removeConnectionListeners();
    this._connection_connected_bind = FLOW.MultiuserClient.Client.prototype._connection_connected.bind(this);
    this._connection.addEventListener('connected', this._connection_connected_bind);
    this._connection_userready_bind = FLOW.MultiuserClient.Client.prototype._connection_userready.bind(this);
    this._connection.addEventListener('userready', this._connection_userready_bind);
    this._connection_disconnected_bind = FLOW.MultiuserClient.Client.prototype._connection_disconnected.bind(this);
	this._connection.addEventListener('disconnected', this._connection_disconnected_bind);
	this._connection_commandreceived_bind = FLOW.MultiuserClient.Client.prototype._connection_commandreceived.bind(this);
	this._connection.addEventListener('commandreceived', this._connection_commandreceived_bind);
	this._connection_error_bind = FLOW.MultiuserClient.Client.prototype._connection_error.bind(this);
	this._connection.addEventListener('error', this._connection_error_bind);
	return this;
}

// The public API
FLOW.MultiuserClient.Client.prototype.setRemoteUserObject3DProvider = function(provider) {
	if (provider && typeof(provider) !== "function") throw "ERROR: The provider is not a function.";
	this._remoteUserObject3DProvider = provider;
	return this;
};

FLOW.MultiuserClient.Client.prototype.setObject3D = function(object3d) {
	if (!object3d || !(object3d instanceof THREE.Object3D)) return this;
	object3d.position.copy(this._object3d.position);
	object3d.quaternions.copy(this._object3d.quaternion);
	this._object3d = object3d;
	return this;
};

FLOW.MultiuserClient.Client.prototype.getObject3D = function() {
	return this._object3d;
}

FLOW.MultiuserClient.Client.prototype.setUpdateDelay = function(updateDelay) {
	this._updateDelay = updateDelay;
};

FLOW.MultiuserClient.Client.prototype.connectToServer = function(url, port) {
	this._connection = new FLOW.Net.WebSocketConnectionClient();	
	this._addConnectionListeners();
	this._url = url || "ws://127.0.0.1";
	this._port = port || FLOW.Net.WebSocketServer.DEFAULT_PORT;
	this._connection.connect(this._url + ":" + this._port);
	return this;
};

FLOW.MultiuserClient.Client.prototype.disconnectFromServer = function() {
	this._connection.disconnect();
	return this;
};

FLOW.MultiuserClient.Client.prototype.requestAllExperiences = function() {
	this._connection.sendCommand({
		id: FLOW.Multiuser.CommandIds.REQUEST_ALL_EXPERIENCES
	});
	return this;
};

FLOW.MultiuserClient.Client.prototype.requestAvailableExperiencesAsUser = function() {
	this._connection.sendCommand({
		id: FLOW.Multiuser.CommandIds.REQUEST_AVAILABLE_EXPERIENCES_AS_USER
	});
	return this;
};

FLOW.MultiuserClient.Client.prototype.requestAvailableExperiencesAsViewer = function() {
	this._connection.sendCommand({
		id: FLOW.Multiuser.CommandIds.REQUEST_AVAILABLE_EXPERIENCES_AS_VIEWER
	});
	return this;
};

FLOW.MultiuserClient.Client.prototype.connectToExperienceAsUser = function(experienceId, userSlotId) {
	this._connection.sendCommand({
		id: FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_USER,
		data: {
			experienceId: experienceId,
			userSlotId: userSlotId
		}
	})
	return this;
};

FLOW.MultiuserClient.Client.prototype.connectToExperienceAsViewer = function(experienceId) {
	this._connection.sendCommand({
		id: FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_VIEWER,
		data: {
			experienceId: experienceId
		}
	})
	return this;
};

FLOW.MultiuserClient.Client.prototype.disconnectFromExperience = function() {
	this._connection.sendCommand({
		id: FLOW.Multiuser.CommandIds.DISCONNECT_FROM_EXPERIENCE
	})
	return this;
};

FLOW.MultiuserClient.Client.prototype.update = function(time) {
	time = time === undefined ? performance.now() : time;
	if (this._lastUpdateTime < 0) this._lastUpdateTime = time;
	var elapsedTime = time - this._lastUpdateTime;
	this._lastUpdateTime = time;
	this._accumUpdateTime += elapsedTime;
	if (this._accumUpdateTime > this._updateDelay) {
		// Restart the accumulated time
		this._accumUpdateTime = this._updateDelay === 0 ? 0 : this._accumUpdateTime % this._updateDelay;

		// Send the user update
		if (this._userId && this._object3d && this._connection) {
			this._connection.sendCommand({
				id: FLOW.Multiuser.CommandIds.USER_UPDATE,
				data: {
					id: this._userId,
					position: this._object3d.position,
					orientation: this._object3d.quaternion
				}
			})
		}
	}

	for (var id in this._remoteUsers) {
		var remoteUser = this._remoteUsers[id];
		remoteUser.update(time);
	}
	return this;
};

FLOW.MultiuserClient.Client.prototype.getRemoteUsers = function() {
    return this._remoteUsers;
};

FLOW.MultiuserClient.Client.prototype.areRemoteUsersReady = function() {
    var remoteUsers =this.getRemoteUsers();
    for (var user in remoteUsers) {
  //  for (var i = 0; i < remoteUsers.length; i++) {
        if (! remoteUsers[user]._isUserReady) {
            return false;
        }
    }
    return true;
};

FLOW.MultiuserClient.Client.prototype.remoteUserReady = function() {
    //TODO
};

FLOW.MultiuserClient.Client.prototype.sendCommand = function(command, userId) {
	if (!this._connection) throw "ERROR: Cannot send a command until you are connected to a server."
	if (typeof(userId) === "string") {
		this._connection.sendCommand({
			id: FLOW.Multiuser.CommandIds.SEND_COMMAND_TO_USER,
			userId: userId,
			data: command
		})
	}
	else {
		this._connection.sendCommand(command);
	}
	return this;
};


FLOW.MultiuserClient.Client.prototype.sendUserReady = function( userId) {
    if (!this._connection) throw "ERROR: Cannot send a command until you are connected to a server."
    if (typeof(userId) === "string") {
        this._connection.sendCommand({
            id: FLOW.Multiuser.CommandIds.USER_READY,
            userId: userId
        })
    }

    return this;
};


FLOW.MultiuserClient.Client.prototype.getUserId = function() {
	return this._userId;
};

/*

Multiuser Experience Creation tool

- The client connects to the server. The server provides a list of all existint experiences.
- The server shows the existing experiences list.
- The client can:
	- Select an experience and remove it. Confirmation is needed.
	- Create a new experience or select an experience and edit it.
		- The editor allows to:
			- Provide an id for the experience. The server will varify that the id is unique.
			- Provide the dimensions of the experience: width and depth.
			* By default, a new experience already will provide an experience id and a default dimensions.
			- Edit uses in the experience space
				- A new user id is created by clicking anywhere in the plane that represents the dimensions of the experience
				- By default, an id is provided to each user.
				- Each user has a visual cue in the form of a pyramid. A user can be selected by clicking on the pyramid.
				- Drag and dropping allows to move the user in the plane. The user cannot be moved outside of the limits of the plane dimensions.
				- A user can be deleted by selecting it and pressing delete.

{
	experiences: {
		id: {
			description: string,
			dimensions: {
				width: number,
				depth: number
			}
			users: {
				id: string,
				position: { x: number, y: number, z: number },
				orientation: {x: number, y: number, z: number, w: number},
			}
		}
	}
}


*/

// =======================================================================================\
/**
{
	object3d: THREE.Object3D
	scene: scene,
	url: string,
	remoteUserObject3DProvider: function(remoteUser),
	port: number, // TODO: Not supported yet. It could be passed in the URL.
	experienceId: string,
	userSlotId: string,
	isUser: boolean,
	updateDelay: number
}
*/
FLOW.MultiuserClient.ClientHelper = function(params) {
	FLOW.EventUtils.Observable.call(this);
	
	if (typeof(params) !== "object") throw "ERROR: A ClientHelper needs some parameters to be instantiated.";
	if (!(params.object3d instanceof THREE.Object3D)) throw "ERROR: An object3d is required to be able to represent the client.";
	if (! ( (params.scene instanceof THREE.Scene) || (params.scene instanceof THREE.Object3D)) ) throw "ERROR: An scene is required to be able to handle the remote user deletion correctly.";
	if (typeof(params.remoteUserObject3DProvider) !== "function") throw "ERROR: A remote user object3d provider function is required to be able to assign a THREE.Object3D to every remote user.";

	this._scene = params.scene;
	this._remoteUserObject3DProvider = params.remoteUserObject3DProvider;
	this._client = new FLOW.MultiuserClient.Client(params.object3d);

	// These parameters come from the URL as parameters. They have the highest priority.
	var urlArguments = FLOW.Net.parseQueryArguments();
	this._url_param = urlArguments.url;
	this._experienceId_param= typeof urlArguments.experienceId !== "undefined" ? urlArguments.experienceId :
        typeof(params.experienceId) !== "undefined" ? params.experienceId : undefined;
	this._userSlotId_param = typeof(urlArguments.userSlotId) !== "undefined" ? urlArguments.userSlotId :
        typeof(params.userSlotId) !== "undefined" ? params.userSlotId : "0";
	this._isUser_param = typeof(urlArguments.isUser) !== "undefined" ? urlArguments.isUser !== "false" : urlArguments.isUser == "true";
	this._updateDelay_param = Number(urlArguments.updateDelay) !== NaN ? Number(urlArguments.updateDelay) : undefined;

	// These parameters are microprogrammed. They are passed in the params argument of this function and are used if the query parameters are not provided.
	// They are most likely to be microprogrammed from the code that calls to the function.
	this._url_microprogrammed = params.url;
	this._experienceId_microprogrammed = params.experienceId;
	this._userSlotId_micorprogrammed = params.userSlotId;
	this._isUser_microprogrammed = params.isUser;
	this._updateDelay_microprogrammed = params.updateDelay;

	// These are the final parameters that will be used
	this._url = undefined;
	this._experienceId = undefined;
	this._userSlotId = undefined;
	this._isUser = undefined; // false for viewer or undefined for selection prompt
	this._updateDelay = undefined;

	// Create the event binds (so they can be removed/reused at anytime)
	this._connectedToServerBind = FLOW.MultiuserClient.ClientHelper.prototype._connectedToServer.bind(this);
	this._disconnectedFromServerBind = FLOW.MultiuserClient.ClientHelper.prototype._disconnectedFromServer.bind(this);
	this._errorBind = FLOW.MultiuserClient.ClientHelper.prototype._error.bind(this);
	this._allExperiencesReceivedBind = FLOW.MultiuserClient.ClientHelper.prototype._allExperiencesReceived.bind(this);
	this._availableExperiencesReceivedBind = FLOW.MultiuserClient.ClientHelper.prototype._availableExperiencesReceived.bind(this);
	this._availableExperiencesReceivedBind = FLOW.MultiuserClient.ClientHelper.prototype._availableExperiencesReceived.bind(this);
	this._connectedToExperienceBind = FLOW.MultiuserClient.ClientHelper.prototype._connectedToExperience.bind(this);
	this._connectionToExperienceFailedBind = FLOW.MultiuserClient.ClientHelper.prototype._connectionToExperienceFailed.bind(this);
	this._connectionToExperienceFailedBind = FLOW.MultiuserClient.ClientHelper.prototype._connectionToExperienceFailed.bind(this);
	this._remoteUserDisconnectedBind = FLOW.MultiuserClient.ClientHelper.prototype._remoteUserDisconnected.bind(this);
	this._disconnectedFromExperienceBind = FLOW.MultiuserClient.ClientHelper.prototype._disconnectedFromExperience.bind(this);
    this._commandReceivedBind = FLOW.MultiuserClient.ClientHelper.prototype._commandReceived.bind(this);
    this._userReadyBind = FLOW.MultiuserClient.ClientHelper.prototype._userReady.bind(this);
    this._userResetBind = FLOW.MultiuserClient.ClientHelper.prototype._userReset.bind(this);
    this._userUpdateDataBind = FLOW.MultiuserClient.ClientHelper.prototype._userUpdateData.bind(this);

    return this;
};

FLOW.OOPUtils.prototypalInheritance(FLOW.MultiuserClient.ClientHelper, FLOW.EventUtils.Observable);

FLOW.MultiuserClient.ClientHelper.prototype._setupInitialParameters = function() {
	this._url = this._url_param !== undefined ? this._url_param : this._url_microprogrammed;
	this._experienceId = this._experienceId_param !== undefined ? this._experienceId_param : this._experienceId_microprogrammed;
	this._userSlotId = this._userSlotId_param !== undefined ? this._userSlotId_param : this._userSlotId_micorprogrammed;
	this._isUser = this._isUser_param !== undefined ? this._isUser_param : this._isUser_microprogrammed;
	this._updateDelay = this._updateDelay_param !== undefined ? this._updateDelay_param : this._updateDelay_microprogrammed;
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype._askTheUserForTheUserSlotId = function(experience) {
	if (this._isUser && experience.requiresUserSlotId) {
		var emptyUserSlots = FLOW.Multiuser.getExperienceEmptyUserSlots(experience);
		var userSlotIds = ""
		for (var i = 0; i < emptyUserSlots.length; i++) {
			userSlotIds += "    " + emptyUserSlots[i].id + (i < emptyUserSlots.length - 1 ? "\n" : "");
		}
		var initialMessage = "The selected multiuser experience '" + experience.id + "' requires an available user slot to be selected.\n\n";
		do {
			this._userSlotId = prompt(initialMessage + "These are the id-s of the available user slots:\n" + userSlotIds + "\n\nEnter the user slot id you would like to connect to:");
			if (this._userSlotId === null) {
				this._userSlotId = undefined;
			}
			else if (this._userSlotId === "") {
				initialMessage = "ERROR: The user slot id cannot be an empty string.\n\n";
			}
		}
		while(this._userSlotId === "");
	}
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype._askTheUserForTheExperienceId = function(experiences) {
	if (this._experienceId === undefined) {
		var experienceIds = "";
		for (var i = 0; i < experiences.length; i++) {
			experienceIds += "    " + experiences[i].id + (i < experiences.length - 1 ? "\n" : "");
		}
		var initialMessage = "";
		do {
			this._experienceId = prompt(initialMessage + "These are the id-s of the available experiences:\n" + experienceIds + "\n\nEnter the experience id you would like to connect to:");
			if (this._experienceId === null) {
				this._experienceId = undefined;
			}
			else if (this._experienceId === "") {
				initialMessage = "ERROR: The experience id cannot be an empty string.\n\n";
			}
		}
		while(this._experienceId === "");
	}
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype._connectToExperience = function(experience) {
	if (this._isUser === undefined) {
		this._isUser = confirm("Would you like to connect as a user (or as a viewer)?\n\nYes/Ok = User\nNo/Cancel = Viewer");
	}
	if (this._experienceId === undefined) {
		this._isUser ? this._client.requestAvailableExperiencesAsUser() : this._client.requestAvailableExperiencesAsViewer();
	}
	else {
		// If the this._userSlotId is undefined, just ask for the available experiences to verify that is not needed.
		if (this._isUser && this._userSlotId === undefined && !experience) {
			this._isUser ? this._client.requestAvailableExperiencesAsUser() : this._client.requestAvailableExperiencesAsViewer();
		}
		else {
			this._isUser ? this._client.connectToExperienceAsUser(this._experienceId, this._userSlotId) : this._client.connectToExperienceAsViewer(this._experienceId);
		}
	}
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype._connectToServer = function() {
    this._client.addEventListener("connectedtoserver", this._connectedToServerBind);
    this._client.addEventListener("userready", this._userReadyBind);
    this._client.addEventListener("userreset", this._userResetBind);
    this._client.addEventListener("userupdatedata", this._userUpdateDataBind);
    this._client.addEventListener("disconnectedfromserver", this._disconnectedFromServerBind);
	this._client.addEventListener("error", this._errorBind);
	this._client.addEventListener("allexperiencesreceived", this._allExperiencesReceivedBind);
	this._client.addEventListener("availableexperiencesasuserreceived", this._availableExperiencesReceivedBind);
	this._client.addEventListener("availableexperiencesasviewerreceived", this._availableExperiencesReceivedBind);
	this._client.addEventListener("connectedtoexperienceasuser", this._connectedToExperienceBind);
	this._client.addEventListener("connectedtoexperienceasviewer", this._connectedToExperienceBind);
	this._client.addEventListener("connectiontoexperienceasuserfailed", this._connectionToExperienceFailedBind);
	this._client.addEventListener("connectiontoexperienceasviewerfailed", this._connectionToExperienceFailedBind);
	this._client.addEventListener("remoteuserdisconnected", this._remoteUserDisconnectedBind);
	this._client.addEventListener("disconnectedfromexperience", this._disconnectedFromExperienceBind);
    this._client.addEventListener("commandreceived", this._commandReceivedBind);

    this._setupInitialParameters();

	if (this._url === undefined) {
		var initialMessage = "";
		do {
			this._url = prompt(initialMessage + "Enter the URL of the server:");
			if (this._url === null) {
				this._url = undefined;
				return;
			}
			else if (this._url === "") {
				initialMessage = "ERROR: The this._url cannot be an empty string.\n\n";
			}
		}
		while(this._url === "");
	}
	if (this._url !== undefined) {
		this._client.setRemoteUserObject3DProvider(this._remoteUserObject3DProvider);
		this._client.connectToServer(this._url);
		this._client.setUpdateDelay(this._updateDelay || 0);
	}
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype._connectedToServer = function() {
    this._connectToExperience();
    return this;
};

FLOW.MultiuserClient.ClientHelper.prototype._userReady = function() {
    this._userReady = true;
    this._client.remoteUserReady()
    return this;
};


FLOW.MultiuserClient.ClientHelper.prototype._userReset = function() {
    this._client.remoteUserReset()
    return this;
};


FLOW.MultiuserClient.ClientHelper.prototype._userUpdateData = function() {
    this._client.remoteUserUpdateData()
    return this;
};



FLOW.MultiuserClient.ClientHelper.prototype._disconnectedFromServer = function() {
    this._client.removeEventListener("connectedtoserver", this._connectedToServerBind);
    this._client.removeEventListener("userready", this._userReadyBind);
    this._client.removeEventListener("userreset", this._userResetBind);
    this._client.removeEventListener("userupdatedata", this._userUpdateDataBind);
    this._client.removeEventListener("disconnectedfromserver", this._disconnectedFromServerBind);
	this._client.removeEventListener("error", this._errorBind);
	this._client.removeEventListener("allexperiencesreceived", this._allExperiencesReceivedBind);
	this._client.removeEventListener("availableexperiencesasuserreceived", this._availableExperiencesReceivedBind);
	this._client.removeEventListener("availableexperiencesasviewerreceived", this._availableExperiencesReceivedBind);
	this._client.removeEventListener("connectedtoexperienceasuser", this._connectedToExperienceBind);
	this._client.removeEventListener("connectedtoexperienceasviewer", this._connectedToExperienceBind);
	this._client.removeEventListener("connectiontoexperienceasuserfailed", this._connectionToExperienceFailedBind);
	this._client.removeEventListener("connectiontoexperienceasviewerfailed", this._connectionToExperienceFailedBind);
	this._client.removeEventListener("remoteuserdisconnected", this._remoteUserDisconnectedBind);
	this._client.removeEventListener("disconnectedfromexperience", this._disconnectedFromExperienceBind);
	this._client.removeEventListener("commandreceived", this._commandReceivedBind);

	var remoteUsers = this._client.getRemoteUsers();
	for (var id in remoteUsers) {
		this._scene.remove(remoteUsers[id].getObject3D());
	}
	this.callEventListeners('disconnected');

	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype.getUsersConnectedCount  = function(){
    var remoteUsers = this._client.getRemoteUsers();
    var usersCount = 0;
    for (var id in remoteUsers) {
        usersCount ++
    }
    return usersCount;
};

FLOW.MultiuserClient.ClientHelper.prototype.getUsersReadyCount  = function(){
    var remoteUsers = this._client.getRemoteUsers();
    var usersCount = 0;
    for (var id in remoteUsers) {
        if (remoteUsers[id]._isUserReady ) {
            usersCount++
        }
    }
    return usersCount;
};

FLOW.MultiuserClient.ClientHelper.prototype._error = function(errorMessage) {
	this.callEventListeners('error', errorMessage);
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype._availableExperiencesReceived = function(experiences) {
	if (experiences.length === 0) {
		if (confirm("IMPORTANT: There are not currently any experiences available.\n\nRefresh the list?")) {
			this._isUser ? this._client.requestAvailableExperiencesAsUser() : this._client.requestAvailableExperiencesAsViewer();
		}
		else {
			this._client.disconnectFromServer();
		}
	}
	else if (this._experienceId !== undefined) {
		var experience = FLOW.Multiuser.getExperienceById(experiences, this._experienceId);
		if (this._isUser && experience && experience.requiresUserSlotId && this._userSlotId === undefined) {
			this._askTheUserForTheUserSlotId(experience);
		}
		this._connectToExperience(experience);
	}
	else {
		this._askTheUserForTheExperienceId(experiences);
		if (this._experienceId !== undefined) {
			this._connectToExperience();
		}
		else {
			this._client.disconnectFromServer();
		}
	}
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype._allExperiencesReceived = function(experiences) {
	experiences = this._isUser ? FLOW.Multiuser.getAvailableExperiencesAsUser(experiences) : FLOW.Multiuser.getAvailableExperiencesAsViewer(experiences);
	this._availableExperiencesReceived(experiences);
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype._connectedToExperience = function() {
	this.callEventListeners('connected');
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype._connectionToExperienceFailed = function(response) {
	switch(response) {
		case FLOW.Multiuser.ConnectToExperienceAsUserResponse.UNKNOWN_EXPERIENCE:
			var errorMessage = "The connection to the experience failed. The provided experience id does not exist in the server.";
			console.error(errorMessage);
			if (confirm(errorMessage + "\n\nTry with a different id?")) {
				this._experienceId = undefined;
				this._connectToExperience();
			}
			else {
				this._client.disconnectFromServer();
			}
			break;
		case FLOW.Multiuser.ConnectToExperienceAsUserResponse.ALREADY_CONNECTED:
			var errorMessage = "The connection to the experience failed. You are already connected to an experience.";
			console.error(errorMessage);
			if (confirm(errorMessage + "\n\nDisconnect?")) {
				this._client.disconnectFromExperience();
			}
			else {
				this._client.disconnectFromServer();
			}
			break;
		case FLOW.Multiuser.ConnectToExperienceAsUserResponse.ERROR:
			var errorMessage = "The connection to the experience failed with an ERROR";
			console.error(errorMessage);
			alert(errorMessage);
			this._client.disconnectFromServer();
			break;

		case FLOW.Multiuser.ConnectToExperienceAsUserResponse.UNKNOWN_USER_SLOT:
			var errorMessage = "The connection to the experience failed. The provided experience user slot id does not exist in the server.";
			console.error(errorMessage);
			if (confirm(errorMessage + "\n\nTry a different user slot id?")) {
				this._userSlotId = undefined;
				this._isUser ? this._client.requestAvailableExperiencesAsUser() : this._client.requestAvailableExperiencesAsViewer();
			}
			else {
				this._client.disconnectFromServer();
			}
			break;
		case FLOW.Multiuser.ConnectToExperienceAsUserResponse.USER_SLOT_NOT_AVAILABLE:
			var errorMessage = "The connection to the experience failed. The provided experience slot id is not available in the server.";
			console.error(errorMessage);
			if (confirm(errorMessage + "\n\nTry a different user slot id?")) {
				this._userSlotId = undefined;
				this._isUser ? this._client.requestAvailableExperiencesAsUser() : this._client.requestAvailableExperiencesAsViewer();
			}
			else {
				this._client.disconnectFromServer();
			}
			break;

		case FLOW.Multiuser.ConnectToExperienceAsViewerResponse.VIEWER_NOT_ALLOWED:
			var errorMessage = "The connection to the experience failed. No viewers allowed in the experience.";
			console.error(errorMessage);
			if (confirm(errorMessage + "\n\nTry a different experience id?")) {
				this._experienceId = undefined;
				this._connectToExperience();
			}
			else {
				this._client.disconnectFromServer();
			}
			break;
	}
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype._disconnectedFromExperience = function() {
	disconnectFromServer();
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype._remoteUserDisconnected = function(remoteUser) {
	this._scene.remove(remoteUser.getObject3D());
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype._commandReceived = function(data) {
	this.callEventListeners('commandreceived', data);
	return this;
};


// Public API

/**
Events
	'connected'
	'disconnected'
	'commandreceived'
	'error'
*/

FLOW.MultiuserClient.ClientHelper.prototype.connect = function() {
    this._connectToServer();
    return this;
};

FLOW.MultiuserClient.ClientHelper.prototype.userReady = function( remoteUser ) {
    this._client.userReady( remoteUser );
    return this;
};

FLOW.MultiuserClient.ClientHelper.prototype.userReset = function(  ) {
    this._client.userReset(  );
    return this;
};

FLOW.MultiuserClient.ClientHelper.prototype.userUpdateData = function(  ) {
    this._client.userUpdateData(  );
    return this;
};

FLOW.MultiuserClient.ClientHelper.prototype.disconnect = function() {
	this._client.disconnectFromServer();
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype.update = function(time) {
	this._client.update(time);
	return this;
};

FLOW.MultiuserClient.ClientHelper.prototype.sendCommand = function(command, userId) {
    this._client.sendCommand(command, userId);
    return this;
};

FLOW.MultiuserClient.ClientHelper.prototype.sendUserReady = function( userId) {
    this._client.sendUserReady( userId);
    return this;
};

FLOW.MultiuserClient.ClientHelper.prototype.getClient = function() {
	return this._client;
};

FLOW.MultiuserClient.ClientHelper.prototype.isUser = function() {
	return !!this._isUser;
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.MultiuserClient;
}));
