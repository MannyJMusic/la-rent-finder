'use client'

import { useEffect, useState } from 'react'

interface MCPServer {
  name: string
  configured: boolean
  envVars: string[]
  description: string
}

export default function MCPStatusPage() {
  const [mcpServers, setMCPServers] = useState<MCPServer[]>([])

  useEffect(() => {
    // Check environment variables
    const servers: MCPServer[] = [
      {
        name: 'Supabase MCP',
        configured: false,
        envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
        description: 'Database operations and queries'
      },
      {
        name: 'Linear MCP',
        configured: false,
        envVars: ['LINEAR_API_KEY'],
        description: 'Project management and issue tracking'
      },
      {
        name: 'GitHub MCP',
        configured: false,
        envVars: ['GITHUB_PERSONAL_ACCESS_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'],
        description: 'Repository management and version control'
      },
      {
        name: 'Slack MCP',
        configured: false,
        envVars: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
        description: 'Team notifications and communication'
      },
      {
        name: 'Firecrawl MCP',
        configured: false,
        envVars: ['FIRECRAWL_API_KEY'],
        description: 'Web scraping for rental listings'
      },
      {
        name: 'Browserbase MCP',
        configured: false,
        envVars: ['BROWSERBASE_API_KEY', 'BROWSERBASE_PROJECT_ID'],
        description: 'Browser automation for complex scraping'
      },
      {
        name: 'Playwright MCP',
        configured: true, // Always available
        envVars: [],
        description: 'Browser testing and automation (built-in)'
      }
    ]

    // Note: In a real implementation, we'd check these on the server-side
    // For now, we're just showing the configuration structure
    setMCPServers(servers)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            MCP Server Configuration Status
          </h1>
          <p className="text-gray-600 mb-4">
            Model Context Protocol (MCP) servers provide standardized interfaces for AI agents
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
            <span>Configured</span>
            <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full ml-4"></span>
            <span>Not Configured</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {mcpServers.map((server) => (
            <div
              key={server.name}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                server.configured ? 'border-green-500' : 'border-yellow-500'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-semibold text-gray-900">{server.name}</h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    server.configured
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {server.configured ? 'Ready' : 'Setup Required'}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-3">{server.description}</p>
              {server.envVars.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Required Variables:</p>
                  <div className="flex flex-wrap gap-2">
                    {server.envVars.map((envVar) => (
                      <code
                        key={envVar}
                        className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-mono"
                      >
                        {envVar}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Configuration Files</h2>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <code className="font-mono">.env.example</code>
              <span>- Template with all required variables</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <code className="font-mono">.env.local</code>
              <span>- Your local configuration (gitignored)</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <code className="font-mono">cline_mcp_config.json</code>
              <span>- MCP server definitions</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <code className="font-mono">init.sh</code>
              <span>- Setup and verification script</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Setup Instructions</h2>
          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>
                Copy <code className="px-1 bg-gray-100 rounded">.env.example</code> to{' '}
                <code className="px-1 bg-gray-100 rounded">.env.local</code>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Fill in API keys for each service you want to use</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>
                Run <code className="px-1 bg-gray-100 rounded">./init.sh</code> to verify configuration
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span>
                See <code className="px-1 bg-gray-100 rounded">MCP_SETUP.md</code> for detailed
                setup instructions for each service
              </span>
            </li>
          </ol>
        </div>

        <div className="mt-6 bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-green-900 mb-2">
            ✓ MCP Configuration Complete
          </h2>
          <p className="text-sm text-green-800">
            All MCP server configurations have been created. Add your API keys to{' '}
            <code className="px-1 bg-white rounded">.env.local</code> to enable each service.
          </p>
        </div>
      </div>
    </div>
  )
}
