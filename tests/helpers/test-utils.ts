import fs from 'fs';
import path from 'path';
import os from 'os';
import type { MCPServer } from '../../src/adapters/base.js';

/**
 * Creates a temporary directory for testing
 */
export function createTempDir(prefix: string = 'mcp-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Removes a temporary directory and all its contents
 */
export function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Loads a JSON fixture file
 */
export function loadFixture(fixtureName: string): any {
  const fixturePath = path.join(__dirname, '../fixtures', fixtureName);
  const content = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Creates a mock MCP server configuration
 */
export function mockServer(
  command: string,
  overrides: Partial<MCPServer> = {}
): MCPServer {
  return {
    command,
    args: [],
    env: {},
    ...overrides,
  };
}

/**
 * Creates a test config file in a temp directory
 */
export function createTestConfigFile(dir: string, config: any): string {
  const configPath = path.join(dir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  return configPath;
}

/**
 * Reads a config file from disk
 */
export function readConfigFile(configPath: string): any {
  const content = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Creates a corrupted JSON file (invalid syntax)
 */
export function createCorruptedConfigFile(dir: string): string {
  const configPath = path.join(dir, 'corrupted.json');
  fs.writeFileSync(configPath, '{ "invalid": json syntax }', 'utf-8');
  return configPath;
}

/**
 * Asserts that two configs are deeply equal
 */
export function assertConfigEqual(actual: any, expected: any): void {
  expect(JSON.stringify(actual, null, 2)).toBe(JSON.stringify(expected, null, 2));
}

/**
 * Creates a minimal test environment
 */
export interface TestEnv {
  tempDir: string;
  configPath: string;
  backupDir: string;
  cleanup: () => void;
}

export function setupTestEnv(): TestEnv {
  const tempDir = createTempDir();
  const configPath = path.join(tempDir, 'config.json');
  const backupDir = path.join(tempDir, 'backups');

  fs.mkdirSync(backupDir, { recursive: true });

  return {
    tempDir,
    configPath,
    backupDir,
    cleanup: () => cleanupTempDir(tempDir),
  };
}
