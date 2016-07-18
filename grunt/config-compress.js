/*
 * Compress Configuration
 *
 * See all options: https://github.com/gruntjs/grunt-contrib-compress
 */
module.exports = function( grunt ) {

    grunt.config( 'compress', {
        options: {
            archive: '<%= basePath %><%= buildName %>.zip'
        },
        src: [
            '<%= buildPath %>/.*',
            '<%= buildPath %>/**'
        ]
    });

    grunt.loadNpmTasks( 'grunt-contrib-compress' );
};