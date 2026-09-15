/**
 * 无浏览器环境下的真实渲染冒烟测试。
 *
 * 从已部署的公网地址抓取 index.html，用 jsdom 执行真实生产 bundle，
 * 捕获运行时报错并检查 React 是否成功挂载。
 *
 * 用法：node scripts/smoke.mjs <baseUrl> [path]
 */
import { createRequire } from 'node:module'
const require = createRequire('/Users/ivyzhang/.workbuddy/binaries/node/workspace/package.json')
const { JSDOM, VirtualConsole } = require('jsdom')
const { indexedDB, IDBKeyRange } = require('fake-indexeddb')

const base = process.argv[2] ?? 'http://127.0.0.1:5173'
const paths = process.argv.slice(3).length ? process.argv.slice(3) : ['/', '/schedule', '/move', '/food', '/learn', '/review', '/settings']

const errors = []
const warnings = []

async function check(path) {
  const url = base.replace(/\/$/, '') + path
  const html = await (await fetch(url)).text()

  const vc = new VirtualConsole()
  vc.on('jsdomError', (e) => {
    // 忽略 jsdom 自身不支持的 CSS/资源解析噪声
    if (/Could not parse CSS|Not implemented/.test(e.message)) return
    errors.push(`[${path}] jsdomError: ${e.message}`)
  })
  vc.on('error', (...a) => errors.push(`[${path}] console.error: ${a.join(' ')}`))
  vc.on('warn', (...a) => warnings.push(`[${path}] console.warn: ${a.join(' ')}`))

  const dom = new JSDOM(html, {
    url,
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      window.indexedDB = indexedDB
      window.IDBKeyRange = IDBKeyRange
      // jsdom 没有这些浏览器 API，补最小实现避免整个应用崩溃
      window.matchMedia = window.matchMedia || ((q) => ({
        matches: false, media: q, onchange: null,
        addListener() {}, removeListener() {},
        addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false },
      }))
      window.scrollTo = () => {}
      window.HTMLElement.prototype.scrollIntoView = () => {}
      if (!window.ResizeObserver) {
        window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
      }
      if (!window.IntersectionObserver) {
        window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
      }
    },
  })

  // jsdom 不支持 type="module"，把生产 bundle 转成经典脚本后手动注入
  const win = dom.window
  const jsUrl = [...dom.window.document.querySelectorAll('script[type="module"]')]
    .map((s) => s.src)
    .filter(Boolean)[0]
  if (!jsUrl) {
    errors.push(`[${path}] 找不到入口 script`)
    dom.window.close()
    return
  }
  const code = await (await fetch(new URL(jsUrl, url).href)).text()
  try {
    win.eval(code)
  } catch (e) {
    errors.push(`[${path}] bundle 执行抛错: ${e.message}`)
  }

  // 等 React + Dexie 初始化
  await new Promise((r) => setTimeout(r, 1800))

  const root = win.document.getElementById('root')
  const text = (root?.textContent ?? '').trim()
  const nodes = root?.querySelectorAll('*').length ?? 0
  const hasNav = !!win.document.querySelector('.sidebar, .bottom-nav')
  const hasCard = !!win.document.querySelector('.card')

  const status = nodes > 20 && hasNav ? 'OK  ' : 'FAIL'
  console.log(
    `${status} ${path.padEnd(11)} nodes=${String(nodes).padStart(4)} nav=${hasNav ? 'Y' : 'N'} card=${hasCard ? 'Y' : 'N'} text="${text.slice(0, 46).replace(/\s+/g, ' ')}"`,
  )
  if (status === 'FAIL') {
    errors.push(`[${path}] 页面未正确挂载：nodes=${nodes} nav=${hasNav}`)
  }
  dom.window.close()
}

console.log(`冒烟测试 → ${base}\n`)
for (const p of paths) {
  try {
    await check(p)
  } catch (e) {
    errors.push(`[${p}] 异常: ${e.message}`)
    console.log(`FAIL ${p} → ${e.message}`)
  }
}

console.log(`\n错误 ${errors.length} 条`)
for (const e of errors) console.log('  ✗ ' + e)
if (warnings.length) {
  console.log(`警告 ${warnings.length} 条`)
  for (const w of warnings.slice(0, 6)) console.log('  ! ' + w)
}
process.exit(errors.length ? 1 : 0)
