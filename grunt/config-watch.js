/*
 * Watch Configuration
 *
 * See all options: https://github.com/gruntjs/grunt-contrib-watch
 */
module.exports = function( grunt ) {

    // Accept specific files
    // --property=mgmGrand

    var property = grunt.option( 'property' )
        , targetFiles = [ 'library/less/**/*.less' ]
        ;

    if ( property ) {

        targetFiles = [ 'library/less/' + property.split( /,\s*/ )[ 0 ] + '/**/*.less' ];
    }

    grunt.config( 'watch', {
        less: {
            files: targetFiles,
            tasks: [ 'lessDev' ]
        }
    });

    grunt.loadNpmTasks( 'grunt-contrib-watch' );
};