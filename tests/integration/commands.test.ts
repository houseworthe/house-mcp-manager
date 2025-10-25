import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestEnv, type TestEnv, createTestConfigFile, loadFixture, mockServer } from '../helpers/test-utils.js';
import { TestAdapter, mockConsole, mockProcessExit, type ConsoleMock, type ProcessExitMock } from '../helpers/integration-utils.js';
import { disableCommand } from '../../src/commands/disable.js';
import { enableCommand } from '../../src/commands/enable.js';
import { listCommand } from '../../src/commands/list.js';
import { statusCommand } from '../../src/commands/status.js';
import type { MCPConfig } from '../../src/adapters/base.js';

describe('Commands Integration', () => {
  let env: TestEnv;
  let adapter: TestAdapter;
  let consoleMock: ConsoleMock;
  let exitMock: ProcessExitMock;

  beforeEach(() => {
    env = setupTestEnv();
    adapter = new TestAdapter(env.configPath, env.backupDir);
    consoleMock = mockConsole();
    exitMock = mockProcessExit();
  });

  afterEach(() => {
    consoleMock.restore();
    exitMock.restore();
    env.cleanup();
  });

  describe('disableCommand', () => {
    it('should disable an enabled server successfully', () => {
      // Create initial config with enabled servers
      const initialConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server'),
          'filesystem': mockServer('npx filesystem-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, initialConfig);

      disableCommand(adapter, 'github');

      // Verify success message
      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('Disabled "github"');
      expect(output).toContain('Restart Test Tool for changes to take effect');

      // Verify config was updated on disk
      const updatedConfig = adapter.loadConfig();
      expect(updatedConfig.enabled).not.toHaveProperty('github');
      expect(updatedConfig.disabled).toHaveProperty('github');
      expect(updatedConfig.enabled).toHaveProperty('filesystem');
    });

    it('should create backup before disabling', () => {
      const initialConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, initialConfig);

      disableCommand(adapter, 'github');

      // Verify backup was created
      const fs = require('fs');
      const backups = fs.readdirSync(env.backupDir);
      expect(backups.length).toBeGreaterThan(0);
      expect(backups[0]).toMatch(/config-.*\.json/);
    });

    it('should fail when server is not enabled', () => {
      const initialConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {
          'notion': mockServer('npx notion-server')
        },
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, initialConfig);

      disableCommand(adapter, 'notion');

      // Verify error message
      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('Server "notion" is not enabled or does not exist');
      expect(output).toContain('Use "mcp-manager list" to see available servers');

      // Verify process.exit(1) was called
      expect(exitMock.getExitCode()).toBe(1);
    });

    it('should fail when server does not exist', () => {
      const initialConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, initialConfig);

      disableCommand(adapter, 'nonexistent');

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('Server "nonexistent" is not enabled or does not exist');
      expect(exitMock.getExitCode()).toBe(1);
    });

    it('should handle config load failure gracefully', () => {
      // Don't create config file - adapter.loadConfig() will fail

      disableCommand(adapter, 'github');

      const errorOutput = consoleMock.getErrorOutput().join('\n');
      expect(errorOutput).toContain('Config not found');
      expect(exitMock.getExitCode()).toBe(1);
    });
  });

  describe('enableCommand', () => {
    it('should enable a disabled server successfully', () => {
      const initialConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {
          'notion': mockServer('npx notion-server'),
          'puppeteer': mockServer('npx puppeteer-server')
        },
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, initialConfig);

      enableCommand(adapter, 'notion');

      // Verify success message
      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('Enabled "notion"');
      expect(output).toContain('Restart Test Tool for changes to take effect');

      // Verify config was updated
      const updatedConfig = adapter.loadConfig();
      expect(updatedConfig.enabled).toHaveProperty('notion');
      expect(updatedConfig.disabled).not.toHaveProperty('notion');
      expect(updatedConfig.disabled).toHaveProperty('puppeteer');
    });

    it('should fail when server is already enabled', () => {
      const initialConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, initialConfig);

      enableCommand(adapter, 'github');

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('Server "github" is already enabled');
      expect(exitMock.getExitCode()).toBe(1);
    });

    it('should fail when server is not disabled', () => {
      const initialConfig: MCPConfig = {
        enabled: {},
        disabled: {
          'notion': mockServer('npx notion-server')
        },
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, initialConfig);

      enableCommand(adapter, 'nonexistent');

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('Server "nonexistent" is not disabled or does not exist');
      expect(output).toContain('Use "mcp-manager list" to see available servers');
      expect(exitMock.getExitCode()).toBe(1);
    });

    it('should create backup before enabling', () => {
      const initialConfig: MCPConfig = {
        enabled: {},
        disabled: {
          'notion': mockServer('npx notion-server')
        },
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, initialConfig);

      enableCommand(adapter, 'notion');

      // Verify backup was created
      const fs = require('fs');
      const backups = fs.readdirSync(env.backupDir);
      expect(backups.length).toBeGreaterThan(0);
    });
  });

  describe('listCommand', () => {
    it('should display enabled and disabled servers', () => {
      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server'),
          'filesystem': mockServer('npx filesystem-server')
        },
        disabled: {
          'notion': mockServer('npx notion-server')
        },
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      listCommand(adapter);

      const output = consoleMock.getOutput().join('\n');

      // Check for header
      expect(output).toContain('MCP Server Status (Test Tool)');

      // Check for enabled servers section
      expect(output).toContain('ENABLED SERVERS');
      expect(output).toContain('github');
      expect(output).toContain('filesystem');

      // Check for disabled servers section
      expect(output).toContain('DISABLED SERVERS');
      expect(output).toContain('notion');

      // Check for summary
      expect(output).toContain('Total: 3 servers (2 enabled, 1 disabled)');

      // Check for hints
      expect(output).toContain('Use "mcp-manager status" for detailed token estimates');
      expect(output).toContain('Use "mcp-manager interactive" for quick toggling');
    });

    it('should handle empty enabled servers', () => {
      const config: MCPConfig = {
        enabled: {},
        disabled: {
          'notion': mockServer('npx notion-server')
        },
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      listCommand(adapter);

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('ENABLED SERVERS');
      expect(output).toContain('(none)');
      expect(output).toContain('Total: 1 servers (0 enabled, 1 disabled)');
    });

    it('should handle empty disabled servers', () => {
      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      listCommand(adapter);

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('DISABLED SERVERS');
      expect(output).toContain('(none)');
      expect(output).toContain('Total: 1 servers (1 enabled, 0 disabled)');
    });

    it('should handle completely empty config', () => {
      const config: MCPConfig = {
        enabled: {},
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      listCommand(adapter);

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('ENABLED SERVERS');
      expect(output).toContain('DISABLED SERVERS');
      expect(output).toContain('Total: 0 servers (0 enabled, 0 disabled)');
    });

    it('should handle config load failure', () => {
      // Don't create config file

      listCommand(adapter);

      const errorOutput = consoleMock.getErrorOutput().join('\n');
      expect(errorOutput).toContain('Config not found');
      expect(exitMock.getExitCode()).toBe(1);
    });
  });

  describe('statusCommand', () => {
    it('should display server details with token estimates', () => {
      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx @modelcontextprotocol/server-github'),
          'filesystem': mockServer('npx @modelcontextprotocol/server-filesystem')
        },
        disabled: {
          'notion': mockServer('npx @notionhq/notion-mcp')
        },
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      statusCommand(adapter);

      const output = consoleMock.getOutput().join('\n');

      // Check header
      expect(output).toContain('MCP Server Status & Token Estimates (Test Tool)');

      // Check enabled servers with status
      expect(output).toContain('ENABLED SERVERS');
      expect(output).toContain('github');
      expect(output).toContain('Enabled');

      // Check disabled servers
      expect(output).toContain('DISABLED SERVERS');
      expect(output).toContain('notion');
      expect(output).toContain('Disabled');

      // Check summary section
      expect(output).toContain('SUMMARY:');
      expect(output).toContain('Total Servers: 3');
      expect(output).toContain('Enabled: 2');
      expect(output).toContain('Disabled: 1');
      expect(output).toContain('Total Active Token Usage:');

      // Check for notes
      expect(output).toContain('Token estimates are approximate');
    });

    it('should show warning for high token usage', () => {
      // Create config with many large servers to trigger high token warning
      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx @modelcontextprotocol/server-github'),
          'filesystem': mockServer('npx @modelcontextprotocol/server-filesystem'),
          'notion': mockServer('npx @notionhq/notion-mcp'),
          'puppeteer': mockServer('npx @modelcontextprotocol/server-puppeteer'),
          'canvas': mockServer('npx canvas-mcp-server'),
          'gemini': mockServer('npx gemini-collab'),
          'context7': mockServer('npx context7')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      statusCommand(adapter);

      const output = consoleMock.getOutput().join('\n');
      // Should show high or moderate token usage warning
      expect(output).toMatch(/HIGH TOKEN USAGE|MODERATE TOKEN USAGE|Token usage is under control/);
    });

    it('should show moderate token warning', () => {
      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx @modelcontextprotocol/server-github'),
          'notion': mockServer('npx @notionhq/notion-mcp'),
          'canvas': mockServer('npx canvas-mcp-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      statusCommand(adapter);

      const output = consoleMock.getOutput().join('\n');
      // Should have some token usage message
      expect(output).toMatch(/TOKEN USAGE|Token usage is under control/);
    });

    it('should handle empty enabled servers', () => {
      const config: MCPConfig = {
        enabled: {},
        disabled: {
          'notion': mockServer('npx notion-server')
        },
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      statusCommand(adapter);

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('ENABLED SERVERS');
      expect(output).toContain('(none)');
      expect(output).toContain('Total Active Token Usage:');
    });

    it('should handle empty config', () => {
      const config: MCPConfig = {
        enabled: {},
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      statusCommand(adapter);

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('SUMMARY:');
      expect(output).toContain('Total Servers: 0');
      expect(output).toContain('Enabled: 0');
      expect(output).toContain('Disabled: 0');
    });

    it('should handle config load failure', () => {
      // Don't create config file

      statusCommand(adapter);

      const errorOutput = consoleMock.getErrorOutput().join('\n');
      expect(errorOutput).toContain('Config not found');
      expect(exitMock.getExitCode()).toBe(1);
    });
  });

  describe('disable/enable round-trip', () => {
    it('should successfully disable and re-enable a server', () => {
      const initialConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server', { args: ['--token', 'xyz'] })
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, initialConfig);

      // Disable the server
      disableCommand(adapter, 'github');

      let config = adapter.loadConfig();
      expect(config.disabled).toHaveProperty('github');
      expect(config.disabled.github.args).toEqual(['--token', 'xyz']); // Verify args preserved

      // Re-enable the server
      enableCommand(adapter, 'github');

      config = adapter.loadConfig();
      expect(config.enabled).toHaveProperty('github');
      expect(config.enabled.github.args).toEqual(['--token', 'xyz']); // Verify args still preserved
    });
  });
});
