/*
 * Duplicate LESS files from properties to `tmp` folder
 * and concatenate any files that match the `mgmGrand` source files
 *
 * Options:
 * @param property {string} - comma-separated list (E.G. --property=mgmGrand,mirage)
 *
 * Usage:
 * > grunt --property=mirage            --> development build
 * > grunt dev --property=mirage        --> development build
 * > grunt dist --property=mirage       --> distribution build
 * > grunt lessDev --property=mirage    --> development LESS compiling
 * > grunt lessDist --property=mirage   --> distribution LESS compiling
 *
 */
module.exports = function ( grunt ) {

    'use strict';

    var fSlash = '/'
        , tmpDir = 'library/less/tmp/'
        , lessPath = 'library/less/'
        , propParam = grunt.option( 'property' )
        , propertyList = propParam ? checkProperty( propParam ) : getProperties( lessPath )
        , rootProperty = 'mgmGrand'
        , rootSrcPath = lessPath + rootProperty + fSlash
        , rootFiles = createFileList( rootSrcPath )
        , overwriteRegex = 'svg.less|logo.less|logo-resorts.less|typography.less'
        ;

    grunt.config( 'append', {
        less: {}
    });

    grunt.registerMultiTask( 'append', 'Description', function() {

        // Cleans then creates `library/less/tmp` directory
        grunt.file.mkdir( tmpDir );

        // Loop through property list array
        propertyList.forEach( function( pKey ) {

            // Duplicate root LESS files (mgmGrand) into tmp directory using property name
            grunt.log.write( 'Duplicating and appending files for ' + pKey.cyan + '...' );
            createTmpFiles( pKey );

            // If property is `mgmGrand` then skip check file loop (case-insensitive due to OS X)
            if ( pKey.toLowerCase() === rootProperty.toLowerCase() ) {

                grunt.log.ok();
                return;
            }

            // Loop through newly created tmp property files
            createFileList( tmpDir + pKey ).forEach( function( tmpFile, tmpIndex ) {

                var propertyList = createFileList( lessPath + pKey );

                // Loop through property less files
                propertyList.forEach( function( propFile, propIndex ) {

                    var tmpFilePath
                        , propFilePath
                        , fileDataString
                        ;

                    // Check if matching file exists in property
                    if ( tmpFile === propFile ) {

                        // Get dataString of matching files, concat, and save
                        tmpFilePath = tmpDir + pKey + fSlash + tmpFile;
                        propFilePath = lessPath + pKey + fSlash + propFile;

                        // Overwrite file if `svg.less`, `logo.less`, `logo-resorts.less`
                        if ( propFile.match( overwriteRegex ) ) {

                            grunt.file.copy( propFilePath, tmpFilePath );

                        }
                        else {

                            // Concat property file to tmp source file
                            fileDataString = concatFiles( [ tmpFilePath, propFilePath ] );

                            // Save concatenate file in tmp property path
                            grunt.file.write( tmpFilePath, fileDataString );
                        }
                    }
                });
            });

            grunt.log.ok();
        });
    });

    function concatFiles( pathArray ) {

        var dataArr = [];

        pathArray.forEach( function( path ) {

            dataArr.push( grunt.file.read( path ) );
        } );

        return dataArr.join( '\n' );
    }

    function createTmpFiles( property ) {

        var dest = tmpDir + property + fSlash;

        rootFiles.forEach( function( file ) {

            grunt.file.copy( rootSrcPath + file, dest + file );
        });
    }

    function createFileList( path ) {

        return grunt.file.expand( { cwd: path }, [
            '**/*.less',
            '**/normalize.css',
            '**/ionic.css'
        ] );
    }

    // Return array of all directories (properties) in `library/less` directory
    function getProperties( path ) {

        return grunt.file.expand( { filter: 'isDirectory', cwd: path }, [ '*', '!tmp' ] );
    }

    function checkProperty() {

        var failed = false
            , props =  propParam.split( /,\s*/ )
            ;
        
        // Check if property has been set and directory exists
        props.forEach( function( prop ) {

            if ( !prop || prop === undefined || prop === '' || !grunt.file.isDir( lessPath + prop ) ) {

                grunt.log.warn( ( 'The property name "' ).red + prop.magenta.bold + ( '" is invalid!' ).red );

                failed = true;
            }
        });

        if ( failed ) {

            grunt.log.writeln( '\nAvailable properties include:' );

            getProperties( lessPath ).forEach( function( property, index ) {

                grunt.log.writeln( ( index + 1 ) + '. ' + property.cyan );
            });

            grunt.log.writeln( '\r' );
            grunt.fail.fatal( 'Aborted due to missing or invalid property name.', 6 );
        }

        return props;
    }
};