import chalk from 'chalk';
import { AdapterRegistry } from '../adapters/registry.js';
import { header } from '../utils/formatting.js';
import { detectProjectRoot, getCurrentProjectPath } from '../utils/scope.js';

export function detectCommand(): void {
  const allAdapters = AdapterRegistry.getAll();
  const detectedAdapters = AdapterRegistry.detectAll();

  console.log(header('MCP-Enabled Tools Detection'));

  if (detectedAdapters.length === 0) {
    console.log(chalk.yellow('\nNo MCP-enabled tools detected on this system.'));
    console.log(chalk.dim('\nSupported tools:'));
    allAdapters.forEach(adapter => {
      console.log(chalk.dim(`  - ${adapter.name} (${adapter.id})`));
    });
    console.log(chalk.dim('\nMake sure you have at least one of these tools installed and configured.'));
    return;
  }

  console.log(chalk.bold.green('\n✓ DETECTED TOOLS:'));
  detectedAdapters.forEach(adapter => {
    console.log(`  ${chalk.green('●')} ${chalk.bold(adapter.name)} (${adapter.id})`);
    console.log(chalk.dim(`     Config: ${adapter.getConfigPath()}`));
    
    // Show project scope support
    if (adapter.supportsProjectScope()) {
      console.log(chalk.dim(`     Project scope: ${chalk.green('supported')}`));
    }
  });

  if (detectedAdapters.length < allAdapters.length) {
    const notDetected = allAdapters.filter(a => !detectedAdapters.includes(a));
    console.log(chalk.bold.gray('\n○ NOT DETECTED:'));
    notDetected.forEach(adapter => {
      console.log(`  ${chalk.gray('○')} ${chalk.gray(adapter.name)} (${adapter.id})`);
    });
  }

  // Show project config detection
  const currentPath = getCurrentProjectPath();
  const projectRoot = detectProjectRoot(currentPath);
  console.log(chalk.bold('\n📍 PROJECT CONFIG:'));
  if (projectRoot) {
    console.log(chalk.green(`  Project config detected at: ${projectRoot}`));
    console.log(chalk.dim(`  Current directory: ${currentPath}`));
  } else {
    console.log(chalk.gray(`  No project config detected in current directory or parents`));
    console.log(chalk.dim(`  Current directory: ${currentPath}`));
  }

  // Show auto-selected tool
  const autoSelected = AdapterRegistry.autoSelect();
  if (autoSelected) {
    console.log(chalk.bold(`\n→ DEFAULT TOOL: ${chalk.cyan(autoSelected.name)}`));
    console.log(chalk.dim('  (This tool will be used when no --tool flag is specified)'));
  }

  console.log(chalk.dim('\nUse --tool=<id> to specify which tool to manage'));
  console.log(chalk.dim('Use --scope=<user|project|auto> to control configuration scope'));
  console.log(chalk.dim('Example: house-mcp-manager --tool=claude --scope=project list'));
}
