import fs from 'fs';
import path from 'path';
import os from 'os';
import { BaseAdapter, type MCPConfig, type MCPServer } from './base.js';

// VS Code user settings location
const VSCODE_CONFIG_DIR = path.join(
  os.homedir(),
  process.platform === 'darwin'
    ? 'Library/Application Support/Code/User'
    : process.platform === 'win32'
    ? 'AppData/Roaming/Code/User'
    : '.config/Code/User'
);
const CONFIG_PATH = path.join(VSCODE_CONFIG_DIR, 'settings.json');
const BACKUP_DIR = path.join(os.homedir(), '.claude-mcp-backups', 'cline');

interface VSCodeSettings {
  'cline.mcpServers'?: Record<string, MCPServer>;
  'cline._disabled_mcpServers'?: Record<string, MCPServer>;
  [key: string]: any;
}

/**
 * Adapter for Cline (VS Code extension)
 * Manages VS Code settings.json configuration
 */
export class ClineAdapter extends BaseAdapter {
  readonly name = 'Cline';
  readonly id = 'cline';

  detect(): boolean {
    if (!fs.existsSync(CONFIG_PATH)) {
      return false;
    }

    try {
      const settings: VSCodeSettings = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      // Check if Cline MCP servers are configured
      return 'cline.mcpServers' in settings || 'cline._disabled_mcpServers' in settings;
    } catch {
      return false;
    }
  }

  getConfigPath(): string {
    return CONFIG_PATH;
  }

  private ensureBackupDir(): void {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  createBackup(): string {
    if (!fs.existsSync(CONFIG_PATH)) {
      throw new Error(`VS Code settings not found at ${CONFIG_PATH}`);
    }

    this.ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `cline-${timestamp}.json`);

    fs.copyFileSync(CONFIG_PATH, backupPath);

    return backupPath;
  }

  loadConfig(): MCPConfig {
    if (!fs.existsSync(CONFIG_PATH)) {
      throw new Error(
        `VS Code settings not found at ${CONFIG_PATH}\n` +
        'Make sure VS Code and Cline are installed.'
      );
    }

    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');

    try {
      const settings: VSCodeSettings = JSON.parse(raw);

      return {
        enabled: settings['cline.mcpServers'] || {},
        disabled: settings['cline._disabled_mcpServers'] || {},
        metadata: {
          tool: 'cline',
          vscodeSettings: true
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse VS Code settings: ${error}`);
    }
  }

  saveConfig(config: MCPConfig): void {
    // Create backup before modifying
    const backupPath = this.createBackup();

    try {
      // Read existing settings to preserve other configuration
      const existingRaw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const existingSettings: VSCodeSettings = JSON.parse(existingRaw);

      // Update Cline MCP server sections
      existingSettings['cline.mcpServers'] = config.enabled;

      // Handle disabled servers
      if (Object.keys(config.disabled).length > 0) {
        existingSettings['cline._disabled_mcpServers'] = config.disabled;
      } else {
        delete existingSettings['cline._disabled_mcpServers'];
      }

      // Write back to file
      const jsonString = JSON.stringify(existingSettings, null, 2);
      fs.writeFileSync(CONFIG_PATH, jsonString, 'utf-8');
    } catch (error) {
      // If write fails, restore from backup
      fs.copyFileSync(backupPath, CONFIG_PATH);
      throw new Error(`Failed to save settings (restored from backup): ${error}`);
    }
  }
}
