var THREE = THREE || require('three');

var FLOW = FLOW || {};

FLOW.Net = FLOW.Net || require('flow-net');

FLOW.Multiuser = {};

FLOW.Multiuser.getExperienceIndexById = function(experiences, id) {
	for (var i = 0; i < experiences.length; i++) {
		var experience = experiences[i];
		if (experience.id === id) {
			return i;
		}
	}
	return -1;
};

FLOW.Multiuser.getExperienceById = function(experiences, id) {
	var i = FLOW.Multiuser.getExperienceIndexById(experiences, id);
	return i >= 0 ? experiences[i] : null;
};

FLOW.Multiuser.getExperiencesWithEmptyUserSlots = function(experiences) {
	var experiencesWithEmptyUserSlots = [];
	for (var i = 0; i < experiences.length; i++) {
		var experience = experiences[i];
		if (experience.requiresUserSlotId && experience.userSlots instanceof Array) {
			var experienceHasAnEmptyUserSlot = false;
			for (var j = 0; !experienceHasAnEmptyUserSlot && j < experience.userSlots.length; j++) {
				experienceHasAnEmptyUserSlot = !experience.userSlots[j].userId && !experience.userSlots[j].user;
			}
			if (experienceHasAnEmptyUserSlot) {
				experiencesWithEmptyUserSlots.push(experience);
			}
		}
	}
	return experiencesWithEmptyUserSlots;
};

FLOW.Multiuser.getAvailableExperiencesAsUser = function(experiences) {
	var availableExperiences = [];
	for (var i = 0; i < experiences.length; i++) {
		var experience = experiences[i];
		if (experience.requiresUserSlotId && experience.userSlots instanceof Array) {
			var experienceHasAnEmptyUserSlot = false;
			for (var j = 0; !experienceHasAnEmptyUserSlot && j < experience.userSlots.length; j++) {
				experienceHasAnEmptyUserSlot = !experience.userSlots[j].userId && !experience.userSlots[j].user;
			}
			if (experienceHasAnEmptyUserSlot) {
				availableExperiences.push(experience);
			}
		}
		else {
			availableExperiences.push(experience);
		}
	}
	return availableExperiences;
};

FLOW.Multiuser.getExperienceEmptyUserSlots = function(experiences, experienceIdOrIndex) {
	var experience = null;
	if (experiences instanceof Array) {
		experience = typeof(experienceIdOrIndex) === "object" ? experienceIdOrIndex : typeof(experienceIdOrIndex) === "number" ? experiences[experienceIdOrIndex] : FLOW.Multiuser.getExperienceById(experienceIdOrIndex);
	}
	else {
		experience = experiences;
	}
	var emptyUserSlots = null;
	if (experience.requiresUserSlotId && experience.userSlots instanceof Array) {
		emptyUserSlots = [];
		for (var i = 0; i < experience.userSlots.length; i++) {
			if (!experience.userSlots[i].userId && !experience.userSlots[i].user) {
				emptyUserSlots.push(experience.userSlots[i]);
			}
		}
	}
	return emptyUserSlots;
};

FLOW.Multiuser.getUserSlotIndexById = function(experiences, experienceIdOrIndex, userSlotId) {
	var experience = null;
	if (experiences instanceof Array) {
		experience = typeof(experienceIdOrIndex) === "object" ? experienceIdOrIndex : typeof(experienceIdOrIndex) === "number" ? experiences[experienceIdOrIndex] : FLOW.Multiuser.getExperienceById(experienceIdOrIndex);
	}
	else {
		experience = experiences;
		userSlotId = experienceIdOrIndex;
	}
	if (experience.requiresUserSlotId && experience.userSlots instanceof Array) {
		for (var i = 0; i < experience.userSlots.length; i++) {
			var userSlot = experience.userSlots[i];
			if (userSlot.id === userSlotId) {
				return i
			}
		}
	}
	return -1;
};

FLOW.Multiuser.getUserSlotById = function(experiences, experienceIdOrIndex, userSlotId) {
	var experience = null;
	if (experiences instanceof Array) {
		experience = typeof(experienceIdOrIndex) === "object" ? experienceIdOrIndex : typeof(experienceIdOrIndex) === "number" ? experiences[experienceIdOrIndex] : FLOW.Multiuser.getExperienceById(experienceIdOrIndex);
	}
	else {
		experience = experiences;
		userSlotId = experienceIdOrIndex;
	}
	var i = FLOW.Multiuser.getUserSlotIndexById(experience, userSlotId);
	return i >= 0 ? experience.userSlots[i] : null;
};

FLOW.Multiuser.getAvailableExperiencesAsViewer = function(experiences) {
	var experiencesThatAllowViewers = [];
	for (var i = 0; i < experiences.length; i++) {
		var experience = experiences[i];
		if (experience.allowsViewers) {
			experiencesThatAllowViewers.push(experience);
		}
	}
	return experiencesThatAllowViewers;

};

FLOW.Multiuser.ConnectToExperienceAsUserResponse = {
	CONNECTED 					: 0,
	UNKNOWN_EXPERIENCE 			: 1,
	ALREADY_CONNECTED 			: 2,
	ERROR 						: 3,
	UNKNOWN_USER_SLOT 			: 4,
	USER_SLOT_NOT_AVAILABLE 	: 5
};

FLOW.Multiuser.ConnectToExperienceAsViewerResponse = {
	CONNECTED 					: 0,
	UNKNOWN_EXPERIENCE			: 1,
	ALREADY_CONNECTED 			: 2,
	ERROR						: 3,
	VIEWER_NOT_ALLOWED			: 4
};

FLOW.Multiuser.ServerErrorIds = {
	USER_UPDATE_OF_UNKNOWN_USER					: 1,
	COMMAND_DOES_NOT_BELONG_TO_ANY_EXPERIENCE	: 2,
	COMMAND_SENT_TO_UNKNOWN_USER				: 3
};

FLOW.Multiuser.CommandIds = {
	NEW_USER 						: "NewUser", 
	/**
	{ 
	 	id: string, 
	 	position: {
	 		x: number,
	 		y: number,
	 		z: number
	 	},
	 	orientation: {
	 		_x: number,
	 		_y: number,
	 		_z: number,
	 		_w: number
	 	}
	}
	*/
	REQUEST_ALL_EXPERIENCES 				: "RequestAllExperiences", 
	/**
	{
	}
	*/
	REQUEST_ALL_EXPERIENCES_RESPONSE		: "RequestAllExperiencesResponse",
	/**
	{
		experiences: [
			{ 
				id: string, 
				description: string, 
				dimensions: { 
					x: number,
					y: number,
					z: number
				},
				requiresUserSlotId: boolean,
				allowsViewers: boolean,
				userSlots: [
					{
						id: string,
						position: {
							x: number,
							y: number,
							z: number
						},
						orientation: {
							_x: number,
							_y: number,
							_z: number,
							_w: number
						}
					},
					...
				]
			}
		]
	}
	*/
	REQUEST_AVAILABLE_EXPERIENCES_AS_USER 		: "RequestAvailableExperiencesAsUser", 
	/**
	{
	}
	*/
	REQUEST_AVAILABLE_EXPERIENCES_AS_USER_RESPONSE	: "RequestAvailableExperiencesAsUserResponse",
	/**
	{
		experiences: [
			{ 
				id: string, 
				description: string, 
				dimensions: { 
					x: number,
					y: number,
					z: number
				},
				requiresUserSlotId: boolean,
				allowsViewers: boolean,
				userSlots: [
					{
						id: string,
						position: {
							x: number,
							y: number,
							z: number
						},
						orientation: {
							_x: number,
							_y: number,
							_z: number,
							_w: number
						}
					},
					...
				]
			}
		]
	}
	*/
	REQUEST_AVAILABLE_EXPERIENCES_AS_VIEWER 		: "RequestAvailableExperiencesAsViewer", 
	/**
	{
	}
	*/
	REQUEST_AVAILABLE_EXPERIENCES_AS_VIEWER_RESPONSE	: "RequestAvailableExperiencesAsViewerResponse",
	/**
	{
		experiences: [
			{ 
				id: string, 
				description: string, 
				dimensions: { 
					x: number,
					y: number,
					z: number
				},
				requiresUserSlotId: boolean,
				allowsViewers: boolean,
				userSlots: [
					{
						id: string,
						position: {
							x: number,
							y: number,
							z: number
						},
						orientation: {
							_x: number,
							_y: number,
							_z: number,
							_w: number
						}
					},
					...
				]
			}
		]
	}
	*/
	CONNECT_TO_EXPERIENCE_AS_USER	: "ConnectToExperienceAsUser",
	/**
	{
		experienceId: string,
		userSlotId: string,
	}
	*/
	CONNECT_TO_EXPERIENCE_AS_USER_RESPONSE 	: "ConnectToExperienceAsUserResponse",
	/**
	{
		response: FLOW.Multiuser.ConnectToExperienceAsUserResponse,
		id: string,
		position: {
			x: number,
			y: number,
			z: number
		}
		orientation: {
			_x: number,
			_y: number,
			_z: number,
			_w: number
		},
		otherUsers: {
			'id': {
			 	id: string, 
			 	position: {
			 		x: number,
			 		y: number,
			 		z: number
			 	},
			 	orientation: {
			 		_x: number,
			 		_y: number,
			 		_z: number,
			 		_w: number
			 	}
			},
			...			
		}
	}
	*/
	CONNECT_TO_EXPERIENCE_AS_VIEWER	: "ConnectToExperienceAsViewer",
	/**
	{
		experienceId: string
	}
	*/
	CONNECT_TO_EXPERIENCE_AS_VIEWER_RESPONSE 	: "ConnectToExperienceAsViewerResponse",
	/**
	{
		response: FLOW.Multiuser.ConnectToExperienceAsViewerResponse,
		users: {
			'id': {
			 	id: string, 
			 	position: {
			 		x: number,
			 		y: number,
			 		z: number
			 	},
			 	orientation: {
			 		_x: number,
			 		_y: number,
			 		_z: number,
			 		_w: number
			 	}
			},
			...			
		}
	}
	*/
	DISCONNECT_FROM_EXPERIENCE		: "DisconnectFromExperience",
	DISCONNECT_FROM_EXPERIENCE_RESPONSE		: "DisconnectFromExperienceResponse",
	USER_UPDATE 					: "UserUpdate",
	/**
	{ 
	 	id: string, 
	 	position: {
	 		x: number,
	 		y: number,
	 		z: number
	 	},
	 	orientation: {
	 		_x: number,
	 		_y: number,
	 		_z: number,
	 		_w: number
	 	}
	}
	*/
	USER_DISCONNECTED 				: "UserDisconnected",
	/**
	{
		id: string
	}
	*/
	SERVER_ERROR					: "ServerError",
	/**
	{
		serverErrorId: string
		// Specific to each error
	}
	*/
	SEND_COMMAND_TO_USER			: "SendCommandToUser",
	/*
	The whole command structure will look like this
		id: string,
		userId: string,
		data: THE_COMMAND_TO_BE_SENT_TO_THE_OTHER_USER
	*/
    USER_READY : "UserReady"
    /**
     *   Sent when a user is fully loaded to all other clients
     {
         id: string
     }
     */,
    START : "Start"
    /**
     * Sent when the start button is pressed by one client and sent to all other clients

     {
         id: string
     }
     */,
    RESET : "Reset"
    /**
     * Sent when the data is updated by one client and sent to all other clients

     {
         id: string,
         data: {}
     }
     */,
    UPDATE_DATA :"UpdateData"

};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Multiuser;
}));
