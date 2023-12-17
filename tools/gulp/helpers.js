'use strict';

// Gulp APIs
var {
    src,
	dest 
} = require("gulp");

var sass = require('gulp-sass')(require('sass'));
var rewrite = require('gulp-rewrite-css');
var cleanCSS = require('gulp-clean-css');

var uglify = require('gulp-uglify-es').default;

var gulpIf = require('gulp-if');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var htmlmin = require('gulp-htmlmin');

var lazypipe = require('lazypipe');
var path = require('path');
var fs = require('fs');
var yargs = require('yargs');

// Important js files
var build = require('./build');

// merge with default parameters
var args = Object.assign({
    prod: false,
    dark: false
}, yargs.argv);

if (args.prod !== false) {
    // force disable debug for production
    build.config.debug = false;
    build.config.compile.compressJs = true;
    build.config.compile.compressCss = true;
    build.config.compile.compressHtml = true;
    build.config.compile.jsSourcemaps = true;
    build.config.compile.cssSourcemaps = true;
}


module.exports = {

    // default variable config
    config: Object.assign({}, {
        debug: true,
        compile: {
            compressJs: false,
            compressCss: false,
            compressHtml: false,
            jsSourcemaps: false,
            cssSourcemaps: false
        },
    }, build.config),

    scripts: [],

    /**
     * Walk into object recursively
     * @param {array} array 
     * @param {function} funcName 
     * @param {*} userData 
     * @returns {object}
     */
    objectWalkRecursive: function(array, funcName, userData) {
        if (!array || typeof array !== 'object') {
            return false;
        }
        if (typeof funcName !== 'function') {
            return false;
        }
        for (var key in array) {
            // apply "funcName" recursively only on object
            if (Object.prototype.toString.call(array[key]) === '[object Object]') {
                var funcArgs = [array[key], funcName];
                if (arguments.length > 2) {
                    funcArgs.push(userData);
                }
                if (module.exports.objectWalkRecursive.apply(null, funcArgs) === false) {
                    return false;
                }
                // continue
            }
            try {
                if (arguments.length > 2) {
                    funcName(array[key], key, userData);
                } else {
                    funcName(array[key], key);
                }
            } catch (e) {
                return false;
            }
        }
        return true;
    },

    /**
     * Convert string path to actual path
     * @param {string} path 
     * @returns {string}
     */
    dotPath: function(path) {        
        var REGEX = new RegExp(/\{\$(.*?)\}/);
        var matched = path.match(REGEX);
        var dot = (obj, i) => { return obj[i]; };

        if (matched) {
            var realpath = matched[1].split('.').reduce(dot, build);
            return path = path.replace(matched[0], realpath);
        }

        return path;
    },

    /**
     * Convert multiple paths
     * @param {array} paths 
     */
    dotPaths: function(paths) {
        paths.forEach(function(path, i) {
            paths[i] = module.exports.dotPath(path);
        });
    },

    /**
     * Get end filename from path
     * @param path
     * @returns {string}
     */
    baseFileName: function(path) {
        var maybeFile = path.split('/').pop();
        if (maybeFile.indexOf('.') !== -1) {
            return maybeFile;
        }
        return '';
    },

    /**
     * Get dark file name
     * @param {string} filename 
     * @returns {string}
     */
    darkFileName: function(filename) {
        var path = 'src/scss/styles.scss';

        if (filename.includes(path)) {
            var arr = filename.split('/');
            if (arr.length > 0) {
                arr.pop();
            }
            return arr.join('/') + '/styles.dark.scss';
        }
        return filename;
    },

    /**
     * CSS path rewriter when bundle files moved
     * @param bundle
     * @returns {object}
     */
    cssRewriter: function(bundle) {
        var imgRegex = new RegExp(/\.(gif|jpg|jpeg|tiff|png|ico|svg)$/i);
        var config = this.config;
        
        return lazypipe().pipe(function() {
            
            // rewrite css relative path
            return rewrite({
                destination: bundle['styles'],
                debug: config.debug,
                adaptPath: function(ctx) {
                    
                    var isCss = ctx.sourceFile.match(/\.[css]+$/i);
                    
                    // process css only
                    if (isCss[0] === '.css') { 
                        if (/plugins\.bundle/.test(bundle['styles'])) {
                            
                            var filePcs = ctx.targetFile.split(/\\|\//);
                            if (filePcs.length > 2) {
                                filePcs.shift();
                                filePcs.shift();
                            }

                            var pieces = ctx.sourceDir.split(/\\|\//);
                            // only vendors/base pass this
                            var vendor = pieces[pieces.indexOf('node_modules') + 1];
                            if (pieces.indexOf('node_modules') === -1) {
                                vendor = pieces[pieces.indexOf('vendors') + 1];
                            }
                            var extension = '../fonts/';
                            if (imgRegex.test(ctx.targetFile)) {
                                extension = '../images/';
                            }
                            
                            return path.join(extension, vendor, filePcs.join('/'));
                        }

                        return ctx.targetFile.replace(/\.?\.\//, '');
                    }
                },
            });
        });
    },

    /**
     * Add CSS compilation options to gulp pipe
     * @param {boolean} rtl 
     * @param {string} includePaths 
     * @returns {object} 
     */
    cssChannel: function(rtl, includePaths) {
        var config = this.config.compile;

        return lazypipe().pipe(function() {
            return gulpIf(config.cssSourcemaps, sourcemaps.init({loadMaps: true, debug: config.debug}));
        }).pipe(function() {
            return sass({
                errLogToConsole: true,
                includePaths: [build.config.root + "/scss", "node_modules"].concat(
                    includePaths
                )
            }).on('error', sass.logError);
        }).pipe(function() {
            return gulpIf(config.compressCss, cleanCSS());
        }).pipe(function() {
            return gulpIf(true, autoprefixer({
                overrideBrowserslist: ['last 2 versions'],
                cascade: false,
            }));
        }).pipe(function() {
            return gulpIf(config.cssSourcemaps, sourcemaps.write('./'));
        });
    },

    /**
     * Add JS compilation options to gulp pipe
     * @returns {object} 
     */
    jsChannel: function() {
        var config = this.config.compile;
        return lazypipe().pipe(function() {
            return gulpIf(config.jsSourcemaps, sourcemaps.init({loadMaps: true, debug: config.debug}));
        }).pipe(function() {
            return gulpIf(config.compressJs, uglify());
        }).pipe(function() {
            return gulpIf(config.jsSourcemaps, sourcemaps.write('./'));
        });
    },

    /**
     * Add HTML compilation options to gulp pipe
     * @returns {object} 
     */
    htmlChannel: function() {
        var config = this.config.compile;
        return lazypipe().pipe(function() {
            return gulpIf(config.compressHtml, htmlmin({
                collapseWhitespace: true, 
                removeComments: true
            }));
        });
    },

    /**
     * Multiple output paths by output config
     * @param {string} path 
     * @param {string} outputFile 
     * @param {string} type 
     * @returns {object}
     */
    outputChannel: function(path, outputFile, type) {
        if (typeof path === 'undefined') {
            console.log('Output path not defined');
        }
        if (typeof outputFile === 'undefined') {
            outputFile = '';
        }
        
        var REGEX = new RegExp(/\{\$.*?\}/);
        var matched = path.match(REGEX);
        var piping = lazypipe();

        if (matched) {
            var output = build.config.output;
            var outputPath = path.replace(matched[0], output).replace(outputFile, '');
            (function(_output) {
                piping = piping.pipe(function() {
                    return dest(_output);
                });
            })(outputPath);
        }
        
        return piping;
    },

    /**
     * Bundle
     * @param {object} bundle
     * @returns {object}
     */
    bundle: function(bundle) {
        var _self = this;
        var streams = [];
        var stream;
        
        if (bundle.hasOwnProperty('src') && bundle.hasOwnProperty('dist')) {
            // for images & fonts as per vendor
            if ('mandatory' in bundle.src && 'optional' in bundle.src) {
                // generate vendors object from bundle object
                var vendors = {};
                for (var key in bundle.src) {
                    if (!bundle.src.hasOwnProperty(key)) {
                        continue;
                    }
                    vendors = Object.assign(vendors, bundle.src[key]);
                }

                // looping for venders
                for (var vendor in vendors) {
                    if (!vendors.hasOwnProperty(vendor)) {
                        continue;
                    }
                    
                    // get vendor from object
                    var vendorObj = vendors[vendor];
                    for (var type in vendorObj) {
                        if (!vendorObj.hasOwnProperty(type)) {
                            continue;
                        }

                        _self.dotPaths(vendorObj[type]);

                        switch (type) {
                            case 'fonts':
                                stream = src(vendorObj[type], {allowEmpty: true});
                                var output = _self.outputChannel(bundle.dist[type] + '/' + vendor, undefined, type)();
                                if (output) {
                                    stream.pipe(output);
                                }
                                streams.push(stream);
                                break;

                            case 'images':
                                stream = src(vendorObj[type], {allowEmpty: true});
                                var output = _self.outputChannel(bundle.dist[type] + '/' + vendor, undefined, type)();
                                if (output) {
                                    stream.pipe(output);
                                }
                                streams.push(stream);
                                break;
                        }
                    }
                    
                }
                
            }
            
            // flattening array
            if (!('styles' in bundle.src) && !('scripts' in bundle.src)) {
                var srcObj = {styles: [], scripts: []};
                _self.objectWalkRecursive(bundle.src, function(paths, type) {
                    switch (type) {
                        case 'styles':
                        case 'scripts':
                            srcObj[type] = srcObj[type].concat(paths);
                            break;

                        case 'images':
                            // images for mandatory and optional vendor already processed
                            if (!'mandatory' in bundle.src || !'optional' in bundle.src) {
                                srcObj[type] = srcObj[type].concat(paths);
                            }
                            break;
                    }
                });

                bundle.src = srcObj;
            }
            
            this.scripts = bundle.src ? bundle.src.scripts : [];

            for (var type in bundle.src) {
                if (!bundle.src.hasOwnProperty(type)) {
                    continue;
                }

                // skip if not array
                if (Object.prototype.toString.call(bundle.src[type]) !== '[object Array]') {
                    continue;
                }

                // skip if no bundle output is provided
                if (typeof bundle.dist[type] === 'undefined') {
                    continue;
                }

                _self.dotPaths(bundle.src[type]);
                var outputFile = _self.baseFileName(bundle.dist[type]);
                
                switch (type) {
                    case 'styles':
                        if (bundle.src[type].length && bundle.dist.hasOwnProperty(type)) {
                            var srcFiles = bundle.src[type];

                            // Check for dark mode
                            if (args.dark) {
                                srcFiles = srcFiles.map(this.darkFileName).filter(function (path) {
                                    return path != null;
                                });
                            }

                            stream = src(srcFiles, {allowEmpty: true}).pipe(_self.cssRewriter(bundle.dist)()).pipe(concat(outputFile)).pipe(_self.cssChannel()());
                            var output = _self.outputChannel(bundle.dist[type], outputFile, type)();
                            if (output) {
                                stream.pipe(output);
                            }
                            streams.push(stream);
                        }
                        break;

                    case 'scripts':
                        if (bundle.src[type].length && bundle.dist.hasOwnProperty(type)) {
                            stream = src(bundle.src[type], {allowEmpty: true}).pipe(concat(outputFile)).pipe(_self.jsChannel()());
                            var output = _self.outputChannel(bundle.dist[type], outputFile, type)();
                            if (output) {
                                stream.pipe(output);
                            }
                            streams.push(stream);
                        }

                        break;

                    case 'images':
                        if (bundle.src[type].length && bundle.dist.hasOwnProperty(type)) {
                            stream = src(bundle.src[type], {allowEmpty: true});
                            var output = _self.outputChannel(bundle.dist[type], undefined, type)();
                            if (output) {
                                stream.pipe(output);
                            }
                            streams.push(stream);
                        }
                        break;
                }
            }
        }

        return streams;
    },

    /**
     * Copy source to output destination
     * @param {object} bundle 
     * @returns {object}
     */
    output: function(bundle) {
        var _self = this;
        var stream;
        var streams = [];

        if (bundle.hasOwnProperty('src') && bundle.hasOwnProperty('output')) {
            for (var type in bundle.src) {
                if (!bundle.src.hasOwnProperty(type)) {
                    continue;
                }

                _self.dotPaths(bundle.src[type]);

                if (bundle.output.hasOwnProperty(type)) {
                    switch (type) {
                        case 'styles':
                            stream = src(bundle.src[type], {allowEmpty: true}).pipe(_self.cssChannel()());
                            var output = _self.outputChannel(bundle.output[type], undefined, type)();
                            if (output) {
                                stream.pipe(output);
                            }
                            streams.push(stream);
                            break;
                    
                        case 'scripts':
                            stream = src(bundle.src[type], {allowEmpty: true}).pipe(_self.jsChannel()());
                            var output = _self.outputChannel(bundle.output[type], undefined, type)();
                            if (output) {
                                stream.pipe(output);
                            }
                            streams.push(stream);
                            break;

                        case 'html':
                            stream = src(bundle.src[type], {allowEmpty: true}).pipe(_self.htmlChannel()());
                            var output = _self.outputChannel(bundle.output[type], undefined, type)();
                            if (output) {
                                stream.pipe(output);
                            }
                            streams.push(stream);
                            break;

                        default:
                            stream = src(bundle.src[type], {allowEmpty: true});
                            var output = _self.outputChannel(bundle.output[type], undefined, type)();
                            if (output) {
                                stream.pipe(output);
                            }
                            streams.push(stream);
                            break;
                    }
                }
            }
        }

        return streams;
    },

    /**
     * Resources compiler
     * @param {boolean} watch 
     */
    compiler: function(watch = false) {
        var _self = this;
        var obj = watch ? build.build.resources : build.build;
        
        _self.objectWalkRecursive(obj, (val, key) => {
            if (val.hasOwnProperty('src')) {
                if (val.hasOwnProperty('dist')) {
                    _self.bundle(val);
                }
                if (val.hasOwnProperty('output')) {
                    _self.output(val);
                }
            }
        });
    }

};