<?php

require_once __DIR__.'/vendor/autoload.php';
require_once __DIR__.'/testJSONGenerator.php';

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ParameterBag;

$app = new Silex\Application();

$app->before( function ( Request $request ) {

    if (0 === strpos( $request->headers->get( 'Content-Type' ), 'application/json' ) ) {

        $data = json_decode( $request->getContent(), true );

        $request->request->replace( is_array( $data ) ? $data : array() );

    }

});

// Results Grid service calls
$app->get( '/resultsGrid/', function ( Request $request ) use ( $app ) {

    // Set default filter values;
    $filter1 = $request->get( 'filter1' ) ? $request->get( 'filter1' ) : 'all';
    $filter2 = '';

    // Check from where request is originating
    if ( strpos( $_SERVER[ 'HTTP_REFERER' ], 'offersLanding' ) !== false || strpos( $_SERVER[ 'HTTP_REFERER' ], 'sitesearch' ) !== false ) {

        $dir = 'offers';

    } else if ( strpos( $_SERVER[ 'HTTP_REFERER' ], 'hotelLanding' ) !== false ) {

        $dir = 'hotel';

    } else {

        $dir = 'home';
    }


    // If home page results grid check for filter 2
    if ( $dir === 'home' ) {

        if ( !$request->get( 'filter2' ) ) {

            $filter2 = '-all';

        } else if ( $request->get( 'filter2' ) === 'date7' ) {

            echo '';

        } else {

            $filter2 = '-' . $request->get( 'filter2' );

        }

        if ( $request->get( 'filter4' ) === 'open_now' ) {
            $filter2 .= 'open_now';
        }

    }

    $file = $filter1 . $filter2 . '.json';
    
    $url = "resultsGrid/" . $dir . "/" . $file;
    
    // Check if JSON file exists
    if ( file_get_contents( $url ) == '' ) {

        // If no file then set URL to JSON with empy response list
        $url = "resultsGrid/empty-list.json";

    }

    $json = file_get_contents( $url );

    return $json;

});

// Mlife offers grid
$app->get( '/mlifeGrid/', function ( Request $request ) use ( $app ) {

    $url = 'resultsGrid/mlife/all.json';

    $json = file_get_contents( $url );
    
    return $json;
});

// Offer eligibility service call
$app->post( '/offerDetail/eligibility', function ( Request $request ) use ( $app ) {
    
    $url = "offers/example-eligibility-check.json";
    $json = file_get_contents( $url );
    
    return $json;
});

// Room booking service calls

/**
 * Calendar/Room list data
 * 'availability': off-canvas calendar
 * 'availability/rate': Rate calendar
 * 'availability/list': Room list data
 */
$app->post( '/booking/room/availability', function ( Request $request ) use ( $app ) {
    
    $url = "booking/room/example-calendar.json";
    $json = file_get_contents( $url );
    
    return $json;
});

$app->post( '/booking/room/availability/rate', function ( Request $request ) use ( $app ) {

    $promoCode = $request->get( 'promoCode' );
    $programId = $request->get( 'programId' );

    if ( $programId === '' || $programId === 'undefined' || $programId === null ) {


    }
    if ( $promoCode === '9999' ) {

        $url = 'booking/room/example-calendar-rate-offer-error.json';

    } else if ( ( $promoCode === '' || $promoCode === 'undefined' || $promoCode === null ) && ( $programId === '' || $programId === 'undefined' || $programId === null ) ) {

        $url = 'booking/room/example-calendar-rate.json';

    } else {

        $url = 'booking/room/example-calendar-rate-offer.json';

    }

    $json = file_get_contents( $url );

    return $json;

});

$app->post( '/booking/room/crossProperty', function ( Request $request ) use ( $app ) {

    $url = 'booking/room/example-room-cross-property.json';

    $json = file_get_contents( $url );

    return $json;

});

$app->post( '/booking/room/availability/list', function ( Request $request ) use ( $app ) {

    $promoCode = $request->get( 'promoCode' );
    $programId = $request->get( 'programId' );
    $numAdults = $request->get( 'numAdults' );

    if ( ( $promoCode === '' || $promoCode === 'undefined' || $promoCode === null ) && ( $programId === '' || $programId === 'undefined' || $programId === null ) ) {

        if ( $numAdults === '5' ) {

            $url = 'booking/room/example-room-list-empty.json';

        } else {

            $url = 'booking/room/example-room-list.json';

        }

    } else {

        if ( $promoCode === '9999' || $programId === 'PROGRAMID2' ) {

            $url = 'booking/room/example-room-list-offer-unavailable.json';

        } else {

            $url = 'booking/room/example-room-list-offer-upgrades.json';

        }
    }

    $json = file_get_contents( $url );

    return $json;

});

$app->get( '/booking/room/availability/detail/{roomTypeId}', function ( $roomTypeId ) use ( $app ) {

    if ( $roomTypeId === 'Q1' || $roomTypeId === 'ADAK1' ) {

        $url = "booking/room/example-room-detail-no-amenities.json";

    }
    else if ( strpos( $roomTypeId, 'ADA' ) !== false ) {

        $url = "booking/room/example-room-detail-ada.json";

    }
    else {

        $url = "booking/room/example-room-detail.json";
    }

    $json = file_get_contents( $url );

    return $json;
});

/**
 * Room offers data
 */
$app->post( '/booking/room/package/list', function ( Request $request ) use ( $app ) {

    $url = "booking/room/example-offers-list.json";
    $json = file_get_contents( $url );
    
    return $json;
});

/**
 * IATA validation
 */
$app->post( '/booking/room/validatetravelagent', function ( Request $request ) use ( $app ) {

    $validation = ( $request->get( 'agentId' ) === '0000' );

    if ( $validation == 1 ) {

        return true;

    }
    
});

/**
 * Save room information to itinerary
 */
$app->get( '/booking/room/addroom', function ( Request $request ) use ( $app ) {

    $url = "success.json";
    $json = file_get_contents( $url );
    
    return $json;
});

$app->post( '/booking/room/addroom', function ( Request $request ) use ( $app ) {

    $url = "success.json";
    $json = file_get_contents( $url );
    
    return $json;
});



/**
 * Save reservation information to itinerary
 */
$app->get( '/booking/room/saveitinerary', function ( Request $request ) use ( $app ) {

    $url = "success.json";
    $json = file_get_contents( $url );
    
    return $json;
});

/**
 * Review reservation data: GET/POST
 */
$app->get( '/booking/room/review', function () use ( $app ) {

    session_start();
    if($_SESSION['testing']) {
        
        $json = GenerateReserveJSON($_SESSION['roomcount'],$_SESSION['mlife_loggedin']);

    }
    else {

        $url = "booking/reserve/example-room-reservations.json";
    
        $json = file_get_contents( $url );
    
    }

    
    return $json;
});

$app->get( '/booking/all/review', function () use ( $app ) {

    session_start();

    if($_SESSION['testing']) {
        
        $json = GenerateReserveJSON($_SESSION['roomcount'],$_SESSION['mlife_loggedin']);

    }
    else {
        $url = "booking/reserve/bookall-reservations.json";
    
        $json = file_get_contents( $url );
    
    }    
    return $json;
});

$app->get( '/booking/all/continueAsGuest', function () use ( $app ) {

    session_start();
    if($_SESSION['testing']) {
        
        $json = GenerateReserveJSON($_SESSION['roomcount'], false);

    }
    else {

        $url = "booking/reserve/bookall-reservations.json";
    
        $json = file_get_contents( $url );
    
    }

    
    return $json;
});

$app->get( '/booking/all/extendSession', function () use ( $app ) {

    return "";
});

$app->post( '/booking/ticketing/requestMoreTime', function () use ( $app ) {

    return "";
});

$app->post( '/booking/all/sendComponents', function () use ( $app ) {

    $url = "booking/reserve/bookall-reservations.json";
    $json = file_get_contents( $url );

    return $json;
});



$app->post( '/booking/all/review', function () use ( $app ) {

    return "";
});


$app->post( '/booking/room/review', function ( Request $request ) use ( $app ) {

    $url = "success.json";
    $json = file_get_contents( $url );
    
    return $json;
});

$app->post( '/booking/all/reserve', function ( Request $request ) use ( $app ) {

    $url = "success.json";
    $json = file_get_contents( $url );
    
    return $json;
});


/**
 * Confirm room booking
 */
$app->post( '/booking/room/reserve', function ( Request $request ) use ( $app ) {

    $url = "success.json";
    $json = file_get_contents( $url );
    
    return $json;
});

/**
 * Remove selected room
 */
$app->post( '/booking/room/remove', function ( Request $request ) use ( $app ) {

    session_start();
    if($_SESSION['testing']) {
        switch($_SESSION['roomcount']){
            case 1: case 2:default: 
                
                $_SESSION['roomcount']--;

            break;

            case 0: 
                $_SESSION['roomcount'] = 0;
                break;

        }
    }

    $url = "success.json";
    $json = file_get_contents( $url );
    
    return $json;
});

/**
 * Hold tickets
 */
$app->post( '/booking/ticketing/hold', function ( Request $request ) use ( $app ) {

    //updated showEvent ID for KA
    if ( $request->get( 'showEventId' ) === '51b9c887-a2c1-4dc6-a402-f9b3ba6e019b' ) {

        $url = "booking/ticketing/example-hold-tickets-ka.json";

    } else {

        $url = "booking/ticketing/example-hold-tickets.json";
        
    }

    $json = file_get_contents( $url );
    
    return $json;
});

/**
 * Remove ticket
 */
$app->post( '/booking/ticketing/remove', function ( Request $request ) use ( $app ) {

    $url = "success.json";
    $json = file_get_contents( $url );
    
    return $json;
});
$app->post( '/booking/ticketing/release', function ( Request $request ) use ( $app ) {

    $url = "success.json";
    $json = file_get_contents( $url );
    
    return $json;
});


/**
 * User login authentication: email/password
 */
$app->post( '/booking/all/login', function ( Request $request ) use ( $app ) {

    $validation = ( $request->get( 'password' ) !== '0000' );

    if(!$validation){
        $message = '{"response":{"errorMessage":"Incorrect Email or Password"}}';
        return new Response( $message , 409 );
    }else {

        session_start();
        if($_SESSION['testing']) {
        
            $_SESSION['mlife_loggedin'] = true;

        }
        $url = "booking/reserve/example-login-service.json";
        $json = file_get_contents( $url );
        


        return $json;
    }
});

/**
 * Book Room service call
 */
$app->post( '/booking/room/price', function ( Request $request ) use ( $app ) {

    $roomType = $request->get( 'selectedRoomTypeId' );

    if ( $roomType === 'Q1' ) {

        $app->abort( 404 );

        return false;

    }

    session_start();

    if ( $_SESSION[ 'testing' ] ) {
        switch( $_SESSION[ 'roomcount' ] ) {
            case 0: case 1: default: 
                
                $_SESSION[ 'roomcount' ]++;

            break;

            case 9:

                $_SESSION[ 'roomcount' ] = 9;
                
                break;

        }
    }

    return true;
});

/**
 * Booking widget submit  -- @FLAG : What is this used for?
 */
$app->post( '/booking/room/tripdetails', function ( Request $request ) use ( $app ) {

    $url = "success.json";
    $json = file_get_contents( $url );
    
    return $json;
});

/**
 * Dining/restaurant reservation data: GET/POST
 */
$app->get( '/dining/restaurant/getAvailability', function () use ( $app ) {

    $url = "dining/restaurant/DineAvailability.json";
    $json = file_get_contents( $url );

    return $json;
});
$app->post( '/dining/restaurant/getAvailability', function ( Request $request ) use ( $app ) {
    
    $validation = ( $request->get( 'email' ) !== 'email@mgm.com' );

    if ( !$validation ) {
      
        $message = '{"messages":{"type":"error","code":"_invalid_credentials"}}';
        return new Response( $message , 409 );
        
    }
    else {

        if ( $request->get( 'availabilityDate' ) === "8/1/2015" ) {

            $message = '{"messages":[{"type":"error","code":"_dining_availability_failed","msg":"_dining_availability_failed"}]}';
            return new Response( $message , 409 );
        }

        $url = "dining/restaurant/DineAvailability.json";
        $json = file_get_contents( $url );
        
        return $json;
    }
});
/**
 * Dining/restaurant schedule: GET
 */
$app->get( '/dining/restaurant/getSchedule', function () use ( $app ) {

    $url = "dining/restaurant/Restaurant_OperatingHours.json";
    $json = file_get_contents( $url );

    return $json;
});
/**
 * Dining/restaurant reservation data: GET/POST
 */

$app->post( '/dining/restaurant/calendar', function ( Request $request ) use ( $app ) {

    $url = "dining/restaurant/calendar.json";
    $json = file_get_contents( $url );

    return $json;
});

/**
 * Ticketing: show list
 */
$app->post( '/booking/ticketing/availability/list', function ( Request $request ) use ( $app ) {

    $promoCode = $request->get( 'promoCode' );
    $programId = $request->get( 'programId' );
    $checkInDate = $request->get( 'checkInDate' );
    $checkOutDate = $request->get( 'checkOutDate' );

    if ( $promoCode === '9999' ) {

        $app->abort( 404 );

    } else {
        
        if ( ( $promoCode === '' || $promoCode === 'undefined' || $promoCode === null ) && ( $programId === '' || $programId === 'undefined' || $programId === null ) ) {

            if ( $checkInDate === '07/01/2014' && $checkOutDate === '07/02/2014' ) {
                
                $url = 'booking/ticketing/example-show-list-empty.json';

            } else {

                $url = 'booking/ticketing/example-show-list.json';

            }

        } else if ($promoCode === 'BOGO'){

            $url = 'booking/ticketing/example-show-list-multiple-offer.json'; 

        } else {

            $url = 'booking/ticketing/example-show-list-offer.json';

        }
    }

    $json = file_get_contents( $url );

    return $json;
});

/**
 * Ticketing: show offers
 */
$app->post( '/booking/ticketing/package/list', function ( Request $request ) use ( $app ) {

    $url = "booking/ticketing/example-show-offers.json";
    $json = file_get_contents( $url );

    return $json;
});

/**
 * Ticketing: calendar
 */
$app->post( '/booking/ticketing/availability', function ( Request $request ) use ( $app ) {

    $url = "booking/ticketing/example-calendar.json";
    $json = file_get_contents( $url );

    return $json;
});

/**
 * Ticketing: save to itinerary
 */
$app->post( '/booking/ticketing/itinerary', function ( Request $request ) use ( $app ) {

    return true;

});

/**
 * Ticketing: show detail
 */
$app->get( '/booking/ticketing/detail/{showId}', function ( $showId ) use ( $app ) {

    $url = "booking/ticketing/example-show-detail-" . $showId . ".json";
    $json = file_get_contents( $url );

    return $json;
});

/**
 * Ticketing: buy tickets
 */
$app->post( '/booking/ticketing/buy', function ( Request $request ) use ( $app ) {

    return true;

});

/**
 * Ticketing: more time needed (Yes clicked on More Time modal)
 */
$app->post( '/booking/ticketing/requestTime', function ( Request $request ) use ( $app ) {

    return true;

});

/**
 * Ticketing: seatmap
 */
$app->post( '/booking/ticketing/seatmap', function ( Request $request ) use ( $app ) {
    //-"+$request.venueId+"
    //udpated condition check (based on showId)
    $showId = $request->get( 'showId' );
    if( $showId == 'copperfield') {
        $showId = "hollywood";   
    }
    if( $showId == 'garrett'){
        $showId = "beacher";
    }
    $url = "booking/ticketing/map-availability-" . $showId . "Id.json";
    $json = file_get_contents( $url );
    return $json;
});

/**
 * Entertainment: ticket availability
 */
$app->get( 'tickets/availability/{propertyId}', function ( $propertyId  ) use ( $app ) {

    $url = "entertainment/example-show-availability.json";
    $json = file_get_contents( $url );

    return $json;
});

/**
 * Entertainment: buy tickets
 */
$app->get( 'tickets/buy/{propertyId}/{showId}', function ( $propertyId  ) use ( $app ) {

    $url = "entertainment/example-buy-tickets.json";
    $json = file_get_contents( $url );

    return $json;
});

/**
 * Book All Flow Testing
 */

/**
 * Reset/Start Session: GET
 */
$app->get( '/session_start', function () use ( $app ) {

    session_start();
    session_unset();

    $_SESSION['testing'] = true;
    $_SESSION['roomcount'] = 0;
    $_SESSION['mlife_loggedin'] = false;
    
    return 'session started';
});

$app->get( '/print_session', function () use ( $app ) {

    // session_start();
    if($_SESSION['roomcount']){
        echo 'SESSION STARTERD';
    }
    var_dump($_SESSION);

    
    return 'session started';
});

$app->get( '/login_mlife', function () use ( $app ) {

    session_start();

    $_SESSION['mlife_loggedin'] = true;
    
    return 'session started';
});

$app->run();

?>