#!/bin/bash

# create-menubar-app.sh
# Creates a simple menu bar status app for AsanaBridge

set -e

echo "🔧 Creating AsanaBridge Menu Bar App..."

# Create the menu bar app directory structure
AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MENUBAR_DIR="$AGENT_DIR/MenuBarStatus"
XCODE_PROJECT="$MENUBAR_DIR/AsanaBridgeStatus.xcodeproj"

# Clean and create directory
rm -rf "$MENUBAR_DIR"
mkdir -p "$MENUBAR_DIR"

# Create main Swift file
cat > "$MENUBAR_DIR/main.swift" << 'EOF'
import Cocoa
import Foundation

@main
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
        
        let statusItem = NSMenuItem(title: statusTitle, action: nil, keyEquivalent: "")
        statusItem.isEnabled = false
        menu.addItem(statusItem)
        
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
        
        statusItem?.menu = menu
        statusItem?.button?.performClick(nil)
        statusItem?.menu = nil
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
        let notification = NSUserNotification()
        notification.title = title
        notification.informativeText = message
        NSUserNotificationCenter.default.deliver(notification)
    }
}
EOF

# Create a simple build script
cat > "$MENUBAR_DIR/build.sh" << 'EOF'
#!/bin/bash
echo "Building AsanaBridge Menu Bar Status App..."
swiftc -o AsanaBridgeMenuBar main.swift -framework Cocoa -framework Foundation
echo "✅ Built AsanaBridgeMenuBar"
echo "Run with: ./AsanaBridgeMenuBar"
EOF

chmod +x "$MENUBAR_DIR/build.sh"

echo "✅ Menu bar app created in $MENUBAR_DIR"
echo "To build: cd $MENUBAR_DIR && ./build.sh"