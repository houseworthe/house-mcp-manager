import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { loadConfig, saveConfig, type ClaudeConfig } from '../config.js';
import { success, error as formatError, createProfileTable, header } from '../utils/formatting.js';

const PROFILES_DIR = path.join(os.homedir(), '.claude-mcp-profiles');

interface Profile {
  name: string;
  mcpServers: Record<string, any>;
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
export function saveProfile(name: string): void {
  try {
    ensureProfilesDir();

    const config = loadConfig();

    const profile: Profile = {
      name,
      mcpServers: config.mcpServers || {},
      _disabled_mcpServers: config._disabled_mcpServers,
      created: new Date().toISOString()
    };

    const profilePath = getProfilePath(name);

    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));

    console.log(success(`Saved profile "${name}"`));
    console.log(chalk.dim(`Profile saved to: ${profilePath}`));
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}

/**
 * Load a profile and apply it to the current configuration
 */
export function loadProfile(name: string): void {
  try {
    const profilePath = getProfilePath(name);

    if (!fs.existsSync(profilePath)) {
      console.error(formatError(`Profile "${name}" does not exist`));
      console.log('\nUse "mcp-manager profile list" to see available profiles.');
      process.exit(1);
    }

    const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    const config = loadConfig();

    // Update config with profile data
    config.mcpServers = profileData.mcpServers;
    config._disabled_mcpServers = profileData._disabled_mcpServers;

    // Clean up empty disabled section
    if (config._disabled_mcpServers && Object.keys(config._disabled_mcpServers).length === 0) {
      delete config._disabled_mcpServers;
    }

    saveConfig(config);

    console.log(success(`Loaded profile "${name}"`));
    console.log('\nRestart Claude Code for changes to take effect.');
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
      const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

      const enabledCount = Object.keys(profileData.mcpServers || {}).length;
      const disabledCount = Object.keys(profileData._disabled_mcpServers || {}).length;
      const serverInfo = `${enabledCount} enabled, ${disabledCount} disabled`;

      const created = new Date(profileData.created).toLocaleString();

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
export function createPrebuiltProfiles(): void {
  try {
    const config = loadConfig();

    // Create minimal profile (only essential servers)
    const minimalServers = ['time', 'fetch', 'memory'];
    const minimalConfig: Partial<ClaudeConfig> = {
      mcpServers: {},
      _disabled_mcpServers: {}
    };

    Object.entries(config.mcpServers || {}).forEach(([name, server]) => {
      const isEssential = minimalServers.some(essential =>
        name.toLowerCase().includes(essential)
      );

      if (isEssential) {
        minimalConfig.mcpServers![name] = server;
      } else {
        minimalConfig._disabled_mcpServers![name] = server;
      }
    });

    // Add already disabled servers
    Object.entries(config._disabled_mcpServers || {}).forEach(([name, server]) => {
      minimalConfig._disabled_mcpServers![name] = server;
    });

    // Save minimal profile
    const minimalProfile: Profile = {
      name: 'minimal',
      mcpServers: minimalConfig.mcpServers!,
      _disabled_mcpServers: minimalConfig._disabled_mcpServers,
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
      mcpServers: {
        ...config.mcpServers,
        ...config._disabled_mcpServers
      },
      _disabled_mcpServers: {},
      created: new Date().toISOString()
    };

    fs.writeFileSync(
      getProfilePath('full'),
      JSON.stringify(fullProfile, null, 2)
    );

    console.log(success('Created pre-built profiles: "minimal" and "full"'));
  } catch (err) {
    console.error(formatError(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
