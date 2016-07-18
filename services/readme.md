# About Services

This is the development services directory.  To add a service for testing add a route to the `index.php` file:

##### Example

    $app->get( '/SUB-DIRECTORY/{VARIABLE}', function ( $variable ) use ( $app ) {
        // $variable is available
        // Return service data
    });


##### Results Grid example

    // Results Grid service calls
    $app->get( '/resultsGrid/{name}', function ( $name ) use ( $app ) {
        $url = "resultsGrid/" . $name . ".json";
        $json = file_get_contents( $url );

        return $json;
    });

To return the "all.json" file in the above example the service call would be "services/resultsGrid/all".  The 'services' directory is in the root of the project.

- `/resultsGrid/` is the SUB-DIRECTORY in the services app
- `{name}` is the filename variable. You can add as many as you want: (e.g.)
 - code: `/resultsGrid/{name}/{type}/{year}`
 - path: "/resultsGrid/all/event/2014"

##### GET/POST

If you need to POST data to a service use the `$app->post()` command instead of `$app->get()`

***Example:***

 // Post data to Room Availability service
    $app->post( '/bookingRoom/availability', function () use ( $app ) {
        $url = "bookingRoom/allData.json";
        $json = file_get_contents( $url );

        return $json;
    });

### Directory Structure

 │ site root
 ├── services
 │   ├── .htaccess   │   ├── composer.json   │   ├── composer.lock   │   ├── index.php   │   ├── readme.md
 │   ├── resultsGrid  <--- THIS IS THE MODULE SPECIFIC SERVICE
 │   │   ├── all.json
 │   │   ├── eventdate.json   │   │   ├── entertainment.json
 │   │   └── promo.json
 │   ├── vendor