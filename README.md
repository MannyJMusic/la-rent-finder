# LA Rent Finder

A comprehensive rental property search and management application for Los Angeles, built with modern web technologies and AI-powered features.

## Project Overview

LA Rent Finder is a full-stack web application that helps users discover, compare, and manage rental properties across Los Angeles. The platform leverages AI capabilities through MCP (Model Context Protocol) servers to provide intelligent recommendations, automated analysis, and enhanced user experiences.

## Architecture Overview

The application follows a modern full-stack architecture:

- **Frontend**: Next.js 14+ with TypeScript for type-safe React components
- **UI Components**: Shadcn/ui and Tailwind CSS for consistent, responsive design
- **Backend**: Next.js API routes with Supabase for database and authentication
- **Maps**: Mapbox integration for interactive property location visualization
- **AI Integration**: MCP servers for intelligent features and data processing
- **Database**: Supabase PostgreSQL with real-time capabilities
- **Authentication**: Supabase Auth for user management

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Component Library**: Shadcn/ui
- **State Management**: React hooks + Supabase client

### Backend & Database
- **API**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions

### Maps & Location
- **Mapping Library**: Mapbox GL JS
- **Geocoding**: Mapbox Geocoding API

### AI & MCP
- **MCP Servers**: Multiple MCP implementations for:
  - Rental property analysis
  - Market insights
  - Price predictions
  - Recommendation engine

### Development & Deployment
- **Package Manager**: npm
- **Version Control**: Git
- **Environment Management**: .env.local for local development

## Features

- **Property Search**: Filter and search rental properties by location, price, amenities
- **Interactive Maps**: Visualize properties on an interactive Mapbox map
- **Property Details**: Comprehensive information including photos, amenities, pricing
- **Saved Listings**: Save favorite properties for later review
- **AI Recommendations**: Get AI-powered property recommendations based on preferences
- **Market Analysis**: View rental market trends and insights for Los Angeles neighborhoods
- **User Authentication**: Secure user accounts with Supabase Auth
- **Real-time Updates**: Live property availability and price updates

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm or yarn
- Git
- Supabase account
- Mapbox API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd la-rent-finder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `NEXT_PUBLIC_MAPBOX_TOKEN`: Your Mapbox public token
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

4. Set up MCP servers:
- Configure your MCP server connections in the application configuration
- Ensure all required MCP servers are accessible

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## Project Structure

```
src/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/             # Utility functions and helpers
├── types/           # TypeScript type definitions
├── pages/           # API routes and pages
└── styles/          # Global styles
```

## Database Schema

The application uses Supabase PostgreSQL with the following main tables:
- `users`: User profiles and authentication
- `properties`: Rental property listings
- `favorites`: User's saved/favorite properties
- `search_history`: User search history for recommendations

## API Endpoints

### Public Endpoints
- `GET /api/properties` - Search properties
- `GET /api/properties/:id` - Get property details
- `GET /api/neighborhoods` - Get neighborhood information

### Authenticated Endpoints
- `POST /api/favorites` - Add property to favorites
- `DELETE /api/favorites/:id` - Remove from favorites
- `GET /api/user/favorites` - Get user's saved properties
- `GET /api/user/recommendations` - Get AI recommendations

## MCP Integration

The application integrates with multiple MCP servers for advanced features:
- Property analysis and validation
- Market trend analysis
- Price prediction models
- Recommendation algorithms

## Contributing

1. Create a feature branch: `git checkout -b feature/feature-name`
2. Make your changes and commit: `git commit -m "feat: description"`
3. Push to the branch: `git push origin feature/feature-name`
4. Submit a pull request

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push to main

### Docker

```bash
docker build -t la-rent-finder .
docker run -p 3000:3000 la-rent-finder
```

## Environment Variables

Required environment variables for development:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
SUPABASE_SERVICE_ROLE_KEY=
```

## Security

- All sensitive keys are stored in environment variables
- Supabase Row Level Security (RLS) policies protect user data
- API routes validate user authentication before processing
- Mapbox token is public (scoped and restricted)

## Performance

- Next.js static site generation for fast page loads
- Image optimization with Next.js Image component
- Mapbox tile caching for map performance
- Database query optimization with indexes

## Support & Contact

For issues, feature requests, or contributions, please use the GitHub issues and pull request system.

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Roadmap

- Mobile app version (React Native)
- Advanced filtering and saved searches
- Price alert notifications
- Neighborhood comparison tools
- Virtual tours integration
- Machine learning price predictions
- Landlord review system
