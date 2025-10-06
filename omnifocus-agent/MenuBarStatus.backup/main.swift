import Cocoa
import Foundation
import UserNotifications

class AsanaBridgeMenuBar: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem?
    var timer: Timer?
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        setupMenuBar()
        startStatusUpdates()
    }
    
    func setupMenuBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        
        if let button = statusItem?.button {
            button.title = "🔄"
            button.toolTip = "AsanaBridge - Checking status..."
            button.action = #selector(statusItemClicked)
            button.target = self
        }
        
        updateStatus()
    }
    
    @objc func statusItemClicked() {
        let menu = NSMenu()
        
        // Check agent status
        let agentRunning = checkAgentStatus()
        let statusTitle = agentRunning ? "✅ Agent Running" : "❌ Agent Stopped"
        
        let statusMenuItem = NSMenuItem(title: statusTitle, action: nil, keyEquivalent: "")
        statusMenuItem.isEnabled = false
        menu.addItem(statusMenuItem)
        
        menu.addItem(NSMenuItem.separator())
        
        if agentRunning {
            menu.addItem(NSMenuItem(title: "🔄 Sync Now", action: #selector(triggerSync), keyEquivalent: ""))
            menu.addItem(NSMenuItem(title: "📊 Show Status", action: #selector(showStatus), keyEquivalent: ""))
        } else {
            menu.addItem(NSMenuItem(title: "🚀 Start Agent", action: #selector(startAgent), keyEquivalent: ""))
        }
        
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "🌐 Open Dashboard", action: #selector(openDashboard), keyEquivalent: ""))
        menu.addItem(NSMenuItem(title: "❓ Help", action: #selector(openHelp), keyEquivalent: ""))
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q"))
        
        self.statusItem?.menu = menu
        self.statusItem?.button?.performClick(self.statusItem?.button)
        self.statusItem?.menu = nil
    }
    
    func checkAgentStatus() -> Bool {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/curl")
        task.arguments = ["-s", "http://localhost:7842/health"]
        
        do {
            try task.run()
            task.waitUntilExit()
            return task.terminationStatus == 0
        } catch {
            return false
        }
    }
    
    func updateStatus() {
        guard let button = statusItem?.button else { return }
        
        if checkAgentStatus() {
            button.title = "✅"
            button.toolTip = "AsanaBridge - Agent Running"
        } else {
            button.title = "❌"
            button.toolTip = "AsanaBridge - Agent Stopped"
        }
    }
    
    func startStatusUpdates() {
        timer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { _ in
            self.updateStatus()
        }
    }
    
    @objc func triggerSync() {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/curl")
        task.arguments = ["-s", "-X", "POST", "http://localhost:7842/sync/trigger"]
        try? task.run()
        
        showNotification(title: "AsanaBridge", message: "Manual sync triggered")
    }
    
    @objc func showStatus() {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/curl")
        task.arguments = ["-s", "http://localhost:7842/status/popup"]
        try? task.run()
    }
    
    @objc func startAgent() {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        task.arguments = ["-a", "AsanaBridge"]
        try? task.run()
    }
    
    @objc func openDashboard() {
        NSWorkspace.shared.open(URL(string: "https://asanabridge.com/dashboard")!)
    }
    
    @objc func openHelp() {
        NSWorkspace.shared.open(URL(string: "https://asanabridge.com/support")!)
    }
    
    @objc func quit() {
        NSApplication.shared.terminate(nil)
    }
    
    func showNotification(title: String, message: String) {
        let center = UNUserNotificationCenter.current()
        
        // Request permission first
        center.requestAuthorization(options: [.alert, .sound]) { granted, error in
            if granted {
                let content = UNMutableNotificationContent()
                content.title = title
                content.body = message
                content.sound = .default
                
                let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
                center.add(request)
            }
        }
    }
}

// Main entry point
let app = NSApplication.shared
let delegate = AsanaBridgeMenuBar()
app.delegate = delegate
app.run()
