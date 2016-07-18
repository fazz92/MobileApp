define(

    [
        'jquery',
        'vendor/img-touch-canvas',
    ],

    function(
        $,
        imgTouchCanvas
    ) {

        'use strict';

        var mapPinchZomm = {
            
               
            init : function() {
                var canvas = document.getElementById('mycanvas')
                ,   path = canvas.getAttribute("data-mapimgurl")
                ,   gesturableImg = new ImgTouchCanvas({
                    canvas: canvas,
                    path: path
                    //desktop: true
                });
            }
        }

        return mapPinchZomm;

       
     }
);