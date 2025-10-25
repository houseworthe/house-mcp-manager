import { loadConfig, saveConfig, disableServer as disableServerConfig, isServerEnabled } from '../config.js';
import { success, error as formatError } from '../utils/formatting.js';

export function disableCommand(serverName: string): void {
  try {
    const config = loadConfig();

    // Check if server exists and is enabled
    if (!isServerEnabled(config, serverName)) {
      console.log(formatError(`Server "${serverName}" is not enabled or does not exist`));
      console.log('\nUse "mcp-manager list" to see available servers.');
      process.exit(1);
    }

    // Disable the server
    const updatedConfig = disableServerConfig(config, serverName);

    // Save the updated config
    saveConfig(updatedConfig);

    console.log(success(`Disabled "${serverName}"`));
    console.log('\nRestart Claude Code for changes to take effect.');
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
