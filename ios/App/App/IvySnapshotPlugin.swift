import Foundation
import Capacitor
import WidgetKit

/**
 * 极小的原生桥：Web 端（src/lib/iosBridge.ts）在数据变化时调用 write(json)，
 * 这里把快照写入 App Group 共享容器，并请求 WidgetKit 刷新时间线。
 *
 * 注意：真正的刷新时机由 iOS 决定。WidgetCenter.reloadAllTimelines()
 * 只是「请求」刷新，系统可能因为电量 / 后台预算等原因延后执行。
 */
@objc(IvySnapshotPlugin)
public class IvySnapshotPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "IvySnapshotPlugin"
    public let jsName = "IvySnapshot"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise)
    ]

    @objc func write(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("缺少 json 参数")
            return
        }
        guard let data = json.data(using: .utf8) else {
            call.reject("json 编码失败")
            return
        }

        do {
            // 先解码再编码：既能校验 Web 传来的结构，也能保证写进容器的字段完整
            let snapshot = try JSONDecoder().decode(IvySnapshot.self, from: data)
            try IvySnapshotStore.save(snapshot)
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
            call.resolve(["ok": true])
        } catch IvySnapshotStore.IvySnapshotError.appGroupUnavailable {
            // App Group 没配好时不要崩，直接告诉 Web 侧失败
            call.reject("App Group 不可用，请检查 group.com.ivy.workbench 是否已启用")
        } catch {
            call.reject("写入快照失败：\(error.localizedDescription)")
        }
    }
}
