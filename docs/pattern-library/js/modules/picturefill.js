/*! Picturefill - Responsive Images that work today. (and mimic the proposed Picture element with span elements). Author: Scott Jehl, Filament Group, 2012 | License: MIT/GPLv2 */

define([], function(){

    function checkImages( options ) {

        var ps = window.document.getElementsByTagName( "span" );

        // Loop the pictures
        for( var i = 0, il = ps.length; i < il; i++ ){
            if( ps[ i ].getAttribute( "data-picture" ) !== null ){

                var sources = ps[ i ].getElementsByTagName( "span" ),
                    matches = [];
                // See if which sources match
                for( var j = 0, jl = sources.length; j < jl; j++ ){

                    var media = sources[ j ].getAttribute( "data-media" );

                    if( !media || ( window.matchMedia && window.matchMedia( media ).matches ) ){
                        matches.push( sources[ j ] );
                    }
                }

                // Find any existing img element in the picture element
                var picImg = ps[ i ].getElementsByTagName( "img" )[ 0 ];

                if( matches.length ){
                    var matchedEl = matches.pop();
                    if( !picImg || picImg.parentNode.nodeName === "NOSCRIPT" ){
                        picImg = window.document.createElement( "img" );
                        picImg.alt = ps[ i ].getAttribute( "data-alt" );
                    }
                    else if( matchedEl === picImg.parentNode ){
                        // Skip further actions if the correct image is already in place
                        continue;
                    }

                    picImg.src =  matchedEl.getAttribute( "data-src" );
                    matchedEl.appendChild( picImg );
                    picImg.removeAttribute("width");
                    picImg.removeAttribute("height");
                }
                else if( picImg ){
                    picImg.parentNode.removeChild( picImg );
                }
            }
        }
    }
    function picturefill( options ) {

        checkImages( options );

        if( window.addEventListener ) {
            window.addEventListener("resize", function() {
                //TODO: throttle
                checkImages( options );
                }, false);
        }
    }

    return function( options ){

        picturefill( options );
    };
});