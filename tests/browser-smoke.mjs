// Run against an already started Chromium CDP endpoint, e.g. port 9223.
import { writeFile } from 'node:fs/promises'
const pages = await (await fetch('http://127.0.0.1:9223/json')).json()
const page = pages.find(item => item.url === 'http://127.0.0.1:5178/')
if (!page) throw new Error('Preview page not found')

const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
let sequence = 0
const pending = new Map()
socket.onmessage = event => {
  const message = JSON.parse(event.data)
  const request = pending.get(message.id)
  if (!request) return
  pending.delete(message.id)
  message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result)
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const result = (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.value
}

const pause = () => new Promise(resolve => setTimeout(resolve, 450))
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })

async function login(phone) {
  await send('Page.navigate', { url: 'http://127.0.0.1:5178/' })
  await pause()
  if (phone === '13800000000' && process.argv[5]) {
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile(process.argv[5], Buffer.from(screenshot.data, 'base64'))
  }
  await evaluate(`(() => {
    const input = document.querySelector('input[type=tel]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '${phone}');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('input[type=checkbox]').click();
    document.querySelector('.primary-login').click();
  })()`)
  await pause()
  const state = await evaluate(`({ heading: document.querySelector('.workbench-heading h2')?.textContent, menus: document.querySelectorAll('.workbench-menu button').length, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth })`)
  if (state.menus !== 3 || state.overflow) throw new Error(`Workbench failed: ${JSON.stringify(state)}`)
  return state
}

const city = await login('13800000000')
if (process.argv[2]) {
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(process.argv[2], Buffer.from(screenshot.data, 'base64'))
}
await evaluate(`document.querySelector('.workbench-menu button').click()`)
await pause()
const cityProducts = await evaluate(`document.querySelectorAll('.product-row').length`)
if (cityProducts !== 6) throw new Error('City product overview failed')
if (process.argv[4]) {
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(process.argv[4], Buffer.from(screenshot.data, 'base64'))
}
if (process.argv[6]) {
  await evaluate(`document.querySelector('.target-management').scrollIntoView({ block: 'center' })`)
  await pause()
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(process.argv[6], Buffer.from(screenshot.data, 'base64'))
  await evaluate(`window.scrollTo(0, 0)`)
}
await evaluate(`document.querySelector('.product-row').click()`)
await pause()
const cityBranches = await evaluate(`document.querySelectorAll('.drill-row').length`)
await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 700, deviceScaleFactor: 1, mobile: true })
if (await evaluate(`document.documentElement.scrollWidth > document.documentElement.clientWidth`)) throw new Error('Branch detail overflows at 320px')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
if (process.argv[7]) {
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(process.argv[7], Buffer.from(screenshot.data, 'base64'))
}
await evaluate(`document.querySelector('.drill-row').click()`)
await pause()
const cityGrids = await evaluate(`document.querySelectorAll('.drill-row').length`)
await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 700, deviceScaleFactor: 1, mobile: true })
if (await evaluate(`document.documentElement.scrollWidth > document.documentElement.clientWidth`)) throw new Error('Grid detail overflows at 320px')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
if (process.argv[8]) {
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(process.argv[8], Buffer.from(screenshot.data, 'base64'))
}
await evaluate(`document.querySelector('.drill-row').click()`)
await pause()
const cityAlert = await evaluate(`document.querySelector('.alert-heading h2')?.textContent`)
if (cityBranches !== 2 || cityGrids !== 2 || cityAlert !== '低产预警') throw new Error('City drill-down failed')
await evaluate(`document.querySelector('.breadcrumbs button').click()`)
await pause()
await evaluate(`document.querySelectorAll('.workbench-menu button')[1].click()`)
await pause()
const cityFilters = await evaluate(`Array.from(document.querySelectorAll('.monitor-filter')).map(item => item.textContent.trim())`)
if (cityFilters.length !== 3 || !cityFilters[0].startsWith('分公司')) throw new Error('City monitor filters failed')
if (process.argv[3]) {
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(process.argv[3], Buffer.from(screenshot.data, 'base64'))
}
await evaluate(`(() => { const input = document.querySelectorAll('.monitor-filter select')[0]; input.value = 'B02'; input.dispatchEvent(new Event('change', { bubbles: true })) })()`)
await pause()
const cityGridOptions = await evaluate(`Array.from(document.querySelectorAll('.monitor-filter select')[1].options).map(item => item.value)`)
if (cityGridOptions.join(',') !== ',G002') throw new Error('City branch/grid cascade failed')
await evaluate(`(() => { const filters = document.querySelectorAll('.monitor-filter select'); filters[1].value = 'G002'; filters[1].dispatchEvent(new Event('change', { bubbles: true })); filters[2].value = 'newNumbers'; filters[2].dispatchEvent(new Event('change', { bubbles: true })); const input = document.querySelector('input[aria-label="低产阈值"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '2'); input.dispatchEvent(new Event('input', { bubbles: true })) })()`)
await pause()
const cityFilteredPeople = await evaluate(`document.querySelectorAll('.person-card').length`)
if (cityFilteredPeople !== 2) throw new Error(`City monitor result failed: ${cityFilteredPeople}`)

const branch = await login('13800000002')
await evaluate(`document.querySelector('.workbench-menu button').click()`)
await pause()
await evaluate(`document.querySelector('.product-row').click()`)
await pause()
const branchGrids = await evaluate(`document.querySelectorAll('.drill-row').length`)
const importButton = await evaluate(`!!document.querySelector('.target-import')`)
if (branchGrids !== 1 || importButton) throw new Error('Branch scope failed')
await evaluate(`document.querySelector('.breadcrumbs button').click()`)
await pause()
await evaluate(`document.querySelectorAll('.workbench-menu button')[1].click()`)
await pause()
const branchFilters = await evaluate(`document.querySelectorAll('.monitor-filter').length`)
if (branchFilters !== 2) throw new Error('Branch monitor filters failed')

const grid = await login('13800000003')
await evaluate(`document.querySelector('.workbench-menu button').click()`)
await pause()
const gridOverview = await evaluate(`({ title: document.querySelector('.overview-heading h2')?.textContent, scope: document.querySelector('.overview-heading span')?.textContent })`)
await evaluate(`document.querySelector('.product-row').click()`)
await pause()
const gridAlert = await evaluate(`document.querySelector('.alert-heading h2')?.textContent`)
if (gridOverview.title !== '生产总览' || !gridOverview.scope?.includes('城区一网格') || gridAlert !== '低产预警') throw new Error('Grid scope failed')
await evaluate(`document.querySelector('.breadcrumbs button').click()`)
await pause()
await evaluate(`document.querySelectorAll('.workbench-menu button')[1].click()`)
await pause()
const gridFilters = await evaluate(`({ count: document.querySelectorAll('.monitor-filter').length, locked: document.querySelector('.monitor-filter select')?.disabled })`)
if (gridFilters.count !== 2 || !gridFilters.locked) throw new Error('Grid monitor filters failed')
await evaluate(`document.querySelector('.breadcrumbs button').click()`)
await pause()
await evaluate(`document.querySelectorAll('.workbench-menu button')[2].click()`)
await pause()
const campus = await evaluate(`document.querySelector('.campus-placeholder h2')?.textContent`)
if (campus !== '校园生产通') throw new Error('Campus placeholder failed')
for (const width of [320, 560]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true })
  const state = await login('13800000000')
  if (state.overflow) throw new Error(`Workbench overflows at ${width}px`)
  await evaluate(`document.querySelectorAll('.workbench-menu button')[1].click()`)
  await pause()
  const monitorOverflow = await evaluate(`document.documentElement.scrollWidth > document.documentElement.clientWidth`)
  if (monitorOverflow) throw new Error(`Monitor overflows at ${width}px`)
  await evaluate(`document.querySelector('.breadcrumbs button').click()`)
  await pause()
  await evaluate(`document.querySelector('.workbench-menu button').click()`)
  await pause()
  const overviewOverflow = await evaluate(`document.documentElement.scrollWidth > document.documentElement.clientWidth`)
  if (overviewOverflow) throw new Error(`Production overview overflows at ${width}px`)
}
console.log(JSON.stringify({ city, cityProducts, cityBranches, cityGrids, cityAlert, cityFilters, cityFilteredPeople, branch, branchGrids, branchFilters, grid, gridOverview, gridAlert, gridFilters, campus }))
socket.close()
