//'use strict'

var FLOW = FLOW || {};

FLOW.OOPUtils = FLOW.OOPUtils || require('flow-oop-utils');
FLOW.EventUtils = FLOW.EventUtils || require("flow-event-utils");


var SceneManager = function( app, loaderList, params ) {
    FLOW.EventUtils.Observable.call(this);
    this.app = app;
    this.loaderList = loaderList;
    this.params = params || {};
    
    this.numberOfLoaders = this.loaderList.length;
    this.resetPercentageAt =0; //This is used to calculate percent complete for the loaderViewer
    this.loaderIndex = 0;

};

FLOW.OOPUtils.prototypalInheritance(SceneManager, FLOW.EventUtils.Observable);

SceneManager.prototype.setLoaderList= function( array ) {
    this.loaderList = array;
    this.numberOfLoaders = this.loaderList.length;
};

SceneManager.prototype.load= function() {
    this.nextLoader(  );
};

SceneManager.prototype.nextLoader= function(){
    var thisLoader = ( this.loaderIndex < this.loaderList.length )? this.loaderList[this.loaderIndex] : null;

    if (! thisLoader) {
        this.callEventListeners("onFinished", true);
        return;
    }
    var thisCall = thisLoader.loader ? thisLoader.loader : thisLoader.do ? thisLoader.do : null ;

    if (! thisCall ){
        console.error("SceneManager: nextLoader needs to specify either a loader or a do .");
        this.callEventListeners("onError");
    }
    var loaderName =  thisLoader? (thisLoader.name) ? thisLoader.name : " module " + (this.loaderIndex +1): "all!";
    console.log( "initializing: " + loaderName);
    var loaderObject = thisLoader.object;

    if (loaderObject) {
        loaderObject.addEventListener("onLoaderFinished", function (loadSucceeded) {
            if (loadSucceeded) {
                console.log("All items loaded!");
                this.loaderIndex++;
                this.callEventListeners("onProgressed", (this.loaderIndex  - this.resetPercentageAt)/ (this.numberOfLoaders   - this.resetPercentageAt));
                this.nextLoader();
            }
            else {
                console.error("All  load process finished but not all items were successfully loaded.");
            }
        }.bind(this));

        loaderObject.addEventListener("onLoaderProgressed", function ( item, percentComplete ) {
           //var progressAmount = (this.loaderIndex)/ this.numberOfLoaders + percentComplete/ this.numberOfLoaders;
            var progressAmount = (this.loaderIndex - this.resetPercentageAt)/ (this.numberOfLoaders  - this.resetPercentageAt )+
                (percentComplete/ (this.numberOfLoaders  - this.resetPercentageAt ));
            console.log("Loader progressed: " + item.name + ". "+ (progressAmount*100) + "%");
            this.callEventListeners("onProgressed", progressAmount   );
        }.bind(this));
        loaderObject.addEventListener("onLoaderFailed", function (item, errorMessage) {
            console.error("Failed to load " + item.name + ". Reason: " + errorMessage);
            this.callEventListeners("onFailed", errorMessage);
        }.bind(this));

        thisCall.call(loaderObject, this.app, thisLoader.params);
    } else {

        //Calls the function specified
        thisCall.call( this.app, function () {
            this.loaderIndex++;
            this.callEventListeners("onProgressed", (this.loaderIndex - this.resetPercentageAt)/ (this.numberOfLoaders - this.resetPercentageAt ));
            this.nextLoader();
        }.bind(this), thisLoader.params);
    }
};


/** the lockScreen and unlockScreen are only necessary on VRWebGL to prevent the user from experiencing lock-up
 * when loading new resources onto the native GL process.
 * @param callback
 */
SceneManager.prototype.lockScreen = function( callback ) {
   /* if (! FLOW.Platform.isGear()) {
        if (callback) {callback() }
        return;
    }*/
    //Puts up a box around the users eyes

    //this.hiderBox.position.set(this.app.camera.position.x, this.app.camera.position.y, this.app.camera.position.z);
    this.hiderBox.position.set(0,0,10);

    this.hiderBox.visible=true;
   // this.app.rootScene.visible =false;

    //Locks the ability to navigate with flyControls
    //TODO: lock the ability to move in the Vive/ Oculus

    //Stops any movement in the Perspective module

    //Puts up a Loading message in front of the user's eyes....

    //Puts up a progressive LoaderViewer in front of the user's eyes...

    if (callback){
        setTimeout(callback, 200); //lets ohe frame of update happen
    }
};

/** the lockScreen and unlockScreen are only necessary on VRWebGL to prevent the user from experiencing lock-up
 * when loading new resources onto the native GL process.
 * @param callback
 */
SceneManager.prototype.unlockScreen = function( callback ) {
  /*  if (!FLOW.Platform.isGear()) {
        if (callback) {callback() }
        return;
    }*/
    //Removes box around the users eyes
    if (this.hiderBox) {
        this.hiderBox.visible=false;
    }
   // this.app.rootScene.visible =true;

    //UnLocks the ability to navigate with flyControls
    //TODO: unlock the ability to move in the Vive/ Oculus

    //resumes any movement in the Perspective module

    //Removes the Loading message in front of the user's eyes....

    //Removes the progressive LoaderViewer in front of the user's eyes...

    if (callback){
        callback();
    }
};

var Loader = function( sceneManager, params ) {
    FLOW.EventUtils.Observable.call(this);
    this.sceneManager = sceneManager;
    this.params = params || {};

    FLOW.OOPUtils.prototypalInheritance(Loader, FLOW.EventUtils.Observable);
};

Loader.prototype.load = function() {

};



FLOW.Load = {
    SceneManager: SceneManager,
    Loader:  Loader
};

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
}(function () {
    return FLOW.Load;
}));

