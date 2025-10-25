import chalk from 'chalk';
import { loadConfig, getEnabledServers, getDisabledServers } from '../config.js';
import { createServerTable, header, formatTokenCount, error as formatError } from '../utils/formatting.js';
import { estimateServerTokens, estimateServerTools, calculateTotalTokens } from '../utils/tokens.js';

export function statusCommand(): void {
  try {
    const config = loadConfig();

    const enabledServers = getEnabledServers(config);
    const disabledServers = getDisabledServers(config);

    console.log(header('MCP Server Status & Token Estimates'));

    // Calculate total enabled tokens
    const totalEnabledTokens = calculateTotalTokens(config.mcpServers || {});

    // Show enabled servers with details
    if (enabledServers.length > 0) {
      console.log(chalk.bold.green('\n✓ ENABLED SERVERS:'));

      const enabledTable = createServerTable();

      enabledServers.forEach(name => {
        const server = config.mcpServers[name];
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
    } else {
      console.log(chalk.bold.green('\n✓ ENABLED SERVERS:'));
      console.log(chalk.gray('  (none)'));
    }

    // Show disabled servers with details
    if (disabledServers.length > 0) {
      console.log(chalk.bold.gray('\n○ DISABLED SERVERS:'));

      const disabledTable = createServerTable();

      disabledServers.forEach(name => {
        const server = config._disabled_mcpServers![name];
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

    // Summary
    console.log(chalk.bold('\nSUMMARY:'));
    console.log(`  Total Servers: ${enabledServers.length + disabledServers.length}`);
    console.log(`  Enabled: ${chalk.green(enabledServers.length)}`);
    console.log(`  Disabled: ${chalk.gray(disabledServers.length)}`);
    console.log(`  Total Active Token Usage: ${formatTokenCount(totalEnabledTokens)}`);

    // Recommendations
    if (totalEnabledTokens > 100000) {
      console.log(chalk.yellow('\n⚠️  HIGH TOKEN USAGE DETECTED'));
      console.log(chalk.yellow('   Consider disabling servers you\'re not actively using.'));
      console.log(chalk.dim('   Use "mcp-manager interactive" to quickly toggle servers.'));
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
