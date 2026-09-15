import SwiftUI
import WidgetKit

/// 小尺寸：日期 + 任务完成环 + 下一项日程
struct IvySmallWidget: View {
    @Environment(\.colorScheme) private var scheme

    let entry: IvyEntry

    var body: some View {
        IvyCard {
            switch entry.snapshot.displayState {
            case .firstLaunch:
                IvyStatusView(
                    symbol: "arrow.triangle.2.circlepath",
                    title: "还没有数据",
                    message: "打开 Ivy 一次，小组件就会显示今天的任务与日程。"
                )
            case .stale:
                IvyStatusView(
                    symbol: "clock.badge.exclamationmark",
                    title: "数据可能已过期",
                    message: "上次同步不是今天，打开 App 会自动刷新。"
                )
            case .empty:
                IvyStatusView(
                    symbol: "leaf",
                    title: "今天还没有安排",
                    message: "在 App 里添加任务或日程后，这里会显示进度。"
                )
            case .content:
                contentView
            }
        }
        .widgetURL(URL(string: "ivy://today"))
    }

    private var contentView: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(entry.snapshot.display.weekday)
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(IvyPalette.accent(scheme))
                    Text(entry.snapshot.display.monthDay)
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(IvyPalette.primaryText(scheme))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                Spacer(minLength: 0)
                ZStack {
                    IvyRing(ratio: entry.snapshot.tasks.ratio, lineWidth: 7)
                        .frame(width: 44, height: 44)
                    VStack(spacing: -2) {
                        Text(percentText)
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(IvyPalette.primaryText(scheme))
                            .minimumScaleFactor(0.6)
                        Text("完成")
                            .font(.system(size: 7))
                            .foregroundColor(IvyPalette.tertiaryText(scheme))
                    }
                }
            }

            Divider().background(IvyPalette.softBackground(scheme))

            if let next = entry.snapshot.nextItems.first {
                VStack(alignment: .leading, spacing: 2) {
                    Text("下一项")
                        .font(.system(size: 8))
                        .foregroundColor(IvyPalette.tertiaryText(scheme))
                    Text(next.timeText.isEmpty ? "全天" : next.timeText)
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(IvyPalette.eventColor(next.colorKey, scheme))
                        .lineLimit(1)
                    Text(next.title)
                        .font(.footnote)
                        .fontWeight(.semibold)
                        .foregroundColor(IvyPalette.primaryText(scheme))
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            } else {
                Text("今天没有待办了 🎉")
                    .font(.footnote)
                    .foregroundColor(IvyPalette.secondaryText(scheme))
            }
            Spacer(minLength: 0)
        }
    }

    private var percentText: String {
        "\(Int((entry.snapshot.tasks.ratio * 100).rounded()))%"
    }
}

/// 中尺寸：完成率 + 接下来三项 + 每日 30 分钟运动目标
struct IvyMediumWidget: View {
    @Environment(\.colorScheme) private var scheme

    let entry: IvyEntry

    var body: some View {
        IvyCard {
            switch entry.snapshot.displayState {
            case .firstLaunch:
                IvyStatusView(
                    symbol: "arrow.triangle.2.circlepath",
                    title: "还没有数据",
                    message: "打开一次 Ivy App，小组件会自动拿到今天的任务、日程与运动目标。"
                )
            case .stale:
                IvyStatusView(
                    symbol: "clock.badge.exclamationmark",
                    title: "数据可能已过期",
                    message: "上次同步不是今天或已超过 6 小时。打开 App 即可刷新，iOS 也会按自己的节奏更新小组件。"
                )
            case .empty:
                IvyStatusView(
                    symbol: "leaf",
                    title: "今天还没有安排",
                    message: "添加任务、日程或记录一次运动，这里会显示接下来的三项与完成率。"
                )
            case .content:
                contentView
            }
        }
        .widgetURL(URL(string: "ivy://schedule"))
    }

    private var contentView: some View {
        HStack(alignment: .top, spacing: 14) {
            // 左：日期 + 完成环
            VStack(spacing: 6) {
                Text(entry.snapshot.display.monthDay)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(IvyPalette.primaryText(scheme))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(entry.snapshot.display.weekday)
                    .font(.caption2)
                    .foregroundColor(IvyPalette.secondaryText(scheme))
                ZStack {
                    IvyRing(ratio: entry.snapshot.tasks.ratio, lineWidth: 8)
                        .frame(width: 66, height: 66)
                    VStack(spacing: -2) {
                        Text("\(Int((entry.snapshot.tasks.ratio * 100).rounded()))")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(IvyPalette.primaryText(scheme))
                            .minimumScaleFactor(0.6)
                        Text("%")
                            .font(.caption2)
                            .foregroundColor(IvyPalette.tertiaryText(scheme))
                    }
                }
                Text("\(entry.snapshot.tasks.done)/\(entry.snapshot.tasks.total) 项")
                    .font(.caption2)
                    .foregroundColor(IvyPalette.tertiaryText(scheme))
                    .lineLimit(1)
            }
            .frame(width: 86)

            // 右：接下来三项 + 运动目标
            VStack(alignment: .leading, spacing: 8) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("接下来")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(IvyPalette.tertiaryText(scheme))
                    ForEach(entry.snapshot.nextItems) { item in
                        Link(destination: item.deepLinkURL ?? URL(string: "ivy://today")!) {
                            IvyItemRow(item: item)
                        }
                    }
                }
                Spacer(minLength: 2)
                Divider().background(IvyPalette.softBackground(scheme))
                IvyProgressRow(progress: entry.snapshot.exercise)
            }
        }
    }
}

/// 大尺寸：今日议程时间轴 + 运动 / 饮食 / 英语 / 阅读进度
struct IvyLargeWidget: View {
    @Environment(\.colorScheme) private var scheme

    let entry: IvyEntry

    var body: some View {
        IvyCard {
            switch entry.snapshot.displayState {
            case .firstLaunch:
                IvyStatusView(
                    symbol: "arrow.triangle.2.circlepath",
                    title: "还没有数据",
                    message: "打开一次 Ivy App。之后这里会显示今天的议程时间轴，以及运动、饮食、英语、阅读四项进度。"
                )
            case .stale:
                IvyStatusView(
                    symbol: "clock.badge.exclamationmark",
                    title: "数据可能已过期",
                    message: "当前展示的可能是上一次同步的内容。打开 App 会立即写入新快照并请求刷新。"
                )
            case .empty:
                IvyStatusView(
                    symbol: "leaf",
                    title: "今天还没有安排",
                    message: "日程、任务、运动、饮食、英语、阅读任一有记录后，这里会显示完整的一天。"
                )
            case .content:
                contentView
            }
        }
        .widgetURL(URL(string: "ivy://schedule"))
    }

    private var contentView: some View {
        VStack(alignment: .leading, spacing: 10) {
            // 顶部：日期 + 完成率
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("\(entry.snapshot.display.monthDay) \(entry.snapshot.display.weekday)")
                        .font(.footnote)
                        .fontWeight(.bold)
                        .foregroundColor(IvyPalette.primaryText(scheme))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text("任务完成 \(entry.snapshot.tasks.done)/\(entry.snapshot.tasks.total)")
                        .font(.caption2)
                        .foregroundColor(IvyPalette.tertiaryText(scheme))
                }
                Spacer(minLength: 0)
                IvyRing(ratio: entry.snapshot.tasks.ratio, lineWidth: 6)
                    .frame(width: 34, height: 34)
            }

            Divider().background(IvyPalette.softBackground(scheme))

            // 议程时间轴
            VStack(alignment: .leading, spacing: 0) {
                Text("今日议程")
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundColor(IvyPalette.tertiaryText(scheme))
                    .padding(.bottom, 4)

                if entry.snapshot.agenda.isEmpty {
                    Text("今天没有日程")
                        .font(.caption)
                        .foregroundColor(IvyPalette.secondaryText(scheme))
                } else {
                    ForEach(entry.snapshot.agenda.indices, id: \.self) { index in
                        let item = entry.snapshot.agenda[index]
                        Link(destination: item.deepLinkURL ?? URL(string: "ivy://schedule")!) {
                            agendaRow(item: item, isLast: index == entry.snapshot.agenda.count - 1)
                        }
                    }
                }
            }

            Spacer(minLength: 0)

            // 四项进度
            VStack(spacing: 7) {
                IvyProgressRow(progress: entry.snapshot.exercise)
                IvyProgressRow(progress: entry.snapshot.food)
                IvyProgressRow(progress: entry.snapshot.english)
                IvyProgressRow(progress: entry.snapshot.reading)
            }
        }
    }

    private func agendaRow(item: IvyItem, isLast: Bool) -> some View {
        HStack(alignment: .top, spacing: 8) {
            // 时间轴：竖线 + 圆点
            VStack(spacing: 0) {
                Circle()
                    .fill(item.done ? IvyPalette.tertiaryText(scheme) : IvyPalette.eventColor(item.colorKey, scheme))
                    .frame(width: 7, height: 7)
                if !isLast {
                    Rectangle()
                        .fill(IvyPalette.softBackground(scheme))
                        .frame(width: 1.5)
                }
            }
            .frame(width: 8)

            HStack(alignment: .firstTextBaseline) {
                Text(item.timeText.isEmpty ? "全天" : item.timeText)
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundColor(IvyPalette.eventColor(item.colorKey, scheme))
                    .frame(width: 62, alignment: .leading)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(item.title)
                    .font(.caption)
                    .foregroundColor(IvyPalette.primaryText(scheme))
                    .lineLimit(1)
                    .strikethrough(item.done)
                Spacer(minLength: 0)
            }
            .padding(.bottom, 6)
        }
    }
}
