define(
    [
        'vendor/angular-custom'
    ],

    function(

        angular

    ) {

        'use strict';

        return angular.module( 'Compile.directive',[])
        .directive( 'bindContent',

            function( $compile, $parse ) {

                return {

                    restrict: 'A',

                    link: function( scope, element, attr ) {

                        scope.$watch(attr.bindContent, function() {
                            element.html($parse(attr.bindContent)(scope));
                            $compile(element.contents())(scope);
                        }, true);
                    }
                };
            }
        );
    }
);