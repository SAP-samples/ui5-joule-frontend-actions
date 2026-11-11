// Type definitions for SAP DAS Web Client Bridge API
// Project: window.sap.das.webclient
// Covers only the officially documented bridge API:
//   https://help.sap.com/docs/joule/joule-development-guide-ba88d1ec6a1b442098863d577c19b0c0/developer-guide-for-joule-web-client
// Minimum TypeScript Version: 4.4

declare global {
  interface Window {
    sap: {
      das: {
        webclient: SAPDASWebClient;
      };
    };
    // Legacy global path for preregistration and legacy bridge (window.sapdas, NOT window.sap.sapdas)
    sapdas?: {
      webclientPreregistration?: Record<
        string,
        {
          callbacks: WebClientBridge;
          thisContext?: any;
          priority?: number;
        }
      >;
      webclientBridge?: WebClientBridge | undefined;
    };
  }
}

/** Priority constants for bridge callback providers */
export interface CallPriority {
  LOWEST: 0;
  DEFAULT: 3;
  HIGH: 6;
  HIGHEST: 10;
}

export type MaybePromise<T> = T | Promise<T>;

/** Position properties for bridge getInitialDisplayProperties */
export interface InitialDisplayProperties {
  top?: string | number;
  bottom?: string | number;
  left?: string | number;
  right?: string | number;
  zIndex?: number;
}

/** STT configuration returned by sttGetConfig */
export interface STTConfig {
  useMediaRecorder: boolean;
  interimResultTime?: number;
  audioMetaData?: {
    type?: string; // e.g. 'audio/ogg;codecs=opus'
    fileFormat?: string;
    encoding?: string; // e.g. 'opus'
    [key: string]: any;
  };
}

/** STT start/metadata payload provided by Web Client */
export interface STTMetadata {
  language?: string;
  audioMetadata?: STTConfig['audioMetaData'];
  [key: string]: any;
}

/** Message payload sent to onMessage */
export interface OnMessagePayload {
  messages: any[];
  conversationId?: string;
  [key: string]: any;
}

/** Client info payload returned by getClientInfo */
export interface ClientInfo {
  timezone?: string; // IANA timezone string, e.g. 'America/Los_Angeles'
  [key: string]: any;
}

/** Application context payload returned by getApplicationContext */
export interface ApplicationContext {
  [key: string]: any; // size <= 10KB; must contain at least one app-controlled key
}

/** Navigation payload for onNavigation */
export interface NavigationResolutionTarget {
  url: string;
  launchType?: string;
}

export interface NavigationResolution {
  targets?: NavigationResolutionTarget[];
  errors?: any[];
  [key: string]: any;
}

export interface NavigationPayload {
  ibnTarget?: any;
  ibnParams?: any;
  resolution?: NavigationResolution;
  [key: string]: any;
}

export type NavigationResult = 'handled' | 'not_handled' | 'failed';

/** getCustomThemeRoot return object */
export interface CustomThemeRootInfo {
  baseCSSVariablesUrl: string;
  ui5ThemeRootUrl: string;
}

/** Frontend action function signature */
export type FrontendActionFunction = (
  params: Record<string, any>,
  jouleContext: JouleContext
) => MaybePromise<any>;

/** Frontend action object */
export interface FrontendAction {
  frontend_action_name: string; // unique identifier
  function: FrontendActionFunction;
}

/** Joule context provided to frontend actions */
export interface JouleContext {
  assistant_name: string;
  thread_id: string;
  correlation_id: string;
}

/** Speech-to-Text audio blobs provided to interim/final handlers */
export type STTAudioBlob = Blob;

/** Bridge API interface (methods can return value or Promise resolving to that value) */
export interface WebClientBridge {
  // Event callbacks
  onMessage?: (payload: OnMessagePayload, botName: string) => MaybePromise<void>;
  onClose?: (botName: string) => MaybePromise<void>;
  onLoad?: (botName: string) => MaybePromise<void>;
  onOpen?: (botName: string) => MaybePromise<void>;
  onExpand?: (botName: string) => MaybePromise<void>;
  onCollapse?: (botName: string) => MaybePromise<void>;
  onDebugStateChange?: (viewState: boolean, botName: string) => MaybePromise<void>;
  onConversationCreated?: (conversationId: string, botName: string) => MaybePromise<void>;
  onConversationDeleted?: (conversationId: string, botName: string) => MaybePromise<void>;
  onConversationExpired?: (conversationId: string, botName: string) => MaybePromise<void>;
  onConversationSelected?: (conversationId: string, botName: string) => MaybePromise<void>;
  /** Available in Release 2510 (Oct 2025) */
  onBackNavigationStateChange?: (state: boolean, view: string, botName: string) => MaybePromise<void>;

  // Additional event callbacks
  onFailedToLoad?: (botName: string | null) => MaybePromise<void>;
  onBlockingError?: (errorCode: string | number, botName: string) => MaybePromise<void>;
  onDock?: (dockState: string, botName: string) => MaybePromise<void>;
  logout?: (botName: string) => MaybePromise<void>;

  // Query callbacks
  getClientInfo?: (botName: string) => MaybePromise<ClientInfo>;
  getApplicationContext?: (botName: string) => MaybePromise<ApplicationContext>;
  onNavigation?: (payload: NavigationPayload, botName: string) => MaybePromise<NavigationResult>;
  getCustomThemeRoot?: (themeName: string) => MaybePromise<CustomThemeRootInfo>;
  getInitialDisplayProperties?: () => MaybePromise<InitialDisplayProperties>;
  getSupportInfo?: (botName: string) => MaybePromise<Record<string, any>>;
  getFrontendActions?: (jouleContext: JouleContext) => MaybePromise<FrontendAction[]>;

  // Speech-To-Text integration (must be async in implementation)
  sttGetConfig?: (botName: string) => MaybePromise<STTConfig>;
  sttStartListening?: (params: [STTMetadata?], botName: string) => MaybePromise<void>;
  sttStopListening?: (botName: string) => MaybePromise<void>;
  sttAbort?: (botName: string) => MaybePromise<void>;
  sttOnFinalAudioData?: (params: [STTAudioBlob, STTMetadata?], botName: string) => MaybePromise<void>;
  sttOnInterimAudioData?: (params: [STTAudioBlob, STTMetadata?], botName: string) => MaybePromise<void>;
}

/** Web Client API surface available at window.sap.das.webclient (bridge registration only) */
export interface SAPDASWebClient {
  // Bridge registration (recommended)
  registerBridgeCallbacks(
    providerId: string,
    callbacks: WebClientBridge,
    thisContext?: any,
    priority?: number
  ): void;

  unregisterBridgeCallbacks(providerId: string): void;

  // Constants
  CALL_PRIORITY: CallPriority;

  // Default bridge implementations (do not overwrite; call explicitly if needed)
  defaultBridge: {
    s4: WebClientBridge;
    workzone: WebClientBridge;
  };
}

export {};
