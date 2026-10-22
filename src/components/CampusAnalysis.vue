<template>
  <section class="campus-analysis" aria-label="校园生产情况分析" :aria-busy="loading">
    <header class="campus-heading"><div><h2>生产情况分析</h2><span v-if="demo" class="campus-demo">演示数据</span></div><button type="button" class="campus-refresh" :disabled="loading || exporting" @click="refresh">{{ loading ? '读取中…' : '刷新分析' }}</button></header>
    <p v-if="loading" class="campus-state" role="status">正在读取校园分析数据…</p>
    <div v-else-if="error" class="campus-state campus-error" role="alert">{{ error }}<button type="button" @click="refresh">重试</button></div>
    <template v-else>
      <label v-if="schools.length" class="campus-school"><span>当前学校</span><select v-model="school" aria-label="当前学校"><option v-for="item in schools" :key="item" :value="item">{{ item }}</option></select></label>
      <p v-if="!dorms.length" class="campus-state">当前校园权限范围暂无宿舍数据</p>
      <template v-else>
        <section class="campus-overview" aria-label="现场总览">
          <h3>现场总览</h3>
          <div class="campus-stats"><div><strong>{{ model.totals.reachedRate }}%</strong><span>触达率</span></div><div><strong>{{ model.totals.marketedRate }}%</strong><span>营销率</span></div><div><strong>{{ model.totals.unreached }}</strong><span>待触达</span></div></div>
          <p>共 {{ model.totals.rooms }} 间宿舍，{{ model.totals.beds }} 个床位，已接触 {{ model.totals.reached }} 人，已办理 {{ model.totals.marketed }} 人。</p>
        </section>
        <div class="campus-export-actions"><button type="button" :disabled="exporting" @click="showExport = true"><span class="campus-download" :style="downloadStyle" aria-hidden="true"></span>导出数据</button><button type="button" :disabled="exporting" @click="exportData('progress')"><span class="campus-download" :style="downloadStyle" aria-hidden="true"></span>导出进度</button></div>
        <p v-if="exportMessage" class="campus-export-message" :role="exportError ? 'alert' : 'status'" :class="{ 'campus-error': exportError }">{{ exportMessage }}</p>
        <div class="campus-list-heading"><h3>楼栋进度</h3><span>{{ model.buildings.length }} 栋</span></div>
        <section v-for="college in model.colleges" :key="college.college" class="campus-college">
          <header><h4>{{ college.college }}</h4><span>触达 {{ college.reachedRate }}%</span></header>
          <article v-for="building in college.items" :key="building.key" class="campus-building">
            <h5>{{ building.college }} · {{ building.building || '楼栋未提供' }}</h5>
            <p>{{ building.rooms }} 间宿舍 · {{ building.beds }} 个床位 · 待触达 {{ building.unreached }}</p>
            <div v-for="metric in metrics" :key="metric.key" class="campus-progress" :class="metric.key"><div><span>{{ metric.label }}</span><b>{{ building[metric.key] }}/{{ building.beds }}</b></div><div class="campus-track" role="progressbar" :aria-label="`${building.college}${building.building}${metric.label}`" :aria-valuenow="building[metric.rate]" aria-valuemin="0" aria-valuemax="100"><i :style="{ width: `${building[metric.rate]}%` }"></i></div></div>
          </article>
        </section>
      </template>
    </template>
    <div v-if="showExport" class="campus-modal-mask" @click.self="closeExport">
      <section ref="exportDialog" class="campus-export-dialog" role="dialog" aria-modal="true" aria-labelledby="campus-export-title" tabindex="-1" @keydown.esc.stop="closeExport" @keydown.tab="trapFocus">
        <header><h3 id="campus-export-title">导出校园数据</h3><button ref="closeButton" type="button" :disabled="exporting" title="关闭" aria-label="关闭" @click="closeExport">×</button></header>
        <p>{{ school }}</p>
        <label><input v-model="exportMode" type="radio" value="rooms" name="campus-export-mode" />宿舍汇总</label>
        <label><input v-model="exportMode" type="radio" value="details" name="campus-export-mode" />人员登记明细</label>
        <p v-if="exportError" class="campus-error" role="alert">{{ exportMessage }}</p>
        <button type="button" class="campus-export-confirm" :disabled="exporting" @click="exportData(exportMode)">{{ exporting ? '导出中…' : '导出 Excel' }}</button>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { fetchCampusAnalysis } from '../api/campus.js'
import { loadExternalScript } from '../api/client.js'
import { buildCampusAnalysis, campusExportSheets } from '../utils/campusAnalysis.js'
import downloadIcon from '../assets/action-icons/download.svg'

const props = defineProps({ phone: String, token: String })
const dorms = ref([]), school = ref(''), demo = ref(false), loading = ref(false), error = ref('')
const showExport = ref(false), exportMode = ref('rooms'), exporting = ref(false), exportMessage = ref(''), exportError = ref(false)
const exportDialog = ref(null), closeButton = ref(null)
const downloadStyle = { '--campus-download-icon': `url("${downloadIcon}")` }
const metrics = [{ key: 'reached', rate: 'reachedRate', label: '触达进度' }, { key: 'marketed', rate: 'marketedRate', label: '营销进度' }]
const schools = computed(() => [...new Set(dorms.value.map(r => r.school))])
const model = computed(() => buildCampusAnalysis(dorms.value, school.value))
let controller, sequence = 0, returnFocus
async function refresh() {
  controller?.abort()
  controller = new AbortController()
  const current = ++sequence
  dorms.value = []; error.value = ''; exportMessage.value = ''; demo.value = false; loading.value = true
  try {
    const data = await fetchCampusAnalysis({ phone: props.phone, token: props.token, signal: controller.signal })
    if (current !== sequence) return
    dorms.value = data.dorms; demo.value = data.demo
    if (!schools.value.includes(school.value)) school.value = schools.value[0] || ''
  } catch (e) {
    if (current === sequence && e.name !== 'AbortError') error.value = e.message || '校园分析读取失败'
  } finally { if (current === sequence) loading.value = false }
}
function closeExport() { if (!exporting.value) showExport.value = false }
function trapFocus(event) {
  const elements = [...exportDialog.value.querySelectorAll('button:not([disabled]), input:not([disabled])')]
  const first = elements[0], last = elements.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
watch(showExport, async open => {
  if (open) { returnFocus = document.activeElement; await nextTick(); closeButton.value?.focus() }
  else returnFocus?.focus?.()
})
async function exportData(mode) {
  if (exporting.value || loading.value || error.value || !model.value.totals.rooms) return
  const current = sequence, selected = school.value, authToken = props.token
  const sheets = campusExportSheets(model.value, mode)
  exporting.value = true; exportMessage.value = ''; exportError.value = false
  try {
    if (!window.XLSX) await loadExternalScript(`${import.meta.env.BASE_URL}vendor/xlsx.full.min.js`)
    if (current !== sequence || selected !== school.value || authToken !== props.token) throw new Error('学校、数据或登录状态已变化，请重新导出')
    const XLSX = window.XLSX
    if (!XLSX?.utils) throw new Error('Excel组件不可用')
    const workbook = XLSX.utils.book_new()
    for (const item of sheets) {
      const sheet = XLSX.utils.aoa_to_sheet(item.rows)
      sheet['!cols'] = item.rows[0].map(() => ({ wch: 18 }))
      sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: item.rows.length - 1, c: item.rows[0].length - 1 } }) }
      XLSX.utils.book_append_sheet(workbook, sheet, item.name)
    }
    const metadata = [['学校', selected], ['数据性质', demo.value ? '模拟数据' : '校园生产通接口数据'], ['导出类型', { progress: '楼栋进度', rooms: '宿舍汇总', details: '人员登记明细' }[mode]], ['导出时间', new Date().toLocaleString('zh-CN')]]
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(metadata), '导出范围')
    const date = new Date().toLocaleDateString('sv-SE')
    const filename = `校园生产分析_${selected}_${mode}_${date}${demo.value ? '_模拟' : ''}.xlsx`.replace(/[\\/:*?"<>|]/g, '_')
    XLSX.writeFile(workbook, filename, { compression: true })
    exportMessage.value = '导出成功'; showExport.value = false
  } catch (e) { exportError.value = true; exportMessage.value = e.message || '导出失败' }
  finally { exporting.value = false }
}
watch([() => props.phone, () => props.token], () => { showExport.value = false; refresh() }, { immediate: true })
onBeforeUnmount(() => { sequence++; controller?.abort(); dorms.value = [] })
</script>

<style scoped>
.campus-analysis { padding: 20px 6px 24px; color: #183650; }
.campus-heading, .campus-list-heading, .campus-college > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.campus-heading > div { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
h2, h3, h4, h5 { margin: 0; }
h2 { font-size: 23px; } h3 { font-size: 18px; }
.campus-demo { font-size: 11px; color: #6b8096; }
button, select { font: inherit; cursor: pointer; }
button:disabled { cursor: wait; opacity: .55; }
button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid #2874ed; outline-offset: 3px; }
.campus-refresh { min-height: 38px; flex: 0 0 auto; padding: 6px 10px; border: 1px solid #bcd6f5; border-radius: 6px; background: white; color: #2167c8; font-size: 13px; }
.campus-school { display: flex; align-items: center; gap: 12px; margin: 22px 0; font-size: 13px; color: #5b7394; }
.campus-school select { flex: 1; min-width: 0; min-height: 42px; padding: 8px 10px; border: 1px solid #c8def8; border-radius: 6px; background: white; color: #183650; font-weight: 700; }
.campus-overview { padding: 20px 0; border-top: 2px solid #109b80; border-bottom: 1px solid #d8e7f5; }
.campus-overview h3 { color: #147c68; }
.campus-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 22px 0 16px; }
.campus-stats > div { display: grid; gap: 9px; min-width: 0; text-align: center; border-right: 1px solid #d8e7f5; }
.campus-stats > div:last-child { border: 0; }
.campus-stats strong { color: #099d87; font-size: 28px; overflow-wrap: anywhere; }
.campus-stats > div:nth-child(2) strong { color: #2874ed; }
.campus-stats > div:last-child strong { color: #c87228; }
.campus-stats span { color: #607998; font-size: 13px; }
.campus-overview p { margin: 0; color: #607998; font-size: 13px; line-height: 1.8; }
.campus-export-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 18px 0 26px; }
.campus-export-actions button { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; min-width: 0; border: 1px solid #bcd6f5; border-radius: 6px; color: #2167c8; background: white; font-size: 13px; font-weight: 700; }
.campus-download { width: 17px; height: 17px; flex: 0 0 17px; background: currentColor; mask: var(--campus-download-icon) center / contain no-repeat; -webkit-mask: var(--campus-download-icon) center / contain no-repeat; }
.campus-list-heading { margin-bottom: 18px; }
.campus-list-heading span { font-size: 12px; color: #7188a0; }
.campus-college { margin-bottom: 22px; }
.campus-college > header { margin-bottom: 10px; }
.campus-college h4 { font-size: 16px; overflow-wrap: anywhere; }
.campus-college > header > span { flex: 0 0 auto; font-size: 12px; color: #147c68; font-weight: 700; }
.campus-building { margin-bottom: 12px; padding: 16px; border: 1px solid #d0e1f5; border-left: 3px solid #109b80; border-radius: 8px; background: white; }
.campus-building h5 { font-size: 16px; overflow-wrap: anywhere; }
.campus-building > p { margin: 7px 0 14px; font-size: 12px; color: #7188a0; line-height: 1.7; }
.campus-progress + .campus-progress { margin-top: 14px; }
.campus-progress > div:first-child { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 7px; font-size: 12px; color: #607998; }
.campus-progress b { font-weight: 600; }
.campus-track { height: 7px; overflow: hidden; border-radius: 4px; background: #e6eef8; }
.campus-track > i { display: block; height: 100%; background: #099d87; }
.marketed .campus-track > i { background: #2874ed; }
.campus-state { padding: 30px 0; color: #7188a0; font-size: 14px; line-height: 1.8; overflow-wrap: anywhere; }
.campus-error { color: #c33; }
.campus-state button { border: 0; color: #2167c8; background: transparent; margin-left: 10px; font: inherit; }
.campus-export-message { color: #147c68; font-size: 13px; line-height: 1.7; }
.campus-export-message.campus-error { color: #c33; }
.campus-modal-mask { position: fixed; z-index: 2000; inset: 0; display: grid; place-items: center; padding: 20px; background: #14234966; }
.campus-export-dialog { width: min(380px, 100%); padding: 20px; border-radius: 8px; background: white; }
.campus-export-dialog > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.campus-export-dialog header button { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 0; color: #607998; background: transparent; font-size: 24px; }
.campus-export-dialog > p { font-size: 13px; color: #7188a0; }
.campus-export-dialog label { display: flex; align-items: center; gap: 8px; min-height: 42px; font-size: 14px; }
.campus-export-dialog input { accent-color: #2874ed; }
.campus-export-confirm { width: 100%; min-height: 42px; margin-top: 14px; border: 0; border-radius: 6px; background: #2874ed; color: white; font-weight: 700; }
@media (max-width: 360px) { h2 { font-size: 21px; } .campus-stats strong { font-size: 24px; } .campus-building { padding: 14px; } }
</style>
