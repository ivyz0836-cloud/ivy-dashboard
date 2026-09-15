import SwiftUI

// MARK: - 视觉语言
//
// 与 Web 端 src/styles.css 的设计令牌保持一致：
// 暖白背景 #FBF8F1 / 深绿主色 #1F4D3D / 大圆角卡片。
// 所有颜色都提供浅色 / 深色两套，由 ColorScheme 决定，
// 不使用 UIKit，便于在 Xcode 预览与 Swift 语法检查中独立编译。

public enum IvyPalette {
    // 背景
    public static let warmWhite = Color(red: 251 / 255, green: 248 / 255, blue: 241 / 255)  // #FBF8F1
    public static let warmWhiteDark = Color(red: 28 / 255, green: 32 / 255, blue: 30 / 255)

    // 表面
    public static let surface = Color.white
    public static let surfaceDark = Color(red: 38 / 255, green: 43 / 255, blue: 40 / 255)

    public static let surface2 = Color(red: 247 / 255, green: 243 / 255, blue: 234 / 255)   // #F7F3EA
    public static let surface2Dark = Color(red: 46 / 255, green: 52 / 255, blue: 48 / 255)

    // 文字
    public static let ink = Color(red: 28 / 255, green: 43 / 255, blue: 38 / 255)           // #1C2B26
    public static let inkDark = Color(red: 240 / 255, green: 244 / 255, blue: 240 / 255)

    public static let ink2 = Color(red: 85 / 255, green: 104 / 255, blue: 95 / 255)         // #55685F
    public static let ink2Dark = Color(red: 186 / 255, green: 200 / 255, blue: 192 / 255)

    public static let ink3 = Color(red: 138 / 255, green: 154 / 255, blue: 146 / 255)       // #8A9A92
    public static let ink3Dark = Color(red: 150 / 255, green: 165 / 255, blue: 157 / 255)

    // 主色：深绿
    public static let green = Color(red: 31 / 255, green: 77 / 255, blue: 61 / 255)         // #1F4D3D
    public static let greenDark = Color(red: 104 / 255, green: 184 / 255, blue: 152 / 255)

    public static let green2 = Color(red: 46 / 255, green: 107 / 255, blue: 85 / 255)       // #2E6B55
    public static let green2Dark = Color(red: 118 / 255, green: 196 / 255, blue: 164 / 255)

    public static let greenSoft = Color(red: 228 / 255, green: 239 / 255, blue: 232 / 255)  // #E4EFE8
    public static let greenSoftDark = Color(red: 39 / 255, green: 62 / 255, blue: 53 / 255)

    // 辅助色
    public static let amber = Color(red: 221 / 255, green: 154 / 255, blue: 75 / 255)        // #DD9A4B
    public static let amberDark = Color(red: 235 / 255, green: 186 / 255, blue: 118 / 255)

    public static let rose = Color(red: 201 / 255, green: 112 / 255, blue: 95 / 255)        // #C9705F
    public static let roseDark = Color(red: 232 / 255, green: 152 / 255, blue: 136 / 255)

    public static let sky = Color(red: 91 / 255, green: 143 / 255, blue: 168 / 255)         // #5B8FA8
    public static let skyDark = Color(red: 133 / 255, green: 183 / 255, blue: 205 / 255)

    public static let violet = Color(red: 125 / 255, green: 107 / 255, blue: 168 / 255)     // #7D6BA8
    public static let violetDark = Color(red: 168 / 255, green: 152 / 255, blue: 205 / 255)

    public static let teal = Color(red: 79 / 255, green: 143 / 255, blue: 128 / 255)        // #4F8F80
    public static let tealDark = Color(red: 122 / 255, green: 186 / 255, blue: 172 / 255)

    // MARK: 语义色

    public static func background(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? warmWhiteDark : warmWhite
    }

    public static func cardBackground(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? surfaceDark : surface
    }

    public static func softBackground(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? surface2Dark : surface2
    }

    public static func primaryText(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? inkDark : ink
    }

    public static func secondaryText(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? ink2Dark : ink2
    }

    public static func tertiaryText(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? ink3Dark : ink3
    }

    public static func accent(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? greenDark : green
    }

    public static func accentSoft(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? greenSoftDark : greenSoft
    }

    /// 事件颜色键 → SwiftUI 颜色
    public static func eventColor(_ key: String, _ scheme: ColorScheme) -> Color {
        switch key {
        case "amber": return scheme == .dark ? amberDark : amber
        case "rose": return scheme == .dark ? roseDark : rose
        case "sky": return scheme == .dark ? skyDark : sky
        case "violet": return scheme == .dark ? violetDark : violet
        case "teal": return scheme == .dark ? tealDark : teal
        default: return scheme == .dark ? green2Dark : green2
        }
    }

    /// 进度条配色：运动 / 饮食 / 英语 / 阅读
    public static func progressColor(_ label: String, _ scheme: ColorScheme) -> Color {
        switch label {
        case "运动": return scheme == .dark ? green2Dark : green2
        case "饮食": return scheme == .dark ? amberDark : amber
        case "英语": return scheme == .dark ? violetDark : violet
        case "阅读": return scheme == .dark ? skyDark : sky
        default: return accent(scheme)
        }
    }
}

// MARK: - 圆角

public enum IvyRadius {
    public static let card: CGFloat = 22
    public static let chip: CGFloat = 12
    public static let pill: CGFloat = 999
}

// MARK: - 环形进度

public struct IvyRing: View {
    @Environment(\.colorScheme) private var scheme

    public let ratio: Double
    public let lineWidth: CGFloat

    public init(ratio: Double, lineWidth: CGFloat = 8) {
        self.ratio = min(max(ratio, 0), 1)
        self.lineWidth = lineWidth
    }

    public var body: some View {
        ZStack {
            Circle()
                .stroke(IvyPalette.accentSoft(scheme), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: ratio)
                .stroke(IvyPalette.accent(scheme), style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

// MARK: - 进度条

public struct IvyProgressBar: View {
    @Environment(\.colorScheme) private var scheme

    public let ratio: Double
    public let tint: Color
    public let height: CGFloat

    public init(ratio: Double, tint: Color, height: CGFloat = 6) {
        self.ratio = min(max(ratio, 0), 1)
        self.tint = tint
        self.height = height
    }

    public var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(IvyPalette.softBackground(scheme))
                Capsule()
                    .fill(tint)
                    .frame(width: max(0, geo.size.width * ratio))
            }
        }
        .frame(height: height)
    }
}

// MARK: - 卡片容器

public struct IvyCard<Content: View>: View {
    @Environment(\.colorScheme) private var scheme

    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        content
            .padding(12)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(IvyPalette.cardBackground(scheme))
            .clipShape(RoundedRectangle(cornerRadius: IvyRadius.card, style: .continuous))
    }
}

// MARK: - 小行（一条日程 / 任务）

public struct IvyItemRow: View {
    @Environment(\.colorScheme) private var scheme
    /// 动态字号：跟随系统的「辅助功能-字体大小」
    @ScaledMetric(relativeTo: .footnote) private var dotSize: CGFloat = 7

    public let item: IvyItem

    public init(item: IvyItem) {
        self.item = item
    }

    public var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 7) {
            Circle()
                .fill(item.done ? IvyPalette.tertiaryText(scheme) : IvyPalette.eventColor(item.colorKey, scheme))
                .frame(width: dotSize, height: dotSize)
            VStack(alignment: .leading, spacing: 1) {
                Text(item.title)
                    .font(.footnote)
                    .fontWeight(.semibold)
                    .foregroundColor(IvyPalette.primaryText(scheme))
                    .lineLimit(1)
                    .strikethrough(item.done)
                if !item.timeText.isEmpty {
                    Text(item.timeText)
                        .font(.caption2)
                        .foregroundColor(IvyPalette.tertiaryText(scheme))
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
    }
}

// MARK: - 进度行（大尺寸用）

public struct IvyProgressRow: View {
    @Environment(\.colorScheme) private var scheme
    @ScaledMetric(relativeTo: .caption2) private var barHeight: CGFloat = 6

    public let progress: IvyProgress

    public init(progress: IvyProgress) {
        self.progress = progress
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(progress.label)
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundColor(IvyPalette.secondaryText(scheme))
                Spacer(minLength: 0)
                Text(progress.text)
                    .font(.caption2)
                    .foregroundColor(IvyPalette.tertiaryText(scheme))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            IvyProgressBar(
                ratio: progress.ratio,
                tint: IvyPalette.progressColor(progress.label, scheme),
                height: barHeight
            )
        }
    }
}

// MARK: - 状态占位（首次启动 / 过期 / 空）

public struct IvyStatusView: View {
    @Environment(\.colorScheme) private var scheme

    public let symbol: String
    public let title: String
    public let message: String

    public init(symbol: String, title: String, message: String) {
        self.symbol = symbol
        self.title = title
        self.message = message
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: symbol)
                .font(.title3)
                .foregroundColor(IvyPalette.accent(scheme))
            Text(title)
                .font(.footnote)
                .fontWeight(.semibold)
                .foregroundColor(IvyPalette.primaryText(scheme))
            Text(message)
                .font(.caption2)
                .foregroundColor(IvyPalette.tertiaryText(scheme))
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
    }
}
