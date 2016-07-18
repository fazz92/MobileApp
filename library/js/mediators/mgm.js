require(
    [
        'jquery',
        'modules/pubsub',
        'controllers/detail-controller',
        'vendor/ionic-bundle'
    ],

    function(

        $,
        pubsub,
        detailController,
        angular

        ) {

        'use strict';

        var mgm = {

            init: function() {

                $( this.initUI.bind( this ) );
                
            },
            initUI: function() {

                this.initAngular();

            },

            initAngular: function() {

                // App/Module definition
                angular.module( 'MGM',
                    [
                        'ionic',
                        'Detail.controller'
                    ]
                )
                .run(function($ionicPlatform) {

                    $ionicPlatform.ready(function() {
                        /*
                         * Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
                         * for form inputs)
                         */
                        if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {

                            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                            cordova.plugins.Keyboard.disableScroll(true);

                        }
                        if (window.StatusBar) {
                            /* 
                             * org.apache.cordova.statusbar required
                             */
                            StatusBar.styleDefault();
                        }
                    });
                })
                .config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
                    /*
                     * Configuration of Ionic app goes here
                     */
                    $ionicConfigProvider.tabs.position('bottom');

                    /*
                     * Ionic uses AngularUI Router
                     */
                    $stateProvider
                    /*
                     * Setup an abstract state for the tabs directive
                     */
                    .state('tabs', {
                        url: '/tab',
                        abstract: true,
                        templateUrl: 'templates/tabs.html'
                    })
                    .state('tabs.home', {
                        url: '/home',
                        views: {
                            'tab-home': {
                                templateUrl: 'templates/home.html'
                            }
                        }
                    })
                    .state('tabs.trips', {
                        url: '/trips',
                        views: {
                            'tab-trips': {
                                templateUrl: 'templates/trips.html'
                            }
                        }
                    })
                    .state('tabs.rewards', {
                        url: '/rewards',
                        views: {
                            'tab-rewards': {
                                templateUrl: 'templates/rewards.html'
                            }
                        }
                    })
                    .state('tabs.details', {
                        url: '/details',
                        views: {
                            'tab-home': {
                                templateUrl: 'templates/details.html'
                            }
                        }
                    })


                    /*
                     * If none of the above states are matched, use this as the fallback
                     */
                    $urlRouterProvider.otherwise('/tab/home');

                })
                .controller('TabController', function($scope) {

                    $scope.tabsFlag = false;

                    pubsub('footer/tabs/toggle').subscribe(function( flag ){

                        $scope.tabsFlag = flag;
                    });
                })
                angular.bootstrap( document, [ 'MGM' ] );
            }
        };

        mgm.init();
    }
);