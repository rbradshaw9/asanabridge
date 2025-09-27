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
    var agentKey: String?
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
        NSApp.setActivationPolicy(.regular) // Make it a regular app with dock icon
        
        setupMainMenu()
        setupMenuBar()
        checkSetupStatus()
        
        // Register for URL events (authentication callbacks)
        NSAppleEventManager.shared().setEventHandler(
            self,
            andSelector: #selector(handleURLEvent(_:withReplyEvent:)),
            forEventClass: AEEventClass(kInternetEventClass),
            andEventID: AEEventID(kAEGetURL)
        )
        
        if isSetupComplete {
            startAsanaBridge()
        } else {
            showSetupWizard()
        }
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
        agentKey = defaults.string(forKey: "agentKey")
        
        if isSetupComplete && userToken != nil && agentKey != nil {
            apiClient = AsanaBridgeAPIClient(token: userToken!, agentKey: agentKey!)
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
        
        // Step 1: OmniFocus Check
        var yPos = 520
        addSetupStep(to: containerView, step: "1", title: "OmniFocus Connection", 
                    description: "We'll check if OmniFocus is installed and running", yPos: &yPos)
        
        let omniFocusButton = NSButton(title: "Test OmniFocus Connection", target: self, action: #selector(testOmniFocus))
        omniFocusButton.frame = NSRect(x: 300, y: yPos + 10, width: 250, height: 32)
        omniFocusButton.bezelStyle = .rounded
        containerView.addSubview(omniFocusButton)
        
        yPos -= 80
        
        // Step 2: AsanaBridge Account
        addSetupStep(to: containerView, step: "2", title: "AsanaBridge Account", 
                    description: "Connect to AsanaBridge to sync your tasks securely", yPos: &yPos)
        
        let loginButton = NSButton(title: "Connect to AsanaBridge", target: self, action: #selector(connectToAsanaBridge))
        loginButton.frame = NSRect(x: 300, y: yPos + 10, width: 250, height: 32)
        loginButton.bezelStyle = .rounded
        containerView.addSubview(loginButton)
        
        yPos -= 80
        
        // Step 3: Agent Setup
        addSetupStep(to: containerView, step: "3", title: "Local Agent Setup", 
                    description: "Set up the local bridge agent", yPos: &yPos)
        
        let agentButton = NSButton(title: "Configure Agent", target: self, action: #selector(setupAgent))
        agentButton.frame = NSRect(x: 300, y: yPos + 10, width: 250, height: 32)
        agentButton.bezelStyle = .rounded
        containerView.addSubview(agentButton)
        
        yPos -= 80
        
        // Complete Setup Button
        let completeButton = NSButton(title: "Complete Setup", target: self, action: #selector(completeSetup))
        completeButton.frame = NSRect(x: 200, y: 50, width: 200, height: 40)
        completeButton.bezelStyle = .rounded
        completeButton.keyEquivalent = "\\r" // Enter key
        containerView.addSubview(completeButton)
        
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
        showAuthenticationFlow()
    }
    
    @objc func handleURLEvent(_ event: NSAppleEventDescriptor, withReplyEvent replyEvent: NSAppleEventDescriptor) {
        guard let urlString = event.paramDescriptor(forKeyword: AEKeyword(keyDirectObject))?.stringValue,
              let url = URL(string: urlString) else {
            print("❌ Invalid URL received")
            return
        }
        
        print("🔗 Received URL: \(urlString)")
        
        // Handle asanabridge://auth?token=xxx&session=xxx
        if url.scheme == "asanabridge" && url.host == "auth" {
            handleAuthenticationCallback(url)
        }
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
    
    @objc func setupAgent() {
        // Generate agent key and set up local server
        agentKey = generateAgentKey()
        UserDefaults.standard.set(agentKey, forKey: "agentKey")
        
        startLocalAgent()
        
        showAlert(title: "Agent Configured", message: "Local agent has been set up successfully!")
    }
    
    func generateAgentKey() -> String {
        return UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
    }
    
    func startLocalAgent() {
        // Start local HTTP server for agent functionality
        localServer = HTTPServer()
        localServer?.start(port: 7842, agentKey: agentKey!)
    }
    
    @objc func completeSetup() {
        guard omniFocusConnected && asanaConnected && agentKey != nil else {
            showAlert(title: "Setup Incomplete", message: "Please complete all setup steps before continuing.")
            return
        }
        
        // Mark setup as complete
        UserDefaults.standard.set(true, forKey: "setupComplete")
        isSetupComplete = true
        
        // Close setup window
        setupWindow?.close()
        
        // Start the bridge
        startAsanaBridge()
        
        showAlert(title: "Setup Complete!", message: "AsanaBridge is now running and will sync your tasks automatically.")
    }
    
    func startAsanaBridge() {
        updateMenuBarStatus(.connecting)
        
        // Initialize API client
        if let token = userToken, let key = agentKey {
            apiClient = AsanaBridgeAPIClient(token: token, agentKey: key)
        }
        
        // Start local agent if not running
        if localServer == nil {
            startLocalAgent()
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
let app = NSApplication.shared
let delegate = AsanaBridgeApp()
app.delegate = delegate
app.run()