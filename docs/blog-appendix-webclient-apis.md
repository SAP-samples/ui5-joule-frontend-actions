# Blog Appendix: Registering Joule Frontend Actions Without JouleConnector

This appendix accompanies the [main blog post on Joule Frontend Actions](blog-joule-frontend-actions.md). It covers how to register frontend actions by communicating directly with the [Joule webclient bridge API](https://help.sap.com/docs/joule/joule-development-guide-ba88d1ec6a1b442098863d577c19b0c0/developer-guide-for-joule-web-client) — the officially documented JavaScript interface of the Joule webclient (the client-side chat UI of Joule in the browser).

A working sample application is available on the [`pure-joule-webclient` branch](https://github.com/SAP-samples/ui5-joule-frontend-actions/tree/pure-joule-webclient) of the sample repository.

Registering frontend actions in standalone apps uses only officially documented APIs. However, the case of iframe-isolated apps in FLP requires the SAP-internal `MessageBroker` service, which is not publicly released for customer applications — which is why this approach lives in this appendix rather than the main blog post. Use any code at your own risk, especially across updates. In general, this is just an unsupported sample, but that caveat applies particularly to the FLP code path.

## When do you need this?

This approach is needed when `JouleConnector` is **not available**, in particular when:

- Your SAPUI5 version is **older than 1.151**
- Your application uses a **different UI technology** (plain JavaScript, …)

In these cases, without access to the `sap.ui.joule.frontend` library with the `JouleConnector`, you can still register frontend actions by communicating directly with the Joule webclient bridge API. This appendix explains how.

## The two communication paths

Without `JouleConnector`, your application needs to handle two different scenarios:

1. **Standalone**: The app and the Joule webclient run in the same browser window. You register callbacks directly with Joule's JavaScript API.
2. **FLP/Workzone**: The app may run in a different iframe than Joule, depending on the exact setup. Communication happens via the FLP `MessageBroker` service.

Not all applications will run in both scenarios — many will only run in one of them. But if you want to be safe for all deployment options, you need to handle both.

## Encapsulating the complexity: JouleWebclientHelper

Rather than scattering the if/else detection and two communication code paths through your controller, we recommend encapsulating this in a helper class. The [sample app's `pure-joule-webclient` branch](https://github.com/SAP-samples/ui5-joule-frontend-actions/tree/pure-joule-webclient) provides [`JouleWebclientHelper.js`](https://github.com/SAP-samples/ui5-joule-frontend-actions/blob/pure-joule-webclient/webapp/JouleWebclientHelper.js) which offers a clean API. Note that this is just a sample, provided as-is without support. It can be used like this:

```javascript
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Theming",
    "my/app/JouleWebclientHelper"
], function (Controller, Theming, JouleWebclientHelper) {
    "use strict";

    return Controller.extend("my.app.controller.Main", {
        onInit: function () {
            this.initJoule();
        },

        initJoule: function () {
            // Create helper — auto-detects FLP vs. standalone
            this._jouleHelper = new JouleWebclientHelper("my.app.namespace");

            // Register app-specific frontend actions
            this._jouleHelper.registerActions(this.getFrontendActions.bind(this));
        },

        // Called by Joule for each user prompt to collect the currently available actions.
        // Return different sets of actions depending on the current app state —
        // scenarios requiring unavailable actions are automatically excluded by Joule.
        getFrontendActions: function (_jouleContext) {
            return [
                {
                    frontend_action_name: "my.app.setTheme",
                    function: function (params) {
                        return this.setTheme(params.themeName);
                    }.bind(this)
                },
                {
                    frontend_action_name: "my.app.getTicketTimeline",
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

        // ... action implementations ...
    });
});
```

This looks almost identical to the `JouleConnector` usage in the main blog – and that's the point. The helper provides the same developer experience; the difference is that you own the code.

The `registerActions` callback is invoked for each user prompt, so you can dynamically return different actions depending on the current UI state — just like with `JouleConnector`.

> Note: the action function should do its task reasonably fast — just as it would for a regular user interaction. There is currently a 15‑second timeout to prevent Joule from waiting too long.

## What the helper does internally

### Environment detection

```javascript
JouleWebclientHelper.isFLPEnvironment = function () {
    var Container = (sap.ushell && sap.ushell.Container) || sap.ui.require("sap/ushell/Container");
    return Container !== undefined;
};
```

This synchronously checks for the presence of `sap.ushell.Container`. If found, the app is running inside FLP (or at least an FLP-like shell).

### Standalone path

When running standalone, the helper registers an object containing callback functions with the Joule webclient using the [bridge API](https://help.sap.com/docs/joule/joule-development-guide-ba88d1ec6a1b442098863d577c19b0c0/developer-guide-for-joule-web-client):

```javascript
var jouleCallbacks = {
    getFrontendActions: function (_jouleContext) {
        return fnGetActions(_jouleContext);
    }
};

// Connect directly if Joule is already loaded...
if (window.sap?.das?.webclient?.registerBridgeCallbacks) {
    window.sap.das.webclient.registerBridgeCallbacks(clientId, jouleCallbacks);
} else {
    // ...or pre-register for when it loads
    window.sapdas = window.sapdas || {};
    window.sapdas.webclientPreregistration = window.sapdas.webclientPreregistration || {};
    window.sapdas.webclientPreregistration[clientId] = {callbacks: jouleCallbacks};
}
```

The pre-registration mechanism (`webclientPreregistration`) is important: if Joule hasn't bootstrapped yet when your app starts, you park the callbacks there and Joule picks them up once loaded.

For cleanup:
```javascript
window.sap?.das?.webclient?.unregisterBridgeCallbacks(clientId);
```

If the app runs standalone, it also needs to load Joule by including the Joule bootstrap.js file. The `data-bot-name` must be the name used when deploying the Joule assistant.

```html
<script src="https://<your_joule_tenant_URL>.sapdas.cloud.sap/resources/public/webclient/bootstrap.js"
   data-bot-name="my_frontend_actions"
   data-expander-type="DEFAULT">
</script>
```

In FLP, Joule is loaded by the shell's `DigitalAssistant` bootstrap plugin — you only need to configure the plugin URL in the `sap-ushell-config`.

### FLP / MessageBroker path

When running in FLP, the helper connects to the [`MessageBroker`](https://sapui5untested.int.sap.eu2.hana.ondemand.com/sapui5-sdk-internal/#/api/sap.ushell.services.MessageBroker) service (as mentioned, this is an SAP-internal API — which is one reason this approach is not officially supported) and subscribes to three channels:

- `com.sap.joule.flp.events` (v1.0)
- `com.sap.joule.flp.message` (v1.0)
- `com.sap.joule.flp.frontendactions` (v1.0)

It handles two message types on the `frontendactions` channel:

1. **`getFrontendActions`** — invoked by Joule for each user prompt. The helper calls your callback, stores the action array, and publishes a `getFrontendActionsResponse` with just the action names (serialized — function references can't cross the message broker).

2. **`executeFrontendAction`** — Joule asks to execute a specific action by name. The helper finds it in the stored array, calls the function with the payload, and publishes an `executeFrontendActionResponse` with the result.

```javascript
// Subscribing
var messageBroker = await Container.getServiceAsync("MessageBroker");
await messageBroker.connect(clientId, function () {});
await messageBroker.subscribe(clientId, channels, messageCallback);

// Publishing a response
messageBroker.publish(
    "com.sap.joule.flp.frontendactions",
    clientId,
    "",
    "getFrontendActionsResponse",
    ["jouleWebClient"],
    {
        correlationId: messageData.correlationId,
        availableFrontendActions: actions.map(fa => fa.frontend_action_name)
    }
);
```

This is exactly the kind of boilerplate that `JouleConnector` eliminates — it detects the environment and uses the right mechanism internally, so your application code doesn't have to.

## Key differences from JouleConnector

| Aspect | JouleConnector (SAPUI5 ≥ 1.151) | Direct bridge API |
|---|---|---|
| FLP detection | Automatic | Manual — `isFLPEnvironment()` check needed |
| FLP communication | Handled internally | You implement the MessageBroker subscription |
| Standalone registration | Handled internally | You call `registerBridgeCallbacks` / `webclientPreregistration` |
| Cleanup | `connector.disconnect()` | Different code paths per environment |
| Setup effort | Few lines in your controller | Few lines in your controller + a helper class |

If you're starting fresh and can use a current SAPUI5 version, go with `JouleConnector`. If you can't, the bridge API gives you the same capabilities — just with more wiring to do yourself. The [`pure-joule-webclient` branch](https://github.com/SAP-samples/ui5-joule-frontend-actions/tree/pure-joule-webclient) of the sample app has a complete working example with the `JouleWebclientHelper` ready to use.
