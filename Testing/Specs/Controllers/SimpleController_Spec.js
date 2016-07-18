/**
 * Created by shardul on 1/18/15.
 */
(function(){
    'use strict';

    describe('SimpleController_Spec',function(){
        var scope, $controllerConstructor;
        beforeEach(module('DS'));

        beforeEach(inject(function($controller,$rootScope){
            scope = $rootScope.$new();
            $controllerConstructor = $controller;

        }));

        it('controller spec 1',function(){
            var mockBook = {title:'Programming in C',author:'Dennis'};
            $controllerConstructor("simpleController",{$scope:scope});
            //expect(scope.book).toEqual(mockBook); // jasmine
            expect(scope.book).to.deep.equal(mockBook); //mocha with chai
        });
    });
}());
