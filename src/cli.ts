#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { AdapterRegistry } from './adapters/registry.js';
import { disableCommand } from './commands/disable.js';
import { enableCommand } from './commands/enable.js';
import { listCommand } from './commands/list.js';
import { statusCommand } from './commands/status.js';
import {
  saveProfile,
  loadProfile,
  listProfilesCommand,
  deleteProfile,
  createPrebuiltProfiles
} from './commands/profile.js';
import { interactiveCommand } from './commands/interactive.js';
import { detectCommand } from './commands/detect.js';
import { resolveScopeInfo, type ScopeInfo } from './utils/scope.js';

const program = new Command();

program
  .name('house-mcp-manager')
  .description(chalk.cyan('Universal MCP server manager for AI coding agents'))
  .version('1.0.0')
  .option('--tool <tool>', 'Specify which tool to manage (claude, cline, etc). Auto-detects if not specified.')
  .option('--scope <scope>', 'Scope for configuration: user, project, or auto (default: auto)', 'auto')
  .option('--project-path <path>', 'Project path for project-level config (default: current directory)');

// Helper to get scope info and adapter
function getAdapterAndScope(): { adapter: any; scopeInfo: ScopeInfo } {
  const opts = program.opts();
  const adapter = AdapterRegistry.getAdapter(opts.tool);
  
  // Validate scope support
  try {
    const scopeInfo = resolveScopeInfo(opts.scope, opts.projectPath);
    
    if (scopeInfo.scope === 'project' && !adapter.supportsProjectScope()) {
      throw new Error(
        `${adapter.name} does not support project-level configuration.\n` +
        `Use --scope=user to manage user-level configuration instead.`
      );
    }
    
    return { adapter, scopeInfo };
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

// Detect command
program
  .command('detect')
  .description('Detect installed MCP-enabled tools')
  .action(() => {
    detectCommand();
  });

// Disable command
program
  .command('disable <server>')
  .description('Disable an MCP server')
  .action((server: string) => {
    const { adapter, scopeInfo } = getAdapterAndScope();
    disableCommand(adapter, server, scopeInfo);
  });

// Enable command
program
  .command('enable <server>')
  .description('Enable an MCP server')
  .action((server: string) => {
    const { adapter, scopeInfo } = getAdapterAndScope();
    enableCommand(adapter, server, scopeInfo);
  });

// List command
program
  .command('list')
  .alias('ls')
  .description('List all MCP servers')
  .action(() => {
    const { adapter, scopeInfo } = getAdapterAndScope();
    listCommand(adapter, scopeInfo);
  });

// Status command
program
  .command('status')
  .description('Show detailed server status with token estimates')
  .action(() => {
    const { adapter, scopeInfo } = getAdapterAndScope();
    statusCommand(adapter, scopeInfo);
  });

// Profile commands
const profileCmd = program
  .command('profile')
  .description('Manage MCP server profiles');

profileCmd
  .command('save <name>')
  .description('Save current configuration as a profile')
  .action((name: string) => {
    const { adapter, scopeInfo } = getAdapterAndScope();
    saveProfile(adapter, name, scopeInfo);
  });

profileCmd
  .command('load <name>')
  .description('Load a saved profile')
  .action((name: string) => {
    const { adapter, scopeInfo } = getAdapterAndScope();
    loadProfile(adapter, name, scopeInfo);
  });

profileCmd
  .command('list')
  .alias('ls')
  .description('List all saved profiles')
  .action(() => {
    listProfilesCommand();
  });

profileCmd
  .command('delete <name>')
  .alias('rm')
  .description('Delete a saved profile')
  .action((name: string) => {
    deleteProfile(name);
  });

profileCmd
  .command('init')
  .description('Create pre-built profiles (minimal, full)')
  .action(() => {
    const adapter = AdapterRegistry.getAdapter(program.opts().tool);
    createPrebuiltProfiles(adapter);
  });

// Interactive command
program
  .command('interactive')
  .alias('i')
  .description('Interactive mode - toggle servers with checkboxes')
  .action(async () => {
    const { adapter, scopeInfo } = getAdapterAndScope();
    await interactiveCommand(adapter, scopeInfo);
  });

// Config command (show config path)
program
  .command('config')
  .description('Show MCP config file path for the selected tool')
  .action(() => {
    const adapter = AdapterRegistry.getAdapter(program.opts().tool);
    console.log(chalk.bold(`${adapter.name} Config Path:`));
    console.log(chalk.cyan(adapter.getConfigPath()));
  });

// Default action when no command is provided
program.action(() => {
  // If no command, run interactive mode
  try {
    const { adapter, scopeInfo } = getAdapterAndScope();
    interactiveCommand(adapter, scopeInfo).catch(err => {
      console.error(chalk.red('Error running interactive mode:'), err);
      process.exit(1);
    });
  } catch (err) {
    console.error(chalk.red('Error:'), err);
    process.exit(1);
  }
});

// Parse arguments
program.parse();
