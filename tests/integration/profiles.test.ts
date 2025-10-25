import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { setupTestEnv, type TestEnv, createTestConfigFile, mockServer } from '../helpers/test-utils.js';
import { TestAdapter, mockConsole, mockProcessExit, type ConsoleMock, type ProcessExitMock } from '../helpers/integration-utils.js';
import type { MCPConfig } from '../../src/adapters/base.js';

// Profile module functions - will be dynamically imported
let saveProfile: any;
let loadProfile: any;
let listProfilesCommand: any;
let deleteProfile: any;
let createPrebuiltProfiles: any;

describe('Profiles Integration', () => {
  let env: TestEnv;
  let adapter: TestAdapter;
  let consoleMock: ConsoleMock;
  let exitMock: ProcessExitMock;
  let profilesDir: string;
  let homedirSpy: any;

  beforeEach(async () => {
    env = setupTestEnv();

    // Spy on os.homedir BEFORE importing profile module
    profilesDir = path.join(env.tempDir, '.claude-mcp-profiles');
    homedirSpy = vi.spyOn(os, 'homedir').mockReturnValue(env.tempDir);

    // Dynamically import profile module AFTER mocking os.homedir
    // This ensures PROFILES_DIR is evaluated with the mocked homedir
    const profileModule = await import('../../src/commands/profile.js?t=' + Date.now());
    saveProfile = profileModule.saveProfile;
    loadProfile = profileModule.loadProfile;
    listProfilesCommand = profileModule.listProfilesCommand;
    deleteProfile = profileModule.deleteProfile;
    createPrebuiltProfiles = profileModule.createPrebuiltProfiles;

    adapter = new TestAdapter(env.configPath, env.backupDir);
    consoleMock = mockConsole();
    exitMock = mockProcessExit();
  });

  afterEach(() => {
    homedirSpy.mockRestore();
    consoleMock.restore();
    exitMock.restore();
    env.cleanup();
  });

  describe('saveProfile', () => {
    it('should save profile successfully', () => {
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

      saveProfile(adapter, 'my-profile');

      // Verify success message
      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('Saved profile "my-profile" for Test Tool');
      expect(output).toContain('Profile saved to:');

      // Verify profile file exists
      const profilePath = path.join(profilesDir, 'my-profile.json');
      expect(fs.existsSync(profilePath)).toBe(true);

      // Verify profile content
      const profileContent = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
      expect(profileContent.name).toBe('my-profile');
      expect(profileContent.tool).toBe('test');
      expect(profileContent.enabled).toEqual(config.enabled);
      expect(profileContent.disabled).toEqual(config.disabled);
      expect(profileContent.created).toBeDefined();
    });

    it('should overwrite existing profile', () => {
      const initialConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, initialConfig);

      // Save first version
      saveProfile(adapter, 'my-profile');

      // Update config
      const updatedConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server'),
          'filesystem': mockServer('npx filesystem-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, updatedConfig);

      // Save again with same name
      saveProfile(adapter, 'my-profile');

      // Verify profile was overwritten
      const profilePath = path.join(profilesDir, 'my-profile.json');
      const profileContent = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
      expect(Object.keys(profileContent.enabled)).toHaveLength(2);
      expect(profileContent.enabled).toHaveProperty('filesystem');
    });

    it('should handle config load failure', () => {
      // Don't create config file

      saveProfile(adapter, 'my-profile');

      const errorOutput = consoleMock.getErrorOutput().join('\n');
      expect(errorOutput).toContain('Config not found');
      expect(exitMock.getExitCode()).toBe(1);
    });
  });

  describe('loadProfile', () => {
    it('should load profile successfully', () => {
      // Create and save a profile
      const originalConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server'),
          'filesystem': mockServer('npx filesystem-server')
        },
        disabled: {
          'notion': mockServer('npx notion-server')
        },
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, originalConfig);
      saveProfile(adapter, 'test-profile');

      // Create a different current config
      const currentConfig: MCPConfig = {
        enabled: {
          'puppeteer': mockServer('npx puppeteer-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, currentConfig);

      // Load the profile
      loadProfile(adapter, 'test-profile');

      // Verify success message
      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('Loaded profile "test-profile"');
      expect(output).toContain('Restart Test Tool for changes to take effect');

      // Verify config was updated
      const updatedConfig = adapter.loadConfig();
      expect(updatedConfig.enabled).toEqual(originalConfig.enabled);
      expect(updatedConfig.disabled).toEqual(originalConfig.disabled);
    });

    it('should fail when profile does not exist', () => {
      const config: MCPConfig = {
        enabled: {},
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      loadProfile(adapter, 'nonexistent');

      const errorOutput = consoleMock.getErrorOutput().join('\n');
      const output = consoleMock.getOutput().join('\n');
      expect(errorOutput).toContain('Profile "nonexistent" does not exist');
      expect(output).toContain('Use "mcp-manager profile list" to see available profiles');
      expect(exitMock.getExitCode()).toBe(1);
    });

    it('should warn when loading profile from different tool', () => {
      // Ensure profiles directory exists
      fs.mkdirSync(profilesDir, { recursive: true });

      // Create profile with different tool ID
      const profilePath = path.join(profilesDir, 'other-tool-profile.json');
      const profile = {
        name: 'other-tool-profile',
        tool: 'claude',  // Different from our test adapter
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        created: new Date().toISOString()
      };
      fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));

      const config: MCPConfig = {
        enabled: {},
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      loadProfile(adapter, 'other-tool-profile');

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('Warning: Profile "other-tool-profile" was created for claude');
      expect(output).toContain('loading into test');
    });

    it('should handle backward compatibility with old profile format', () => {
      // Ensure profiles directory exists
      fs.mkdirSync(profilesDir, { recursive: true });

      // Create profile in old format (mcpServers instead of enabled)
      const profilePath = path.join(profilesDir, 'old-format-profile.json');
      const oldProfile = {
        name: 'old-format-profile',
        mcpServers: {
          'github': mockServer('npx github-server')
        },
        _disabled_mcpServers: {
          'notion': mockServer('npx notion-server')
        },
        created: new Date().toISOString()
      };
      fs.writeFileSync(profilePath, JSON.stringify(oldProfile, null, 2));

      const config: MCPConfig = {
        enabled: {},
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      loadProfile(adapter, 'old-format-profile');

      // Verify it loaded correctly
      const updatedConfig = adapter.loadConfig();
      expect(updatedConfig.enabled).toHaveProperty('github');
      expect(updatedConfig.disabled).toHaveProperty('notion');
    });
  });

  describe('listProfilesCommand', () => {
    it('should display all saved profiles', () => {
      // Create initial config
      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {
          'notion': mockServer('npx notion-server')
        },
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      // Save multiple profiles
      saveProfile(adapter, 'profile1');

      const config2: MCPConfig = {
        enabled: {
          'filesystem': mockServer('npx filesystem-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config2);
      saveProfile(adapter, 'profile2');

      listProfilesCommand();

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('Saved Profiles');
      expect(output).toContain('profile1');
      expect(output).toContain('profile2');
      expect(output).toContain('[test]'); // Tool tag
      expect(output).toContain('Use "mcp-manager profile load <name>" to load a profile');
    });

    it('should show server counts in profile list', () => {
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
      saveProfile(adapter, 'test-profile');

      listProfilesCommand();

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('2 enabled, 1 disabled');
    });

    it('should handle empty profiles directory', () => {
      listProfilesCommand();

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('Saved Profiles');
      expect(output).toContain('No profiles saved yet');
      expect(output).toContain('Use "mcp-manager profile save <name>" to save your current configuration');
    });

    it('should support old profile format in list', () => {
      // Ensure profiles directory exists
      fs.mkdirSync(profilesDir, { recursive: true });

      // Create profile in old format
      const profilePath = path.join(profilesDir, 'old-profile.json');
      const oldProfile = {
        name: 'old-profile',
        mcpServers: {
          'github': mockServer('npx github-server'),
          'filesystem': mockServer('npx filesystem-server')
        },
        _disabled_mcpServers: {
          'notion': mockServer('npx notion-server')
        },
        created: new Date().toISOString()
      };
      fs.writeFileSync(profilePath, JSON.stringify(oldProfile, null, 2));

      listProfilesCommand();

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('old-profile');
      expect(output).toContain('2 enabled, 1 disabled');
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile successfully', () => {
      const config: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server')
        },
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);
      saveProfile(adapter, 'to-delete');

      const profilePath = path.join(profilesDir, 'to-delete.json');
      expect(fs.existsSync(profilePath)).toBe(true);

      deleteProfile('to-delete');

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('Deleted profile "to-delete"');

      // Verify file was removed
      expect(fs.existsSync(profilePath)).toBe(false);
    });

    it('should fail when profile does not exist', () => {
      deleteProfile('nonexistent');

      const errorOutput = consoleMock.getErrorOutput().join('\n');
      const output = consoleMock.getOutput().join('\n');
      expect(errorOutput).toContain('Profile "nonexistent" does not exist');
      expect(output).toContain('Use "mcp-manager profile list" to see available profiles');
      expect(exitMock.getExitCode()).toBe(1);
    });
  });

  describe('createPrebuiltProfiles', () => {
    it('should create minimal and full profiles', () => {
      const config: MCPConfig = {
        enabled: {
          'time': mockServer('npx time-server'),
          'github': mockServer('npx github-server'),
          'fetch': mockServer('npx fetch-server'),
          'notion': mockServer('npx notion-server')
        },
        disabled: {
          'puppeteer': mockServer('npx puppeteer-server')
        },
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      createPrebuiltProfiles(adapter);

      const output = consoleMock.getOutput().join('\n');
      expect(output).toContain('Created pre-built profiles for Test Tool: "minimal" and "full"');

      // Verify minimal profile
      const minimalPath = path.join(profilesDir, 'minimal.json');
      expect(fs.existsSync(minimalPath)).toBe(true);
      const minimalProfile = JSON.parse(fs.readFileSync(minimalPath, 'utf-8'));
      expect(minimalProfile.name).toBe('minimal');
      expect(minimalProfile.tool).toBe('test');

      // Minimal should only have essential servers (time, fetch) enabled
      expect(minimalProfile.enabled).toHaveProperty('time');
      expect(minimalProfile.enabled).toHaveProperty('fetch');
      expect(Object.keys(minimalProfile.enabled).length).toBeLessThan(4);

      // Verify full profile
      const fullPath = path.join(profilesDir, 'full.json');
      expect(fs.existsSync(fullPath)).toBe(true);
      const fullProfile = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      expect(fullProfile.name).toBe('full');

      // Full should have all servers enabled
      expect(Object.keys(fullProfile.enabled).length).toBe(5); // All 4 enabled + 1 disabled
      expect(fullProfile.enabled).toHaveProperty('puppeteer'); // Previously disabled
      expect(Object.keys(fullProfile.disabled).length).toBe(0);
    });

    it('should handle configs with only disabled servers', () => {
      const config: MCPConfig = {
        enabled: {},
        disabled: {
          'github': mockServer('npx github-server'),
          'notion': mockServer('npx notion-server')
        },
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, config);

      createPrebuiltProfiles(adapter);

      // Verify minimal profile has all servers disabled
      const minimalPath = path.join(profilesDir, 'minimal.json');
      const minimalProfile = JSON.parse(fs.readFileSync(minimalPath, 'utf-8'));
      expect(Object.keys(minimalProfile.enabled).length).toBe(0);
      expect(Object.keys(minimalProfile.disabled).length).toBe(2);

      // Verify full profile has all servers enabled
      const fullPath = path.join(profilesDir, 'full.json');
      const fullProfile = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      expect(Object.keys(fullProfile.enabled).length).toBe(2);
      expect(Object.keys(fullProfile.disabled).length).toBe(0);
    });
  });

  describe('profile save/load round-trip', () => {
    it('should preserve exact server configuration through save/load cycle', () => {
      const originalConfig: MCPConfig = {
        enabled: {
          'github': mockServer('npx github-server', {
            args: ['--token', 'abc123'],
            env: { 'GITHUB_TOKEN': 'secret' }
          }),
          'filesystem': mockServer('npx filesystem-server', {
            args: ['/path/to/dir']
          })
        },
        disabled: {
          'notion': mockServer('npx notion-server', {
            env: { 'NOTION_KEY': 'key123' }
          })
        },
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, originalConfig);

      // Save profile
      saveProfile(adapter, 'round-trip-test');

      // Change current config
      const differentConfig: MCPConfig = {
        enabled: {},
        disabled: {},
        metadata: { tool: 'test' }
      };
      createTestConfigFile(env.tempDir, differentConfig);

      // Load profile back
      loadProfile(adapter, 'round-trip-test');

      // Verify everything is preserved
      const restoredConfig = adapter.loadConfig();
      expect(restoredConfig.enabled.github.args).toEqual(['--token', 'abc123']);
      expect(restoredConfig.enabled.github.env).toEqual({ 'GITHUB_TOKEN': 'secret' });
      expect(restoredConfig.enabled.filesystem.args).toEqual(['/path/to/dir']);
      expect(restoredConfig.disabled.notion.env).toEqual({ 'NOTION_KEY': 'key123' });
    });
  });
});
