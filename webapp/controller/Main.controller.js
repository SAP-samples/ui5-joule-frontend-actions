sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/Theming",
	"sap/ui/model/json/JSONModel",
	"test/my/frontend/actions/JouleWebclientHelper"
], function (Controller, Theming, JSONModel, JouleWebclientHelper) {
	"use strict";

	return Controller.extend("test.my.frontend.actions.controller.Main", {
		onInit: function () {
			this.model = new JSONModel();
			this.model.loadData(sap.ui.require.toUrl("test/my/frontend/actions/model/ticket.json"));
			this.getView().setModel(this.model, "ticket");

			this.initJoule(); // initialize Joule integration
		},

		// Register the frontend actions with Joule using JouleWebclientHelper.
		// This helper encapsulates the FLP vs. standalone detection and communication.
		// Note: in addition to the code registration here, the actions ALSO need to be deployed
		// to the Joule backend as YAML files (see the joule/ folder).
		initJoule: function () {
			// Create helper — auto-detects FLP vs. standalone environment
			this._jouleHelper = new JouleWebclientHelper("test.my.frontend.actions");

			// Register app-specific frontend actions.
			this._jouleHelper.registerActions(this.getFrontendActions.bind(this));
		},

		// Called by Joule for each user prompt to collect the currently available actions.
		// Return different sets of actions depending on the current app state —
		// scenarios requiring unavailable actions are automatically excluded by Joule.
		getFrontendActions: function (_jouleContext) {
			return [
				{
					frontend_action_name: "test.my.frontend.actions.setTheme",
					function: function (params) {
						return this.setTheme(params.themeName);
					}.bind(this)
				},
				{
					frontend_action_name: "test.my.frontend.actions.getTicketTimeline",
					function: function () {
						return this.getTicketTimeline();
					}.bind(this)
				}
			];
		},

		onExit: function () {
			if (this._jouleHelper) {
				this._jouleHelper.disconnect();
			}
		},


		// Frontend action implementations

		/**
		 * Sets the visual theme of the application.
		 * @param {string} themeName - one of "sap_horizon", "sap_horizon_dark", "sap_hcb"
		 * @returns {{success: boolean, message: string}}
		 */
		setTheme: function (themeName) {
			var themeMap = {
				"sap_horizon": "light",
				"sap_horizon_dark": "dark",
				"sap_hcb": "accessibility"
			};
			var result = {
				success: false
			};
			if (themeName) {
				Theming.setTheme(themeName);
				result.success = true;
				result.message = themeMap[themeName] || themeName;
			}
			return result;
		},

		/**
		 * Returns the structured conversation timeline of the currently displayed ticket.
		 * This is a good example of an app-specific action: it returns semantically meaningful
		 * business data (who said what, when, action items) that a generic UI scraping action
		 * like describeUI could never provide with the same quality.
		 * @returns {{ticketTitle: string, status: string, priority: string, timeline: Array}}
		 */
		getTicketTimeline: function () {
			var modelData = this.model.getData();
			return {
				ticketTitle: modelData.Title,
				status: modelData.Status,
				priority: modelData.Priority,
				timeline: modelData.Messages.map(function (msg) {
					return {
						timestamp: msg.ts,
						role: msg.role,
						message: msg.text,
						actionItem: msg.idea || null
					};
				})
			};
		}
	});
});
