

define(

    [
        'jquery',
        'vendor/s7video',
    ],

    function(
        $,
        S7video
    ) {

        'use strict';

        var video = {

            init: function() {

                this.initiateVideo();
            },

            /*
             * Video
             */
            initiateVideo: function() {

                if( !S7video ){

                    return false;
                }

                var videoObject
                    , gVideoObj
                    , galleryVideoParams = {
                        'autoplay' : 'false',
                        'playback' : 'native'
                    }
                    , defaults = {
                        //s7options
                        source_quality_list: {
                            //Only desktop/ogg is currently supported
                            //Because mobile video doesn't autoplay
                            desktop : '_1280x720_2000K',//16:9
                            desktop_ogg : '_OGG_800x450_1200K',//lower quality ogg for loading times
                            tablet_high : '_iPad_768x432_1200K',
                            tablet_low : '_Mobile_512x288_600K',
                            mobile_high : '_Mobile_512x288_600K',
                            mobile_low : '_Mobile_512x288_400K'
                        }
                    }
                    , current_quality = defaults.source_quality_list.desktop
                    ;

                var defaultEventFunction = function( elContainer,el,elObj,timeStamp,eventString ) {

                    var eventInfo = eventString.split( ',' );

                    switch( eventInfo[ 0 ] ) {

                    case 'LOAD' :

                        break;
                    case 'STOP' :

                        break;
                    case 'PLAY' :

                        break;
                    case 'MILESTONE' :

                        break;
                    case 'METADATA' :

                        switch( eventInfo[ 1 ] ) {

                        case 'SEEK' :

                            break;
                        case 'DURATION' :

                            break;
                        }

                        break;
                    }
                },

                createVideoObject = function ( containerId, params, eventFunction ) {

                    videoObject = new S7video(
                        {
                            containerId : containerId,
                            params : params,
                            handlers : {
                                trackEvent : eventFunction
                            }
                        }
                    );

                    videoObject.init( );

                    return videoObject;
                };

                var videoInlineID = 'details-inline-video'
                    , videoInlineProp = $( '#' + videoInlineID )
                    , videoPreviewImg = $( '.img-placeholder-for-video' )
                    , videoPreviewIcon = $( '.img-placeholder-for-video .play-icon' )
                    ;

                gVideoObj = null;

                galleryVideoParams.asset = videoInlineProp.attr( 'data-video' ) + current_quality.replace( '_', '%5F' );
                galleryVideoParams.serverurl = videoInlineProp.attr( 'data-server-url' );
                galleryVideoParams.videoserverurl = videoInlineProp.attr( 'data-video-server-url' );

                gVideoObj = createVideoObject( videoInlineID, galleryVideoParams, defaultEventFunction );

                /* Following snippet is used for implementation of a preview image on top of the video player - MGPT-4747 */
                if ( gVideoObj && videoPreviewImg.length ) {

                    videoPreviewIcon.on( 'click', function( e ) {

                        e.preventDefault();
                        videoPreviewImg.addClass( 'hide' );
                        gVideoObj.videoplayer.play();
                    });
                }
            }
        };

        function initVideo(){
            if ( $( '#details-inline-video' ) && $( '#details-inline-video' ).length > 0 && !$( '#details-inline-video' ).hasClass('s7videoviewer') ) {

                video.init();
            }
        }
        

        return {
            initVideo : initVideo
        };
    }
);