import chalk from 'chalk';
import type { MCPAdapter, MCPConfig } from '../adapters/base.js';
import type { ScopeInfo } from '../utils/scope.js';
import { success, error as formatError } from '../utils/formatting.js';

export function disableCommand(adapter: MCPAdapter, serverName: string, scopeInfo: ScopeInfo): void {
  try {
    if (scopeInfo.scope === 'project' && adapter.supportsProjectScope()) {
      // Project-level disable
      const userConfig = adapter.loadConfig();
      const projectConfig = adapter.loadProjectConfig?.(scopeInfo.projectPath!);
      
      // Check if server exists and is enabled (in merged config)
      const mergedConfig = adapter.getMergedConfig?.(scopeInfo.projectPath!);
      if (!mergedConfig || !adapter.isServerEnabled(mergedConfig, serverName)) {
        console.log(formatError(`Server "${serverName}" is not enabled or does not exist`));
        console.log('\nUse "house-mcp-manager list" to see available servers.');
        process.exit(1);
      }
      
      // Load or create project config
      let currentProjectConfig: MCPConfig;
      if (projectConfig) {
        currentProjectConfig = projectConfig;
      } else {
        // Create new project config
        currentProjectConfig = {
          enabled: {},
          disabled: {},
          metadata: {
            tool: adapter.id,
            scope: 'project'
          }
        };
      }
      
      // If server is in project enabled, move it to disabled
      if (currentProjectConfig.enabled[serverName]) {
        currentProjectConfig = adapter.disableServer(currentProjectConfig, serverName);
      } else {
        // Server is inherited from user - add to project disabled list
        // Get server config from user config
        const serverConfig = userConfig.enabled[serverName] || userConfig.disabled[serverName];
        if (serverConfig) {
          if (!currentProjectConfig.disabled) {
            currentProjectConfig.disabled = {};
          }
          currentProjectConfig.disabled[serverName] = serverConfig;
        }
      }
      
      // Save project config
      adapter.saveProjectConfig?.(scopeInfo.projectPath!, currentProjectConfig);
      
      console.log(success(`Disabled "${serverName}" at project level`));
      console.log(chalk.dim(`\nProject: ${scopeInfo.projectPath}`));
      console.log(`\nRestart ${adapter.name} for changes to take effect.`);
    } else {
      // User-level disable (existing behavior)
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
    }
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
