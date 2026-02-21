'use client';

export default function SchemaDocs() {
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      minHeight: '100vh',
      lineHeight: 1.6
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <h1 style={{
          color: '#2d3748',
          fontSize: '2.5rem',
          marginBottom: '10px',
          textAlign: 'center'
        }}>
          LA Rent Finder
          <span style={{
            display: 'inline-block',
            background: '#48bb78',
            color: 'white',
            padding: '5px 15px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            marginLeft: '10px'
          }}>✓ READY</span>
        </h1>
        <p style={{
          textAlign: 'center',
          color: '#718096',
          fontSize: '1.1rem',
          marginBottom: '30px'
        }}>
          Supabase Database Schema - Implementation Complete
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {[
            { value: '10', label: 'Database Tables' },
            { value: '3', label: 'Extensions Enabled' },
            { value: '50+', label: 'Indexes Created' },
            { value: '100%', label: 'RLS Protected' }
          ].map((stat) => (
            <div key={stat.label} style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ fontSize: '2rem', marginBottom: '5px' }}>{stat.value}</h3>
              <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '40px' }}>
          <h2 style={{
            color: '#2d3748',
            fontSize: '1.8rem',
            marginBottom: '20px',
            paddingBottom: '10px',
            borderBottom: '3px solid #667eea'
          }}>
            <span style={{ color: '#48bb78', fontWeight: 'bold', fontSize: '1.5rem', marginRight: '5px' }}>✓</span>
            Database Extensions
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {[
              {
                name: 'uuid-ossp',
                description: 'Provides functions to generate universally unique identifiers (UUIDs). Used for primary keys across all tables.'
              },
              {
                name: 'PostGIS',
                description: 'Geospatial database extension. Enables location-based queries, distance calculations, and radius searches for apartments.'
              },
              {
                name: 'pg_trgm',
                description: 'Trigram-based text search. Enables fuzzy matching for apartment titles, descriptions, and addresses.'
              }
            ].map((ext) => (
              <div key={ext.name} style={{
                background: '#f7fafc',
                border: '2px solid #667eea',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h3 style={{ color: '#667eea', fontSize: '1.3rem', marginBottom: '10px' }}>{ext.name}</h3>
                <p style={{ color: '#4a5568', fontSize: '0.9rem' }}>{ext.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <h2 style={{
            color: '#2d3748',
            fontSize: '1.8rem',
            marginBottom: '20px',
            paddingBottom: '10px',
            borderBottom: '3px solid #667eea'
          }}>
            <span style={{ color: '#48bb78', fontWeight: 'bold', fontSize: '1.5rem', marginRight: '5px' }}>✓</span>
            Database Tables (10)
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {[
              {
                name: 'users',
                description: 'User account information and authentication data',
                columns: 9,
                indexes: 3,
                rls: 'Enabled',
                special: 'Triggers: updated_at'
              },
              {
                name: 'user_preferences',
                description: 'Structured user search preferences and filters',
                columns: 19,
                indexes: 3,
                rls: 'Enabled',
                special: 'FK: users'
              },
              {
                name: 'apartments',
                description: 'Rental property listings with photos and location',
                columns: 23,
                indexes: '8 + GIST',
                rls: 'Public Read',
                special: 'Geospatial'
              },
              {
                name: 'favorites',
                description: 'User saved/favorited apartment listings',
                columns: 4,
                indexes: 3,
                rls: 'User Only',
                special: 'FK: users, apartments'
              },
              {
                name: 'appointments',
                description: 'Viewing appointments for apartments',
                columns: 9,
                indexes: 5,
                rls: 'User Only',
                special: 'FK: users, apartments'
              },
              {
                name: 'messages',
                description: 'Direct messages between users',
                columns: 8,
                indexes: 5,
                rls: 'Sender/Recipient',
                special: 'FK: sender, recipient'
              },
              {
                name: 'chats',
                description: 'AI agent conversation history and context',
                columns: 8,
                indexes: 4,
                rls: 'User Only',
                special: 'FK: users'
              },
              {
                name: 'searches',
                description: 'User search query history and parameters',
                columns: 6,
                indexes: '3 + GIN',
                rls: 'User Only',
                special: 'Full-text'
              },
              {
                name: 'listing_scores',
                description: 'AI-generated scores for listings vs preferences',
                columns: 15,
                indexes: 5,
                rls: 'User Only',
                special: 'FK: listings, users'
              },
              {
                name: 'cost_estimates',
                description: 'Move-in and monthly cost breakdowns',
                columns: 23,
                indexes: 4,
                rls: 'User Only',
                special: 'FK: users, apartments'
              }
            ].map((table) => (
              <div key={table.name} style={{
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '15px',
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }}>
                  {table.name}
                </div>
                <div style={{
                  padding: '15px',
                  background: '#f7fafc',
                  fontSize: '0.9rem',
                  color: '#4a5568',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  {table.description}
                </div>
                <div style={{
                  padding: '15px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px'
                }}>
                  <div style={{ fontSize: '0.85rem', color: '#4a5568' }}>
                    <strong style={{ color: '#2d3748' }}>Columns:</strong> {table.columns}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#4a5568' }}>
                    <strong style={{ color: '#2d3748' }}>Indexes:</strong> {table.indexes}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#4a5568' }}>
                    <strong style={{ color: '#2d3748' }}>RLS:</strong> {table.rls}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#4a5568' }}>
                    <strong style={{ color: '#2d3748' }}>Special:</strong> {table.special}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '2px solid #e2e8f0',
          color: '#718096'
        }}>
          <p><strong>Implementation Status:</strong> Complete ✓</p>
          <p>Schema Version: 2 | Last Updated: 2026-02-11</p>
          <p>Migration Files: 2 | TypeScript Types: Generated</p>
        </div>
      </div>
    </div>
  );
}
