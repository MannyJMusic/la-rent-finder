# MCP Server Configuration Guide

This document explains how to set up and configure Model Context Protocol (MCP) servers for the LA Rent Finder application.

## Overview

MCP servers provide standardized interfaces for AI agents to interact with external services. This application uses several MCP servers:

- **Supabase MCP**: Database operations and queries
- **Linear MCP**: Project management and issue tracking
- **GitHub MCP**: Repository management and version control
- **Slack MCP**: Team notifications and communication
- **Firecrawl MCP**: Web scraping for rental listings
- **Browserbase MCP**: Browser automation for complex scraping
- **Playwright MCP**: Browser testing and automation

## Configuration Files

### 1. `cline_mcp_config.json`

Main MCP server configuration file that defines how each server is launched.

```json
{
  "mcpServers": {
    "supabase": { ... },
    "linear": { ... },
    "github": { ... }
  }
}
```

### 2. `.env.local`

Environment variables for API keys and credentials. Copy from `.env.example`:

```bash
cp .env.example .env.local
```

## Setting Up Each MCP Server

### Supabase MCP

**Purpose**: Direct database access for agents

**Setup**:
1. Use your existing Supabase credentials
2. Set in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

**Testing**:
The Supabase MCP will use the same credentials as your Next.js app.

---

### Linear MCP

**Purpose**: Project management, issue tracking, and workflow automation

**Setup**:
1. Go to https://linear.app/settings/api
2. Create a new API key with these scopes:
   - `read` - Read issues, projects, teams
   - `write` - Create and update issues
3. Add to `.env.local`:
   ```
   LINEAR_API_KEY=lin_api_xxx
   ```

**Testing**:
```bash
# The MCP server will validate on startup
# Check Linear integration in Claude Code settings
```

---

### GitHub MCP

**Purpose**: Repository management, code review, PR creation

**Setup**:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` (all repo permissions)
   - `workflow` (for GitHub Actions)
4. Add to `.env.local`:
   ```
   GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxx
   GITHUB_OWNER=your-username
   GITHUB_REPO=la-rent-finder
   ```

**Testing**:
```bash
# Test with gh CLI
gh auth status
gh repo view
```

---

### Slack MCP

**Purpose**: Team notifications, alerts, and communication

**Setup**:
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Add these bot token scopes:
   - `chat:write` - Send messages
   - `channels:read` - List channels
   - `channels:history` - Read channel messages
4. Install app to workspace
5. Copy Bot Token (starts with `xoxb-`)
6. Add to `.env.local`:
   ```
   SLACK_BOT_TOKEN=xoxb-xxx
   SLACK_TEAM_ID=T12345678
   ```

**Testing**:
```bash
# Send a test message via the MCP server
# Should appear in your Slack workspace
```

---

### Firecrawl MCP

**Purpose**: Web scraping for rental listings (Zillow, Apartments.com, etc.)

**Setup**:
1. Go to https://firecrawl.dev/
2. Sign up for an account
3. Get API key from dashboard
4. Add to `.env.local`:
   ```
   FIRECRAWL_API_KEY=fc-xxx
   ```

**Features**:
- Scrapes dynamic JavaScript-rendered pages
- Returns clean, structured data
- Handles anti-bot protection
- Rate limiting and retry logic

**Testing**:
```bash
# The Market Researcher agent uses this to scrape rental sites
# Test with a simple URL scrape
```

---

### Browserbase MCP

**Purpose**: Advanced browser automation for complex scraping tasks

**Setup**:
1. Go to https://browserbase.com/
2. Sign up and create a project
3. Get API key and Project ID from dashboard
4. Add to `.env.local`:
   ```
   BROWSERBASE_API_KEY=bb_xxx
   BROWSERBASE_PROJECT_ID=proj_xxx
   ```

**Features**:
- Full browser automation (Chrome/Firefox)
- Session recording and debugging
- Proxy support for geo-targeting
- Screenshot and PDF generation

**Testing**:
```bash
# Used for sites that require complex interactions
# (e.g., login flows, form submissions)
```

---

### Playwright MCP

**Purpose**: Browser testing and E2E automation

**Setup**:
No API key required - uses local Playwright installation.

**Features**:
- Already configured in `.claude_settings.json`
- Used for UI testing and verification
- Takes screenshots for evidence

**Testing**:
```bash
# Run init.sh to start dev server
./init.sh

# Playwright MCP will be available for browser testing
```

---

## Verification

Run the initialization script to verify all configurations:

```bash
chmod +x init.sh
./init.sh
```

The script will check:
- ✓ Node.js and npm versions
- ✓ Environment variables
- ✓ MCP configuration file
- ✓ Package dependencies

## Troubleshooting

### MCP Server Won't Start

1. Check environment variables are set correctly
2. Verify API keys are valid
3. Check network connectivity
4. Look for error messages in Claude Code logs

### Authentication Errors

- **Supabase**: Verify service role key (not anon key)
- **Linear**: Check API key has correct scopes
- **GitHub**: Ensure token has repo access
- **Slack**: Verify bot is installed to workspace

### Rate Limiting

- **Firecrawl**: Free tier has limits, upgrade if needed
- **Browserbase**: Monitor usage in dashboard
- **GitHub**: Personal tokens have lower limits than OAuth apps

## Security Best Practices

1. **Never commit `.env.local`** - It's in `.gitignore`
2. **Use service accounts** where possible (not personal tokens)
3. **Rotate keys regularly** (every 90 days recommended)
4. **Limit scopes** to minimum required permissions
5. **Monitor usage** for suspicious activity

## MCP Server Architecture

```
┌─────────────────┐
│  Claude Agent   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │   MCP    │  (Model Context Protocol)
    └────┬─────┘
         │
    ┌────▼──────────────────────────┐
    │  MCP Server (stdio/HTTP)      │
    └────┬──────────────────────────┘
         │
    ┌────▼────────┐
    │  External   │  (Supabase, Linear, etc.)
    │  Service    │
    └─────────────┘
```

Each MCP server:
1. Runs as a separate process
2. Communicates via stdio or HTTP
3. Provides standardized tools/resources
4. Handles authentication and rate limiting

## Next Steps

After setting up MCP servers:

1. Test basic connectivity with init.sh
2. Implement Orchestrator agent (REC-141)
3. Implement Market Researcher agent (REC-142)
4. Wire up agent-to-UI communication (REC-146)

## Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Anthropic MCP Documentation](https://docs.anthropic.com/en/docs/agents-and-tools)
- [Available MCP Servers](https://github.com/modelcontextprotocol/servers)
