import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    /// 小组件点击 / 外部 scheme 都会走到这里
    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        // 小组件深链：ivy://today、ivy://schedule、ivy://task/1、ivy://event/1
        if (url.scheme ?? "").lowercased() == IvyAppGroup.urlScheme {
            IvyDeepLink.shared.handle(url)
            return true
        }
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(
            application,
            continue: userActivity,
            restorationHandler: restorationHandler
        )
    }
}

// MARK: - 深链处理
//
// 小组件通过 widgetURL / Link 打开 ivy://... ，这里翻译成 WebView 内的
// hash 路由（原生壳使用 HashRouter）。WebView 可能还没加载完成，
// 所以做了几次「尽力而为」的重试。

final class IvyDeepLink {

    static let shared = IvyDeepLink()
    private init() {}

    /// ivy:// 深链 → App 内 hash 路由
    func route(for url: URL) -> String {
        let host = (url.host ?? "").lowercased()
        // 只允许数字，避免把任意字符拼进 JS 字符串
        let id = url.lastPathComponent.filter { $0.isNumber }
        switch host {
        case "schedule":
            return "#/schedule"
        case "task":
            return id.isEmpty ? "#/" : "#/?task=\(id)"
        case "event":
            return id.isEmpty ? "#/schedule" : "#/schedule?event=\(id)"
        default:
            return "#/"
        }
    }

    func handle(_ url: URL) {
        apply(hash: route(for: url), attempt: 0)
    }

    private func apply(hash: String, attempt: Int) {
        let delay = attempt == 0 ? 0.15 : 0.6
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            if let webView = self.capacitorWebView() {
                let script =
                    "if (window.location.hash !== '\(hash)') { window.location.hash = '\(hash)'; } void 0;"
                webView.evaluateJavaScript(script, completionHandler: nil)
            } else if attempt < 6 {
                self.apply(hash: hash, attempt: attempt + 1)
            }
        }
    }

    private func capacitorWebView() -> WKWebView? {
        let keyWindow = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }
        return (keyWindow?.rootViewController as? CAPBridgeViewController)?.webView
    }
}
