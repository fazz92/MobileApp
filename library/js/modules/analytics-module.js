define(
    [
        'jquery',
    ],
    function(

        $
    ) {

        'use strict';

        var Analytics = function() {

            var appName = MGMRI.appName
                , appVersion = MGMRI.appVersion
                , appSection = MGMRI.appSection
                , detailSection
                , detailsCategory
                , detailDomain
                , page
                , prevAppSection
                , triggerChange = false
                , options = {}
                ;

            this.updateAnalytics = function( data, context ) {

                if( !window.ADB ){

                    return false;
                }
                
                function getDomain( url ){

                    //find & remove protocol (http, ftp, etc.) and get domain
                    if (url.indexOf("://") > -1) {
                        domain = url.split('/')[2];
                    }
                    else {
                        domain = url.split('/')[0];
                    }

                    //find & remove port number
                    domain = domain.split(':')[0];

                    return domain;
                }
                
                try {
                    switch ( context ) {

                    case 'pageLoad' :
                        console.log('---','pageLoad');
                        ADB.collectLifecycleData();
                        break;

                    case 'exitLink':
                    
                        options = {
                            'appVersion' : appVersion,
                            'currentState' : appSection,
                            'exitLinkURL' : data
                        };
                        console.log('---',options);
                        ADB.trackAction('exitLink', options);
                        break;

                    case 'details':

                        var segments = data.split('/');
                        
                        page = appName + ':'+ getDomain( data ) +':' + segments[4] + ':' + segments[5];
                        options = {
                            'appVersion' : appVersion,
                            'siteSection' : appName + ':'+ getDomain( data ) +':' + segments[4]
                        };

                        detailsCategory = segments[4];
                        detailSection = page;
                        detailDomain = getDomain( data );

                        console.log(page,'---', options);
                        ADB.trackState(page, options);
                        break;

                    case 'detailsOffcanvas':

                        page = detailSection + ':' + data.offcanvasTitle;
                        options = {
                            'appVersion' : appVersion,
                            'siteSection' : appName + ':'+ detailDomain +':' + detailsCategory
                        };
                        console.log(page,'---', options);
                        ADB.trackState(page, options);
                        break;

                    case 'servicesOffcanvas':

                        page = appName + ':'+ data.offcanvasHeading +':' + data.offcanvasTitle;
                        options = {
                            'appVersion' : appVersion,
                            'siteSection' : appName + ':'+ data.offcanvasHeading
                        };
                        console.log(page,'---', options);
                        ADB.trackState(page, options);
                        break;

                    case 'browse':

                        page = triggerChange ? 'browseChange' : appSection;
                        options = {
                            'appVersion' : appVersion,
                            'siteSection' : appSection
                        };
                        if ( triggerChange ){

                            data.currentState = appSection;
                        }
                        options = $.extend(options, data);
                        console.log(page,'---', options);
                        ADB.trackState(page, options);
                        break;

                    case 'search':

                        page = triggerChange ? 'searchChange' : ( appName + ':' + 'search results' );
                        options = {
                            'appVersion' : appVersion,
                            'siteSection' : appName + ': search results'
                        };
                        if ( triggerChange ){

                            data.currentState = appName + ': search results';
                        } else {

                            data.searchAction = 1;
                        }
                        options = $.extend(options, data);
                        console.log(page,'---', options);
                        ADB.trackState(page, options);
                        break;

                    case 'setAppSection':

                        var pageName = data.substring(data.lastIndexOf('/') + 1 ).replace('.html', '');

                        appSection = appName + ':' + pageName;

                        triggerChange = ( appSection === prevAppSection );
                        
                        prevAppSection = appSection;
                        console.log(appSection,'---', triggerChange);
                        break;

                    case 'footerNav':

                        var pageName = data.substring(data.lastIndexOf('/') + 1 ).replace('.html', '');

                        page = appSection + ':' + pageName;

                        options = {
                            'appVersion' : appVersion,
                            'siteSection' : appSection
                        };
                        appSection = appName + ':' + pageName;
                        console.log(page,'---', options);
                        ADB.trackState(page, options);

                        break;

                    case 'share':

                        var segments = ( data.url ).split('/');
                        page = 'shareLink';

                        options = {
                            'appVersion' : appVersion,
                            'currentState' : appName + ':'+ getDomain( data.url ) +':' + segments[4] + ':' + segments[5],
                            'shareItem' : data.title
                        };
                        console.log(page,'---', options);
                        ADB.trackAction(page, options);
                        break;

                    case 'save':

                        page = data.page;
                        options = {
                            'appVersion' : appVersion,
                            'currentState' : appName + ':mgm grand:' + data.category + ':' + data.title,
                            'saveItem' : data.title
                        };
                        console.log(page,'---', options);
                        ADB.trackAction(page, options);
                        break;

                    case 'phoneLinks':

                        page = 'phoneLink';
                        options = {
                            'appVersion' : appVersion,
                            'currentState' : appName + ':mgm grand:' + data.category + ':' + data.title,
                            'callServiceName' : data.title + ': accessible',
                            'callServiceNumber' : data.number
                        };
                        console.log(page,'---', options);
                        ADB.trackAction(page, options);
                        break;

                    }

                } catch ( e ) {

                    console.log( 'some thing is wrong' );
                }

            };
            
        };

        var analytics = new Analytics();

        return analytics;
    }
);