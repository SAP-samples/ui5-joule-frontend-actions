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
		//
		// This method implements two variants:
		// 1) when running in FLP, it uses FLPJouleBridge to communicate with Joule via the FLP MessageBroker
		// 2) when running standalone, it connects directly to Joule's web client bridge (or waits until it is loaded)
		//
		// They could be wrapped behind one common API, but for clarity, both variants are shown here explicitly.
		// Not all applications will run in both scenarios, but they may often run in only one of them.
		initJoule: async function () {
			const CLIENT_ID = "test.my.frontend.actions"; // must be unique!!

			// define the frontend actions (name + callback function implementing the action)
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

			// case 1: FLP environment
			if (FLPJouleBridge.needsToBeUsed()) {
				// in FLP, use FLPJouleBridge to communicate with Joule
				this.jouleBridge = new FLPJouleBridge(CLIENT_ID); // must be unique!!
				this.jouleBridge.setBridgeCallback(jouleCallbacks);

				// case 2: standalone app
			} else {
				// either connect to Joule directly or wait until it is loaded
				if (window.sap?.das?.webclient?.registerBridgeCallbacks) {
					window.sap?.das?.webclient?.registerBridgeCallbacks(CLIENT_ID, jouleCallbacks);
				} else {
					window.sapdas = window.sapdas || {};
					window.sapdas.webclientPreregistration = window.sapdas?.webclientPreregistration || {};
					window.sapdas.webclientPreregistration[CLIENT_ID] = jouleCallbacks;
				}
			}
		},

		// when the app is exited, deregister from Joule
		deregisterFromJoule: async function () {
			if (FLPJouleBridge.needsToBeUsed() && this.jouleBridge) {
				this.jouleBridge.disconnect();
				this.jouleBridge = null;
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


		// Right now, the below Joule API calls only work when Joule is running in the same frame (not available via FLPJouleBridge).
		// They *do* work in FLP, but only when the app is in the same frame. In workzone, for example, it does not work.

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
