import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles.css'
import { isNativeIos } from './lib/iosBridge'
import { startSnapshotSync } from './lib/snapshot'

registerSW({ immediate: true })

/**
 * iOS 原生壳使用 capacitor:// 协议加载本地资源，深路径没有服务端重写，
 * 因此原生环境下改用 HashRouter；浏览器 / PWA 仍使用 BrowserRouter，
 * 现有的 /schedule 等地址与刷新行为完全不变。
 */
const Router = isNativeIos() ? HashRouter : BrowserRouter

const el = document.getElementById('root')
if (!el) throw new Error('#root not found')

createRoot(el).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)

// 仅 iOS 原生壳内生效：IndexedDB 变化时把快照写给小组件
startSnapshotSync()
