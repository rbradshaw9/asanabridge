import Cocoa
import Foundation
import Network

class AsanaBridgeApp: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem?
    var mainWindow: NSWindow?
    var setupWindow: NSWindow?
    var localServer: HTTPServer?
    var apiClient: AsanaBridgeAPIClient?
    
    // App state
    var isSetupComplete: Bool = false
    var userToken: String?
    var omniFocusConnected: Bool = false
    var asanaConnected: Bool = false
    
    // Authentication state
    var isAwaitingAuthentication: Bool = false
    var authSessionId: String?
    
    enum ConnectionStatus {
        case connecting, connected, disconnected, error
        
        var icon: String {
            switch self {
            case .connected: return "✅"
            case .connecting: return "🔄"
            case .disconnected: return "❌"
            case .error: return "⚠️"
            }
        }
        
        var title: String {
            switch self {
            case .connected: return "Connected"
            case .connecting: return "Connecting..."
            case .disconnected: return "Disconnected"
            case .error: return "Error"
            }
        }
    }
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        print("🚀 AsanaBridge app launching...")
        
        NSApp.setActivationPolicy(.accessory) // Menu bar only, no dock icon
        
        setupMainMenu()
        setupMenuBar()
        
        print("✅ AsanaBridge setup complete, showing setup wizard...")
        
        // Always show the setup wizard for now - keep it simple
        showSetupWizard()
    }
    
    func setupMainMenu() {
        let mainMenu = NSMenu()
        
        // App menu
        let appMenuItem = NSMenuItem()
        let appMenu = NSMenu(title: "AsanaBridge")
        
        appMenu.addItem(NSMenuItem(title: "About AsanaBridge", action: #selector(showAbout), keyEquivalent: ""))
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(NSMenuItem(title: "Preferences...", action: #selector(showPreferences), keyEquivalent: ","))
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(NSMenuItem(title: "Quit AsanaBridge", action: #selector(quitApp), keyEquivalent: "q"))
        
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)
        
        NSApp.mainMenu = mainMenu
    }
    
    func setupMenuBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        
        if let button = statusItem?.button {
            button.title = "🔄 AsanaBridge"
            button.toolTip = "AsanaBridge - Connecting Asana to OmniFocus"
            button.action = #selector(statusItemClicked)
            button.target = self
            button.sendAction(on: [.leftMouseUp, .rightMouseUp])
        }
        
        // Create context menu for right-click
        let contextMenu = NSMenu()
        contextMenu.addItem(NSMenuItem(title: "Open AsanaBridge", action: #selector(statusItemClicked), keyEquivalent: ""))
        contextMenu.addItem(NSMenuItem.separator())
        contextMenu.addItem(NSMenuItem(title: "About AsanaBridge", action: #selector(showAbout), keyEquivalent: ""))
        contextMenu.addItem(NSMenuItem(title: "Preferences...", action: #selector(showPreferences), keyEquivalent: ""))
        contextMenu.addItem(NSMenuItem.separator())
        contextMenu.addItem(NSMenuItem(title: "Quit AsanaBridge", action: #selector(quitApp), keyEquivalent: ""))
        
        statusItem?.menu = contextMenu
    }
    
    @objc func statusItemClicked() {
        // For left-click, show the app. Right-click will show context menu automatically
        let event = NSApp.currentEvent
        if event?.type == .rightMouseUp {
            // Right click - context menu will show automatically
            return
        }
        
        // Left click - show main interface
        if !isSetupComplete {
            showSetupWizard()
        } else {
            showMainWindow()
        }
    }
    
    func updateStatusBarTitle(_ title: String) {
        DispatchQueue.main.async {
            if let button = self.statusItem?.button {
                button.title = title
            }
        }
    }
    
    func checkSetupStatus() {
        // Check if user has completed setup
        let defaults = UserDefaults.standard
        isSetupComplete = defaults.bool(forKey: "setupComplete")
        userToken = defaults.string(forKey: "userToken")
        
        if isSetupComplete && userToken != nil {
            apiClient = AsanaBridgeAPIClient(token: userToken!, agentKey: "simple")
            asanaConnected = true
        }
    }
    
    func showSetupWizard() {
        if setupWindow?.isVisible == true {
            setupWindow?.makeKeyAndOrderFront(nil)
            return
        }
        
        let windowRect = NSRect(x: 0, y: 0, width: 600, height: 700)
        setupWindow = NSWindow(
            contentRect: windowRect,
            styleMask: [.titled, .closable, .resizable],
            backing: .buffered,
            defer: false
        )
        
        setupWindow?.title = "AsanaBridge Setup"
        setupWindow?.center()
        setupWindow?.level = .normal
        
        let setupView = createSetupView()
        setupWindow?.contentView = setupView
        
        setupWindow?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
    
    func createSetupView() -> NSView {
        let containerView = NSView(frame: NSRect(x: 0, y: 0, width: 600, height: 700))
        
        // Header
        let headerLabel = NSTextField(labelWithString: "Welcome to AsanaBridge")
        headerLabel.font = NSFont.boldSystemFont(ofSize: 24)
        headerLabel.frame = NSRect(x: 50, y: 620, width: 500, height: 40)
        headerLabel.alignment = .center
        containerView.addSubview(headerLabel)
        
        // Subtitle
        let subtitleLabel = NSTextField(labelWithString: "Connect Asana tasks to OmniFocus automatically")
        subtitleLabel.font = NSFont.systemFont(ofSize: 16)
        subtitleLabel.textColor = .secondaryLabelColor
        subtitleLabel.frame = NSRect(x: 50, y: 590, width: 500, height: 25)
        subtitleLabel.alignment = .center
        containerView.addSubview(subtitleLabel)
        
        // Step 1: OmniFocus Status (Automatic Check)
        var yPos = 520
        addSetupStep(to: containerView, step: "1", title: "OmniFocus Status", 
                    description: "Checking OmniFocus installation automatically...", yPos: &yPos)
        
        // Status indicator for OmniFocus
        let omniFocusStatusView = createStatusIndicator(yPos: yPos + 15)
        containerView.addSubview(omniFocusStatusView)
        
        yPos -= 80
        
        // Step 2: AsanaBridge Connection Status
        addSetupStep(to: containerView, step: "2", title: "AsanaBridge Connection", 
                    description: "Your authentication status", yPos: &yPos)
        
        // Status indicator for AsanaBridge
        let asanaStatusView = createAsanaStatusIndicator(yPos: yPos + 15)
        containerView.addSubview(asanaStatusView)
        
        // Connect button only shows if not authenticated
        if !asanaConnected {
            let connectButton = NSButton(title: "Connect to AsanaBridge", target: self, action: #selector(connectToAsanaBridge))
            connectButton.frame = NSRect(x: 200, y: yPos - 20, width: 200, height: 36)
            connectButton.bezelStyle = .rounded
            connectButton.font = NSFont.systemFont(ofSize: 14, weight: .medium)
            connectButton.keyEquivalent = "\\r" // Make it the default button
            containerView.addSubview(connectButton)
        }
        
        yPos -= 100
        
        // That's it! No complex setup needed
        
        return containerView
    }
    
    func addSetupStep(to view: NSView, step: String, title: String, description: String, yPos: inout Int) {
        // Step number circle
        let stepCircle = NSTextField(labelWithString: step)
        stepCircle.font = NSFont.boldSystemFont(ofSize: 18)
        stepCircle.textColor = .white
        stepCircle.backgroundColor = .systemBlue
        stepCircle.isBezeled = false
        stepCircle.isEditable = false
        stepCircle.alignment = .center
        stepCircle.frame = NSRect(x: 50, y: yPos, width: 40, height: 40)
        stepCircle.wantsLayer = true
        stepCircle.layer?.cornerRadius = 20
        view.addSubview(stepCircle)
        
        // Title
        let titleLabel = NSTextField(labelWithString: title)
        titleLabel.font = NSFont.boldSystemFont(ofSize: 16)
        titleLabel.frame = NSRect(x: 110, y: yPos + 15, width: 400, height: 20)
        view.addSubview(titleLabel)
        
        // Description
        let descLabel = NSTextField(labelWithString: description)
        descLabel.font = NSFont.systemFont(ofSize: 13)
        descLabel.textColor = .secondaryLabelColor
        descLabel.frame = NSRect(x: 110, y: yPos - 5, width: 400, height: 20)
        view.addSubview(descLabel)
        
        yPos -= 20
    }
    
    func createStatusIndicator(yPos: Int) -> NSView {
        let statusView = NSView(frame: NSRect(x: 80, y: yPos, width: 440, height: 35))
        
        // Check OmniFocus status
        let isInstalled = isOmniFocusInstalled()
        let isRunning = isOmniFocusRunning()
        
        // Status circle - larger and better positioned
        let circle = NSView(frame: NSRect(x: 0, y: 10, width: 16, height: 16))
        circle.wantsLayer = true
        circle.layer?.cornerRadius = 8
        circle.layer?.borderWidth = 0.5
        circle.layer?.borderColor = NSColor.separatorColor.cgColor
        
        // Status text - better typography
        let statusLabel = NSTextField(labelWithString: "")
        statusLabel.font = NSFont.systemFont(ofSize: 14, weight: .medium)
        statusLabel.frame = NSRect(x: 25, y: 7, width: 410, height: 22)
        statusLabel.isBezeled = false
        statusLabel.isEditable = false
        statusLabel.backgroundColor = .clear
        statusLabel.alignment = .left
        
        if !isInstalled {
            circle.layer?.backgroundColor = NSColor.systemRed.cgColor
            statusLabel.stringValue = "❌ OmniFocus not installed"
            statusLabel.textColor = .systemRed
        } else if !isRunning {
            circle.layer?.backgroundColor = NSColor.systemYellow.cgColor
            statusLabel.stringValue = "⚠️ OmniFocus installed (not running)"
            statusLabel.textColor = .systemYellow
        } else {
            circle.layer?.backgroundColor = NSColor.systemGreen.cgColor
            statusLabel.stringValue = "✅ OmniFocus connected"
            statusLabel.textColor = .systemGreen
            omniFocusConnected = true
        }
        
        statusView.addSubview(circle)
        statusView.addSubview(statusLabel)
        
        return statusView
    }
    
    func createAsanaStatusIndicator(yPos: Int) -> NSView {
        let statusView = NSView(frame: NSRect(x: 80, y: yPos, width: 440, height: 35))
        
        // Status circle - larger and better positioned
        let circle = NSView(frame: NSRect(x: 0, y: 10, width: 16, height: 16))
        circle.wantsLayer = true
        circle.layer?.cornerRadius = 8
        circle.layer?.borderWidth = 0.5
        circle.layer?.borderColor = NSColor.separatorColor.cgColor
        
        // Status text - better typography
        let statusLabel = NSTextField(labelWithString: "")
        statusLabel.font = NSFont.systemFont(ofSize: 14, weight: .medium)
        statusLabel.frame = NSRect(x: 25, y: 7, width: 410, height: 22)
        statusLabel.isBezeled = false
        statusLabel.isEditable = false
        statusLabel.backgroundColor = .clear
        statusLabel.alignment = .left
        
        if asanaConnected && userToken != nil {
            circle.layer?.backgroundColor = NSColor.systemGreen.cgColor
            statusLabel.stringValue = "✅ Connected to AsanaBridge"
            statusLabel.textColor = .systemGreen
        } else {
            circle.layer?.backgroundColor = NSColor.systemGray.cgColor
            statusLabel.stringValue = "⚪ Not connected"
            statusLabel.textColor = .secondaryLabelColor
        }
        
        statusView.addSubview(circle)
        statusView.addSubview(statusLabel)
        
        return statusView
    }
    
    @objc func testOmniFocus() {
        // Test OmniFocus connection with better feedback
        DispatchQueue.global().async {
            DispatchQueue.main.async {
                // Debug: Print detection info
                print("🔍 OmniFocus Detection Debug:")
                print("   - Installed: \(self.isOmniFocusInstalled())")
                print("   - Running: \(self.isOmniFocusRunning())")
                
                // Check if OmniFocus is installed first
                if !self.isOmniFocusInstalled() {
                    let alert = NSAlert()
                    alert.messageText = "OmniFocus Not Installed"
                    alert.informativeText = "OmniFocus 3 is required for AsanaBridge to work. Please install OmniFocus 3 from the App Store or OmniGroup website."
                    alert.addButton(withTitle: "Open App Store")
                    alert.addButton(withTitle: "Visit OmniGroup")
                    alert.addButton(withTitle: "Cancel")
                    
                    let response = alert.runModal()
                    if response == .alertFirstButtonReturn {
                        NSWorkspace.shared.open(URL(string: "https://apps.apple.com/app/omnifocus-3/id1346203938")!)
                    } else if response == .alertSecondButtonReturn {
                        NSWorkspace.shared.open(URL(string: "https://www.omnigroup.com/omnifocus")!)
                    }
                    return
                }
                
                // Check if OmniFocus is running
                if self.isOmniFocusRunning() {
                    // Test AppleScript connection
                    let result = self.connectToOmniFocus()
                    if result {
                        self.showAlert(title: "✅ OmniFocus Connected", message: "Great! OmniFocus is running and responding. You're ready to sync tasks!")
                        self.omniFocusConnected = true
                    } else {
                        self.showAlert(title: "⚠️ Connection Issue", message: "OmniFocus is running but not responding to AppleScript. Try restarting OmniFocus or check your privacy settings.")
                    }
                } else {
                    // OmniFocus is installed but not running
                    let alert = NSAlert()
                    alert.messageText = "Launch OmniFocus?"
                    alert.informativeText = "OmniFocus 3 is installed but not currently running. Would you like me to launch it for you?"
                    alert.addButton(withTitle: "Launch OmniFocus")
                    alert.addButton(withTitle: "I'll open it myself")
                    
                    let response = alert.runModal()
                    if response == .alertFirstButtonReturn {
                        self.launchOmniFocus()
                    }
                }
            }
        }
    }
    
    func isOmniFocusRunning() -> Bool {
        let runningApps = NSWorkspace.shared.runningApplications
        
        // Debug: Print all running apps with "omni" in their name
        let omniApps = runningApps.filter { app in
            app.bundleIdentifier?.lowercased().contains("omni") == true ||
            app.localizedName?.lowercased().contains("omnifocus") == true
        }
        print("🔍 Found Omni apps: \(omniApps.map { "\($0.localizedName ?? "Unknown") (\($0.bundleIdentifier ?? "No ID"))" })")
        
        return runningApps.contains { app in
            app.bundleIdentifier == "com.omnigroup.OmniFocus3" ||
            app.bundleIdentifier == "com.omnigroup.OmniFocus3.MacAppStore"
        }
    }
    
    func isOmniFocusInstalled() -> Bool {
        let appPaths = [
            "/Applications/OmniFocus.app",
            "/Applications/OmniFocus 3.app",
            "/Applications/OmniFocus.localized/OmniFocus.app",
            NSHomeDirectory() + "/Applications/OmniFocus.app",
            NSHomeDirectory() + "/Applications/OmniFocus 3.app"
        ]
        
        return appPaths.contains { path in
            FileManager.default.fileExists(atPath: path)
        }
    }
    
    func connectToOmniFocus() -> Bool {
        // First check if OmniFocus is installed
        guard isOmniFocusInstalled() else {
            return false
        }
        
        // If it's running, test AppleScript connection
        if isOmniFocusRunning() {
            do {
                let task = Process()
                task.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
                // Try "OmniFocus" first, then "OmniFocus 3" for compatibility
                task.arguments = ["-e", "try\n    tell application \"OmniFocus\" to get version\non error\n    tell application \"OmniFocus 3\" to get version\nend try"]
                
                let pipe = Pipe()
                task.standardOutput = pipe
                task.standardError = pipe
                
                try task.run()
                task.waitUntilExit()
                
                return task.terminationStatus == 0
            } catch {
                return false
            }
        }
        
        return false
    }
    
    func launchOmniFocus() {
        do {
            let task = Process()
            task.executableURL = URL(fileURLWithPath: "/usr/bin/open")
            // Try to open OmniFocus (works for both OmniFocus.app and OmniFocus 3.app)
            task.arguments = ["-a", "OmniFocus"]
            
            try task.run()
            
            // Show launching feedback
            updateStatusBarTitle("🚀 Launching OmniFocus...")
            
            // Wait a moment then test connection
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                if self.connectToOmniFocus() {
                    self.showAlert(title: "✅ OmniFocus Ready", message: "OmniFocus has been launched and is ready to sync tasks!")
                    self.omniFocusConnected = true
                    self.updateStatusBarTitle("✅ AsanaBridge")
                } else {
                    self.showAlert(title: "⚠️ Launch Issue", message: "OmniFocus was launched but may need a moment to fully start. Please try testing the connection again in a few seconds.")
                    self.updateStatusBarTitle("⚠️ AsanaBridge")
                }
            }
        } catch {
            showAlert(title: "❌ Launch Failed", message: "Could not launch OmniFocus automatically. Please open OmniFocus 3 manually from your Applications folder.")
            updateStatusBarTitle("❌ AsanaBridge")
        }
    }
    
    @objc func connectToAsanaBridge() {
        // Ensure UI operations run on main thread
        DispatchQueue.main.async {
            self.startSimplePollingAuth()
        }
    }
    
    func startSimplePollingAuth() {
        let alert = NSAlert()
        alert.messageText = "🚀 Connect to AsanaBridge"
        alert.informativeText = """
        Ready to connect your AsanaBridge account?
        
        This will open your browser where you can:
        • Sign in to AsanaBridge
        • Authorize this app
        • Start syncing automatically!
        """
        
        alert.addButton(withTitle: "Connect Now")
        alert.addButton(withTitle: "Cancel")
        
        let response = alert.runModal()
        
        if response == .alertFirstButtonReturn {
            createAuthSessionAndPoll()
        }
    }
    
    func createAuthSessionAndPoll() {
        updateStatusBarTitle("🔄 Connecting...")
        
        // Create auth session
        guard let url = URL(string: "https://asanabridge.com/api/auth/app-session") else {
            showAlert(title: "Error", message: "Could not connect to AsanaBridge.")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if error != nil {
                    self.showAlert(title: "Connection Error", message: "Could not connect to AsanaBridge. Please check your internet connection.")
                    self.updateStatusBarTitle("❌ AsanaBridge")
                    return
                }
                
                guard let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let sessionId = json["sessionId"] as? String,
                      let authUrl = json["authUrl"] as? String else {
                    self.showAlert(title: "Error", message: "Invalid response from AsanaBridge.")
                    self.updateStatusBarTitle("❌ AsanaBridge")
                    return
                }
                
                // Store session ID and open browser
                self.authSessionId = sessionId
                
                if let url = URL(string: authUrl) {
                    NSWorkspace.shared.open(url)
                    self.showConnectingDialog(sessionId: sessionId)
                    self.startPollingForAuth(sessionId: sessionId)
                }
            }
        }.resume()
    }
    
    func showConnectingDialog(sessionId: String) {
        // Ensure UI operations happen on main thread
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "🌐 Sign In to AsanaBridge"
            alert.informativeText = """
            A browser window should have opened.
            
            Please:
            1. Sign in to your AsanaBridge account
            2. Click "Authorize App"
            3. This app will connect automatically!
            
            Waiting for authorization...
            """
            
            alert.addButton(withTitle: "I'm done - check now")
            alert.addButton(withTitle: "Open browser again")
            alert.addButton(withTitle: "Cancel")
            
            // Show as informational
            alert.alertStyle = .informational
            
            let response = alert.runModal()
            
            if response == .alertSecondButtonReturn {
                // Re-open browser
                let authUrl = "https://asanabridge.com/api/auth/app-login?session=\\(sessionId)"
                if let url = URL(string: authUrl) {
                    NSWorkspace.shared.open(url)
                }
                self.showConnectingDialog(sessionId: sessionId)
            } else if response == .alertThirdButtonReturn {
                // Cancel
                self.isAwaitingAuthentication = false
                self.updateStatusBarTitle("❌ AsanaBridge")
            }
        }
    }
    
    func startPollingForAuth(sessionId: String) {
        isAwaitingAuthentication = true
        
        Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { timer in
            if !self.isAwaitingAuthentication {
                timer.invalidate()
                return
            }
            
            self.checkAuthStatus(sessionId: sessionId) { success, token in
                if success {
                    timer.invalidate()
                    self.isAwaitingAuthentication = false
                    self.userToken = token
                    UserDefaults.standard.set(token, forKey: "userToken")
                    self.asanaConnected = true
                    self.updateStatusBarTitle("✅ AsanaBridge")
                    
                    DispatchQueue.main.async {
                        // Auto-complete setup when connected
                        UserDefaults.standard.set(true, forKey: "setupComplete")
                        self.isSetupComplete = true
                        self.setupWindow?.close()
                        
                        self.showAlert(title: "🎉 Setup Complete!", 
                                     message: "AsanaBridge is connected and ready! Your tasks will sync automatically between Asana and OmniFocus.")
                        
                        // Start the bridge service
                        self.startAsanaBridge()
                    }
                }
            }
        }
        
        // Stop polling after 5 minutes
        DispatchQueue.main.asyncAfter(deadline: .now() + 300) {
            if self.isAwaitingAuthentication {
                self.isAwaitingAuthentication = false
                self.updateStatusBarTitle("❌ AsanaBridge")
                self.showAlert(title: "Timeout", message: "Authorization timed out. Please try again.")
            }
        }
    }
    
    func checkAuthStatus(sessionId: String, completion: @escaping (Bool, String?) -> Void) {
        guard let url = URL(string: "https://asanabridge.com/api/auth/app-session?session=\\(sessionId)") else {
            completion(false, nil)
            return
        }
        
        URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                completion(false, nil)
                return
            }
            
            let authorized = json["authorized"] as? Bool ?? false
            let token = json["token"] as? String
            
            completion(authorized, token)
        }.resume()
    }
    
    func handleAuthenticationCallback(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let queryItems = components.queryItems else {
            showAlert(title: "Authentication Error", message: "Invalid authentication response received.")
            return
        }
        
        var token: String?
        var sessionId: String?
        
        for item in queryItems {
            switch item.name {
            case "token":
                token = item.value
            case "session":
                sessionId = item.value
            default:
                break
            }
        }
        
        guard let authToken = token,
              let session = sessionId,
              session == authSessionId else {
            showAlert(title: "Authentication Error", message: "Invalid or expired authentication session.")
            return
        }
        
        // Success! Store the token and complete authentication
        userToken = authToken
        UserDefaults.standard.set(authToken, forKey: "userToken")
        asanaConnected = true
        isAwaitingAuthentication = false
        authSessionId = nil
        
        updateStatusBarTitle("✅ AsanaBridge")
        
        DispatchQueue.main.async {
            self.showAlert(title: "🎉 Authentication Successful!", 
                         message: "AsanaBridge is now connected to your account. Your tasks will sync automatically!")
        }
    }
    
    func showAuthenticationFlow() {
        let alert = NSAlert()
        alert.messageText = "🚀 Activate AsanaBridge"
        alert.informativeText = """
        Ready to connect AsanaBridge to your account?
        
        This will:
        • Open your browser to asanabridge.com
        • Let you sign in securely
        • Automatically connect this app
        • No copying and pasting required!
        """
        
        alert.addButton(withTitle: "Activate AsanaBridge")
        alert.addButton(withTitle: "Manual Setup")
        alert.addButton(withTitle: "Cancel")
        
        let response = alert.runModal()
        
        if response == .alertFirstButtonReturn {
            // One-click activation
            startSeamlessAuthentication()
        } else if response == .alertSecondButtonReturn {
            // Fallback to manual token entry
            showManualTokenEntry()
        }
    }
    
    func startSeamlessAuthentication() {
        // Generate unique session ID
        authSessionId = UUID().uuidString
        isAwaitingAuthentication = true
        
        updateStatusBarTitle("🔄 Authenticating...")
        
        // Open browser with authentication URL that includes return scheme
        let authURL = "https://asanabridge.com/auth/app?return_to=asanabridge://auth&session=\(authSessionId!)"
        
        guard let url = URL(string: authURL) else {
            showAlert(title: "Error", message: "Could not create authentication URL.")
            return
        }
        
        NSWorkspace.shared.open(url)
        
        // Show waiting dialog
        showAuthenticationWaitingDialog()
    }
    
    func showAuthenticationWaitingDialog() {
        let alert = NSAlert()
        alert.messageText = "🌐 Sign In to AsanaBridge"
        alert.informativeText = """
        Your browser should have opened to asanabridge.com.
        
        Please:
        1. Sign in to your AsanaBridge account
        2. Complete the authorization
        3. This app will connect automatically!
        
        If your browser didn't open, click "Open Browser" below.
        """
        
        alert.addButton(withTitle: "I'm signed in - waiting...")
        alert.addButton(withTitle: "Open Browser")
        alert.addButton(withTitle: "Cancel")
        
        // Set as informational (non-blocking)
        alert.alertStyle = .informational
        
        DispatchQueue.main.async {
            let response = alert.runModal()
            
            if response == .alertSecondButtonReturn {
                // Re-open browser
                let authURL = "https://asanabridge.com/auth/app?return_to=asanabridge://auth&session=\(self.authSessionId!)"
                if let url = URL(string: authURL) {
                    NSWorkspace.shared.open(url)
                }
                
                // Show waiting dialog again
                if self.isAwaitingAuthentication {
                    self.showAuthenticationWaitingDialog()
                }
            } else if response == .alertThirdButtonReturn {
                // Cancel authentication
                self.isAwaitingAuthentication = false
                self.authSessionId = nil
                self.updateStatusBarTitle("❌ AsanaBridge")
            }
            // For first button, just dismiss and continue waiting
        }
    }
    
    func showManualTokenEntry() {
        let alert = NSAlert()
        alert.messageText = "🔑 Manual Token Setup"
        alert.informativeText = """
        For advanced users:
        1. Visit asanabridge.com/tokens
        2. Generate a new API token
        3. Copy and paste it below
        
        Enter your API token:
        """
        
        // Use NSTextView for better paste support
        let scrollView = NSScrollView(frame: NSRect(x: 0, y: 0, width: 350, height: 60))
        let textView = NSTextView(frame: scrollView.bounds)
        textView.string = ""
        textView.font = NSFont.systemFont(ofSize: 13)
        textView.isRichText = false
        textView.isAutomaticSpellingCorrectionEnabled = false
        textView.isAutomaticQuoteSubstitutionEnabled = false
        scrollView.documentView = textView
        scrollView.hasVerticalScroller = true
        
        alert.accessoryView = scrollView
        alert.addButton(withTitle: "Connect")
        alert.addButton(withTitle: "Open Token Page")
        alert.addButton(withTitle: "Back")
        
        let response = alert.runModal()
        
        if response == .alertFirstButtonReturn {
            let token = textView.string.trimmingCharacters(in: .whitespacesAndNewlines)
            if !token.isEmpty {
                validateToken(token)
            } else {
                showAlert(title: "Empty Token", message: "Please enter a valid token.")
                showManualTokenEntry()
            }
        } else if response == .alertSecondButtonReturn {
            NSWorkspace.shared.open(URL(string: "https://asanabridge.com/tokens")!)
            showManualTokenEntry()
        } else {
            showAuthenticationFlow()
        }
    }
    
    func validateToken(_ token: String) {
        // Show validation progress
        updateStatusBarTitle("🔄 Validating token...")
        
        // Test the token with API
        guard let url = URL(string: "https://asanabridge.com/api/auth/me") else { 
            showAlert(title: "Configuration Error", message: "Could not connect to AsanaBridge API.")
            return 
        }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \\(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 10.0
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if error != nil {
                    self.updateStatusBarTitle("❌ AsanaBridge")
                    self.showAlert(title: "Connection Error", 
                                 message: "Could not connect to AsanaBridge servers. Please check your internet connection and try again.")
                    return
                }
                
                if let httpResponse = response as? HTTPURLResponse {
                    switch httpResponse.statusCode {
                    case 200:
                        // Success!
                        self.userToken = token
                        UserDefaults.standard.set(token, forKey: "userToken")
                        self.updateStatusBarTitle("✅ AsanaBridge")
                        self.showAlert(title: "🎉 Connected Successfully!", 
                                     message: "AsanaBridge is now connected to your account. Your tasks will sync automatically!")
                        self.asanaConnected = true
                        
                    case 401:
                        self.updateStatusBarTitle("❌ AsanaBridge")
                        let alert = NSAlert()
                        alert.messageText = "Invalid Token"
                        alert.informativeText = """
                        The token you entered is not valid or has expired.
                        
                        Please:
                        1. Visit asanabridge.com/tokens
                        2. Generate a new token
                        3. Try connecting again
                        """
                        alert.addButton(withTitle: "Try Again")
                        alert.addButton(withTitle: "Open Token Page")
                        
                        let response = alert.runModal()
                        if response == .alertSecondButtonReturn {
                            NSWorkspace.shared.open(URL(string: "https://asanabridge.com/tokens")!)
                        }
                        
                    case 403:
                        self.updateStatusBarTitle("❌ AsanaBridge")
                        self.showAlert(title: "Access Denied", 
                                     message: "Your token doesn't have the required permissions. Please generate a new token with full access.")
                        
                    default:
                        self.updateStatusBarTitle("❌ AsanaBridge")
                        self.showAlert(title: "Server Error", 
                                     message: "AsanaBridge server returned an error (\\(httpResponse.statusCode)). Please try again later.")
                    }
                } else {
                    self.updateStatusBarTitle("❌ AsanaBridge")
                    self.showAlert(title: "Invalid Response", message: "Received an invalid response from the server.")
                }
            }
        }.resume()
    }
    
    // No complex setup needed - authentication handles everything!
    
    func startAsanaBridge() {
        updateMenuBarStatus(.connecting)
        
        // Initialize API client with just the token
        if let token = userToken {
            apiClient = AsanaBridgeAPIClient(token: token, agentKey: "simple")
        }
        
        // Begin sync process
        startSyncTimer()
        
        updateMenuBarStatus(.connected)
    }
    
    func startSyncTimer() {
        Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { _ in
            self.performSync()
        }
    }
    
    func performSync() {
        // Sync logic here
        print("Performing sync...")
    }
    
    func updateMenuBarStatus(_ status: ConnectionStatus) {
        if let button = statusItem?.button {
            button.title = "\\(status.icon) AsanaBridge"
        }
    }
    
    func showMainWindow() {
        if mainWindow?.isVisible == true {
            mainWindow?.makeKeyAndOrderFront(nil)
            return
        }
        
        let windowRect = NSRect(x: 0, y: 0, width: 500, height: 400)
        mainWindow = NSWindow(
            contentRect: windowRect,
            styleMask: [.titled, .closable, .resizable],
            backing: .buffered,
            defer: false
        )
        
        mainWindow?.title = "AsanaBridge Status"
        mainWindow?.center()
        
        let statusView = createStatusView()
        mainWindow?.contentView = statusView
        
        mainWindow?.makeKeyAndOrderFront(nil)
    }
    
    func createStatusView() -> NSView {
        let containerView = NSView(frame: NSRect(x: 0, y: 0, width: 500, height: 400))
        
        // Header
        let headerLabel = NSTextField(labelWithString: "AsanaBridge Status")
        headerLabel.font = NSFont.boldSystemFont(ofSize: 18)
        headerLabel.frame = NSRect(x: 20, y: 350, width: 460, height: 30)
        containerView.addSubview(headerLabel)
        
        // Status items
        var yPos = 300
        
        // OmniFocus Status
        addStatusItem(to: containerView, title: "OmniFocus", 
                     status: omniFocusConnected ? "Connected" : "Disconnected",
                     icon: omniFocusConnected ? "✅" : "❌", yPos: &yPos)
        
        // Asana Status  
        addStatusItem(to: containerView, title: "AsanaBridge Service",
                     status: asanaConnected ? "Connected" : "Disconnected", 
                     icon: asanaConnected ? "✅" : "❌", yPos: &yPos)
        
        // Local Agent Status
        addStatusItem(to: containerView, title: "Local Agent",
                     status: localServer != nil ? "Running" : "Stopped",
                     icon: localServer != nil ? "✅" : "❌", yPos: &yPos)
        
        // Action buttons
        let syncButton = NSButton(title: "Sync Now", target: self, action: #selector(performManualSync))
        syncButton.frame = NSRect(x: 50, y: 50, width: 100, height: 32)
        syncButton.bezelStyle = .rounded
        containerView.addSubview(syncButton)
        
        let settingsButton = NSButton(title: "Settings", target: self, action: #selector(showSettings))
        settingsButton.frame = NSRect(x: 200, y: 50, width: 100, height: 32)
        settingsButton.bezelStyle = .rounded
        containerView.addSubview(settingsButton)
        
        let quitButton = NSButton(title: "Quit", target: self, action: #selector(quitApp))
        quitButton.frame = NSRect(x: 350, y: 50, width: 100, height: 32)
        quitButton.bezelStyle = .rounded
        containerView.addSubview(quitButton)
        
        return containerView
    }
    
    func addStatusItem(to view: NSView, title: String, status: String, icon: String, yPos: inout Int) {
        let titleLabel = NSTextField(labelWithString: title)
        titleLabel.font = NSFont.boldSystemFont(ofSize: 14)
        titleLabel.frame = NSRect(x: 30, y: yPos, width: 150, height: 20)
        view.addSubview(titleLabel)
        
        let statusLabel = NSTextField(labelWithString: "\\(icon) \\(status)")
        statusLabel.font = NSFont.systemFont(ofSize: 13)
        statusLabel.frame = NSRect(x: 200, y: yPos, width: 250, height: 20)
        view.addSubview(statusLabel)
        
        yPos -= 40
    }
    
    @objc func performManualSync() {
        performSync()
        showAlert(title: "Sync Started", message: "Manual sync has been initiated.")
    }
    
    @objc func showSettings() {
        showSetupWizard() // Reuse setup wizard for settings
    }
    
    @objc func showAbout() {
        let alert = NSAlert()
        alert.messageText = "AsanaBridge v2.0"
        alert.informativeText = "Connect your Asana tasks to OmniFocus automatically.\n\nBuilt with ❤️ for productivity enthusiasts.\n\nVisit asanabridge.com for support."
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
    
    @objc func showPreferences() {
        // For now, just show the main window (can be enhanced later)
        showMainWindow()
    }
    
    @objc func quitApp() {
        // Clean shutdown: stop server, save state
        // localServer?.stop() // HTTPServer doesn't have stop method
        
        // Show confirmation if sync is active
        let alert = NSAlert()
        alert.messageText = "Quit AsanaBridge?"
        alert.informativeText = "This will stop syncing tasks between Asana and OmniFocus."
        alert.addButton(withTitle: "Quit")
        alert.addButton(withTitle: "Cancel")
        
        let response = alert.runModal()
        if response == .alertFirstButtonReturn {
            NSApplication.shared.terminate(nil)
        }
    }
    
    func showAlert(title: String, message: String) {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
}

// Simple HTTP Server for local agent
class HTTPServer {
    private var listener: NWListener?
    private var agentKey: String = ""
    
    func start(port: UInt16, agentKey: String) {
        self.agentKey = agentKey
        
        let parameters = NWParameters.tcp
        let port = NWEndpoint.Port(rawValue: port)!
        
        listener = try? NWListener(using: parameters, on: port)
        
        listener?.newConnectionHandler = { connection in
            self.handleConnection(connection)
        }
        
        listener?.start(queue: .global())
    }
    
    private func handleConnection(_ connection: NWConnection) {
        connection.start(queue: .global())
        
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { data, _, isComplete, error in
            if let data = data, !data.isEmpty {
                self.handleRequest(data: data, connection: connection)
            }
            
            if isComplete {
                connection.cancel()
            }
        }
    }
    
    private func handleRequest(data: Data, connection: NWConnection) {
        let request = String(data: data, encoding: .utf8) ?? ""
        
        var response = ""
        
        if request.contains("GET /health") {
            response = """
            HTTP/1.1 200 OK\\r\\n
            Content-Type: application/json\\r\\n
            Content-Length: 25\\r\\n
            \\r\\n
            {"status": "ok", "agent": "running"}
            """
        } else {
            response = """
            HTTP/1.1 404 Not Found\\r\\n
            Content-Length: 0\\r\\n
            \\r\\n
            """
        }
        
        let responseData = response.data(using: .utf8)!
        connection.send(content: responseData, completion: .contentProcessed { _ in
            connection.cancel()
        })
    }
}

// API Client for AsanaBridge service
class AsanaBridgeAPIClient {
    private let token: String
    private let agentKey: String
    private let baseURL = "https://asanabridge.com/api"
    
    init(token: String, agentKey: String) {
        self.token = token
        self.agentKey = agentKey
    }
    
    func testConnection() -> Bool {
        // Test connection to web service
        guard let url = URL(string: "\\(baseURL)/health") else { return false }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \\(token)", forHTTPHeaderField: "Authorization")
        
        let semaphore = DispatchSemaphore(value: 0)
        var success = false
        
        URLSession.shared.dataTask(with: request) { _, response, _ in
            if let httpResponse = response as? HTTPURLResponse {
                success = httpResponse.statusCode == 200
            }
            semaphore.signal()
        }.resume()
        
        semaphore.wait()
        return success
    }
    

}

// Main entry point
print("🔧 Starting AsanaBridge...")
let app = NSApplication.shared
let delegate = AsanaBridgeApp()
app.delegate = delegate

print("📱 Running AsanaBridge app...")
app.run()