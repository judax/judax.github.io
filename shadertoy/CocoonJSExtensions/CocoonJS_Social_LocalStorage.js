(function() {

    // The CocoonJS must exist before creating the extension.
    if (typeof window.CocoonJS === 'undefined' || window.CocoonJS === null) throw("The CocoonJS object must exist and be valid before creating any extension object.");
    if (typeof window.CocoonJS.Social === 'undefined' || window.CocoonJS === null) throw("The CocoonJS.Social object must exist and be valid before creating a Social Local Storage extension object.");


    /**
     * @constructor
     */
    CocoonJS.Social.LocalStorageService = function() {
        CocoonJS.Social.LocalStorageService.superclass.constructor.call(this);
        this.fakeSocialService = true;
    }

    CocoonJS.Social.LocalStorageService.prototype = {

        loggedIn: false,
        keys: {
            score: "CocoonJS.Social.LocalStorageService.score",
            earnedAchievements: "CocoonJS.Social.LocalStorageService.earned"
        },
        isLoggedIn: function() {
            return this.loggedIn;
        },

        login : function(callback) {
            if (!this.loggedIn)
                this.onLoginStatusChanged.notifyEventListeners(true);
            this.loggedIn = true;
            if (callback)
                setTimeout(function(){callback(true)},0);
        },

        logout: function(callback) {
            if (this.loggedIn)
                this.onLoginStatusChanged.notifyEventListeners(true);
            this.loggedIn = false;

            if (callback)
                setTimeout(function(){callback()},0);
        },

        getLoggedInUser : function() {
            return new CocoonJS.Social.User("me", "LocalStorage");
        },

        requestUser: function(callback, userID) {
            var user = new CocoonJS.Social.User(userID || "me", "LocalStorage");
            if (callback)
                setTimeout(function(){callback(user)},0);
        },

        requestScore: function(callback, params) {
            var scoreItem = localStorage.getItem(this.keys.score);
            var score = parseInt(scoreItem) || 0;
            setTimeout(function(){callback(new CocoonJS.Social.Score("me", score))},0);
        },

        submitScore: function(score, callback, params ) {
            var scoreItem = localStorage.getItem(this.keys.score);
            var topScore = parseInt(scoreItem) || 0;
            if (score > topScore)
                localStorage.setItem(this.keys.score, score);
            if (callback)
                setTimeout(function(){callback()},0);
        },
        getLocalStorageEarnedAchievements: function() {
            var achievementsItem = localStorage.getItem(this.keys.earnedAchievements);
            var earned = [];
            if (achievementsItem) {
                var array = JSON.stringify(achievementsItem);
                if (array && array.length) {
                    earned = array;
                }
            }
            return earned;
        },
        requestAchievements : function(callback, userID) {
            var earned = this.getLocalStorageEarnedAchievements();
            setTimeout(function(){callback(earned)},0);
        },

        submitAchievement: function(achievementID, callback) {
            if (achievementID === null || typeof achievementID === 'undefined')
                throw "No achievementID specified";
            var earned = this.getLocalStorageEarnedAchievements();
            var exists = false;
            for (var i = 0; i< earned.length; ++i) {
               if (earned[i] === achievementID) {
                   exists = true;
                   break;
               }
            }
            if (!exists) {
                earned.push(achievementID);
                localStorage.setItem(this.keys.earnedAchievements, JSON.stringify(earned));
            }

            if (callback)
                setTimeout(function(){callback()},0);
        },
        resetAchievements : function(callback) {
            localStorage.removeItem(this.keys.earnedAchievements);
            if (callback)
                setTimeout(function(){callback()},0);
        }
    };

    CocoonJS.extend(CocoonJS.Social.LocalStorageService, CocoonJS.Social.SocialGamingService);

    CocoonJS.Social.LocalStorage = new CocoonJS.Social.LocalStorageService();

})();