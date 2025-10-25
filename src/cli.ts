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

const program = new Command();

program
  .name('mcp-manager')
  .description(chalk.cyan('Universal MCP server manager for AI coding agents'))
  .version('1.0.0')
  .option('--tool <tool>', 'Specify which tool to manage (claude, cline, etc). Auto-detects if not specified.');

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
  .action((server: string, options: any) => {
    const adapter = AdapterRegistry.getAdapter(program.opts().tool);
    disableCommand(adapter, server);
  });

// Enable command
program
  .command('enable <server>')
  .description('Enable an MCP server')
  .action((server: string, options: any) => {
    const adapter = AdapterRegistry.getAdapter(program.opts().tool);
    enableCommand(adapter, server);
  });

// List command
program
  .command('list')
  .alias('ls')
  .description('List all MCP servers')
  .action(() => {
    const adapter = AdapterRegistry.getAdapter(program.opts().tool);
    listCommand(adapter);
  });

// Status command
program
  .command('status')
  .description('Show detailed server status with token estimates')
  .action(() => {
    const adapter = AdapterRegistry.getAdapter(program.opts().tool);
    statusCommand(adapter);
  });

// Profile commands
const profileCmd = program
  .command('profile')
  .description('Manage MCP server profiles');

profileCmd
  .command('save <name>')
  .description('Save current configuration as a profile')
  .action((name: string) => {
    const adapter = AdapterRegistry.getAdapter(program.opts().tool);
    saveProfile(adapter, name);
  });

profileCmd
  .command('load <name>')
  .description('Load a saved profile')
  .action((name: string) => {
    const adapter = AdapterRegistry.getAdapter(program.opts().tool);
    loadProfile(adapter, name);
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
    const adapter = AdapterRegistry.getAdapter(program.opts().tool);
    await interactiveCommand(adapter);
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
  const adapter = AdapterRegistry.getAdapter(program.opts().tool);
  interactiveCommand(adapter).catch(err => {
    console.error(chalk.red('Error running interactive mode:'), err);
    process.exit(1);
  });
});

// Parse arguments
program.parse();
