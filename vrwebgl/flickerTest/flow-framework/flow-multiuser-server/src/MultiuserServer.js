var THREE = THREE || require('three');

var FLOW = FLOW || {};

FLOW.Net = FLOW.Net || require('flow-net');
FLOW.Multiuser = FLOW.Multiuser || require('flow-multiuser');

FLOW.MultiuserServer = {};

FLOW.MultiuserServer.User = function(params) {
	this.id = params.id;
	this.experience = params.experience;
	this.userSlot = params.userSlot;
	this.connection = params.connection;
	this.position = params.position;
	this.orientation = params.orientation;
    this.isUserReady = false;
	return this;
};

FLOW.MultiuserServer.User.prototype.getForCommand = function() {
	var user = {
		id: this.id,
		position: this.position,
		orientation: this.orientation,
        isUserReady: this.isUserReady
	};
	return user;
};

FLOW.MultiuserServer.Viewer = function(params) {
	this.connection = params.connection;
	this.experience = params.experience;
	return this;
};

FLOW.MultiuserServer.Server = function(port) {
	this.server = new FLOW.Net.WebSocketServer();
	this.users = {};
	this.nextUserId = 0;
	this.viewers = [];

	/*
	Equations for a equilateral triangle centered in 0, 0, 0
	*/
	var sideSize = 11;
	var halfSideSize = sideSize / 2;
	var l = Math.sqrt((sideSize * sideSize) - (halfSideSize * halfSideSize));
	var r = ((halfSideSize * halfSideSize) - (l * l)) / (-2 * l);
	var v = l - r;
	this.experiences = [
		{
			id: "0",
			description: "The default open experience. No user id is required. Any number of users or viewers can connect to it.",
			dimensions: {
				x: 100,
				y: 100,
				z: 100
			},
			requiresUserSlotId: false,
			allowsViewers: true,
			users: {},
			viewers: []
		},
		{
			id: "1",
			description: "Flow-ideas experience.",
			dimensions: {
				x: 10,
				y: 0,
				z: 10
			},
			requiresUserSlotId: true,
			allowsViewers: true,
			users: {},
			viewers: [],
			userSlots: [ 
				{
					id: "0",
					user: null,
					position: new THREE.Vector3(halfSideSize, 2, -r),
					orientation: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI + Math.PI / 4)
				},
				{
					id: "1",
					user: null,
					position: new THREE.Vector3(-halfSideSize, 2, -r),
					orientation: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4)
				},
				{
					id: "2",
					user: null,
					position: new THREE.Vector3(0, 2, v),
					orientation: new THREE.Quaternion()
				}
			]
		},
        {
            id: "2",
            description: "Flow-of-flow experience",
            dimensions: {
                x: 5,
                y: 0,
                z: 5
            },
            requiresUserSlotId: true,
            allowsViewers: true,
            users: {},
            viewers: [],
            userSlots: [
                {
                    id: "0",
                    user: null,
                    position: new THREE.Vector3(0,0,0),
                    orientation: new THREE.Quaternion()
                },
                {
                    id: "1",
                    user: null,
                    position: new THREE.Vector3(1,0,0),
                    orientation: new THREE.Quaternion()
                },
                {
                    id: "2",
                    user: null,
                    position: new THREE.Vector3(-1, 0,0),
                    orientation: new THREE.Quaternion()
                }
            ]
        }
	];

	this.server.addEventListener('connectioncreated', function(connection) {
		console.log("Connection created! " + (connection instanceof FLOW.Net.WebSocketConnection));
		connection.disconnected_bind = FLOW.MultiuserServer.Server.prototype.connection_disconnected.bind(this, connection);
		connection.addEventListener('disconnected', connection.disconnected_bind);
		connection.commandreceived_bind = FLOW.MultiuserServer.Server.prototype.connection_commandreceived.bind(this, connection);
		connection.addEventListener('commandreceived', connection.commandreceived_bind);
		connection.error_bind = FLOW.MultiuserServer.Server.prototype.connection_error.bind(this, connection);
		connection.addEventListener('error', connection.error_bind);
	}.bind(this));

	this.server.start(port);
	return this;
};

/**
When the list of experiences is sent to the client some data from the experiences
structure cannot be sent. This function creates an equivalent structure without the 
data that cannoe be sent (users, viewers, user).
*/
FLOW.MultiuserServer.Server.prototype.getExperiencesForCommand = function() {
	var experiencesForCommand = new Array(this.experiences.length);
	for (var i = 0; i < this.experiences.length; i++) {
		var experience = this.experiences[i];
		var newExperience = {};
		for (var prop in experience) {
			if (prop !== "userSlots" && prop !== "users" && prop !== "viewers") {
				newExperience[prop] = experience[prop];
			}
		}
		if (experience.requiresUserSlotId) {
			newExperience.userSlots = new Array(experience.userSlots.length);
			for (var j = 0; j < experience.userSlots.length; j++) {
				var userSlot = experience.userSlots[j];
				var newUserSlot = {};
				for (var prop in userSlot) {
					if (prop === "user" && userSlot.user) {
						newUserSlot.userId = userSlot.user.id;
					}
					else {
						newUserSlot[prop] = userSlot[prop];
					}
				}
				newExperience.userSlots[j] = newUserSlot;
			}
		}
		experiencesForCommand[i] = newExperience;
	}
	return experiencesForCommand;
};

FLOW.MultiuserServer.Server.prototype.newUserId = function() {
	var id = "" + this.nextUserId;
	this.nextUserId++;
	return id;
};

FLOW.MultiuserServer.Server.prototype.getUserById = function(id) {
	return this.users[id];
};

FLOW.MultiuserServer.Server.prototype.getUserByConnection = function(connection, experience) {
	var users = experience ? experience.users : this.users;
	for (var id in users) {
		var user = users[id];
		if (user.connection === connection) {
			return user;
		}
	}
	return null;
};

FLOW.MultiuserServer.Server.prototype.getViewerIndexByConnection = function(connection, experience) {
	var viewers = experience ? experience.viewers : this.viewers;
	for (var i = 0; i < viewers.length; i++) {
		var viewer = viewers[i];
		if (viewer.connection === connection) {
			return i;
		}
	}
	return -1;
};

FLOW.MultiuserServer.Server.prototype.getViewerByConnection = function(connection, experience) {
	var viewers = experience ? experience.viewers : this.viewers;
	var i = this.getViewerIndexByConnection(connection, experience);
	return i >= 0 ? viewers[i] : null;
};

FLOW.MultiuserServer.Server.prototype.getExperienceIndexById = function(id) {
	return FLOW.Multiuser.getExperienceIndexById(this.experiences, id);
};

FLOW.MultiuserServer.Server.prototype.getExperienceById = function(id) {
	return FLOW.Multiuser.getExperienceById(this.experiences, id);
};

FLOW.MultiuserServer.Server.prototype.getExperienceByConnection = function(connection) {
	var experience = null;
	var user = this.getUserByConnection(connection);
	if (user) {
		return user.experience;
	}
	else {
		var viewer = this.getViewerByConnection(connection);
		if (viewer) {
			experience = viewer.experience;
		}
	}
	return experience;
};

FLOW.MultiuserServer.Server.prototype.getUserSlotById = function(experienceId, userSlotId) {
	var experience = typeof(experienceIdOnIndex) === "number" ? this.experiences[experienceIdOrIndex] : this.getExperienceById(experienceId);

};

FLOW.MultiuserServer.Server.prototype.castCommand = function(command, experience) {
	return this.castCommandString(JSON.stringify(command), experience);
};

FLOW.MultiuserServer.Server.prototype.castCommandString = function(commandString, experience) {
	var users = this.users;
	var viewers = this.viewers;
	if (experience) {
		users = experience.users;
		viewers = experience.viewers;
	}
	for (var id in users) {
		var user = users[id];
		user.connection.sendCommandString(commandString);
	}
	for (var i = 0; i < viewers.length; i++) {
		var viewer = viewers[i];
		viewer.connection.sendCommandString(commandString);
	}
	return this;
};

FLOW.MultiuserServer.Server.prototype.castCommandExceptForConnection = function(command, connection, experience) {
	return this.castCommandStringExceptForConnection(JSON.stringify(command), connection, experience);
};

FLOW.MultiuserServer.Server.prototype.castCommandStringExceptForConnection = function(commandString, connection, experience) {
	var users = this.users;
	var viewers = this.viewers;
	if (experience) {
		users = experience.users;
		viewers = experience.viewers;
	}
	for (var id in users) {
		var user = users[id];
		if (user.connection !== connection) {
			user.connection.sendCommandString(commandString);
		}
	}
	for (var i = 0; i < viewers.length; i++) {
		var viewer = viewers[i];
		if (viewer.connection !== connection) {
			viewer.connection.sendCommandString(commandString);
		}
	}
	return this;
};

FLOW.MultiuserServer.Server.prototype.disconnectConnectionFromExperience = function(connection) {
	// Check if the connection belongs to a connected user
	var user = this.getUserByConnection(connection);
	if (user) {
		// Delete the user from the experience, the userSlot and the list of all the users
		delete user.experience.users[user.id];
		if (user.userSlot) {
			user.userSlot.user = null;
		}
		delete this.users[user.id];
		// Notify all the others in the experience that the user has disconnected
		this.castCommand({
			id: FLOW.Multiuser.CommandIds.USER_DISCONNECTED,
			data: {
				id: user.id
			}
		}, user.experience);
		console.log("User '" + user.id + "' removed from experience '" + user.experience.id + "'!");
	}
	// Viewers do not need to notify anyone.
	else {
		var viewer = this.getViewerByConnection();
		if (viewer) {			
			// Delete the viewer from the experience and the list of all the viewers
			this.viewers.splice(viewerIndex, 1);
			viewer.experience.viewers.splice(viewer.experience.viewers.indexOf(viewer), 1);
			console.log("Viewer at index '" + viewerIndex + "' removed from experience '" + user.experience.id + "'!");
		}
	}
	return this;
};

FLOW.MultiuserServer.Server.prototype.connection_disconnected = function(connection, data) {
	// Remove all the listener bindings for the connection
	connection.removeEventListener('disconnected', connection.disconnected_bind);
	connection.disconnected_bind = null;
	connection.removeEventListener('commandreceived', connection.commandreceived_bind);
	connection.commandreceived_bind = null;
	connection.removeEventListener('error', connection.error_bind);
	connection.error_bind = null;
	this.disconnectConnectionFromExperience(connection);
	console.log("Connection disconnected!");
};

// TODO: Every command should be treated in a specialized function. Also, verify that all the parameters
// for the command are completely correct for each command.
FLOW.MultiuserServer.Server.prototype.connection_commandreceived = function(connection, data) {
	var command = data.command;
	if (command.id === FLOW.Multiuser.CommandIds.REQUEST_ALL_EXPERIENCES) {
		connection.sendCommand({
			id: FLOW.Multiuser.CommandIds.REQUEST_ALL_EXPERIENCES_RESPONSE,
			data: this.getExperiencesForCommand()
		});
		console.log("Command '" + command.id + "' received. Response sent.");
	}

	else if (command.id === FLOW.Multiuser.CommandIds.REQUEST_AVAILABLE_EXPERIENCES_AS_USER) {
		var availableExperiences = FLOW.Multiuser.getAvailableExperiencesAsUser(this.getExperiencesForCommand());
		connection.sendCommand({
			id: FLOW.Multiuser.CommandIds.REQUEST_AVAILABLE_EXPERIENCES_AS_USER_RESPONSE,
			data: availableExperiences
		});
		console.log("Command '" + command.id + "' received. Response sent.");
	}

	else if (command.id === FLOW.Multiuser.CommandIds.REQUEST_AVAILABLE_EXPERIENCES_AS_VIEWER) {
		var availableExperiences = FLOW.Multiuser.getAvailableExperiencesAsViewer(this.getExperiencesForCommand());
		connection.sendCommand({
			id: FLOW.Multiuser.CommandIds.REQUEST_AVAILABLE_EXPERIENCES_AS_VIEWER_RESPONSE,
			data: availableExperiences
		});
		console.log("Command '" + command.id + "' received. Response sent.");
	}

	else if (command.id === FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_USER) {
		// Check if this connection has already been connected
		var user = this.getUserByConnection(connection);
		var viewer = this.getViewerByConnection(connection);
		if (user || viewer) {
			connection.sendCommand({
				id: FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_USER_RESPONSE,
				data: {
					response: FLOW.Multiuser.ConnectToExperienceAsUserResponse.ALREADY_CONNECTED
					// Maybe send the experience id?
				}
			});
			return this;
		}
		var experienceId = command.data.experienceId;
		var experience = this.getExperienceById(experienceId);
		if (!experience) {
			connection.sendCommand({
				id: FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_USER_RESPONSE,
				data: {
					response: FLOW.Multiuser.ConnectToExperienceAsUserResponse.UNKNOWN_EXPERIENCE
				}
			});
			return this;
		}
		var responseCommand;
		if (experience.requiresUserSlotId) {
			var userSlotId = command.data.userSlotId;
			var userSlot = FLOW.Multiuser.getUserSlotById(experience, userSlotId);
			if (!userSlot) {
				connection.sendCommand({
					id: FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_USER_RESPONSE,
					data: {
						response: FLOW.Multiuser.ConnectToExperienceAsUserResponse.UNKNOWN_USER_SLOT
					}
				});
				return this;
			}
			if (userSlot.user) {
				connection.sendCommand({
					id: FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_USER_RESPONSE,
					data: {
						response: FLOW.Multiuser.ConnectToExperienceAsUserResponse.USER_SLOT_NOT_AVAILABLE
					}
				});
				return this;
			}
			user = new FLOW.MultiuserServer.User({
				id: this.newUserId(), 
				experience: experience, 
				connection: connection,
				position: new THREE.Vector3().copy(userSlot.position),
				orientation: new THREE.Quaternion().copy(userSlot.orientation),
				userSlot: userSlot
			});
			// Reference the user in the userSlot he will be occupying
			userSlot.user = user;
		}
		else {
			user = new FLOW.MultiuserServer.User({
				id: this.newUserId(), 
				experience: experience, 
				connection: connection,
				position: new THREE.Vector3((0.5 - Math.random()) * experience.dimensions.x, (0.5 - Math.random()) * experience.dimensions.y, (0.5 - Math.random()) * experience.dimensions.z),
				orientation: new THREE.Quaternion()
			});
		}
		// Notify other's in the experience about the new user
		var userForCommand = user.getForCommand();
		this.castCommand({
			id: FLOW.Multiuser.CommandIds.NEW_USER,
			data: userForCommand
		}, experience);
		// Respond to the user providing the information of the other users in the experience
		var otherUsers = {};
		for (var id in experience.users) {
			otherUsers[id] = experience.users[id].getForCommand();
		}
		connection.sendCommand({
			id: FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_USER_RESPONSE,
			data: {
				response: FLOW.Multiuser.ConnectToExperienceAsUserResponse.CONNECTED,
				id: user.id,
				position: user.position,
				orientation: user.orientation,
				otherUsers: otherUsers
			}
		});
		// Finally add the user to the global list and to the experience
		this.users[user.id] = user;
		experience.users[user.id] = user;
		console.log("Command '" + command.id + "' received. Response sent.");
	}

	else if (command.id === FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_VIEWER) {
		// Check if this connection has already been connected
		var user = this.getUserByConnection(connection);
		var viewer = this.getViewerByConnection(connection);
		if (user || viewer) {
			connection.sendCommand({
				id: FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_VIEWER_RESPONSE,
				data: {
					response: FLOW.Multiuser.ConnectToExperienceAsViewerResponse.ALREADY_CONNECTED
					// Maybe send the experience id?
				}
			});
			return this;
		}
		var experienceId = command.data.experienceId;
		var experience = this.getExperienceById(experienceId);
		if (!experience) {
			connection.sendCommand({
				id: FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_VIEWER_RESPONSE,
				data: {
					response: FLOW.Multiuser.ConnectToExperienceAsViewerResponse.UNKNOWN_EXPERIENCE
				}
			});
			return this;
		}
		if (!experience.allowsViewers) {
			connection.sendCommand({
				id: FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_VIEWER_RESPONSE,
				data: {
					response: FLOW.Multiuser.ConnectToExperienceAsViewerResponse.VIEWER_NOT_ALLOWED
				}
			});
			return this;
		}
		viewer = new FLOW.MultiuserServer.Viewer({
			experience: experience, 
			connection: connection
		});
		// Respond to the user providing the information of the other users in the experience
		var users = {};
		for (var id in experience.users) {
			users[id] = experience.users[id].getForCommand();
		}
		connection.sendCommand({
			id: FLOW.Multiuser.CommandIds.CONNECT_TO_EXPERIENCE_AS_VIEWER_RESPONSE,
			data: {
				response: FLOW.Multiuser.ConnectToExperienceAsViewerResponse.CONNECTED,
				users: users
			}
		});
		// Finally add the viewer to the global list and to the experience
		this.viewers.push(viewer);
		experience.viewers.push(viewer);
		console.log("Command '" + command.id + "' received. Response sent.");
	}

	else if (command.id === FLOW.Multiuser.CommandIds.DISCONNECT_FROM_EXPERIENCE) {
		this.disconnectConnectionFromExperience(connection);
		connection.sendCommand({
			id: FLOW.Multiuser.CommandIds.DISCONNECT_FROM_EXPERIENCE_RESPONSE
		});
	}

	else if (command.id === FLOW.Multiuser.CommandIds.USER_UPDATE) {
		var user = this.getUserByConnection(connection);
		if (user) {
			this.castCommandStringExceptForConnection(data.commandString, connection, user.experience);
		}
		else {
			console.error("ERROR: A USER_UPDATE command was received from a connection that does not belong to any user.");
			connection.sendCommand({
				id: FLOW.Multiuser.CommandIds.SERVER_ERROR,
				data: {
					serverErrorId: FLOW.Multiuser.ServerErrorIds.USER_UPDATE_OF_UNKNOWN_USER,
					originalCommand: data.command
				}
			});
		}
	}

	else if (command.id === FLOW.Multiuser.CommandIds.SEND_COMMAND_TO_USER) {
		var user = this.getUserById(command.userId);
		if (user) {
			user.connection.sendCommand(command.data);
		}
		else {
			console.error("ERROR: A command has been sent for user id '" + command.userId + "' but the user could not be found in the server.");
			connection.sendCommand({
				id: FLOW.Multiuser.CommandIds.SERVER_ERROR,
				data: {
					serverErrorId: FLOW.Multiuser.ServerErrorIds.COMMAND_SENT_TO_UNKNOWN_USER,
					originalCommand: data.command
				}
			});
		}
	}

    else if (command.id === FLOW.Multiuser.CommandIds.USER_READY) {
        var user = this.getUserByConnection(connection);
        console.log("User Ready received; " + command.userId);
        user.isUserReady = true;
        this.castCommandExceptForConnection({
            id: FLOW.Multiuser.CommandIds.UPDATE_DATA,
            data:command.data
        } , connection, experience);
    }

    else if (command.id === FLOW.Multiuser.CommandIds.START) {
        var experience = this.getExperienceByConnection(connection);
        console.log("Start received; " );
        this.castCommandExceptForConnection({
            id: FLOW.Multiuser.CommandIds.START,
            data: {
                id: FLOW.Multiuser.CommandIds.START
            }} , connection, experience);
    }


    else if (command.id === FLOW.Multiuser.CommandIds.RESET) {
        var experience = this.getExperienceByConnection(connection);
        console.log("Reset received; " );
        this.castCommandExceptForConnection({
            id: FLOW.Multiuser.CommandIds.RESET,
            data: {
                id: FLOW.Multiuser.CommandIds.RESET
            }} , connection, experience);
    }

    else if (command.id === FLOW.Multiuser.CommandIds.UPDATE_DATA) {
        var experience = this.getExperienceByConnection(connection);
        console.log("UpdateData received; " + command.data);

        this.castCommandExceptForConnection({
            id: FLOW.Multiuser.CommandIds.UPDATE_DATA,
            data: command.data
        } , connection, experience);
    }

    else if (command.id === FLOW.Multiuser.CommandIds.CREATE_OR_JOIN_AUDIO) {

        var experience = this.getExperienceByConnection(connection);
        var numClients = experience.users.length + experience.viewers.length;

        console.log("Reset received; " );
        this.castCommandExceptForConnection({
            id: FLOW.Multiuser.CommandIds.CREATE_OR_JOIN_AUDIO,
            data: {
                id: FLOW.Multiuser.CommandIds.CREATE_OR_JOIN_AUDIO
            }} , connection, experience);
    }

    else {
		var experience = this.getExperienceByConnection(connection);
		if (experience) {
			this.castCommandStringExceptForConnection(data.commandString, connection, experience);
		}
		else {
			console.error("ERROR: An unknown command was received from a connection that does not belong to any experience.");
			connection.sendCommand({
				id: FLOW.Multiuser.CommandIds.SERVER_ERROR,
				data: {
					serverErrorId: FLOW.Multiuser.ServerErrorIds.COMMAND_DOES_NOT_BELONG_TO_ANY_EXPERIENCE,
					originalCommand: data.command
				}
			});
		}
	}
	return this;
};

FLOW.MultiuserServer.Server.prototype.connection_error = function(connection, errorMessage) {
	// TODO: Show an advanced error message with the index/id of the user or viewer whos connection has provided the error.
	console.error(errorMessage);
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.MultiuserServer;
}));
