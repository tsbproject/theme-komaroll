// Gulp APIs
var {
	series, 
    task } = require("gulp");

var yargs = require('yargs');

var del = require('del');

// Important js files
var build = require('./build');
var helpers = require('./helpers');


if (Object.keys(build).length === 0) {
    return;
}

// merge with default parameters
var args = Object.assign({
    prod: false,
}, yargs.argv);

if (args.prod !== false) {
    // force disable debug for production
    build.config.debug = false;
    build.config.compile = Object.assign(build.config.compile, {
        'compressJs': true,
        'compressCss': true,
        'compressHtml': true,
        'jsSourcemaps': true,
        'cssSourcemaps': true,
    });
}

// Clean generated file
var clean = async () => {
    return del.sync(build.config.output, {force: true});
}

// Task to bundle js/css
var bundle = async (cb) => {
    helpers.compiler();
    cb();
}


// Exports gulp commands
task('build', series(clean, bundle));