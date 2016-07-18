/*
 * SVG Minification Configuration
 *
 * See all options: https://github.com/sindresorhus/grunt-svgmin
 */
module.exports = function( grunt ) {

    var prop = grunt.option( 'property' );
    
    grunt.config( 'svgmin', {
        options: {
            plugins: [
                { removeViewBox: true },
                { removeUselessStrokeAndFill: true },
                { removeEmptyAttrs: true }
            ]
        },
        dist: {
            files: [{
                expand: true,
                cwd:  'library/images/' + prop +'/svg/',        // Path to original SVG files
                src:  [ '*.svg' ],                              // Actual pattern(s) to match
                dest: 'library/images/' + prop +'/svg-min/',    // Destination path prefix.
                ext:  '.svg'                                    // Dest filepaths will have this extension
            }]
        }
    });

    grunt.loadNpmTasks( 'grunt-svgmin' );
};