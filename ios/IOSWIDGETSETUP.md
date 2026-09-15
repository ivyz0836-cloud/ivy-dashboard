# Ivy 小组件 iOS 上手指南（IOSWIDGETSETUP.md）

这是一份**给完全没做过 iOS 的人**写的步骤说明。
跟着做一遍，你就能在模拟器里跑起来，并且安装到自己的 iPhone 上、把小组件加到桌面。

> 开始前先说清楚：
> - 这份代码里**没有**任何 Apple 账号、证书或开发者团队 ID，只有一个占位用的
>   `Personal Team`（你自己的 Apple ID）需要你在 Xcode 里选一下。
> - 我用命令行只能验证 **Swift 源码能通过类型检查** 和 **工程文件格式正确**；
>   真正的编译、签名、装到手机，必须**由你在 Xcode 里完成**。
>   下面每一步都写清楚了。

---

## 0. 你需要什么

| 项目 | 说明 |
| --- | --- |
| 一台 Mac | 必须。iOS 开发只能在 macOS 上做。 |
| Xcode 15 或更高 | Mac App Store 免费安装。本工程部署目标是 **iOS 17**。 |
| 一个 Apple ID | 你平时用的就行，不需要付费开发者账号。 |
| 一台 iPhone（可选） | 想装到真机才需要；只在模拟器上看可以跳过。 |
| CocoaPods | 只装一次：`sudo gem install cocoapods` |

---

## 1. 先构建 Web 产物

小组件的数据来自同一个 Web 应用，所以第一步一定是把前端构建出来。

```bash
cd ivy-dashboard
npm install
npm run build        # 产物在 ivy-dashboard/dist
```

> 之后每次改了前端代码并想同步到 App，就运行：
> ```bash
> npm run cap:sync    # 等价于 npm run build && cap sync ios
> ```

---

## 2. 安装 iOS 依赖（CocoaPods）

`ios/` 目录下的 `Podfile` 负责拉取 Capacitor 的原生依赖。

```bash
cd ios/App
pod install
cd ../..
```

这一步会生成 `ios/App/App.xcworkspace`。
**从第 3 步开始，永远打开 `.xcworkspace`，不要打开 `.xcodeproj`。**

---

## 3. 用 Xcode 打开工程

```bash
open ios/App/App.xcworkspace
```

或者双击 `ios/App/App.xcworkspace` 文件。

第一次打开会出现 "Trust & Open"，点 **Trust and Open**。

左侧的文件树里你应该能看到三组源码：

```
App/        主 App（Capacitor 壳 + 原生桥 + 深链）
Widget/     WidgetKit 小组件扩展
Shared/     App 和小组件共用的数据模型 IvySnapshot.swift
Podfile     CocoaPods 依赖
App.xcodeproj/
```

---

## 4. 选择 Personal Team（签名）

对 **两个** target 都要做一次：

1. 点左侧最上面的蓝色项目图标 **App**（PROJECT 那一行，不是下面的 target）
2. 中间区域选 **Signing & Capabilities**
3. 左边 TARGETS 里选 **App** → 勾选 **Automatically manage signing**
   → **Team** 下拉选择你的 Apple ID（后面会显示 `(Personal Team)`）
4. 左边 TARGETS 里选 **WidgetExtension** → 同样勾选自动签名、选同一个 Team

如果 Team 下拉里没有你的 Apple ID：
Xcode 菜单 **Settings… → Accounts → 左下角 + → Apple ID**，登录后再回来选。

> 免费账号的限制：签名的 App 在 iPhone 上 **7 天会过期**，过期后重新用 Xcode 装一次即可。
> 小组件本身不受影响，重装 App 后重新添加即可。

---

## 5. 确认 Bundle Identifier

工程里已经填好了占位值，正常情况下**不用改**：

| Target | Bundle ID |
| --- | --- |
| App | `com.ivy.workbench` |
| WidgetExtension | `com.ivy.workbench.widget` |

> 如果你要把 App 放到自己的账号下发布，建议改成你自己的前缀，
> 例如 `com.yourname.ivy` 和 `com.yourname.ivy.widget`。
> **两个都要改，且 Widget 的 ID 必须以 App 的 ID 作为前缀**（否则 Xcode 会报错）。

修改位置：Target → **General → Identity → Bundle Identifier**。

---

## 6. 开启 App Groups（最关键的一步）

App 和小组件是两个独立的进程，它们通过 **App Group 共享容器** 传数据。
**两边必须填一模一样的值**，否则小组件永远显示"还没有数据"。

对 **App** 和 **WidgetExtension** 两个 target 各做一次：

1. TARGETS 里选中 target
2. **Signing & Capabilities** 标签页
3. 左上角点 **+ Capability**
4. 搜索并双击 **App Groups**
5. 在新出现的 App Groups 区块里，勾选/添加：
   ```
   group.com.ivy.workbench
   ```
6. 同样的操作对另一个 target 再来一遍

代码里对应的文件（已经写好了，一般不用动）：

- `ios/App/App/App.entitlements`
- `ios/App/Widget/Widget.entitlements`

> 如果你想换成自己的 group 名（例如 `group.com.yourname.ivy`），
> 需要改 **三处**：上面两个 `.entitlements` 文件，
> 以及 `ios/App/Shared/IvySnapshot.swift` 里的
> `IvyAppGroup.identifier`。三处必须一致。

---

## 7. 在模拟器里运行

1. Xcode 顶部中间，把 Scheme 选成 **App**，
   右边的目标设备选一个 iPhone（例如 **iPhone 15**）
2. 按 **⌘R**（或点左上角 ▶️）
3. 第一次会编译得比较久，等它跑完

App 打开后，先在里面加一两条任务 / 日程，这样小组件才有东西可显示。

---

## 8. 在模拟器里添加小组件

- 模拟器里回到 **主屏幕**
- 长按空白处（或长按 App 图标 → 选"编辑主屏幕"）
- 等图标开始抖动后，点左上角的 **+**
- 在列表里搜索 **Ivy**（或往下找到 "Ivy 今日"）
- 选择 **小 / 中 / 大** 三种尺寸之一 → 点 **添加小组件**
- 按 **⌘⇧H** 或点 Done 完成

---

## 9. 装到自己的 iPhone 上

1. 用数据线把 iPhone 接到 Mac
2. iPhone 上：设置 → 通用 → VPN与设备管理 → 信任你的开发者证书（第一次需要）
3. Mac 上 Xcode 顶部设备列表里选你的 iPhone（第一次会在 "Discovery" 里显示，点一下配对）
4. 按 **⌘R**
5. 如果弹 "Untrusted Developer"：去 iPhone **设置 → 通用 → VPN与设备管理** 里信任你的 Apple ID，再回 Xcode 点一次 Run

之后按照第 8 步一样的操作，在手机主屏上添加小组件。

---

## 10. 刷新机制（重要，别被误导）

很多人以为"设置了 15 分钟就每 15 分钟刷新一次"，**不是的**。

真相是：

- 小组件的 `TimelineProvider` 在 `getTimeline` 里请求了
  `policy: .after(现在 + 15 分钟)` —— 这只是**告诉系统"我最快 15 分钟后想更新"**。
- **真正的刷新时机完全由 iOS 决定。** 系统会看：
  设备电量、你是不是经常看这块小组件、后台刷新预算、低电量模式……
  实际可能是 20 分钟，也可能是几小时。低电量模式下可能干脆不刷。
- 想**立刻**更新，有两种可靠办法：
  1. **打开一次 App** —— App 里数据一变就会调用
     `WidgetCenter.shared.reloadAllTimelines()` 主动请求刷新；
  2. 从桌面**删掉再重新添加**小组件。

代码位置：`ios/App/Widget/IvyWidget.swift` 的 `getTimeline`，
以及 `ios/App/App/IvySnapshotPlugin.swift` 里的 `WidgetCenter` 调用。

---

## 11. 数据是怎么流动的

```
IndexedDB (Dexie)
   │  liveQuery 订阅：任务 / 日程 / 运动 / 饮食 / 英语 / 阅读 / 心情 任一变化
   ▼
src/lib/snapshot.ts  buildSnapshot()
   │  生成紧凑 JSON
   ▼
src/lib/iosBridge.ts  writeSnapshotToWidget()
   │  Capacitor 插件 IvySnapshot.write(json)
   ▼
ios/App/IvySnapshotPlugin.swift
   │  解码校验 → 写入 App Group 共享容器
   │  → WidgetCenter.reloadAllTimelines()
   ▼
group.com.ivy.workbench/ivy_snapshot.json
   ▼
ios/Widget/IvyWidget.swift  IvyProvider.getTimeline()
   │  ivy_snapshot.json → IvySnapshot（Codable）
   ▼
SwiftUI 渲染 小 / 中 / 大 三种尺寸
```

---

## 12. 三种小组件分别显示什么

| 尺寸 | 内容 |
| --- | --- |
| **小 Small** | 中文日期（Asia/Shanghai）+ 任务完成率圆环 + 下一项日程；点击 → 打开"今日" |
| **中 Medium** | 完成率圆环 + 接下来 3 项（日程/任务，可单独点击）+ 每日 30 分钟运动目标进度；点空白 → 打开"日程" |
| **大 Large** | 今日议程时间轴（可单独点击）+ 运动 / 饮食 / 英语 / 阅读四条进度；点空白 → 打开"日程" |

- 深链格式：`ivy://today`、`ivy://schedule`、`ivy://task/<id>`、`ivy://event/<id>`
- 原生侧在 `ios/App/App/AppDelegate.swift` 的 `IvyDeepLink` 里翻译成 App 内的 hash 路由

---

## 13. 三种"没内容"的状态（都是真实的，不是假数据）

小组件不会显示任何写死的演示内容，它会如实告诉你发生了什么：

| 状态 | 触发条件 | 显示 |
| --- | --- | --- |
| **首次启动** | 共享容器里还没有 `ivy_snapshot.json` | "还没有数据 / 打开 Ivy 一次…" |
| **已过期** | 快照不是今天，或超过 6 小时没更新 | "数据可能已过期 / 打开 App 会自动刷新" |
| **今天没安排** | 有快照，但今天没有任何任务和日程 | "今天还没有安排 / 添加任务或日程后会显示进度" |

> Xcode 画布里的示例数据来自 `IvySnapshot.previewSample()`，
> 它被 `#if DEBUG` 包着，**只在预览里存在**，不会进 Release 包，也不会写到共享容器。

---

## 14. 常见问题

**Q：小组件一直显示"还没有数据"**
A：99% 是 App Group 没配对。回到第 6 步，确认 App 和 WidgetExtension
两个 target 用的 group 名**完全一致**，并且和 `IvySnapshot.swift` 里的
`IvyAppGroup.identifier` 一致。然后删掉 App 重装一次。

**Q：改了数据，小组件不更新**
A：看第 10 步。先打开一次 App 触发同步；还不行就删掉小组件重新添加。

**Q：Xcode 报 "Command CodeSign failed" / "Provisioning profile doesn't include…"**
A：回到第 4 步，确认**两个** target 都选了 Team 且勾选了自动签名。
Widget 的 Bundle ID 必须是 App 的前缀 + 后缀。

**Q：`pod install` 报找不到 CocoaPods**
A：`sudo gem install cocoapods`，装完重新执行。

**Q：我想换 App Group 名字**
A：改三处，见第 6 步末尾。

**Q：能不能上架 App Store**
A：可以，但需要：付费开发者账号、把 Bundle ID 和 App Group 改成你自己的、
准备 App 图标和截图、走 App Store Connect 流程。这份代码只是把工程骨架搭好了。

---

## 15. 文件清单

```
ivy-dashboard/
├── capacitor.config.ts              # Capacitor 配置（appId / webDir）
├── src/lib/snapshot.ts              # 生成给小组件的 JSON 快照
├── src/lib/iosBridge.ts             # 调原生插件的桥（非 iOS 下空转）
└── ios/
    └── ios/
        ├── IOSWIDGETSETUP.md            # 就是这份文档
        └── App/                          # ← Xcode 工程根目录（Capacitor 约定）
            ├── App.xcodeproj/            # Xcode 工程（App + Widget 两个 target）
            ├── Podfile                   # CocoaPods 依赖（在这里 pod install）
            ├── App/
            │   ├── AppDelegate.swift     # 应用入口 + 深链处理
            │   ├── IvySnapshotPlugin.swift # 原生桥：写快照 + 请求刷新
            │   ├── Info.plist            # 含 ivy:// URL Scheme
            │   ├── App.entitlements      # App Group
            │   └── Assets.xcassets/      # 图标与主题色
            ├── Widget/
            │   ├── IvyWidgetBundle.swift # @main 入口
            │   ├── IvyWidget.swift       # Widget + TimelineProvider
            │   ├── IvyWidgetViews.swift  # 小 / 中 / 大 三种视图
            │   ├── IvyWidgetDesign.swift # 配色、圆环、进度条（浅色/深色）
            │   ├── IvyWidgetPreviews.swift # Xcode 预览（仅 DEBUG）
            │   ├── Info.plist
            │   └── Widget.entitlements   # App Group
            └── Shared/
                └── IvySnapshot.swift     # 共享 Codable 模型 + 读写 + Asia/Shanghai
```
