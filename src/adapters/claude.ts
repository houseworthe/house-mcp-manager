import fs from 'fs';
import path from 'path';
import os from 'os';
import { BaseAdapter, type MCPConfig, type MCPServer } from './base.js';

const CONFIG_PATH = path.join(os.homedir(), '.claude.json');
const BACKUP_DIR = path.join(os.homedir(), '.claude-mcp-backups');

interface ClaudeConfigFile {
  mcpServers: Record<string, MCPServer>;
  _disabled_mcpServers?: Record<string, MCPServer>;
  [key: string]: any;
}

/**
 * Adapter for Claude Code
 * Manages ~/.claude.json configuration
 */
export class ClaudeAdapter extends BaseAdapter {
  readonly name = 'Claude Code';
  readonly id = 'claude';

  detect(): boolean {
    return fs.existsSync(CONFIG_PATH);
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
      throw new Error(`Claude config not found at ${CONFIG_PATH}`);
    }

    this.ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `claude-${timestamp}.json`);

    fs.copyFileSync(CONFIG_PATH, backupPath);

    return backupPath;
  }

  loadConfig(): MCPConfig {
    if (!fs.existsSync(CONFIG_PATH)) {
      throw new Error(
        `Claude config not found at ${CONFIG_PATH}\n` +
        'Make sure Claude Code is installed and you have run it at least once.'
      );
    }

    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');

    try {
      const claudeConfig: ClaudeConfigFile = JSON.parse(raw);

      // Convert Claude's format to our universal format
      return {
        enabled: claudeConfig.mcpServers || {},
        disabled: claudeConfig._disabled_mcpServers || {},
        metadata: {
          tool: 'claude',
          originalFormat: true
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse Claude config: ${error}`);
    }
  }

  saveConfig(config: MCPConfig): void {
    // Create backup before modifying
    const backupPath = this.createBackup();

    try {
      // Read existing config to preserve other fields
      const existingRaw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const existingConfig: ClaudeConfigFile = JSON.parse(existingRaw);

      // Update MCP server sections
      existingConfig.mcpServers = config.enabled;

      // Handle disabled servers
      if (Object.keys(config.disabled).length > 0) {
        existingConfig._disabled_mcpServers = config.disabled;
      } else {
        delete existingConfig._disabled_mcpServers;
      }

      // Write back to file
      const jsonString = JSON.stringify(existingConfig, null, 2);
      fs.writeFileSync(CONFIG_PATH, jsonString, 'utf-8');
    } catch (error) {
      // If write fails, restore from backup
      fs.copyFileSync(backupPath, CONFIG_PATH);
      throw new Error(`Failed to save config (restored from backup): ${error}`);
    }
  }
}
