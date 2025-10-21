import Cocoa
import Foundation

// Simple, crash-free AsanaBridge app
// Focus: Login, Logout, OmniFocus sync, minimal UI

class SimpleAsanaBridgeApp: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem?
    var userToken: String?
    var syncTimer: Timer?
    var heartbeatTimer: Timer?
    
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
        
        // Start sync if authenticated, otherwise show login
        if let token = userToken, !token.isEmpty {
            print("✅ Found saved token, starting sync...")
            startSync()
        } else {
            print("ℹ️ No token found, showing login...")
            // Show login window on launch if not authenticated
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self.showLogin()
            }
        }
    }
    
    func applicationWillTerminate(_ notification: Notification) {
        // Cleanup
        syncTimer?.invalidate()
        syncTimer = nil
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
    }
    
    // MARK: - Menu Bar
    
    func setupMenuBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        
        guard let button = statusItem?.button else {
            print("❌ Failed to create menu bar button")
            return
        }
        
        // Try to load app icon from bundle first
        if let appIconPath = Bundle.main.path(forResource: "AsanaBridge", ofType: "icns"),
           let appIcon = NSImage(contentsOfFile: appIconPath) {
            let iconSize = NSSize(width: 18, height: 18)
            appIcon.size = iconSize
            appIcon.isTemplate = true
            button.image = appIcon
            print("✅ Using app icon from bundle")
        }
        // Fallback to SF Symbol
        else if #available(macOS 11.0, *) {
            if let image = NSImage(systemSymbolName: "link.circle.fill", accessibilityDescription: "AsanaBridge") {
                image.isTemplate = true
                button.image = image
                print("✅ Using SF Symbol icon")
            }
        }
        // Last resort: text
        else {
            button.title = "AB"
            print("⚠️ Using text fallback")
        }
        
        button.action = #selector(menuBarClicked)
        button.target = self
        
        print("✅ Menu bar setup complete")
    }
    
    @objc func menuBarClicked() {
        guard let statusItem = statusItem else { return }
        
        let menu = NSMenu()
        
        // Title
        let titleItem = NSMenuItem(title: "AsanaBridge", action: nil, keyEquivalent: "")
        titleItem.isEnabled = false
        menu.addItem(titleItem)
        
        menu.addItem(NSMenuItem.separator())
        
        // Status
        if let token = userToken, !token.isEmpty {
            let statusItem = NSMenuItem(title: "✅ Connected & Syncing", action: nil, keyEquivalent: "")
            statusItem.isEnabled = false
            menu.addItem(statusItem)
        } else {
            let statusItem = NSMenuItem(title: "❌ Not Connected", action: nil, keyEquivalent: "")
            statusItem.isEnabled = false
            menu.addItem(statusItem)
        }
        
        menu.addItem(NSMenuItem.separator())
        
        // Actions
        if userToken != nil {
            let openDashboardItem = NSMenuItem(title: "Open Dashboard...", action: #selector(openDashboard), keyEquivalent: "")
            openDashboardItem.target = self
            menu.addItem(openDashboardItem)
            
            menu.addItem(NSMenuItem.separator())
            
            let signOutItem = NSMenuItem(title: "Sign Out & Disconnect", action: #selector(signOut), keyEquivalent: "")
            signOutItem.target = self
            menu.addItem(signOutItem)
        } else {
            let signInItem = NSMenuItem(title: "Sign In...", action: #selector(showLogin), keyEquivalent: "")
            signInItem.target = self
            menu.addItem(signInItem)
        }
        
        menu.addItem(NSMenuItem.separator())
        
        // Quit
        let quitItem = NSMenuItem(title: "Quit AsanaBridge", action: #selector(quit), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)
        
        statusItem.menu = menu
        statusItem.button?.performClick(nil)
        
        // Clear menu after showing to avoid conflicts
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            statusItem.menu = nil
        }
    }
    
    @objc func openDashboard() {
        if let url = URL(string: baseURL) {
            NSWorkspace.shared.open(url)
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
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
        print("✅ Token cleared")
    }
    
    @objc func showLogin() {
        print("🔑 Showing login...")
        
        // Activate app to show window
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
        
        // Create login window
        let alert = NSAlert()
        alert.messageText = "Sign in to AsanaBridge"
        alert.informativeText = "Enter your AsanaBridge account credentials to connect your OmniFocus sync."
        alert.alertStyle = .informational
        alert.addButton(withTitle: "Sign In")
        alert.addButton(withTitle: "Cancel")
        
        // Create input fields
        let stackView = NSStackView(frame: NSRect(x: 0, y: 0, width: 300, height: 80))
        stackView.orientation = .vertical
        stackView.spacing = 8
        
        let emailField = NSTextField(frame: NSRect(x: 0, y: 0, width: 300, height: 24))
        emailField.placeholderString = "Email"
        
        let passwordField = NSSecureTextField(frame: NSRect(x: 0, y: 0, width: 300, height: 24))
        passwordField.placeholderString = "Password"
        
        stackView.addArrangedSubview(emailField)
        stackView.addArrangedSubview(passwordField)
        
        alert.accessoryView = stackView
        
        // Make email field first responder
        alert.window.initialFirstResponder = emailField
        
        let response = alert.runModal()
        
        if response == .alertFirstButtonReturn {
            let email = emailField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            let password = passwordField.stringValue
            
            if !email.isEmpty && !password.isEmpty {
                // Show progress
                let progressAlert = NSAlert()
                progressAlert.messageText = "Signing in..."
                progressAlert.informativeText = "Please wait..."
                progressAlert.alertStyle = .informational
                
                // Perform login in background
                performLogin(email: email, password: password) { success, token, error in
                    DispatchQueue.main.async {
                        if success, let token = token {
                            self.saveToken(token)
                            self.startSync()
                            
                            let successAlert = NSAlert()
                            successAlert.messageText = "✅ Signed In Successfully!"
                            successAlert.informativeText = "AsanaBridge is now syncing your OmniFocus tasks."
                            successAlert.alertStyle = .informational
                            successAlert.runModal()
                            
                            NSApp.setActivationPolicy(.accessory)
                        } else {
                            let errorAlert = NSAlert()
                            errorAlert.messageText = "Sign In Failed"
                            errorAlert.informativeText = error ?? "Invalid email or password. Please try again."
                            errorAlert.alertStyle = .warning
                            errorAlert.runModal()
                            
                            // Show login again
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                self.showLogin()
                            }
                        }
                    }
                }
            } else {
                let errorAlert = NSAlert()
                errorAlert.messageText = "Invalid Input"
                errorAlert.informativeText = "Please enter both email and password."
                errorAlert.alertStyle = .warning
                errorAlert.runModal()
                
                // Show login again
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self.showLogin()
                }
            }
        } else {
            NSApp.setActivationPolicy(.accessory)
        }
    }
    
    func performLogin(email: String, password: String, completion: @escaping (Bool, String?, String?) -> Void) {
        let url = URL(string: "\(baseURL)/api/auth/app-login-direct")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = ["email": email, "password": password]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("❌ Login error: \(error)")
                completion(false, nil, "Network error. Please check your internet connection.")
                return
            }
            
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                completion(false, nil, "Invalid response from server.")
                return
            }
            
            if let token = json["token"] as? String {
                print("✅ Login successful!")
                completion(true, token, nil)
            } else if let errorMsg = json["error"] as? String {
                print("❌ Login failed: \(errorMsg)")
                completion(false, nil, errorMsg)
            } else {
                completion(false, nil, "Invalid email or password.")
            }
        }.resume()
    }
    
    @objc func signOut() {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
        
        let alert = NSAlert()
        alert.messageText = "Sign Out & Disconnect?"
        alert.informativeText = "This will:\n• Stop syncing your OmniFocus tasks\n• Remove your authentication token\n• Require you to sign in again to resume syncing\n\nAre you sure?"
        alert.alertStyle = .warning
        alert.addButton(withTitle: "Sign Out")
        alert.addButton(withTitle: "Cancel")
        
        if alert.runModal() == .alertFirstButtonReturn {
            clearToken()
            
            let successAlert = NSAlert()
            successAlert.messageText = "Signed Out Successfully"
            successAlert.informativeText = "AsanaBridge has been disconnected.\n\nYou can sign in again from the menu bar icon."
            successAlert.alertStyle = .informational
            successAlert.runModal()
        }
        
        NSApp.setActivationPolicy(.accessory)
    }
    
    // MARK: - Sync
    
    func startSync() {
        print("🔄 Starting sync...")
        
        // Register with server
        registerAgent()
        
        // Start heartbeat timer (every 60 seconds)
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            self?.sendHeartbeat()
        }
        
        // Send initial heartbeat after 5 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
            self.sendHeartbeat()
        }
        
        // Start periodic sync (every 5 minutes)
        syncTimer = Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { [weak self] _ in
            self?.performSync()
        }
        
        // Do initial sync after 10 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
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
    
    func sendHeartbeat() {
        guard let token = userToken else { return }
        
        let url = URL(string: "\(baseURL)/api/agent/heartbeat")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "status": "active",
            "omnifocus_connected": true,
            "last_sync": Date().timeIntervalSince1970
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("⚠️ Heartbeat error: \(error)")
                return
            }
            print("💓 Heartbeat sent")
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
