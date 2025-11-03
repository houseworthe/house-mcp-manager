/**
 * Base adapter interface for MCP-enabled tools
 * Each tool (Claude, Cline, Continue, Zed) implements this interface
 */

export interface MCPServer {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  [key: string]: any;
}

export interface MCPConfig {
  enabled: Record<string, MCPServer>;
  disabled: Record<string, MCPServer>;
  metadata?: {
    tool: string;
    version?: string;
    [key: string]: any;
  };
}

/**
 * Inheritance tracking for scoped configurations
 */
export interface ServerInheritance {
  /** Servers inherited from user-level config */
  inherited: string[];
  /** Servers overridden at project level (exist in both user and project) */
  overridden: string[];
  /** Servers added only at project level */
  additions: string[];
}

/**
 * Scoped MCP configuration with inheritance tracking
 */
export interface ScopedMCPConfig extends MCPConfig {
  inheritance?: ServerInheritance;
  scope?: 'user' | 'project';
  projectPath?: string;
}

export interface MCPAdapter {
  /** Name of the tool (e.g., "Claude Code", "Cline", "Continue") */
  readonly name: string;

  /** Short identifier (e.g., "claude", "cline", "continue") */
  readonly id: string;

  /** Detect if this tool is installed and configured */
  detect(): boolean;

  /** Get the config file path */
  getConfigPath(): string;

  /** Load configuration from disk */
  loadConfig(): MCPConfig;

  /** Save configuration to disk */
  saveConfig(config: MCPConfig): void;

  /** Create backup of current configuration */
  createBackup(): string;

  /** Get list of enabled servers */
  getEnabledServers(config: MCPConfig): string[];

  /** Get list of disabled servers */
  getDisabledServers(config: MCPConfig): string[];

  /** Get all servers (enabled + disabled) */
  getAllServers(config: MCPConfig): string[];

  /** Check if a server exists */
  serverExists(config: MCPConfig, serverName: string): boolean;

  /** Check if a server is enabled */
  isServerEnabled(config: MCPConfig, serverName: string): boolean;

  /** Enable a server */
  enableServer(config: MCPConfig, serverName: string): MCPConfig;

  /** Disable a server */
  disableServer(config: MCPConfig, serverName: string): MCPConfig;

  /** Toggle a server between enabled/disabled */
  toggleServer(config: MCPConfig, serverName: string): MCPConfig;

  /** Check if this adapter supports project-level configuration */
  supportsProjectScope(): boolean;

  /** Load project-level configuration (if supported) */
  loadProjectConfig?(projectPath: string): MCPConfig | null;

  /** Save project-level configuration (if supported) */
  saveProjectConfig?(projectPath: string, config: MCPConfig): void;

  /** Get merged configuration (user + project) with inheritance tracking */
  getMergedConfig?(projectPath: string): ScopedMCPConfig;
}

/**
 * Base adapter class with common functionality
 */
export abstract class BaseAdapter implements MCPAdapter {
  abstract readonly name: string;
  abstract readonly id: string;

  abstract detect(): boolean;
  abstract getConfigPath(): string;
  abstract loadConfig(): MCPConfig;
  abstract saveConfig(config: MCPConfig): void;
  abstract createBackup(): string;

  getEnabledServers(config: MCPConfig): string[] {
    return Object.keys(config.enabled || {});
  }

  getDisabledServers(config: MCPConfig): string[] {
    return Object.keys(config.disabled || {});
  }

  getAllServers(config: MCPConfig): string[] {
    return [...this.getEnabledServers(config), ...this.getDisabledServers(config)];
  }

  serverExists(config: MCPConfig, serverName: string): boolean {
    return this.getAllServers(config).includes(serverName);
  }

  isServerEnabled(config: MCPConfig, serverName: string): boolean {
    return this.getEnabledServers(config).includes(serverName);
  }

  enableServer(config: MCPConfig, serverName: string): MCPConfig {
    if (!config.disabled[serverName]) {
      throw new Error(`Server "${serverName}" is not disabled or does not exist`);
    }

    // Move from disabled to enabled
    config.enabled[serverName] = config.disabled[serverName];
    delete config.disabled[serverName];

    return config;
  }

  disableServer(config: MCPConfig, serverName: string): MCPConfig {
    if (!config.enabled[serverName]) {
      throw new Error(`Server "${serverName}" is not enabled or does not exist`);
    }

    // Move from enabled to disabled
    config.disabled[serverName] = config.enabled[serverName];
    delete config.enabled[serverName];

    return config;
  }

  toggleServer(config: MCPConfig, serverName: string): MCPConfig {
    if (this.isServerEnabled(config, serverName)) {
      return this.disableServer(config, serverName);
    } else if (config.disabled[serverName]) {
      return this.enableServer(config, serverName);
    } else {
      throw new Error(`Server "${serverName}" does not exist`);
    }
  }

  supportsProjectScope(): boolean {
    return false;
  }
}
