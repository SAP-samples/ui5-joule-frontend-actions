// Type definitions for SAP DAS Web Client API and Bridge
// Project: window.sap.das.webclient
// Minimum TypeScript Version: 4.4

declare global {
  interface Window {
    sap: {
      das: {
        /**
         * SAP DAS Web Client API available at `window.sap.das.webclient`.
         * Use this API to control the Web Client and interact with conversations.
         */
        webclient: SAPDASWebClient;

        /**
         * Default bridge implementations for platform-specific behavior.
         * Do not overwrite these objects. You may call them explicitly from your custom bridge
         * if you want to delegate to the default handling.
         *
         * Example:
         * `window.sap.das.webclient.defaultBridge.s4.getApplicationContext(botName)`
         */
        // The defaultBridge is defined on SAPDASWebClient below.
      };

      /**
       * Legacy global path object for preregistration and legacy bridge usage.
       * Still supported for backward compatibility.
       */
      sapdas?: {
        /**
         * Preregistration container used when your app loads before the Web Client.
         * The Web Client will process these entries once available.
         *
         * Example:
         * window.sapdas.webclientPreregistration.myAppId = {
         *   callbacks: myBridgeImpl,
         *   thisContext: this,
         *   priority: window.sap.das.webclient.CALL_PRIORITY.DEFAULT
         * }
         */
        webclientPreregistration?: Record<
          string,
          {
            callbacks: WebClientBridge;
            thisContext?: any;
            priority?: number;
          }
        >;

        /**
         * Legacy object registration for the Web Client Bridge.
         * Prefer using `registerBridgeCallbacks()` on `window.sap.das.webclient`.
         */
        webclientBridge?: WebClientBridge | undefined;
      };
    };
  }
}

/**
 * Priority constants for bridge callback providers.
 * Higher values indicate higher priority.
 *
 * Execution modes:
 * - ALL: All registered callbacks are called (e.g., `onMessage`, `onOpen`, `onClose`)
 * - ONE_BY_PRIORITY: Only the highest priority callback is called (e.g., STT methods, `onNavigation`)
 * - MERGE: All callbacks are called and results are merged (e.g., `getApplicationContext`, `getFrontendActions`)
 */
export interface CallPriority {
  /** Lowest priority (0) */
  LOWEST: 0;
  /** Default priority (3) */
  DEFAULT: 3;
  /** High priority (6) */
  HIGH: 6;
  /** Highest priority (10) */
  HIGHEST: 10;
}

/** Helper type: value or Promise resolving to value */
export type MaybePromise<T> = T | Promise<T>;

/**
 * A conversation thread in the Web Client.
 * Returned by `getThreads()` and `newConversation()`.
 */
export interface WebClientThread {
  /** Time the thread was created (milliseconds since epoch) */
  created_at: number;
  /** True if the thread has no messages yet (e.g., Welcome screen) */
  empty: boolean;
  /** True if the thread is expired */
  expired: boolean;
  /** Timestamp of the last message (milliseconds since epoch) */
  last_message_timestamp: number;
  /** True if this is the most recently used thread */
  last_used: boolean;
  /** UUID of the thread */
  thread_id: string;
  /** Title of the thread */
  title: string;
}

/**
 * Position properties for initial display of the Joule iFrame.
 * Only one of 'left' or 'right', and one of 'top' or 'bottom' should be set to avoid layout conflicts.
 *
 * Default values if not provided (bridge `getInitialDisplayProperties`):
 * - top: 0
 * - bottom: '1rem'
 * - right: '1rem'
 * - left: 0
 * - zIndex: 11
 */
export interface InitialDisplayProperties {
  /** Top position value (valid CSS unit or number) */
  top?: string | number;
  /** Bottom position value (valid CSS unit or number) */
  bottom?: string | number;
  /** Left position value (valid CSS unit or number) */
  left?: string | number;
  /** Right position value (valid CSS unit or number) */
  right?: string | number;
  /** z-index for the iFrame container */
  zIndex?: number;
}

/**
 * Speech-To-Text configuration returned by `sttGetConfig`.
 * Returning an object from this method enables microphone features in the Web Client.
 */
export interface STTConfig {
  /**
   * If true, the Web Client records audio using the browser's MediaRecorder.
   * If false, implement recording yourself and provide audio via STT hooks.
   */
  useMediaRecorder: boolean;

  /**
   * Interval in milliseconds for interim audio chunks when using MediaRecorder.
   * Only relevant if `useMediaRecorder` is true.
   */
  interimResultTime?: number;

  /**
   * Metadata describing the audio format to be recorded.
   * Only relevant if `useMediaRecorder` is true.
   */
  audioMetaData?: {
    /** MIME type and codecs (e.g., 'audio/ogg;codecs=opus') */
    type?: string;
    /** File format identifier */
    fileFormat?: string;
    /** Encoding (e.g., 'opus') */
    encoding?: string;
    /** Additional provider-specific fields */
    [key: string]: any;
  };
}

/**
 * Metadata passed to STT start and audio handlers.
 * May include language and audio format details.
 */
export interface STTMetadata {
  /** Language code (e.g., 'en-US') */
  language?: string;
  /** Audio metadata (matches STTConfig.audioMetaData structure) */
  audioMetadata?: STTConfig['audioMetaData'];
  /** Additional provider-specific fields */
  [key: string]: any;
}

/**
 * Message payload received by `onMessage`.
 * Contains an array of assistant messages.
 */
export interface OnMessagePayload {
  /** Array of message objects returned by assistant */
  messages: any[];
  /** Additional fields may be present */
  [key: string]: any;
}

/**
 * Client info returned by `getClientInfo`.
 * Called on every user request to provide up-to-date frontend settings.
 */
export interface ClientInfo {
  /**
   * IANA timezone string (e.g., 'America/Los_Angeles').
   * https://en.wikipedia.org/wiki/Tz_database
   */
  timezone?: string;
  /** Additional client properties */
  [key: string]: any;
}

/**
 * Application context returned by `getApplicationContext`.
 * Called on every user request; payload:
 * - must be an object ≤ 10KB
 * - should contain at least one app-controlled key (e.g., app ID)
 */
export interface ApplicationContext {
  [key: string]: any;
}

/** Navigation resolution target returned by backend */
export interface NavigationResolutionTarget {
  /** Target URL */
  url: string;
  /** Optional launch type */
  launchType?: string;
}

/** Navigation resolution data from backend */
export interface NavigationResolution {
  /** Resolved navigation targets */
  targets?: NavigationResolutionTarget[];
  /** Errors encountered during resolution */
  errors?: any[];
  /** Additional fields may be present */
  [key: string]: any;
}

/**
 * Payload for `onNavigation`.
 * Contains IBN target/params and optional backend resolution results.
 */
export interface NavigationPayload {
  /** Intent-based navigation target descriptor */
  ibnTarget?: any;
  /** Intent-based navigation parameters */
  ibnParams?: any;
  /** Optional resolution results from backend */
  resolution?: NavigationResolution;
  /** Additional fields may be present */
  [key: string]: any;
}

/**
 * Result of `onNavigation`.
 * - 'handled': navigation handled by plugin or default logic
 * - 'not_handled': plugin did not handle; default logic executed
 * - 'failed': invalid payload or neither plugin nor default logic could handle
 *
 * Backward compatibility:
 * - `true` -> 'handled'
 * - `false` or `undefined` -> 'not_handled'
 */
export type NavigationResult = 'handled' | 'not_handled' | 'failed';

/**
 * Response object for `getCustomThemeRoot`.
 * Used when applying a custom theme via `setTheme(themeName)`.
 */
export interface CustomThemeRootInfo {
  /**
   * URL of the custom theme base CSS variables file.
   * Example: "{customThemeRoot}/Base/baseLib/{themeName}/css_variables.css"
   */
  baseCSSVariablesUrl: string;

  /**
   * Root URL of the UI5 theme folder.
   * Example: "{customThemeRoot}/UI5"
   */
  ui5ThemeRootUrl: string;
}

/** Function signature for a frontend action implementation. */
export type FrontendActionFunction = (
  /** Parameters provided by Joule for the action */
  params: Record<string, any>,
  /** Context information provided by Web Client */
  jouleContext: JouleContext
) => MaybePromise<any>;

/**
 * Frontend action descriptor returned by `getFrontendActions`.
 * Joule can invoke these actions in the host application.
 */
export interface FrontendAction {
  /** Unique identifier for the action (e.g., 'myapp.user.get_profile') */
  frontend_action_name: string;
  /** Implementation function of the action */
  function: FrontendActionFunction;
}

/**
 * Context object passed to frontend actions.
 * Use for logging, correlation, and assistant/thread awareness.
 */
export interface JouleContext {
  /** Name of the currently active assistant */
  assistantName: string;
  /** UUID of the current conversation thread */
  threadId: string;
  /** Correlation UUID for logging purposes */
  correlationId: string;
}

/** Speech-To-Text audio blob type used for interim/final audio handlers */
export type STTAudioBlob = Blob;

/**
 * Error thrown when the user lacks the required role to perform an action (e.g., open debug).
 */
export class MissingRoleError extends Error {}

/**
 * Error thrown when the viewport width is insufficient for a requested action (e.g., open debug view).
 */
export class InsufficientWidthError extends Error {}

/**
 * Error indicating that a limit has been reached (e.g., max number of conversations).
 */
export class LimitReachedError extends Error {}

/**
 * Error indicating the Web Client is busy and cannot perform the requested action at the moment.
 */
export class BusyError extends Error {}

/**
 * Error indicating a network-related problem prevented the operation.
 */
export class NetworkError extends Error {}

/**
 * Error thrown when arguments provided to a method are invalid (e.g., rename with empty title).
 */
export class InvalidArgumentError extends Error {}

/**
 * Web Client Bridge API interface.
 * Implement methods to extend/customize Web Client behavior.
 *
 * Note: All methods may return the documented type or a Promise resolving to it.
 * STT methods are inherently asynchronous; implement them with `async` in JavaScript.
 */
export interface WebClientBridge {
  /**
   * Called when the Web Client receives assistant response messages.
   * Use to react to incoming messages and update your application.
   *
   * Bug fix (Release 2411): Only delta responses are sent; on reload, `onMessage` is not called.
   */
  onMessage?: (payload: OnMessagePayload, botName: string) => MaybePromise<void>;

  /**
   * Called when the Web Client is closed.
   * Available since Release 2411 (Nov 2024).
   */
  onClose?: (botName: string) => MaybePromise<void>;

  /**
   * Called when an application/component is loaded.
   * Available since Release 2411 (Nov 2024).
   */
  onLoad?: (botName: string) => MaybePromise<void>;

  /**
   * Called when the Web Client is opened.
   * Available since Release 2411 (Nov 2024).
   */
  onOpen?: (botName: string) => MaybePromise<void>;

  /** Called when the Web Client is expanded to fullscreen. */
  onExpand?: (botName: string) => MaybePromise<void>;

  /** Called when the Web Client collapses out of fullscreen. */
  onCollapse?: (botName: string) => MaybePromise<void>;

  /** Called when the Debug View is opened or closed. */
  onDebugStateChange?: (viewState: boolean, botName: string) => MaybePromise<void>;

  /**
   * Called when a new conversation is created (e.g., clicking New Conversation
   * or automatically after deleting the current one).
   */
  onConversationCreated?: (conversationId: string, botName: string) => MaybePromise<void>;

  /** Called when a conversation is deleted. */
  onConversationDeleted?: (conversationId: string, botName: string) => MaybePromise<void>;

  /** Called when a conversation expires. */
  onConversationExpired?: (conversationId: string, botName: string) => MaybePromise<void>;

  /** Called when a conversation is selected. */
  onConversationSelected?: (conversationId: string, botName: string) => MaybePromise<void>;

  /**
   * Called when a detail view is displayed in Web Client or navigated back from.
   * Available since Release 2510 (Oct 2025).
   *
   * @param state True if the current view can be navigated back from; false after navigating back.
   * @param view The associated view name.
   */
  onBackNavigationStateChange?: (state: boolean, view: string, botName: string) => MaybePromise<void>;

  /**
   * Called on every user request to provide user-specific frontend data to Joule.
   * Values can change during the lifetime of a conversation.
   */
  getClientInfo?: (botName: string) => MaybePromise<ClientInfo>;

  /**
   * Called on every user request to provide application context payload.
   * Payload must be an object ≤ 10KB and contain at least one app-controlled key.
   */
  getApplicationContext?: (botName: string) => MaybePromise<ApplicationContext>;

  /**
   * Called when a user triggers a navigation action using a navigation button.
   * Prefer default implementations for S/4 and Workzone unless customization is required.
   *
   * Return 'handled' | 'not_handled' | 'failed'.
   * Backward compatible with boolean/undefined:
   *  - true => 'handled'
   *  - false/undefined => 'not_handled'
   */
  onNavigation?: (payload: NavigationPayload, botName: string) => MaybePromise<NavigationResult>;

  /**
   * Called when `setTheme(themeName)` is used with a custom theme.
   * Return URLs for the custom theme CSS variables file and UI5 theme root.
   */
  getCustomThemeRoot?: (themeName: string) => MaybePromise<CustomThemeRootInfo>;

  /**
   * Return initial display properties (position and zIndex) used the first time
   * the component is displayed. Only one of 'left' or 'right', and one of 'top' or 'bottom'
   * should be set to avoid layout conflicts.
   */
  getInitialDisplayProperties?: () => MaybePromise<InitialDisplayProperties>;

  /**
   * Provide additional environment information for the support.zip created via
   * About -> "Download Trace". Useful for non S/4 / Workzone apps to help support analysis.
   */
  getSupportInfo?: () => MaybePromise<Record<string, any>>;

  /**
   * Return an array of frontend actions currently available in the host application.
   * Joule can invoke these actions with parameters and context.
   */
  getFrontendActions?: (jouleContext: JouleContext) => MaybePromise<FrontendAction[]>;

  // Speech-To-Text integration (async behavior expected)

  /**
   * Return an object with STT configuration settings.
   * Must be implemented and return an object to enable microphone features in Web Client.
   */
  sttGetConfig?: (botName: string) => MaybePromise<STTConfig>;

  /**
   * Called at the beginning of a new microphone interaction.
   * Use to initialize your STT service session (e.g., create WebSocket client).
   *
   * `params[0]` contains metadata: `{ language, audioMetadata }`.
   */
  sttStartListening?: (params: [STTMetadata?], botName: string) => MaybePromise<void>;

  /**
   * Called to notify that listening should be stopped, but ongoing transcription
   * should still complete and deliver final results. Do not abort in-progress
   * work abruptly (e.g., close socket after a short grace period).
   */
  sttStopListening?: (botName: string) => MaybePromise<void>;

  /**
   * Called to immediately abort the current listening session and dismiss any results.
   * Close service connections without waiting for final results.
   */
  sttAbort?: (botName: string) => MaybePromise<void>;

  /**
   * Called with the final audio blob when `useMediaRecorder: true` is returned by `sttGetConfig`.
   * The Web Client stops recording (e.g., after silence detection) and passes the final blob.
   */
  sttOnFinalAudioData?: (params: [STTAudioBlob, STTMetadata?], botName: string) => MaybePromise<void>;

  /**
   * Called with interim audio blobs at intervals specified by `interimResultTime`
   * when `useMediaRecorder: true`. Use for live transcription if your STT supports it.
   */
  sttOnInterimAudioData?: (params: [STTAudioBlob, STTMetadata?], botName: string) => MaybePromise<void>;
}

/**
 * SAP DAS Web Client API available at `window.sap.das.webclient`.
 * Use to control visibility, theming, conversations, navigation, and bridge registration.
 */
export interface SAPDASWebClient {
  // Visibility and layout controls

  /**
   * Open the Web Client, if fully loaded in the parent application.
   */
  show(): void;

  /**
   * Close the Web Client.
   */
  hide(): void;

  /**
   * Toggle visibility (show/hide) of the Web Client.
   * Suitable for attaching to application buttons.
   */
  toggle(): void;

  /**
   * Expand the Web Client to fullscreen mode.
   */
  expand(): void;

  /**
   * Collapse the Web Client out of fullscreen mode.
   */
  collapse(): void;

  /**
   * Toggle fullscreen expand/collapse.
   */
  toggleFullScreen(): void;

  // Debug view controls

  /**
   * Open the debug view.
   * Throws:
   * - `MissingRoleError`
   * - `InsufficientWidthError`
   */
  openDebug(): Promise<void>;

  /**
   * Close the debug view.
   */
  closeDebug(): void;

  /**
   * Toggle open/close of the debug view.
   * Throws:
   * - `MissingRoleError`
   * - `InsufficientWidthError`
   */
  toggleDebug(): Promise<void>;

  // Theming

  /**
   * Set the theme of the Web Client.
   * For custom themes, the bridge `getCustomThemeRoot(themeName)` will be called.
   *
   * @param themeName The theme name to be set.
   */
  setTheme(themeName: string): void;

  // Messaging and conversations

  /**
   * Send a message to the underlying assistant.
   *
   * @param message The message string to be sent.
   * @param conversationId Optional: ID of the conversation to send the message to.
   * @param selectThread Optional: If true, select the thread identified by `conversationId` before sending.
   */
  sendMessage(message: string, conversationId?: string, selectThread?: boolean): void;

  /**
   * Deprecated with multi-conversation. Forwards to `newConversation()` and may throw the same errors.
   * Resets the current conversation and starts a new one.
   *
   * @deprecated Use `newConversation()` instead.
   */
  resetConversation(): Promise<WebClientThread>;

  /**
   * Create a new conversation and return the conversation object.
   * Throws:
   * - `LimitReachedError`
   * - `BusyError`
   * - `NetworkError`
   */
  newConversation(): Promise<WebClientThread>;

  /**
   * Delete the currently selected conversation or the conversation with the provided ID.
   * Does nothing on the Welcome screen (new conversation).
   *
   * @param conversationId Optional ID of conversation to delete.
   */
  deleteConversation(conversationId?: string): void;

  /**
   * Rename the currently selected conversation or the conversation with the provided ID.
   * Does nothing on the Welcome screen (new conversation).
   *
   * Throws:
   * - `InvalidArgumentError`
   *
   * @param title New title for the conversation.
   * @param conversationId Optional ID of conversation to rename.
   */
  renameConversation(title: string, conversationId?: string): Promise<void>;

  // Navigation panel

  /**
   * Open the conversation navigation panel.
   */
  openNavigationPanel(): void;

  /**
   * Close the conversation navigation panel.
   */
  closeNavigationPanel(): void;

  /**
   * Toggle the conversation navigation panel.
   */
  toggleNavigationPanel(): void;

  // In-app navigation

  /**
   * Trigger back navigation in the Web Client if available (e.g., from a detail view).
   * Does nothing if back navigation is not possible.
   */
  navBack(): void;

  // Initial display settings

  /**
   * Set the initial display position of the Joule iFrame.
   * Only one of 'left' or 'right', and one of 'top' or 'bottom' should be defined.
   *
   * @param param Position/z-index values.
   */
  setInitialDisplayPosition(param: InitialDisplayProperties): void;

  /**
   * Set the z-index on the Joule iFrame.
   *
   * @param zIndex The z-index number.
   */
  setInitialZIndex(zIndex: number): void;

  // Assistants

  /**
   * Show the list of available assistants (if more than one is configured).
   * Does nothing otherwise.
   */
  showAssistantsSelection(): void;

  /**
   * Switch to the specified assistant.
   * Internal only; not for production use.
   *
   * @internal
   */
  switchAssistant(assistantName: string): void;

  // STT interim/final text to UI

  /**
   * Send a final or interim Speech-To-Text transcription result to the Web Client.
   * If `final` is true, exits listening mode and sends the text as a message.
   * If false, updates text while remaining in listening mode.
   *
   * @param result `{ text: string; final: boolean }`
   */
  onSTTResult(result: { text: string; final: boolean }): void;

  // Bridge registration (recommended)

  /**
   * Register bridge callbacks with a unique provider ID.
   * Recommended approach for multiple components providing callbacks.
   *
   * @param providerId Unique identifier for the callback provider.
   * @param callbacks Object containing the callback methods to register.
   * @param thisContext Optional `this` context to bind to callback methods.
   * @param priority Optional priority level (see `CALL_PRIORITY`).
   */
  registerBridgeCallbacks(
    providerId: string,
    callbacks: WebClientBridge,
    thisContext?: any,
    priority?: number
  ): void;

  /**
   * Unregister bridge callbacks for the specified provider ID.
   *
   * @param providerId Unique identifier of the callback provider to unregister.
   */
  unregisterBridgeCallbacks(providerId: string): void;

  // Threads

  /**
   * Return the list of threads.
   *
   * @param activeOnly If true or not provided, returns active threads.
   *                   If false, returns all threads including expired.
   */
  getThreads(activeOnly?: boolean): Promise<WebClientThread[]>;

  // Scenario filtering

  /**
   * Filter a given list of scenarios based on current user access and visibility conditions.
   *
   * @param scenariosArray Object containing `scenarios: Array<{ namespace, capability, name }>`
   * @returns The filtered scenarios payload (same structure as input).
   */
  filterScenariosByAccess(scenariosArray: {
    scenarios: Array<{ namespace: string; capability: string; name: string }>;
    [key: string]: any;
  }): Promise<{ scenarios: Array<{ namespace: string; capability: string; name: string }>; [key: string]: any }>;

  // Cleanup

  /**
   * Clean up the Web Client.
   * Destroys the Joule iFrame, unsubscribes/disconnects WebSocket, and cleans up handlers.
   * Use with caution; recommended only for special cases (e.g., reinitialize without full reload).
   */
  destroy(): void;

  // Constants

  /**
   * Priority constants for bridge providers.
   */
  CALL_PRIORITY: CallPriority;

  // Default bridge implementations

  /**
   * Default bridge implementations (S/4 and Workzone).
   * Do not overwrite these objects. You may call them explicitly from your custom bridge.
   */
  defaultBridge: {
    /** Default implementation for S/4 platform */
    s4: WebClientBridge;
    /** Default implementation for Workzone platform */
    workzone: WebClientBridge;
  };
}

export {};