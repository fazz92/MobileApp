/*
 * JSDoc Configuration
 *
 * See all options: https://github.com/krampstudio/grunt-jsdoc
 */
module.exports = function( grunt ) {

    grunt.config( 'jsdoc', {
       dist : {
	        src: ['./library/js/mediators/*.js','./library/js/modules/*.js', 'README.md'],
	        options: {
	            destination : 'doc',
	            	template : "node_modules/ink-docstrap/template",
	            	configure : "node_modules/ink-docstrap/template/jsdoc.conf.json"
	        }
    	}

    });

    grunt.loadNpmTasks('grunt-jsdoc');
};
