import chalk from 'chalk';
import { loadConfig, getEnabledServers, getDisabledServers } from '../config.js';
import { header, error as formatError } from '../utils/formatting.js';

export function listCommand(): void {
  try {
    const config = loadConfig();

    const enabledServers = getEnabledServers(config);
    const disabledServers = getDisabledServers(config);

    console.log(header('MCP Server Status'));

    // Show enabled servers
    if (enabledServers.length > 0) {
      console.log(chalk.bold.green('\n✓ ENABLED SERVERS:'));
      enabledServers.forEach(name => {
        console.log(`  ${chalk.green('●')} ${name}`);
      });
    } else {
      console.log(chalk.bold.green('\n✓ ENABLED SERVERS:'));
      console.log(chalk.gray('  (none)'));
    }

    // Show disabled servers
    if (disabledServers.length > 0) {
      console.log(chalk.bold.gray('\n○ DISABLED SERVERS:'));
      disabledServers.forEach(name => {
        console.log(`  ${chalk.gray('○')} ${chalk.gray(name)}`);
      });
    } else {
      console.log(chalk.bold.gray('\n○ DISABLED SERVERS:'));
      console.log(chalk.gray('  (none)'));
    }

    // Summary
    const total = enabledServers.length + disabledServers.length;
    console.log(chalk.bold(`\nTotal: ${total} servers (${enabledServers.length} enabled, ${disabledServers.length} disabled)`));

    // Hint
    console.log(chalk.dim('\nUse "mcp-manager status" for detailed token estimates'));
    console.log(chalk.dim('Use "mcp-manager interactive" for quick toggling'));
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
