import { OAuth2Client } from 'google-auth-library';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import open from 'open';
import {
  loadConfig,
  saveConfig,
  loadTokens,
  saveTokens,
  clearTokens,
  configDir,
} from './config';
import type { AppConfig } from './config';

const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive.file',
];

const REDIRECT_PORT = 8085;
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}`;

function createOAuth2Client(config: AppConfig): OAuth2Client {
  return new OAuth2Client(config.client_id, config.client_secret, REDIRECT_URI);
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function setup(): Promise<void> {
  console.log('Configure Google OAuth credentials.');
  console.log('Create a Web Application OAuth client at https://console.cloud.google.com/apis/credentials');
  console.log(`Add this as an authorised redirect URI: ${REDIRECT_URI}\n`);

  const clientId = await prompt('Client ID: ');
  const clientSecret = await prompt('Client Secret: ');

  if (!clientId || !clientSecret) {
    console.error('Both client ID and client secret are required.');
    process.exit(1);
  }

  saveConfig({ client_id: clientId, client_secret: clientSecret });
  console.log(`\nCredentials saved to ${configDir()}/config.json`);
}

export async function login(): Promise<void> {
  const config = loadConfig();
  if (!config) {
    console.error('No credentials configured. Run "mark-slide auth setup" first.');
    process.exit(1);
  }

  // Start a local server to receive the OAuth callback
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${REDIRECT_PORT} is already in use. Close the other process and try again.`));
      } else {
        reject(err);
      }
    });
    server.listen(REDIRECT_PORT, '127.0.0.1', resolve);
  });

  const client = createOAuth2Client(config);
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('Opening browser for Google authentication...');
  await open(authUrl);
  console.log(`If the browser doesn't open, visit:\n${authUrl}\n`);

  // Wait for the callback
  const code = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Authentication timed out after 5 minutes'));
    }, 5 * 60 * 1000);

    server.on('request', async (req, res) => {
      try {
        const url = new URL(req.url || '', REDIRECT_URI);
        const authCode = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication failed</h1><p>You can close this window.</p>');
          clearTimeout(timeout);
          server.close();
          reject(new Error(`Authentication error: ${error}`));
          return;
        }

        if (authCode) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication successful!</h1><p>You can close this window.</p>');
          clearTimeout(timeout);
          server.close();
          resolve(authCode);
        }
      } catch (err) {
        clearTimeout(timeout);
        server.close();
        reject(err);
      }
    });
  });

  // Exchange code for tokens
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain tokens from Google');
  }

  saveTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
    token_type: tokens.token_type || 'Bearer',
    scope: tokens.scope || SCOPES.join(' '),
  });

  console.log('Authentication successful! Tokens saved.');
}

export function status(): void {
  const config = loadConfig();
  if (!config) {
    console.log('Not configured. Run "mark-slide auth setup" first.');
    return;
  }
  console.log(`Config directory: ${configDir()}`);
  console.log(`Client ID: ${config.client_id.substring(0, 20)}...`);

  const tokens = loadTokens();
  if (!tokens) {
    console.log('Status: not authenticated');
    return;
  }

  const expired = tokens.expiry_date < Date.now();
  if (expired && tokens.refresh_token) {
    console.log('Status: authenticated (token expired, will refresh on next use)');
  } else if (expired) {
    console.log('Status: token expired, no refresh token. Run "mark-slide auth login".');
  } else {
    const expiresIn = Math.round((tokens.expiry_date - Date.now()) / 1000 / 60);
    console.log(`Status: authenticated (token expires in ${expiresIn} minutes)`);
  }
}

export function logout(): void {
  clearTokens();
  console.log('Tokens cleared.');
}

/**
 * Get a valid access token, refreshing if necessary.
 */
export async function getAccessToken(): Promise<string> {
  const config = loadConfig();
  if (!config) {
    console.error('No credentials configured. Run "mark-slide auth setup" first.');
    process.exit(1);
  }

  const tokens = loadTokens();
  if (!tokens) {
    console.error('Not authenticated. Run "mark-slide auth login" first.');
    process.exit(1);
  }

  // If token is still valid (with 5 min buffer), return it
  if (tokens.expiry_date > Date.now() + 5 * 60 * 1000) {
    return tokens.access_token;
  }

  // Refresh the token
  if (!tokens.refresh_token) {
    console.error('Token expired and no refresh token available. Run "mark-slide auth login".');
    process.exit(1);
  }

  const client = createOAuth2Client(config);
  client.setCredentials({ refresh_token: tokens.refresh_token });

  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }

  saveTokens({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token || tokens.refresh_token,
    expiry_date: credentials.expiry_date || Date.now() + 3600 * 1000,
    token_type: credentials.token_type || 'Bearer',
    scope: tokens.scope,
  });

  return credentials.access_token;
}
