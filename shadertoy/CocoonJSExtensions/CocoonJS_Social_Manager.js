(function() {

    // The CocoonJS must exist before creating the extension.
    if (typeof window.CocoonJS === 'undefined' || window.CocoonJS === null) throw("The CocoonJS object must exist and be valid before creating any extension object.");
    if (typeof window.CocoonJS.Social === 'undefined' || window.CocoonJS === null) throw("The CocoonJS.Social object must exist and be valid before creating a Social Manager extension object.");

    CocoonJS.Social.ManagerService = function() {
       this.services = [];
    }

    CocoonJS.Social.ManagerService.prototype = {

        services:null,

        registerSocialService : function(service) {
            this.services.push(service);
        },

        submitAchievement : function(achievementID) {
            for (var i = 0; i < this.services.length; ++i) {
                var service = this.services[i];
                if (!service.readOnlyHint && service.isLoggedIn())  {
                    service.submitAchievement(achievementID, function(error) {
                        if (error)
                            console.error("Error submitting achievement: " + error.message);
                    });
                }
            }
        },

        submitScore : function(score, params) {
            for (var i = 0; i < this.services.length; ++i) {
                var service = this.services[i];
                if (!service.readOnlyHint && service.isLoggedIn())  {
                    service.submitScore(score, function(error) {
                        if (error)
                            console.error("Error submitting score: " + error.message);
                    }, params);
                }
            }
        },

        getLoggedInServices : function() {
            var result= [];

            for (var i = 0; i < this.services.length; ++i) {
                var service = this.services[i];
                if (!service.fakeSocialService &&  service.isLoggedIn())  {
                    result.push(service);
                }
            }
            return result;
        },

        isLoggedInAnySocialService : function() {
            return this.getLoggedInServices().length > 0;
        }
    }

    CocoonJS.Social.Manager = new CocoonJS.Social.ManagerService();

})();