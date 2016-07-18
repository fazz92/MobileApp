define(
    [
        'jquery'
    ],

    function(

        $

    ) {

        'use strict';

        var distance = function(lat1, lon1, lat2, lon2, unit ){
            
           /* if ( google ){

                var p1 = new google.maps.LatLng(lat1, lon1);
                var p2 = new google.maps.LatLng(lat2, lon2);
                return (google.maps.geometry.spherical.computeDistanceBetween(p1, p2) / 1000).toFixed(1) + " mi";
            }*/
            var radlat1 = Math.PI * lat1/180
            var radlat2 = Math.PI * lat2/180
            var radlon1 = Math.PI * lon1/180
            var radlon2 = Math.PI * lon2/180
            var theta = lon1-lon2
            var radtheta = Math.PI * theta/180
            var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
            dist = Math.acos(dist)
            dist = dist * 180/Math.PI
            dist = dist * 60 * 1.1515
            if (unit=="K") { dist = dist * 1.609344 }
            if (unit=="N") { dist = dist * 0.8684 }
            return dist
        }
        return {
            distance: distance
        };
    }
);