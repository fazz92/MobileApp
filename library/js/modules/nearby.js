define(

    [
        'jquery',
        'modules/pubsub'
    ],

    function(
        $,
        pubsub
    ) {

        'use strict';


        var map
        ,   disPos
        ,   mapCntr 
        ,   markerLoc 
        ,   markerCurrentLoc
        ,   markerSelected  
        ,   markerDirection 
        ,   markerCenter
        ,   mapDiv
        ,   clickedMarker

        ,   nearby = {

            updateMap: function (viewType, markerData, deviceLatLong) {

                var _map = _map || undefined;
                if( _map ) {

                    map = _map;
                    map.clear();
                    if (viewType !== 'map') {
                        map.setVisible(false);
                    } else if ( document.getElementById('map') !== undefined ) {
                        window.scrollTo(0, 0);
                        mapDiv = document.getElementById('map');
                        /* var minHt = $(window).height() - 40;
                        mapDiv.style.height = minHt + "px"; */
                        map.setDiv(mapDiv);
                        map.setVisible(true);
                        if ( deviceLatLong ) {
                            mapCntr = new plugin.google.maps.LatLng( deviceLatLong.latitude, deviceLatLong.longitude );
                            map.setCenter(mapCntr);
                            this.plotPointsOnMap(markerData);
                        }
                    }
                }
            },

            plotPointsOnMap: function(locations) {
                
                //locations is supposed to be array of lats and longs
                markerLoc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAeCAMAAAD0DqVnAAABKVBMVEUAAAD////////////////////////////////////////////+/v3////+/v3+/v3////+/v7+/fz9/Pr8+/j7+fb7+vf6+PT7+fb7+fX7+vf8+/j6+fX7+fb8+/j8+/j7+vf8+/jv6tz59/H9/Pry7uPz8Ob49vH9/fv5+PP+/fzs5tbv6t38+/j9/Pr9/Pr+/v3h177k3MX+/v3+/v7i2cDg1rzh2L+8p2+8p3C9qHC9qHG+qXK+qXO/qnW/q3bArXjBrXnBrnrCr3vCr33EsX/EsYDFsoLJuIrLuo/NvZPOvpXPwJfPwJjQwZnQwZrQwpvTxaDYy6razq/bz7Hc0bTf1rvh173i2cDk3MXs5tfy7eLz7+b08ej18ur49e/7+fX7+vf////ir9mXAAAAOHRSTlMAAQYKDRIeHyYqOEdKSk1eYWltjJ2tsbK6v8jT2OLl5uft9vb29/f39/j4+fn5+fr6/Pz8/P3+/pw+kxoAAAFJSURBVHgBXYjnYqJAFEZvSO89IbEr9uKqqANix4JFxO5icX3/h1hmUBHPj3vPd0Dn7sPGblnbxx0Y3PxGs22xKLaz0d+bfXwKZIpIp5gJPOnxId5BBp34A47XTA8d02OutUqnkZk0DXAbKxHnJUXiiZVit/CeJNpQ13/XaoN48h2sMhZhOc2h3HQp4CFbIVTDoqicdjlVwaMWgm0ey2SCjJffAlvGMp6TOh/jW2bBKWFpbkTtipsmHpITvocIM1vJdXk1Iz78hhc3MW6w+LcYcMTdL3CZqiIz1dQlwM/opI5+AODez5si77/X6pm9b6p9+xlovHlN1fsGGMrVPYpdFwWEVx93iJzvFXQoh3KoioOCHY+ewi4WPI9wgE7saoIGgyumRWKLuYIjnoMVLVaCz2DiKyIgIfIFZs4t4XrYcg4nXHz++bzYj/9+bGWuTxUJvwAAAABJRU5ErkJggg==';
                markerCurrentLoc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAaCAMAAABxVtfCAAABJlBMVEUAAAD////////////////////////////8/v/4/P75/f72/P70+/7y+v72/P72/P70+/70+/73/P77/f/g8/zk9fzM7PnN7PnU7/r4/P75/f77/f/7/v/A5/j+//+z4/b+//9fw+1gw+1jxO1kxe5lxe5nxu5px+5qx+5syO5tyO9uye9xyu92zPB3zPB5zfB7zfB7zvB8zvCI0/KL0/KM1PKO1fKS1vOT1/OV1/OY2POb2fSc2vSe2/Sh3PSj3fWn3vWs4Pat4Pau4faz4/a45Pe55fe65fe85vfA5/jD6PjK6/nL6/nM7PnP7frV7/rX8PvY8Pvl9fzo9vzp9/3q9/3v+f3w+f3y+v7z+/70+/72+/72/P73/P78/v/9/v/+//////+q1w92AAAAIXRSTlMAAwUKHSoyOnOHjJe4wsLHztbs9fj4+fn5+vr6+/39/v4m1HErAAABeElEQVR42oWS11bCUBBFY+8N7H00F1Bj7FhRsWChKFaMErP//yfMVe5KeHK/7rVmzZw5lqG9eyAxz3xioLvdaqajf3Yit51ZzmznJmb7O2KmpWdmYUUMKwszPS1GtQ2OuSL2fqHyWCns2yLu2GDbn2odmlRiX3j84V3YoiaHWn9d36gS94mIJ1fUaJ9WXdOObNSAt5ujvaObN6C2Ic50V+iGz0U9w3deiUblv+FZyfmwZXVOKbmCICuGbABXoqY6rd45SdUhLxF5qKdkrtcaOZBDeLdjzn6HQzkYsZKuFOBO4txBQdykRVpKcNbkzqAkabQrw2mTO4Vy6PTMW7huctdwG87Uu5zAy1JMLb3ASbiLvmHVh+OYOwZ/Vd+gb7+Hry0xbH3Bvb79N7O1D/CyJhYPPtbCzBpZ7/hANbfpbOaqgL+jszY/2vWI8Hb1j6LfOsWgYYKi0/ht1In1y4fXz9eHy3XTiX+6ZDo43ujgeNTBeHcXWYx39weHb3HjhaW8bAAAAABJRU5ErkJggg==';
                markerSelected = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAnCAMAAADNRxOMAAABaFBMVEUAAABmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZsbGxmZmZmZmZtbW1mZmZmZmZtbW1ubm5vb29ubm5ubm5vb29mZmZwcHBmZmZmZmZmZmZmZmZmZmZmZmZubm5xcXFxcXFubm5xcXFmZmZmZmZubm5mZmZtbW1ubm5mZmZmZmZmZmZra2tmZmZra2tmZmZ/f3+BgYGEhIRmZmZqamp8fHxpaWmGhoaLi4tpaWmNjY2RkZGSkpJmZmZoaGiXl5ebm5tmZmagoKBnZ2dmZmZnZ2eUlJRmZmZra2tsbGyOjo6Wlpanp6exsbGzs7O0tLS1tbXExMTR0dHT09Pc3Nzd3d3e3t7i4uLn5+fo6Ojq6urr6+v09PT19fX29vb7+/v9/f3+/v7///8YXjeNAAAAXHRSTlMAAgUHCQoLDA0ODxAREhcZGjA3OD5FTU9XXGFmaWpshIWMjo+XmJmcoKSrrK+wxMXGyNXW1tna2t3f3+Hj5+3x8vLz8/X19fX29vb4+Pj5+fn5+vr6+/z8/f7+/tQQIYcAAAFiSURBVHjaddNpW0FBFMDxQ6VEZVeSbK2ytpFCUmkvlVJDoUSRFszXL5zL4Pq/Ouf5PfPM3BcXMLHO5o2TuNemEwObyBgmXGGjqA0KH2HzKTjQRElnUU0TlAgsKRt3+0lv/vo7TIQvE4A0gnMyW66Us0ncIlLQ45gq0HqFFO56sOP0QptlcbcDd38Z5Yt7AyRwqqBUcE8A6TmDQRCH1657guDu8zY3WAjv9xALqAl/ahAGeCEgBLDyihUA5Lwih/8cPOCAeloe0TZE4OkBjwD6HNIC5uoCF3CpukQFrWwdYIN2shADIRkwGRgxAJvA2QKnoEOGZmIIsekBaDdiPtl/Rnk8Ppod5GB866JIaaYBGUo/TlclKMu3NUppLf0P6fpUvZpH2XmnjXJPueaQ30RZuatRturNAsrE9mWJgeLZxhhgkrnrw2z+8+f3u/SWOTg3D0O70aml9b0Hcr+7tjiJP/AfjLQILSXtnY4AAAAASUVORK5CYII=';
                markerDirection = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAfCAMAAAAocOYLAAAAulBMVEUAAABmZmZmZmZmZmZoaGhpaWlsbGxqampxcXFubm5ubm5tbW16enpqamptbW1ubm6fn59nZ2dmZma1tbXHx8fb29vi4uLk5OTy8vL19fX7+/v9/f3+/v7////4+Pjv7+/z8/Pr6+vu7u7k5OTg4ODZ2dnR0dHKysrLy8vPz8/GxsbCwsK1tbWvr6+np6ejo6Obm5uenp6VlZWRkZGLi4uGhoaBgYF6enp3d3dzc3Nra2tubm5mZmZnZ2cT4jIVAAAAPHRSTlMAAisvVFlwdrbCyNbf4ODg4uPl5eXl5eXl5eXl5eXm5+fo6Onq6+zt7e3u7/Hy8/T19fb3+Pn6+/z9/v6piwBzAAABG0lEQVQoz4WT53qDIBSGcSTujUZNT2c60zZ2L3r/t1VKAggxD98fec4rZ4OQkOP5UVEWke85aE+WG6Y5btqubXCehq6lYjuIcQ9cPY4De4xnSSUp+6NKZhLPsxp01dlc3M4WsK9FtvNgJzVMqU5YDlZQKealOFXBfxVurKZ2dymSjF3KQ6y6XX+d8SMOadfSXuPk/Zg7SB3k5aBz8ny0O+ce8oX7qxumDSHkgQfwUdRw/kmkrremJkJFO8W/V8zUFqjspjhZM1NXHri/AX5fif8yDMMbxa9LEV/mT/lqW9/Hqcxf1i/4zwXI+mX/OP+9hVH/ZP85v4dx/+X8HoenE/o5B3V++vxBm79pf4z7Z9xf4/4b34/x/R18v39iyFpXK24k9gAAAABJRU5ErkJggg==';
                markerCenter = 'data:image/png;base64,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';

                //plot current location marker
                this.centerMap();

                map.addMarker({
                  'position': mapCntr,
                  'title': "My location",
                  'icon' : markerCurrentLoc
                });


                
                for(var i=0; i < locations.length; i++) {
                    if( locations[i].distance ) {
	                    var _markerPos = new plugin.google.maps.LatLng(locations[i].latitude, locations[i].longitude),
	                   
	                    _marker = {
	                        position: _markerPos,
	                        icon : markerLoc,
	                        _id: locations[i].id,
	                        heading: locations[i].heading,
	                        category: locations[i].category,
	                        distance: locations[i].distance,
	                        price : locations[i].price,
	                        latitude : locations[i].latitude,
	                        longitude : locations[i].longitude,
	                        phoneNumbers : locations[i].phoneNumbers,
	                        description : locations[i].description.short,
	                        url: locations[i].url,
	                        date : locations[i].date,
	                        image : locations[i].image.src,
	                        categoryCopy : locations[i].categoryCopy,
	                        bookingUrl : locations[i].bookingUrl,
	                        bookableOnline : locations[i].bookableOnline,
	                        newWindow : locations[i].newWindow,
	                        contentId : locations[i].contentId,
	                        button : locations[i].button,
	                        amenityType : locations[i].amenityType
	
	                    };
	
	                    map.addMarker(_marker, function(_m) {
	                       
	                        _m.addEventListener(plugin.google.maps.event.MARKER_CLICK, function() {
	
	                            disPos = _m.get('position');
	
	                            if( clickedMarker ) {
	                                clickedMarker.setIcon(markerLoc);
	                            } 
	                            clickedMarker = _m;
	
	                             var markerData = {
	                                id      :           _m.get('_id'),
	                                heading :           _m.get('heading'),
	                                category :          _m.get('category'),
	                                distance :          _m.get('distance'),
	                                price :             _m.get('price'),
	                                lat:                _m.get('latitude'),
	                                lng :               _m.get('longitude'),
	                                phoneNumbers :      _m.get('phoneNumbers'),
	                                description :       _m.get('description'),
	                                url:                _m.get('url'),
	                                date :              _m.get('date'),
	                                image :             _m.get('image'),
	                                categoryCopy :      _m.get('categoryCopy'),
	                                bookingUrl :        _m.get('bookingUrl'),
	                                bookableOnline :    _m.get('bookableOnline'),
	                                newWindow :         _m.get('newWindow'),
	                                contentId :         _m.get('contentId'),
	    	                        button : 			_m.get('button'),
	    	                        amenityType : 		_m.get('amenityType')
	                            };
	                            
	                            pubsub( 'map/marker' ).publish( markerData );
	
	                            _m.hideInfoWindow();
	                            
	                            _m.setIcon(markerSelected);
	
	                            $('.icon-nearby-dir').show();
	
	                        });
	                    });  
                   
                    }
                }
            },

            centerMap : function() {
                if(map) {
                    map.animateCamera({
                        'target': mapCntr,
                        'zoom': 13
                    });
                }
            },
            
            removeMap : function() {
                if(map) {
                    map.clear();
                    clickedMarker = undefined;
                    map.setVisible(false);
                }
            },
            
            refreshMap : function() {
                if(map) {
                    map.refreshLayout();
                }
            },
            
            openMapApp : function() {
                plugin.google.maps.external.launchNavigation({
                    "from": mapCntr,
                    "to": disPos
                });
            },
            
            mapClickable : function( action ) {
                if(map) {
                    map.setClickable( action );
                }
            }
        };
        return nearby;
       
     }
);
