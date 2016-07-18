/**
 * Created by shardul on 1/18/15.
 */
(function () {
    'use strict';



    describe('homeController Spec', function () {

        var expect = chai.expect,
            foo = 'bar';
        expect(foo).to.be.a('string');

        var scope, $controllerConstructor, mockgetUser;
        beforeEach(module('DS'));
        beforeEach(inject(function ($controller, $rootScope) {
            console.log('before each');
            scope = $rootScope.$new();
            mockgetUser = sinon.stub({
                getUser: function () {}
            });

            $controllerConstructor = $controller;
        }));
        it('controller spec 1', function () {
            console.log('it');
            var mockUser = {
                avatar_url: "https://avatars.githubusercontent.com/u/5981515?v=3",
                name: "Shardul Ghanti"
            };
            mockgetUser.getUser.returns(mockUser);
            $controllerConstructor("homeController", {
                $scope: scope,
                github: mockgetUser
            });
            //expect(scope.user1).toEqual(mockUser); // jasmine
            expect(scope.user1).to.deep.equal(mockUser); //mocha with chai
        });
    });
}());