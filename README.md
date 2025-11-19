# UI5 Sample For Demonstrating Joule Frontend Actions

[![REUSE status](https://api.reuse.software/badge/github.com/SAP-samples/ui5-joule-frontend-actions)](https://api.reuse.software/info/github.com/SAP-samples/ui5-joule-frontend-actions)

## Description
This sample UI5 application demonstrates how frontend actions can be defined for the AI assistant SAP Joule. Frontend actions allow for direct interaction between Joule and the client-side application UI.

## Requirements

1. A current [Node.js](https://nodejs.org/) version (18.x or later) along with [npm](https://www.npmjs.com/) (or alternative package manager) for dependency management.

2. The [Joule CLI tool](https://help.sap.com/docs/joule/joule-development-guide/install-and-update-command-line-interface) (as of now only available SAP-internally: `npm install -g @sap/sapdas-cli`)

3. Access to a [Joule service instance](https://help.sap.com/docs/joule/joule-development-guide/create-joule-subscription-and-instance). You need to have a user and the respective access information (URLs, client-ID, client-secret, see below).

## Preparation

### 1. Install the app dependencies

```sh
npm install
```

### 2. Log in to Joule

Use the Joule CLI tool to log in (you need to use URLs, user name etc. from your Joule instance):

```sh
joule login --apiurl 'https://<your_das_tenant_URL>.sapdas.cloud.sap' --authurl 'https://<your_auth_URL>.hana.ondemand.com' --clientid '<your_client_ID>' --clientsecret '<your_client_secret>' --username '<your_user_name>'
```

You can then verify your login status with:

```sh
joule status
```

### 3. Deploy the digital assistant

Deploy with the command below. To avoid conflicts with other assistants already deployed in your tenant, you may want to change the assistant name `ui5_frontend_actions` to something else.

```sh
cd joule
joule deploy --compile --name ui5_frontend_actions
```

### 4. Adapt the HTML files which load Joule

This sample application demonstrates two deployment scenarios:

#### Standalone Application
In the standalone variant (`index-standalone.html`), the Joule web client is [loaded explicitly using a script tag](https://help.sap.com/docs/joule/joule-development-guide-4b327297dce247fcb88a5f5bfeea97a1/integrating-joule-using-script).

In case you changed the assistant name `ui5_frontend_actions` to something else when deploying the assistant, then this term also needs to be changed in the script tag.

At minimum, replace `<your_das_tenant_URL>` in the script tag of `index-standalone.html`:

```html
<script src="https://<your_das_tenant_URL>.sapdas.cloud.sap/resources/public/webclient/bootstrap.js"
    data-bot-name="ui5_frontend_actions"
    data-expander-type="DEFAULT"
></script>
```

The `data-expander-type` attribute determines what kind of icon/button opens the Joule web client.

#### SAP Fiori Launchpad Integration
In the FLP variant (`index-flp.html`), Joule is loaded via the SAP Fiori Launchpad's bootstrap plugin mechanism. Note that this configuration and bootstrapping of the FLP sandbox is only meant for local development! In productive systems, the app component is loaded directly and the html file is not used. Configure the Digital Assistant plugin in the `sap-ushell-config`:

```javascript
bootstrapPlugins: {
    DigitalAssistant: {
        component: "sap.das.webclientplugin.s4",
        url: "https://<your_das_tenant_URL>.sapdas.cloud.sap/resources/public/webclient/s4",
    }
}
```

Replace `<your_das_tenant_URL>` with your Joule tenant URL for testing. The FLP variant uses the `FLPJouleBridge` class to communicate with Joule via the FLP MessageBroker. Note: the MessageBroker API is SAP-internal, not publicly released for customer apps.

## Run the App

To run the app in watch mode:

```sh
npm start
```

As shown in the terminal after executing this command, the app is then running on:
- http://localhost:8080/index.html (launcher page with buttons to choose between variants)
- http://localhost:8080/index-standalone.html (standalone variant)
- http://localhost:8080/index-flp.html (SAP Fiori Launchpad variant)

A browser window should automatically open. When you then navigate to the standalone version, you should see the purple Joule icon in the bottom right corner. When launching the FLP variant, Joule is accessible via the FLP shell bar.

> **IMPORTANT**: Joule will **not** load successfully on localhost when clicking the icon because Joule has strict rules (CSP settings) in which domains it may be embedded. `localhost` is not one of them. The most straightforward way for local testing is to override the computer's DNS resolution:
 - On Mac:
   - `sudo nano /etc/hosts` and add the following entries:
     - 127.0.0.1  myhost.sap.corp
     - ::1  myhost.sap.corp
   - `sudo dscacheutil -flushcache`
   - `sudo killall -HUP mDNSResponder`
   - Then open the app by opening http://myhost.sap.corp:8080/ in your browser.
Other options are to deploy the app on *.ondemand.com, which is an allowed domain, or to [configure the allowlisted domains](https://help.sap.com/docs/joule/service-guide/custom-domain-configuration-for-joule?locale=en-US).

> **ALSO IMPORTANT**: When Joule still gives you a full-screen error that sounds like "this domain is not trustworthy", then you may have to log in first on https://<your_das_tenant_URL>.sapdas.cloud.sap/resources/webclient/playground.html?botName=<your_bot_name>


## Application Architecture

### Dual-Mode Support: Standalone and FLP

This application supports two integration modes with Joule, automatically detecting and choosing the appropriate communication mechanism:

1. **Standalone Mode**: Direct integration with the Joule web client API
2. **FLP Mode**: Integration via the `FLPJouleBridge` class using the FLP MessageBroker

The `Main.controller.js` automatically detects the environment and uses the appropriate integration method in the `initJoule()` function.

### FLPJouleBridge

The `FLPJouleBridge.js` class facilitates communication between UI5 applications and SAP Joule when running inside SAP Fiori Launchpad. Key features:

- **Automatic Detection**: The static `FLPJouleBridge.needsToBeUsed()` method checks if the app is running in an FLP environment
- **MessageBroker Communication**: Uses FLP's MessageBroker service to exchange messages with Joule via three channels:
  - `com.sap.joule.flp.events` - Event notifications
  - `com.sap.joule.flp.message` - General messaging
  - `com.sap.joule.flp.frontendactions` - Frontend action execution
- **Lifecycle Management**: Provides `setBridgeCallback()` to register action handlers and `disconnect()` for cleanup
- **Action Registration**: Handles the `getFrontendActions` request from Joule and returns available actions
- **Action Execution**: Receives `executeFrontendAction` requests, executes the corresponding function, and returns results

When running in FLP, the bridge serializes action names (not function references) to Joule and maintains the action registry for execution.

## Explanation of Joule-specific code sections

### The Joule Capability

Joule capabilities are developed and deployed [as described in the Joule development documentation](https://help.sap.com/docs/joule/joule-development-guide-4b327297dce247fcb88a5f5bfeea97a1/build-capability?locale=en-US). The assistant and capability in this repository are are intentionally minimal and only focus on the frontend actions.

In the `/joule` folder, there is a `da.sapdas.yaml` file defining a Joule assistant with one capability, `my_capability`, which resides in the folder with the same name and has one `capability.sapdas.yaml` file and folders named `scenarios`, `functions` and `i18n` (these files and folders need to be named like this by convention).

The **scenarios** in `/joule/my_capability/scenarios` are the entry point for Large Language Models with their human- and AI-readable description. They define the *slots*, which are mapped to function input parameters, and refer to a *function* as target. One scenario, `set_theme`, switches the UI5 application theme, demonstrating the Joule-to-application direction. The other scenario, `get_fields`, demonstrates how Joule can get information from the application.

The **functions** in `/joule/my_capability/functions` define the concrete frontend actions as implemented in JavaScript inside the application. Their names and the parameter names match what you see in `Main.controller.js`.

Both functions have an action of type `message` in addition to the `frontend-action`. Those messages display something to the user in the Joule conversation window, using the frontend action's return value. This return value is first assigned to the variable `frontendActionResult` and then used in the `message`.<br>
The `getFields` message uses handlebars templating to create a markdown-formatted message displaying the returned fields to the user.

#### I18n

The `setTheme` message makes use of the [internationalization feature](https://help.sap.com/docs/joule/joule-development-guide-4b327297dce247fcb88a5f5bfeea97a1/handbook-for-internationalizing-capabilities?locale=en-US) to display a translated message to the user. (Caveat: only the message itself is translated, not the theme name returned from the application as `frontendActionResult.content.message`, but of course [translation in UI5 applications](https://ui5.sap.com/#/topic/df86bfbeab0645e5b764ffa488ed57dc) is also possible.)

Note that `scripting_type: handlebars` is required to make this templating work.


### The Frontend Actions Implementation

In `Main.controller.js`, the `initJoule` function sets up the connection with Joule and declares the available frontend functions. The function implements two integration variants:

#### Case 1: FLP Environment
When `FLPJouleBridge.needsToBeUsed()` returns true, the application creates an `FLPJouleBridge` instance and registers callbacks via `setBridgeCallback()`. The bridge handles all communication with Joule through the FLP MessageBroker.

#### Case 2: Standalone Environment
When running standalone, the application registers directly with the Joule web client API using `window.sap.das.webclient.registerBridgeCallbacks()`. If Joule hasn't loaded yet, it uses a pre-registration mechanism via `window.sapdas.webclientPreregistration`.

#### Action Registration
The array of actions is used in both variants:

```js
[ // return all actions, but we could filter based on conditions
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
```

It connects the function names and parameters declared in the Joule capability with concrete UI5 controller methods `getFields()` and `setTheme(...)`. This array is returned by the `getFrontendActions` callback function, which is invoked every time the user sends a prompt to Joule. This allows the app to dynamically decide which actions are currently available. Scenarios requiring unavailable functions are not offered in Joule when the user prompt is handled.

The `deregisterFromJoule()` method in the controller's `onExit()` ensures proper cleanup, disconnecting the bridge in FLP mode or deregistering callbacks in standalone mode.

Further down, the controller methods `setTheme` and `getFields` implement the actual action inside the UI5 application - setting the theme and extracting data. `getFields` simply returns a map, `setTheme` returns an object with a `success` flag and a `message`. Note that the returned object is available as `.content` property of the result variable in the Joule function definition. This means you get it by accessing `frontendActionResult.content`, not by referring to `frontendActionResult` itself.

### Bonus: API interaction with the Joule web client

**Note**: The APIs demonstrated below currently only work when Joule runs in the same frame as the application (standalone mode). They do not work via `FLPJouleBridge` in FLP environments where Joule and the app run in different iframes.

At the bottom of `Main.controller.js` you can find three methods that demonstrate how to interact with the Joule web client via API. They are connected to the respective header button in `Main.view.xml`.

- `onJouleTogglePress` calls the web client's `toggle()` method, opening and closing the Joule assistant window
- `onJouleToggleNavPress` calls `toggleNavigationPanel()`, opening/closing the navigation panel in Joule which displays the list of conversations
- `onJouleSendUserMessagePress` calls `sendMessage(...)`. This adds a message to the ongoing conversation as if the user had typed the message. Joule will then respond to this message, continuing the conversation. If there is no conversation yet, one first needs to be created.

There are additional APIs which allow interaction with the web client and there are further callback functions beyond the `getFrontendActions` function used in this sample app. One can, for example, be called back on every assistant message or on creation of new conversations.

You can now combine these mechanisms to build an AI-enhanced user experience!

## TypeScript Usage

While this sample is pure JavaScript, the `/types` folder contains experimental (AI-generated, unverified and unofficial) TypeScript type definitions. Until there are official type definitions provided, you may use these in your application to get TypeScript support for the Joule web client APIs. **These type definitions are provided as-is, they come without warranty or support, and do not imply that the typed APIs are stable and will be present in future versions of the Joule web client!**

## Known Issues

No known code issues.

### Joule Loading Requirements
- Joule refuses running on non-allowlisted domains, which includes localhost. An easy workaround is to modify `/etc/hosts`as described above, so a subdomain of `.sap.corp` can be entered in the browser to access localhost.
- The user must be logged in to Joule, e.g. on https://<<your_das_tenant_URL>>.sapdas.cloud.sap/resources/webclient/playground.html?botName=ui5_frontend_actions (adapt bot name if you chnged it, probably also works without a specific bot).
- **Standalone mode** (`index-standalone.html`): The Joule tenant URL must be properly configured in the script tag
- **FLP mode** (`index-flp.html`): The Joule tenant URL must be configured in the `bootstrapPlugins` section
- The hosting domain must be in Joule's allowlist (as explained earlier in the setup section)

### API Limitations
The Joule web client API methods (`toggle()`, `toggleNavigationPanel()`, `sendMessage()`) only work when Joule runs in the same frame as the application. In FLP environments where the app runs in an iframe, these direct API calls are not available.

## How to obtain support
[Create an issue](https://github.com/SAP-samples/ui5-joule-frontend-actions/issues) in this repository if you find a bug or have questions about the content. But note that this is not a Joule or Joule web client support forum, but rather is provided by the UI5 team, which is a *user* of Joule like you are.
 
For additional support, [ask a question in SAP Community](https://answers.sap.com/questions/ask.html).

## Contributing
If you wish to contribute code, propose fixes or enhancements, please send a pull request. Due to legal reasons, contributors will be asked to accept a DCO when they create the first pull request to this project. This happens in an automated fashion during the submission process. SAP uses [the standard DCO text of the Linux Foundation](https://developercertificate.org/).

## License
Copyright (c) 2025 SAP SE or an SAP affiliate company. All rights reserved. This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the [LICENSE](LICENSE) file.
