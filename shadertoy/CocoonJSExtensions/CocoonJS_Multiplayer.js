(function() {

    // The CocoonJS must exist before creating the extension.
    if (!window.CocoonJS) throw("The CocoonJS object must exist and be valid before creating any extension object.");

    CocoonJS.Multiplayer = {};

	/**
	* This type represents the access to a native Multiplayer extension API.
    * This service allows to programmatically create matches to invite other players and to receive match invitations sent by other players.
    * Your game must authenticate the related social service before you can use this service.
	* @class
	* @constructor
	* @param {string} nativeExtensionName The name of the native ext object extension property name.
	* @param {string} extensionName The name of the CocoonJS object extension property name.
	*/
	CocoonJS.Multiplayer.MultiplayerService = function(nativeExtensionName, extensionName)
	{
		if (typeof nativeExtensionName !== 'string') throw "The given native extension name '" + nativeExtensionName + "' is not a string.";
		if (typeof extensionName !== 'string') throw "The given extension name '" + nativeExtensionName + "' is not a string.";

		this.nativeExtensionName = nativeExtensionName;
		this.extensionName = extensionName;
	    this.nativeExtensionObjectAvailable = CocoonJS.nativeExtensionObjectAvailable && typeof window.ext[nativeExtensionName] !== 'undefined';

        var me = this;

        /**
         * This {@link CocoonJS.EventHandler} object allows listening to events called when an invitation has been received from another player and the user has accepted it
         * The invitation will start loading.
         * While the invitation is loading a system view might appear on the screen.
         * You should pause/stop your current game and prepare it to process a new match
         * @memberOf CocoonJS.Multiplayer.MultiplayerService
         */
        this.onInvitationReceived = new CocoonJS.EventHandler(this.nativeExtensionName, this.extensionName, "onInvitationReceived");
        /**
         * This {@link CocoonJS.EventHandler} object allows listening to events called when an accepted invitation has been loaded
         * The invitation is ready to be processed (start the match or handle the error)
         * @memberOf CocoonJS.Multiplayer.MultiplayerService
         * Received params: {CocoonJS.Multiplayer.Match} and error
         */
        this.onInvitationLoaded = new CocoonJS.EventHandler(this.nativeExtensionName, this.extensionName, "onInvitationLoaded", function(sourceListener, args){
            var matchID = args[0];
            var error = args[1];
            if (matchID && !error) {
                me.currentMatch =  new CocoonJS.Multiplayer.Match(me.nativeExtensionName, me.extensionName, matchID);
                sourceListener(me.currentMatch, null)
            }
            else {
                sourceListener(null, error);
            }
        });



        return this;
	};


	CocoonJS.Multiplayer.MultiplayerService.prototype = {

        currentMatch: null,

        /**
         * Presents a system View for the matchmaking and creates a new Match
         * @param {CocoonJS.Multiplayer.MatchRequest} matchRequest The parameters for the match
         * @param {Function} callback The callback function. Response parameters: {CocoonJS.Multiplayer.Match} and error;
         */
        findMatch : function(matchRequest, callback)  {
            var me = this;
            if (this.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "findMatch", [matchRequest, function(matchID,error) {
                    if (matchID && !error) {
                        me.currentMatch =  new CocoonJS.Multiplayer.Match(me.nativeExtensionName, me.extensionName, matchID);
                        callback(me.currentMatch, null)
                    }
                    else {
                        callback(null, error);
                    }
                }], true);
            }
        },

        /**
         * Sends an automatch request to join the authenticated user to a match. It doesn't present a system view while waiting to other players.
         * @param  {CocoonJS.Multiplayer.MatchRequest} matchRequest The parameters for the match
         * @param {Function} callback The callback function. Response parameters: {CocoonJS.Multiplayer.Match} and error;
         */
        findAutoMatch : function(matchRequest, callback) {
            var me = this;
            if (this.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "findAutoMatch", [matchRequest, function(matchID, error){
                    if (matchID && !error) {
                        me.currentMatch =  new CocoonJS.Multiplayer.Match(me.nativeExtensionName, me.extensionName, matchID);
                        callback(me.currentMatch, null)
                    }
                    else {
                        callback(null, error);
                    }
                }], true);
            }
        },

        /**
         * Cancels the ongoing automatch request
         */
        cancelAutoMatch : function() {
            if (this.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "cancelAutoMatch", [], true);
            }
        },

        /**
         * Automatically adds players to an ongoing match owned by the user.
         * @param {CocoonJS.Multiplayer.MatchRequest} matchRequest The parameters for the match
         * @param {CocoonJS.Multiplayer.Match} matchRequest The match where new players will be added
         * @param {Function} callback The callback function. Response parameters: error
         */
        addPlayersToMatch : function(matchRequest, match, callback) {
            if (this.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "addPlayersToMatch", [matchRequest, match.matchID, callback], true);
            }
        },
        /**
         * Get the current match reference.
         * @return {CocoonJS.Multiplayer.Match} the current match reference
         */
        getMatch : function() {
            return this.currentMatch;
        }
	};

	/**
	* This type provides a transmission network between a group of users.
	* The match might be returned before connections have been established between players. At this stage, all the players are in the process of connecting to each other.
	* Always check the getExpectedPlayerCount value before starting a match. When its value reaches zero, all expected players are connected, and your game can begin the match.
	* Do not forget to call the start method of the match when your game is ready to process received messages via onMatchDataReceived listener.
	* @class
	* @constructor
	* @param {string} nativeExtensionName The name of the native ext object extension property name.
	* @param {string} extensionName The name of the CocoonJS object extension property name.
	* @param {number} matchID The match ID user for native service bridge.
	*/
	CocoonJS.Multiplayer.Match = function(nativeExtensionName, extensionName, matchID)
	{
		if (typeof nativeExtensionName !== 'string') throw "The given native extension name '" + nativeExtensionName + "' is not a string.";
		if (typeof extensionName !== 'string') throw "The given extension name '" + nativeExtensionName + "' is not a string.";

		this.nativeExtensionName = nativeExtensionName;
		this.extensionName = extensionName;
	    this.nativeExtensionObjectAvailable = CocoonJS.nativeExtensionObjectAvailable && typeof window.ext[nativeExtensionName] !== 'undefined';
	    this.matchID = matchID;
	    var me = this;


	    /**
	    * This {@link CocoonJS.EventHandler} object allows listening to events called when a match receives data from the network
	    * The callback function's documentation is represented by {@link CocoonJS.Social.OnMatchDataReceivedListener}
	    * @memberOf CocoonJS.Multiplayer.Match
	    * @param {CocoonJS.Multiplayer.Match} match The source match.
	    * @param {string} data The received data
	    * @param {string} playerID The playerID where the data is received from.
	    */
	    this.onMatchDataReceived = new CocoonJS.EventHandler(this.nativeExtensionName, this.extensionName, "onMatchDataReceived", function(sourceListener, args) {
	    		if (me.matchID === args[0]) {
	    			sourceListener(me, args[1], args[2]);
	    		}
	    	});

	    /**
	    * This {@link CocoonJS.EventHandler} object allows listening to events called when a player connection state changes.
	    * The callback function's documentation is represented by {@link CocoonJS.Social.OnMatchStateChangedListener}
	    * @memberOf CocoonJS.Multiplayer.Match
	    * @param {CocoonJS.Multiplayer.Match} match The source match.
	    * @param {string} playerID The player whose state has changed
	    * @param {CocoonJS.Multiplayer.ConnectionState} The new connection state of the player
	    */
	    this.onMatchStateChanged = new CocoonJS.EventHandler(this.nativeExtensionName, this.extensionName, "onMatchStateChanged", function(sourceListener, args) {
	    		if (me.matchID === args[0]) {
	    			sourceListener(me, args[1], args[2]);
	    		}
	    	});

	    /**
	    * This {@link CocoonJS.EventHandler} object allows listening to events called when a netowrk connection with a player fails
	    * The callback function's documentation is represented by {@link CocoonJS.Social.OnMatchConnectionWithPlayerFailedListener}
	    * @memberOf CocoonJS.Multiplayer.Match
	    * @param {CocoonJS.Multiplayer.Match} match The source match.
	    * @param {string} playerID The player whose state has changed
	    * @param {string} error The error message
	    */
	    this.onMatchConnectionWithPlayerFailed = new CocoonJS.EventHandler(this.nativeExtensionName, this.extensionName, "onMatchConnectionWithPlayerFailed", function(sourceListener, args) {
	    		if (me.matchID === args[0]) {
	    			sourceListener(me, args[1], args[2]);
	    		}
	    	});

	    /**
	    * This {@link CocoonJS.EventHandler} object allows listening to events called when the match fails
	    * The callback function's documentation is represented by {@link CocoonJS.Social.OnMatchFailedListener}
	    * @memberOf CocoonJS.Multiplayer.Match
	    * @param {CocoonJS.Multiplayer.Match} match The source match.
	    * @param {string} error The error message
	    */
	    this.onMatchFailed = new CocoonJS.EventHandler(this.nativeExtensionName, this.extensionName, "onMatchFailed", function(sourceListener, args) {
	    		if (me.matchID === args[0]) {
	    			sourceListener(me, args[1]);
	    		}
	    	});
	};

	CocoonJS.Multiplayer.Match.prototype = {

		/**
		* Start processing received messages. The user must call this method when the game is ready to process messages. Messages received before being prepared are stored and processed later.
		* @see CocoonJS.Multiplayer.Match.onMatchDataReceived
		*/
		start : function() {
			if (this.nativeExtensionObjectAvailable) {
				CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "startMatch", [this.matchID], true);
			}
		},

		/**
		* Transmits data to all players connected to the match. The match queues the data and transmits it when the network becomes available.
		* @see CocoonJS.Multiplayer.Match.onMatchDataReceived
		* @see CocoonJS.Multiplayer.Match.onMatchStateChanged
		* @see CocoonJS.Multiplayer.Match.onMatchConnectionWithPlayerFailed
		* @see CocoonJS.Multiplayer.Match.onMatchFailed
		* @param {string} data The data to transmit
		* @param {CocoonJS.Multiplayer.SendDataMode} sendMode The optional {@link CocoonJS.Multiplayer.SendDataMode} value. The default value is RELIABLE.
		* @return {boolean} TRUE if the data was successfully queued for transmission; FALSE if the match was unable to queue the data
		*/
		sendDataToAllPlayers : function(data, sendMode) {
			if (this.nativeExtensionObjectAvailable) {
				return CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "sendDataToAllPlayers", [this.matchID, data, sendMode]);
			}
		},

		/**
		* Transmits data to a list of connected players. The match queues the data and transmits it when the network becomes available.
		* @see CocoonJS.Multiplayer.Match.onMatchDataReceived
		* @see CocoonJS.Multiplayer.Match.onMatchStateChanged
		* @see CocoonJS.Multiplayer.Match.onMatchConnectionWithPlayerFailed
		* @see CocoonJS.Multiplayer.Match.onMatchFailed
		* @param {string} data The data to transmit
		* @param {array} playerIDs An array containing the identifier strings for the list of players who should receive the data
		* @param {CocoonJS.Multiplayer.SendDataMode} sendMode The optional {@link CocoonJS.Multiplayer.SendDataMode} value. The default value is RELIABLE.
		* @return {boolean} TRUE if the data was successfully queued for transmission; FALSE if the match was unable to queue the data
		*/
		sendData : function(data, playerIDs,  sendMode) {
			if (this.nativeExtensionObjectAvailable) {
				return CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "sendData", [this.matchID, data, playerIDs, sendMode]);
			}
		},

		/**
		* Disconnects the local player from the match and releases the match. Calling disconnect notifies other players that you have left the match.
		* @see CocoonJS.Multiplayer.Match.onMatchDataReceived
		* @see CocoonJS.Multiplayer.Match.onMatchStateChanged
		* @see CocoonJS.Multiplayer.Match.onMatchConnectionWithPlayerFailed
		* @see CocoonJS.Multiplayer.Match.onMatchFailed
		*/
		disconnect : function() {
			if (this.nativeExtensionObjectAvailable) {
				return CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "disconnect", [this.matchID], true);
			}
		},

		/**
		* Requests additional information of the current players in the match
        * @param {Function} callback The callback function. Response params: players array and error
		*/
		requestPlayersInfo : function(callback) {
			if (this.nativeExtensionObjectAvailable){
				return CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "requestPlayersInfo", [this.matchID, callback], true);
			}
		},

		/**
		* Method to request the remaining players count who have not yet connected to the match.
		* @function
		* @return {number} The remaining number of players who have not yet connected to the match
		*/
		getExpectedPlayerCount : function() {
			if (this.nativeExtensionObjectAvailable) {
				return CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "getExpectedPlayerCount", [this.matchID]);
			}
		},
		/**
		* This method returns an array with all the player identifiers taking part in the match.
		* @return {array} The player identifiers for the players in the match
		*/
		getPlayerIDs : function() {
			if (this.nativeExtensionObjectAvailable){
				return CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "getPlayerIDs", [this.matchID]);
			}
		},

        /**
         * Gets the local playerID taking part in the match.
         * @return {string} the playerID attached to the match manager.
         */
        getLocalPlayerID : function() {
            if (this.nativeExtensionObjectAvailable) {
                return CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "getLocalPlayerID", [this.matchID]);
            }
            return "";
        },

	};

	/**
	* This enum represents the modes to send data
	* @namespace
	* @enum
	*/
	CocoonJS.Multiplayer.SendDataMode =  {
		/**
		* The data is sent continuously until it is successfully received by the intended recipients or the connection times out
		*/
	    RELIABLE : 0,

		/**
		* The data is sent once and is not sent again if a transmission error occurs.
		*/
	    UNRELIABLE : 1
	};


	/**
	* This enum represents the connection state of a player
	* @namespace
	* @enum
	*/
	CocoonJS.Multiplayer.ConnectionState = {
		/**
		* The connection is in unknown state.
		*/
	    UNKNOWN : 0,

	    /**
		* The connection is in connected state.
		*/
	    CONNECTED : 1,

	    /**
		* The connection is in disconnected state.
		*/
	    DISCONNECTED : 2
	};

	/**
	* The data structure that represents the information of a player inside a multiplayer match.
	* @class
	* @constructor
	* @param {string} The id of the user.
	* @param {string} The name of the user.
	*/
	CocoonJS.Multiplayer.PlayerInfo = function(userID, userName) {
		/**
		* The id of the user.
		* @field
		* @type string
		*/
		this.userID = userID;

		/**
		* The name of the user.
		* @field
		* @type string
		*/
		this.userName = userName;
	};

	/**
	* This data structure is used to specify the parameters for a new new multiplayer match.
	* @class
	* @constructor
	* @param {number} minPlayers The minimum number of players that may join the match.
	* @param {number} maxPlayers The maximum number of players that may join the match.
	* @param {array}  [playersToInvite] Optional list of player identifers for players to invite to the match.
	* @param {number} [playerGroup] Optional number identifying a subset of players allowed to join the match.
	* @param {number} [playerAttributes] Optional mask that specifies the role that the local player would like to play in the game.
	*/
	CocoonJS.Multiplayer.MatchRequest = function(minPlayers, maxPlayers, playersToInvite, playerGroup, playerAttributes) {
		/**
		* The minimum number of players that may join the match.
		* @field
		* @type number
		*/
		this.minPlayers = minPlayers;

		/**
		* The maximum number of players that may join the match.
		* @field
		* @type number
		*/
		this.maxPlayers = maxPlayers;

		/**
		* Optional list of player identifers for players to invite to the match.
		* @field
		* @type Array
		*/
		this.playersToInvite = playersToInvite;

		/**
		* Optional number identifying a subset of players allowed to join the match.
		* @field
		* @type number
		*/
		this.playerGroup = playerGroup;

		/**
		* Optional mask that specifies the role that the local player would like to play in the game.
		* @field
		* @type number
		*/
		this.playerAttributes = playerAttributes;

		return this;
	};

})();