# House MCP Manager

**Universal MCP server management for AI coding agents**

A powerful CLI tool to manage MCP servers across multiple AI coding tools (Claude Code, Cursor, Cline, Continue) and optimize your token usage.

## Part of the House Suite

House MCP Manager is part of the **House suite** of tools for Claude Code:

- **[house-code](https://github.com/houseworthe/house-code)** - Claude Code clone with token reduction via sub-agent context cleaner
- **[house-agents](https://github.com/houseworthe/house-agents)** - Sub-agent framework that isolates heavy operations (95%+ token savings)
- **house-mcp-manager** (this tool) - Universal MCP server management

## The Problem

AI coding agents load ALL configured MCP servers on startup, consuming massive amounts of your context window before you even start coding. Some servers like Canvas can consume **78,000+ tokens** - that's nearly 40% of your 200K context budget!

Multiple highly-upvoted GitHub issues ([#6638](https://github.com/anthropics/claude-code/issues/6638), [#5722](https://github.com/anthropics/claude-code/issues/5722), [#7068](https://github.com/anthropics/claude-code/issues/7068), [#7936](https://github.com/anthropics/claude-code/issues/7936)) show the community wants better MCP management, but there's no official solution yet.

## The Solution

`house-mcp-manager` works with ANY MCP-enabled tool to let you quickly enable/disable servers, view token usage, save profiles, and optimize your context window - all without manually editing JSON files.

## Supported Tools

- **Claude Code** - Anthropic's official CLI
- **Cursor** - AI-first code editor
- **Cline** - Popular VS Code extension
- **Continue** - Coming soon
- **Zed** - Coming soon

The tool auto-detects which MCP-enabled tools you have installed and manages them accordingly.

## Features

- **Universal** - Works with Claude Code, Cursor, Cline, and more
- **Auto-Detection** - Automatically finds installed MCP tools
- **Quick Enable/Disable** - Toggle servers on/off instantly
- **Token Tracking** - See exactly how many tokens each server consumes
- **Interactive Mode** - Beautiful checkbox interface for bulk management
- **Profiles** - Save and load different server configurations
- **Safe** - Automatic backups before any modifications
- **Fast** - No need to restart or manually edit configs

## Quick Setup with Claude Code

Copy and paste this prompt into Claude Code to automatically install house-mcp-manager:

```
Please help me install house-mcp-manager:

1. Clone the repository from https://github.com/houseworthe/house-mcp-manager
2. Navigate into the cloned directory
3. Run npm install to install dependencies
4. Run npm run build to compile the TypeScript
5. Run npm link to make the house-mcp-manager command available globally
6. Verify the installation by running: house-mcp-manager --help
7. Show me my current MCP server status by running: house-mcp-manager status

After installation, explain what house-mcp-manager does and show me the key commands I can use.
```

## Installation

### Option 1: Clone & Link (Recommended)

```bash
git clone https://github.com/houseworthe/house-mcp-manager.git
cd house-mcp-manager
npm install
npm run build
npm link
```

Now you can use `house-mcp-manager` from anywhere!

### Option 2: Run from Source

```bash
git clone https://github.com/houseworthe/house-mcp-manager.git
cd house-mcp-manager
npm install
npm run dev <command>
```

### Future: npm Global Install (Coming Soon)

```bash
npm install -g house-mcp-manager
```

## Quick Start

### Detect Installed Tools

```bash
# See which MCP-enabled tools are installed
house-mcp-manager detect
```

### View Your Current Setup

```bash
# List all servers (auto-detects tool)
house-mcp-manager list

# View detailed token estimates
house-mcp-manager status

# Manage a specific tool
house-mcp-manager --tool=cline list
house-mcp-manager --tool=claude status
```

### Enable/Disable Servers

```bash
# Disable a heavy server
house-mcp-manager disable canvas-mcp-server

# Enable it back when needed
house-mcp-manager enable canvas-mcp-server
```

### Interactive Mode (Recommended)

```bash
# Launch interactive checkbox interface
house-mcp-manager interactive

# Or just:
house-mcp-manager
```

This shows all your servers with token estimates. Use ↑/↓ to navigate, Space to toggle, Enter to confirm.

### Profiles - Save Your Favorite Configs

```bash
# Save current setup as "minimal"
house-mcp-manager profile save minimal

# Switch between configurations
house-mcp-manager profile load minimal
house-mcp-manager profile load full

# Create pre-built profiles
house-mcp-manager profile init

# View all saved profiles
house-mcp-manager profile list

# Delete a profile
house-mcp-manager profile delete old-config
```

## Commands

| Command | Description |
|---------|-------------|
| `house-mcp-manager detect` | Detect installed MCP-enabled tools |
| `house-mcp-manager list` | List all MCP servers (enabled/disabled) |
| `house-mcp-manager status` | Show detailed status with token estimates |
| `house-mcp-manager disable <server>` | Disable a specific server |
| `house-mcp-manager enable <server>` | Enable a specific server |
| `house-mcp-manager interactive` | Launch interactive checkbox mode |
| `house-mcp-manager profile save <name>` | Save current config as a profile |
| `house-mcp-manager profile load <name>` | Load a saved profile |
| `house-mcp-manager profile list` | List all saved profiles |
| `house-mcp-manager profile delete <name>` | Delete a profile |
| `house-mcp-manager profile init` | Create pre-built profiles |
| `house-mcp-manager config` | Show MCP config file path |
| `house-mcp-manager --tool=<id> <command>` | Manage a specific tool |
| `house-mcp-manager --help` | Show help |

## Multi-Tool Management

```bash
# Auto-detect which tool to manage
house-mcp-manager status

# Explicitly manage Claude Code
house-mcp-manager --tool=claude status

# Manage Cursor IDE
house-mcp-manager --tool=cursor list

# Manage Cline (VS Code extension)
house-mcp-manager --tool=cline list

# See which tools are detected
house-mcp-manager detect
```

## Example Workflow

```bash
# 1. Check current token usage
house-mcp-manager status
# Output: Total Active Token Usage: ~127,000 tokens ⚠️

# 2. Disable heavy servers you're not using
house-mcp-manager interactive
# Uncheck canvas, notion, puppeteer

# 3. Check new usage
house-mcp-manager status
# Output: Total Active Token Usage: ~14,000 tokens ✓

# 4. Save this minimal config
house-mcp-manager profile save coding-only

# 5. Later, when you need all features
house-mcp-manager profile load full
```

## Real-World Impact

**Before:**
```
Total Active Token Usage: ~127,000 tokens
Context Available: 73,000 tokens (36% of budget)
```

**After disabling unused servers:**
```
Total Active Token Usage: ~14,000 tokens
Context Available: 186,000 tokens (93% of budget)
```

**That's 113,000 tokens saved** - enough for:
- Larger file operations
- More context retention
- Better multi-step reasoning
- Faster responses

## How It Works

`house-mcp-manager` uses an adapter pattern to support multiple MCP-enabled tools:

- **Claude Code**: Manages `~/.claude.json` with an internal `_disabled_mcpServers` field
- **Cursor**: Manages `~/.cursor/mcp.json` for active servers. Disabled servers are stored in a separate `~/.cursor/mcp-disabled.json` file to avoid polluting the native Cursor configuration. Backups are saved to `~/.claude-mcp-backups/cursor/`
- **Cline**: Manages VS Code `settings.json` using the `cline.mcpServers` and `cline._disabled_mcpServers` namespaced keys
- **Continue**: Manages `~/.continue/config.json` (coming soon)
- **Zed**: Manages Zed settings (coming soon)

For all tools, servers are moved between enabled and disabled sections rather than deleted, ensuring no data loss.

**Safety Features:**
- Automatic backups before modifications
- JSON validation after every change
- No data loss - servers are moved, not deleted
- Easy rollback via backups

## Testing

**Test Suite**: 139 tests (130 passing, 93.5%)
**Coverage**: Core functionality fully tested
**Duration**: ~300ms for full suite

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

See [TESTING.md](TESTING.md) for full test documentation.

## Token Estimates

Token estimates are based on:
1. **Known servers** - Actual reported values from the community
2. **Heuristics** - Smart guessing based on server type
3. **Conservative estimates** - Better to overestimate than underestimate

Example known servers:
- `canvas-mcp-server`: ~78,000 tokens
- `notion`: ~35,000 tokens
- `github`: ~15,000 tokens
- `puppeteer`: ~8,000 tokens

Estimates may not be 100% accurate, but they give you a solid understanding of relative token consumption.

## Contributing

This tool was built to solve a real problem in the MCP ecosystem. If you have:

- Bug reports
- Feature requests
- Accurate token counts for servers
- New tool adapters (Continue, Zed, etc.)
- UI improvements

Please open an issue or PR on [GitHub](https://github.com/houseworthe/house-mcp-manager)!

## License

MIT License - See [LICENSE](LICENSE) file for details.
