#!/bin/bash

# AsanaBridge Local Development Setup
# This script sets up the local development environment

echo "🚀 AsanaBridge Local Development Setup"

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm $(npm -v) found"

# Check Docker (optional for local development)
if command -v docker &> /dev/null; then
    echo "✅ Docker $(docker --version) found"
    DOCKER_AVAILABLE=true
else
    echo "⚠️  Docker not found - will provide PostgreSQL setup instructions"
    DOCKER_AVAILABLE=false
fi

echo ""
echo "🔧 Setting up project..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate

echo ""
echo "📝 Environment Configuration"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "✅ Created .env file - please edit it with your configuration"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🗄️  Database Setup"

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "Starting PostgreSQL with Docker..."
    docker compose up db -d
    
    # Wait for database to be ready
    echo "Waiting for database to start..."
    sleep 5
    
    # Run migrations
    echo "Running database migrations..."
    npx prisma migrate dev --name init
    
    echo "✅ Database setup complete"
else
    echo ""
    echo "📖 PostgreSQL Setup Instructions (manual):"
    echo ""
    echo "1. Install PostgreSQL locally:"
    echo "   - macOS: brew install postgresql"
    echo "   - Or download from: https://www.postgresql.org/download/"
    echo ""
    echo "2. Start PostgreSQL service"
    echo ""
    echo "3. Create database and user:"
    echo "   createdb asanabridge"
    echo "   psql -c \"CREATE USER asanabridge WITH PASSWORD 'asanabridge_pass';\""
    echo "   psql -c \"GRANT ALL PRIVILEGES ON DATABASE asanabridge TO asanabridge;\""
    echo ""
    echo "4. Update .env file with your database connection details"
    echo ""
    echo "5. Run migrations:"
    echo "   npx prisma migrate dev --name init"
    echo ""
fi

echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Edit .env file with your configuration:"
echo "   - Set JWT_SECRET to a secure random string (32+ characters)"
echo "   - Add Asana OAuth credentials (get from https://developers.asana.com/)"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Test the API:"
echo "   curl http://localhost:3000/health"
echo ""
echo "4. Set up OmniFocus agent (optional for testing):"
echo "   cd omnifocus-agent && npm install && npm run dev"
echo ""
echo "🌐 Access Points:"
echo "- API Server: http://localhost:3000"
echo "- Health Check: http://localhost:3000/health"
echo "- API Status: http://localhost:3000/api/status"

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "- Database Admin: http://localhost:8080 (adminer)"
fi

echo ""
echo "📚 Documentation:"
echo "- API Docs: See README.md"
echo "- Database Schema: See prisma/schema.prisma"
echo "- OmniFocus Agent: See omnifocus-agent/README.md"
echo ""
echo "✅ Setup complete! Happy coding! 🎉"