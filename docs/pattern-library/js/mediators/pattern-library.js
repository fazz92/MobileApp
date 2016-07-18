define(

    [
        'jquery',
        '../modules/picturefill',
        '../vendor/jquery.validate.amd'
    ],

    function(

        $,
        picturefill,
        validate

    ) {

        var mediator = {

            init: function() {
                
                $( $.proxy( this, 'initUI' ) );
            },

            initUI: function() {
                
                picturefill();
                $( '#form-one' ).validate();
                
            }
        };

        mediator.init();
    }
);