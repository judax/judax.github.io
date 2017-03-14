var gulp = require('gulp');
var watch = require('gulp-watch');
var batch = require('gulp-batch');
var versiony = require('versiony');

gulp.task('default', function () {
    watch('../src/*.js', batch(function(events, done) {
    	versiony
    		.from("../package.json")
    		.patch()
    		.to("../package.json");
    }));
});
