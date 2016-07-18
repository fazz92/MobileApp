/*
 Set global dependency exclusion for template mediators.
 Global dependencies are included in `mediators/common.js.`
 Variable used in require.modules compile array.
*/
var globalExcludes = [
    'jquery',
    'mediators/common',
    'modules/canvas',
    'vendor/angular-custom',
    'vendor/angular-route'
];

var require = {

    // This is the main path to which our modules are relative.
    baseUrl: ( typeof MGMRI !== 'undefined' && MGMRI.baseURL ) || 'library/js',

    // Time in seconds until timeout
    waitSeconds: 90,

    // Paths are relative to `baseUrl`.
    paths: {
        /*
         jquery.js defines its path as `jquery`. The following
         option allows us to locate it at a more logical path.
        */
        'jquery': 'vendor/jquery',
        'vendor/lodash': 'vendor/lodash.underscore',
		'vendor/s7video': ( ( typeof MGMRI !== 'undefined' ) && (MGMRI.externalUrl && MGMRI.externalUrl.s7video) ) || '//s7d1.scene7.com/s7viewers/html5/js/VideoViewer'
    },

    shim: {
        // The angular library does not implement AMD.
		'vendor/ionic-bundle': {
            exports: 'angular'
        },
        // TweenLite library does not implement AMD.  TweenMax does by comparison.
        'vendor/TweenLite': {
            deps: [ 'vendor/CSSPlugin' ],
            exports: 'TweenLite'
        },
        // S7 VideoViewer does not implement AMD.
        'vendor/s7video': {
            exports: ( typeof navigator === 'undefined' || typeof navigator.connection === 'undefined' || ( navigator.connection && navigator.connection.type !== "none" ) ) ? 's7viewers.VideoViewer' : 'modules/false'
        },
        // EaselJS library does not implement AMD.
        'vendor/easel': {
            exports: 'createjs'
        }
    },



    /*
     Add modules to compile here with their respective includes/excludes.
     Referenced in both RequireJS and Uglify Grunt files.
    */
    modules: [
        {
            name: 'mediators/common',
            include: [
                'modules/canvas',
                'vendor/angular-custom',
                'vendor/angular-route'
            ]
        },
        {
            name: 'mediators/components',
            exclude: globalExcludes
        },
        {
            name: 'mediators/home',
            exclude: globalExcludes
        },
        {
            name: 'mediators/landing',
            exclude: globalExcludes
        },
        {
            name: 'mediators/detail',
            exclude: globalExcludes
        },
        {
            name: 'mediators/services',
            exclude: globalExcludes
        }
    ],

    /*
     Map a module's ID to another ID. This allows a
     module to require 'moduleA' and instead get 'moduleB'.
    */
    map: {

        /*
         The following applies to all modules (`'*'`).
        */
        '*': {

            /*
             Take jquery out of the global namespace.
            */
            'jquery': 'modules/noconflict'
        },

        /*
         The following applies only to the module ID `modules/jquery` and
         declares that when the module ID `jquery` is required, it will be
         mapped back to the module ID `jquery`. And since that path has
         been relocated via the `paths` option, this module will get the
         actual jQuery source file.
         Why go through all this trouble???? Take a look at the jquery.js
         file in modules/ and you find a call to `$.noConflict( true );`.
         These hijinks keep our version of jQuery as a private instance.
         If you are working in an environment with mulitple versions of
         jQuery on the page, you can now trust which jQuery API you're using.
        */
        'modules/noconflict': {
            'jquery': 'jquery'
        }
    }
};