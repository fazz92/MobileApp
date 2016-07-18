/*
 * Git Hooks Configuration
 *
 * See all options: https://www.npmjs.org/package/grunt-githooks
 */
module.exports = function( grunt ) {

    grunt.config( 'githooks', {
        all: {
        	// options: {
        	// 	template: 'grunt/hooks/post-commit.js' 
        	// },
            'pre-commit': 'jshint',
            'post-merge': 'lessDev --property=mgmGrand',
            // 'post-commit': '' 
        }
    });

    grunt.loadNpmTasks( 'grunt-githooks' );
};