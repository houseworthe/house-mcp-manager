import chalk from 'chalk';
import Table from 'cli-table3';

/**
 * Formats a success message
 */
export function success(message: string): string {
  return chalk.green('✓ ') + message;
}

/**
 * Formats an error message
 */
export function error(message: string): string {
  return chalk.red('✗ ') + message;
}

/**
 * Formats a warning message
 */
export function warning(message: string): string {
  return chalk.yellow('⚠ ') + message;
}

/**
 * Formats an info message
 */
export function info(message: string): string {
  return chalk.blue('ℹ ') + message;
}

/**
 * Formats a server name based on its enabled status
 */
export function formatServerName(name: string, enabled: boolean): string {
  return enabled ? chalk.green(name) : chalk.gray(name);
}

/**
 * Formats token count with color coding
 */
export function formatTokenCount(tokens: number): string {
  if (tokens > 50000) {
    return chalk.red(`~${tokens.toLocaleString()} tokens`);
  } else if (tokens > 10000) {
    return chalk.yellow(`~${tokens.toLocaleString()} tokens`);
  } else {
    return chalk.green(`~${tokens.toLocaleString()} tokens`);
  }
}

/**
 * Creates a formatted table for server listing
 */
export function createServerTable(): Table.Table {
  return new Table({
    head: [
      chalk.bold('Server'),
      chalk.bold('Status'),
      chalk.bold('Token Estimate'),
      chalk.bold('Tools')
    ],
    colWidths: [30, 12, 18, 10],
    style: {
      head: [],
      border: []
    }
  });
}

/**
 * Creates a formatted table for profile listing
 */
export function createProfileTable(): Table.Table {
  return new Table({
    head: [
      chalk.bold('Profile'),
      chalk.bold('Servers'),
      chalk.bold('Created')
    ],
    colWidths: [20, 15, 25],
    style: {
      head: [],
      border: []
    }
  });
}

/**
 * Formats a header
 */
export function header(text: string): string {
  return chalk.bold.cyan(`\n${text}\n${'='.repeat(text.length)}`);
}

/**
 * Formats a subheader
 */
export function subheader(text: string): string {
  return chalk.bold(`\n${text}`);
}

/**
 * Formats a scope badge (USER SCOPE / PROJECT SCOPE)
 */
export function formatScopeBadge(scope: 'user' | 'project'): string {
  if (scope === 'project') {
    return chalk.bgBlue.white.bold(' PROJECT SCOPE ');
  }
  return chalk.bgGray.white.bold(' USER SCOPE ');
}

/**
 * Formats a section header for grouped display
 */
export function sectionHeader(text: string): string {
  return chalk.bold.cyan(`\n${text}:`);
}

/**
 * Formats a compact token count (e.g., "~15k tokens")
 */
export function formatCompactTokens(tokens: number): string {
  if (tokens >= 1000) {
    const k = (tokens / 1000).toFixed(1);
    return `~${k.replace(/\.0$/, '')}k tokens`;
  }
  return `~${tokens} tokens`;
}
