/**
 *
 * @name pubsub
 */
 define(

    [
        'jquery'
    ],

    function(
        $
    ) {

        var topics = {};

        /**
         * Create/retrieve pubsub instance around channel ID.
         *
         * Usage:
         *
         *      var myFunc = function( msg ) { // do something with msg };
         *
         *      pubsub( 'some/topic' ).subscribe( myFunc );
         *      pubsub( 'some/topic' ).publish( msg );
         *      pubsub( 'some/topic' ).unsubscribe( myFunc );
         *
         *      // OR
         *
         *      var myTopic = pubsub( 'some/topic' )
         *          , myFunc = function( msg ) { // do something with msg }
         *          ;
         *
         *      myTopic.subscribe( myFunc );
         *      myTopic.publish( msg );
         *      myTopic.unsubscribe( myFunc );
         *
         *
         * @function pubsub
         * @param {string} id Pubsub instance ID.
         * @return {object} pubsub API for current instance with ID `id`.
         */
        return function(id) {

            var callbacks, topic;

            if (id.length) {

                topic = topics[id];
            }

            if (!topic && !topics.hasOwnProperty(topic)) {

                

                callbacks = $.Callbacks();

                topic = {

                    /**
                     * Publish to the current channel.
                     *
                     * @method publish
                     * @param {mixed} arg1...[argN] Any number of arguments to pass to the callback.
                     * @returns {void}
                     */
                    publish: callbacks.fire,

                    /**
                     * Subscribe a callback function to the current channel.
                     *
                     * @method subscribe
                     
                     * @returns {void}
                     */
                    subscribe: callbacks.add,

                    /**
                     * Unsubscribe a callback from the current channel.
                     *
                     * @method unsubscribe
                     
                     * @returns {void}
                     */
                    unsubscribe: callbacks.remove,

                    emptyAll: callbacks.empty

                };

                if (id) {
                    topics[id] = topic;
                }
            }

            return topic;
        };
    }
);
