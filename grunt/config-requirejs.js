/*
 * RequireJS Build profile
 *
 * See all options: https://github.com/jrburke/r.js/blob/master/build/example.build.js
 */
module.exports = function( grunt ) {
    
    var mainConfigFile = grunt.file.read( 'library/js/config/require-config.js' )
        , ngAnnotate = require( 'ng-annotate' )
        , _ = require( 'lodash' )
        , vm = require( 'vm' )
        , mainConfig = {}
        ;

    vm.runInNewContext( mainConfigFile, mainConfig );

    var common = {

        // generateSourceMaps: true,
        /*
         The path that represents the project's root folder
         This path is relative to this file.
        */
        appDir: './library',
        
        /*
         This is the main path to which our modules are relative.
         This path is relative to the `appDir` option.
        */
        baseUrl: 'js',
        
        /*
         If using UglifyJS for script optimization, these config options will be
         passed to UglifyJS.
         See https://github.com/mishoo/UglifyJS for the possible values.
        */
        // uglify: {
            /*
             Custom value supported by r.js but done differently in uglifyjs directly:
             Skip the processor.ast_mangle() part of the uglify call (r.js 2.0.5+)
            */
        //     no_mangle: false,
        //     compress: {
        //         dead_code: true,
        //         drop_console: true
        //     }
        // },

        // Set 'none' so you can see how the files are concatenated.
        // optimize: 'none',
        
        // Ignore the css files
        optimizeCss: 'none',
        
        /*
         Introduced in 2.1.2: If using "dir" for an output directory, normally the
         optimize setting is used to optimize the build bundles (the "modules"
         section of the config) and any other JS file in the directory. However, if
         the non-build bundle JS files will not be loaded after a build, you can
         skip the optimization of those files, to speed up builds. Set this value
         to true if you want to skip optimizing those other non-build bundle JS
         files.
        */
        skipDirOptimize: true,

        /*
         Since jQuery defines its path as `jquery`, it would need to be
         found at the root of your js directory (`baseUrl`). This may not
         always be possible. The following option allows us to locate
         jQuery at a more logical path.
         Paths are relative to `baseUrl`.
        */
        paths: mainConfig.require.paths,
        
        /*
         If shim config is used in the app during runtime, duplicate the config
         here. Necessary if shim config is used, so that the shim's dependencies
         are included in the build.
        */
        shim: mainConfig.require.shim,

        /*
         Map a module's ID to another ID. This allows a module to require
         'moduleA' and instead get 'moduleB'.
        */
        map: mainConfig.require.map,
        
        /*
         Create an object for each bootstrap to be optimized. Their immediate
         and deep dependencies will be built into the main module's file.
         Paths is relative to `baseUrl`.

         Modules are added in the site's `require-config.js` file.
        */
        modules: mainConfig.require.modules,

        /*
         Used for unit testing.  Needed for `ngmin`?
        */
        //normalizeDirDefines: 'all',

        /*
         A function that if defined will be called for every file read in the
         build that is done to trace JS dependencies. This allows transforms of
         the content.
        */
        onBuildRead: function ( moduleName, path, contents ) {
            
            // If file is not in 'vendor' directory remove console statements
            var data = ( path.indexOf( 'vendor' ) >= 0 ) ? contents : contents.replace( /console(.*)\(.*\);/g, '' );

            /*
             Run 'ng-annotate' during r.js concatenation process to fix any
             AngularJS dependency errors on minification
             REFERENCE: https://github.com/olov/ng-annotate
            */
            var res = ngAnnotate( data, { add: true } );

            if ( res.errors ) {
                
                // do something with this, res.errors is now an array of strings
                throw new Error( res.errors.join( '\n' ) );
                
            }
            else {

                return res.src;
            }
        }
    };


    grunt.config( 'requirejs', {
        
        dev: {
            options: _.assign( _.clone( common, true ), {
                dir: '<%= buildPath.dev %>library/',
                optimize: 'none',
            } )
        },

        dist: {
            options: _.assign( _.clone( common, true ), {
                dir: '<%= buildPath.dist %>library/',
                skipDirOptimize: false
            } )
        }
    });
    
    grunt.loadNpmTasks( 'grunt-contrib-requirejs' );
};