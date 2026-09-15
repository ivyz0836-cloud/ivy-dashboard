import Foundation

// MARK: - App Group 常量
//
// 这是「文档占位值」。真实使用时必须在 Xcode 里把 App Group 改成
// 你自己团队名下的 group（例如 group.com.yourname.ivy），并且
// App target 与 Widget Extension target 使用同一个值。
// 详见 ios/IOSWIDGETSETUP.md。

public enum IvyAppGroup {
    /// App 与 Widget 共用的 App Group 标识（占位）
    public static let identifier = "group.com.ivy.workbench"
    /// 写入共享容器的快照文件名
    public static let snapshotFileName = "ivy_snapshot.json"
    /// 快照格式版本
    public static let snapshotVersion = 1

    /// 深链 URL scheme（与主 App Info.plist 中的 CFBundleURLSchemes 一致）
    public static let urlScheme = "ivy"

    public static func deepLink(to path: String) -> URL? {
        URL(string: "\(urlScheme)://\(path)")
    }
}

// MARK: - 快照模型
//
// 字段与 Web 侧 src/lib/snapshot.ts 的 IvySnapshotPayload 一一对应，
// 改字段名时必须两侧同时修改。

public struct IvyDateDisplay: Codable, Equatable {
    public var monthDay: String
    public var weekday: String

    public init(monthDay: String, weekday: String) {
        self.monthDay = monthDay
        self.weekday = weekday
    }
}

public struct IvyTaskSummary: Codable, Equatable {
    public var total: Int
    public var done: Int

    public init(total: Int, done: Int) {
        self.total = total
        self.done = done
    }

    /// 0...1，无任务时返回 0（而不是假装 100%）
    public var ratio: Double {
        guard total > 0 else { return 0 }
        return Double(done) / Double(total)
    }
}

public struct IvyItem: Codable, Equatable, Identifiable {
    public var id: String
    public var title: String
    public var start: String?
    public var end: String?
    public var allDay: Bool
    public var colorKey: String
    public var kind: String
    public var done: Bool
    public var link: String

    public init(
        id: String,
        title: String,
        start: String? = nil,
        end: String? = nil,
        allDay: Bool,
        colorKey: String,
        kind: String,
        done: Bool,
        link: String
    ) {
        self.id = id
        self.title = title
        self.start = start
        self.end = end
        self.allDay = allDay
        self.colorKey = colorKey
        self.kind = kind
        self.done = done
        self.link = link
    }

    public var isTask: Bool { kind == "task" }

    /// 右侧显示的时间文案
    public var timeText: String {
        if allDay { return "全天" }
        if let s = start, let e = end, !s.isEmpty, !e.isEmpty { return "\(s)–\(e)" }
        if let s = start, !s.isEmpty { return s }
        return ""
    }

    public var deepLinkURL: URL? {
        URL(string: link)
    }
}

public struct IvyProgress: Codable, Equatable {
    public var value: Double
    public var goal: Double
    public var unit: String
    public var label: String

    public init(value: Double, goal: Double, unit: String, label: String) {
        self.value = value
        self.goal = goal
        self.unit = unit
        self.label = label
    }

    /// 0...1，目标为 0 时返回 0，避免除零
    public var ratio: Double {
        guard goal > 0 else { return 0 }
        return min(max(value / goal, 0), 1)
    }

    public var text: String {
        let v = IvyFormat.number(value)
        let g = IvyFormat.number(goal)
        return "\(v)/\(g) \(unit)"
    }
}

public struct IvySnapshot: Codable, Equatable {
    public var version: Int
    /// epoch 秒
    public var generatedAt: TimeInterval
    public var dateKey: String
    public var display: IvyDateDisplay
    public var tasks: IvyTaskSummary
    public var nextItems: [IvyItem]
    public var agenda: [IvyItem]
    public var exercise: IvyProgress
    public var food: IvyProgress
    public var english: IvyProgress
    public var reading: IvyProgress
    public var mood: Int?
    public var hasData: Bool

    public init(
        version: Int = IvyAppGroup.snapshotVersion,
        generatedAt: TimeInterval = 0,
        dateKey: String = "",
        display: IvyDateDisplay = IvyDateDisplay(monthDay: "", weekday: ""),
        tasks: IvyTaskSummary = IvyTaskSummary(total: 0, done: 0),
        nextItems: [IvyItem] = [],
        agenda: [IvyItem] = [],
        exercise: IvyProgress = IvyProgress(value: 0, goal: 30, unit: "分钟", label: "运动"),
        food: IvyProgress = IvyProgress(value: 0, goal: 1800, unit: "千卡", label: "饮食"),
        english: IvyProgress = IvyProgress(value: 0, goal: 30, unit: "词/分", label: "英语"),
        reading: IvyProgress = IvyProgress(value: 0, goal: 20, unit: "页", label: "阅读"),
        mood: Int? = nil,
        hasData: Bool = false
    ) {
        self.version = version
        self.generatedAt = generatedAt
        self.dateKey = dateKey
        self.display = display
        self.tasks = tasks
        self.nextItems = nextItems
        self.agenda = agenda
        self.exercise = exercise
        self.food = food
        self.english = english
        self.reading = reading
        self.mood = mood
        self.hasData = hasData
    }
}

// MARK: - 状态判定

public extension IvySnapshot {
    /// 首次启动 / 还没有任何一次同步
    var isFirstLaunch: Bool { dateKey.isEmpty && generatedAt == 0 }

    /// 快照不是今天（Asia/Shanghai）的 —— 视为过期
    var isStaleDay: Bool {
        guard !dateKey.isEmpty else { return true }
        return dateKey != IvyCalendar.shanghaiDateKey()
    }

    /// 距今超过 6 小时没有更新 —— 视为过期
    var isStaleByTime: Bool {
        guard generatedAt > 0 else { return true }
        return Date().timeIntervalSince1970 - generatedAt > 6 * 60 * 60
    }

    var isStale: Bool { isStaleDay || isStaleByTime }

    /// 「没有内容」：既没有任务也没有日程和记录
    var isEmpty: Bool { !hasData }

    /// 供 UI 判断该显示什么状态
    enum DisplayState {
        case firstLaunch
        case stale
        case empty
        case content
    }

    var displayState: DisplayState {
        if isFirstLaunch { return .firstLaunch }
        if isStale { return .stale }
        if isEmpty { return .empty }
        return .content
    }

    /// 空状态占位（placeholder 使用，不含任何演示数据）
    static func empty() -> IvySnapshot {
        IvySnapshot(
            generatedAt: 0,
            dateKey: "",
            display: IvyDateDisplay(monthDay: "", weekday: ""),
            tasks: IvyTaskSummary(total: 0, done: 0)
        )
    }
}

// MARK: - 日期（Asia/Shanghai）

public enum IvyCalendar {
    public static let shanghai: TimeZone = {
        TimeZone(identifier: "Asia/Shanghai") ?? .current
    }()

    /// 当前上海日期，格式 yyyy-MM-dd
    public static func shanghaiDateKey(_ date: Date = Date()) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = shanghai
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    /// "9 月 13 日"
    public static func monthDayText(_ date: Date = Date()) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "zh_CN")
        f.timeZone = shanghai
        f.dateFormat = "M 月 d 日"
        return f.string(from: date)
    }

    /// "周日"
    public static func weekdayText(_ date: Date = Date()) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "zh_CN")
        f.timeZone = shanghai
        f.dateFormat = "EEEE"
        return f.string(from: date)
    }

    /// 当天的中文日期显示（用于小组件顶部）
    public static func todayDisplay() -> IvyDateDisplay {
        IvyDateDisplay(monthDay: monthDayText(), weekday: weekdayText())
    }
}

// MARK: - 数字格式化

public enum IvyFormat {
    /// 整数不显示小数点，例如 30 而不是 30.0
    public static func number(_ value: Double) -> String {
        if value.rounded() == value {
            return String(Int(value))
        }
        return String(format: "%.1f", value)
    }
}

// MARK: - 读写共享容器

public enum IvySnapshotStore {
    /// App Group 共享容器中的快照文件地址；App Group 不可用时返回 nil
    /// （例如模拟器未配置 App Group，或 entitlements 未生效）
    public static var fileURL: URL? {
        let base = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: IvyAppGroup.identifier
        )
        return base?.appendingPathComponent(IvyAppGroup.snapshotFileName)
    }

    /// 读取快照；文件不存在或解析失败返回 nil
    public static func load() -> IvySnapshot? {
        guard let url = fileURL else { return nil }
        guard let data = try? Data(contentsOf: url) else { return nil }
        let decoder = JSONDecoder()
        guard let snap = try? decoder.decode(IvySnapshot.self, from: data) else { return nil }
        return snap
    }

    /// 写入快照（原子写，避免小组件读到半个文件）
    public static func save(_ snapshot: IvySnapshot) throws {
        guard let url = fileURL else {
            throw IvySnapshotError.appGroupUnavailable
        }
        let encoder = JSONEncoder()
        let data = try encoder.encode(snapshot)
        try data.write(to: url, options: .atomic)
    }

    public enum IvySnapshotError: Error {
        case appGroupUnavailable
    }
}

// MARK: - Xcode 预览专用示例
//
// 注意：下面的示例数据只在 Xcode 的 #Preview 画布里使用，
// 不会被写进 App，也不会作为任何默认/演示数据出现在真机小组件上。

#if DEBUG
public extension IvySnapshot {
    static func previewSample() -> IvySnapshot {
        let now = Date().timeIntervalSince1970
        return IvySnapshot(
            generatedAt: now,
            dateKey: IvyCalendar.shanghaiDateKey(),
            display: IvyCalendar.todayDisplay(),
            tasks: IvyTaskSummary(total: 8, done: 5),
            nextItems: [
                IvyItem(id: "e1", title: "高等数学课", start: "10:00", end: "11:40", allDay: false,
                        colorKey: "green", kind: "event", done: false, link: "ivy://event/1"),
                IvyItem(id: "t2", title: "背 30 个英语单词", allDay: true,
                        colorKey: "green", kind: "task", done: false, link: "ivy://task/2"),
                IvyItem(id: "e3", title: "30 分钟普拉提", start: "18:00", end: "18:30", allDay: false,
                        colorKey: "teal", kind: "event", done: false, link: "ivy://event/3"),
            ],
            agenda: [
                IvyItem(id: "e0", title: "早读：外刊精读", start: "07:30", end: "08:00", allDay: false,
                        colorKey: "sky", kind: "event", done: true, link: "ivy://event/0"),
                IvyItem(id: "e1", title: "高等数学课", start: "10:00", end: "11:40", allDay: false,
                        colorKey: "green", kind: "event", done: false, link: "ivy://event/1"),
                IvyItem(id: "e3", title: "30 分钟普拉提", start: "18:00", end: "18:30", allDay: false,
                        colorKey: "teal", kind: "event", done: false, link: "ivy://event/3"),
            ],
            exercise: IvyProgress(value: 30, goal: 30, unit: "分钟", label: "运动"),
            food: IvyProgress(value: 1180, goal: 1800, unit: "千卡", label: "饮食"),
            english: IvyProgress(value: 45, goal: 30, unit: "词/分", label: "英语"),
            reading: IvyProgress(value: 12, goal: 20, unit: "页", label: "阅读"),
            mood: 4,
            hasData: true
        )
    }
}
#endif
