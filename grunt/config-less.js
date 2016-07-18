/*
 * Less Configuration
 *
 * See all options: https://github.com/gruntjs/grunt-contrib-less
 */
module.exports = function( grunt ) {

    // Accept specific files
    // --files="less/mgmGrand/some/path/index.less"
    // --files="less/mgmGrand/some/path/index.less, less/mgmGrand/some/path/index.less"
    var files = grunt.option( 'files' );

    if ( files ) {

        files = files.split( /,\s*/ );
    }

    grunt.config( 'less', {
        dist: {
            options: {
                compress: true,
                relativeUrls: true,
                sourceMap: false,
                strictMath: true
            },
            files: [
                {
                    expand: true,
                    cwd: 'library',
                    src: files || [
                        '**/tmp/**/index.less',
                        '**/tmp/**/svg.less',
                        '**/tmp/**/logo.less',
                        '**/tmp/**/logo-resorts.less'
                    ],
                    dest: 'library',
                    ext: '.css',

                    // Set the destination to a directory named "css"
                    rename: function( dest, src ) {

                        var path = require( 'path' );

                        return path.join( dest, src.replace( 'less/tmp', 'css' ) );
                    }
                }
            ]
        },
        dev: {
            options: {
                relativeUrls: true,
                strictMath: true,
                sourceMap: true,
                sourceMapFileInline: true,
                sourceMapRootpath: '../../../../'
            },
            files: [
                {
                    expand: true,
                    cwd: 'library',
                    src: files || [
                        '**/tmp/**/index.less',
                        '**/tmp/**/svg.less',
                        '**/tmp/**/logo.less',
                        '**/tmp/**/logo-resorts.less'
                    ],
                    dest: 'library',
                    ext: '.css',

                    // Set the destination to a directory named "css"
                    rename: function( dest, src ) {

                        var path = require( 'path' );

                        return path.join( dest, src.replace( 'less/tmp', 'css' ) );
                    }
                }
            ]
        }
    });

    grunt.loadNpmTasks( 'grunt-contrib-less' );
};