import type { MCPAdapter } from './base.js';
import { ClaudeAdapter } from './claude.js';
import { ClineAdapter } from './cline.js';

/**
 * Registry of all available MCP adapters
 */
export class AdapterRegistry {
  private static adapters: MCPAdapter[] = [
    new ClaudeAdapter(),
    new ClineAdapter(),
    // Add more adapters here as they're implemented
  ];

  /**
   * Get all registered adapters
   */
  static getAll(): MCPAdapter[] {
    return this.adapters;
  }

  /**
   * Get adapter by ID
   */
  static getById(id: string): MCPAdapter | undefined {
    return this.adapters.find(adapter => adapter.id === id);
  }

  /**
   * Detect all installed tools
   */
  static detectAll(): MCPAdapter[] {
    return this.adapters.filter(adapter => adapter.detect());
  }

  /**
   * Auto-select the best adapter
   * Priority: Claude > Cline > Continue > Others
   */
  static autoSelect(): MCPAdapter | null {
    const detected = this.detectAll();

    if (detected.length === 0) {
      return null;
    }

    // Priority order
    const priority = ['claude', 'cline', 'continue', 'zed'];

    for (const id of priority) {
      const adapter = detected.find(a => a.id === id);
      if (adapter) {
        return adapter;
      }
    }

    // Return first detected if none match priority
    return detected[0];
  }

  /**
   * Get adapter by ID or auto-select
   */
  static getAdapter(id?: string): MCPAdapter {
    if (id) {
      const adapter = this.getById(id);
      if (!adapter) {
        const available = this.adapters.map(a => a.id).join(', ');
        throw new Error(
          `Unknown tool: "${id}"\n` +
          `Available tools: ${available}\n` +
          `Use "mcp-manager detect" to see which tools are installed.`
        );
      }

      if (!adapter.detect()) {
        throw new Error(
          `${adapter.name} is not installed or not configured.\n` +
          `Use "mcp-manager detect" to see which tools are installed.`
        );
      }

      return adapter;
    }

    // Auto-select
    const adapter = this.autoSelect();
    if (!adapter) {
      const available = this.adapters.map(a => a.name).join(', ');
      throw new Error(
        `No MCP-enabled tools detected.\n` +
        `Supported tools: ${available}\n\n` +
        `Make sure you have at least one of these tools installed and configured.`
      );
    }

    return adapter;
  }
}
