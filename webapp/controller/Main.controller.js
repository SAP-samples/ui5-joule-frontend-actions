sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/core/Theming"], function (Controller, Theming) {
	"use strict";

	return Controller.extend("test.my.frontend.actions.controller.Main", {
		onInit: function () {
			this.model = new sap.ui.model.json.JSONModel();
			this.model.loadData(sap.ui.require.toUrl("test/my/frontend/actions/model/ticket.json"));
			this.getView().setModel(this.model, "ticket");

			this.initJoule(); // initialize Joule integration
		},

		// The setup code to register the frontend actions with Joule
		// Note: in addition to that, the actions ALSO need to be deployed to the server as a yaml file, unfortunately.
		
		initJoule: function () {

			// helper function to register the frontend actions with Joule's web client bridge
			function registerBridgeCallback(name, jouleCallbacks) {
				// register the frontend actions (either directly with Joule, or prepare and Joule will register them once it loads)
				if (window.sap?.das?.webclient?.registerBridgeCallback) {
					window.sap?.das?.webclient?.registerBridgeCallback(name, jouleCallbacks);
				} else {
					window.sapdas = window.sapdas || {};
					window.sapdas.webclientBridge = jouleCallbacks;
					window.sapdas.webclientPreregistration =  window.sapdas?.webclientPreregistration || {};
					window.sapdas.webclientPreregistration[name] = jouleCallbacks;
				}
			}

			// define the frontend actions (name + callback function)
			const jouleCallbacks = {
				getFrontendActions: (_jouleContext) => { // invoked by Joule for each user prompt
					return [ // return all actions, but we could filter based on conditions
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
			registerBridgeCallback("test.my.frontend.actions", jouleCallbacks);
		},

		onExit: function () {
			// in case Joule exists, deregister
			window.sap?.das?.webclient?.deregisterBridgeCallback("test.my.frontend.actions");
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
				Theming.applyTheme(themeName);
				result.success = true;
				result.message = themeMap[themeName] || themeName;
			}
			return result;
		},

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
