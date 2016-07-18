/*
 * Verify that specified files contain valid filenames
 *
 * Options:
 * @property match {regex} - alphanumeric, hypen, underscore, period
 *
 * Files:
 * @property src {array[string]} - Array of files or files in a directory (use glob)
 */
module.exports = function ( grunt ) {

    'use strict';

    var fs = require( 'fs' )
        , path = require( 'path' )
        , property = grunt.option( 'property' )
        ;

    // Check if 'property' flag has been set before running additional tasks
    // e.g. --property=mgmGrand
    if ( grunt.cli.tasks.indexOf( 'svg' ) > -1 ) { checkProperty( property ); }

    grunt.config( 'validate', {
        svg: {
            options: {
                match: /^[a-zA-Z0-9-_.]+$/i
            },
            files: {
                src: [
                    'library/images/' + property + '/svg/**/*.svg'
                ]
            }
        }
    });

    grunt.registerMultiTask( 'validate', 'Verify file names are valid', function() {

        var invalidFiles = []
            , srcDir = this.data.files.src[ 0 ].split( '/' )[ 0 ]
            , options = this.options({
                match: grunt.option( 'match' ) || /^[a-zA-Z0-9-_.]+$/i
            })
            ;

        // Debug
        // var util = require( 'util' );
        // grunt.log.writeln( util.inspect( this.files ) );

        // Test if source director exists
        if ( !grunt.file.isDir( srcDir ) ) {

            grunt.fail.fatal( srcDir.cyan.bold + ' is not a valid directory!' );
        }

        this.files.forEach( function( fileList ) {

            // Loop through all files in directory
            fileList.src.forEach( function( file ) {

                // Debug
                // grunt.log.writeln( file );

                var paths = file.split( '/' )
                    , fn = paths[ paths.length - 1 ]
                    ;

                // Test is file exists before testing filename
                if ( !grunt.file.isFile( file ) ) {

                    grunt.log.error();
                    grunt.fail.fatal( file.cyan.bold + ' is not a valid file!' );
                }

                // If filename does not match pattern then display error message
                if ( !( fn.match( options.match ) ) ) {

                    invalidFiles.push( fn );
                }
            });

            // Check if invalidFiles array is populated
            if ( invalidFiles.length ) {

                // List all invalid files
                invalidFiles.forEach( function( err ) {

                    grunt.log.warn( ( 'Filename ' ).green + err.cyan + ' contains invalid characters!' );
                });

                // Stop process and display error message
                grunt.fail.fatal( 'Process stopped due to invalid filenames!' );
            }

            grunt.log.writeln( 'All filenames are valid.' );
        });
    });

    function getDirectories( srcpath ) {

        return fs.readdirSync( srcpath ).filter( function( file ) {

            return fs.statSync( path.join( srcpath, file ) ).isDirectory();
        } );
    }

    function checkProperty( prop ) {

        // Check if property has been set and directory exists
        if ( !prop || !fs.existsSync( 'library/less/' + prop ) ) {

            grunt.log.warn( ( 'You must supply the name of the property when converting SVG files!' ).red );
            grunt.log.writeln( 'Available properties include:' );

            getDirectories( 'library/less/' ).forEach( function( property, index ) {

                grunt.log.writeln( ( ( index + 1 ) + '. ' + property ).cyan );
            });

            grunt.fail.fatal( 'Aborted due to missing property name.', 6 );
        }
    }
};