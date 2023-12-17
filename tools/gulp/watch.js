// Gulp APIs
var {
	watch, 
    task,
    series } = require("gulp");

// Important js files
var build = require('./build');
var helpers = require('./helpers');

var sync = require('browser-sync').create();

var observe = (cb) => {
    helpers.compiler(true);
    cb();
};

// Localhost site
var localhost = ((cb) => {
    sync.init({
        open: false,
        injectChanges: true,
        reloadDelay: 200,
        scrollProportionally: false,
        notify: false,
        server: {
            baseDir: build.config.output
        }
    });
    cb();
});

var reload = (cb) => {
	sync.reload();
	cb();
}

// Task to serve and build bundle
var serve = async (cb) => {
    var assets = build.assets;
    watch([helpers.dotPath(assets.styles),
        helpers.dotPath(assets.html),
        helpers.dotPath(assets.images),
        helpers.dotPath(assets.scripts)], { delay: 500 }, series(observe, reload));
    cb();
}

// gulp serve commands
task('serve', series(localhost, serve));
