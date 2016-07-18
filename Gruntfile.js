module.exports = function( grunt ) {

    /* Configure */
    grunt.initConfig({
        pkg: grunt.file.readJSON( 'package.json' ),
        buildRoot: '../',
        revision: 0, // updated via gitsvn:info task
        buildName: {
            dev: '<%= pkg.name %>-dev-build',
            dist: '<%= pkg.name %>-dist-build'
        },
        buildPath: {
            dev: '<%= buildRoot %><%= buildName.dev %>/',
            dist: '<%= buildRoot %><%= buildName.dist %>/'
        }
    });

    /* Load tasks */
    grunt.loadTasks( 'grunt' );

    /* Task aliases */
    grunt.registerTask( 'default', 'Build for testing.', [
        'jshint', // Lint all appropriate js files
        'lessDev',
        'copy:dev',
        'requirejs:dev'
    ]);

    grunt.registerTask( 'dist', 'Build for integration handoff.', [
        'jshint', // Lint all appropriate js files
        'lessDist',
        'clean:distPre',
        'copy:dist',
        'requirejs:dist',
        'uglify:dist',
        'clean:distPost'
    ]);

    grunt.registerTask( 'lessDev', 'Build to compile Less files during development.', [
        'clean:css',
        'clean:lessTmp',
        'append',
        'less:dev',
        'clean:lessTmp'
    ]);

    grunt.registerTask( 'lessDist', 'Build to compile Less files for distribution.', [
        'clean:css',
        'clean:lessTmp',
        'append',
        'less:dist',
        'clean:lessTmp'
    ]);

    grunt.registerTask( 'svg', 'Build to convert SVG files to Data Uri and generate CSS.', [
        'validate:svg',
        'svgmin',
        'grunticon:myIcons',
        'clean:svg'
    ]);
};
