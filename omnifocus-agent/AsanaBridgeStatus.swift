import Cocoa
import Foundation

class AsanaBridgeStatusApp: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem?
    var statusWindow: NSWindow?
    var timer: Timer?
    
    // Status data
    var agentStatus: AgentStatus = .disconnected
    var omniFocusVersion: String = ""
    var accountInfo: String = ""
    var lastSyncTime: String = ""
    
    enum AgentStatus {
        case connected, disconnected, syncing, error
        
        var icon: String {
            switch self {
            case .connected: return "✅"
            case .disconnected: return "❌"
            case .syncing: return "🔄"
            case .error: return "⚠️"
            }
        }
        
        var title: String {
            switch self {
            case .connected: return "Connected"
            case .disconnected: return "Disconnected"
            case .syncing: return "Syncing..."
            case .error: return "Error"
            }
        }
    }
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        setupMenuBar()
        startStatusUpdates()
        checkInitialStatus()
        // Show the status window immediately on launch
        showStatusWindow()
    }
    
    func setupMenuBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        
        if let button = statusItem?.button {
            button.title = "❌ AsanaBridge"
            button.toolTip = "AsanaBridge - Click for status"
            button.action = #selector(statusItemClicked)
            button.target = self
        }
    }
    
    @objc func statusItemClicked() {
        if statusWindow?.isVisible == true {
            statusWindow?.close()
        } else {
            showStatusWindow()
        }
    }
    
    func showStatusWindow() {
        let windowRect = NSRect(x: 0, y: 0, width: 400, height: 500)
        statusWindow = NSWindow(
            contentRect: windowRect,
            styleMask: [.titled, .closable, .resizable],
            backing: .buffered,
            defer: false
        )
        
        statusWindow?.title = "AsanaBridge Status"
        statusWindow?.center()
        statusWindow?.level = .floating
        
        // Create the status view
        let contentView = createStatusView()
        statusWindow?.contentView = contentView
        
        statusWindow?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
    
    func createStatusView() -> NSView {
        let containerView = NSView(frame: NSRect(x: 0, y: 0, width: 400, height: 500))
        
        // Header
        let headerLabel = NSTextField(labelWithString: "AsanaBridge Status")
        headerLabel.font = NSFont.boldSystemFont(ofSize: 18)
        headerLabel.frame = NSRect(x: 20, y: 450, width: 360, height: 30)
        containerView.addSubview(headerLabel)
        
        // Status sections
        var yPos = 400
        
        // Agent Status
        addStatusSection(to: containerView, title: "Agent Status", value: agentStatus.title, icon: agentStatus.icon, yPos: &yPos)
        
        // OmniFocus Status
        let ofStatus = omniFocusVersion.isEmpty ? "Not detected" : "Version \(omniFocusVersion)"
        addStatusSection(to: containerView, title: "OmniFocus", value: ofStatus, icon: omniFocusVersion.isEmpty ? "❌" : "✅", yPos: &yPos)
        
        // Account Info
        let account = accountInfo.isEmpty ? "Not connected" : accountInfo
        addStatusSection(to: containerView, title: "Account", value: account, icon: accountInfo.isEmpty ? "❌" : "👤", yPos: &yPos)
        
        // Last Sync
        let sync = lastSyncTime.isEmpty ? "Never" : lastSyncTime
        addStatusSection(to: containerView, title: "Last Sync", value: sync, icon: "🔄", yPos: &yPos)
        
        // Test Connection Button
        let testButton = NSButton(frame: NSRect(x: 20, y: yPos - 40, width: 360, height: 30))
        testButton.title = "Test Connection"
        testButton.bezelStyle = .rounded
        testButton.target = self
        testButton.action = #selector(testConnection)
        containerView.addSubview(testButton)
        yPos -= 50
        
        // Manual Sync Button
        let syncButton = NSButton(frame: NSRect(x: 20, y: yPos - 40, width: 175, height: 30))
        syncButton.title = "Sync Now"
        syncButton.bezelStyle = .rounded
        syncButton.target = self
        syncButton.action = #selector(triggerSync)
        syncButton.isEnabled = agentStatus == .connected
        containerView.addSubview(syncButton)
        
        // Open Dashboard Button
        let dashboardButton = NSButton(frame: NSRect(x: 205, y: yPos - 40, width: 175, height: 30))
        dashboardButton.title = "Open Dashboard"
        dashboardButton.bezelStyle = .rounded
        dashboardButton.target = self
        dashboardButton.action = #selector(openDashboard)
        containerView.addSubview(dashboardButton)
        yPos -= 50
        
        // Refresh Button
        let refreshButton = NSButton(frame: NSRect(x: 20, y: yPos - 40, width: 175, height: 30))
        refreshButton.title = "Refresh Status"
        refreshButton.bezelStyle = .rounded
        refreshButton.target = self
        refreshButton.action = #selector(refreshStatus)
        containerView.addSubview(refreshButton)
        
        // Quit Button
        let quitButton = NSButton(frame: NSRect(x: 205, y: yPos - 40, width: 175, height: 30))
        quitButton.title = "Quit AsanaBridge"
        quitButton.bezelStyle = .rounded
        quitButton.target = self
        quitButton.action = #selector(quitApp)
        containerView.addSubview(quitButton)
        
        return containerView
    }
    
    func addStatusSection(to view: NSView, title: String, value: String, icon: String, yPos: inout Int) {
        // Title
        let titleLabel = NSTextField(labelWithString: title)
        titleLabel.font = NSFont.boldSystemFont(ofSize: 14)
        titleLabel.frame = NSRect(x: 20, y: yPos, width: 100, height: 20)
        view.addSubview(titleLabel)
        
        // Icon and Value
        let statusLabel = NSTextField(labelWithString: "\(icon) \(value)")
        statusLabel.font = NSFont.systemFont(ofSize: 13)
        statusLabel.frame = NSRect(x: 130, y: yPos, width: 250, height: 20)
        view.addSubview(statusLabel)
        
        yPos -= 30
    }
    
    @objc func testConnection() {
        showAlert(title: "Testing Connection", message: "Checking OmniFocus, agent status, and web service connection...")
        
        DispatchQueue.global().async {
            let results = self.performConnectionTests()
            
            DispatchQueue.main.async {
                let message = results.joined(separator: "\n")
                self.showAlert(title: "Connection Test Results", message: message)
            }
        }
    }
    
    func performConnectionTests() -> [String] {
        var results: [String] = []
        
        // Test OmniFocus
        do {
            let task = Process()
            task.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
            task.arguments = ["-e", "tell application \"OmniFocus 3\" to get version"]
            
            let pipe = Pipe()
            task.standardOutput = pipe
            task.standardError = pipe
            
            try task.run()
            task.waitUntilExit()
            
            if task.terminationStatus == 0 {
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                if let version = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) {
                    omniFocusVersion = version
                    results.append("✅ OmniFocus: Version \(version)")
                } else {
                    results.append("❌ OmniFocus: Could not get version")
                }
            } else {
                results.append("❌ OmniFocus: Not running or not accessible")
            }
        } catch {
            results.append("❌ OmniFocus: Error - \(error.localizedDescription)")
        }
        
        // Test Agent API
        if let url = URL(string: "http://localhost:7842/health") {
            do {
                let data = try Data(contentsOf: url)
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    if json["status"] as? String == "ok" {
                        results.append("✅ Agent: Running and healthy")
                        agentStatus = .connected
                    } else {
                        results.append("❌ Agent: Unhealthy response")
                        agentStatus = .error
                    }
                }
            } catch {
                results.append("❌ Agent: Not running or not accessible")
                agentStatus = .disconnected
            }
        }
        
        // Test Web Service
        if let url = URL(string: "https://asanabridge.com/api/health") {
            do {
                let data = try Data(contentsOf: url)
                if let response = String(data: data, encoding: .utf8) {
                    results.append("✅ Web Service: Accessible")
                } else {
                    results.append("❌ Web Service: Invalid response")
                }
            } catch {
                results.append("❌ Web Service: Not accessible - \(error.localizedDescription)")
            }
        }
        
        return results
    }
    
    @objc func triggerSync() {
        if let url = URL(string: "http://localhost:7842/sync/trigger") {
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            
            URLSession.shared.dataTask(with: request) { data, response, error in
                DispatchQueue.main.async {
                    if error == nil {
                        self.showAlert(title: "Sync Triggered", message: "Manual sync has been started.")
                    } else {
                        self.showAlert(title: "Sync Failed", message: "Could not trigger sync. Make sure the agent is running.")
                    }
                }
            }.resume()
        }
    }
    
    @objc func openDashboard() {
        NSWorkspace.shared.open(URL(string: "https://asanabridge.com/dashboard")!)
    }
    
    @objc func refreshStatus() {
        checkInitialStatus()
        if statusWindow?.isVisible == true {
            statusWindow?.close()
            showStatusWindow()
        }
    }
    
    @objc func quitApp() {
        NSApp.terminate(nil)
    }
    
    func checkInitialStatus() {
        DispatchQueue.global().async {
            // Check agent status and get account info
            if let url = URL(string: "http://localhost:7842/account-info") {
                do {
                    let data = try Data(contentsOf: url)
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        DispatchQueue.main.async {
                            // Extract user info
                            if let user = json["user"] as? [String: Any],
                               let name = user["name"] as? String,
                               let email = user["email"] as? String,
                               let plan = user["plan"] as? String {
                                self.accountInfo = "\(name) (\(email)) - \(plan) Plan"
                            }
                            
                            // Extract sync info
                            if let sync = json["sync"] as? [String: Any],
                               let lastSyncInfo = sync["lastSync"] as? [String: Any],
                               let syncTime = lastSyncInfo["time"] as? String {
                                let formatter = ISO8601DateFormatter()
                                if let date = formatter.date(from: syncTime) {
                                    let displayFormatter = DateFormatter()
                                    displayFormatter.dateStyle = .short
                                    displayFormatter.timeStyle = .short
                                    self.lastSyncTime = displayFormatter.string(from: date)
                                }
                            }
                            
                            // Check if agent is registered and active
                            if let agent = json["agent"] as? [String: Any],
                               let registered = agent["registered"] as? Bool {
                                self.agentStatus = registered ? .connected : .disconnected
                            }
                            
                            self.updateMenuBarDisplay()
                        }
                    }
                } catch {
                    // Try fallback health check
                    self.checkBasicAgentStatus()
                }
            } else {
                self.checkBasicAgentStatus()
            }
            
            // Check OmniFocus
            self.checkOmniFocusVersion()
        }
    }
    
    func checkBasicAgentStatus() {
        if let url = URL(string: "http://localhost:7842/health") {
            do {
                let data = try Data(contentsOf: url)
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    DispatchQueue.main.async {
                        if json["status"] as? String == "ok" {
                            self.agentStatus = .connected
                        } else {
                            self.agentStatus = .error
                        }
                        self.updateMenuBarDisplay()
                    }
                }
            } catch {
                DispatchQueue.main.async {
                    self.agentStatus = .disconnected
                    self.updateMenuBarDisplay()
                }
            }
        }
    }
    
    func checkOmniFocusVersion() {
        do {
            let task = Process()
            task.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
            task.arguments = ["-e", "tell application \"OmniFocus 3\" to get version"]
            
            let pipe = Pipe()
            task.standardOutput = pipe
            try task.run()
            task.waitUntilExit()
            
            if task.terminationStatus == 0 {
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                if let version = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) {
                    DispatchQueue.main.async {
                        self.omniFocusVersion = version
                        self.updateMenuBarDisplay()
                    }
                }
            }
        } catch {
            // OmniFocus not available
        }
    }
    
    func updateMenuBarDisplay() {
        if let button = statusItem?.button {
            button.title = "\(agentStatus.icon) AsanaBridge"
            button.toolTip = "AsanaBridge - \(agentStatus.title)"
        }
    }
    
    func startStatusUpdates() {
        timer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { _ in
            self.checkInitialStatus()
        }
    }
    
    func showAlert(title: String, message: String) {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.alertStyle = .informational
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
}

// Main entry point
let app = NSApplication.shared
let delegate = AsanaBridgeStatusApp()
app.delegate = delegate
app.run()