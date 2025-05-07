// Google Auth service using Google Identity Services client library

// Configuration
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/presentations';
const TOKEN_KEY = 'google_auth_token';

/**
 * Declare types for Google Identity Services
 */
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
          revoke: (token: string, callback: () => void) => void;
        }
      }
    }
  }
}

// Types
interface TokenResponse {
  access_token: string;
  expires_in: number;
  expires_at?: number;
  scope: string;
  token_type: string;
  error?: string;
}

interface TokenClient {
  callback: ((response: TokenResponse) => void) | null;
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
}

let tokenClient: TokenClient | null = null;
let cachedToken: string | null = null;

/**
 * Initialize the Google Auth token client
 */
export function initGoogleAuth(): Promise<void> {
  return new Promise((resolve) => {
    // Check if the client is already initialized
    if (tokenClient) {
      resolve();
      return;
    }

    // Load cached token if available
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      try {
        const tokenData = JSON.parse(savedToken) as TokenResponse;
        // Check if token is still valid (with 5 min buffer)
        if (tokenData.expires_at && tokenData.expires_at > Date.now() + 300000) {
          cachedToken = tokenData.access_token;
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      }
    }

    // Wait for Google Identity Services to load
    const checkGsiLoaded = () => {
      if (window.google?.accounts?.oauth2) {
        // Initialize token client
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (tokenResponse: TokenResponse) => {
            // Token request completed - no specific callback needed
            // Store token with expiration
            if (tokenResponse.access_token) {
              const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
              const tokenToStore = {
                ...tokenResponse,
                expires_at: expiresAt
              };
              localStorage.setItem(TOKEN_KEY, JSON.stringify(tokenToStore));
              cachedToken = tokenResponse.access_token;
            }
          }
        });
        resolve();
      } else {
        // Check again in 100ms
        setTimeout(checkGsiLoaded, 100);
      }
    };
    
    checkGsiLoaded();
  });
}

/**
 * Get a valid access token
 * - Returns cached token if available and valid
 * - Automatically requests a new token if needed
 */
export async function getAccessToken(): Promise<string> {
  await initGoogleAuth();

  // If we have a cached token, return it
  if (cachedToken) {
    return cachedToken;
  }

  // Request a new token
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Auth not initialized'));
      return;
    }

    // Override the callback temporarily to get the token
    const originalCallback = tokenClient.callback;
    tokenClient.callback = (response: TokenResponse) => {
      // Restore original callback
      if (originalCallback) {
        tokenClient!.callback = originalCallback;
      }

      if (response.error) {
        reject(new Error(`Auth error: ${response.error}`));
        return;
      }

      // Store token with expiration
      if (response.access_token) {
        const expiresAt = Date.now() + (response.expires_in * 1000);
        const tokenToStore = {
          ...response,
          expires_at: expiresAt
        };
        localStorage.setItem(TOKEN_KEY, JSON.stringify(tokenToStore));
        cachedToken = response.access_token;
        resolve(response.access_token);
      } else {
        reject(new Error('No access token returned'));
      }
    };

    // Request an access token
    tokenClient.requestAccessToken({
      prompt: ''  // '' for auto, 'consent' to force consent screen
    });
  });
}

/**
 * Clear the stored token
 */
export function signOut(): void {
  localStorage.removeItem(TOKEN_KEY);
  cachedToken = null;
  
  // Revoke the token if google.accounts.oauth2 is available
  if (window.google?.accounts?.oauth2 && cachedToken) {
    window.google.accounts.oauth2.revoke(cachedToken, () => {
      console.log('Token revoked');
    });
  }
} 