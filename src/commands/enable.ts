import chalk from 'chalk';
import type { MCPAdapter, MCPConfig } from '../adapters/base.js';
import type { ScopeInfo } from '../utils/scope.js';
import { success, error as formatError, info } from '../utils/formatting.js';

export function enableCommand(adapter: MCPAdapter, serverName: string, scopeInfo: ScopeInfo): void {
  try {
    if (scopeInfo.scope === 'project' && adapter.supportsProjectScope()) {
      // Project-level enable
      const userConfig = adapter.loadConfig();
      const projectConfig = adapter.loadProjectConfig?.(scopeInfo.projectPath!);
      
      // Check if server is already inherited from user (no-op case)
      if (adapter.isServerEnabled(userConfig, serverName)) {
        // Check if it's disabled at project level
        const projectDisabled = projectConfig?.disabled[serverName];
        if (!projectDisabled) {
          console.log(info(`Server "${serverName}" is already enabled (inherited from user-level config)`));
          console.log(chalk.dim(`To override it at project level, disable it first with: house-mcp-manager disable ${serverName} --scope=project`));
          return;
        }
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
      
      // Check if server exists in project disabled
      if (!currentProjectConfig.disabled[serverName]) {
        // Check if it exists in user config disabled
        if (userConfig.disabled[serverName]) {
          // Enable from user disabled - add to project enabled
          currentProjectConfig.enabled[serverName] = userConfig.disabled[serverName];
        } else {
          console.log(formatError(`Server "${serverName}" is not disabled or does not exist`));
          console.log('\nUse "house-mcp-manager list" to see available servers.');
          process.exit(1);
        }
      } else {
        // Enable from project disabled
        currentProjectConfig = adapter.enableServer(currentProjectConfig, serverName);
      }
      
      // Remove from project disabled list if it was there
      if (currentProjectConfig.disabled[serverName]) {
        delete currentProjectConfig.disabled[serverName];
      }
      
      // Save project config
      adapter.saveProjectConfig?.(scopeInfo.projectPath!, currentProjectConfig);
      
      console.log(success(`Enabled "${serverName}" at project level`));
      console.log(chalk.dim(`\nProject: ${scopeInfo.projectPath}`));
      console.log(`\nRestart ${adapter.name} for changes to take effect.`);
    } else {
      // User-level enable (existing behavior)
      const config = adapter.loadConfig();

      // Check if server is already enabled
      if (adapter.isServerEnabled(config, serverName)) {
        console.log(formatError(`Server "${serverName}" is already enabled`));
        process.exit(1);
      }

      // Check if server exists in disabled servers
      if (!config.disabled[serverName]) {
        console.log(formatError(`Server "${serverName}" is not disabled or does not exist`));
        console.log('\nUse "house-mcp-manager list" to see available servers.');
        process.exit(1);
      }

      // Enable the server
      const updatedConfig = adapter.enableServer(config, serverName);

      // Save the updated config
      adapter.saveConfig(updatedConfig);

      console.log(success(`Enabled "${serverName}"`));
      console.log(`\nRestart ${adapter.name} for changes to take effect.`);
    }
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
