import chalk from 'chalk';
import type { MCPAdapter, ScopedMCPConfig } from '../adapters/base.js';
import type { ScopeInfo } from '../utils/scope.js';
import { createServerTable, header, formatTokenCount, error as formatError, formatScopeBadge, sectionHeader, formatCompactTokens } from '../utils/formatting.js';
import { estimateServerTokens, estimateServerTools, calculateTotalTokens, calculateScopedTokens } from '../utils/tokens.js';

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

export function statusCommand(adapter: MCPAdapter, scopeInfo: ScopeInfo): void {
  try {
    const config = loadScopedConfig(adapter, scopeInfo);
    const isProjectScope = config.scope === 'project';

    const enabledServers = adapter.getEnabledServers(config);
    const disabledServers = adapter.getDisabledServers(config);

    // Header with scope badge
    const scopeBadge = formatScopeBadge(config.scope || 'user');
    console.log(header(`MCP Server Status & Token Estimates (${adapter.name} - ${scopeBadge})`));
    
    if (isProjectScope && config.projectPath) {
      console.log(chalk.dim(`Project: ${config.projectPath}`));
    }

    // Calculate tokens
    const scopedTokens = calculateScopedTokens(config);
    const totalEnabledTokens = scopedTokens.total;

    // Show enabled servers with grouped display if project scope
    if (enabledServers.length > 0) {
      console.log(chalk.bold.green('\n✓ ENABLED SERVERS:'));

      if (isProjectScope && config.inheritance) {
        const { inherited, overridden, additions } = config.inheritance;
        
        // Inherited servers
        if (inherited.length > 0) {
          console.log(sectionHeader('Inherited from User'));
          inherited.forEach(name => {
            const server = config.enabled[name];
            const tokens = estimateServerTokens(name, server);
            const tools = estimateServerTools(name, server);
            console.log(`  ${chalk.green(name.padEnd(20))} ${formatCompactTokens(tokens).padEnd(15)} ${tools} tools`);
          });
        }
        
        // Overridden servers
        if (overridden.length > 0) {
          console.log(sectionHeader('Project Overrides'));
          overridden.forEach(name => {
            const server = config.enabled[name];
            const tokens = estimateServerTokens(name, server);
            const tools = estimateServerTools(name, server);
            console.log(`  ${chalk.yellow(name.padEnd(20))} ${formatCompactTokens(tokens).padEnd(15)} ${tools} tools ${chalk.dim('⚠️')}`);
          });
        }
        
        // Added servers
        if (additions.length > 0) {
          console.log(sectionHeader('Project Additions'));
          additions.forEach(name => {
            const server = config.enabled[name];
            const tokens = estimateServerTokens(name, server);
            const tools = estimateServerTools(name, server);
            console.log(`  ${chalk.green(name.padEnd(20))} ${formatCompactTokens(tokens).padEnd(15)} ${tools} tools`);
          });
        }
      } else {
        // User scope - table format
        const enabledTable = createServerTable();
        enabledServers.forEach(name => {
          const server = config.enabled[name];
          const tokens = estimateServerTokens(name, server);
          const tools = estimateServerTools(name, server);

          enabledTable.push([
            chalk.green(name),
            chalk.green('Enabled'),
            formatTokenCount(tokens),
            chalk.white(tools.toString())
          ]);
        });
        console.log(enabledTable.toString());
      }
    } else {
      console.log(chalk.bold.green('\n✓ ENABLED SERVERS:'));
      console.log(chalk.gray('  (none)'));
    }

    // Show disabled servers with details
    if (disabledServers.length > 0) {
      console.log(chalk.bold.gray('\n○ DISABLED SERVERS:'));

      if (isProjectScope) {
        // Check which are disabled at project level
        const userConfig = adapter.loadConfig();
        const userEnabled = adapter.getEnabledServers(userConfig);
        
        disabledServers.forEach(name => {
          const server = config.disabled[name];
          const tokens = estimateServerTokens(name, server);
          const tools = estimateServerTools(name, server);
          const isProjectDisabled = userEnabled.includes(name);
          const label = isProjectDisabled ? chalk.dim('[disabled at project level]') : '';
          console.log(`  ${chalk.gray(name.padEnd(20))} ${chalk.gray(formatCompactTokens(tokens).padEnd(15))} ${chalk.gray(tools + ' tools')} ${label}`);
        });
      } else {
        const disabledTable = createServerTable();
        disabledServers.forEach(name => {
          const server = config.disabled[name];
          const tokens = estimateServerTokens(name, server);
          const tools = estimateServerTools(name, server);

          disabledTable.push([
            chalk.gray(name),
            chalk.gray('Disabled'),
            chalk.gray(`~${tokens.toLocaleString()} tokens`),
            chalk.gray(tools.toString())
          ]);
        });
        console.log(disabledTable.toString());
      }
    }

    // Summary with token breakdown if project scope
    console.log(chalk.bold('\nSUMMARY:'));
    console.log(`  Total Servers: ${enabledServers.length + disabledServers.length}`);
    console.log(`  Enabled: ${chalk.green(enabledServers.length)}`);
    console.log(`  Disabled: ${chalk.gray(disabledServers.length)}`);
    
    if (isProjectScope && config.inheritance) {
      console.log(chalk.bold('\nToken Breakdown:'));
      if (scopedTokens.inherited > 0) {
        console.log(`  Inherited:     ${formatTokenCount(scopedTokens.inherited)}`);
      }
      if (scopedTokens.overrides > 0) {
        console.log(`  Overrides:      ${formatTokenCount(scopedTokens.overrides)}`);
      }
      if (scopedTokens.additions > 0) {
        console.log(`  Additions:      ${formatTokenCount(scopedTokens.additions)}`);
      }
      console.log(`  ${'─'.repeat(30)}`);
      console.log(`  Total:          ${formatTokenCount(totalEnabledTokens)}`);
    } else {
      console.log(`  Total Active Token Usage: ${formatTokenCount(totalEnabledTokens)}`);
    }

    // Recommendations
    if (totalEnabledTokens > 100000) {
      console.log(chalk.yellow('\n⚠️  HIGH TOKEN USAGE DETECTED'));
      console.log(chalk.yellow('   Consider disabling servers you\'re not actively using.'));
      console.log(chalk.dim('   Use "house-mcp-manager interactive" to quickly toggle servers.'));
    } else if (totalEnabledTokens > 50000) {
      console.log(chalk.yellow('\n⚠️  MODERATE TOKEN USAGE'));
      console.log(chalk.dim('   Your context window is being moderately consumed by MCP servers.'));
    } else {
      console.log(chalk.green('\n✓ Token usage is under control'));
    }

    // Hints
    console.log(chalk.dim('\nNOTE: Token estimates are approximate and based on known server data.'));
    console.log(chalk.dim('Actual token usage may vary.'));
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
