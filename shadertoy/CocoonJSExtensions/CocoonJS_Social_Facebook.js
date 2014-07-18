(function() {

    // The CocoonJS and CocoonJS.Social must exist before creating the extension.
    if (typeof window.CocoonJS === 'undefined' || window.CocoonJS === null) throw("The CocoonJS object must exist and be valid before creating the extension types.");
    if (typeof window.CocoonJS.Social === 'undefined' || window.CocoonJS.Social === null) throw("The CocoonJS.Social object must exist and be valid before creating the extension types.");

    /** 
     * @class
     * @constructor 
     * Represents a type that mimics the original Facebook API with the addition of the possibility to
     * retrieve an abstract high level interface API to handle a SocialGamingService (APIs defined by Ludei).
     */
    CocoonJS.Social.FacebookExtension = function (){
        this.nativeExtensionName = "IDTK_SRV_FACEBOOK";
        this.extensionName = "Social.Facebook";
        this.nativeExtensionObjectAvailable =  CocoonJS.nativeExtensionObjectAvailable && typeof window.ext[this.nativeExtensionName] !== 'undefined';
        this.Event = new CocoonJS.Social.FacebookEvent(this.nativeExtensionObjectAvailable);

        var me = this;
        if (this.nativeExtensionObjectAvailable) {

            this.onFacebookSessionStateChanged = new CocoonJS.EventHandler(this.nativeExtensionName, this.extensionName, "onFacebookSessionStateChanged");

            CocoonJS.Social.Facebook = this; //the object it's being created but the addEventListener needs it now
            this.onFacebookSessionStateChanged.addEventListener(function(session, error) {
                var data = fromCocoonFBSessionToFBAPISession(session,error);
                if (session.state == 0) {
                    me.Event.notify("auth.login", data);
                }
                me.Event.notify("auth.authResponseChange", data);
                me.Event.notify("auth.statusChange", data);
            });
        }
        return this;
    };

    CocoonJS.Social.FacebookExtension.prototype = {

        _currentSession: null,
        _appId: null,
        _socialService: null,

        /**
         * Initialize the SDK with your app ID. This will let you make calls against the Facebook API. All FB.API methods must be called after FB.init.
         * @param {object} options. Check available options here: https://developers.facebook.com/docs/reference/javascript/FB.init/
         */
        init: function(options) {
            if (!options || !options.appId) {
                throw "appId must be specified!";
            }

            this._appId = options.appId;

            if (this.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "init", [options], true);
            }
            else {
                FB.init(options);
            }

            var me = this;
            this.Event.subscribe("auth.authResponseChange", function(session) {
                me._currentSession = session;
                if (session.authResponse && !session.authResponse.user){
                    me.api("me?fields=username", function(response) {
                        me._currentSession.authResponse.user = response;
                    });
                }
            });
        },

        /**
         * Return a CocoonJS SocialGaming interface for the Facebook Extension
         * You can use the Facebook extension in two ways, with the official SDK API equivalent or with the CocoonJS Social API abstraction
         * @see CocoonJS.Social.SocialGamingService
         * @returns {CocoonJS.Social.SocialGamingService}
         */
        getSocialInterface: function() {

            if (!this._appId) {
                throw "You must call init() before getting the Social Interface";
            }
            if (!this._socialService) {
                this._socialService = new CocoonJS.Social.SocialGamingServiceFacebook(this);
            }
            return this._socialService;
        },

        /**
         * Authenticate the user
         * By default, calling login will attempt to authenticate the user with only the basic permissions.
         * If you want one or more additional permissions, call login with an option object,
         * and set the scope parameter with a comma-separated list of the permissions you wish to request from the user
         * @param {object} login options
         * @params {function} callback The callback function with received session data or error.
         */
        login: function(callback, options) {
            var me = this;
            if (this.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "login", [options, function(response, error) {
                    me._currentSession = fromCocoonFBSessionToFBAPISession(response,error);
                    if (callback) {
                        callback(me._currentSession);
                    }

                }], true);
            }
            else {
                FB.login(function(response){
                    me._currentSession = response;
                    if (callback)
                        callback(response);
                }, options);
            }

        },

        /**
         * Log the user out of your application
         * You will need to have a valid access token for the user in order to call the function.
         * @param {function} callback called when the user is logged out
         */
        logout: function(callback) {
            if (this.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "logout", [function(response, error) {
                    if (callback) {
                        callback(fromCocoonFBSessionToFBAPISession(response, error));
                    }

                }],true);
            }
            else {
                FB.logout(function(response){
                    if (callback) {
                        callback(response);
                    }
                });
            }

        },

        /**
         * Synchronous accessor for the current authResponse
         * @returns {object} current Facebook session data
         */
        getAuthResponse: function() {

            if (this.nativeExtensionObjectAvailable) {
                var response = CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "getFacebookSession", []);
                return fromCocoonFBSessionToFBAPISession(response);
            }
            else {
                return FB.getAuthResponse();
            }

        },

        /**
         * Allows you to determine if a user is logged in to Facebook and has authenticated your app.
         * There are three possible states for a user:
         * 1. the user is logged into Facebook and has authenticated your application (connected)
         * 2. the user is logged into Facebook but has not authenticated your application (not_authorized)
         * 3. the user is not logged into Facebook at this time and so we don't know if they've authenticated your application or not
         * @param {function} callback The callback function.
         * @param {boolean} force Force reloading the login status (default false).
         */
        getLoginStatus: function(callback, force) {
            if (this.nativeExtensionObjectAvailable) {

                var me = this;
                setTimeout(function(){
                    var response = CocoonJS.makeNativeExtensionObjectFunctionCall(me.nativeExtensionName, "getFacebookSession", []);
                    if (callback) {
                        callback(fromCocoonFBSessionToFBAPISession(response));
                    }

                },50);
            }
            else {
                FB.getLoginStatus(callback, force);
            }

        },
        /**
         * Makes API calls to the Graph API.
         * @param path The Graph API url path
         * @param method the http method (default "GET")
         * @param params the parameters for the query
         * @param cb the callback function to handle the response
         */
        api: function(path, method, params, cb ) {

            if (this.nativeExtensionObjectAvailable) {
                var openGraph = arguments[0];
                var httpMethod = arguments.length > 3 ? arguments[1] : "GET";
                var options = null;
                if (arguments.length == 3) options = arguments[1];
                if (arguments.length == 4) options = arguments[2];
                var callback = arguments.length > 1 ? arguments[arguments.length -1 ] : function(){};

                return CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "api", [openGraph, httpMethod, options, callback], true);
            }
            else {
                FB.api(path,method,params,cb);
            }
        },

        /**
         * A generic method for triggering Dialogs which allow the user to take some action.
         * @param params The required arguments vary based on the method being used, but specifying the method itself is mandatory
         * @param cb Callback function to handle the result. Not all methods may have a response.
         */
        ui: function(params, cb) {

            if (this.nativeExtensionObjectAvailable){
                var params = arguments[0];
                var callback = arguments.length > 1 ? arguments[1]: function(){};

                return CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "ui", [params, callback], true);
            }
            else if (!navigator.isCocoonJS)
            {
                FB.ui(params,cb);
            }
        },

        /**
         * @param {string} permissionsType "read" or "publish"
         * @param permissions comma separated Facebook permission names
         * @param callback response authResponse callback
         */

        requestAdditionalPermissions: function(permissionsType, permissions, callback) {
            if (this.nativeExtensionObjectAvailable) {

                var permsArray = permissions.split(',');
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "requestAdditionalPermissions", [permissionsType, permsArray, function(session, error){
                    if (callback) {
                        callback(fromCocoonFBSessionToFBAPISession(session,error));
                    }
                }], true);
            }
            else {
                FB.login(callback, {scope:permissions});
            }
        },

        /**
         * Query the current user facebook permissions
         * @param callback Handler function which receives a dictionary with the granted permissions
         */
        getPermissions: function(callback) {
            this.api('me/permissions', function(response) {
                callback(response.data && response.data[0] ? response.data[0] : {});
            });
        },

        /**
         * Presents a dialog in the Facebook application that allows the user to share a status update
         * If the Facebook Application is not available it does a fallback to a feed dialog
         * No publish permissions are required.
         * @param params Dialog params (description, caption, name, link, picture)
         * @param callback Handler with response data or error
         */
        showShareDialog: function(params, callback) {
            if (this.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "showShareDialog", [params, callback], true);
            }
            else {
                params.method = "feed";
                FB.ui(params, callback);
            }
        },

        /**
         * Upload a local image file to Facebook and get response
         * @param file The local file url to submit to Facebook (For example the one capture with screenCapture API)
         * @param callback Handler to process response with the photoid and other data or the error
         */
        uploadPhoto: function(file, callback) {
            if (this.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "uploadPhoto", [file, callback], true);
            }
            else {
                //TODO
                callback({error: {message: "Not implemented"}});
            }
        },

        /**
         * Shows a native UI component that can be used to pick friends.
         * @param callback Handlerv function. The response contains the boolen 'donePressed' value and an array of selected users in the 'selection' property.
         */
        showFriendPicker: function(callback) {
            if (this.nativeExtensionObjectAvailable) {
                CocoonJS.makeNativeExtensionObjectFunctionCall(this.nativeExtensionName, "showFriendPicker", [callback], true);
            }
            else {
                //TODO
                callback({error: {message: "Not implemented"}});
            }
        }

    };

    /**
     * @class
     * @constructor
     */
    CocoonJS.Social.FacebookEvent = function(nativeAvailable ) {
        this.nativeExtensionObjectAvailable = nativeAvailable;
        return this;
    }

    CocoonJS.Social.FacebookEvent.prototype = {
        /**
         * Global Events to which you can subscribe:
         * auth.login - fired when the auth status changes from unknown to connected
         * auth.authResponseChange - fired when the authResponse changes
         * auth.statusChange - fired when the status changes
         * @param name Name of the event
         * @param callback The handler function
         */
        subscribe: function(name, callback){
            if (this.nativeExtensionObjectAvailable)
            {
                var eventKey = name + 'listeners';
                this[eventKey] = this[eventKey] || [];
                this[eventKey].push(callback);
            }
            else if (!navigator.isCocoonJS)
            {
                FB.Event.subscribe(name,callback);
            }
        },
        /**
         * Removes handlers on events so that it no longer invokes your callback when the event fires.
         * @param name Name of the event.
         * @param callback The handler function.
         */
        unsubscribe: function(name, callback) {
            if (this.nativeExtensionObjectAvailable)
            {
                var eventKey = name + 'listeners';
                var array = this[eventKey];
                if (array) {
                    var index = array.indexOf(callback);
                    if (index !== -1) {
                        array.splice(index,1);
                    }
                }
            }
            else if (!navigator.isCocoonJS)
            {
                FB.Event.unsubscribe(name,callback);
            }
        },

        /**
         * @ignore
         */
        notify: function(name, param) {
            var eventKey = name + 'listeners';
            var array = this[eventKey];
            if (array) {
                for (var i = 0; i< array.length; ++i) {
                    array[i](param);
                }
            }

        }
    };

    /**
     * @namespace 
     * This is the global variable that enables access to the Facebook API mimic and the high level abstract API
     * to handle Social aspects, created by Ludei.
     * @see CocoonJS.Social.FacebookExtension
     */
    CocoonJS.Social.Facebook = new CocoonJS.Social.FacebookExtension();

    /**
     * @ignore
     */
    function fromCocoonFBStatusToFBAPIState(state) {
        if (state === 0) {
            return "connected";
        }
        else if (state === 1) {
            return "not_authorized";
        }
        else {
            return "unknown";
        }
    }

    /**
     * @ignore
     */
    function fromCocoonFBSessionToFBAPISession(response, error) {

        var authResponse = null;
        if (response.state === 0) {
            authResponse = {
                accessToken: response.accessToken,
                expirationDate: response.expirationDate,
                userID: response.user ? response.userID : null,
                permissions: response.permissions,
                user: response.user
            }
        }

        return {
            status: fromCocoonFBStatusToFBAPIState(response.state),
            authResponse: authResponse,
            error: error
        }

    }

    CocoonJS.Social.SocialGamingServiceFacebook = function (fbExtension) {
        CocoonJS.Social.SocialGamingServiceFacebook.superclass.constructor.call(this);
        this.fb = fbExtension;
        var me = this;
        this.fb.Event.subscribe("auth.authResponseChange", function(session) {
            me.onLoginStatusChanged.notifyEventListeners(session.status == "connected", session.error);
        });
        return this;
    }

    CocoonJS.Social.SocialGamingServiceFacebook.prototype =  {

        currentPermissions: null,

        isLoggedIn: function() {
            return this.fb._currentSession && this.fb._currentSession.status === "connected";
        },
        login : function(callback) {
            var me = this;
            this.fb.login(function(response){
                if (callback)
                    callback(me.isLoggedIn(), response.error);
            });
        },
        logout: function(callback) {
            this.fb.logout(function(response){
                if (callback)
                    callback(response.error);
            });
        },
        getLoggedInUser : function() {
            var authResponse = this.fb._currentSession ? this.fb._currentSession.authResponse : null;
            if (authResponse && authResponse.user) {
                return fromFBUserToCocoonUser(authResponse.user);
            }
            else if (authResponse && authResponse.userID) {
                return new CocoonJS.Social.User(authResponse.userID, "Loading...");
            }
            return null;
        },
        hasPublishPermissions: function(callback) {
            this.fb.getPermissions(function(perms, error){
               callback(perms.publish_actions, error);
            });
        },
        requestPublishPermissions: function(callback) {
            var me = this;
            this.fb.requestAdditionalPermissions("publish", "publish_actions", function(response){
                if (response.error)
                    callback(false, error);
                else {
                    me.hasPublishPermissions(function(granted, error){
                        callback(granted,error);
                    });
                }
            });
        },
        requestUser: function(calback, userId) {
            var apiCall = (userId || "me");
            this.fb.api(apiCall, function(response){
                var user = response.error ? null : fromFBUserToCocoonUser(response);
                calback(user, response.error);
            });
        },
        requestUserImage: function(callback, userID, imageSize) {
            if (!userID && this.isLoggedIn()) {
                userID = this.fb._currentSession.authResponse.userID;
            }
            var fbPictureSize = "small";
            if (imageSize === CocoonJS.Social.ImageSize.THUMB) {
                  fbPictureSize = "square"
            }
            else if (imageSize === CocoonJS.Social.ImageSize.MEDIUM) {
                fbPictureSize = "normal";
            }
            else if (imageSize === CocoonJS.Social.ImageSize.LARGE) {
                fbPictureSize = "large";
            }
            var url = "https://graph.facebook.com/" + userID + "/picture?type=" + fbPictureSize;
            callback(url);
        },
        requestFriends: function(callback, userId) {
            var apiCall = (userId || "me") + "/friends";
            this.fb.api(apiCall, function(response){
                var friends = [];
                if (!response.error) {
                    for (var i=0; i<response.data.length; i++)
                    {
                        friends.push(fromFBUserToCocoonUser(response.data[i]));
                    }
                }
                callback(friends, response.error);
            });
        },

        //internal utility function
        preparePublishAction: function(callback) {
            if (!this.currentPermissions) {
                var me = this;
                this.fb.getPermissions(function(perms){
                    me.currentPermissions = perms;
                    if (perms)
                        me.preparePublishAction(callback);
                });
            }
            else if (this.currentPermissions.publish_actions) {
                callback(true);
            }
            else{
                this.currentPermissions = null;
                this.fb.requestAdditionalPermissions("publish", "publish_actions", function(response) {
                     callback(response.error ? false : true);
                });
            }

        },
        publishMessage: function(message, callback) {
            this.preparePublishAction(function(granted) {
                if (granted) {
                    var params = fromCocoonMessageToFBMessage(message);
                    var apiCall = "me/feed";
                    this.fb.api(apiCall, params, function(response) {
                        if (callback)
                            callback(response.error);
                    });
                }
                else {
                    if (callback)
                        callback({message: "No publish_actions permission granted"});
                }
            });
        },

        publishMessageWithDialog: function(message, callback) {
            this.fb.showShareDialog(fromCocoonMessageToFBMessage(message), function(response){
                 if (callback) {
                     callback(response.error);
                 }
            });
        },

        requestScore: function(callback, params) {
            var apiCall = ((params && params.userID) ? params.userID : "me") + "/scores";
            this.fb.api(apiCall, function(response) {
                if (response.error) {
                    callback(null, response.error)
                }
                else if (response.data && response.data.length > 0) {
                    var data = fromFBScoreToCocoonScore(response.data[0]);
                    callback(data, null);
                }
                else {
                    //No score has been submitted yet for the user
                    callback(null,null);
                }

            });
        },

        submitScore: function(score, callback, params) {
            var me = this;
            this.preparePublishAction(function(granted) {
                if (granted) {
                    me.requestScore(function(currentScore, error) {
                        if (error) {
                            //can't get the user top score. Don't send the new one because it might be worse than the top score
                            if (callback)
                                callback(error);
                           return;
                        }
                        var topScore = currentScore ? currentScore.score : 0;
                        if (score <= topScore) {
                            //don't submit the new score because a better score is already submitted
                            if (callback)
                                callback(null);
                            return;
                        }
                        var apiCall = "/" + ((params && params.userID) ? params.userID : "me") + "/scores";
                        me.fb.api(apiCall, 'POST', {score:score}, function (response) {
                             if (callback)
                                callback(response.error);
                        });
                    }, params)
                }
                else {
                    if (callback)
                        callback({message: "No publish_actions permission granted"});
                }

            })
        },

        showLeaderboard : function(callback, params) {
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
            this.fb.api(me.fb._appId + "/scores", function(response) {
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
                if (response.data && response.data.length) {
                    for (var i = 0; i< response.data.length; ++i) {
                        var score = fromFBScoreToCocoonScore(response.data[i]);
                        score.position = i;
                        score.imageURL = "https://graph.facebook.com/" + score.userID + "/picture";
                        score.me = score.userID === me.fb._currentSession.authResponse.userID;
                        scores.push(score);
                    }
                }
                var js = "addScores(" + JSON.stringify(scores) + ")";
                dialog.eval(js);
            });
        },

        //internal utility function
        prepareAchievements: function(reload, callback) {

            if (!this._cachedAchievements || reload) {
                var me = this;
                this.fb.api(this.fb._appId + '/achievements', function(response) {
                    if (!response.error) {
                        var achievements = [];
                        if (response.data) {
                            for (var i = 0; i < response.data.length; i++) {
                                achievements.push(fromFBAchievementToCocoonAchievement(response.data[i]))
                            }
                        }
                        me.setCachedAchievements(achievements);
                        callback(achievements, null);
                    }
                    else {
                        callback([], response.error);
                    }
                });
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
                var apiCall = (userID || "me") + "/achievements";
                me.fb.api(apiCall, function(response) {
                    if (!response.error) {
                        var achievements = [];
                        if (response.data) {
                            for (var i = 0; i < response.data.length; i++) {
                                var ach = me.findAchievement((response.data[i].achievement || response.data[i].data.achievement).id);
                                if (ach)
                                    achievements.push(ach);
                            }
                        }
                        callback(achievements, null);
                    }
                    else {
                        callback([], response.error);
                    }
                });

            });
        },
        submitAchievement: function(achievementID, callback) {
            if (achievementID === null || typeof achievementID === 'undefined')
                throw "No achievementID specified";
            var achID = this.translateAchievementID(achievementID);
            var me = this;
            this.preparePublishAction(function(granted) {
                if (granted) {
                    me.fb.api("me/achievements", "POST", {achievement:achID}, function (response) {
                        if (callback) {
                            callback(response.error);
                        }
                    });
                }
                else {
                    if (callback)
                        callback({message: "No publish_actions permission granted"});
                }

            });
        },
        resetAchievements : function(callback) {
            var me = this;
            this.preparePublishAction(function(granted) {
                if (granted) {
                    me.requestAchievements(function(achievements, error){
                        if (error) {
                            if (callback)
                                callback(error);
                            return;
                        }
                        var someError = null;
                        var remaining = achievements.length;
                        for (var i = 0; i < achievements.length; ++i) {
                            me.fb.api("me/achievements", "DELETE", {achievement:achievements[i].fbAchievementData.url}, function (response) {
                                if (response.error) {
                                   someError = response.error;
                                }
                                remaining--;
                                if (remaining == 0 && callback) {
                                    callback(someError);
                                }
                            });
                        }

                    });
                }
                else {
                    if (callback)
                        callback({message: "No publish_actions permission granted"});
                }

            });
        },
        showAchievements : function(callback) {
            if (!this._achievementsTemplate)
                throw "Please, provide a html template for achievements with the setTemplates method";
            var dialog = new CocoonJS.App.WebDialog();
            var callbackSent = false;
            dialog.show(this._achievementsTemplate, function(error) {
                dialog.closed = true;
                if (!callbackSent && callback)
                    callback(error);
            });
            var me = this;
            this.requestAchievements(function(achievements, error){
                if (dialog.closed)
                    return;
                if (error) {
                    callbackSent = true;
                    if (callback)
                        callback(error);
                    return;
                }

                var achs = [];
                if (me._cachedAchievements) {
                    for (var i = 0; i < me._cachedAchievements.length; ++i) {
                        var ach = me._cachedAchievements[i];
                        achs.push(ach);
                        if (achievements && achievements.length) {
                            for (var j = 0; j< achievements.length; ++j) {
                                if (achievements[j].achievementID === ach.achievementID) {
                                    ach.achieved = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                var js = "addAchievements(" + JSON.stringify(achs) + ");";
                dialog.eval(js);
            });
        }
    }

    CocoonJS.extend(CocoonJS.Social.SocialGamingServiceFacebook, CocoonJS.Social.SocialGamingService);

    /**
     *@ignore
     */
    function fromFBUserToCocoonUser (facebookUser) {
        return new CocoonJS.Social.User (facebookUser.id, facebookUser.username);
    }

    /**
     *@ignore
     */
    function fromCocoonMessageToFBMessage(message) {
        return {
            link: message.linkURL,
            description: message.message,
            name: message.linkText,
            caption: message.linkCaption,
            picture: message.mediaURL
        }
    }
    /**
     *@ignore
     */
    function fromFBScoreToCocoonScore(fbResponse, requestScoreParams) {
        var result = new CocoonJS.Social.Score(fbResponse.user.id, fbResponse.score, fbResponse.user.name);
        if (requestScoreParams) {
            result.leaderboardID = requestScoreParams.leaderboardID;
        }
        result.imageURL = 'https://graph.facebook.com/' + fbResponse.user.id + '/picture';
        return result;
    }
    /**
     *@ignore
     */
    function fromFBAchievementToCocoonAchievement(fbResponse) {
        var result = new CocoonJS.Social.Achievement (
            fbResponse.id,
            fbResponse.title,
            fbResponse.description,
            fbResponse.image[0].url,
            fbResponse.data.points
        );
        result.fbAchievementData = fbResponse;
        return result;
    }

    if (!navigator.isCocoonJS) {
        // Load the Facebook SDK
        var parent = document.getElementsByTagName('script')[0];
        var script = document.createElement('script');
        //script.async = true;
        var prot= location.protocol ? location.protocol : "http:"
        script.src = prot + "//connect.facebook.net/en_US/all.js";
        parent.parentNode.insertBefore(script, parent);
    }

})();