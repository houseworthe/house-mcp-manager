import { loadConfig, saveConfig, enableServer as enableServerConfig, isServerEnabled } from '../config.js';
import { success, error as formatError } from '../utils/formatting.js';

export function enableCommand(serverName: string): void {
  try {
    const config = loadConfig();

    // Check if server is already enabled
    if (isServerEnabled(config, serverName)) {
      console.log(formatError(`Server "${serverName}" is already enabled`));
      process.exit(1);
    }

    // Check if server exists in disabled servers
    if (!config._disabled_mcpServers?.[serverName]) {
      console.log(formatError(`Server "${serverName}" is not disabled or does not exist`));
      console.log('\nUse "mcp-manager list" to see available servers.');
      process.exit(1);
    }

    // Enable the server
    const updatedConfig = enableServerConfig(config, serverName);

    // Save the updated config
    saveConfig(updatedConfig);

    console.log(success(`Enabled "${serverName}"`));
    console.log('\nRestart Claude Code for changes to take effect.');
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
