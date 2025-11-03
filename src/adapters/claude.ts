import fs from 'fs';
import path from 'path';
import os from 'os';
import { BaseAdapter, type MCPConfig, type MCPServer, type ScopedMCPConfig, type ServerInheritance } from './base.js';
import { normalizeProjectPath } from '../utils/scope.js';

const CONFIG_PATH = path.join(os.homedir(), '.claude.json');
const BACKUP_DIR = path.join(os.homedir(), '.claude-mcp-backups');

interface ClaudeConfigFile {
  mcpServers: Record<string, MCPServer>;
  _disabled_mcpServers?: Record<string, MCPServer>;
  projects?: Record<string, ClaudeProjectConfig>;
  [key: string]: any;
}

interface ClaudeProjectConfig {
  mcpServers: Record<string, MCPServer>;
  disabledMcpServers?: string[];
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

  supportsProjectScope(): boolean {
    return true;
  }

  loadProjectConfig(projectPath: string): MCPConfig | null {
    if (!fs.existsSync(CONFIG_PATH)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const claudeConfig: ClaudeConfigFile = JSON.parse(raw);

      const normalizedPath = normalizeProjectPath(projectPath);
      const projectConfig = claudeConfig.projects?.[normalizedPath];

      if (!projectConfig) {
        return null;
      }

      // Convert project config format to MCPConfig
      // Project config: mcpServers: {} + disabledMcpServers: []
      // We need to convert disabledMcpServers array to disabled object
      const disabled: Record<string, MCPServer> = {};
      const disabledNames = projectConfig.disabledMcpServers || [];

      // For disabled servers, we need to get their config from user-level or from enabled
      // If they're in the enabled list, move them to disabled
      const enabled = { ...projectConfig.mcpServers };
      
      // Note: Project-level disabled servers are tracked by name only
      // They might exist in user-level config, but we'll track them as disabled
      for (const name of disabledNames) {
        // If the server exists in enabled, move it to disabled
        if (enabled[name]) {
          disabled[name] = enabled[name];
          delete enabled[name];
        } else {
          // Create a placeholder - the actual config will come from user-level if it exists
          disabled[name] = {
            command: '',
            // This will be merged with user-level config in getMergedConfig
          };
        }
      }

      return {
        enabled,
        disabled,
        metadata: {
          tool: 'claude',
          scope: 'project',
          projectPath: normalizedPath
        }
      };
    } catch (error) {
      throw new Error(`Failed to load project config: ${error}`);
    }
  }

  saveProjectConfig(projectPath: string, config: MCPConfig): void {
    if (!fs.existsSync(CONFIG_PATH)) {
      throw new Error(`Claude config not found at ${CONFIG_PATH}`);
    }

    // Create backup before modifying
    const backupPath = this.createBackup();

    try {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const claudeConfig: ClaudeConfigFile = JSON.parse(raw);

      const normalizedPath = normalizeProjectPath(projectPath);

      // Initialize projects object if it doesn't exist
      if (!claudeConfig.projects) {
        claudeConfig.projects = {};
      }

      // Convert MCPConfig to project config format
      // Project format: mcpServers: {} + disabledMcpServers: []
      const disabledNames = Object.keys(config.disabled || {});
      const projectConfig: ClaudeProjectConfig = {
        mcpServers: config.enabled,
      };

      // Add disabledMcpServers if there are any
      if (disabledNames.length > 0) {
        projectConfig.disabledMcpServers = disabledNames;
      }

      claudeConfig.projects[normalizedPath] = projectConfig;

      // Write back to file
      const jsonString = JSON.stringify(claudeConfig, null, 2);
      fs.writeFileSync(CONFIG_PATH, jsonString, 'utf-8');
    } catch (error) {
      // If write fails, restore from backup
      fs.copyFileSync(backupPath, CONFIG_PATH);
      throw new Error(`Failed to save project config (restored from backup): ${error}`);
    }
  }

  getMergedConfig(projectPath: string): ScopedMCPConfig {
    const userConfig = this.loadConfig();
    const projectConfig = this.loadProjectConfig(projectPath);

    if (!projectConfig) {
      // No project config, return user config with scope info
      return {
        ...userConfig,
        scope: 'user',
        inheritance: {
          inherited: Object.keys(userConfig.enabled),
          overridden: [],
          additions: []
        }
      };
    }

    const normalizedPath = normalizeProjectPath(projectPath);

    // Get project disabled server names (array format)
    const projectDisabledNames = Object.keys(projectConfig.disabled || {});
    const userEnabledNames = Object.keys(userConfig.enabled);
    const projectEnabledNames = Object.keys(projectConfig.enabled);

    const inheritance: ServerInheritance = {
      inherited: [],
      overridden: [],
      additions: []
    };

    // Build merged enabled servers
    const mergedEnabled: Record<string, MCPServer> = {};

    // 1. Start with user-level enabled servers (inherited)
    for (const name of userEnabledNames) {
      // Skip if disabled at project level
      if (!projectDisabledNames.includes(name)) {
        // Check if overridden by project
        if (projectEnabledNames.includes(name)) {
          // Overridden - use project config
          mergedEnabled[name] = projectConfig.enabled[name];
          inheritance.overridden.push(name);
        } else {
          // Inherited from user
          mergedEnabled[name] = userConfig.enabled[name];
          inheritance.inherited.push(name);
        }
      }
    }

    // 2. Add project-only servers (additions)
    for (const name of projectEnabledNames) {
      if (!userEnabledNames.includes(name)) {
        mergedEnabled[name] = projectConfig.enabled[name];
        inheritance.additions.push(name);
      }
    }

    // Build merged disabled servers
    const mergedDisabled: Record<string, MCPServer> = { ...userConfig.disabled };

    // Add project-disabled servers to disabled list
    for (const name of projectDisabledNames) {
      // Get server config from project enabled (if it was there) or user enabled
      if (projectConfig.enabled[name]) {
        mergedDisabled[name] = projectConfig.enabled[name];
      } else if (userConfig.enabled[name]) {
        mergedDisabled[name] = userConfig.enabled[name];
      } else {
        // Server was disabled by name only, use placeholder
        mergedDisabled[name] = {
          command: '',
        };
      }
    }

    return {
      enabled: mergedEnabled,
      disabled: mergedDisabled,
      metadata: {
        ...userConfig.metadata,
        tool: userConfig.metadata?.tool || 'claude',
        scope: 'project',
        projectPath: normalizedPath
      },
      inheritance,
      scope: 'project',
      projectPath: normalizedPath
    };
  }
}
