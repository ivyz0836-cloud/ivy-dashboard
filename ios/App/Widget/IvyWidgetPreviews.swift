import SwiftUI
import WidgetKit

// 整个文件只在 Debug 下参与编译，Release 构建不会包含预览代码。
#if DEBUG

// MARK: - Xcode 预览
//
// 下面的示例数据只在 Xcode 画布里使用（DEBUG + previewSample），
// 不会写入 App，也不会作为任何默认 / 演示数据出现在真机小组件上。
//
// 前三个用 Widget 级预览（最贴近真机渲染）；
// 后两个用 View 级预览，方便叠加深色模式与动态字号修饰符。

#Preview("小尺寸 Small", as: .systemSmall) {
    IvyWidget()
} timeline: {
    IvyEntry(date: .now, snapshot: .previewSample())
    IvyEntry(date: .now, snapshot: .empty())
}

#Preview("中尺寸 Medium", as: .systemMedium) {
    IvyWidget()
} timeline: {
    IvyEntry(date: .now, snapshot: .previewSample())
    IvyEntry(date: .now, snapshot: .empty())
}

#Preview("大尺寸 Large", as: .systemLarge) {
    IvyWidget()
} timeline: {
    IvyEntry(date: .now, snapshot: .previewSample())
    IvyEntry(date: .now, snapshot: .empty())
}

#Preview("深色模式（大 / 中 / 小）") {
    VStack(spacing: 16) {
        IvyWidgetContainer(entry: IvyEntry(date: .now, snapshot: .previewSample()))
    }
    .frame(width: 340, height: 380)
    .preferredColorScheme(.dark)
}

#Preview("动态字号 · 超大") {
    IvyWidgetContainer(entry: IvyEntry(date: .now, snapshot: .previewSample()))
        .frame(width: 340, height: 170)
        .dynamicTypeSize(.accessibility3)
}

#Preview("空状态 / 首次启动") {
    IvyWidgetContainer(entry: IvyEntry(date: .now, snapshot: .empty()))
        .frame(width: 170, height: 170)
}

#endif
