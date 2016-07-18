<?php 
    
    function GenerateReserveJSON($roomCount, $mlifeLoggedIn = false) {

        $JSONResponse = '{"response":{';

        $JSONResponse .= file_get_contents( 'booking/reserve/testing/roomDefault.txt' );
        
        if($mlifeLoggedIn) {
            
            $JSONResponse .= file_get_contents( 'booking/reserve/testing/mlifeLoggedIn.txt' );

        }

        $JSONResponse .= '"totalReservationAmount": ' . 380* $roomCount . ',';

        $JSONResponse .= '"roomReservations": [';
        switch ( $roomCount ) {
            case 0:
  
            break;
            case 1:
            
                $JSONResponse .= file_get_contents( 'booking/reserve/testing/room1.json' );

            break;
            default: case 2:

                $JSONResponse .= file_get_contents( 'booking/reserve/testing/room1.json' ) . ',';
                $JSONResponse .= file_get_contents( 'booking/reserve/testing/room2.json' );

            break;
            case 7:
            
                $JSONResponse .= file_get_contents( 'booking/reserve/testing/room3-9.json' );

            break;
            case 8:
            
                $JSONResponse .= file_get_contents( 'booking/reserve/testing/room2.json' ) . ',';
                $JSONResponse .= file_get_contents( 'booking/reserve/testing/room2.json' ) . ',';
                $JSONResponse .= file_get_contents( 'booking/reserve/testing/room3-9.json' );

            break;
            case 9:
            
                $JSONResponse .= file_get_contents( 'booking/reserve/testing/room1.json' ) . ',';
                $JSONResponse .= file_get_contents( 'booking/reserve/testing/room2.json' ) . ',';
                $JSONResponse .= file_get_contents( 'booking/reserve/testing/room3.json' ) . ',';
                $JSONResponse .= file_get_contents( 'booking/reserve/testing/room3-9.json' );

            break;

        }

        $JSONResponse .= "]}}";

        return $JSONResponse;
    }
?>