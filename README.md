# AsanaBridge v2.2.1

**Connect Asana tasks to OmniFocus automatically**

AsanaBridge is a complete task synchronization system that bridges Asana and OmniFocus, allowing seamless bidirectional sync of tasks, projects, and due dates.

## 🚀 **What's New in v2.2.1**

This is a **major release** with complete architecture overhaul and **actual OmniFocus integration**! Previous versions were essentially non-functional - this release delivers the promised functionality.

### ✅ **Now Actually Works!**
- **Real OmniFocus Integration**: AppleScript-based task reading and creation
- **Bidirectional Sync**: Tasks flow between Asana and OmniFocus automatically  
- **Persistent Menu Bar**: Icon stays visible (fixed critical disappearing bug)
- **Professional Error Handling**: Helpful user dialogs instead of silent failures
- **Comprehensive Logging**: File-based logs for debugging and monitoring

## 🏗️ **Architecture**

### **Backend** (Node.js/Express/TypeScript)
- JWT-based authentication with refresh tokens
- PostgreSQL database with Prisma ORM  
- Rate limiting and security middleware
- Comprehensive API for sync operations
- Development/production environment switching

### **Frontend** (React/TypeScript)
- Modern dashboard interface
- Task management and sync monitoring
- User authentication and settings
- Built with Vite for fast development

### **macOS App** (Swift)
- Native menu bar application
- AppleScript integration with OmniFocus
- Direct in-app authentication 
- Real-time sync monitoring
- Professional error handling and logging

## 🔧 **Setup & Installation**

### **Prerequisites**
- Node.js 18+ and npm
- PostgreSQL database
- OmniFocus 3 (for macOS app)
- macOS 10.15+ (for desktop app)

### **Backend Setup**
```bash
# Clone and install dependencies
git clone https://github.com/rbradshaw9/asanabridge.git
cd asanabridge
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database and JWT settings

# Setup database
npm run db:generate
npm run db:push

# Start development server
npm run dev
```

### **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

### **macOS App**
- Download latest DMG from releases
- Install AsanaBridge.app
- Launch and authenticate with your account
- App will appear in menu bar with sync status

## 🔄 **How Sync Works**

1. **OmniFocus → Asana**: New OmniFocus tasks are created in Asana
2. **Asana → OmniFocus**: New Asana tasks are created in OmniFocus
3. **Project Mapping**: Tasks maintain project relationships
4. **Due Date Sync**: Due dates are synchronized bidirectionally
5. **Completion Status**: Completed tasks are marked in both systems

## �️ **Development**

### **Environment Configuration**
The Swift app automatically switches between development and production:

```swift
#if DEBUG
return "http://localhost:3000"  // Development
#else  
return "https://asanabridge.com"  // Production
#endif
```

Override with UserDefaults:
```bash
defaults write com.asanabridge.app AsanaBridgeBaseURL "http://localhost:8080"
```

### **Building macOS App**
```bash
cd omnifocus-agent
./build-unified-app.sh
```

### **API Endpoints**

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/validate` - Validate JWT token

#### Sync Operations
- `POST /api/sync/perform` - Trigger sync operation
- `POST /api/sync/report` - Report sync results
- `GET /api/sync/status` - Get sync status

#### App Support
- `GET /api/auth/app/version-check` - Check for app updates
- `POST /api/auth/app-login-direct` - Direct app authentication

## 📋 **Logging & Debugging**

### **Backend Logs**
- Winston-based logging to console and files
- Structured JSON logs with request IDs
- Error tracking and performance monitoring

### **macOS App Logs**
- File-based logging: `~/Library/Application Support/AsanaBridge/asanabridge.log`
- Automatic log rotation (>5MB)
- Debug/Info/Warning/Error levels
- AppleScript error capture

### **Log Levels**
```swift
logMessage("Info message")                    // INFO
logError("Error occurred", error: error)     // ERROR  
logDebug("Debug info")                       // DEBUG (dev only)
```

## 🔐 **Security**

- JWT tokens with configurable expiration
- bcrypt password hashing
- Rate limiting on all endpoints  
- CORS protection
- Helmet security headers
- Input validation with Zod schemas

## 📦 **Deployment**

### **Production Backend**
```bash
npm run build
npm start
```

### **Environment Variables**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=3000
```

### **macOS App Distribution**
- DMG files built automatically
- Code signing for distribution
- Notarization for macOS Gatekeeper

## 🐛 **Troubleshooting**

### **Menu Bar Icon Disappears**
- Fixed in v2.2.1! Update to latest version
- If still occurring, restart the app

### **OmniFocus Not Detected**
- Ensure OmniFocus 3 is installed and running
- Check System Preferences → Security & Privacy → Accessibility
- Grant permissions to AsanaBridge app

### **Authentication Issues**
- Check network connectivity
- Verify server is running (development)
- Check logs: `~/Library/Application Support/AsanaBridge/asanabridge.log`

### **Sync Not Working**
- Ensure both Asana and OmniFocus are accessible
- Check authentication status in app
- Review sync logs for specific errors

## 📝 **License**

MIT License - see LICENSE file for details.

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📧 **Support**

- GitHub Issues: [Create an issue](https://github.com/rbradshaw9/asanabridge/issues)
- Documentation: [Wiki](https://github.com/rbradshaw9/asanabridge/wiki)

---

**AsanaBridge v2.2.1** - Finally delivering the promised Asana ↔ OmniFocus sync! 🎉
