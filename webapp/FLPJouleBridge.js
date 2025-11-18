sap.ui.define(["sap/ui/base/Object", "sap/base/Log"], function (BaseObject, Log) {
    "use strict";

    const messageConstants = {
        getFrontendActionsMessage: 'getFrontendActions',
        executeFrontendActionMessage: 'executeFrontendAction',
    };

    const isToBeUsed = function () {
        // synchronously find out if we are running in FLP (works also in iframe)
        const Container = sap.ushell?.Container /* needed until UI5 1.119 */ || sap.ui.require("sap/ushell/Container" /* single string argument checks whether loaded */);
        return Container !== undefined;
    };

    const FLPJouleBridge = BaseObject.extend("test.my.frontend.actions.FLPJouleBridge", {

        constructor: function (id) {
            BaseObject.apply(this, arguments);
            if (!isToBeUsed() ) {
                throw new Error("FLPJouleBridge can only be used in FLP environment - only when FLPJouleBridge.isToBeUsed() returns true");
            }
            this.id = id || `FLPJouleBridge_${Math.random().toString(36).substring(2, 15)}`;
            this._messageBrokerPromise = this._getMessageBrokerPromise(); // promise for the message broker
            this._jouleCallbacks = null;
        },

        setBridgeCallback: async function (jouleCallbacks) {
            if (this._jouleCallbacks) {
                throw new Error("Bridge callback already set - can only be set once per instance");
            }
            this._jouleCallbacks = jouleCallbacks;
        },

        /**
         * Callback invoked for every message received from the message broker.
         * Filters for Joule's web client ID and the frontend actions channel.
         *
         * Behavior:
         *  - When messageName is "getFrontendActions", invokes the corresponding callback,
         *    retrieves available frontend actions, and publishes a "getFrontendActionsResponse"
         *    message back to the Joule web client with the list of action names.
         *  - When messageName is "executeFrontendAction", finds and executes the requested
         *    frontend action by name, then publishes an "executeFrontendActionResponse" message
         *    with the action result (or an error if the action was not found).
         *
         * @private
         * @param {string} clientId - Identifier of the client associated with the request/response cycle.
         * @param {string} channelId - Message broker channel on which the message was received.
         * @param {string} messageName - Symbolic name/type of the received message.
         * @param {*} messageData - Arbitrary payload carried by the message (structure depends on message type).
         * @returns {void}
         */
        async _messageBrokerMessageCallback(clientId, channelId, messageName, messageData) {
            const OwnClientID = this.id;
            const JouleWebClientID = 'jouleWebClient';
            const FrontendActionsChannelID = 'com.sap.joule.flp.frontendactions';
            const messageBroker = await this._getMessageBrokerPromise();
            

            if (clientId !== JouleWebClientID) {
                return;
            }
            if (channelId !== FrontendActionsChannelID) {
                return;
            }

            if (messageName === 'getFrontendActions') {
                const frontendActions = this._jouleCallbacks?.getFrontendActions?.(); // can be async - webclient waits 500ms for responses 
                if (frontendActions) {
                    // allow for async getFrontendActions functions
                    if (frontendActions instanceof Promise) {
                        frontendActions = await frontendActions;
                    }
                    // store for potential calls later
                    this.frontendActions = frontendActions;
                    // send list to webclient
                    messageBroker.publish(
                        FrontendActionsChannelID,
                        OwnClientID,
                        '',
                        'getFrontendActionsResponse',
                        [JouleWebClientID],
                        {
                            correlationId: messageData.correlationId,
                            // because of serialization, send only a string array with the action names
                            availableFrontendActions: frontendActions.map(fa => fa.frontend_action_name)
                        }
                    )
                }
            }

            if (messageName === 'executeFrontendAction') {
                // find requested action
                const frontendAction = this.frontendActions?.find(fa => fa.frontend_action_name === messageData.frontendActionName);

                // execute action if found
                if (frontendAction) {
                    let actionResult = frontendAction.function(messageData.payload);
                    // allow for async functions
                    if (actionResult instanceof Promise) {
                        actionResult = await actionResult;
                    }
                    // send result to webclient
                    messageBroker.publish(

                        FrontendActionsChannelID,
                        OwnClientID,
                        '',
                        'executeFrontendActionResponse',
                        [JouleWebClientID],
                        {
                            correlationId: messageData.correlationId,
                            payload: actionResult
                        }
                    );
                } else {
                    // action not found - send failure response
                    messageBroker.publish(
                        FrontendActionsChannelID,
                        OwnClientID,
                        '',
                        'executeFrontendActionResponse',
                        [JouleWebClientID],
                        {
                            correlationId: messageData.correlationId,
                            payload: {
                                success: false,
                                error: `Frontend action '${messageData.frontendActionName}' not found`
                            }
                        }
                    );
                }
            }
        },

        /**
         * Obtains and caches a promise resolving with a connected SAP Fiori Launchpad MessageBroker service instance.
         *
         * Behavior:
         * 1. If a broker instance promise is already cached in this._messageBrokerPromise, returns it directly.
         * 2. Otherwise:
         *    - Retrieves the MessageBroker service via Container.getServiceAsync('MessageBroker')
         *      and initially stores the Promise in this._messageBrokerPromise.
         *    - Waits for the Promise to resolve to get the MessageBroker instance.
         *    - Connects to the broker using this.id as the client ID.
         *    - Subscribes to three predefined channels: events, message, and frontendactions.
         *
         * @private
         * @returns {Promise<object>} A Promise resolving with the connected MessageBroker service object.
         */
        _getMessageBrokerPromise: async function () {
            // return stored promise if available
            if (this._messageBrokerPromise) {
                return this._messageBrokerPromise;
            }

            // get and store promise
            const Container = sap.ushell?.Container /* needed until UI5 1.119 */ || sap.ui.require("sap/ushell/Container" /* single string argument checks whether loaded */);
            this._messageBrokerPromise = Container.getServiceAsync('MessageBroker');

            // wait for the broker to be available to initialize it
            const messageBroker = await this._messageBrokerPromise;

            // connect to the message broker
            const clientConnectionCallback = (messageName, clientId, subscribedChannels) => {};
            await messageBroker.connect(this.id, clientConnectionCallback);

            // subscribe to relevant channels
            const messageBrokerChannels = [{
                channelId: 'com.sap.joule.flp.events',
                version: '1.0'
            }, {
                channelId: 'com.sap.joule.flp.message',
                version: '1.0'
            }, {
                channelId: 'com.sap.joule.flp.frontendactions',
                version: '1.0'
            }];
            await messageBroker.subscribe(this.id, messageBrokerChannels, this._messageBrokerMessageCallback.bind(this));
        }
    });

    FLPJouleBridge.isToBeUsed = isToBeUsed;
    
    return FLPJouleBridge;
});
