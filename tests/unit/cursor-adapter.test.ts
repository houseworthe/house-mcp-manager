import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CursorAdapter } from '../../src/adapters/cursor.js';
import { createTempDir, cleanupTempDir, mockServer, loadFixture } from '../helpers/test-utils.js';
import type { MCPConfig } from '../../src/adapters/base.js';

// Test-friendly subclass that allows path overriding
class TestCursorAdapter extends CursorAdapter {
  constructor(configPath: string, disabledConfigPath: string, backupDir: string) {
    super();
    this.configPath = configPath;
    this.disabledConfigPath = disabledConfigPath;
    this.backupDir = backupDir;
  }
}

describe('CursorAdapter', () => {
  let adapter: TestCursorAdapter;
  let tempDir: string;
  let configPath: string;
  let disabledConfigPath: string;
  let backupDir: string;

  beforeEach(() => {
    tempDir = createTempDir('cursor-test-');

    // Create mock ~/.cursor directory structure
    const cursorDir = path.join(tempDir, '.cursor');
    fs.mkdirSync(cursorDir, { recursive: true });

    configPath = path.join(cursorDir, 'mcp.json');
    disabledConfigPath = path.join(cursorDir, 'mcp-disabled.json');
    backupDir = path.join(tempDir, '.claude-mcp-backups', 'cursor');
    fs.mkdirSync(backupDir, { recursive: true });

    // Create test adapter with custom paths
    adapter = new TestCursorAdapter(configPath, disabledConfigPath, backupDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('detect', () => {
    it('should return false when config file does not exist', () => {
      expect(adapter.detect()).toBe(false);
    });

    it('should return true when config file exists with mcpServers', () => {
      const config = { mcpServers: {} };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      expect(adapter.detect()).toBe(true);
    });

    it('should return false when config file exists without mcpServers', () => {
      const config = { someOtherKey: {} };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      expect(adapter.detect()).toBe(false);
    });

    it('should return false when config file has invalid JSON', () => {
      fs.writeFileSync(configPath, '{ invalid json }');

      expect(adapter.detect()).toBe(false);
    });
  });

  describe('loadConfig', () => {
    it('should throw error when config file does not exist', () => {
      expect(() => adapter.loadConfig()).toThrow('Cursor config not found');
    });

    it('should load enabled servers from main config', () => {
      const cursorConfig = loadFixture('cursor-basic.json');
      fs.writeFileSync(configPath, JSON.stringify(cursorConfig, null, 2));

      const config = adapter.loadConfig();

      expect(config.enabled).toEqual(cursorConfig.mcpServers);
      expect(config.disabled).toEqual({});
      expect(config.metadata?.tool).toBe('cursor');
      expect(config.metadata?.separateDisabledFile).toBe(true);
    });

    it('should load disabled servers from separate file', () => {
      const enabledConfig = loadFixture('cursor-basic.json');
      const disabledConfig = loadFixture('cursor-disabled.json');

      fs.writeFileSync(configPath, JSON.stringify(enabledConfig, null, 2));
      fs.writeFileSync(disabledConfigPath, JSON.stringify(disabledConfig, null, 2));

      const config = adapter.loadConfig();

      expect(config.enabled).toEqual(enabledConfig.mcpServers);
      expect(config.disabled).toEqual(disabledConfig.mcpServers);
    });

    it('should handle missing disabled file gracefully', () => {
      const enabledConfig = loadFixture('cursor-basic.json');
      fs.writeFileSync(configPath, JSON.stringify(enabledConfig, null, 2));

      const config = adapter.loadConfig();

      expect(config.enabled).toEqual(enabledConfig.mcpServers);
      expect(config.disabled).toEqual({});
    });

    it('should handle empty configs', () => {
      const emptyConfig = loadFixture('cursor-empty.json');
      fs.writeFileSync(configPath, JSON.stringify(emptyConfig, null, 2));

      const config = adapter.loadConfig();

      expect(config.enabled).toEqual({});
      expect(config.disabled).toEqual({});
    });
  });

  describe('saveConfig', () => {
    beforeEach(() => {
      // Create initial config
      const initialConfig = loadFixture('cursor-basic.json');
      fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));
    });

    it('should save enabled servers to main config', () => {
      const config: MCPConfig = {
        enabled: {
          'test-server': mockServer('npx test-server'),
        },
        disabled: {},
        metadata: { tool: 'cursor' }
      };

      adapter.saveConfig(config);

      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(savedConfig.mcpServers).toEqual(config.enabled);
    });

    it('should save disabled servers to separate file', () => {
      const config: MCPConfig = {
        enabled: {
          'enabled-server': mockServer('npx enabled'),
        },
        disabled: {
          'disabled-server': mockServer('npx disabled'),
        },
        metadata: { tool: 'cursor' }
      };

      adapter.saveConfig(config);

      const mainConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const disabledConfig = JSON.parse(fs.readFileSync(disabledConfigPath, 'utf-8'));

      expect(mainConfig.mcpServers).toEqual(config.enabled);
      expect(disabledConfig.mcpServers).toEqual(config.disabled);
    });

    it('should delete disabled file when disabled servers are empty', () => {
      // First create a disabled file
      const disabledConfig = { mcpServers: { 'test': mockServer('npx test') } };
      fs.writeFileSync(disabledConfigPath, JSON.stringify(disabledConfig, null, 2));

      const config: MCPConfig = {
        enabled: { 'enabled-server': mockServer('npx enabled') },
        disabled: {},
        metadata: { tool: 'cursor' }
      };

      adapter.saveConfig(config);

      expect(fs.existsSync(disabledConfigPath)).toBe(false);
    });

    it('should preserve other fields in main config', () => {
      // Add custom fields to config
      const existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      existingConfig.customField = 'should be preserved';
      existingConfig.anotherField = { nested: 'value' };
      fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

      const config: MCPConfig = {
        enabled: { 'new-server': mockServer('npx new') },
        disabled: {},
        metadata: { tool: 'cursor' }
      };

      adapter.saveConfig(config);

      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(savedConfig.customField).toBe('should be preserved');
      expect(savedConfig.anotherField).toEqual({ nested: 'value' });
      expect(savedConfig.mcpServers).toEqual(config.enabled);
    });

    it('should create backup before saving', () => {
      const config: MCPConfig = {
        enabled: { 'test': mockServer('npx test') },
        disabled: {},
        metadata: { tool: 'cursor' }
      };

      adapter.saveConfig(config);

      const backups = fs.readdirSync(backupDir);
      expect(backups.length).toBeGreaterThan(0);
      expect(backups.some(f => f.startsWith('cursor-'))).toBe(true);
    });
  });

  describe('disableServer', () => {
    it('should move server from main config to disabled file', () => {
      const enabledConfig = loadFixture('cursor-basic.json');
      fs.writeFileSync(configPath, JSON.stringify(enabledConfig, null, 2));

      const config = adapter.loadConfig();
      const serverName = 'canvas-mcp-server';
      const serverConfig = config.enabled[serverName];

      const updatedConfig = adapter.disableServer(config, serverName);
      adapter.saveConfig(updatedConfig);

      const mainConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const disabledConfig = JSON.parse(fs.readFileSync(disabledConfigPath, 'utf-8'));

      expect(mainConfig.mcpServers[serverName]).toBeUndefined();
      expect(disabledConfig.mcpServers[serverName]).toEqual(serverConfig);
    });
  });

  describe('enableServer', () => {
    it('should move server from disabled file to main config', () => {
      const enabledConfig = loadFixture('cursor-basic.json');
      const disabledConfig = loadFixture('cursor-disabled.json');

      fs.writeFileSync(configPath, JSON.stringify(enabledConfig, null, 2));
      fs.writeFileSync(disabledConfigPath, JSON.stringify(disabledConfig, null, 2));

      const config = adapter.loadConfig();
      const serverName = 'notion';
      const serverConfig = config.disabled[serverName];

      const updatedConfig = adapter.enableServer(config, serverName);
      adapter.saveConfig(updatedConfig);

      const mainConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const disabledFile = fs.existsSync(disabledConfigPath)
        ? JSON.parse(fs.readFileSync(disabledConfigPath, 'utf-8'))
        : { mcpServers: {} };

      expect(mainConfig.mcpServers[serverName]).toEqual(serverConfig);
      expect(disabledFile.mcpServers[serverName]).toBeUndefined();
    });

    it('should delete disabled file when last server is enabled', () => {
      const enabledConfig = { mcpServers: {} };
      const disabledConfig = { mcpServers: { 'only-server': mockServer('npx test') } };

      fs.writeFileSync(configPath, JSON.stringify(enabledConfig, null, 2));
      fs.writeFileSync(disabledConfigPath, JSON.stringify(disabledConfig, null, 2));

      const config = adapter.loadConfig();
      const updatedConfig = adapter.enableServer(config, 'only-server');
      adapter.saveConfig(updatedConfig);

      expect(fs.existsSync(disabledConfigPath)).toBe(false);
    });
  });

  describe('createBackup', () => {
    it('should backup main config file', () => {
      const config = loadFixture('cursor-basic.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const backupPath = adapter.createBackup();

      expect(fs.existsSync(backupPath)).toBe(true);

      const backupContent = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      expect(backupContent).toEqual(config);
    });

    it('should backup both main and disabled config files', () => {
      const enabledConfig = loadFixture('cursor-basic.json');
      const disabledConfig = loadFixture('cursor-disabled.json');

      fs.writeFileSync(configPath, JSON.stringify(enabledConfig, null, 2));
      fs.writeFileSync(disabledConfigPath, JSON.stringify(disabledConfig, null, 2));

      const backupPath = adapter.createBackup();
      const timestamp = path.basename(backupPath).replace('cursor-', '').replace('.json', '');
      const disabledBackupPath = path.join(backupDir, `cursor-disabled-${timestamp}.json`);

      expect(fs.existsSync(backupPath)).toBe(true);
      expect(fs.existsSync(disabledBackupPath)).toBe(true);

      const mainBackup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      const disabledBackup = JSON.parse(fs.readFileSync(disabledBackupPath, 'utf-8'));

      expect(mainBackup).toEqual(enabledConfig);
      expect(disabledBackup).toEqual(disabledConfig);
    });

    it('should handle missing disabled file gracefully', () => {
      const config = loadFixture('cursor-basic.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const backupPath = adapter.createBackup();
      const timestamp = path.basename(backupPath).replace('cursor-', '').replace('.json', '');
      const disabledBackupPath = path.join(backupDir, `cursor-disabled-${timestamp}.json`);

      expect(fs.existsSync(backupPath)).toBe(true);
      expect(fs.existsSync(disabledBackupPath)).toBe(false);
    });
  });

  describe('adapter metadata', () => {
    it('should have correct name and id', () => {
      expect(adapter.name).toBe('Cursor');
      expect(adapter.id).toBe('cursor');
    });

    it('should return correct config path', () => {
      expect(adapter.getConfigPath()).toBe(configPath);
    });
  });
});
