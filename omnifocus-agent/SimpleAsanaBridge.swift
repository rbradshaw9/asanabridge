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
        print("✅ Token cleared")
    }
    
    @objc func showLogin() {
        print("🔑 Showing login...")
        
        // Activate app to show window
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
        
        // Show alert with login instructions
        let alert = NSAlert()
        alert.messageText = "Welcome to AsanaBridge!"
        alert.informativeText = "To get started:\n\n1. Click 'Open Dashboard' to sign in via your browser\n2. After signing in, copy your authentication token\n3. Click 'Enter Token' and paste it\n\nThe app will then sync your OmniFocus tasks automatically."
        alert.alertStyle = .informational
        alert.addButton(withTitle: "Open Dashboard")
        alert.addButton(withTitle: "Enter Token")
        alert.addButton(withTitle: "Cancel")
        
        let response = alert.runModal()
        
        if response == .alertFirstButtonReturn {
            // Open dashboard
            if let url = URL(string: "\(baseURL)/login") {
                NSWorkspace.shared.open(url)
            }
            // Show token input after a delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                self.showTokenInput()
            }
        } else if response == .alertSecondButtonReturn {
            // Go straight to token input
            showTokenInput()
        } else {
            // Cancel - go back to menu bar mode
            NSApp.setActivationPolicy(.accessory)
        }
    }
    
    func showTokenInput() {
        let alert = NSAlert()
        alert.messageText = "Enter Authentication Token"
        alert.informativeText = "Copy your token from the dashboard and paste it below.\n\nYou can find it on your Account page after signing in."
        alert.addButton(withTitle: "Connect")
        alert.addButton(withTitle: "Cancel")
        
        let inputField = NSTextField(frame: NSRect(x: 0, y: 0, width: 400, height: 24))
        inputField.placeholderString = "Paste your token here..."
        alert.accessoryView = inputField
        
        let response = alert.runModal()
        if response == .alertFirstButtonReturn {
            let token = inputField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if !token.isEmpty {
                saveToken(token)
                startSync()
                
                // Show success message
                let successAlert = NSAlert()
                successAlert.messageText = "✅ Connected!"
                successAlert.informativeText = "AsanaBridge is now syncing your OmniFocus tasks.\n\nYou'll see the icon in your menu bar."
                successAlert.alertStyle = .informational
                successAlert.runModal()
                
                // Return to menu bar mode
                NSApp.setActivationPolicy(.accessory)
            } else {
                let errorAlert = NSAlert()
                errorAlert.messageText = "Invalid Token"
                errorAlert.informativeText = "Please enter a valid authentication token."
                errorAlert.alertStyle = .warning
                errorAlert.runModal()
            }
        } else {
            // Return to menu bar mode
            NSApp.setActivationPolicy(.accessory)
        }
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
