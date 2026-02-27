import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const APP_NAME = 'mark-slide';

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
  scope: string;
}

export interface AppConfig {
  client_id: string;
  client_secret: string;
}

function getConfigDir(): string {
  const platform = process.platform;
  const home = homedir();

  if (platform === 'win32') {
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
    return join(appData, APP_NAME);
  }

  if (platform === 'darwin') {
    return join(home, 'Library', 'Application Support', APP_NAME);
  }

  // Linux and others: XDG
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(home, '.config');
  return join(xdgConfig, APP_NAME);
}

function ensureConfigDir(): string {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function loadConfig(): AppConfig | null {
  const configPath = join(getConfigDir(), 'config.json');
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8')) as AppConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: AppConfig): void {
  const dir = ensureConfigDir();
  writeFileSync(join(dir, 'config.json'), JSON.stringify(config, null, 2), 'utf-8');
}

export function loadTokens(): StoredTokens | null {
  const tokensPath = join(getConfigDir(), 'tokens.json');
  if (!existsSync(tokensPath)) return null;
  try {
    return JSON.parse(readFileSync(tokensPath, 'utf-8')) as StoredTokens;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: StoredTokens): void {
  const dir = ensureConfigDir();
  writeFileSync(join(dir, 'tokens.json'), JSON.stringify(tokens, null, 2), 'utf-8');
}

export function clearTokens(): void {
  const tokensPath = join(getConfigDir(), 'tokens.json');
  if (existsSync(tokensPath)) {
    unlinkSync(tokensPath);
  }
}

export function configDir(): string {
  return getConfigDir();
}
