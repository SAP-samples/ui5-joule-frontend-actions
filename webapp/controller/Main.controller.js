sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/Theming",
	"test/my/frontend/actions/FLPJouleBridge"
], function (Controller, Theming, FLPJouleBridge) {
	"use strict";

	return Controller.extend("test.my.frontend.actions.controller.Main", {
		onInit: function () {
			this.model = new sap.ui.model.json.JSONModel();
			this.model.loadData(sap.ui.require.toUrl("test/my/frontend/actions/model/ticket.json"));
			this.getView().setModel(this.model, "ticket");

			this.initJoule(); // initialize Joule integration
		},

		// The setup code to register the frontend actions with Joule
		// Note: in addition to that, the actions ALSO need to be deployed to the server as a yaml file
		initJoule: function () {

			// helper function to register the frontend actions with Joule's web client bridge
			async function registerWithJoule(name, jouleCallbacks) {

				// case 1: FLP environment
				if (FLPJouleBridge.isToBeUsed()) {
					// in FLP, use FLPJouleBridge to communicate with Joule
					const jouleBridge = new FLPJouleBridge("test.my.frontend.actions"); // must be unique!!
					jouleBridge.setBridgeCallback(jouleCallbacks);

				// case 2: standalone app
				} else {
					// either connect to Joule directly or wait until it is loaded
					if (window.sap?.das?.webclient?.registerBridgeCallbacks) {
						window.sap?.das?.webclient?.registerBridgeCallbacks(name, jouleCallbacks);
					} else {
						window.sapdas = window.sapdas || {};
						window.sapdas.webclientPreregistration =  window.sapdas?.webclientPreregistration || {};
						window.sapdas.webclientPreregistration[name] = jouleCallbacks;
					}
				}
			}

			// define the frontend actions (name + callback function)
			const jouleCallbacks = {
				getFrontendActions: (_jouleContext) => { // invoked by Joule for each triggered user prompt
					return [ // return all actions, but can also be filtered dynamically based on certain conditions
						{
							frontend_action_name: 'test.my.frontend.actions.getFields.v1',
							function: async (_jouleContext) => {
								return this.getFields();
							}
						}, {
							frontend_action_name: 'test.my.frontend.actions.setTheme.v1',
							function: async (params, _jouleContext) => {
								return this.setTheme(params.themeName);
							}
						}
					]
				}
			};

			// register the frontend actions with Joule's web client bridge
			registerWithJoule("test.my.frontend.actions", jouleCallbacks);
		},

		deregisterFromJoule: async function () {
			// in case Joule exists, deregister
			if (FLPJouleBridge.isToBeUsed()) {

			} else {
				window.sap?.das?.webclient?.deregisterBridgeCallback("test.my.frontend.actions");
			}
		},

		onExit: function () {
			this.deregisterFromJoule();
		},


		// the frontend action implementations

		getFields() {
			const modelData = this.model.getData();
			return Object.entries(modelData).map(([fieldName, fieldValue]) => ({ fieldName, fieldValue }));
		},

		setTheme(themeName) {
			const themeMap = {
				"sap_horizon": "light",
				"sap_horizon_dark": "dark",
				"sap_hcb": "accessibility"
			};
			const result = {
				success: false
			};
			if (themeName) {
				Theming.setTheme(themeName);
				result.success = true;
				result.message = themeMap[themeName] || themeName; // something like "dark"; will be inserted to a message placeholder; should normally be localized
			}
			return result;
		},


		// right now, Joule API calls only work when Joule is running in the same frame

		onJouleTogglePress: function () {
			window.sap?.das?.webclient?.toggle();
		},

		onJouleToggleNavPress: function () {
			window.sap?.das?.webclient?.toggleNavigationPanel();
		},

		onJouleSendUserMessagePress: async function () {
			// the below only works when there is an active conversation; otherwise, you can call
			//   await window.sap.das.webclient.newConversation();
			// first to start a new conversation
			window.sap?.das?.webclient?.sendMessage("This is a user message from the UI5 application!");
		}
	});
});
