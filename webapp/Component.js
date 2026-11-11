sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
	"use strict";

	return UIComponent.extend("test.my.frontend.actions.Component", {
		metadata: {
			manifest: "json",
			interfaces: ["sap.ui.core.IAsyncContentCreation"]
		},

		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.call(this); // create the views based on the url/hash
		}
	});
});
