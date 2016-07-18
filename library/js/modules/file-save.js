define(

    [
    'jquery',
    'modules/analytics-module',
    'vendor/angular-custom'
    ],

    function(

        $,
        analytics,
        angular

        ) {

        var TripSaveData = function(fileService) {

            this.statusCheck = function(fileNameCheck, callback) {
                var self = this;

                self.checkFileStatus(fileNameCheck)
                .then(
                    function(response){
                        callback('SAVED');
                    },

                    function(error){
                        if(error.code.toString() === '1'){
                            callback('SAVE');
                        }
                    }
                );
            };

            this.checkFileStatus = function(fileId) {
                return fileService.readFile(fileId);
            };

            this.readItem = function(fileId, callback) {

                fileService.readFile(fileId)
                    .then(function(response) {
                        callback('SAVED');
                    }, function(errorResponse) {
                        callback('SAVE');
                    });
            };

            this.readAllFiles = function() {
                return fileService.readAllFiles();
            };

            this.writeItem = function(fileName, data){

                return fileService.writeFile(fileName,data);
            };

            this.saveItem = function(imageUrl, header, subHeader, fileId, url, urlTarget, callback) {
                var self = this
                    ,saveData = {
                        'fileId':fileId,
                        'content':{
                            'imageUrl':imageUrl,
                            'heading':header,
                            'subHeading':subHeader,
                            'url':url,
                            'urlTarget':urlTarget
                        }   
                    };

                self.writeItem(fileId, saveData)
                    .then(
                    function(success){
                            var analyticsData = {
                                'page' : 'saveLink',
                                'category' : subHeader,
                                'title' : header,
                                'saveItem' : header
                            };
                            analytics.updateAnalytics( analyticsData, 'save' );
                        callback('SAVED');
                    },
                    function(error){
                        callback('SAVE');
                    }
                );
            };

            this.deleteItem = function(fileId, header, subHeader, callback){
                fileService.deleteFile(fileId)
                    .then(function(response) {
                            var analyticsData = {
                                'page' : 'unSaveLink',
                                'category' : subHeader,
                                'title' : header,
                                'saveItem' : header
                            };
                            analytics.updateAnalytics( analyticsData, 'save' );
                        callback('SAVE');
                    }, function(errorResponse) {
                        callback('SAVED');
                    });
            }
        };

        return function (fileService){
            return new TripSaveData(fileService);
        };
    }
);