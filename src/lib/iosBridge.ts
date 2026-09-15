import { Capacitor, registerPlugin } from '@capacitor/core'

/**
 * 与 iOS 原生侧 IvySnapshotPlugin 对应的极小桥接。
 *
 * - 纯 Web（浏览器 / PWA）下：isNativeIos() 为 false，所有调用直接返回，
 *   不会引入任何行为变化。
 * - iOS 原生壳内：把紧凑 JSON 快照交给原生，由原生写入 App Group
 *   共享容器并触发 WidgetCenter 刷新。
 */

export interface IvySnapshotBridge {
  write(options: { json: string }): Promise<{ ok: boolean }>
}

const IvySnapshotNative = registerPlugin<IvySnapshotBridge>('IvySnapshot')

/** 是否运行在 iOS 原生壳内 */
export function isNativeIos(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
  } catch {
    return false
  }
}

/** 把快照写入 App Group 共享容器（失败静默，不影响 Web 功能） */
export async function writeSnapshotToWidget(json: string): Promise<boolean> {
  if (!isNativeIos()) return false
  try {
    const res = await IvySnapshotNative.write({ json })
    return res?.ok === true
  } catch {
    // 原生插件不可用（例如跑在模拟器但桥未注册）时忽略
    return false
  }
}
