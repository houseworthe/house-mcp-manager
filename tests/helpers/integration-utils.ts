import { vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { BaseAdapter, type MCPConfig } from '../../src/adapters/base.js';

/**
 * Test adapter for integration tests that uses temp directories
 */
export class TestAdapter extends BaseAdapter {
  readonly name = 'Test Tool';
  readonly id = 'test';

  private configPath: string;
  private backupDir: string;

  constructor(configPath: string, backupDir: string) {
    super();
    this.configPath = configPath;
    this.backupDir = backupDir;
  }

  detect(): boolean {
    return fs.existsSync(this.configPath);
  }

  getConfigPath(): string {
    return this.configPath;
  }

  createBackup(): string {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Config not found at ${this.configPath}`);
    }

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `config-${timestamp}.json`);

    fs.copyFileSync(this.configPath, backupPath);

    return backupPath;
  }

  loadConfig(): MCPConfig {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Config not found at ${this.configPath}`);
    }

    const raw = fs.readFileSync(this.configPath, 'utf-8');

    try {
      const parsed = JSON.parse(raw);
      return {
        enabled: parsed.enabled || {},
        disabled: parsed.disabled || {},
        metadata: parsed.metadata || { tool: 'test' }
      };
    } catch (error) {
      throw new Error(`Failed to parse config: ${error}`);
    }
  }

  saveConfig(config: MCPConfig): void {
    // Create backup before modifying
    if (fs.existsSync(this.configPath)) {
      this.createBackup();
    }

    try {
      const jsonString = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.configPath, jsonString, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }
}

/**
 * Mock console functions and capture output
 */
export interface ConsoleMock {
  log: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  restore: () => void;
  getOutput: () => string[];
  getErrorOutput: () => string[];
}

export function mockConsole(): ConsoleMock {
  const logOutput: string[] = [];
  const errorOutput: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;

  const logSpy = vi.fn((...args: any[]) => {
    logOutput.push(args.map(String).join(' '));
  });

  const errorSpy = vi.fn((...args: any[]) => {
    errorOutput.push(args.map(String).join(' '));
  });

  console.log = logSpy as any;
  console.error = errorSpy as any;

  return {
    log: logSpy,
    error: errorSpy,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
    },
    getOutput: () => logOutput,
    getErrorOutput: () => errorOutput
  };
}

/**
 * Mock process.exit to prevent test termination
 */
export interface ProcessExitMock {
  exit: ReturnType<typeof vi.fn>;
  restore: () => void;
  getExitCode: () => number | null;
}

export function mockProcessExit(): ProcessExitMock {
  let exitCode: number | null = null;

  const originalExit = process.exit;

  const exitSpy = vi.fn((code?: number) => {
    exitCode = code ?? 0;
    // Don't actually exit in tests
  });

  process.exit = exitSpy as any;

  return {
    exit: exitSpy,
    restore: () => {
      process.exit = originalExit;
    },
    getExitCode: () => exitCode
  };
}
