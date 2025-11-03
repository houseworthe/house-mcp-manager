import inquirer from 'inquirer';
import chalk from 'chalk';
import type { MCPAdapter, ScopedMCPConfig } from '../adapters/base.js';
import type { ScopeInfo } from '../utils/scope.js';
import { estimateServerTokens, calculateTotalTokens, calculateScopedTokens } from '../utils/tokens.js';
import { success, error as formatError, header, formatScopeBadge } from '../utils/formatting.js';

interface ServerChoice {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
}

/**
 * Helper to load config based on scope
 */
function loadScopedConfig(adapter: MCPAdapter, scopeInfo: ScopeInfo): ScopedMCPConfig {
  if (scopeInfo.scope === 'project' && adapter.supportsProjectScope() && adapter.getMergedConfig) {
    return adapter.getMergedConfig(scopeInfo.projectPath!);
  }
  const config = adapter.loadConfig();
  return {
    ...config,
    scope: 'user',
    inheritance: {
      inherited: Object.keys(config.enabled),
      overridden: [],
      additions: []
    }
  };
}

export async function interactiveCommand(adapter: MCPAdapter, scopeInfo: ScopeInfo): Promise<void> {
  try {
    const config = loadScopedConfig(adapter, scopeInfo);
    const allServers = adapter.getAllServers(config);
    const isProjectScope = config.scope === 'project';

    if (allServers.length === 0) {
      console.log(chalk.yellow('No MCP servers found in your configuration.'));
      return;
    }

    // Calculate current token usage
    const scopedTokens = calculateScopedTokens(config);
    const currentTokens = scopedTokens.total;

    const scopeBadge = formatScopeBadge(config.scope || 'user');
    console.log(header(`Interactive MCP Server Manager (${adapter.name} - ${scopeBadge})`));
    if (isProjectScope && config.projectPath) {
      console.log(chalk.dim(`Project: ${config.projectPath}`));
    }
    console.log(chalk.dim('\nSelect servers to ENABLE (checked = enabled, unchecked = disabled)'));
    console.log(chalk.dim(`Current token usage: ${chalk.bold(currentTokens.toLocaleString())} tokens\n`));

    // Create choices for inquirer with grouping if project scope
    const choices: ServerChoice[] = allServers.map(name => {
      const enabled = adapter.isServerEnabled(config, name);
      const server = enabled ? config.enabled[name] : config.disabled[name];
      const tokens = estimateServerTokens(name, server);

      const tokenInfo = tokens > 10000
        ? chalk.red(`~${(tokens / 1000).toFixed(0)}k tokens`)
        : chalk.gray(`~${(tokens / 1000).toFixed(1)}k tokens`);

      // Add inheritance indicator for project scope
      let prefix = '';
      if (isProjectScope && config.inheritance) {
        const { inherited, overridden, additions } = config.inheritance;
        if (inherited.includes(name)) {
          prefix = chalk.dim('[inherited] ');
        } else if (overridden.includes(name)) {
          prefix = chalk.yellow('[override] ');
        } else if (additions.includes(name)) {
          prefix = chalk.green('[project] ');
        }
      }

      return {
        name: `${prefix}${name} ${tokenInfo}`,
        value: name,
        checked: enabled
      };
    });

    // Show checkbox prompt
    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'enabledServers',
        message: 'Select servers to enable:',
        choices: choices,
        pageSize: 15
      }
    ]);

    const selectedServers = new Set(answers.enabledServers as string[]);

    // Determine what changed
    const toEnable: string[] = [];
    const toDisable: string[] = [];

    allServers.forEach(name => {
      const currentlyEnabled = adapter.isServerEnabled(config, name);
      const shouldBeEnabled = selectedServers.has(name);

      if (shouldBeEnabled && !currentlyEnabled) {
        toEnable.push(name);
      } else if (!shouldBeEnabled && currentlyEnabled) {
        toDisable.push(name);
      }
    });

    // If no changes, exit
    if (toEnable.length === 0 && toDisable.length === 0) {
      console.log(chalk.yellow('\nNo changes made.'));
      return;
    }

    // Show preview of changes
    console.log(chalk.bold('\nChanges to be made:'));

    if (toEnable.length > 0) {
      console.log(chalk.green('\nEnabling:'));
      toEnable.forEach(name => console.log(`  ${chalk.green('+')} ${name}`));
    }

    if (toDisable.length > 0) {
      console.log(chalk.gray('\nDisabling:'));
      toDisable.forEach(name => console.log(`  ${chalk.gray('-')} ${name}`));
    }

    // Calculate new token usage
    let newConfig = { ...config };

    toDisable.forEach(name => {
      newConfig = adapter.toggleServer(newConfig, name);
    });

    toEnable.forEach(name => {
      newConfig = adapter.toggleServer(newConfig, name);
    });

    const newTokens = calculateTotalTokens(newConfig.enabled || {});
    const tokenDiff = newTokens - currentTokens;

    console.log(chalk.bold('\nToken Impact:'));
    console.log(`  Current: ${chalk.white(currentTokens.toLocaleString())} tokens`);
    console.log(`  New:     ${chalk.white(newTokens.toLocaleString())} tokens`);

    if (tokenDiff > 0) {
      console.log(`  Change:  ${chalk.red(`+${tokenDiff.toLocaleString()}`)} tokens (${chalk.red('increase')})`);
    } else if (tokenDiff < 0) {
      console.log(`  Change:  ${chalk.green(`${tokenDiff.toLocaleString()}`)} tokens (${chalk.green('decrease')})`);
    } else {
      console.log(`  Change:  ${chalk.gray('0')} tokens (no change)`);
    }

    // Confirm changes
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Apply these changes?',
        default: true
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('\nChanges cancelled.'));
      return;
    }

    // Apply changes based on scope
    if (isProjectScope && adapter.supportsProjectScope() && adapter.saveProjectConfig) {
      // For project scope, we need to update project config
      // Build project config from changes
      const userConfig = adapter.loadConfig();
      let projectConfig = adapter.loadProjectConfig?.(scopeInfo.projectPath!);
      
      if (!projectConfig) {
        projectConfig = {
          enabled: {},
          disabled: {},
          metadata: {
            tool: adapter.id,
            scope: 'project'
          }
        };
      }

      // Update project config based on selections
      // Remove all current project config
      projectConfig.enabled = {};
      projectConfig.disabled = {};

      // For each server, determine if it should be in project config
      allServers.forEach(name => {
        const shouldBeEnabled = selectedServers.has(name);
        const isInUserEnabled = adapter.isServerEnabled(userConfig, name);
        
        if (shouldBeEnabled) {
          // If it's enabled, check if it needs to be in project config
          if (!isInUserEnabled) {
            // Not in user config - add to project enabled
            const server = config.enabled[name] || config.disabled[name];
            if (server) {
              projectConfig.enabled[name] = server;
            }
          } else {
            // Inherited from user - if it was disabled at project level, remove it
            // (no-op, already enabled via inheritance)
          }
        } else {
          // If it should be disabled
          if (isInUserEnabled) {
            // Inherited from user - add to project disabled
            const server = userConfig.enabled[name];
            if (server) {
              projectConfig.disabled[name] = server;
            }
          } else {
            // Not in user config - if it was in project enabled, remove it
            // (no-op, already disabled)
          }
        }
      });

      adapter.saveProjectConfig(scopeInfo.projectPath!, projectConfig);
      console.log(success('\nChanges applied successfully to project-level configuration!'));
      console.log(chalk.dim(`Project: ${scopeInfo.projectPath}`));
    } else {
      // User scope - save normally
      adapter.saveConfig(newConfig);
      console.log(success('\nChanges applied successfully!'));
    }
    
    console.log(chalk.dim(`Restart ${adapter.name} for changes to take effect.`));

    // Show final summary
    console.log(chalk.bold('\nFinal Configuration:'));
    console.log(`  ${chalk.green('Enabled:')} ${selectedServers.size} servers`);
    console.log(`  ${chalk.gray('Disabled:')} ${allServers.length - selectedServers.size} servers`);
    console.log(`  ${chalk.white('Total Token Usage:')} ${newTokens.toLocaleString()} tokens`);

  } catch (err) {
    if (err instanceof Error && err.message.includes('User force closed')) {
      console.log(chalk.yellow('\n\nOperation cancelled.'));
      process.exit(0);
    }

    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
