var require = {

    // This is the main path to which our modules are relative.
    baseUrl: 'js',

    // Time in seconds until timeout
    waitSeconds: 90,

    // Paths are relative to `baseUrl`.
    paths: {
        /*
         jquery.js defines its path as `jquery`. The following
         option allows us to locate it at a more logical path.
        */
        'jquery': 'vendor/jquery'
    },

    shim: {

    },

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