import type { MCPAdapter } from '../adapters/base.js';
import { success, error as formatError } from '../utils/formatting.js';

export function enableCommand(adapter: MCPAdapter, serverName: string): void {
  try {
    const config = adapter.loadConfig();

    // Check if server is already enabled
    if (adapter.isServerEnabled(config, serverName)) {
      console.log(formatError(`Server "${serverName}" is already enabled`));
      process.exit(1);
    }

    // Check if server exists in disabled servers
    if (!config.disabled[serverName]) {
      console.log(formatError(`Server "${serverName}" is not disabled or does not exist`));
      console.log('\nUse "mcp-manager list" to see available servers.');
      process.exit(1);
    }

    // Enable the server
    const updatedConfig = adapter.enableServer(config, serverName);

    // Save the updated config
    adapter.saveConfig(updatedConfig);

    console.log(success(`Enabled "${serverName}"`));
    console.log(`\nRestart ${adapter.name} for changes to take effect.`);
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
