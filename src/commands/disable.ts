import type { MCPAdapter } from '../adapters/base.js';
import { success, error as formatError } from '../utils/formatting.js';

export function disableCommand(adapter: MCPAdapter, serverName: string): void {
  try {
    const config = adapter.loadConfig();

    // Check if server exists and is enabled
    if (!adapter.isServerEnabled(config, serverName)) {
      console.log(formatError(`Server "${serverName}" is not enabled or does not exist`));
      console.log('\nUse "house-mcp-manager list" to see available servers.');
      process.exit(1);
    }

    // Disable the server
    const updatedConfig = adapter.disableServer(config, serverName);

    // Save the updated config
    adapter.saveConfig(updatedConfig);

    console.log(success(`Disabled "${serverName}"`));
    console.log(`\nRestart ${adapter.name} for changes to take effect.`);
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
