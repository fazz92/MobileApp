<!--#include virtual="pageComponents/baseLayoutPage/document-header.html" -->

  <!-- Begin Global Styles -->
  <link rel="stylesheet" href="../library/css/mgmGrand/global/index.css">
  <link rel="stylesheet" href="../library/css/mgmGrand/global/icons/svg.css">
  <link rel="stylesheet" href="../library/css/mgmGrand/global/icons/logo.css">
  <!-- END Global Styles -->

    <style type="text/css">
        body {
          background:#f2f2f2;
          width:100%;
        }
        .wrapper {
          box-sizing:border-box;
          margin-bottom: 25px;
        }
        a:hover {
          color:#bda770;
        }
        h1 {
          margin-bottom:30px;
        }
        h2, h3 {
          color:#999;
          margin-bottom:10px;
        }
        h1 a,
        h2 a,
        h3 a {
          color:#999;
          text-decoration:none;
        }
        .wrapper > li,
        .wrapper > ul > li {
          margin-bottom:25px;
        }
        ul {
          padding-left: 0;
        }
        li {
          margin-bottom:5px;
          list-style: none;
        }
        li a {
          color: black;
          padding:10px;
          display:block;
          background:white;
          border-radius:5px;
          letter-spacing:1px;
          text-decoration:none;
          font-family:'HelveticaNeueW02-LtExt';
          box-shadow:1px 1px 2px 0px rgba(0, 0, 0, 0.15);
        }
        ul li a,
        ul li li {
          margin-bottom: 5px;
        }
        ul li li a {
          color:#999;
        }
        ul ul li a {
          padding-left: 25;
        }
        ul ul li a::before {
          content: '\2022   ';
        }
    </style>
</head>
<body>
<div class="wrapper section-wrapper">

  <h1><a class="heading" href=".">MGM Docs Index</a></h1>

  <ul>
    
    <?php
    //-- Directory Navigation with SCANDIR
    //-- 
    //-- Based off of: http://php.net/manual/en/function.scandir.php#109115
    //-- 
    //-- optional placement
    $exclude_list = array( ".", "..", "example.txt", "index.php", "template.html" );
    $subdir = "false";
    $docsPath = $_SERVER[ "DOCUMENT_ROOT" ] . "/docs/";

    if ( isset( $_GET[ "dir" ] ) ) {

      $subdir = "true";
      $dir_path = $docsPath . $_GET[ "dir" ];

    } else {

      $dir_path = $docsPath;

    }
    //-- until here
    function dir_nav( $subdir ) {
      
      global $exclude_list, $dir_path;

      $directories = array_diff( scandir( $dir_path ), $exclude_list );


      // if ( $subdir == "true" ) {

      //   echo "<li><a href='../'>..</a></li>";

      // }

      // echo "<ul style='list-style:none;padding:0'>";
      foreach( $directories as $entry ) {

        if( is_dir( $dir_path . $entry ) && $entry[ 0 ] !== '.' ) {

          echo "<li><a href='" . $_GET[ "dir" ] . $entry . "/" . "'>" . $entry . "</a></li>";

        }

      }
      
      foreach( $directories as $entry ) {

        if( is_file( $dir_path . $entry ) && $entry[ 0 ] !== '.' ) {

          echo "<li><a href='" . $_GET[ "dir" ] . $entry . "'>" . $entry . "</a></li>";

        }
      }
      
    }

    dir_nav( $subdir );
    //-- optional placement
    // if ( isset( $_GET[ "file" ] ) ) {

    //   echo "<div style='margin:1em;border:1px solid Silver;'>";

    //   highlight_file( $dir_path . $_GET[ "file" ] );
    //   // echo $dir_path . $_GET[ "file" ];

    //   echo "</div>";

    // }
    //-- until here
    //--
    //-- Because I love php.net
    ?>
    
  </ul>

</div>

<script>
  <!--#include virtual="../library/js/vendor/font-tracking.js" -->
</script>
<script src="../library/js/vendor/Modernizr.js"></script>

</body>
</html>