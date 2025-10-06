// MenuBarApp.swift
// This file shows how to add a simple menu bar status indicator to the macOS agent

import Cocoa
import Foundation

class MenuBarApp: NSObject {
    var statusItem: NSStatusItem?
    var agentStatus: AgentStatus = .disconnected
    
    enum AgentStatus {
        case connected
        case disconnected
        case syncing
        case error
        
        var icon: String {
            switch self {
            case .connected:
                return "checkmark.circle.fill"
            case .disconnected:
                return "xmark.circle.fill"
            case .syncing:
                return "arrow.triangle.2.circlepath"
            case .error:
                return "exclamationmark.triangle.fill"
            }
        }
        
        var color: NSColor {
            switch self {
            case .connected:
                return .systemGreen
            case .disconnected:
                return .systemRed
            case .syncing:
                return .systemBlue
            case .error:
                return .systemOrange
            }
        }
        
        var tooltip: String {
            switch self {
            case .connected:
                return "AsanaBridge - Connected"
            case .disconnected:
                return "AsanaBridge - Disconnected"
            case .syncing:
                return "AsanaBridge - Syncing..."
            case .error:
                return "AsanaBridge - Error"
            }
        }
    }
    
    func setupMenuBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        
        if let button = statusItem?.button {
            updateStatusIcon()
            button.action = #selector(statusItemClicked)
            button.target = self
        }
        
        setupMenu()
    }
    
    func updateStatusIcon() {
        guard let button = statusItem?.button else { return }
        
        let image = NSImage(systemSymbolName: agentStatus.icon, accessibilityDescription: nil)
        image?.isTemplate = true
        
        button.image = image
        button.toolTip = agentStatus.tooltip
        
        // Add color to the icon
        if let imageView = button.subviews.first as? NSImageView {
            imageView.contentTintColor = agentStatus.color
        }
    }
    
    @objc func statusItemClicked() {
        statusItem?.menu = createMenu()
        statusItem?.button?.performClick(nil)
    }
    
    func setupMenu() {
        statusItem?.menu = createMenu()
    }
    
    func createMenu() -> NSMenu {
        let menu = NSMenu()
        
        // Status header
        let statusItem = NSMenuItem(title: agentStatus.tooltip, action: nil, keyEquivalent: "")
        statusItem.isEnabled = false
        menu.addItem(statusItem)
        
        menu.addItem(NSMenuItem.separator())
        
        // Connection info
        let connectionItem = NSMenuItem(title: getConnectionInfo(), action: nil, keyEquivalent: "")
        connectionItem.isEnabled = false
        menu.addItem(connectionItem)
        
        // Last sync info
        let lastSyncItem = NSMenuItem(title: getLastSyncInfo(), action: nil, keyEquivalent: "")
        lastSyncItem.isEnabled = false
        menu.addItem(lastSyncItem)
        
        menu.addItem(NSMenuItem.separator())
        
        // Actions
        let syncNowItem = NSMenuItem(title: "Sync Now", action: #selector(syncNow), keyEquivalent: "")
        syncNowItem.target = self
        syncNowItem.isEnabled = agentStatus == .connected
        menu.addItem(syncNowItem)
        
        let openDashboardItem = NSMenuItem(title: "Open Dashboard", action: #selector(openDashboard), keyEquivalent: "")
        openDashboardItem.target = self
        menu.addItem(openDashboardItem)
        
        menu.addItem(NSMenuItem.separator())
        
        let preferencesItem = NSMenuItem(title: "Preferences...", action: #selector(openPreferences), keyEquivalent: "")
        preferencesItem.target = self
        menu.addItem(preferencesItem)
        
        menu.addItem(NSMenuItem.separator())
        
        let quitItem = NSMenuItem(title: "Quit AsanaBridge", action: #selector(quitApp), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)
        
        return menu
    }
    
    func getConnectionInfo() -> String {
        switch agentStatus {
        case .connected:
            return "✅ Connected to AsanaBridge"
        case .disconnected:
            return "❌ Not connected"
        case .syncing:
            return "🔄 Syncing tasks..."
        case .error:
            return "⚠️ Connection error"
        }
    }
    
    func getLastSyncInfo() -> String {
        // This would be populated from actual sync data
        return "Last sync: 2 minutes ago"
    }
    
    @objc func syncNow() {
        updateStatus(.syncing)
        
        // Trigger immediate sync
        NotificationCenter.default.post(name: NSNotification.Name("TriggerSync"), object: nil)
        
        // Simulate sync completion after 3 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            self.updateStatus(.connected)
        }
    }
    
    @objc func openDashboard() {
        if let url = URL(string: "https://asanabridge.com/dashboard") {
            NSWorkspace.shared.open(url)
        }
    }
    
    @objc func openPreferences() {
        // Open preferences window
        NotificationCenter.default.post(name: NSNotification.Name("ShowPreferences"), object: nil)
    }
    
    @objc func quitApp() {
        NSApplication.shared.terminate(nil)
    }
    
    func updateStatus(_ status: AgentStatus) {
        agentStatus = status
        updateStatusIcon()
        
        // Update menu if it's currently shown
        if statusItem?.menu != nil {
            statusItem?.menu = createMenu()
        }
    }
    
    // Call this method when connection status changes
    func handleConnectionStatusChange(isConnected: Bool, hasError: Bool = false) {
        if hasError {
            updateStatus(.error)
        } else if isConnected {
            updateStatus(.connected)
        } else {
            updateStatus(.disconnected)
        }
    }
    
    // Call this method when sync starts/stops
    func handleSyncStatusChange(isSyncing: Bool) {
        if isSyncing {
            updateStatus(.syncing)
        } else {
            updateStatus(.connected)
        }
    }
}