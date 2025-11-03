import chalk from 'chalk';
import type { MCPAdapter, ScopedMCPConfig } from '../adapters/base.js';
import type { ScopeInfo } from '../utils/scope.js';
import { header, error as formatError, formatScopeBadge, sectionHeader } from '../utils/formatting.js';

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

export function listCommand(adapter: MCPAdapter, scopeInfo: ScopeInfo): void {
  try {
    const config = loadScopedConfig(adapter, scopeInfo);
    const isProjectScope = config.scope === 'project';

    const enabledServers = adapter.getEnabledServers(config);
    const disabledServers = adapter.getDisabledServers(config);

    // Header with scope badge
    const scopeBadge = formatScopeBadge(config.scope || 'user');
    console.log(header(`MCP Server Status (${adapter.name} - ${scopeBadge})`));
    
    if (isProjectScope && config.projectPath) {
      console.log(chalk.dim(`Project: ${config.projectPath}`));
    }

    // Show enabled servers with grouping if project scope
    if (enabledServers.length > 0) {
      console.log(chalk.bold.green('\n✓ ENABLED SERVERS:'));
      
      if (isProjectScope && config.inheritance) {
        const { inherited, overridden, additions } = config.inheritance;
        
        if (inherited.length > 0) {
          console.log(sectionHeader('Inherited from User'));
          inherited.forEach(name => {
            console.log(`  ${chalk.green('●')} ${chalk.green(name)}`);
          });
        }
        
        if (overridden.length > 0) {
          console.log(sectionHeader('Project Overrides'));
          overridden.forEach(name => {
            console.log(`  ${chalk.green('●')} ${chalk.yellow(name)} ${chalk.dim('⚠️')}`);
          });
        }
        
        if (additions.length > 0) {
          console.log(sectionHeader('Project Additions'));
          additions.forEach(name => {
            console.log(`  ${chalk.green('●')} ${chalk.green(name)}`);
          });
        }
      } else {
        // User scope - simple list
        enabledServers.forEach(name => {
          console.log(`  ${chalk.green('●')} ${name}`);
        });
      }
    } else {
      console.log(chalk.bold.green('\n✓ ENABLED SERVERS:'));
      console.log(chalk.gray('  (none)'));
    }

    // Show disabled servers
    if (disabledServers.length > 0) {
      console.log(chalk.bold.gray('\n○ DISABLED SERVERS:'));
      disabledServers.forEach(name => {
        const label = isProjectScope && config.disabled[name] && 
          !adapter.getEnabledServers(adapter.loadConfig()).includes(name)
          ? ` ${chalk.dim('[disabled at project level]')}`
          : '';
        console.log(`  ${chalk.gray('○')} ${chalk.gray(name)}${label}`);
      });
    } else {
      console.log(chalk.bold.gray('\n○ DISABLED SERVERS:'));
      console.log(chalk.gray('  (none)'));
    }

    // Summary
    const total = enabledServers.length + disabledServers.length;
    console.log(chalk.bold(`\nTotal: ${total} servers (${enabledServers.length} enabled, ${disabledServers.length} disabled)`));

    // Hint
    console.log(chalk.dim('\nUse "house-mcp-manager status" for detailed token estimates'));
    console.log(chalk.dim('Use "house-mcp-manager interactive" for quick toggling'));
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
