import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Ivy 成长工作台 —— Capacitor 配置
 *
 * 说明：这个配置只影响 iOS 原生壳。纯 Web 使用方式（vite dev / 静态托管）
 * 完全不受影响，PWA 与 IndexedDB 的行为保持不变。
 */
const config: CapacitorConfig = {
  // 占位 bundle id，与 ios/App.xcodeproj 中 App target 的
  // PRODUCT_BUNDLE_IDENTIFIER 保持一致
  appId: 'com.ivy.workbench',
  appName: 'Ivy 成长工作台',
  // Vite 构建产物目录
  webDir: 'dist',
  server: {
    // 原生壳内允许加载本地资源；纯 Web 部署不使用该配置
    iosScheme: 'capacitor',
  },
}

export default config
