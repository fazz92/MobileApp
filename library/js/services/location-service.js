define(
    [
        'vendor/angular-custom'
    ],

    function(
        angular
    ) {

        'use strict';

        return angular.module( 'Location.service', [] )
        .service('LocationService', function ($q) {

            var _locationCheckPromptMessage = "MGM Grand would like to access your location";

            var locationOptions = {
                maximumAge: 2000,
                timeout: 5000,
                enableHighAccuracy: true
            };

            window.sessionStorage.setItem('locationChecked', 'false');

            var getLocation = function () {
                var deferred = $q.defer();

                //check location is enabled or not and then get the location data
                if( typeof device !== "undefined" ){
                var platformType = device.platform.toUpperCase();

                switch (platformType) {
                case 'ANDROID':

                    cordova.plugins.diagnostic.isLocationEnabled(function (enabled) {
                        if (enabled) {
                            //location is enabled, we can get the coordinates

                            navigator.geolocation.getCurrentPosition(
                                function (position) {
                                    var location = {};
                                    location.latitude = position.coords.latitude;
                                    location.longitude = position.coords.longitude;
                                    deferred.resolve(location);
                                },
                                function (error) {
                                    deferred.reject({
                                        message: error.message + ' , ' + error.code
                                    });
                                },
                                locationOptions
                            );
                        } else {
                            //most probably location is disabled, prompt the user to turn on the location in settings
                            function confirmCallback(buttonIndex) {
                                if (buttonIndex == 0) {
                                    //user pressed cancel
                                    deferred.reject({
                                        message: 'Location access denied by user on prompt'
                                    });
                                } else if (buttonIndex == 1) {
                                    //take the user to location settings page
                                    cordova.plugins.diagnostic.switchToLocationSettings();
                                }
                            }

                            if (window.sessionStorage.getItem('locationChecked') === 'false') {
                                window.sessionStorage.setItem('locationChecked', 'true');
                                navigator.notification.confirm(_locationCheckPromptMessage, confirmCallback, '', ['Settings', 'Cancel']);
                            } else {
                                deferred.reject({
                                    message: 'Location access denied by user on prompt'
                                });
                            }

                        }
                    }, function (error) {
                        //error handler when checking location availability on android
                        deferred.reject({
                            message: "LocationService : Could not check location availability"
                        });
                    });
                    break;

                    //the IOS handler-- we need to try to access the location first in case the user denied the location access on allow location page
                case 'IOS':
                    navigator.geolocation.getCurrentPosition(
                        function (position) {
                            var location = {};
                            location.latitude = position.coords.latitude;
                            location.longitude = position.coords.longitude;
                            deferred.resolve(location);
                        },
                        function (error) {
                            cordova.plugins.diagnostic.getLocationAuthorizationStatus(
                                function (status) {
                                    if (status == 'not_determined' || status == 'denied') {
                                        //user has denied the status from settings, we can take the user there
                                        function confirmCallback(buttonIndex) {
                                            if (buttonIndex == 0) {
                                                //user pressed cancel
                                                deferred.reject({
                                                    message: 'Location access denied by user on prompt'
                                                });
                                            } else if (buttonIndex == 1) {
                                                //take the user to location settings page
                                                cordova.plugins.diagnostic.switchToSettings(function () {
                                                    console.log("Successfully switched to Settings app");
                                                }, function (error) {
                                                    console.error("The following error occurred: " + error);
                                                });
                                            }
                                        }
                                        if (window.sessionStorage.getItem('locationChecked') === 'false') {
                                            window.sessionStorage.setItem('locationChecked', 'true');
                                            navigator.notification.confirm(_locationCheckPromptMessage, confirmCallback, null, ['Settings', 'Cancel']);
                                        } else {
                                            deferred.reject({
                                                message: 'Location access denied by user on prompt'
                                            });
                                        }
                                    }
                                },
                                function (error) {
                                    deferred.reject({
                                        code: error.code,
                                        message: error.message
                                    });
                                }
                            );
                        },
                        locationOptions
                    );
                    break;
                }
                }
                return deferred.promise;
            }

            return {
                getLocation: getLocation
            }
        });
    }
);
