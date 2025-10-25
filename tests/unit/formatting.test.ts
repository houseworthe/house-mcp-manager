import { describe, it, expect } from 'vitest';
import {
  success,
  error,
  warning,
  info,
  formatServerName,
  formatTokenCount,
  createServerTable,
  createProfileTable,
  header,
  subheader,
} from '../../src/utils/formatting.js';

describe('formatting', () => {
  describe('success', () => {
    it('should format success message with checkmark', () => {
      const result = success('Operation completed');
      expect(result).toContain('✓');
      expect(result).toContain('Operation completed');
    });

    it('should handle empty string', () => {
      const result = success('');
      expect(result).toContain('✓');
    });
  });

  describe('error', () => {
    it('should format error message with X symbol', () => {
      const result = error('Something went wrong');
      expect(result).toContain('✗');
      expect(result).toContain('Something went wrong');
    });

    it('should handle empty string', () => {
      const result = error('');
      expect(result).toContain('✗');
    });
  });

  describe('warning', () => {
    it('should format warning message with warning symbol', () => {
      const result = warning('Be careful');
      expect(result).toContain('⚠');
      expect(result).toContain('Be careful');
    });

    it('should handle empty string', () => {
      const result = warning('');
      expect(result).toContain('⚠');
    });
  });

  describe('info', () => {
    it('should format info message with info symbol', () => {
      const result = info('Here is some information');
      expect(result).toContain('ℹ');
      expect(result).toContain('Here is some information');
    });

    it('should handle empty string', () => {
      const result = info('');
      expect(result).toContain('ℹ');
    });
  });

  describe('formatServerName', () => {
    it('should format enabled server name', () => {
      const result = formatServerName('my-server', true);
      expect(result).toContain('my-server');
    });

    it('should format disabled server name', () => {
      const result = formatServerName('my-server', false);
      expect(result).toContain('my-server');
    });

    it('should handle empty server name', () => {
      const result = formatServerName('', true);
      // Empty string is falsy, so just check it's defined
      expect(result).toBeDefined();
    });
  });

  describe('formatTokenCount', () => {
    it('should format very high token count (>50000)', () => {
      const result = formatTokenCount(78000);
      expect(result).toContain('78,000');
      expect(result).toContain('tokens');
    });

    it('should format high token count (>10000)', () => {
      const result = formatTokenCount(25000);
      expect(result).toContain('25,000');
      expect(result).toContain('tokens');
    });

    it('should format low token count (<=10000)', () => {
      const result = formatTokenCount(5000);
      expect(result).toContain('5,000');
      expect(result).toContain('tokens');
    });

    it('should format zero tokens', () => {
      const result = formatTokenCount(0);
      expect(result).toContain('0');
      expect(result).toContain('tokens');
    });

    it('should use tilde prefix for estimates', () => {
      const result = formatTokenCount(1000);
      expect(result).toContain('~1,000');
    });

    it('should format large numbers with commas', () => {
      const result = formatTokenCount(127000);
      expect(result).toContain('127,000');
    });
  });

  describe('createServerTable', () => {
    it('should create table with correct headers', () => {
      const table = createServerTable();
      const tableString = table.toString();

      expect(tableString).toContain('Server');
      expect(tableString).toContain('Status');
      expect(tableString).toContain('Token Estimate');
      expect(tableString).toContain('Tools');
    });

    it('should create table object', () => {
      const table = createServerTable();
      expect(table).toBeDefined();
      expect(typeof table.push).toBe('function');
      expect(typeof table.toString).toBe('function');
    });

    it('should allow adding rows', () => {
      const table = createServerTable();
      table.push(['server1', 'enabled', '5000 tokens', '5']);
      const tableString = table.toString();

      expect(tableString).toContain('server1');
      expect(tableString).toContain('enabled');
    });
  });

  describe('createProfileTable', () => {
    it('should create table with correct headers', () => {
      const table = createProfileTable();
      const tableString = table.toString();

      expect(tableString).toContain('Profile');
      expect(tableString).toContain('Servers');
      expect(tableString).toContain('Created');
    });

    it('should create table object', () => {
      const table = createProfileTable();
      expect(table).toBeDefined();
      expect(typeof table.push).toBe('function');
      expect(typeof table.toString).toBe('function');
    });

    it('should allow adding rows', () => {
      const table = createProfileTable();
      table.push(['minimal', '3', '2025-01-01']);
      const tableString = table.toString();

      expect(tableString).toContain('minimal');
      expect(tableString).toContain('3');
    });
  });

  describe('header', () => {
    it('should format header with underline', () => {
      const result = header('Test Header');
      expect(result).toContain('Test Header');
      expect(result).toContain('='.repeat('Test Header'.length));
    });

    it('should include newlines', () => {
      const result = header('Test');
      expect(result).toMatch(/^\n/);
      expect(result).toContain('\n');
    });

    it('should handle long headers', () => {
      const longHeader = 'This is a very long header text';
      const result = header(longHeader);
      expect(result).toContain(longHeader);
      expect(result).toContain('='.repeat(longHeader.length));
    });

    it('should handle empty string', () => {
      const result = header('');
      expect(result).toContain('\n');
    });
  });

  describe('subheader', () => {
    it('should format subheader with bold text', () => {
      const result = subheader('Test Subheader');
      expect(result).toContain('Test Subheader');
      expect(result).toMatch(/^\n/);
    });

    it('should not have underline', () => {
      const result = subheader('Test');
      expect(result).not.toContain('='.repeat('Test'.length));
      expect(result).not.toContain('-'.repeat('Test'.length));
    });

    it('should handle empty string', () => {
      const result = subheader('');
      expect(result).toBeTruthy();
    });
  });
});
