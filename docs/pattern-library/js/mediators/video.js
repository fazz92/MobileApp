define( 

    [
        
        'vendor/s7video'
    ],

    function( 

        s7video
        
    ) {
        
        var exampleVideoParams = {
            'asset' : 'Scene7SharedAssets/Glacier_Climber_MP4',
            'serverurl' : 'http://s7d1.scene7.com/is/image/',
            'videoserverurl' : 'http://s7d1.scene7.com/is/content/',
            'autoplay' : 'true',
            'playback' : 'native'
        }
        
        var defaultEventFunction = function( elContainer,el,elObj,timeStamp,eventString ) {
            
            var eventInfo = eventString.split( ',' );

            switch( eventInfo[0] ) {
                case 'LOAD' : 

                break;
                case 'STOP' : 

                break;
                case 'PLAY' : 

                break;
                case 'MILESTONE' : 

                break;
                case 'METADATA' : 

                    switch( eventInfo[1] ){
                        case 'SEEK' : 

                        break;
                        case 'DURATION' : 

                        break;
                    }

                break;

            }
        }


        function createVideoObject( containerId, params, eventFunction ) {
            
            var videoObject = new s7video( 
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
        }


        var videoContainer = document.getElementById( 'standardVideo' )
            , hiddenControlsVideoContainer = document.getElementById( 'hiddenControlsVideo' )
            , loopVideo 
            ;


        var loopEventFunction = function( elContainer,el,elObj,timeStamp,eventString ) {
  
          var eventInfo = eventString.split(',');
          if( eventInfo[ 0 ] === 'MILESTONE' && eventInfo[ 1 ] === '100' ) {
          
            setTimeout( function() {

              loopVideo.videoplayer.seek(0);
              loopVideo.videoplayer.play();
            
            }, 0);

          } 
        }

        createVideoObject( videoContainer.id, exampleVideoParams, defaultEventFunction );
        
        loopVideo = createVideoObject( hiddenControlsVideoContainer.id, exampleVideoParams, loopEventFunction );


    }
 );