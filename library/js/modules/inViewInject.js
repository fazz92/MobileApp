/*
 *strip header and footer in in-view pages
 */

var header = document.querySelector('.sticky-wrap'),
    footer = document.querySelector('footer'),
    html = document.querySelector( 'html' );

if(html) {
    html.classList.add('app-view');
}
if(header) {
    header.style.display = 'none';
} else {
    console.log('Header not found');
}
if(footer) {
    footer.style.display = 'none';
} else {
    console.log('Footer not found');
}

var cookies = {
    get: function (key) {
        if (!key) {
            return null;
        }
        return decodeURIComponent(document.cookie.replace(new RegExp('(?:(?:^|.*;)\\s*' + encodeURIComponent(key).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1')) || '';
    }
};

var _appBookingUrlPart = "",
    _appItineraryUrlPart = "",
    pathSplit = window.location.pathname.split('/'),
    mgmAuthCookie = "";

/*
 * Show mLife login pop up if cookie is not available
 */
function showModal(){
    if( $('body').find('.app-loginPopUp').length > 0){

        $('.curtain-container').addClass('app-show-popup');
        $('.app-loginPopUp').show();
    }

    $('.app-loginPopUp').find('.close-modal').on('click', function(e) {
        e.preventDefault();
        $('.curtain-container').removeClass('app-show-popup');
        $('body').find('.app-loginPopUp').remove();
    });

    $('.app-loginPopUp').find('.mLife-signIn').on('click', function(e){
        e.preventDefault();
        window.location = $(this).find('a').attr('href');
        return false;
    });
}

if(window.location.hash.split('&')[0]){
    _appBookingUrlPart = window.location.hash.split('&')[0].substring(2)
}

if(pathSplit){
    _appItineraryUrlPart = pathSplit.indexOf("itineraries.html");
}

/**
 * Display Mlife sign in modal if user is not logged in.
 */
if( _appBookingUrlPart === "step1" || _appBookingUrlPart === "step2" || _appItineraryUrlPart > -1) {

    mgmAuthCookie = cookies.get('mgm_auth_user');
    if(!mgmAuthCookie){
        sessionStorage.setItem('post_signin_redirect', window.location.href);
        showModal();
    }
}

/**
 * Remove Learn more cta from Sign in page
 */
if($('#promo-mlife-learn')) {
    $('#promo-mlife-learn').remove();
}
