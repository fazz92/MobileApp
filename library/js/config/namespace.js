// Global Namespace for MGM Resorts International
var MGMRI = MGMRI || {};

/*
* Convenience function for parsing string namespaces and automatically generating nested namespaces.
* http://addyosmani.com/blog/essential-js-namespacing/
* http://yuilibrary.com/yui/docs/api/classes/YUI.html#method_namespace
*
* Example:
*    MGMRI.extend( 'some.type.of.object' );
*
* @param ns {String} A dot separated namespace
*
*/
MGMRI.extend = function( ns ) {

    var parts = ns.split( '.' )
        , parent = this
        ;

    if ( parts[ 0 ] === 'MGMRI' ) {
        parts = parts.slice( 1 );
    }

    for ( var i = 0, len = parts.length; i < len; i++ ) {

        // Create a property if it doesn't exist
        if ( typeof parent[ parts[ i ] ] === 'undefined' ) {

            parent[ parts[ i ] ] = {};
        }

        parent = parent[ parts[ i ] ];
    }

    return parent;
};

MGMRI.extend( 'externalUrl' );
MGMRI.externalUrl = {
  s7video : '//s7d1.scene7.com/s7viewers/html5/js/VideoViewer'
};
MGMRI.extend( 'googleApi' );
MGMRI.googleApi = {
    api: 'https://maps.googleapis.com/maps/api/js?key=AIzaSyAi_aLNw4mzFEZ8tZCbm7Di4XQG2_oegWI&libraries=geometry',
    url : 'http://10.209.124.165/mgm-web/search/en/v1/66964e2b-2550-4476-84c3-1a4c0c5c067f/promo/author'
};
MGMRI.extend( 'data' );
MGMRI.data = {
    urls: {
        booking: {
            ticketing   : '../bookingTicketing/'
        }
    }
}
MGMRI.extend( 'activeFooter' );
MGMRI.activeFooter = "find"
MGMRI.appName = "mgmapp"
MGMRI.appVersion = "1.0.0"
MGMRI.appSection = "mgmapp:home"

