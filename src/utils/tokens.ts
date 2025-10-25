import type { MCPServer } from '../config.js';

/**
 * Known token estimates for common MCP servers
 * Based on reported values from the community
 */
const KNOWN_SERVERS: Record<string, { tokens: number; tools: number }> = {
  'canvas-mcp-server': { tokens: 78000, tools: 42 },
  'context7': { tokens: 2000, tools: 2 },
  'gemini-collab': { tokens: 4000, tools: 4 },
  'puppeteer': { tokens: 8000, tools: 7 },
  'notion': { tokens: 35000, tools: 20 },
  'github': { tokens: 15000, tools: 12 },
  'slack': { tokens: 8000, tools: 8 },
  'filesystem': { tokens: 5000, tools: 5 },
  'postgres': { tokens: 10000, tools: 10 },
  'brave-search': { tokens: 3000, tools: 3 },
  'google-maps': { tokens: 5000, tools: 5 },
  'memory': { tokens: 4000, tools: 4 },
  'fetch': { tokens: 2000, tools: 2 },
  'sequential-thinking': { tokens: 3000, tools: 3 },
  'time': { tokens: 1000, tools: 2 },
  'sqlite': { tokens: 8000, tools: 8 },
  'mcp-server-commands': { tokens: 6000, tools: 6 },
  'everything': { tokens: 12000, tools: 10 },
};

/**
 * Base overhead for each MCP server (connection, metadata, etc.)
 */
const BASE_OVERHEAD = 500;

/**
 * Average tokens per tool definition
 */
const TOKENS_PER_TOOL = 150;

/**
 * Estimates the token count for a server
 */
export function estimateServerTokens(serverName: string, server: MCPServer): number {
  // Check if we have known data for this server
  const normalizedName = serverName.toLowerCase();

  for (const [knownName, data] of Object.entries(KNOWN_SERVERS)) {
    if (normalizedName.includes(knownName.toLowerCase())) {
      return data.tokens;
    }
  }

  // If server has a known command, make educated guess
  const command = server.command?.toLowerCase() || '';

  // Large servers based on command patterns
  if (command.includes('canvas')) return 78000;
  if (command.includes('notion')) return 35000;
  if (command.includes('github')) return 15000;
  if (command.includes('postgres') || command.includes('sql')) return 10000;
  if (command.includes('puppeteer') || command.includes('browser')) return 8000;
  if (command.includes('slack') || command.includes('discord')) return 8000;

  // Medium servers
  if (command.includes('search') || command.includes('google')) return 5000;
  if (command.includes('file') || command.includes('fs')) return 5000;

  // Small servers
  if (command.includes('time') || command.includes('date')) return 1000;
  if (command.includes('fetch') || command.includes('http')) return 2000;

  // Default estimate: assume ~5 tools
  return BASE_OVERHEAD + (5 * TOKENS_PER_TOOL);
}

/**
 * Estimates the number of tools for a server
 */
export function estimateServerTools(serverName: string, server: MCPServer): number {
  // Check known servers first
  const normalizedName = serverName.toLowerCase();

  for (const [knownName, data] of Object.entries(KNOWN_SERVERS)) {
    if (normalizedName.includes(knownName.toLowerCase())) {
      return data.tools;
    }
  }

  // Estimate based on command
  const command = server.command?.toLowerCase() || '';

  if (command.includes('canvas')) return 42;
  if (command.includes('notion')) return 20;
  if (command.includes('github')) return 12;
  if (command.includes('postgres') || command.includes('sql')) return 10;
  if (command.includes('puppeteer')) return 7;
  if (command.includes('slack')) return 8;
  if (command.includes('search')) return 3;
  if (command.includes('file')) return 5;
  if (command.includes('time')) return 2;
  if (command.includes('fetch')) return 2;

  // Default estimate
  return 5;
}

/**
 * Calculates total token usage across all servers
 */
export function calculateTotalTokens(servers: Record<string, MCPServer>): number {
  return Object.entries(servers).reduce((total, [name, server]) => {
    return total + estimateServerTokens(name, server);
  }, 0);
}

/**
 * Gets a human-readable description of token impact
 */
export function getTokenImpactDescription(tokens: number): string {
  if (tokens > 50000) {
    return 'VERY HIGH - Consider disabling if not actively used';
  } else if (tokens > 10000) {
    return 'HIGH - Significant context usage';
  } else if (tokens > 5000) {
    return 'MODERATE - Reasonable context usage';
  } else {
    return 'LOW - Minimal context usage';
  }
}

/**
 * Calculates potential token savings if server is disabled
 */
export function calculateSavings(
  currentTotal: number,
  serverTokens: number
): { tokens: number; percentage: number } {
  const tokens = serverTokens;
  const percentage = currentTotal > 0 ? (serverTokens / currentTotal) * 100 : 0;

  return { tokens, percentage };
}
