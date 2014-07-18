(function() {

    // The CocoonJS and CocoonJS.Social must exist before creating the extension.
    if (!window.CocoonJS) throw("The CocoonJS object must exist and be valid before creating the extension types.");
    if (!window.CocoonJS.Social) throw("The CocoonJS.Social object must exist and be valid before creating the extension types.");

    /**
     * @class
     * @constructor
     * Represents a type that mimics the original Google Play Games API with the addition of the possibility to
     * retrieve an abstract high level interface API to handle a SocialGamingService (APIs defined by Ludei).
     * Original Google Play Games API: https://developers.google.com/api-client-library/javascript/referencedocs/
     */
    CocoonJS.Social.GooglePlayGamesExtension = function (){
        this.nativeExtensionName = "IDTK_SRV_GOOGLE_PLAY_GAMES";
        this.extensionName = "Social.GooglePlayGames";
        this.nativeExtensionObjectAvailable =  CocoonJS.nativeExtensionObjectAvailable && typeof window.ext[this.nativeExtensionName] !== 'undefined';

        this.auth = new CocoonJS.Social.GooglePlayGamesAuthExtension(this);
        this.client = new CocoonJS.Social.GooglePlayGamesClientExtension(this);
        this.defaultScopes = ["https://www.googleapis.com/auth/games","https://www.googleapis.com/auth/plus.login"];
        this.gamesAPI = "/games/v1";
        this.plusAPI = "/plus/v1";

        this.onSessionChanged = new CocoonJS.EventHandler(this.nativeExtensionName, this.extensionName, "onSessionChanged");

        CocoonJS.Social.GooglePlayGames = this; //the object it's being created but the addEventListener needs it now
        var me = this;
        this.onSessionChanged.addEventListener(function(session, error) {
            me.token = fromSessionToAuthTokenObject(session,error);
            if (session && session.access_token) {
                //fetch user data
                me.client.request({path: me.gamesAPI + "/players/me", callback: function(response) {
                    me.currentPlayer = response;
                }});
            }
        });

        return this;
    };

    CocoonJS.Social.GooglePlayGamesExtension.prototype = {

        token: null,
        settings: {},
        socialService: null,
        currentPlayer: null,
        initialized: false,

        auth: null,
        client: null,

        /**
         * Initializes the service and tries to restore the last session
         * @param {Object} params Initialization options
         * params.clientId {string} The application clientID. Omit if its already provided in the native application via cloud configuration.
         * params.defaultLeaderboard {string} The default leaderboard ID. You can omit it if you specify the leaderboardID in all the score queries or submits
         * params.showAchievementNotifications {boolean} Enable or disable the native view notifications when an achievement is unlocked.
         */
        init: function(params) {
            if (!params || typeof params !== 'object')
                throw "Invalid params argument";
            this.settings = params;
            this.initialized = true;
            if (this.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "init", [this.settings.clientId], true);
            }
            else {

                var me = this;
                var initWebAPi = function() {
                    gapi.auth.authorize({immediate: true, scope: me.defaultScopes, client_id:me.settings.clientId},function(response) {
                        me.token = response;
                        if (response && response.access_token) {
                            me.onSessionChanged.notifyEventListeners(response);
                        }
                    })
                }

                if (!window.gapi) {
                    window.onGapiLoadCallback = function() {
                        //initialization timeout recommended by google to avoid some race conditions
                        window.setTimeout(initWebAPi, 1);
                    }
                    var script = document.createElement("script");
                    script.src = "https://apis.google.com/js/client.js?onload=onGapiLoadCallback";
                    document.getElementsByTagName('head')[0].appendChild(script);
                }
                else {
                    initWebAPi();
                }
            }
        },

        /**
         * Return a CocoonJS SocialGaming interface for the Google Play Games Extension
         * You can use the Google Play Games extension in two ways, with the official SDK API equivalent or with the CocoonJS Social API abstraction
         * @see CocoonJS.Social.SocialGamingService
         * @returns {CocoonJS.Social.SocialGamingService}
         */
        getSocialInterface: function() {

            if (!this.initialized) {
                throw "You must call init() before getting the Social Interface";
            }
            if (!this.socialService) {
                this.socialService = new CocoonJS.Social.SocialGamingServiceGooglePlayGames(this);
            }
            return this.socialService;
        },

        /**
         * Return a CocoonJS Multiplayer interface for the Game Center Extension
         * @returns {CocoonJS.Multiplayer.MultiplayerService}
         */
        getMultiplayerInterface: function() {
            return CocoonJS.Multiplayer.GooglePlayGames;
        },

        share: function() {


            window.open(this.href,'', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600');return false;

        }

    };

    CocoonJS.Social.GooglePlayGamesAuthExtension = function(extension) {
        this.extension = extension;
        return this;
    }

    CocoonJS.Social.GooglePlayGamesAuthExtension.prototype = {
        /**
         * Initiates the OAuth 2.0 authorization process.
         * The browser displays a popup window prompting the user authenticate and authorize.
         * After the user authorizes, the popup closes and the callback function fires.
         * @param {object} A key/value map of parameters for the request (client_id, inmediate, response_type, scope)
         * @param {function} callback The function to call once the login process is complete. The function takes an OAuth 2.0 token object as its only parameter.
         */
        authorize: function(params, callback) {
            var me = this;
            if (this.extension.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.extension.nativeExtensionName, "authorize", [params, function(response, error) {
                    me.extension.token = fromSessionToAuthTokenObject(response,error);
                    if (callback) {
                        callback(me.extension.token);
                    }
                }], true);
            }
            else {
                gapi.auth.authorize(params, function(response){
                    me.extension.token = response;
                    me.extension.onSessionChanged.notifyEventListeners(response, response ? response.error : null);
                    if (callback)
                        callback(response);
                });
            }
        },

        /**
         * Log the user out of the application
         * @param callback
         */
        disconnect: function(callback) {

            if (this.extension.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.extension.nativeExtensionName, "disconnect", [callback], true);
            }
            else {
                //TODO
                if (callback)
                    callback({error: "Not implemented yet"});
            }
        },

        /**
         *  Initializes the authorization feature. Call this when the client loads to prevent popup blockers from blocking the auth window on gapi.auth.authorize calls.
         *  @param {Function} callback A callback to execute when the auth feature is ready to make authorization calls
         */
        init: function(callback) {

            if (this.extension.nativeExtensionObjectAvailable) {
                callback();
            }
            else {
                gapi.auth.init(callback);
            }
        },

        /**
         * Retrieves the OAuth 2.0 token for the application.
         */
        getToken: function() {
            if (this.extension.nativeExtensionObjectAvailable) {
                return this.extension.token;
            }
            else {
                return gapi.auth.getToken();
            }
        },
        /*
         * Retrieves the OAuth 2.0 token for the application.
         */
        setToken: function(token) {
            if (this.extension.nativeExtensionObjectAvailable) {
                this.extension.token = token;
            }
            else {
                gapi.auth.setToken(token);
            }
        }
    }


    CocoonJS.Social.GooglePlayGamesClientExtension = function(extension) {
        this.extension = extension;
        return this;
    }

    CocoonJS.Social.GooglePlayGamesClientExtension.prototype = {

        /**
         * Sets the API key for the application, which can be found in the Developer Console. Some APIs require this to be set in order to work.
         * @param apiKey The API key to set
         */
        setApiKey: function(apiKey) {
            if (this.extension.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.extension.nativeExtensionName, "setApiKey", [apiKey],true);
            }
            else {
                gapi.client.setApiKey(apiKey);
            }
        },

        /**
         * Creates a HTTP request for making RESTful requests.
         * @param {object} args (More info: https://developers.google.com/api-client-library/javascript/reference/referencedocs#gapiclientrequest)
         * @return {object} If no callback is supplied, a request object is returned. The request can then be executed using gapi.client.HttpRequest.execute(callback).
         */
        request: function(args) {
            if (this.extension.nativeExtensionObjectAvailable) {
                if (args.callback) {
                    CocoonJS.makeNativeExtensionObjectFunctionCall(this.extension.nativeExtensionName, "request", [args, function(response,error){
                        var result = response;
                        if (error) {
                            result = response || {};
                            result.error = error;
                        }
                        args.callback(result);
                    }],true);
                    return null;
                }
                else {
                    var me = this;
                    //return a function to mimic the HttpRequest class
                    var httpRequest =  {
                        execute: function(callback) {
                            CocoonJS.makeNativeExtensionObjectFunctionCall(me.extension.nativeExtensionName, "request", [args, function(response, error){
                                var result = response;
                                if (error) {
                                    result = response || {};
                                    result.error = error;
                                }
                                callback(result);
                            }],true);
                        }
                    };
                    return httpRequest;
                }
            }
            else {
                return gapi.client.request(args);
            }
        }
    }

    /**
     * @namespace
     * This is the global variable that enables access to the Google Play Games API mimic and the high level abstract API
     * to handle Social aspects, created by Ludei.
     * @see CocoonJS.Social.GooglePlayGamesExtension
     */
    CocoonJS.Social.GooglePlayGames = new CocoonJS.Social.GooglePlayGamesExtension();


    /**
     * @ignore
     */
    function fromSessionToAuthTokenObject(response, error) {
        var obj = response || {};
        return {
            access_token: response.access_token,
            state: response.state,
            error: error,
            expires_in: response.expirationDate ? response.expirationDate - Date.now() : 0,
            player_id: response.playerId
        }
    }


    CocoonJS.Social.SocialGamingServiceGooglePlayGames = function (apiObject) {
        CocoonJS.Social.SocialGamingServiceGooglePlayGames.superclass.constructor.call(this);
        this.gapi = apiObject;
        var me = this;

        this.gapi.onSessionChanged.addEventListener(function(session){
            var obj = session || {};
            me.onLoginStatusChanged.notifyEventListeners(!!obj.access_token, obj.error);
        });

        return this;
    }

    CocoonJS.Social.SocialGamingServiceGooglePlayGames.prototype =  {

        isLoggedIn: function() {
            return (this.gapi.token && this.gapi.token.access_token) ? true: false;
        },
        login : function(callback) {
            var me = this;
            this.gapi.auth.authorize({client_id:this.gapi.settings.clientId, scope: this.gapi.defaultScopes}, function(response) {
                if (callback) {
                    callback(me.isLoggedIn(),response.error);
                }
            });
        },
        logout: function(callback) {
            this.gapi.auth.disconnect(callback);
        },
        getLoggedInUser : function() {
            return this.gapi.currentPlayer ? fromGPUserToCocoonUser(this.gapi.currentPlayer) : null;
        },
        requestUser: function(callback, userId) {
            var playerId = userId || "me";
            this.gapi.client.request({path: this.gapi.gamesAPI + "/players/" + playerId, callback: function(response) {
                var user = response && !response.error ? fromGPPlayerToCocoonUser(response) : null;
                callback(user, response.error);
            }});
        },
        requestUserImage: function(callback, userID, imageSize) {
            this.requestUser(function(user, error){
                if (user && user.userImage) {
                    var pixelSize = fromImageSizeToGPSize(imageSize || CocoonJS.Social.ImageSize.MEDIUM);
                    if (user.userImage.indexOf("sz=") ===  -1) {
                        user.userImage+="?sz=" + pixelSize;
                    }
                    else {
                        user.userImage = user.userImage.replace(/sz=\d+/g,"sz=" + pixelSize);
                    }
                }
                callback(user ? user.userImage : null, error);
            }, userID);

        },
        requestFriends: function(callback, userId) {
            var params = { orderBy: "best"};
            var playerId = userId || "me";
            this.gapi.client.request({path: this.gapi.plusAPI + "/people/" + playerId + "/people/visible", params: params, callback: function(response) {
                if (response && !response.error) {
                    var friends = [];
                    for (var i = 0; i< response.items.length; ++i) {
                        friends.push(fromGPPersonToCocoonUser(response.items[i]));
                    }
                    callback(friends);
                }
                else {
                    callback([], response ? response.error : null);
                }
            }});
        },

        publishMessage: function(message, callback) {
            if (callback)
                callback("Not supported... use publishMessageWithDialog method instead");
        },

        publishMessageWithDialog: function(message, callback) {

            if (this.gapi.nativeExtensionObjectAvailable) {
                var params = {
                    prefilledText: message.message,
                    mediaUrl: message.mediaURL,
                    mediaTitle: message.linkCaption,
                    mediaDescription: message.linkText,
                    url: message.linkURL
                }

                CocoonJS.makeNativeExtensionObjectFunctionCall(this.gapi.nativeExtensionName, "shareMessage", [params, callback], true)
            }
            else {

                var me = this;
                var share = function() {
                    var options = {
                        contenturl: 'https://plus.google.com/pages/',
                        contentdeeplinkid: '/pages',
                        clientid: me.gapi.settings.clientId,
                        cookiepolicy: 'single_host_origin',
                        prefilltext: message.message,
                        calltoactionlabel: 'CREATE',
                        calltoactionurl: 'http://plus.google.com/pages/create',
                        calltoactiondeeplinkid: '/pages/create'
                    };

                    gapi.interactivepost.render('sharePost', options);
                }

                if (!gapi.interactivepost) {
                    var script = document.createElement('script'); script.type = 'text/javascript'; script.async = true;
                    script.src = 'https://apis.google.com/js/plusone.js';
                    script.onload = function() {
                        share();
                    }
                    document.getElementsByTagName('head')[0].appendChild(script);
                }
                else {
                    share();
                }
            }
        },

        requestScore: function(callback, params) {
            params = params || {};
            var playerId = params.userID || "me";
            var leaderboardID = params.leaderboardID || this.gapi.settings.defaultLeaderboard;
            if (!leaderboardID)
                throw "leaderboardID not provided in the params. You can also set the default leaderboard in the init method";

            this.gapi.client.request({path: this.gapi.gamesAPI + "/players/" + playerId + "/leaderboards/" + leaderboardID + "/scores/ALL_TIME", callback: function(response) {
                if (response && response.error) {
                    callback(null, response.error)
                }
                else if (response && response.items && response.items.length > 0) {
                    var item = response.items[0];
                    var data = new CocoonJS.Social.Score(playerId, item.scoreValue,"","", item.leaderboard_id);
                    callback(data, null);
                }
                else {
                    //No score has been submitted yet for the user
                    callback(null,null);
                }
            }});

        },

        submitScore: function(score, callback, params) {
            params = params || {};
            var leaderboardID = params.leaderboardID || this.gapi.settings.defaultLeaderboard;
            if (!leaderboardID)
                throw "leaderboardID not provided in the params. You can also set the default leaderboard in the init method";


            this.gapi.client.request({path: this.gapi.gamesAPI + "/leaderboards/" + leaderboardID + "/scores",
                                      method: "POST", params:{score: score}, callback: function(response) {
                    if (callback) {
                        callback(response ? response.error : null);
                    }
            }});

        },

        showLeaderboard : function(callback, params) {
            params = params || {};
            var leaderboardID = params.leaderboardID || this.gapi.settings.defaultLeaderboard;
            if (!leaderboardID)
                throw "leaderboardID not provided in the params. You can also set the default leaderboard in the init method";

            var ios = /(iPad|iPhone|iPod)/ig.test( navigator.userAgent );
            if (!ios && this.gapi.nativeExtensionObjectAvailable) {
                var timeScope = params.timeScope || 0;
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.gapi.nativeExtensionName, "showLeaderboard", [leaderboardID, timeScope, callback], true);
            }
            else {
                if (!this._leaderboardsTemplate)
                    throw "Please, provide a html template for leaderboards with the setTemplates method";
                var dialog = new CocoonJS.App.WebDialog();
                var callbackSent = false;
                dialog.show(this._leaderboardsTemplate, function(error) {
                    dialog.closed = true;
                    if (!callbackSent && callback)
                        callback(error);
                });
                var me = this;
                var collection = params.friends ? "SOCIAL" : "PUBLIC";
                var timeSpan = "ALL_TIME";
                if (params.timeScope === CocoonJS.Social.TimeScope.WEEK) {
                    timeSpan = "WEEKLY";
                }
                else if (params.timeScope === CocoonJS.Social.TimeScope.TODAY) {
                    timeSpan = "DAILY";
                }
                this.gapi.client.request({path: this.gapi.gamesAPI + "/leaderboards/" + leaderboardID + "/window/" + collection,
                    method: "GET", params:{timeSpan: timeSpan}, callback: function(response) {
                        if (dialog.closed)
                            return;
                        if (response.error) {
                            if (callback) {
                                callbackSent = true;
                                callback(response.error);
                                dialog.close();
                            }
                            return;
                        }
                        var scores = [];
                        var items = [];
                        if (response && response.items) {
                            items = response.items.slice(0);
                        }
                        if (response && response.playerScore) {
                            items.push(response.playerScore);
                        }
                        for (var i = 0; i< items.length; ++i) {
                            var item = items[i];
                            var score = fromGPScoreToCocoonScore(item, leaderboardID);
                            score.imageURL+="?sz=50";
                            score.position = item.scoreRank || i + 1;
                            score.me = false;
                            scores.push(score);
                        }
                        var js = "addScores(" + JSON.stringify(scores) + ")";
                        dialog.eval(js);
                    }});
            }
        },

        //internal utility function
        prepareAchievements: function(reload, callback) {
            if (!this._cachedAchievements || reload) {
                var me = this;
                this.gapi.client.request({path: this.gapi.gamesAPI + "/achievements", callback: function(response) {
                    if (response && !response.error) {
                        var achievements = [];
                        if (response && response.items) {
                            for (var i = 0; i < response.items.length; i++) {
                                achievements.push(fromGPAchievementToCocoonAchievement(response.items[i]))
                            }
                        }
                        me.setCachedAchievements(achievements);
                        callback(achievements, null);
                    }
                    else {
                        callback([], response ? response.error : null);
                    }
                }});
            }
            else {
                callback(this._cachedAchievements, null);
            }
        },

        requestAllAchievements : function(callback) {
            this.prepareAchievements(true, callback);
        },

        requestAchievements : function(callback, userID) {
            var me = this;
            this.prepareAchievements(false, function(allAchievements, error){
                if (error) {
                    callback([], error);
                    return;
                }
                var playerID = userID || "me";
                me.gapi.client.request({path: me.gapi.gamesAPI + "/players/" + playerID + "/achievements",
                                        params: {state: "UNLOCKED"}, callback: function(response) {
                    if (response && !response.error) {
                        var achievements = [];
                        if (response.items) {
                            for (var i = 0; i < response.items.length; i++) {
                                var ach = me.findAchievement(response.items[i].id);
                                if (ach)
                                    achievements.push(ach);
                            }
                        }
                        callback(achievements, null);
                    }
                    else {
                        callback([], response ? response.error : null);
                    }
                }});

            });
        },
        submitAchievement: function(achievementID, callback) {
            if (achievementID === null || typeof achievementID === 'undefined')
                throw "No achievementID specified";
            var achID = this.translateAchievementID(achievementID);
            if (this.gapi.nativeExtensionObjectAvailable) {
                //native API allows to show a native notification view. (REST API doesn't)
                var showNotification = !!this.gapi.settings.showAchievementNotifications;
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.gapi.nativeExtensionName, "unlockAchievement", [achID, showNotification, callback], true);
            }
            else {
                //REST api
                this.gapi.client.request({path: this.gapi.gamesAPI + "/achievements/" + achID + "/unlock",
                    method: "POST", callback: function(response) {
                        if (callback) {
                            callback(response ? response.error : null);
                        }
                    }});
            }
        },
        resetAchievements : function(callback) {
            this.gapi.client.request({path: "/games/v1management/achievements/reset",
                method: "POST", callback: function(response) {
                    if (callback) {
                        callback(response ? response.error : null);
                    }
                }});
        },
        showAchievements : function(callback) {
            var ios = /(iPad|iPhone|iPod)/ig.test( navigator.userAgent );
            if (!ios && this.gapi.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.gapi.nativeExtensionName, "showAchievements", [callback], true);
            }
            else {
                CocoonJS.Social.SocialGamingServiceGooglePlayGames.superclass.showAchievements.call(this);
            }
        }
    }

    CocoonJS.extend(CocoonJS.Social.SocialGamingServiceGooglePlayGames, CocoonJS.Social.SocialGamingService);


    /**
     *@ignore
     */
    function fromGPPlayerToCocoonUser (gpPlayer) {
        return new CocoonJS.Social.User (gpPlayer.playerId, gpPlayer.displayName, gpPlayer.avatarImageUrl);
    }
    /**
     *@ignore
     */
    function fromGPPersonToCocoonUser (gpUser) {
        var avatar = gpUser.image ? gpUser.image.url : "";
        avatar = avatar.replace(/sz=\d+/g,"sz=100");
        return new CocoonJS.Social.User (gpUser.id, gpUser.displayName, avatar);
    }
    /**
     *@ignore
     */
    function fromImageSizeToGPSize (imageSize) {
        if (imageSize === CocoonJS.Social.ImageSize.THUMB) {
            return 100;
        }
        else if (imageSize === CocoonJS.Social.ImageSize.MEDIUM) {
            return 200;
        }
        else if (imageSize === CocoonJS.Social.ImageSize.LARGE) {
            return 512;
        }
    }
    /**
     *@ignore
     */
    function fromGPAchievementToCocoonAchievement(gpItem) {
        var result = new CocoonJS.Social.Achievement (
            gpItem.id,
            gpItem.name,
            gpItem.description,
            gpItem.revealedIconUrl,
            0
        );
        result.gpAchievementData = gpItem;
        return result;
    }
    /**
     *@ignore
     */
    function fromGPScoreToCocoonScore(gpItem, leaderboardID) {
        return new CocoonJS.Social.Score(gpItem.player.playerId, gpItem.scoreValue, gpItem.player.displayName, gpItem.player.avatarImageUrl, leaderboardID);
    }

})();
