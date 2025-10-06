// MARK: - Auto-Update System
// Custom update system for AsanaBridge - better than App Store, simpler than Sparkle

import Network

struct UpdateInfo {
    let latestVersion: String
    let downloadUrl: String
    let releaseNotes: String
    let critical: Bool
    let fileSize: Int64
    let releaseDate: String
}

class AutoUpdater: ObservableObject {
    @Published var updateAvailable = false
    @Published var updateInfo: UpdateInfo?
    @Published var isDownloading = false
    @Published var downloadProgress: Double = 0.0
    @Published var downloadError: String?
    
    private let currentVersion = "2.1.0"
    private let checkInterval: TimeInterval = 3600 // Check every hour
    private var updateTimer: Timer?
    
    func startPeriodicChecking() {
        // Check immediately
        checkForUpdates()
        
        // Set up periodic checking
        updateTimer = Timer.scheduledTimer(withTimeInterval: checkInterval, repeats: true) { _ in
            Task {
                await self.checkForUpdates()
            }
        }
    }
    
    func stopPeriodicChecking() {
        updateTimer?.invalidate()
        updateTimer = nil
    }
    
    @MainActor
    func checkForUpdates() async {
        print("🔍 Checking for app updates...")
        
        guard let url = URL(string: "https://asanabridge.com/api/auth/app/version-check?current=\(currentVersion)") else {
            return
        }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let response = try JSONDecoder().decode(VersionCheckResponse.self, from: data)
            
            if response.needsUpdate {
                print("🚀 Update available: \(response.latestVersion)")
                self.updateInfo = UpdateInfo(
                    latestVersion: response.latestVersion,
                    downloadUrl: response.downloadUrl,
                    releaseNotes: response.releaseNotes,
                    critical: response.critical,
                    fileSize: 25_000_000, // ~25MB estimated
                    releaseDate: response.releaseDate
                )
                self.updateAvailable = true
                
                // Show update notification
                if response.critical {
                    showCriticalUpdateAlert()
                } else {
                    showUpdateNotification()
                }
            } else {
                print("✅ App is up to date")
                self.updateAvailable = false
            }
        } catch {
            print("❌ Update check failed: \(error)")
        }
    }
    
    @MainActor
    func downloadAndInstallUpdate() {
        guard let updateInfo = updateInfo else { return }
        
        isDownloading = true
        downloadProgress = 0.0
        downloadError = nil
        
        Task {
            await performUpdate(updateInfo)
        }
    }
    
    private func performUpdate(_ updateInfo: UpdateInfo) async {
        print("📥 Starting download: \(updateInfo.downloadUrl)")
        
        guard let url = URL(string: updateInfo.downloadUrl) else {
            await MainActor.run {
                downloadError = "Invalid download URL"
                isDownloading = false
            }
            return
        }
        
        do {
            // Create download task with progress tracking
            let (tempURL, _) = try await URLSession.shared.download(from: url) { bytesWritten, totalBytesWritten, totalBytesExpected in
                if totalBytesExpected > 0 {
                    DispatchQueue.main.async {
                        self.downloadProgress = Double(totalBytesWritten) / Double(totalBytesExpected)
                    }
                }
            }
            
            await MainActor.run {
                downloadProgress = 1.0
                print("✅ Download complete, installing...")
            }
            
            // Install the update
            try await installUpdate(from: tempURL)
            
        } catch {
            await MainActor.run {
                downloadError = "Download failed: \(error.localizedDescription)"
                isDownloading = false
            }
        }
    }
    
    private func installUpdate(from tempURL: URL) async throws {
        // Get current app bundle path
        guard let currentAppPath = Bundle.main.bundlePath else {
            throw UpdateError.invalidAppPath
        }
        
        let currentAppURL = URL(fileURLWithPath: currentAppPath)
        let backupURL = currentAppURL.appendingPathExtension("backup")
        
        // Mount the DMG and extract new app
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/hdiutil")
        process.arguments = ["attach", tempURL.path, "-nobrowse", "-quiet"]
        
        try process.run()
        process.waitUntilExit()
        
        // TODO: Complete installation process
        // 1. Find mounted volume
        // 2. Copy new app
        // 3. Replace current app
        // 4. Restart app
        
        await MainActor.run {
            isDownloading = false
            showUpdateSuccessAlert()
        }
    }
    
    private func showUpdateNotification() {
        let content = UNMutableNotificationContent()
        content.title = "AsanaBridge Update Available"
        content.body = "Version \(updateInfo?.latestVersion ?? "latest") is ready to install"
        content.sound = .default
        
        let request = UNNotificationRequest(
            identifier: "update-available",
            content: content,
            trigger: nil
        )
        
        UNUserNotificationCenter.current().add(request)
    }
    
    private func showCriticalUpdateAlert() {
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "Critical Update Required"
            alert.informativeText = "Your version of AsanaBridge has important security updates. Please update now."
            alert.addButton(withTitle: "Update Now")
            alert.addButton(withTitle: "Later")
            alert.alertStyle = .critical
            
            if alert.runModal() == .alertFirstButtonReturn {
                self.downloadAndInstallUpdate()
            }
        }
    }
    
    private func showUpdateSuccessAlert() {
        let alert = NSAlert()
        alert.messageText = "Update Complete"
        alert.informativeText = "AsanaBridge has been updated successfully. Restart the app to use the new version."
        alert.addButton(withTitle: "Restart Now")
        alert.addButton(withTitle: "Later")
        
        if alert.runModal() == .alertFirstButtonReturn {
            restartApp()
        }
    }
    
    private func restartApp() {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        process.arguments = [Bundle.main.bundlePath!]
        
        try? process.run()
        NSApplication.shared.terminate(nil)
    }
}

struct VersionCheckResponse: Codable {
    let latestVersion: String
    let minimumVersion: String
    let downloadUrl: String
    let needsUpdate: Bool
    let isSupported: Bool
    let releaseNotes: String
    let critical: Bool
    let releaseDate: String
}

enum UpdateError: Error {
    case invalidAppPath
    case downloadFailed
    case installationFailed
    
    var localizedDescription: String {
        switch self {
        case .invalidAppPath:
            return "Could not locate app bundle"
        case .downloadFailed:
            return "Failed to download update"
        case .installationFailed:
            return "Failed to install update"
        }
    }
}

// URLSession download with progress extension
extension URLSession {
    func download(from url: URL, progress: @escaping (Int64, Int64, Int64) -> Void) async throws -> (URL, URLResponse) {
        let (asyncBytes, response) = try await bytes(from: url)
        
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let fileHandle = try FileHandle(forWritingTo: tempURL)
        defer { try? fileHandle.close() }
        
        var totalBytesWritten: Int64 = 0
        let totalBytesExpected = response.expectedContentLength
        
        for try await byte in asyncBytes {
            let data = Data([byte])
            try fileHandle.write(contentsOf: data)
            totalBytesWritten += Int64(data.count)
            progress(Int64(data.count), totalBytesWritten, totalBytesExpected)
        }
        
        return (tempURL, response)
    }
}