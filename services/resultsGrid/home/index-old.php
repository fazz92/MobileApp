<?php

    $filter1 =  ( empty( $_REQUEST[ 'filter1' ] ) ) ? 'all' : $_GET[ 'filter1' ];

    if ( empty( $_REQUEST[ 'filter2' ] ) ) {
        $filter2 = 'all';
    } else if ( $_REQUEST[ 'filter2' ] === 'date7' ) {
        echo '';
    } else {
        $filter2 = $_GET[ 'filter2' ];
    }

    $url = $filter1 . '-' . $filter2 . '.json';

    $json = file_get_contents( $url );

    echo $json;

?>