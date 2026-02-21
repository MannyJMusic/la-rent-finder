'use client';

/**
 * Database Schema Visualization
 * Visual representation of the LA Rent Finder database structure
 */

export default function DatabaseSchemaPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">
              Database Schema Visualization
            </h1>
            <p className="text-blue-100 mt-1">
              LA Rent Finder - Supabase PostgreSQL Database
            </p>
          </div>

          {/* Schema Diagram */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Users Table */}
              <Table
                name="users"
                color="blue"
                primaryKey="id (UUID)"
                columns={[
                  'email (VARCHAR)',
                  'password_hash (VARCHAR)',
                  'first_name (VARCHAR)',
                  'last_name (VARCHAR)',
                  'phone (VARCHAR)',
                  'preferences (JSONB)',
                  'created_at (TIMESTAMP)',
                  'updated_at (TIMESTAMP)',
                ]}
                indexes={['idx_users_email', 'idx_users_created_at']}
                rlsPolicies={['users_select_own', 'users_update_own', 'users_insert_own']}
              />

              {/* Apartments Table */}
              <Table
                name="apartments"
                color="green"
                primaryKey="id (UUID)"
                columns={[
                  'title (VARCHAR)',
                  'description (TEXT)',
                  'address (VARCHAR)',
                  'location (VARCHAR)',
                  'price (DECIMAL)',
                  'latitude (DECIMAL)',
                  'longitude (DECIMAL)',
                  'bedrooms (INTEGER)',
                  'bathrooms (DECIMAL)',
                  'square_feet (INTEGER)',
                  'amenities (JSONB)',
                  'photos (TEXT[])',
                  'availability_score (DECIMAL)',
                  'available_date (DATE)',
                  'created_at (TIMESTAMP)',
                  'updated_at (TIMESTAMP)',
                ]}
                indexes={[
                  'idx_apartments_location',
                  'idx_apartments_price',
                  'idx_apartments_bedrooms',
                  'idx_apartments_coordinates (GIS)',
                ]}
                rlsPolicies={['apartments_select_all', 'apartments_insert_authenticated']}
              />

              {/* Favorites Table */}
              <Table
                name="favorites"
                color="yellow"
                primaryKey="(user_id, apartment_id)"
                columns={[
                  'user_id (UUID) FK → users',
                  'apartment_id (UUID) FK → apartments',
                  'notes (TEXT)',
                  'created_at (TIMESTAMP)',
                ]}
                indexes={['idx_favorites_user_id', 'idx_favorites_apartment_id']}
                rlsPolicies={['favorites_select_own', 'favorites_insert_own', 'favorites_delete_own']}
              />

              {/* Appointments Table */}
              <Table
                name="appointments"
                color="purple"
                primaryKey="id (UUID)"
                columns={[
                  'user_id (UUID) FK → users',
                  'apartment_id (UUID) FK → apartments',
                  'scheduled_time (TIMESTAMP)',
                  'status (VARCHAR)',
                  'notes (TEXT)',
                  'reminder_sent (BOOLEAN)',
                  'created_at (TIMESTAMP)',
                  'updated_at (TIMESTAMP)',
                ]}
                indexes={[
                  'idx_appointments_user_id',
                  'idx_appointments_apartment_id',
                  'idx_appointments_scheduled_time',
                  'idx_appointments_status',
                ]}
                rlsPolicies={['appointments_select_own', 'appointments_insert_own', 'appointments_update_own']}
              />

              {/* Messages Table */}
              <Table
                name="messages"
                color="pink"
                primaryKey="id (UUID)"
                columns={[
                  'sender_id (UUID) FK → users',
                  'recipient_id (UUID) FK → users',
                  'apartment_id (UUID) FK → apartments',
                  'subject (VARCHAR)',
                  'content (TEXT)',
                  'read (BOOLEAN)',
                  'created_at (TIMESTAMP)',
                ]}
                indexes={[
                  'idx_messages_sender_id',
                  'idx_messages_recipient_id',
                  'idx_messages_apartment_id',
                ]}
                rlsPolicies={['messages_select_own', 'messages_insert_own', 'messages_update_received']}
              />

              {/* Chats Table */}
              <Table
                name="chats"
                color="indigo"
                primaryKey="id (UUID)"
                columns={[
                  'user_id (UUID) FK → users',
                  'agent_type (VARCHAR)',
                  'title (VARCHAR)',
                  'messages (JSONB)',
                  'metadata (JSONB)',
                  'created_at (TIMESTAMP)',
                  'updated_at (TIMESTAMP)',
                ]}
                indexes={['idx_chats_user_id', 'idx_chats_agent_type', 'idx_chats_updated_at']}
                rlsPolicies={['chats_select_own', 'chats_insert_own', 'chats_update_own', 'chats_delete_own']}
              />
            </div>
          </div>

          {/* Relationships */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Table Relationships
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Relationship
                from="favorites"
                to="users"
                type="Many-to-One"
                description="Each favorite belongs to one user"
              />
              <Relationship
                from="favorites"
                to="apartments"
                type="Many-to-One"
                description="Each favorite references one apartment"
              />
              <Relationship
                from="appointments"
                to="users"
                type="Many-to-One"
                description="Each appointment belongs to one user"
              />
              <Relationship
                from="appointments"
                to="apartments"
                type="Many-to-One"
                description="Each appointment is for one apartment"
              />
              <Relationship
                from="messages"
                to="users"
                type="Many-to-One"
                description="Each message has sender and recipient users"
              />
              <Relationship
                from="chats"
                to="users"
                type="Many-to-One"
                description="Each chat belongs to one user"
              />
            </div>
          </div>

          {/* Features */}
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Database Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Feature
                icon="🔐"
                title="Row-Level Security"
                description="RLS policies protect data at the database level. Users can only access their own data."
              />
              <Feature
                icon="📍"
                title="Geospatial Queries"
                description="PostGIS extension enables location-based apartment searches using latitude/longitude."
              />
              <Feature
                icon="🔍"
                title="Optimized Indexes"
                description="Strategic indexes on frequently queried columns ensure fast search performance."
              />
              <Feature
                icon="🔄"
                title="Auto Timestamps"
                description="Triggers automatically update updated_at columns when records are modified."
              />
              <Feature
                icon="🗃️"
                title="JSON Storage"
                description="JSONB columns store flexible data like preferences, amenities, and chat messages."
              />
              <Feature
                icon="🔗"
                title="Foreign Keys"
                description="Referential integrity with CASCADE deletes maintains data consistency."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function Table({ name, color, primaryKey, columns, indexes, rlsPolicies }: {
  name: string;
  color: string;
  primaryKey: string;
  columns: string[];
  indexes: string[];
  rlsPolicies: string[];
}) {
  const colorClasses = {
    blue: 'bg-blue-100 border-blue-300 text-blue-900',
    green: 'bg-green-100 border-green-300 text-green-900',
    yellow: 'bg-yellow-100 border-yellow-300 text-yellow-900',
    purple: 'bg-purple-100 border-purple-300 text-purple-900',
    pink: 'bg-pink-100 border-pink-300 text-pink-900',
    indigo: 'bg-indigo-100 border-indigo-300 text-indigo-900',
  };

  return (
    <div className="border-2 rounded-lg overflow-hidden bg-white">
      <div className={`px-4 py-2 border-b-2 ${colorClasses[color as keyof typeof colorClasses] || 'bg-gray-100'}`}>
        <h3 className="font-bold font-mono text-sm">{name}</h3>
      </div>
      <div className="p-3">
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-600 mb-1">PRIMARY KEY</div>
          <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{primaryKey}</div>
        </div>
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-600 mb-1">COLUMNS</div>
          <div className="space-y-1">
            {columns.slice(0, 8).map((col, i) => (
              <div key={i} className="text-xs font-mono text-gray-700">
                {col}
              </div>
            ))}
            {columns.length > 8 && (
              <div className="text-xs text-gray-500 italic">
                +{columns.length - 8} more...
              </div>
            )}
          </div>
        </div>
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-600 mb-1">INDEXES</div>
          <div className="text-xs text-gray-600">{indexes.length} indexes</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">RLS POLICIES</div>
          <div className="text-xs text-gray-600">{rlsPolicies.length} policies</div>
        </div>
      </div>
    </div>
  );
}

function Relationship({ from, to, type, description }: {
  from: string;
  to: string;
  type: string;
  description: string;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-sm font-bold text-blue-600">{from}</span>
        <span className="text-gray-400">→</span>
        <span className="font-mono text-sm font-bold text-green-600">{to}</span>
      </div>
      <div className="text-xs text-gray-600 mb-1">{type}</div>
      <div className="text-xs text-gray-700">{description}</div>
    </div>
  );
}

function Feature({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-semibold text-sm text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  );
}
