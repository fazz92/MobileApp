define(
    [
        'vendor/angular-custom'
    ],

    function(
        angular
    ) {

        'use strict';

        return angular.module( 'File.service', [] )

        .service( 'fileService', function ($q) {

                const DIRNAME = 'trips';
                var cordova = cordova || undefined;
                
                var writeToFileSystem = function( _fName, _data ){

                    var deferred = $q.defer();

                    if( cordova ){
                        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (directoryEntry) {
                            directoryEntry.getDirectory(DIRNAME,{create:true,exclusive:false},function(dir){
                                dir.getFile(_fName, {create: true}, function(fileEntry){
                                    fileEntry.createWriter(function(writer){
                                        writer.onwriteend = function(evt) {
                                            deferred.resolve({
                                                message : "WRITE FILE ("+ _fName+") : File writing successful"
                                            })
                                        };
                                        writer.onerror = function(err){
                                            //handler if during writing some error occured
                                            deferred.reject({
                                                message : "WRITE FILE ("+ _fName+") : Error in writing data to file : "+ err.code,
                                                code:err.code
                                            });
                                        };
                                        //make sure that the data to write is string, if not stringify it
                                        if(typeof _data == "string"){
                                            writer.write(_data);
                                        } else {
                                            writer.write(JSON.stringify(_data));
                                        }
                                    }, function(fail){
                                        //error handler for creating file writer
                                        deferred.reject({
                                            message: "WRITE FILE ("+ _fName+") : Error in creating writer : "+fail.code,
                                            code:fail.code
                                        });
                                    });
                                }, function(fail){
                                    //error handler for getfile
                                    deferred.reject({
                                        message: "WRITE FILE ("+ _fName+") : Error in getting the file : "+fail.code,
                                        code:fail.code
                                    });
                                });
                            },function(fail){
                                //error handler for getDirectory
                                deferred.reject({
                                    message: "WRITE FILE ("+ _fName+") : Error in getting the directory : "+fail.code,
                                    code:fail.code
                                });
                            });
                        }, function(fail){
                            //error handler for requestFileSystem
                            deferred.reject({
                                message: "WRITE FILE ("+ _fName+") : Error in requesting file system : "+fail.code,
                                code:fail.code
                            });
                        });
                    }                   

                    return deferred.promise;
                };

                var readFromFileSystem = function(_fName){
                    var deferred = $q.defer();

                    if( cordova ){
                        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (directoryEntry) {
                            directoryEntry.getDirectory(DIRNAME,{create:true,exclusive:false},function(dir){
                                dir.getFile(_fName, null, function(fileEntry){
                                    fileEntry.file(function(file){
                                        var reader = new FileReader();
                                        reader.onloadend = function(evt) {
                                            deferred.resolve({
                                                message : "READ FILE ("+ _fName+") : File reading successful",
                                                data : evt.target.result
                                            });
                                        };
                                        reader.onerror = function(err){
                                            deferred.reject({
                                                message : "READ FILE ("+ _fName+") : Error during reading file : "+err.code,
                                                code:err.code
                                            });
                                        };
                                        reader.readAsText(file);
                                    }, function(fail){
                                        //error handler for creating file writer
                                        deferred.reject({
                                            message: "READ FILE (" + _fName + ") : Error in creating writer : "+fail.code,
                                            code:fail.code
                                        });
                                    });
                                }, function(fail){
                                    //error handler for getfile
                                    deferred.reject({
                                        message: "READ FILE (" + _fName + ") : Error in getting the file : "+fail.code,
                                        code:fail.code
                                    });
                                });
                            },function(fail){
                                //error handler for getDirectory
                                deferred.reject({
                                    message: "READ FILE ("+ _fName+") : Error in getting the directory : "+fail.code,
                                    code:fail.code
                                });
                            });
                        }, function(fail){
                            //error handler for requestFileSystem
                            deferred.reject({
                                message: "READ FILE (" + _fName + ") : Error in requesting file system : "+fail.code,
                                code:fail.code
                            });
                        });
                    }
                    return deferred.promise;
                };

                var readAllFromFileSystem = function(){
                    var deferred = $q.defer();
                    var result = [];
                    var fileArray = [];

                    if( cordova ){
                        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (directoryEntry) {
                            directoryEntry.getDirectory(DIRNAME,{create:true,exclusive:false},function(dir){
                                var reader = dir.createReader();
                                reader.readEntries(
                                    function(entries) {
                                        for (i=0; i<entries.length; i++) {
                                        	var entry = entries[i];
                                			if( entry.isFile && entry.name[0] !== '.' && entry.name !== 'start_flag.json' ) fileArray.push(entry);
                                		}
                                        if ( fileArray.length > 0) {
                                            var j = 0;
                                        	for (i=0; i<fileArray.length; i++) {
                                        		var _entry = fileArray[i];
                                                _entry.file(function(file){
                                                    var reader = new FileReader();
                                                    reader.onloadend = function(evt) {
                                                        var _obj = JSON.parse(evt.target.result);
                                                        _obj['last_modified_time'] = file.lastModified;
                                                        result.push(_obj);

                                                        j++;    
                                                        
                                                        if( j === fileArray.length ) {
                                                            deferred.resolve({
                                                                data:JSON.stringify(result),
                                                                message:'All files read successfully'
                                                            });
                                                        }
                                                    };
                                                    reader.onerror = function(err){
                                                        deferred.reject({
                                                            message : "READ ALL : Error during reading file : "+err.code,
                                                            code:err.code
                                                        });
                                                    };
                                                    reader.readAsText(file);
                                                }, function(err){
                                                    deferred.reject({
                                                        message : "READ ALL : Error during getting file : "+err.code,
                                                        code:err.code
                                                    });
                                                });
                                        	}
                                        	
                                        } else {
                                            deferred.reject({
                                                message : "READ ALL : No files to read.",
                                                code: -555
                                            });
                                        }
                                    },
                                    function(err){
                                        deferred.reject({
                                            message : "READ ALL : Error during reading file : "+err.code,
                                            code:err.code
                                        });
                                    }
                                )
                            },function(fail){
                                deferred.reject({
                                    message : "READ ALL : Error during reading directory : "+err.code,
                                    code:err.code
                                });
                            });

                        });
                    }

                    return deferred.promise;
                };

                var deleteFileFromFileSystem = function(_fName){
                    var deferred = $q.defer();

                    if( cordova ){
                        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (directoryEntry) {
                            directoryEntry.getDirectory(DIRNAME,{create:true,exclusive:false},function(dir){
                                dir.getFile(_fName, null, function(fileEntry){
                                    fileEntry.remove(
                                        function(success){
                                            deferred.resolve({
                                                message:'DELETE FILE ('+ _fName +') : File removed successfully'
                                            });
                                        },
                                        function(fail){
                                            deferred.reject({
                                                message: "DELETE FILE (" + _fName + ") : Error in deleting the file : "+fail.code,
                                                code:fail.code
                                            });
                                        }
                                    )
                                },function(fail){
                                    //error handler for getfile
                                    deferred.reject({
                                        message: "DELETE FILE (" + _fName + ") : Error in getting the file : "+fail.code,
                                        code:fail.code
                                    });
                                });
                            },function(fail){
                                deferred.reject({
                                    message: "DELETE FILE (" + _fName + ") : Error in getting the directory : "+fail.code,
                                    code:fail.code
                                });
                            });
                        });
                    }

                    return deferred.promise;
                };

                return{
                    readFile : readFromFileSystem,
                    writeFile : writeToFileSystem,
                    readAllFiles : readAllFromFileSystem,
                    deleteFile : deleteFileFromFileSystem
                }
            }
        );
    }
);
