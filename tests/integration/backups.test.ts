import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { setupTestEnv, type TestEnv, createTestConfigFile, mockServer } from '../helpers/test-utils.js';
import { TestAdapter } from '../helpers/integration-utils.js';
import type { MCPConfig } from '../../src/adapters/base.js';

describe('Backups Integration', () => {
  let env: TestEnv;
  let adapter: TestAdapter;

  beforeEach(() => {
    env = setupTestEnv();
    adapter = new TestAdapter(env.configPath, env.backupDir);
  });

  afterEach(() => {
    env.cleanup();
  });

  describe('backup creation', () => {
    it('should create backup before config modification', () => {
      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      // Create backup
      const backupPath = adapter.createBackup();

      // Verify backup exists
      expect(fs.existsSync(backupPath)).toBe(true);

      // Verify backup is in correct directory
      expect(backupPath.startsWith(env.backupDir)).toBe(true);

      // Verify backup filename format
      expect(path.basename(backupPath)).toMatch(/config-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*\.json/);
    });

    it('should preserve exact config snapshot in backup', () => {
      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server', {
            args: ['--token', 'secret'],
            env: { 'KEY': 'value' }
          })
        },
        disabled: {
          'notion': mockServer('npx notion-server')
        },
        metadata: { tool: 'test', version: '1.0.0' }
      };
      createTestConfigFile(env.tempDir, config);

      const backupPath = adapter.createBackup();

      // Read backup file
      const backupContent = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

      // Verify exact match
      expect(backupContent).toEqual(config);
    });

    it('should fail when config does not exist', () => {
      // Don't create config file

      expect(() => adapter.createBackup()).toThrow('Config not found');
    });

    it('should create backup directory if it does not exist', () => {
      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      // Remove backup directory
      if (fs.existsSync(env.backupDir)) {
        fs.rmSync(env.backupDir, { recursive: true });
      }

      expect(fs.existsSync(env.backupDir)).toBe(false);

      // Create backup should recreate directory
      const backupPath = adapter.createBackup();

      expect(fs.existsSync(env.backupDir)).toBe(true);
      expect(fs.existsSync(backupPath)).toBe(true);
    });

    it('should create multiple backups without overwriting', () => {
      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      // Create first backup
      const backup1 = adapter.createBackup();

      // Small delay to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 10) {} // 10ms delay

      // Create second backup
      const backup2 = adapter.createBackup();

      // Verify both exist
      expect(fs.existsSync(backup1)).toBe(true);
      expect(fs.existsSync(backup2)).toBe(true);

      // Verify different filenames
      expect(backup1).not.toBe(backup2);

      // Verify both in backup directory
      const backups = fs.readdirSync(env.backupDir);
      expect(backups.length).toBe(2);
    });
  });

  describe('backup with save operations', () => {
    it('should create backup automatically when saving config', () => {
      const initialConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, initialConfig);

      // Verify no backups initially
      expect(fs.readdirSync(env.backupDir).length).toBe(0);

      // Save modified config (which should create backup)
      const modifiedConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server'),
          'filesystem': mockServer('npx filesystem-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      adapter.saveConfig(modifiedConfig);

      // Verify backup was created
      const backups = fs.readdirSync(env.backupDir);
      expect(backups.length).toBe(1);

      // Verify backup contains original config
      const backupPath = path.join(env.backupDir, backups[0]);
      const backupContent = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      expect(backupContent.enabled).toEqual(initialConfig.enabled);
      expect(Object.keys(backupContent.enabled).length).toBe(1);
    });

    it('should preserve backup even after successful save', () => {
      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      // Save new config
      const newConfig: MCPConfig = {
        enabled: {
          'filesystem': mockServer('npx filesystem-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      adapter.saveConfig(newConfig);

      // Verify backup still exists
      const backups = fs.readdirSync(env.backupDir);
      expect(backups.length).toBe(1);

      // Verify backup has old config, not new
      const backupPath = path.join(env.backupDir, backups[0]);
      const backupContent = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      expect(backupContent.enabled).toHaveProperty('github');
      expect(backupContent.enabled).not.toHaveProperty('filesystem');
    });

    it('should create new backup for each save operation', () => {
      const config1: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config1);

      // First save
      const config2: MCPConfig = {
        enabled: {
          'filesystem': mockServer('npx filesystem-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      adapter.saveConfig(config2);

      const backupsAfterFirst = fs.readdirSync(env.backupDir);
      expect(backupsAfterFirst.length).toBe(1);

      // Small delay for timestamp difference
      const start = Date.now();
      while (Date.now() - start < 10) {}

      // Second save
      const config3: MCPConfig = {
        enabled: {
          'notion': mockServer('npx notion-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      adapter.saveConfig(config3);

      const backupsAfterSecond = fs.readdirSync(env.backupDir);
      expect(backupsAfterSecond.length).toBe(2);
    });
  });

  describe('backup directory management', () => {
    it('should handle backup directory with existing files', () => {
      // Create some existing backup files
      const existingBackup = path.join(env.backupDir, 'old-backup.json');
      fs.writeFileSync(existingBackup, JSON.stringify({ test: 'data' }));

      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      // Create new backup
      adapter.createBackup();

      // Verify both old and new backups exist
      const backups = fs.readdirSync(env.backupDir);
      expect(backups.length).toBe(2);
      expect(backups).toContain('old-backup.json');
    });

    it('should work when backup dir path has spaces', () => {
      // Create adapter with backup dir containing spaces
      const backupDirWithSpaces = path.join(env.tempDir, 'backup files');
      const adapterWithSpaces = new TestAdapter(env.configPath, backupDirWithSpaces);

      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      const backupPath = adapterWithSpaces.createBackup();

      expect(fs.existsSync(backupPath)).toBe(true);
      expect(backupPath).toContain('backup files');
    });
  });

  describe('backup integrity', () => {
    it('should maintain config structure in backup', () => {
      const complexConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server', {
            args: ['arg1', 'arg2'],
            env: { 'KEY1': 'value1', 'KEY2': 'value2' }
          }),
          'filesystem': mockServer('npx filesystem-server', {
            args: ['/path/with spaces/dir']
          })
        },
        disabled: {
          'notion': mockServer('npx notion-server', {
            env: { 'NOTION_TOKEN': 'secret-token-123' }
          }),
          'puppeteer': mockServer('npx puppeteer-server')
        },
        metadata: {
          tool: 'test',
          version: '2.0.0',
          custom: 'field'
        }
      };
      createTestConfigFile(env.tempDir, complexConfig);

      const backupPath = adapter.createBackup();
      const backupContent = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

      // Verify complete structure preservation
      expect(backupContent.enabled.github.args).toEqual(['arg1', 'arg2']);
      expect(backupContent.enabled.github.env).toEqual({ 'KEY1': 'value1', 'KEY2': 'value2' });
      expect(backupContent.enabled.filesystem.args).toEqual(['/path/with spaces/dir']);
      expect(backupContent.disabled.notion.env).toEqual({ 'NOTION_TOKEN': 'secret-token-123' });
      expect(backupContent.metadata.custom).toBe('field');
    });

    it('should preserve empty collections in backup', () => {
      const config: MCPConfig = {
        enabled: {},
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      const backupPath = adapter.createBackup();
      const backupContent = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

      expect(backupContent.enabled).toEqual({});
      expect(backupContent.disabled).toEqual({});
    });
  });
});
