# Appendix: Joule Webclient APIs — Direct Usage and Frontend Actions Without JouleConnector

> This appendix accompanies the [main blog post on Joule Frontend Actions](blog-joule-frontend-actions.md). It covers two topics:
>
> 1. **Direct Joule webclient APIs** — the Joule webclient (the client-side chat UI of Joule in the browser) exposes JavaScript APIs like `toggle()`, `sendMessage()`, and `newConversation()` that are useful alongside `JouleConnector` for programmatically controlling the Joule UI.
> 2. **Frontend action registration without `JouleConnector`** — for SAPUI5 < 1.151 or non-UI5 environments.
>
> A working sample application covering both topics, including TypeScript type definitions for the Joule webclient APIs, is available on the [`pure-joule-webclient` branch](https://github.com/SAP-samples/ui5-joule-frontend-actions/tree/pure-joule-webclient) of the sample repository.

## When do you need this?

Since SAPUI5 1.151, the [`JouleConnector`](https://ui5.sap.com/#/api/sap.ui.joule.frontend.JouleConnector) class in the `sap.ui.joule.frontend` library handles all the communication with the Joule webclient automatically – including FLP vs. standalone detection. If you're on a current SAPUI5 version, you should use `JouleConnector` as described in the main blog post and can stop reading here.

However, the [direct Joule webclient API section](#bonus-direct-joule-webclient-api-calls) below documents APIs for programmatic control of the Joule UI (toggling, sending messages, etc.) that `JouleConnector` does not provide — those are relevant regardless of your SAPUI5 version.

However, there are situations where `JouleConnector` is **not available**:

- Your SAPUI5 version is **older than 1.151**
- Your application uses a **different UI technology** (plain JavaScript, Web Dynpro, SAP GUI for HTML, …)
- You need **full control** over the communication layer

In these cases, you can still register frontend actions by communicating directly with the Joule webclient JavaScript APIs. This appendix explains how.

## The two communication paths

Without `JouleConnector`, your application needs to handle two different scenarios:

1. **Standalone**: The app and the Joule webclient run in the same browser window. You register callbacks directly with Joule's JavaScript API.
2. **FLP/Workzone**: The app may run in a different iframe than Joule. Communication happens via the FLP `MessageBroker` service.

Not all applications will run in both scenarios — many will only run in one of them. But if you want to be safe for all deployment options, you need to handle both.

## Encapsulating the complexity: JouleWebclientHelper

Rather than scattering the if/else detection and two communication codepaths through your controller, we recommend encapsulating this in a helper class. The [sample app's `pure-joule-webclient` branch](https://github.com/SAP-samples/ui5-joule-frontend-actions/tree/pure-joule-webclient) provides [`JouleWebclientHelper.js`](https://github.com/SAP-samples/ui5-joule-frontend-actions/blob/pure-joule-webclient/webapp/JouleWebclientHelper.js) which offers a clean API:

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
            var that = this;

            // Create helper — auto-detects FLP vs. standalone
            this._jouleHelper = new JouleWebclientHelper("my.app.namespace");

            // Register actions — same structure regardless of environment
            this._jouleHelper.registerActions(function (_jouleContext) {
                return [
                    {
                        frontend_action_name: "my.app.setTheme",
                        function: async function (params) {
                            return that.setTheme(params.themeName);
                        }
                    },
                    {
                        frontend_action_name: "my.app.getTicketTimeline",
                        function: async function () {
                            return that.getTicketTimeline();
                        }
                    }
                ];
            });
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

This looks almost identical to the `JouleConnector` version from the main blog – and that's the point. The helper provides the same developer experience; only the internal machinery differs.

The `registerActions` callback is invoked for each user prompt, so you can dynamically return different actions depending on the current UI state — just like with `JouleConnector`.

> Note: the action function should do its task reasonably fast – just like it would do for a user interaction in the UI. There is currently a 15‑second timeout to prevent Joule from waiting too long.

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

When running standalone, the helper registers an object containing callback functions with the Joule webclient:

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

If the app runs standalone, it also needs to load Joule by including its bootstrap.js file. The `data-bot-name` must be the name used when deploying the Joule assistant.

```html
<script src="https://<your_das_tenant_URL>.sapdas.cloud.sap/resources/public/webclient/bootstrap.js"
   data-bot-name="my_frontend_actions"
   data-expander-type="DEFAULT">
</script>
```

In FLP, Joule is loaded by the shell's `DigitalAssistant` bootstrap plugin — you only need to configure the plugin URL in the `sap-ushell-config`.

### FLP / MessageBroker path

When running in FLP, the helper connects to the [`MessageBroker`](https://sapui5untested.int.sap.eu2.hana.ondemand.com/sapui5-sdk-internal/#/api/sap.ushell.services.MessageBroker) service (an SAP-internal API) and subscribes to three channels:

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

Note: The `MessageBroker` API is SAP-internal. It is not publicly released for customer applications.

This is exactly the kind of boilerplate that `JouleConnector` eliminates — it detects the environment and uses the right mechanism internally, so your application code doesn't have to.

## Bonus: Direct Joule webclient API calls

Beyond frontend actions, the Joule webclient exposes additional APIs for direct interaction. These only work when Joule runs in the same frame as the application (standalone mode or same-frame FLP). They do **not** work via the MessageBroker when app and Joule are in different iframes. Availability may vary depending on the deployment environment — test in your target environment before investing into features that depend on these APIs.

```javascript
// Toggle Joule open/closed
window.sap?.das?.webclient?.toggle();

// Toggle the navigation/conversation list panel
window.sap?.das?.webclient?.toggleNavigationPanel();

// Send a message as if the user typed it
window.sap?.das?.webclient?.sendMessage("Show me the ticket timeline");

// Create a new conversation
await window.sap?.das?.webclient?.newConversation();
```

There are further callback functions beyond `getFrontendActions` that can be registered. One can, for example, be called back on every assistant message or on creation of new conversations. Further APIs for controlling the Joule webclient directly are described in [its documentation](https://help.sap.com/docs/joule/joule-development-guide-ba88d1ec6a1b442098863d577c19b0c0/developer-guide-for-joule-web-client).

The [`pure-joule-webclient` branch](https://github.com/SAP-samples/ui5-joule-frontend-actions/tree/pure-joule-webclient) includes TypeScript type definitions for these APIs in the `/types` folder. These are provided as-is, without warranty or support.

## Key differences from JouleConnector

| Aspect | JouleConnector (SAPUI5 ≥ 1.151) | Direct Joule webclient APIs |
|---|---|---|
| FLP detection | Automatic | Manual — `isFLPEnvironment()` check needed |
| FLP communication | Handled internally | You implement the MessageBroker subscription |
| Standalone registration | Handled internally | You call `registerBridgeCallbacks` / `webclientPreregistration` |
| Generic UI actions | Available at library load time (describeUI, setFields, etc.) | Not available — you only get what you register |
| Cleanup | `connector.disconnect()` | Different code paths per environment |
| Setup effort | ~5 lines in your controller | ~10 lines in your controller + a helper class (~200 lines) |

If you're starting fresh and can use a current SAPUI5 version, go with `JouleConnector`. If you can't, the direct APIs give you the same capabilities – just with more wiring to do yourself. The [`pure-joule-webclient` branch](https://github.com/SAP-samples/ui5-joule-frontend-actions/tree/pure-joule-webclient) of the sample app has a complete working example with the `JouleWebclientHelper` ready to use. The branch also includes TypeScript type definitions for the Joule webclient APIs.
