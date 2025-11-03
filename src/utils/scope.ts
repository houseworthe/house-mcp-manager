import path from 'path';
import fs from 'fs';
import os from 'os';

export type Scope = 'user' | 'project' | 'auto';

export interface ScopeInfo {
  scope: 'user' | 'project';
  projectPath?: string;
  isAutoDetected: boolean;
}

/**
 * Gets the current working directory
 */
export function getCurrentProjectPath(): string {
  return process.cwd();
}

/**
 * Detects if we're in a project directory with a project config
 * Checks ~/.claude.json for a projects section containing a config for this path
 */
export function detectProjectRoot(startPath: string = process.cwd()): string | null {
  const resolvedPath = path.resolve(startPath);
  const normalizedPath = normalizeProjectPath(resolvedPath);
  
  // Check if there's a project config in ~/.claude.json
  const configPath = path.join(os.homedir(), '.claude.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    
    // Check if there's a projects section with a config for this path
    if (config.projects && config.projects[normalizedPath]) {
      return resolvedPath;
    }
    
    // Also check parent directories
    let currentPath = resolvedPath;
    const root = path.parse(currentPath).root;
    
    while (currentPath !== root) {
      const normalized = normalizeProjectPath(currentPath);
      if (config.projects && config.projects[normalized]) {
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
    }
  } catch {
    // Not valid JSON or error reading, return null
  }

  return null;
}

/**
 * Resolves scope information from flags and auto-detection
 */
export function resolveScopeInfo(
  scopeFlag?: string,
  projectPathFlag?: string
): ScopeInfo {
  const scope: Scope = (scopeFlag as Scope) || 'auto';
  const explicitProjectPath = projectPathFlag;

  // Handle explicit user scope
  if (scope === 'user') {
    return {
      scope: 'user',
      isAutoDetected: false
    };
  }

  // Handle explicit project scope
  if (scope === 'project') {
    const projectPath = explicitProjectPath || getCurrentProjectPath();
    
    // Validate project path exists
    if (!fs.existsSync(projectPath)) {
      throw new Error(
        `Project path does not exist: ${projectPath}\n` +
        'Make sure you\'re in a project directory or specify a valid --project-path.'
      );
    }

    return {
      scope: 'project',
      projectPath,
      isAutoDetected: false
    };
  }

  // Auto-detect: look for project config
  if (scope === 'auto') {
    const detectedProjectRoot = detectProjectRoot(explicitProjectPath || process.cwd());
    
    if (detectedProjectRoot) {
      return {
        scope: 'project',
        projectPath: detectedProjectRoot,
        isAutoDetected: true
      };
    }

    // No project config found, use user scope
    return {
      scope: 'user',
      isAutoDetected: true
    };
  }

  throw new Error(`Invalid scope: ${scope}. Must be 'user', 'project', or 'auto'.`);
}

/**
 * Normalizes a project path to a consistent format
 * Uses absolute path relative to home directory for consistency
 */
export function normalizeProjectPath(projectPath: string): string {
  const resolved = path.resolve(projectPath);
  const homeDir = os.homedir();
  
  // If path is under home directory, return relative to home
  if (resolved.startsWith(homeDir)) {
    return resolved;
  }
  
  return resolved;
}

