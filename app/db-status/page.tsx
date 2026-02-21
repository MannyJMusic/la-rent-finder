'use client';

import { useState, useEffect } from 'react';

/**
 * Database Status Page
 * This page helps verify the Supabase setup and connection
 */

export default function DatabaseStatusPage() {
  const [status, setStatus] = useState<{
    configured: boolean;
    url?: string;
    hasAnonKey: boolean;
    hasServiceKey: boolean;
    error?: string;
  }>({
    configured: false,
    hasAnonKey: false,
    hasServiceKey: false,
  });

  const [testResults, setTestResults] = useState<{
    connection?: string;
    tables?: string[];
    error?: string;
  }>({});

  useEffect(() => {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    setStatus({
      configured: !!(supabaseUrl && anonKey),
      url: supabaseUrl,
      hasAnonKey: !!anonKey,
      hasServiceKey: !!serviceKey,
    });
  }, []);

  const testConnection = async () => {
    try {
      setTestResults({ connection: 'Testing...' });

      // This would normally test the actual connection
      // For now, we'll just verify the setup
      const response = await fetch('/api/db-test');
      const data = await response.json();

      setTestResults(data);
    } catch (error) {
      setTestResults({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">
              Supabase Database Status
            </h1>
            <p className="text-blue-100 mt-1">
              Verify your database setup and connection
            </p>
          </div>

          {/* Configuration Status */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Configuration Status
            </h2>

            <div className="space-y-3">
              <StatusRow
                label="Supabase URL"
                status={status.url ? 'configured' : 'missing'}
                value={status.url || 'Not configured'}
              />
              <StatusRow
                label="Anonymous/Public Key"
                status={status.hasAnonKey ? 'configured' : 'missing'}
                value={status.hasAnonKey ? 'Configured' : 'Not configured'}
              />
              <StatusRow
                label="Service Role Key"
                status={status.hasServiceKey ? 'configured' : 'missing'}
                value={status.hasServiceKey ? 'Configured (Hidden)' : 'Not configured'}
              />
            </div>

            {!status.configured && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h3 className="text-sm font-medium text-yellow-800">
                  Setup Required
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Your Supabase environment variables are not configured. Please follow these steps:
                </p>
                <ol className="list-decimal list-inside text-sm text-yellow-700 mt-2 space-y-1">
                  <li>Create a Supabase project at supabase.com</li>
                  <li>Run the migration from supabase/migrations/</li>
                  <li>Copy your API keys to .env.local</li>
                  <li>Restart the dev server</li>
                </ol>
                <p className="text-sm text-yellow-700 mt-2">
                  See <code className="bg-yellow-100 px-1 rounded">supabase/SETUP_GUIDE.md</code> for detailed instructions.
                </p>
              </div>
            )}
          </div>

          {/* Database Schema */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Expected Database Schema
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SchemaTable
                name="users"
                description="User accounts and preferences"
                columns={['id', 'email', 'first_name', 'last_name', 'preferences']}
              />
              <SchemaTable
                name="apartments"
                description="Rental property listings"
                columns={['id', 'title', 'location', 'price', 'bedrooms', 'photos']}
              />
              <SchemaTable
                name="favorites"
                description="User saved apartments"
                columns={['user_id', 'apartment_id', 'notes']}
              />
              <SchemaTable
                name="appointments"
                description="Viewing appointments"
                columns={['id', 'user_id', 'apartment_id', 'scheduled_time', 'status']}
              />
              <SchemaTable
                name="messages"
                description="Direct messages"
                columns={['id', 'sender_id', 'recipient_id', 'content', 'read']}
              />
              <SchemaTable
                name="chats"
                description="AI agent chat history"
                columns={['id', 'user_id', 'agent_type', 'messages']}
              />
            </div>
          </div>

          {/* Connection Test */}
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Connection Test
            </h2>

            <button
              onClick={testConnection}
              disabled={!status.configured}
              className={`px-4 py-2 rounded-md font-medium ${
                status.configured
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Test Database Connection
            </button>

            {testResults.connection && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-700">{testResults.connection}</p>
              </div>
            )}

            {testResults.error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{testResults.error}</p>
              </div>
            )}
          </div>

          {/* Resources */}
          <div className="px-6 py-4 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Resources
            </h2>

            <div className="space-y-2">
              <ResourceLink
                title="Setup Guide"
                href="/supabase/SETUP_GUIDE.md"
                description="Step-by-step Supabase setup instructions"
              />
              <ResourceLink
                title="Database Schema"
                href="/supabase/migrations/20260211000001_initial_schema.sql"
                description="Complete database migration file"
              />
              <ResourceLink
                title="Sample Data"
                href="/supabase/seed.sql"
                description="Seed data for testing"
              />
              <ResourceLink
                title="Verification Script"
                href="/supabase/verify_setup.sql"
                description="SQL script to verify setup"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function StatusRow({ label, status, value }: {
  label: string;
  status: 'configured' | 'missing';
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{value}</span>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            status === 'configured'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {status === 'configured' ? 'OK' : 'Missing'}
        </span>
      </div>
    </div>
  );
}

function SchemaTable({ name, description, columns }: {
  name: string;
  description: string;
  columns: string[];
}) {
  return (
    <div className="border border-gray-200 rounded-md p-4">
      <h3 className="text-sm font-bold text-gray-900 font-mono">{name}</h3>
      <p className="text-xs text-gray-600 mt-1">{description}</p>
      <div className="mt-2 space-y-1">
        {columns.map((col) => (
          <div key={col} className="text-xs text-gray-500 font-mono">
            • {col}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceLink({ title, href, description }: {
  title: string;
  href: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <svg
        className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <div>
        <code className="text-sm font-medium text-gray-900">{title}</code>
        <p className="text-xs text-gray-600 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
