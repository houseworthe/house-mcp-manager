import fs from 'fs';
import path from 'path';
import os from 'os';
import { BaseAdapter, type MCPConfig, type MCPServer } from './base.js';

// Cursor config location (platform-aware)
function getCursorConfigDir(): string {
  return path.join(os.homedir(), '.cursor');
}

function getConfigPath(): string {
  return path.join(getCursorConfigDir(), 'mcp.json');
}

function getDisabledConfigPath(): string {
  return path.join(getCursorConfigDir(), 'mcp-disabled.json');
}

function getBackupDir(): string {
  return path.join(os.homedir(), '.claude-mcp-backups', 'cursor');
}

interface CursorConfigFile {
  mcpServers: Record<string, MCPServer>;
  [key: string]: any;
}

/**
 * Adapter for Cursor IDE
 * Manages ~/.cursor/mcp.json (enabled) and ~/.cursor/mcp-disabled.json (disabled)
 *
 * Unlike Claude/Cline which use synthetic _disabled_mcpServers in the same file,
 * Cursor uses a separate file to avoid polluting the native config.
 */
export class CursorAdapter extends BaseAdapter {
  readonly name = 'Cursor';
  readonly id = 'cursor';

  // Allow overriding paths for testing
  protected configPath: string = getConfigPath();
  protected disabledConfigPath: string = getDisabledConfigPath();
  protected backupDir: string = getBackupDir();

  detect(): boolean {
    if (!fs.existsSync(this.configPath)) {
      return false;
    }

    try {
      const config: CursorConfigFile = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      // Check if Cursor MCP servers are configured
      return 'mcpServers' in config;
    } catch {
      return false;
    }
  }

  getConfigPath(): string {
    return this.configPath;
  }

  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  createBackup(): string {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Cursor config not found at ${this.configPath}`);
    }

    this.ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `cursor-${timestamp}.json`);
    const disabledBackupPath = path.join(this.backupDir, `cursor-disabled-${timestamp}.json`);

    // Backup main config
    fs.copyFileSync(this.configPath, backupPath);

    // Backup disabled config if it exists
    if (fs.existsSync(this.disabledConfigPath)) {
      fs.copyFileSync(this.disabledConfigPath, disabledBackupPath);
    }

    return backupPath;
  }

  loadConfig(): MCPConfig {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(
        `Cursor config not found at ${this.configPath}\n` +
        'Make sure Cursor is installed and you have configured MCP servers.'
      );
    }

    try {
      // Load enabled servers from main config
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      const cursorConfig: CursorConfigFile = JSON.parse(raw);

      // Load disabled servers from separate file
      let disabledServers: Record<string, MCPServer> = {};
      if (fs.existsSync(this.disabledConfigPath)) {
        const disabledRaw = fs.readFileSync(this.disabledConfigPath, 'utf-8');
        const disabledConfig: CursorConfigFile = JSON.parse(disabledRaw);
        disabledServers = disabledConfig.mcpServers || {};
      }

      return {
        enabled: cursorConfig.mcpServers || {},
        disabled: disabledServers,
        metadata: {
          tool: 'cursor',
          separateDisabledFile: true
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse Cursor config: ${error}`);
    }
  }

  saveConfig(config: MCPConfig): void {
    // Create backup before modifying
    const backupPath = this.createBackup();

    try {
      // Read existing main config to preserve other fields
      const existingRaw = fs.readFileSync(this.configPath, 'utf-8');
      const existingConfig: CursorConfigFile = JSON.parse(existingRaw);

      // Update enabled servers in main config
      existingConfig.mcpServers = config.enabled;

      // Write main config
      const jsonString = JSON.stringify(existingConfig, null, 2);
      fs.writeFileSync(this.configPath, jsonString, 'utf-8');

      // Handle disabled servers in separate file
      if (Object.keys(config.disabled).length > 0) {
        // Create/update disabled config file
        const disabledConfig: CursorConfigFile = {
          mcpServers: config.disabled
        };
        const disabledJsonString = JSON.stringify(disabledConfig, null, 2);
        fs.writeFileSync(this.disabledConfigPath, disabledJsonString, 'utf-8');
      } else {
        // Clean up disabled config if empty
        if (fs.existsSync(this.disabledConfigPath)) {
          fs.unlinkSync(this.disabledConfigPath);
        }
      }
    } catch (error) {
      // If write fails, restore from backup
      fs.copyFileSync(backupPath, this.configPath);

      // Also restore disabled file if backup exists
      const timestamp = path.basename(backupPath).replace('cursor-', '').replace('.json', '');
      const disabledBackupPath = path.join(this.backupDir, `cursor-disabled-${timestamp}.json`);
      if (fs.existsSync(disabledBackupPath)) {
        fs.copyFileSync(disabledBackupPath, this.disabledConfigPath);
      }

      throw new Error(`Failed to save config (restored from backup): ${error}`);
    }
  }
}
