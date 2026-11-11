sap.ui.define(["sap/ui/base/Object"], function (BaseObject) {
    "use strict";

    var messageBrokerChannels = [{
        channelId: "com.sap.joule.flp.events",
        version: "1.0"
    }, {
        channelId: "com.sap.joule.flp.message",
        version: "1.0"
    }, {
        channelId: "com.sap.joule.flp.frontendactions",
        version: "1.0"
    }];

    /**
     * Helper class that encapsulates communication with the Joule web client
     * in both FLP and standalone environments.
     *
     * Use this when JouleConnector (SAPUI5 1.151+) is not available.
     * It provides a single unified API for registering frontend actions,
     * abstracting the differences between the FLP MessageBroker path and
     * the standalone webclient registration path.
     *
     * @class
     * @public
     * @extends sap.ui.base.Object
     */
    var JouleWebclientHelper = BaseObject.extend("test.my.frontend.actions.JouleWebclientHelper", {

        /**
         * Constructor.
         *
         * @param {string} sClientId - Unique client ID for this app's Joule registration
         */
        constructor: function (sClientId) {
            BaseObject.apply(this, arguments);
            this._clientId = sClientId;
            this._isFLP = JouleWebclientHelper.isFLPEnvironment();
            this._frontendActions = null;
            this._fnGetActions = null;
            this._messageBrokerPromise = null;
        },

        /**
         * Registers a callback that returns the available frontend actions.
         * The callback is invoked by Joule for each user prompt.
         *
         * @param {function} fnGetActions - Function returning an array of {frontend_action_name, function} objects
         */
        registerActions: function (fnGetActions) {
            if (this._fnGetActions) {
                throw new Error("Actions already registered — can only be set once per instance");
            }
            this._fnGetActions = fnGetActions;

            if (this._isFLP) {
                this._connectViaMessageBroker();
            } else {
                this._connectStandalone();
            }
        },

        /**
         * Disconnects from Joule and cleans up all resources.
         * Call this in your controller's onExit().
         *
         * @returns {Promise<void>}
         */
        disconnect: async function () {
            if (this._isFLP) {
                await this._disconnectMessageBroker();
            } else {
                this._disconnectStandalone();
            }
            this._fnGetActions = null;
            this._frontendActions = null;
        },


        // ==================== FLP path ====================

        _connectViaMessageBroker: function () {
            this._messageBrokerPromise = this._initMessageBroker();
        },

        _initMessageBroker: async function () {
            var Container = sap.ushell && sap.ushell.Container || sap.ui.require("sap/ushell/Container");
            var messageBroker = await Container.getServiceAsync("MessageBroker");

            await messageBroker.connect(this._clientId, function () {});
            await messageBroker.subscribe(
                this._clientId,
                messageBrokerChannels,
                this._onMessageBrokerMessage.bind(this)
            );

            return messageBroker;
        },

        _onMessageBrokerMessage: async function (clientId, channelId, messageName, messageData) {
            var JouleWebClientID = "jouleWebClient";
            var FrontendActionsChannelID = "com.sap.joule.flp.frontendactions";

            if (clientId !== JouleWebClientID || channelId !== FrontendActionsChannelID) {
                return;
            }

            var messageBroker = await this._messageBrokerPromise;

            if (messageName === "getFrontendActions") {
                var frontendActions = this._fnGetActions ? this._fnGetActions() : [];
                // allow for async getFrontendActions functions
                if (frontendActions instanceof Promise) {
                    frontendActions = await frontendActions;
                }
                this._frontendActions = frontendActions;

                messageBroker.publish(
                    FrontendActionsChannelID,
                    this._clientId,
                    "",
                    "getFrontendActionsResponse",
                    [JouleWebClientID],
                    {
                        correlationId: messageData.correlationId,
                        availableFrontendActions: frontendActions.map(function (fa) {
                            return fa.frontend_action_name;
                        })
                    }
                );
            }

            if (messageName === "executeFrontendAction") {
                var frontendAction = this._frontendActions && this._frontendActions.find(function (fa) {
                    return fa.frontend_action_name === messageData.frontendActionName;
                });

                var payload;
                if (frontendAction) {
                    var actionResult = frontendAction.function(messageData.payload);
                    if (actionResult instanceof Promise) {
                        actionResult = await actionResult;
                    }
                    payload = { correlationId: messageData.correlationId, payload: actionResult };
                } else {
                    payload = {
                        correlationId: messageData.correlationId,
                        payload: {
                            success: false,
                            error: "Frontend action '" + messageData.frontendActionName + "' not found"
                        }
                    };
                }

                messageBroker.publish(
                    FrontendActionsChannelID,
                    this._clientId,
                    "",
                    "executeFrontendActionResponse",
                    [JouleWebClientID],
                    payload
                );
            }
        },

        _disconnectMessageBroker: async function () {
            if (this._messageBrokerPromise) {
                var messageBroker = await this._messageBrokerPromise;
                await messageBroker.unsubscribe(this._clientId, messageBrokerChannels);
                await messageBroker.disconnect(this._clientId);
                this._messageBrokerPromise = null;
            }
        },


        // ==================== Standalone path ====================

        _connectStandalone: function () {
            var that = this;

            // Build the callbacks object expected by the Joule webclient
            var jouleCallbacks = {
                getFrontendActions: function (_jouleContext) {
                    return that._fnGetActions ? that._fnGetActions(_jouleContext) : [];
                }
            };

            // either connect to Joule directly or pre-register for when it loads
            if (window.sap && window.sap.das && window.sap.das.webclient &&
                window.sap.das.webclient.registerBridgeCallbacks) {
                window.sap.das.webclient.registerBridgeCallbacks(this._clientId, jouleCallbacks);
            } else {
                window.sapdas = window.sapdas || {};
                window.sapdas.webclientPreregistration = window.sapdas.webclientPreregistration || {};
                window.sapdas.webclientPreregistration[this._clientId] = {callbacks: jouleCallbacks};
            }
        },

        _disconnectStandalone: function () {
            if (window.sap && window.sap.das && window.sap.das.webclient) {
                // support both API naming variants
                var api = window.sap.das.webclient;
                if (api.deregisterBridgeCallback) {
                    api.deregisterBridgeCallback(this._clientId);
                } else if (api.unregisterBridgeCallbacks) {
                    api.unregisterBridgeCallbacks(this._clientId);
                }
            }
            // also clean up pre-registration
            if (window.sapdas && window.sapdas.webclientPreregistration) {
                delete window.sapdas.webclientPreregistration[this._clientId];
            }
        }
    });


    /**
     * Static utility: checks whether the app is running inside SAP Fiori Launchpad.
     *
     * @static
     * @public
     * @returns {boolean}
     */
    JouleWebclientHelper.isFLPEnvironment = function () {
        var Container = (sap.ushell && sap.ushell.Container) || sap.ui.require("sap/ushell/Container");
        return Container !== undefined;
    };

    return JouleWebclientHelper;
});
