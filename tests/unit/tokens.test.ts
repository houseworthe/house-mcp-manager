import { describe, it, expect } from 'vitest';
import {
  estimateServerTokens,
  estimateServerTools,
  calculateTotalTokens,
  getTokenImpactDescription,
  calculateSavings,
} from '../../src/utils/tokens.js';
import { mockServer } from '../helpers/test-utils.js';

describe('tokens', () => {
  describe('estimateServerTokens', () => {
    it('should return correct tokens for known servers', () => {
      expect(estimateServerTokens('canvas-mcp-server', mockServer('npx'))).toBe(78000);
      expect(estimateServerTokens('notion', mockServer('npx'))).toBe(35000);
      expect(estimateServerTokens('github', mockServer('npx'))).toBe(15000);
      expect(estimateServerTokens('puppeteer', mockServer('npx'))).toBe(8000);
      expect(estimateServerTokens('postgres', mockServer('npx'))).toBe(10000);
    });

    it('should match known servers case-insensitively', () => {
      expect(estimateServerTokens('Canvas-MCP-Server', mockServer('npx'))).toBe(78000);
      expect(estimateServerTokens('NOTION', mockServer('npx'))).toBe(35000);
      expect(estimateServerTokens('GiThUb', mockServer('npx'))).toBe(15000);
    });

    it('should match known servers by partial name', () => {
      // The token estimation looks for the server name in the server name, not partial matches
      // So 'canvas-mcp-server' in 'my-canvas-server' won't match
      // Instead test with actual known server patterns
      expect(estimateServerTokens('canvas-mcp-server-v2', mockServer('npx'))).toBe(78000);
      expect(estimateServerTokens('github-enterprise', mockServer('npx'))).toBe(15000);
    });

    it('should use command heuristics for unknown servers', () => {
      expect(estimateServerTokens('unknown', mockServer('npx canvas'))).toBe(78000);
      expect(estimateServerTokens('unknown', mockServer('npx notion'))).toBe(35000);
      expect(estimateServerTokens('unknown', mockServer('npx github'))).toBe(15000);
      expect(estimateServerTokens('unknown', mockServer('npx postgres'))).toBe(10000);
      expect(estimateServerTokens('unknown', mockServer('npx puppeteer'))).toBe(8000);
    });

    it('should estimate medium-sized servers by command', () => {
      expect(estimateServerTokens('unknown', mockServer('npx search'))).toBe(5000);
      expect(estimateServerTokens('unknown', mockServer('npx google'))).toBe(5000);
      expect(estimateServerTokens('unknown', mockServer('npx file'))).toBe(5000);
      expect(estimateServerTokens('unknown', mockServer('npx filesystem'))).toBe(5000);
    });

    it('should estimate small servers by command', () => {
      expect(estimateServerTokens('unknown', mockServer('npx time'))).toBe(1000);
      expect(estimateServerTokens('unknown', mockServer('npx date'))).toBe(1000);
      expect(estimateServerTokens('unknown', mockServer('npx fetch'))).toBe(2000);
      expect(estimateServerTokens('unknown', mockServer('npx http'))).toBe(2000);
    });

    it('should return default estimate for completely unknown servers', () => {
      const defaultEstimate = 500 + (5 * 150); // BASE_OVERHEAD + (5 * TOKENS_PER_TOOL)
      expect(estimateServerTokens('completely-unknown', mockServer('node script.js'))).toBe(defaultEstimate);
    });

    it('should handle servers without command', () => {
      const server = mockServer('');
      server.command = undefined as any;
      const defaultEstimate = 500 + (5 * 150);
      expect(estimateServerTokens('unknown', server)).toBe(defaultEstimate);
    });
  });

  describe('estimateServerTools', () => {
    it('should return correct tool count for known servers', () => {
      expect(estimateServerTools('canvas-mcp-server', mockServer('npx'))).toBe(42);
      expect(estimateServerTools('notion', mockServer('npx'))).toBe(20);
      expect(estimateServerTools('github', mockServer('npx'))).toBe(12);
      expect(estimateServerTools('puppeteer', mockServer('npx'))).toBe(7);
      expect(estimateServerTools('postgres', mockServer('npx'))).toBe(10);
    });

    it('should match known servers case-insensitively', () => {
      expect(estimateServerTools('Canvas-MCP-Server', mockServer('npx'))).toBe(42);
      expect(estimateServerTools('GITHUB', mockServer('npx'))).toBe(12);
    });

    it('should use command heuristics for unknown servers', () => {
      expect(estimateServerTools('unknown', mockServer('npx canvas'))).toBe(42);
      expect(estimateServerTools('unknown', mockServer('npx notion'))).toBe(20);
      expect(estimateServerTools('unknown', mockServer('npx github'))).toBe(12);
      expect(estimateServerTools('unknown', mockServer('npx time'))).toBe(2);
      expect(estimateServerTools('unknown', mockServer('npx fetch'))).toBe(2);
    });

    it('should return default tool count for unknown servers', () => {
      expect(estimateServerTools('completely-unknown', mockServer('node script.js'))).toBe(5);
    });
  });

  describe('calculateTotalTokens', () => {
    it('should return 0 for empty server list', () => {
      expect(calculateTotalTokens({})).toBe(0);
    });

    it('should sum tokens for single server', () => {
      const servers = {
        github: mockServer('npx github'),
      };
      expect(calculateTotalTokens(servers)).toBe(15000);
    });

    it('should sum tokens for multiple servers', () => {
      const servers = {
        canvas: mockServer('npx canvas'),
        github: mockServer('npx github'),
        notion: mockServer('npx notion'),
      };
      expect(calculateTotalTokens(servers)).toBe(78000 + 15000 + 35000);
    });

    it('should handle mix of known and unknown servers', () => {
      const servers = {
        github: mockServer('npx github'),
        unknown: mockServer('node script.js'),
      };
      const expected = 15000 + (500 + 5 * 150);
      expect(calculateTotalTokens(servers)).toBe(expected);
    });
  });

  describe('getTokenImpactDescription', () => {
    it('should return "VERY HIGH" for tokens > 50000', () => {
      expect(getTokenImpactDescription(50001)).toBe('VERY HIGH - Consider disabling if not actively used');
      expect(getTokenImpactDescription(78000)).toBe('VERY HIGH - Consider disabling if not actively used');
      expect(getTokenImpactDescription(100000)).toBe('VERY HIGH - Consider disabling if not actively used');
    });

    it('should return "HIGH" for tokens between 10001 and 50000', () => {
      expect(getTokenImpactDescription(10001)).toBe('HIGH - Significant context usage');
      expect(getTokenImpactDescription(25000)).toBe('HIGH - Significant context usage');
      expect(getTokenImpactDescription(50000)).toBe('HIGH - Significant context usage');
    });

    it('should return "MODERATE" for tokens between 5001 and 10000', () => {
      expect(getTokenImpactDescription(5001)).toBe('MODERATE - Reasonable context usage');
      expect(getTokenImpactDescription(7500)).toBe('MODERATE - Reasonable context usage');
      expect(getTokenImpactDescription(10000)).toBe('MODERATE - Reasonable context usage');
    });

    it('should return "LOW" for tokens <= 5000', () => {
      expect(getTokenImpactDescription(5000)).toBe('LOW - Minimal context usage');
      expect(getTokenImpactDescription(2500)).toBe('LOW - Minimal context usage');
      expect(getTokenImpactDescription(1000)).toBe('LOW - Minimal context usage');
      expect(getTokenImpactDescription(0)).toBe('LOW - Minimal context usage');
    });
  });

  describe('calculateSavings', () => {
    it('should calculate tokens and percentage correctly', () => {
      const result = calculateSavings(100000, 25000);
      expect(result.tokens).toBe(25000);
      expect(result.percentage).toBe(25);
    });

    it('should handle 100% savings', () => {
      const result = calculateSavings(50000, 50000);
      expect(result.tokens).toBe(50000);
      expect(result.percentage).toBe(100);
    });

    it('should handle small percentages', () => {
      const result = calculateSavings(100000, 1000);
      expect(result.tokens).toBe(1000);
      expect(result.percentage).toBe(1);
    });

    it('should return 0 percentage when current total is 0', () => {
      const result = calculateSavings(0, 5000);
      expect(result.tokens).toBe(5000);
      expect(result.percentage).toBe(0);
    });

    it('should handle decimal percentages', () => {
      const result = calculateSavings(127000, 78000);
      expect(result.tokens).toBe(78000);
      expect(result.percentage).toBeCloseTo(61.42, 1);
    });

    it('should handle zero server tokens', () => {
      const result = calculateSavings(100000, 0);
      expect(result.tokens).toBe(0);
      expect(result.percentage).toBe(0);
    });
  });
});
