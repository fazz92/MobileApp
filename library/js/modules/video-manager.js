/**
 * @desc To manage all tasks related to video such as video resolution video controls 
 *
 * @name video-manager
 */


define(
    [
        'jquery',
        'vendor/s7video'
    ],

    function(

        $,
        S7video

    ) {

        'use strict';
        /**  
        @module ConvertToDate
        *Converting the date sent in miliseconds to date format
        *@method VideoManager
        */


        var VideoManager = function() {

            var source_quality_list = {
                    //Only desktop/ogg is currently supported
                    //Because mobile video doesn't autoplay
                    desktop : '_1280x720_2000K',//16:9
                    desktop_ogg : '_OGG_800x450_1200K',//lower quality ogg for loading times
                    tablet_high : '_iPad_768x432_1200K',
                    tablet_low : '_Mobile_512x288_600K',
                    mobile_high : '_Mobile_512x288_600K',
                    mobile_low : '_Mobile_512x288_400K'
                }
                , curQuality = source_quality_list.desktop
                , videoGraveyard = $( '<div id="video-graveyard"></div>' )
                ;

            this.videoContainers = [];

            this.init = function() {

                $( ( this.initVideoManager ).bind( this ) );
            };

            this.initVideoManager = function() {

                videoGraveyard.css( 'display', 'none' );

                $( document.body ).append( videoGraveyard );
            };

            /** attach eventlisteners to video container 
            *@method createS7Video 
            *@param {object} element - element on which changes need to be done 
            *@param {string} source - src of video
            *@param {string} videoUrl - Url of video
            *@param {string} imageUrl - Url of image
            *@param {function} eventListener - funtion to bind event listeners to video
            *@param {function} onPlayerInit - funtion that executes on init
            */

            this.createS7Video = function( element, source, videoUrl, imageUrl, eventListener, onPlayerInit ) {

                var videoObject = new S7video(
                    {
                        containerId : element.id,
                        params : {
                            'autoplay' : 'false',
                            'playback' : 'native',
                            asset : source + curQuality.replace('_','%5F'),
                            serverurl : imageUrl ,
                            videoserverurl : videoUrl ,
                            stageSize:'0,0'
                        },
                        handlers : {
                            trackEvent : eventListener,
                            initComplete : onPlayerInit
                        }
                    }
                );

                videoObject.init();

                return videoObject;
            };
            /** To create a video container and attach the video to it 
            *@method createVideo 
            *@param {string} source - src of video
            *@param {string} videoUrl - Url of video
            *@param {string} imageUrl - Url of image
            *@param {function} eventListener - funtion to bind event listeners to video
            *@param {function} onPlayerInit - funtion that executes on init
            */

            this.createVideo = function( source, videoUrl, imageUrl, eventListener, onPlayerInit ) {

                eventListener = eventListener || function() { };
                onPlayerInit = onPlayerInit || function() { };

                if ( !!this.videoContainers[ source ] ) {

                    this.videoContainers[ source ].eventListener = eventListener;

                    this.videoContainers[ source ].isActive = true;

                    // Push the function call outside of the stack
                    // inorder to allow for outside variables to
                    // be set before firing the init function.
                    setTimeout( onPlayerInit, 0 );

                    return this.videoContainers[ source ];
                }

                var videoContainer = {
                        id: 'ManagedVideo_' + Object.keys( this.videoContainers ).length,
                        isActive: true
                    }
                    , videoElement = $( '<span></span>' )
                    , videoObject = null
                    ;

                videoGraveyard.append( videoElement );

                videoElement.attr( 'id', videoContainer.id );
                videoElement.addClass( 'mgmri-s7video' );

                //Allow the event listener to switch depending on the 'creator'
                videoContainer.listenerFunction = ( function( elContainer, el, elObj, timeStamp, eventString ) {

                    this.eventListener( elContainer, el, elObj, timeStamp, eventString );

                }).bind( videoContainer );

                videoContainer.eventListener = eventListener;

                videoObject = this.createS7Video( videoElement[ 0 ], source, videoUrl, imageUrl, videoContainer.listenerFunction, onPlayerInit );

                videoContainer.videoElement = videoElement;
                videoContainer.videoObject = videoObject;

                videoContainer.play = (function() {

                    if ( !this.isActive ) {
                        return;
                    }

                    if ( this.videoObject.videoplayer ) {

                        this.videoObject.videoplayer.play();
                    }

                }).bind( videoContainer );

                videoContainer.stop = (function() {

                    if ( this.videoObject.videoplayer ) {

                        this.videoObject.videoplayer.stop();
                    }

                }).bind( videoContainer );

                videoContainer.remove = ( function( ) {

                    this.removeVideo( source );

                }).bind( this );

                this.videoContainers[ source ] = videoContainer;


                return this.videoContainers[ source ];


            };

            this.loadVideo = function( options ) {

                var source = options.source
                    , videoUrl = options.videoUrl
                    , imageUrl = options.imageUrl
                    , eventListener = options.eventListener
                    , onPlayerInit = options.onPlayerInit
                    ;

                var videoContainer = this.createVideo( source, videoUrl, imageUrl, eventListener, onPlayerInit );

                return videoContainer;

            };

            this.removeVideo = function( source ) {

                if ( !!this.videoContainers[ source ] ) {

                    if ( !!this.videoContainers[ source ].videoObject.videoplayer ) {

                        this.videoContainers[ source ].videoObject.videoplayer.stop();
                    }

                    videoGraveyard.append( this.videoContainers[ source ].videoElement );

                    this.videoContainers[ source ].isActive = false;
                }

            };

            this.init();
        };

        var videoManager = new VideoManager();

        return videoManager;
    }
);