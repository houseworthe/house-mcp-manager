import inquirer from 'inquirer';
import chalk from 'chalk';
import { loadConfig, saveConfig, getAllServers, isServerEnabled, toggleServer as toggleServerConfig } from '../config.js';
import { estimateServerTokens, calculateTotalTokens } from '../utils/tokens.js';
import { success, error as formatError, header } from '../utils/formatting.js';

interface ServerChoice {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
}

export async function interactiveCommand(): Promise<void> {
  try {
    const config = loadConfig();
    const allServers = getAllServers(config);

    if (allServers.length === 0) {
      console.log(chalk.yellow('No MCP servers found in your configuration.'));
      return;
    }

    // Calculate current token usage
    const currentTokens = calculateTotalTokens(config.mcpServers || {});

    console.log(header('Interactive MCP Server Manager'));
    console.log(chalk.dim('\nSelect servers to ENABLE (checked = enabled, unchecked = disabled)'));
    console.log(chalk.dim(`Current token usage: ${chalk.bold(currentTokens.toLocaleString())} tokens\n`));

    // Create choices for inquirer
    const choices: ServerChoice[] = allServers.map(name => {
      const enabled = isServerEnabled(config, name);
      const server = enabled ? config.mcpServers[name] : config._disabled_mcpServers![name];
      const tokens = estimateServerTokens(name, server);

      const tokenInfo = tokens > 10000
        ? chalk.red(`~${(tokens / 1000).toFixed(0)}k tokens`)
        : chalk.gray(`~${(tokens / 1000).toFixed(1)}k tokens`);

      return {
        name: `${name} ${tokenInfo}`,
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
      const currentlyEnabled = isServerEnabled(config, name);
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
      newConfig = toggleServerConfig(newConfig, name);
    });

    toEnable.forEach(name => {
      newConfig = toggleServerConfig(newConfig, name);
    });

    const newTokens = calculateTotalTokens(newConfig.mcpServers || {});
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

    // Apply changes
    saveConfig(newConfig);

    console.log(success('\nChanges applied successfully!'));
    console.log(chalk.dim('Restart Claude Code for changes to take effect.'));

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
