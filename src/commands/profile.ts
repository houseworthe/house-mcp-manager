import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import type { MCPAdapter, MCPConfig } from '../adapters/base.js';
import { success, error as formatError, createProfileTable, header } from '../utils/formatting.js';

const PROFILES_DIR = path.join(os.homedir(), '.claude-mcp-profiles');

interface Profile {
  name: string;
  tool?: string;  // Optional for backward compat
  enabled?: Record<string, any>;
  disabled?: Record<string, any>;
  // Old format (backward compat)
  mcpServers?: Record<string, any>;
  _disabled_mcpServers?: Record<string, any>;
  created: string;
}

/**
 * Ensures profiles directory exists
 */
function ensureProfilesDir(): void {
  if (!fs.existsSync(PROFILES_DIR)) {
    fs.mkdirSync(PROFILES_DIR, { recursive: true });
  }
}

/**
 * Gets path to a profile file
 */
function getProfilePath(name: string): string {
  return path.join(PROFILES_DIR, `${name}.json`);
}

/**
 * Lists all available profiles
 */
function listProfiles(): string[] {
  ensureProfilesDir();

  const files = fs.readdirSync(PROFILES_DIR);

  return files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

/**
 * Save current configuration as a profile
 */
export function saveProfile(adapter: MCPAdapter, name: string): void {
  try {
    ensureProfilesDir();

    const config = adapter.loadConfig();

    const profile: Profile = {
      name,
      tool: adapter.id,
      enabled: config.enabled || {},
      disabled: config.disabled || {},
      created: new Date().toISOString()
    };

    const profilePath = getProfilePath(name);

    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));

    console.log(success(`Saved profile "${name}" for ${adapter.name}`));
    console.log(chalk.dim(`Profile saved to: ${profilePath}`));
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}

/**
 * Load a profile and apply it to the current configuration
 */
export function loadProfile(adapter: MCPAdapter, name: string): void {
  try {
    const profilePath = getProfilePath(name);

    if (!fs.existsSync(profilePath)) {
      console.error(formatError(`Profile "${name}" does not exist`));
      console.log('\nUse "mcp-manager profile list" to see available profiles.');
      process.exit(1);
    }

    const profile: Profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

    // Warn if profile was created for a different tool
    if (profile.tool && profile.tool !== adapter.id) {
      console.log(chalk.yellow(`\nWarning: Profile "${name}" was created for ${profile.tool}, loading into ${adapter.id}`));
    }

    const config = adapter.loadConfig();

    // Update config with profile data
    config.enabled = profile.enabled || profile.mcpServers || {};  // Support old format
    config.disabled = profile.disabled || profile._disabled_mcpServers || {};  // Support old format

    adapter.saveConfig(config);

    console.log(success(`Loaded profile "${name}"`));
    console.log(`\nRestart ${adapter.name} for changes to take effect.`);
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}

/**
 * List all saved profiles
 */
export function listProfilesCommand(): void {
  try {
    const profiles = listProfiles();

    if (profiles.length === 0) {
      console.log(header('Saved Profiles'));
      console.log(chalk.gray('\nNo profiles saved yet.'));
      console.log(chalk.dim('\nUse "mcp-manager profile save <name>" to save your current configuration.'));
      return;
    }

    console.log(header('Saved Profiles'));

    const table = createProfileTable();

    profiles.forEach(name => {
      const profilePath = getProfilePath(name);
      const profile: Profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

      // Support both old and new profile formats
      const enabledCount = Object.keys(profile.enabled || profile.mcpServers || {}).length;
      const disabledCount = Object.keys(profile.disabled || profile._disabled_mcpServers || {}).length;
      const toolTag = profile.tool ? `[${profile.tool}] ` : '';
      const serverInfo = `${toolTag}${enabledCount} enabled, ${disabledCount} disabled`;

      const created = new Date(profile.created).toLocaleString();

      table.push([
        chalk.cyan(name),
        serverInfo,
        chalk.gray(created)
      ]);
    });

    console.log(table.toString());

    console.log(chalk.dim('\nUse "mcp-manager profile load <name>" to load a profile.'));
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}

/**
 * Delete a profile
 */
export function deleteProfile(name: string): void {
  try {
    const profilePath = getProfilePath(name);

    if (!fs.existsSync(profilePath)) {
      console.error(formatError(`Profile "${name}" does not exist`));
      console.log('\nUse "mcp-manager profile list" to see available profiles.');
      process.exit(1);
    }

    fs.unlinkSync(profilePath);

    console.log(success(`Deleted profile "${name}"`));
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}

/**
 * Create pre-built profiles
 */
export function createPrebuiltProfiles(adapter: MCPAdapter): void {
  try {
    const config = adapter.loadConfig();

    // Create minimal profile (only essential servers)
    const minimalServers = ['time', 'fetch', 'memory'];
    const minimalEnabled: Record<string, any> = {};
    const minimalDisabled: Record<string, any> = {};

    Object.entries(config.enabled || {}).forEach(([name, server]) => {
      const isEssential = minimalServers.some(essential =>
        name.toLowerCase().includes(essential)
      );

      if (isEssential) {
        minimalEnabled[name] = server;
      } else {
        minimalDisabled[name] = server;
      }
    });

    // Add already disabled servers to minimal disabled
    Object.entries(config.disabled || {}).forEach(([name, server]) => {
      minimalDisabled[name] = server;
    });

    // Save minimal profile
    const minimalProfile: Profile = {
      name: 'minimal',
      tool: adapter.id,
      enabled: minimalEnabled,
      disabled: minimalDisabled,
      created: new Date().toISOString()
    };

    ensureProfilesDir();
    fs.writeFileSync(
      getProfilePath('minimal'),
      JSON.stringify(minimalProfile, null, 2)
    );

    // Save full profile (all enabled)
    const fullProfile: Profile = {
      name: 'full',
      tool: adapter.id,
      enabled: {
        ...config.enabled,
        ...config.disabled
      },
      disabled: {},
      created: new Date().toISOString()
    };

    fs.writeFileSync(
      getProfilePath('full'),
      JSON.stringify(fullProfile, null, 2)
    );

    console.log(success(`Created pre-built profiles for ${adapter.name}: "minimal" and "full"`));
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
