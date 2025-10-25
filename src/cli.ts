#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
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
import { getConfigPath } from './config.js';

const program = new Command();

program
  .name('mcp-manager')
  .description(chalk.cyan('CLI tool to manage Claude Code MCP servers'))
  .version('1.0.0');

// Disable command
program
  .command('disable <server>')
  .description('Disable an MCP server')
  .action((server: string) => {
    disableCommand(server);
  });

// Enable command
program
  .command('enable <server>')
  .description('Enable an MCP server')
  .action((server: string) => {
    enableCommand(server);
  });

// List command
program
  .command('list')
  .alias('ls')
  .description('List all MCP servers')
  .action(() => {
    listCommand();
  });

// Status command
program
  .command('status')
  .description('Show detailed server status with token estimates')
  .action(() => {
    statusCommand();
  });

// Profile commands
const profileCmd = program
  .command('profile')
  .description('Manage MCP server profiles');

profileCmd
  .command('save <name>')
  .description('Save current configuration as a profile')
  .action((name: string) => {
    saveProfile(name);
  });

profileCmd
  .command('load <name>')
  .description('Load a saved profile')
  .action((name: string) => {
    loadProfile(name);
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
    createPrebuiltProfiles();
  });

// Interactive command
program
  .command('interactive')
  .alias('i')
  .description('Interactive mode - toggle servers with checkboxes')
  .action(async () => {
    await interactiveCommand();
  });

// Config command (show config path)
program
  .command('config')
  .description('Show Claude config file path')
  .action(() => {
    console.log(chalk.bold('Claude Config Path:'));
    console.log(chalk.cyan(getConfigPath()));
  });

// Default action when no command is provided
program.action(() => {
  // If no command, show help or run interactive mode
  interactiveCommand().catch(err => {
    console.error(chalk.red('Error running interactive mode:'), err);
    process.exit(1);
  });
});

// Parse arguments
program.parse();
