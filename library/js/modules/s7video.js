/**
	* @desc To conditionally export the scene7 video based on few conditions
 *
 * @name scene7-video
 */


define(
    [
        'vendor/s7videoURL'
    ],

    function(
		videoObj
		
	) {

        'use strict';
		
		var videoUrl;
		if(( typeof MGMRI !== 'undefined' ) && MGMRI.externalUrl && MGMRI.externalUrl.s7video && ( typeof window !== 'undefined' && window.navigator.onLine ) ){
			videoUrl = videoObj ; 
		}else{
			videoUrl = false;
		}
		return 	videoUrl;	
    }
);