import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.claude.json');
const BACKUP_DIR = path.join(os.homedir(), '.claude-mcp-backups');

export interface MCPServer {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  [key: string]: any;
}

export interface ClaudeConfig {
  mcpServers: Record<string, MCPServer>;
  _disabled_mcpServers?: Record<string, MCPServer>;
  [key: string]: any;
}

/**
 * Ensures backup directory exists
 */
function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Creates a timestamped backup of the config file
 */
export function createBackup(): string {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Claude config not found at ${CONFIG_PATH}`);
  }

  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `claude-${timestamp}.json`);

  fs.copyFileSync(CONFIG_PATH, backupPath);

  return backupPath;
}

/**
 * Loads the Claude config file
 */
export function loadConfig(): ClaudeConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `Claude config not found at ${CONFIG_PATH}\n` +
      'Make sure Claude Code is installed and you have run it at least once.'
    );
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse Claude config: ${error}`);
  }
}

/**
 * Saves the Claude config file with automatic backup
 */
export function saveConfig(config: ClaudeConfig): void {
  // Create backup before modifying
  const backupPath = createBackup();

  try {
    // Validate JSON can be stringified
    const jsonString = JSON.stringify(config, null, 2);

    // Write to config file
    fs.writeFileSync(CONFIG_PATH, jsonString, 'utf-8');
  } catch (error) {
    // If write fails, restore from backup
    fs.copyFileSync(backupPath, CONFIG_PATH);
    throw new Error(`Failed to save config (restored from backup): ${error}`);
  }
}

/**
 * Gets list of all enabled MCP servers
 */
export function getEnabledServers(config: ClaudeConfig): string[] {
  return Object.keys(config.mcpServers || {});
}

/**
 * Gets list of all disabled MCP servers
 */
export function getDisabledServers(config: ClaudeConfig): string[] {
  return Object.keys(config._disabled_mcpServers || {});
}

/**
 * Gets all servers (enabled + disabled)
 */
export function getAllServers(config: ClaudeConfig): string[] {
  return [...getEnabledServers(config), ...getDisabledServers(config)];
}

/**
 * Checks if a server exists (enabled or disabled)
 */
export function serverExists(config: ClaudeConfig, serverName: string): boolean {
  return getAllServers(config).includes(serverName);
}

/**
 * Checks if a server is currently enabled
 */
export function isServerEnabled(config: ClaudeConfig, serverName: string): boolean {
  return getEnabledServers(config).includes(serverName);
}

/**
 * Disables a server by moving it to _disabled_mcpServers
 */
export function disableServer(config: ClaudeConfig, serverName: string): ClaudeConfig {
  if (!config.mcpServers[serverName]) {
    throw new Error(`Server "${serverName}" is not enabled or does not exist`);
  }

  // Initialize disabled section if it doesn't exist
  if (!config._disabled_mcpServers) {
    config._disabled_mcpServers = {};
  }

  // Move server from enabled to disabled
  config._disabled_mcpServers[serverName] = config.mcpServers[serverName];
  delete config.mcpServers[serverName];

  return config;
}

/**
 * Enables a server by moving it from _disabled_mcpServers to mcpServers
 */
export function enableServer(config: ClaudeConfig, serverName: string): ClaudeConfig {
  if (!config._disabled_mcpServers?.[serverName]) {
    throw new Error(`Server "${serverName}" is not disabled or does not exist`);
  }

  // Move server from disabled to enabled
  config.mcpServers[serverName] = config._disabled_mcpServers[serverName];
  delete config._disabled_mcpServers[serverName];

  // Clean up empty disabled section
  if (Object.keys(config._disabled_mcpServers).length === 0) {
    delete config._disabled_mcpServers;
  }

  return config;
}

/**
 * Toggles a server between enabled and disabled
 */
export function toggleServer(config: ClaudeConfig, serverName: string): ClaudeConfig {
  if (isServerEnabled(config, serverName)) {
    return disableServer(config, serverName);
  } else if (config._disabled_mcpServers?.[serverName]) {
    return enableServer(config, serverName);
  } else {
    throw new Error(`Server "${serverName}" does not exist`);
  }
}

/**
 * Gets the configuration path
 */
export function getConfigPath(): string {
  return CONFIG_PATH;
}

/**
 * Gets the backup directory path
 */
export function getBackupDir(): string {
  return BACKUP_DIR;
}
