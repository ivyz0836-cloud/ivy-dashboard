import SwiftUI
import WidgetKit

// MARK: - Timeline Entry

struct IvyEntry: TimelineEntry {
    let date: Date
    let snapshot: IvySnapshot
}

// MARK: - TimelineProvider

struct IvyProvider: TimelineProvider {
    /// 占位数据：小组件首次加载 / 数据还没准备好时显示。
    /// 这里刻意使用「空快照」而不是演示数据 —— 宁可显示「还没有数据」，
    /// 也不要让用户误以为自己真的有这些安排。
    func placeholder(in context: Context) -> IvyEntry {
        IvyEntry(date: Date(), snapshot: .empty())
    }

    /// 小组件库预览：Xcode 画布里显示示例，方便调 UI。
    func getSnapshot(in context: Context, completion: @escaping (IvyEntry) -> Void) {
        #if DEBUG
        if context.isPreview {
            completion(IvyEntry(date: Date(), snapshot: .previewSample()))
            return
        }
        #endif
        completion(IvyEntry(date: Date(), snapshot: IvySnapshotStore.load() ?? .empty()))
    }

    /// 真实时间线。
    ///
    /// 关于刷新频率：这里请求「15 分钟后」再次更新，但这只是**尽力而为的建议**。
    /// 实际的刷新时机完全由 iOS 决定 —— 系统会综合考虑设备电量、用户查看小组件
    /// 的频率、后台预算等因素，可能比 15 分钟更慢，也可能更快。
    /// 想立刻更新，请在 App 内改动数据（App 会调用 WidgetCenter 主动刷新），
    /// 或直接从桌面移除再添加小组件。
    func getTimeline(in context: Context, completion: @escaping (Timeline<IvyEntry>) -> Void) {
        let snapshot = IvySnapshotStore.load() ?? .empty()
        let entry = IvyEntry(date: Date(), snapshot: snapshot)
        let nextUpdate = Date().addingTimeInterval(15 * 60)
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

// MARK: - Widget

struct IvyWidget: Widget {
    let kind: String = "IvyWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: IvyProvider()) { entry in
            IvyWidgetContainer(entry: entry)
        }
        .configurationDisplayName("Ivy 今日")
        .description("显示今天的任务完成率、下一项日程，以及运动 / 饮食 / 英语 / 阅读进度。")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - 尺寸分发

struct IvyWidgetContainer: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme

    let entry: IvyEntry

    var body: some View {
        content
            .padding(12)
            // iOS 17 起小组件需要用 containerBackground 声明背景，
            // 这样浅色 / 深色都能拿到正确的暖白底。
            .containerBackground(for: .widget) {
                IvyPalette.background(scheme)
            }
    }

    @ViewBuilder
    private var content: some View {
        switch family {
        case .systemLarge:
            IvyLargeWidget(entry: entry)
        case .systemMedium:
            IvyMediumWidget(entry: entry)
        default:
            IvySmallWidget(entry: entry)
        }
    }
}
