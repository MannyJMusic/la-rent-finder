#!/bin/bash

# LA Rent Finder - Development Environment Initialization Script
# This script sets up the development environment and starts the Next.js dev server

set -e  # Exit on error

echo "=========================================="
echo "LA Rent Finder - Development Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo -e "${BLUE}Checking Node.js version...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js is not installed. Please install Node.js 18.0 or higher.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}Node.js version: $NODE_VERSION${NC}"
echo ""

# Check npm
echo -e "${BLUE}Checking npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}npm is not installed. Please install npm.${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}npm version: $NPM_VERSION${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}Dependencies installed successfully${NC}"
else
    echo -e "${YELLOW}package.json not found. Skipping npm install.${NC}"
fi
echo ""

# Setup environment variables
echo -e "${BLUE}Setting up environment variables...${NC}"
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}.env.local not found${NC}"
    if [ -f ".env.example" ]; then
        echo "Copying .env.example to .env.local..."
        cp .env.example .env.local
        echo -e "${GREEN}.env.local created from .env.example${NC}"
        echo -e "${YELLOW}Please edit .env.local and add your configuration values${NC}"
    else
        echo -e "${YELLOW}.env.example not found${NC}"
        echo "Creating basic .env.local template..."
        cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Mapbox Configuration
NEXT_PUBLIC_MAPBOX_TOKEN=

# Service Keys
SUPABASE_SERVICE_ROLE_KEY=

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF
        echo -e "${YELLOW}Please edit .env.local and add your configuration values${NC}"
    fi
else
    echo -e "${GREEN}.env.local already exists${NC}"
fi
echo ""

# Check if required environment variables are set
echo -e "${BLUE}Checking required environment variables...${NC}"
MISSING_VARS=0

# Check core application variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -z "$(grep -E 'NEXT_PUBLIC_SUPABASE_URL' .env.local 2>/dev/null | grep -v '^#' | cut -d= -f2 | tr -d ' ')" ]; then
    echo -e "${YELLOW}Warning: NEXT_PUBLIC_SUPABASE_URL is not set${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✓ Supabase URL is configured${NC}"
fi

if [ -z "$NEXT_PUBLIC_MAPBOX_TOKEN" ] && [ -z "$(grep -E 'NEXT_PUBLIC_MAPBOX_TOKEN' .env.local 2>/dev/null | grep -v '^#' | cut -d= -f2 | tr -d ' ')" ]; then
    echo -e "${YELLOW}Warning: NEXT_PUBLIC_MAPBOX_TOKEN is not set${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✓ Mapbox token is configured${NC}"
fi

# Check MCP server configurations
echo ""
echo -e "${BLUE}Checking MCP server configurations...${NC}"

if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$(grep -E 'ANTHROPIC_API_KEY' .env.local 2>/dev/null | grep -v '^#' | cut -d= -f2 | tr -d ' ')" ]; then
    echo -e "${YELLOW}Warning: ANTHROPIC_API_KEY is not set (required for agents)${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✓ Anthropic API key is configured${NC}"
fi

if [ -z "$LINEAR_API_KEY" ] && [ -z "$(grep -E 'LINEAR_API_KEY' .env.local 2>/dev/null | grep -v '^#' | cut -d= -f2 | tr -d ' ')" ]; then
    echo -e "${YELLOW}Warning: LINEAR_API_KEY is not set (optional)${NC}"
else
    echo -e "${GREEN}✓ Linear API key is configured${NC}"
fi

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ] && [ -z "$(grep -E 'GITHUB_PERSONAL_ACCESS_TOKEN' .env.local 2>/dev/null | grep -v '^#' | cut -d= -f2 | tr -d ' ')" ]; then
    echo -e "${YELLOW}Warning: GITHUB_PERSONAL_ACCESS_TOKEN is not set (optional)${NC}"
else
    echo -e "${GREEN}✓ GitHub token is configured${NC}"
fi

if [ -z "$FIRECRAWL_API_KEY" ] && [ -z "$(grep -E 'FIRECRAWL_API_KEY' .env.local 2>/dev/null | grep -v '^#' | cut -d= -f2 | tr -d ' ')" ]; then
    echo -e "${YELLOW}Warning: FIRECRAWL_API_KEY is not set (optional, for web scraping)${NC}"
else
    echo -e "${GREEN}✓ Firecrawl API key is configured${NC}"
fi

# Check if MCP config file exists
if [ -f "cline_mcp_config.json" ]; then
    echo -e "${GREEN}✓ MCP configuration file found${NC}"
else
    echo -e "${YELLOW}Warning: cline_mcp_config.json not found${NC}"
fi

if [ $MISSING_VARS -eq 1 ]; then
    echo ""
    echo -e "${YELLOW}Some environment variables are not configured.${NC}"
    echo -e "${YELLOW}The application may have limited functionality.${NC}"
    echo ""
    echo -e "${BLUE}To set up Supabase:${NC}"
    echo "1. Create a Supabase project at https://supabase.com/dashboard"
    echo "2. Run the migration from supabase/migrations/20260211000001_initial_schema.sql"
    echo "3. (Optional) Load sample data from supabase/seed.sql"
    echo "4. Copy your Supabase URL and keys to .env.local"
    echo ""
    echo -e "${BLUE}To set up MCP servers:${NC}"
    echo "1. Get an Anthropic API key from https://console.anthropic.com/"
    echo "2. (Optional) Get a Linear API key from https://linear.app/settings/api"
    echo "3. (Optional) Get a GitHub token from https://github.com/settings/tokens"
    echo "4. (Optional) Get a Firecrawl API key from https://firecrawl.dev/"
    echo "5. Add all keys to .env.local"
    echo ""
    echo -e "${BLUE}See supabase/README.md for detailed setup instructions${NC}"
fi
echo ""

# Display startup information
echo -e "${BLUE}Starting development server...${NC}"
echo -e "${GREEN}=========================================="
echo "Development server will start on:"
echo "  http://localhost:3000"
echo "==========================================${NC}"
echo ""

# Start the development server
if [ -f "package.json" ] && grep -q '"dev"' package.json; then
    echo -e "${BLUE}Running: npm run dev${NC}"
    npm run dev
else
    echo -e "${YELLOW}Dev script not found in package.json${NC}"
    echo -e "${BLUE}Running: npx next dev${NC}"
    npx next dev
fi
