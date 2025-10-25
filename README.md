# Claude MCP Manager

A powerful CLI tool to manage your Claude Code MCP servers and optimize your token usage.

## The Problem

Claude Code loads ALL configured MCP servers on startup, consuming massive amounts of your context window before you even start coding. Some servers like Canvas can consume **78,000+ tokens** - that's nearly 40% of your 200K context budget!

Multiple highly-upvoted GitHub issues ([#6638](https://github.com/anthropics/claude-code/issues/6638), [#5722](https://github.com/anthropics/claude-code/issues/5722), [#7068](https://github.com/anthropics/claude-code/issues/7068), [#7936](https://github.com/anthropics/claude-code/issues/7936)) show the community wants better MCP management, but there's no official solution yet.

## The Solution

`mcp-manager` lets you quickly enable/disable MCP servers, view token usage, save profiles, and optimize your context window - all without manually editing JSON files.

## Features

- **Quick Enable/Disable** - Toggle servers on/off instantly
- **Token Tracking** - See exactly how many tokens each server consumes
- **Interactive Mode** - Beautiful checkbox interface for bulk management
- **Profiles** - Save and load different server configurations
- **Safe** - Automatic backups before any modifications
- **Fast** - No need to restart Claude or manually edit configs

## Quick Setup with Claude Code

Copy and paste this prompt into Claude Code to automatically install mcp-manager:

```
Please help me install claude-mcp-manager:

1. Clone the repository from https://github.com/houseworthe/mcp-manager
2. Navigate into the cloned directory
3. Run npm install to install dependencies
4. Run npm run build to compile the TypeScript
5. Run npm link to make the mcp-manager command available globally
6. Verify the installation by running: mcp-manager --help
7. Show me my current MCP server status by running: mcp-manager status

After installation, explain what mcp-manager does and show me the key commands I can use.
```

## Installation

### Option 1: Clone & Link (Recommended for Now)

```bash
git clone https://github.com/ethanhouseworth/claude-mcp-manager.git
cd claude-mcp-manager
npm install
npm run build
npm link
```

Now you can use `mcp-manager` from anywhere!

### Option 2: Run from Source

```bash
git clone https://github.com/ethanhouseworth/claude-mcp-manager.git
cd claude-mcp-manager
npm install
npm run dev <command>
```

### Future: npm Global Install (Coming Soon)

```bash
npm install -g claude-mcp-manager
```

## Quick Start

### View Your Current Setup

```bash
# List all servers
mcp-manager list

# View detailed token estimates
mcp-manager status
```

### Enable/Disable Servers

```bash
# Disable a heavy server
mcp-manager disable canvas-mcp-server

# Enable it back when needed
mcp-manager enable canvas-mcp-server
```

### Interactive Mode (Recommended)

```bash
# Launch interactive checkbox interface
mcp-manager interactive

# Or just:
mcp-manager
```

This shows all your servers with token estimates. Use ↑/↓ to navigate, Space to toggle, Enter to confirm.

### Profiles - Save Your Favorite Configs

```bash
# Save current setup as "minimal"
mcp-manager profile save minimal

# Switch between configurations
mcp-manager profile load minimal
mcp-manager profile load full

# Create pre-built profiles
mcp-manager profile init

# View all saved profiles
mcp-manager profile list

# Delete a profile
mcp-manager profile delete old-config
```

## Commands

| Command | Description |
|---------|-------------|
| `mcp-manager list` | List all MCP servers (enabled/disabled) |
| `mcp-manager status` | Show detailed status with token estimates |
| `mcp-manager disable <server>` | Disable a specific server |
| `mcp-manager enable <server>` | Enable a specific server |
| `mcp-manager interactive` | Launch interactive checkbox mode |
| `mcp-manager profile save <name>` | Save current config as a profile |
| `mcp-manager profile load <name>` | Load a saved profile |
| `mcp-manager profile list` | List all saved profiles |
| `mcp-manager profile delete <name>` | Delete a profile |
| `mcp-manager profile init` | Create pre-built profiles |
| `mcp-manager config` | Show Claude config file path |
| `mcp-manager --help` | Show help |

## Example Workflow

```bash
# 1. Check current token usage
mcp-manager status
# Output: Total Active Token Usage: ~127,000 tokens ⚠️

# 2. Disable heavy servers you're not using
mcp-manager interactive
# Uncheck canvas, notion, puppeteer

# 3. Check new usage
mcp-manager status
# Output: Total Active Token Usage: ~14,000 tokens ✓

# 4. Save this minimal config
mcp-manager profile save coding-only

# 5. Later, when you need all features
mcp-manager profile load full
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

`mcp-manager` reads your `~/.claude.json` config file and moves servers between `mcpServers` (enabled) and `_disabled_mcpServers` (disabled). This is the same approach recommended in the Claude Code issues but automated for you.

**Safety Features:**
- Automatic backups before modifications (stored in `~/.claude-mcp-backups/`)
- JSON validation after every change
- No data loss - servers are moved, not deleted
- Easy rollback via backups

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

This tool was built to solve a real problem in the Claude Code ecosystem. If you have:

- Bug reports
- Feature requests
- Accurate token counts for servers
- UI improvements

Please open an issue or PR on [GitHub](https://github.com/ethanhouseworth/claude-mcp-manager)!

## Roadmap

- [ ] Real-time token introspection (query MCP servers for actual tool counts)
- [ ] Global disable/enable all
- [ ] Server categories (dev, prod, testing)
- [ ] Export/import profiles as shareable files
- [ ] VS Code extension for even easier management
- [ ] Integration with Claude Code settings UI

## Background

This tool was created to address the MCP server management pain point discussed in:
- [Issue #6638](https://github.com/anthropics/claude-code/issues/6638) - Dynamic loading/unloading of MCP servers (22+ upvotes)
- [Issue #5722](https://github.com/anthropics/claude-code/issues/5722) - Enable/Disable toggle for MCP configurations
- [Issue #7068](https://github.com/anthropics/claude-code/issues/7068) - Enable/Disable in /mcp command
- [Issue #7936](https://github.com/anthropics/claude-code/issues/7936) - MCP servers persist despite removal

Built by [@ethanhouseworth](https://github.com/ethanhouseworth) as part of the AI-native development philosophy.

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

**Built with:**
- TypeScript
- Commander.js
- Inquirer.js
- Chalk

**Questions?**
Open an issue on [GitHub](https://github.com/ethanhouseworth/claude-mcp-manager) or reach out to [@ethanhouseworth](https://github.com/ethanhouseworth).

---

**If this tool saves your tokens, give it a star on GitHub!**
