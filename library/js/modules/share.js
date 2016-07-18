define(
    [
        'jquery',
        'modules/analytics-module'
    ],

    function(

        $,
        analytics

    ) {

        'use strict';

            var openShare = function( _title, _desc, _img, _link, _category ) {

                _desc = _desc.substring( 0, 70 );

                if( window.plugins && MGMRI.authorMode !== 'true' ){

                    window.plugins.socialsharing.share( _title, _desc, _img, _link);

                        var analyticsData = {
                                'category' : _category,
                                'title' : _title,
                                'url' : _link
                            };
                       analytics.updateAnalytics( analyticsData, 'share' );
                }
            };

            return {
                openShare: openShare
            };
    }
);