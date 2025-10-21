import Cocoa
import Foundation

// Simple, crash-free AsanaBridge app
// Focus: Login, Logout, OmniFocus sync, minimal UI

class SimpleAsanaBridgeApp: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem?
    var userToken: String?
    var syncTimer: Timer?
    
    #if DEBUG
    let baseURL = "http://localhost:3000"
    #else
    let baseURL = "https://asanabridge.com"
    #endif
    
    // MARK: - App Lifecycle
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        print("🚀 AsanaBridge starting...")
        
        // Set as menu bar app (accessory)
        NSApp.setActivationPolicy(.accessory)
        
        // Setup menu bar icon
        setupMenuBar()
        
        // Load saved token
        loadToken()
        
        // Start sync if authenticated
        if userToken != nil {
            startSync()
        } else {
            showLogin()
        }
    }
    
    func applicationWillTerminate(_ notification: Notification) {
        // Cleanup
        syncTimer?.invalidate()
        syncTimer = nil
    }
    
    // MARK: - Menu Bar
    
    func setupMenuBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        
        guard let button = statusItem?.button else {
            print("❌ Failed to create menu bar button")
            return
        }
        
        // Use SF Symbol or simple icon
        if #available(macOS 11.0, *) {
            if let image = NSImage(systemSymbolName: "link.circle.fill", accessibilityDescription: "AsanaBridge") {
                image.isTemplate = true
                button.image = image
            }
        } else {
            button.title = "AB"
        }
        
        button.action = #selector(menuBarClicked)
        button.target = self
        
        print("✅ Menu bar setup complete")
    }
    
    @objc func menuBarClicked() {
        guard let statusItem = statusItem else { return }
        
        let menu = NSMenu()
        
        // Status
        if userToken != nil {
            menu.addItem(NSMenuItem(title: "✅ Connected", action: nil, keyEquivalent: ""))
        } else {
            menu.addItem(NSMenuItem(title: "❌ Not Connected", action: nil, keyEquivalent: ""))
        }
        
        menu.addItem(NSMenuItem.separator())
        
        // Actions
        if userToken != nil {
            let signOutItem = NSMenuItem(title: "Sign Out", action: #selector(signOut), keyEquivalent: "")
            signOutItem.target = self
            menu.addItem(signOutItem)
        } else {
            let signInItem = NSMenuItem(title: "Sign In", action: #selector(showLogin), keyEquivalent: "")
            signInItem.target = self
            menu.addItem(signInItem)
        }
        
        menu.addItem(NSMenuItem.separator())
        
        // Quit
        let quitItem = NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)
        
        statusItem.menu = menu
        statusItem.button?.performClick(nil)
        
        // Clear menu after showing to avoid conflicts
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            statusItem.menu = nil
        }
    }
    
    // MARK: - Authentication
    
    func loadToken() {
        userToken = UserDefaults.standard.string(forKey: "userToken")
        if userToken != nil {
            print("✅ Loaded saved token")
        }
    }
    
    func saveToken(_ token: String) {
        userToken = token
        UserDefaults.standard.set(token, forKey: "userToken")
        print("✅ Token saved")
    }
    
    func clearToken() {
        userToken = nil
        UserDefaults.standard.removeObject(forKey: "userToken")
        syncTimer?.invalidate()
        syncTimer = nil
        print("✅ Token cleared")
    }
    
    @objc func showLogin() {
        print("🔑 Showing login...")
        
        // Create login window
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 500, height: 300),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        window.title = "AsanaBridge Login"
        window.center()
        
        let containerView = NSView(frame: NSRect(x: 0, y: 0, width: 500, height: 300))
        
        // Title
        let titleLabel = NSTextField(labelWithString: "Sign in to AsanaBridge")
        titleLabel.font = NSFont.boldSystemFont(ofSize: 20)
        titleLabel.frame = NSRect(x: 50, y: 220, width: 400, height: 30)
        titleLabel.alignment = .center
        containerView.addSubview(titleLabel)
        
        // Instructions
        let instructionsLabel = NSTextField(labelWithString: "Click the button below to sign in with your browser")
        instructionsLabel.font = NSFont.systemFont(ofSize: 14)
        instructionsLabel.textColor = .secondaryLabelColor
        instructionsLabel.frame = NSRect(x: 50, y: 180, width: 400, height: 20)
        instructionsLabel.alignment = .center
        containerView.addSubview(instructionsLabel)
        
        // Login button
        let loginButton = NSButton(title: "Sign In with Browser", target: self, action: #selector(startBrowserLogin))
        loginButton.frame = NSRect(x: 150, y: 120, width: 200, height: 40)
        loginButton.bezelStyle = .rounded
        containerView.addSubview(loginButton)
        
        // Status label
        let statusLabel = NSTextField(labelWithString: "")
        statusLabel.font = NSFont.systemFont(ofSize: 12)
        statusLabel.textColor = .secondaryLabelColor
        statusLabel.frame = NSRect(x: 50, y: 80, width: 400, height: 20)
        statusLabel.alignment = .center
        containerView.addSubview(statusLabel)
        
        window.contentView = containerView
        
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
    }
    
    @objc func startBrowserLogin() {
        print("🌐 Starting browser login...")
        
        // Open browser for authentication
        let authURL = "\(baseURL)/auth/desktop"
        if let url = URL(string: authURL) {
            NSWorkspace.shared.open(url)
        }
        
        // Start polling for token (simple approach)
        // In production, you'd use a local server or deep link
        // For now, just show instructions to paste token
        showTokenInput()
    }
    
    func showTokenInput() {
        let alert = NSAlert()
        alert.messageText = "Enter Token"
        alert.informativeText = "After signing in, copy your token from the browser and paste it here."
        alert.addButton(withTitle: "Submit")
        alert.addButton(withTitle: "Cancel")
        
        let inputField = NSTextField(frame: NSRect(x: 0, y: 0, width: 300, height: 24))
        inputField.placeholderString = "Paste token here..."
        alert.accessoryView = inputField
        
        let response = alert.runModal()
        if response == .alertFirstButtonReturn {
            let token = inputField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if !token.isEmpty {
                saveToken(token)
                startSync()
                
                // Close any open windows
                for window in NSApp.windows {
                    if window.title == "AsanaBridge Login" {
                        window.close()
                    }
                }
            }
        }
    }
    
    @objc func signOut() {
        let alert = NSAlert()
        alert.messageText = "Sign Out"
        alert.informativeText = "Are you sure you want to sign out?"
        alert.addButton(withTitle: "Sign Out")
        alert.addButton(withTitle: "Cancel")
        
        if alert.runModal() == .alertFirstButtonReturn {
            clearToken()
            
            let successAlert = NSAlert()
            successAlert.messageText = "Signed Out"
            successAlert.informativeText = "You have been signed out successfully."
            successAlert.runModal()
        }
    }
    
    // MARK: - Sync
    
    func startSync() {
        print("🔄 Starting sync...")
        
        // Register with server
        registerAgent()
        
        // Start periodic sync (every 5 minutes)
        syncTimer = Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { [weak self] _ in
            self?.performSync()
        }
        
        // Do initial sync after 5 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
            self.performSync()
        }
    }
    
    func registerAgent() {
        guard let token = userToken else { return }
        
        let url = URL(string: "\(baseURL)/api/agent/register")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "2.2.2",
            "platform": "macOS"
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("❌ Registration error: \(error)")
                return
            }
            print("✅ Agent registered")
        }.resume()
    }
    
    func performSync() {
        print("🔄 Performing sync...")
        
        // Get OmniFocus tasks
        let tasks = getOmniFocusTasks()
        
        if tasks.isEmpty {
            print("ℹ️ No tasks to sync")
            return
        }
        
        // Send to server
        sendTasksToServer(tasks)
    }
    
    func getOmniFocusTasks() -> [[String: Any]] {
        var tasks: [[String: Any]] = []
        
        // Use JXA to get tasks from OmniFocus
        let script = """
        function run() {
            const app = Application('OmniFocus');
            app.includeStandardAdditions = true;
            
            if (!app.running()) {
                return JSON.stringify([]);
            }
            
            const doc = app.defaultDocument();
            const inbox = doc.inboxTasks();
            
            const tasks = [];
            for (let i = 0; i < Math.min(inbox.length, 10); i++) {
                const task = inbox[i];
                tasks.push({
                    name: task.name(),
                    note: task.note() || '',
                    id: task.id()
                });
            }
            
            return JSON.stringify(tasks);
        }
        """
        
        var error: NSDictionary?
        if let scriptObject = NSAppleScript(source: script) {
            let output = scriptObject.executeAndReturnError(&error)
            
            if let error = error {
                print("❌ OmniFocus script error: \(error)")
                return []
            }
            
            if let jsonString = output.stringValue,
               let jsonData = jsonString.data(using: .utf8),
               let parsed = try? JSONSerialization.jsonObject(with: jsonData) as? [[String: Any]] {
                tasks = parsed
            }
        }
        
        return tasks
    }
    
    func sendTasksToServer(_ tasks: [[String: Any]]) {
        guard let token = userToken else { return }
        
        let url = URL(string: "\(baseURL)/api/agent/sync")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = ["tasks": tasks]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("❌ Sync error: \(error)")
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse {
                if httpResponse.statusCode == 200 {
                    print("✅ Synced \(tasks.count) tasks")
                } else {
                    print("❌ Sync failed with status \(httpResponse.statusCode)")
                }
            }
        }.resume()
    }
    
    // MARK: - Actions
    
    @objc func quit() {
        NSApp.terminate(nil)
    }
}

// MARK: - Main Entry Point

// Create autoreleasepool to prevent memory leaks
autoreleasepool {
    let app = NSApplication.shared
    let delegate = SimpleAsanaBridgeApp()
    app.delegate = delegate
    app.run()
}
