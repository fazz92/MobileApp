/*
 * JSHint Configuration
 *
 * See all options: http://www.jshint.com/docs/options/
 */
module.exports = function( grunt ) {

    grunt.config( 'jshint', {
        options: {
            jshintrc: '.jshintrc'
        },
        all: [
            'library/**/*.js',
            '!library/**/config/*.js',
            '!library/**/vendor/**/*.js',
        ]
    });

    grunt.loadNpmTasks( 'grunt-contrib-jshint' );
};