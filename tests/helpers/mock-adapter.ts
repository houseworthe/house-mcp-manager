import { BaseAdapter, type MCPConfig } from '../../src/adapters/base.js';

/**
 * Mock adapter for testing
 * Uses in-memory storage instead of file system
 */
export class MockAdapter extends BaseAdapter {
  readonly name = 'Mock Tool';
  readonly id = 'mock';

  private config: MCPConfig | null = null;
  private backups: Array<{ timestamp: string; config: MCPConfig }> = [];
  private configPath = '/mock/path/config.json';
  private shouldFailOnSave = false;
  private shouldFailOnLoad = false;
  private isInstalled = true;

  /**
   * Set the in-memory config
   */
  setConfig(config: MCPConfig): void {
    this.config = config;
  }

  /**
   * Get the in-memory config (for testing)
   */
  getConfig(): MCPConfig | null {
    return this.config;
  }

  /**
   * Get all backups (for testing)
   */
  getBackups(): Array<{ timestamp: string; config: MCPConfig }> {
    return this.backups;
  }

  /**
   * Clear all backups (for testing)
   */
  clearBackups(): void {
    this.backups = [];
  }

  /**
   * Set whether the tool is "installed"
   */
  setInstalled(installed: boolean): void {
    this.isInstalled = installed;
  }

  /**
   * Configure save to fail (for testing error handling)
   */
  setShouldFailOnSave(fail: boolean): void {
    this.shouldFailOnSave = fail;
  }

  /**
   * Configure load to fail (for testing error handling)
   */
  setShouldFailOnLoad(fail: boolean): void {
    this.shouldFailOnLoad = fail;
  }

  /**
   * Set custom config path (for testing)
   */
  setConfigPath(path: string): void {
    this.configPath = path;
  }

  detect(): boolean {
    return this.isInstalled;
  }

  getConfigPath(): string {
    return this.configPath;
  }

  loadConfig(): MCPConfig {
    if (this.shouldFailOnLoad) {
      throw new Error('Mock load failure');
    }

    if (!this.config) {
      throw new Error('Config not found at ' + this.configPath);
    }

    // Return a deep copy to prevent test interference
    return JSON.parse(JSON.stringify(this.config));
  }

  saveConfig(config: MCPConfig): void {
    if (this.shouldFailOnSave) {
      throw new Error('Mock save failure');
    }

    // Store a deep copy
    this.config = JSON.parse(JSON.stringify(config));
  }

  createBackup(): string {
    if (!this.config) {
      throw new Error('No config to backup');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `/mock/backups/config-${timestamp}.json`;

    // Store backup
    this.backups.push({
      timestamp,
      config: JSON.parse(JSON.stringify(this.config)),
    });

    return backupPath;
  }
}

/**
 * Creates a basic mock config for testing
 */
export function createMockConfig(
  enabled: Record<string, any> = {},
  disabled: Record<string, any> = {}
): MCPConfig {
  return {
    enabled,
    disabled,
    metadata: {
      tool: 'mock',
      version: '1.0.0',
    },
  };
}
