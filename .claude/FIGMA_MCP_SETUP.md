# Figma MCP Server Setup

The Figma MCP (Model Context Protocol) server has been installed and configured for your workspace.

## ✅ What's Done

1. ✅ Installed `mcp-figma` package globally
2. ✅ Created `.claude/mcp.json` configuration file
3. ✅ Set up the MCP server to use `npx` for easy execution

## 🔑 Next Steps: Get Your Figma API Token

To use the Figma MCP server, you need a personal access token:

1. **Go to Figma Settings**
   - Visit: https://www.figma.com/settings
   - Or click your profile → Settings

2. **Create Personal Access Token**
   - Scroll to "Personal Access Tokens" section
   - Click "Create new token"
   - Give it a descriptive name (e.g., "Claude MCP Server")
   - Copy the token (starts with `figd_`)

3. **Set Your Token in Claude**
   - After restarting VS Code, tell me:
   - "Please use mcp-figma to set my Figma API key: figd_xxxxxxxxxxxxxxxxxxxxxxx"
   - The token will be saved to `~/.mcp-figma/config.json`

## 🚀 Usage Examples

Once your token is set, you can ask me to:

- **View Figma files**: "Get the Figma file with key ABC123"
- **Export images**: "Export images from nodes X and Y in Figma file ABC123"
- **Read comments**: "Show me comments on Figma file ABC123"
- **Get components**: "List all components in team ID 123456"
- **Check styles**: "Get styles from Figma file ABC123"

## 🔄 Final Step

**Restart VS Code** to activate the MCP server.

After restart, set your Figma API key and start using Figma directly from Claude!
