# MCP Manager

**Universal MCP server management for AI coding agents**

A powerful CLI tool to manage MCP servers across multiple AI coding tools (Claude Code, Cursor, Cline, Continue) and optimize your token usage.

## The Problem

AI coding agents load ALL configured MCP servers on startup, consuming massive amounts of your context window before you even start coding. Some servers like Canvas can consume **78,000+ tokens** - that's nearly 40% of your 200K context budget!

Multiple highly-upvoted GitHub issues ([#6638](https://github.com/anthropics/claude-code/issues/6638), [#5722](https://github.com/anthropics/claude-code/issues/5722), [#7068](https://github.com/anthropics/claude-code/issues/7068), [#7936](https://github.com/anthropics/claude-code/issues/7936)) show the community wants better MCP management, but there's no official solution yet.

## The Solution

`mcp-manager` works with ANY MCP-enabled tool to let you quickly enable/disable servers, view token usage, save profiles, and optimize your context window - all without manually editing JSON files.

## Supported Tools

- **Claude Code** - Anthropic's official CLI
- **Cline** - Popular VS Code extension
- **Continue** - Coming soon
- **Zed** - Coming soon

The tool auto-detects which MCP-enabled tools you have installed and manages them accordingly.

## Features

- **Universal** - Works with Claude Code, Cline, and more
- **Auto-Detection** - Automatically finds installed MCP tools
- **Quick Enable/Disable** - Toggle servers on/off instantly
- **Token Tracking** - See exactly how many tokens each server consumes
- **Interactive Mode** - Beautiful checkbox interface for bulk management
- **Profiles** - Save and load different server configurations
- **Safe** - Automatic backups before any modifications
- **Fast** - No need to restart or manually edit configs

## Quick Setup with Claude Code

Copy and paste this prompt into Claude Code to automatically install mcp-manager:

```
Please help me install mcp-manager:

1. Clone the repository from https://github.com/houseworthe/claude-mcp-manager
2. Navigate into the cloned directory
3. Run npm install to install dependencies
4. Run npm run build to compile the TypeScript
5. Run npm link to make the mcp-manager command available globally
6. Verify the installation by running: mcp-manager --help
7. Show me my current MCP server status by running: mcp-manager status

After installation, explain what mcp-manager does and show me the key commands I can use.
```

## Installation

### Option 1: Clone & Link (Recommended)

```bash
git clone https://github.com/houseworthe/claude-mcp-manager.git
cd claude-mcp-manager
npm install
npm run build
npm link
```

Now you can use `mcp-manager` from anywhere!

### Option 2: Run from Source

```bash
git clone https://github.com/houseworthe/claude-mcp-manager.git
cd claude-mcp-manager
npm install
npm run dev <command>
```

### Future: npm Global Install (Coming Soon)

```bash
npm install -g mcp-manager
```

## Quick Start

### Detect Installed Tools

```bash
# See which MCP-enabled tools are installed
mcp-manager detect
```

### View Your Current Setup

```bash
# List all servers (auto-detects tool)
mcp-manager list

# View detailed token estimates
mcp-manager status

# Manage a specific tool
mcp-manager --tool=cline list
mcp-manager --tool=claude status
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
| `mcp-manager detect` | Detect installed MCP-enabled tools |
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
| `mcp-manager config` | Show MCP config file path |
| `mcp-manager --tool=<id> <command>` | Manage a specific tool |
| `mcp-manager --help` | Show help |

## Multi-Tool Management

```bash
# Auto-detect which tool to manage
mcp-manager status

# Explicitly manage Claude Code
mcp-manager --tool=claude status

# Manage Cline (VS Code extension)
mcp-manager --tool=cline list

# See which tools are detected
mcp-manager detect
```

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

`mcp-manager` uses an adapter pattern to support multiple MCP-enabled tools:

- **Claude Code**: Manages `~/.claude.json`
- **Cline**: Manages VS Code `settings.json`
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

Please open an issue or PR on [GitHub](https://github.com/houseworthe/claude-mcp-manager)!

## Roadmap

- [x] Claude Code support
- [x] Cline support
- [x] Auto-detection of installed tools
- [x] Token estimation
- [x] Profile system
- [x] Interactive mode
- [ ] Continue.dev support
- [ ] Zed support
- [ ] Real-time token introspection
- [ ] Global disable/enable all
- [ ] Server categories (dev, prod, testing)
- [ ] Export/import profiles as shareable files
- [ ] VS Code extension
- [ ] Sync configs across tools

## Background

This tool was created to address the MCP server management pain point discussed in Claude Code GitHub issues. Built as a universal solution for the entire MCP ecosystem, not just one tool.

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
Open an issue on [GitHub](https://github.com/houseworthe/claude-mcp-manager) or reach out to [@ethanhouseworth](https://github.com/ethanhouseworth).

---

**If this tool saves your tokens, give it a star on GitHub!**
