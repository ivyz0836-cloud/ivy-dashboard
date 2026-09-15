# Ivy 成长工作台

一个完全本地存储的个人成长仪表盘：每日任务、30 分钟运动、饮食、学习、复盘总结，外加今日/周/月日程日历。

## 功能

- **今日总览**：当天任务完成情况、日程安排、运动/饮食/学习进度一屏看完
- **日程日历**：今日时间轴（含当前时间线）、周视图（周一起算、全天行）、月视图（高亮今天、彩色标签、+N 更多），支持全天/时段/分类配色/地点/备注/提醒/每日·每周·每月重复
- **运动**：记录每日运动时长与类型，追踪 30 分钟目标
- **饮食**：三餐记录与热量概览
- **学习**：阅读、英语等学习打卡与时长
- **复盘总结**：周/月/年汇总，含任务完成率、日程数量与计划时长
- **iOS 小组件**：小/中/大三种尺寸的原生 SwiftUI 桌面小组件（`ios/` 目录）

## 技术栈

React 18 + Vite 5 + TypeScript · Dexie（IndexedDB，数据全在本地）· React Router · lucide-react 图标 · Capacitor（iOS 打包）· vite-plugin-pwa（可安装为 PWA）

## 本地运行

```bash
npm install
npm run dev      # 开发服务器 http://localhost:5173
npm run build    # 生产构建，输出到 dist/
npm run lint     # 代码检查
```

> 数据保存在浏览器 IndexedDB 中，不会上传到任何服务器；换浏览器或清理缓存会丢失，建议定期在「设置」里导出备份。

## 在线地址

推送到 `main` 分支后，GitHub Actions 会自动构建并部署到 GitHub Pages：

**https://ivyz0836-cloud.github.io/ivy-dashboard/**

首次使用需在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。

## iOS 小组件

需要 macOS + Xcode。详见 [ios/IOSWIDGETSETUP.md](ios/IOSWIDGETSETUP.md)：

```bash
npm run cap:sync   # 构建并同步到 iOS 工程
npm run cap:open   # 在 Xcode 中打开
```

两个 Target（App 与 WidgetExtension）都需打开 App Group `group.com.ivy.workbench`，并各选一个签名团队。

## 目录结构

```
src/
  pages/        今日、日程、运动、饮食、学习、复盘、设置
  components/   任务板、图表、弹层、UI 基础件
  lib/          时区与日程计算、统计、iOS 快照桥接
  db/           Dexie 数据库定义与类型
ios/App/        App 与 WidgetExtension 原生工程（Swift）
scripts/        无浏览器渲染冒烟测试
```
