/**
 * Created by aaga36 on 11/6/2015.
 */

var chai = require('chai');
var expect = chai.expect;

console.log(expect);
define(['node_modules/chai/chai', 'MyModule'], function(chai, MyModule) {

    var expect = chai.expect
        , foo = 'bar';
    console.log('came here');
    expect.typeOf(foo, 'string', 'foo is a string');
});


