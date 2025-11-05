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

### 4. Adapt the HTML file which loads Joule

To be active in the page, the Joule web client needs to be loaded. This could be done by a shell embedding the applications, like SAP Fiori Launchpad. But in this standalone application, we [load Joule explicitly using a script tag](https://help.sap.com/docs/joule/joule-development-guide-4b327297dce247fcb88a5f5bfeea97a1/integrating-joule-using-script) in `index.html` / `index-cdn.html` (it does not matter which one you launch in the browser, but the latter usually loads faster, as it does not use the local dev resources of UI5). 

In case you changed the assistant name `ui5_frontend_actions` to something else when deploying the assistant, then this term also needs to be changed in the script tag.

At minimum, replace `<your_das_tenant_URL>` in the script tag of `index.html` or `index-cdn.html`:

```html
		<script src="https://<your_das_tenant_URL>.sapdas.cloud.sap/resources/public/webclient/bootstrap.js"
			data-bot-name="ui5_frontend_actions"
			data-expander-type="DEFAULT"
		></script>
```

The `data-expander-type` attribute determines what kind of icon/button opens the Joule web client.

## Run the App

To run the app in watch mode:

```sh
npm start
```

As shown in the terminal after executing this command, the app is then running on http://localhost:8080/index.html / http://localhost:8080/index-cdn.html. A browser window with this URL should automatically open and you should see the purple Joule icon in the bottom right.

> **IMPORTANT**: Joule will **not** load successfully when clicking the icon because Joule has strict rules (CSP settings) in which domains it may be embedded. `localhost` is not one of them. One solution is to deploy the app on *.ondemand.com, which is an allowed domain. There is also a way to [configure the allowlisted domains](https://help.sap.com/docs/joule/service-guide/custom-domain-configuration-for-joule?locale=en-US).


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

In `Main.controller.js`, there is the `initJoule` function, which sets up the connection with the Joule web client and declares the available frontend functions. The array of actions

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

connects the function names and parameters we have declared in the Joule capability above with concrete UI5 controller methods `getFields()` and `setTheme(...)`. This array is returned by the `getFrontendActions` callback function, which is registered with Joule as part of the `jouleCallbacks` and invoked every time the user sends a prompt to Joule. This allows the app to decide at the exact moment the prompt is triggered which actions are currently available. Scenarios which require unavailable functions are not available in Joule when this user prompt is handled.

The `registerBridgeCallback` encapsulates the check whether Joule is already loaded or not, as there are different ways of setting up the connection in both situations.

Further down, the controller methods `setTheme` and `getFields` implement the actual action inside the UI5 application - setting the theme and extracting data. `getFields` simply returns a map, `setTheme` returns an object with a `success` flag and a `message`. Note that the returned object is available as `.content` property of the result variable in the Joule function definition. This means you get it by accessing `frontendActionResult.content`, not by referring to `frontendActionResult` itself.

Note that the actions are not necessarily good choices to be implemented on application level, nor

### Bonus: API interaction with the Joule web client

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
In this application, Joule only works when the Joule tenant URL is properly filled in the used HTML file and the domain of the hosting UI5 application is contained in the allowlist applied by Joule (both as explained earlier).

## How to obtain support
[Create an issue](https://github.com/SAP-samples/ui5-joule-frontend-actions/issues) in this repository if you find a bug or have questions about the content. But note that this is not a Joule or Joule web client support forum, but rather is provided by the UI5 team, which is a *user* of Joule like you are.
 
For additional support, [ask a question in SAP Community](https://answers.sap.com/questions/ask.html).

## Contributing
If you wish to contribute code, propose fixes or enhancements, please send a pull request. Due to legal reasons, contributors will be asked to accept a DCO when they create the first pull request to this project. This happens in an automated fashion during the submission process. SAP uses [the standard DCO text of the Linux Foundation](https://developercertificate.org/).

## License
Copyright (c) 2025 SAP SE or an SAP affiliate company. All rights reserved. This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the [LICENSE](LICENSE) file.
