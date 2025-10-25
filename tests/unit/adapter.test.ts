import { describe, it, expect, beforeEach } from 'vitest';
import { MockAdapter, createMockConfig } from '../helpers/mock-adapter.js';
import { mockServer } from '../helpers/test-utils.js';

describe('BaseAdapter', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    adapter = new MockAdapter();
  });

  describe('getEnabledServers', () => {
    it('should return empty array for config with no enabled servers', () => {
      const config = createMockConfig({}, {});
      adapter.setConfig(config);

      const result = adapter.getEnabledServers(adapter.loadConfig());
      expect(result).toEqual([]);
    });

    it('should return list of enabled server names', () => {
      const config = createMockConfig(
        {
          server1: mockServer('npx server1'),
          server2: mockServer('npx server2'),
        },
        {}
      );
      adapter.setConfig(config);

      const result = adapter.getEnabledServers(adapter.loadConfig());
      expect(result).toEqual(['server1', 'server2']);
    });
  });

  describe('getDisabledServers', () => {
    it('should return empty array for config with no disabled servers', () => {
      const config = createMockConfig({}, {});
      adapter.setConfig(config);

      const result = adapter.getDisabledServers(adapter.loadConfig());
      expect(result).toEqual([]);
    });

    it('should return list of disabled server names', () => {
      const config = createMockConfig(
        {},
        {
          server3: mockServer('npx server3'),
          server4: mockServer('npx server4'),
        }
      );
      adapter.setConfig(config);

      const result = adapter.getDisabledServers(adapter.loadConfig());
      expect(result).toEqual(['server3', 'server4']);
    });
  });

  describe('getAllServers', () => {
    it('should return empty array when no servers exist', () => {
      const config = createMockConfig({}, {});
      adapter.setConfig(config);

      const result = adapter.getAllServers(adapter.loadConfig());
      expect(result).toEqual([]);
    });

    it('should return all servers (enabled and disabled)', () => {
      const config = createMockConfig(
        {
          server1: mockServer('npx server1'),
          server2: mockServer('npx server2'),
        },
        {
          server3: mockServer('npx server3'),
          server4: mockServer('npx server4'),
        }
      );
      adapter.setConfig(config);

      const result = adapter.getAllServers(adapter.loadConfig());
      expect(result.sort()).toEqual(['server1', 'server2', 'server3', 'server4'].sort());
    });
  });

  describe('serverExists', () => {
    beforeEach(() => {
      const config = createMockConfig(
        {
          'enabled-server': mockServer('npx enabled'),
        },
        {
          'disabled-server': mockServer('npx disabled'),
        }
      );
      adapter.setConfig(config);
    });

    it('should return true for enabled server', () => {
      const result = adapter.serverExists(adapter.loadConfig(), 'enabled-server');
      expect(result).toBe(true);
    });

    it('should return true for disabled server', () => {
      const result = adapter.serverExists(adapter.loadConfig(), 'disabled-server');
      expect(result).toBe(true);
    });

    it('should return false for non-existent server', () => {
      const result = adapter.serverExists(adapter.loadConfig(), 'nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('isServerEnabled', () => {
    beforeEach(() => {
      const config = createMockConfig(
        {
          'enabled-server': mockServer('npx enabled'),
        },
        {
          'disabled-server': mockServer('npx disabled'),
        }
      );
      adapter.setConfig(config);
    });

    it('should return true for enabled server', () => {
      const result = adapter.isServerEnabled(adapter.loadConfig(), 'enabled-server');
      expect(result).toBe(true);
    });

    it('should return false for disabled server', () => {
      const result = adapter.isServerEnabled(adapter.loadConfig(), 'disabled-server');
      expect(result).toBe(false);
    });

    it('should return false for non-existent server', () => {
      const result = adapter.isServerEnabled(adapter.loadConfig(), 'nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('disableServer', () => {
    it('should move server from enabled to disabled', () => {
      const config = createMockConfig(
        {
          'test-server': mockServer('npx test'),
        },
        {}
      );
      adapter.setConfig(config);

      const updatedConfig = adapter.disableServer(adapter.loadConfig(), 'test-server');

      expect(updatedConfig.enabled['test-server']).toBeUndefined();
      expect(updatedConfig.disabled['test-server']).toBeDefined();
      expect(updatedConfig.disabled['test-server'].command).toBe('npx test');
    });

    it('should throw error when disabling non-existent server', () => {
      const config = createMockConfig({}, {});
      adapter.setConfig(config);

      expect(() => {
        adapter.disableServer(adapter.loadConfig(), 'nonexistent');
      }).toThrow('Server "nonexistent" is not enabled or does not exist');
    });

    it('should throw error when disabling already disabled server', () => {
      const config = createMockConfig(
        {},
        {
          'test-server': mockServer('npx test'),
        }
      );
      adapter.setConfig(config);

      expect(() => {
        adapter.disableServer(adapter.loadConfig(), 'test-server');
      }).toThrow('Server "test-server" is not enabled or does not exist');
    });

    it('should preserve server configuration when disabling', () => {
      const serverConfig = mockServer('npx test', {
        args: ['--flag'],
        env: { KEY: 'value' },
      });

      const config = createMockConfig(
        {
          'test-server': serverConfig,
        },
        {}
      );
      adapter.setConfig(config);

      const updatedConfig = adapter.disableServer(adapter.loadConfig(), 'test-server');

      expect(updatedConfig.disabled['test-server']).toEqual(serverConfig);
    });
  });

  describe('enableServer', () => {
    it('should move server from disabled to enabled', () => {
      const config = createMockConfig(
        {},
        {
          'test-server': mockServer('npx test'),
        }
      );
      adapter.setConfig(config);

      const updatedConfig = adapter.enableServer(adapter.loadConfig(), 'test-server');

      expect(updatedConfig.disabled['test-server']).toBeUndefined();
      expect(updatedConfig.enabled['test-server']).toBeDefined();
      expect(updatedConfig.enabled['test-server'].command).toBe('npx test');
    });

    it('should throw error when enabling non-existent server', () => {
      const config = createMockConfig({}, {});
      adapter.setConfig(config);

      expect(() => {
        adapter.enableServer(adapter.loadConfig(), 'nonexistent');
      }).toThrow('Server "nonexistent" is not disabled or does not exist');
    });

    it('should throw error when enabling already enabled server', () => {
      const config = createMockConfig(
        {
          'test-server': mockServer('npx test'),
        },
        {}
      );
      adapter.setConfig(config);

      expect(() => {
        adapter.enableServer(adapter.loadConfig(), 'test-server');
      }).toThrow('Server "test-server" is not disabled or does not exist');
    });

    it('should preserve server configuration when enabling', () => {
      const serverConfig = mockServer('npx test', {
        args: ['--flag'],
        env: { KEY: 'value' },
      });

      const config = createMockConfig(
        {},
        {
          'test-server': serverConfig,
        }
      );
      adapter.setConfig(config);

      const updatedConfig = adapter.enableServer(adapter.loadConfig(), 'test-server');

      expect(updatedConfig.enabled['test-server']).toEqual(serverConfig);
    });
  });

  describe('toggleServer', () => {
    it('should disable an enabled server', () => {
      const config = createMockConfig(
        {
          'test-server': mockServer('npx test'),
        },
        {}
      );
      adapter.setConfig(config);

      const updatedConfig = adapter.toggleServer(adapter.loadConfig(), 'test-server');

      expect(updatedConfig.enabled['test-server']).toBeUndefined();
      expect(updatedConfig.disabled['test-server']).toBeDefined();
    });

    it('should enable a disabled server', () => {
      const config = createMockConfig(
        {},
        {
          'test-server': mockServer('npx test'),
        }
      );
      adapter.setConfig(config);

      const updatedConfig = adapter.toggleServer(adapter.loadConfig(), 'test-server');

      expect(updatedConfig.disabled['test-server']).toBeUndefined();
      expect(updatedConfig.enabled['test-server']).toBeDefined();
    });

    it('should throw error when toggling non-existent server', () => {
      const config = createMockConfig({}, {});
      adapter.setConfig(config);

      expect(() => {
        adapter.toggleServer(adapter.loadConfig(), 'nonexistent');
      }).toThrow('Server "nonexistent" does not exist');
    });
  });

  describe('createBackup', () => {
    it('should create a backup of current config', () => {
      const config = createMockConfig(
        {
          server1: mockServer('npx server1'),
        },
        {}
      );
      adapter.setConfig(config);

      const backupPath = adapter.createBackup();

      expect(backupPath).toContain('/mock/backups/config-');
      expect(backupPath).toContain('.json');

      const backups = adapter.getBackups();
      expect(backups).toHaveLength(1);
      expect(backups[0].config).toEqual(config);
    });

    it('should create multiple backups without overwriting', () => {
      const config1 = createMockConfig({ server1: mockServer('npx server1') }, {});
      adapter.setConfig(config1);
      adapter.createBackup();

      const config2 = createMockConfig({ server2: mockServer('npx server2') }, {});
      adapter.setConfig(config2);
      adapter.createBackup();

      const backups = adapter.getBackups();
      expect(backups).toHaveLength(2);
      expect(backups[0].config).toEqual(config1);
      expect(backups[1].config).toEqual(config2);
    });

    it('should throw error when no config exists', () => {
      expect(() => {
        adapter.createBackup();
      }).toThrow('No config to backup');
    });
  });

  describe('saveConfig and loadConfig', () => {
    it('should save and load config correctly', () => {
      const config = createMockConfig(
        {
          server1: mockServer('npx server1'),
        },
        {
          server2: mockServer('npx server2'),
        }
      );

      adapter.saveConfig(config);
      const loaded = adapter.loadConfig();

      expect(loaded).toEqual(config);
    });

    it('should throw error when loading non-existent config', () => {
      expect(() => {
        adapter.loadConfig();
      }).toThrow('Config not found');
    });

    it('should handle save failure', () => {
      const config = createMockConfig({}, {});
      adapter.setShouldFailOnSave(true);

      expect(() => {
        adapter.saveConfig(config);
      }).toThrow('Mock save failure');
    });

    it('should handle load failure', () => {
      const config = createMockConfig({}, {});
      adapter.setConfig(config);
      adapter.setShouldFailOnLoad(true);

      expect(() => {
        adapter.loadConfig();
      }).toThrow('Mock load failure');
    });
  });

  describe('detect', () => {
    it('should return true when tool is installed', () => {
      adapter.setInstalled(true);
      expect(adapter.detect()).toBe(true);
    });

    it('should return false when tool is not installed', () => {
      adapter.setInstalled(false);
      expect(adapter.detect()).toBe(false);
    });
  });

  describe('getConfigPath', () => {
    it('should return config path', () => {
      const result = adapter.getConfigPath();
      expect(result).toBe('/mock/path/config.json');
    });

    it('should allow custom config path', () => {
      adapter.setConfigPath('/custom/path.json');
      expect(adapter.getConfigPath()).toBe('/custom/path.json');
    });
  });
});
