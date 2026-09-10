<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Activity, Bell, BookOpen, Building2, ChevronRight, Factory, FlaskConical, History, LayoutDashboard, Menu, Pause, Play, RotateCcw, ShieldCheck } from 'lucide-vue-next'

// Components
import FleetMap from './components/FleetMap.vue'
import DeviceSensors from './components/DeviceSensors.vue'
import IncidentWorkspace from './components/IncidentWorkspace.vue'
import AlertTable from './components/AlertTable.vue'
import SensorPanel from './components/SensorPanel.vue'

// API & dữ liệu backend
import { api } from './api/client.js'
import { useSimulation } from './api/useSimulation.js'
import { formatTime } from './domain/sensors.js'

const REPLAY_FAULT_START = 300
const SIMULATION_DURATION = 900

// Hằng số Navigation
const NAVIGATION_MENU = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'machines', label: 'Thiết bị', icon: Factory },
  { id: 'simulation', label: 'Mô phỏng', icon: FlaskConical },
  { id: 'alerts', label: 'Cảnh báo', icon: Bell },
  { id: 'approvals', label: 'Chờ duyệt', icon: ShieldCheck },
  { id: 'history', label: 'Lịch sử xử lý', icon: History },
  //{ id: 'knowledge', label: 'Tài liệu kỹ thuật', icon: BookOpen }
]

const ALLOWED_ROUTES = [...NAVIGATION_MENU.map(n => n.id), 'device', 'incident']

// Trạng thái toàn cục (Global State)
const currentView = ref('overview')
const deviceId = ref('APU-01')
const incidentId = ref('SC-024')
const incidentTab = ref('analysis')
const isMenuOpen = ref(false)
const windowMinutes = ref(15)
const devices = ref([])
const deviceHistory = ref([])
const apiError = ref('')
const appReady = ref(false)
const animationSpeed = ref(2000)

const incidentsList = ref([])
const documentDialogRef = ref(null)
const documentType = ref('sop')

// Hook Mô phỏng
const { session, isRunning, connectionState, currentScenario, playbackSpeed, pause, reset, play } = useSimulation()

// Computed Properties
const openIncidents = computed(() => incidentsList.value.filter(a => a.state !== 'Đã đóng'))
const pendingIncidents = computed(() => incidentsList.value.filter(a => a.state === 'Chờ duyệt'))
const selectedIncident = computed(() => incidentsList.value.find(a => a.id === incidentId.value) || incidentsList.value[0] || null)

const deviceIncident = computed(() => openIncidents.value.find(a => a.machine === deviceId.value))
const deviceLine = computed(() => devices.value.find(d => d.id === deviceId.value)?.line)

const activeNavMenu = computed(() => {
  if (currentView.value === 'device') return 'machines'
  if (currentView.value === 'incident') return 'alerts'
  return currentView.value
})

const pageTitle = computed(() => {
  const navItem = NAVIGATION_MENU.find(n => n.id === activeNavMenu.value)
  return navItem ? navItem.label : 'Tổng quan'
})

const latestSimSample = computed(() => session.value.samples.at(-1))
const overviewSamples = computed(() => deviceHistory.value)
const simulationStatusLabel = computed(() => ({
  idle: 'Chưa kết nối',
  connecting: 'Đang kết nối thiết bị',
  connected: 'Đã kết nối, đang chờ chạy',
  running: 'Đang nhận dữ liệu realtime',
  paused: 'Đã tạm dừng',
  error: 'Lỗi kết nối',
}[connectionState.value] || connectionState.value))

// Router thủ công (Hash-based Routing)
function navigateTo(nextView, id = '', tab = 'analysis') {
  currentView.value = nextView
  if (['device', 'simulation'].includes(nextView) && devices.value.some(d => d.id === id)) {
    deviceId.value = id
  }
  if (nextView === 'incident' && incidentsList.value.some(a => a.id === id)) {
    incidentId.value = id
  }
  const hashParts = [nextView, id, tab === 'analysis' ? '' : tab].filter(Boolean)
  window.location.hash = `/${hashParts.join('/')}`
}

function parseHashRoute() {
  const normalizedHash = window.location.hash.replace(/^#\/?/, '')
  const [nextView, id, tab] = normalizedHash.split('/')

  currentView.value = ALLOWED_ROUTES.includes(nextView) ? nextView : 'overview'

  if (['device', 'simulation'].includes(nextView) && devices.value.some(d => d.id === id)) {
    deviceId.value = id
  }

  if (nextView === 'incident' && incidentsList.value.some(a => a.id === id)) {
    incidentId.value = id
  }

  const validTabs = ['analysis', 'approval', 'verification', 'timeline']
  incidentTab.value = validTabs.includes(tab) ? tab : 'analysis'
  isMenuOpen.value = false
}

// Handlers UI
function handleOpenDevice(id) {
  navigateTo('device', id)
}

function handleOpenIncident(id, tab = 'analysis') {
  navigateTo('incident', id, tab)
}

function handleOpenSimulation() {
  navigateTo('simulation', deviceId.value)
}

async function handleSimulationToggle() {
  try {
    if (isRunning.value) pause()
    else await play(deviceId.value)
    apiError.value = ''
  } catch (error) {
    handleApiError(error)
  }
}

function handleSimulationStop() {
  pause()
  apiError.value = ''
}

async function handleSimulationReset() {
  try {
    await reset(deviceId.value)
    apiError.value = ''
  } catch (error) {
    handleApiError(error)
  }
}

function handleSelectDevice(event) {
  navigateTo(currentView.value, event.target.value)
}

function handleOpenDocument(type) {
  documentType.value = type
  documentDialogRef.value.showModal()
}

function handleApiError(error) {
  apiError.value = error instanceof Error ? error.message : 'Không thể kết nối tới backend.'
}

async function loadDeviceHistory() {
  if (!devices.value.length) return
  try {
    deviceHistory.value = await api.history(deviceId.value, windowMinutes.value, !!deviceIncident.value)
    apiError.value = ''
  } catch (error) {
    handleApiError(error)
  }
}

async function setWindowMinutes(minutes) {
  if (windowMinutes.value === minutes) return
  windowMinutes.value = minutes
  await loadDeviceHistory()
}

function handleIncidentUpdated(updatedIncident) {
  incidentsList.value = incidentsList.value.map((incident) => (
    incident.id === updatedIncident.id ? updatedIncident : incident
  ))
}

async function loadAppData() {
  try {
    const [loadedDevices, loadedIncidents] = await Promise.all([api.devices(), api.incidents()])
    devices.value = loadedDevices
    incidentsList.value = loadedIncidents
    parseHashRoute()
    await reset(deviceId.value)
    await loadDeviceHistory()
    appReady.value = true
    if (currentView.value === 'simulation') await play(deviceId.value)
    apiError.value = ''
  } catch (error) {
    handleApiError(error)
  }
}

// Theo dõi thay đổi trạng thái
watch(currentView, async (newView) => {
  if (!appReady.value) return
  if (newView !== 'simulation') {
    pause()
    return
  }
  try {
    await reset(deviceId.value)
    await play(deviceId.value)
    apiError.value = ''
  } catch (error) {
    handleApiError(error)
  }
})
watch(deviceId, async () => {
  try {
    await reset(deviceId.value)
    await loadDeviceHistory()
  } catch (error) {
    handleApiError(error)
  }
})
watch(deviceIncident, loadDeviceHistory)
watch(currentScenario, () => reset(deviceId.value).catch(handleApiError))

// Lifecycle
onMounted(() => {
  window.addEventListener('hashchange', parseHashRoute)
  loadAppData()
})
onBeforeUnmount(() => {
  window.removeEventListener('hashchange', parseHashRoute)
})
</script>

<template>
  <!-- Khung bao ngoài toàn màn hình chuẩn Tailwind: Cố định 100vh trên Desktop -->
  <div class="min-h-screen md:h-screen md:overflow-hidden md:flex bg-slate-50 text-slate-800 font-sans antialiased">
    <a class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:p-3 focus:bg-blue-600 focus:text-white focus:rounded-lg" href="#main-content">
      Đến nội dung chính
    </a>

    <!-- Sidebar: 100% Tailwind, vừa khít 100vh trên Desktop, không kéo dài -->
    <aside 
      class="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white p-4 md:py-6 md:px-4 flex flex-col md:h-screen md:sticky md:top-0 md:overflow-y-auto"
      :class="{ 'block': isMenuOpen, 'hidden md:flex': !isMenuOpen }"
    >
      <!-- Logo thương hiệu -->
      <a class="flex items-center gap-2.5 text-lg font-bold text-slate-900 tracking-tight" href="#overview">
        <span class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm">FD</span>
        FactoryDoctor
      </a>
      <p class="text-[11px] font-semibold tracking-wider text-slate-400 mt-2 mb-6 uppercase px-1">DENSO · NHÓM A1</p>

      <!-- Menu Navigation -->
      <nav class="space-y-1" aria-label="Điều hướng chính">
        <a
          v-for="nav in NAVIGATION_MENU"
          :key="nav.id"
          :href="`#${nav.id}`"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="activeNavMenu === nav.id 
            ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs' 
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
          :aria-current="activeNavMenu === nav.id ? 'page' : undefined"
        >
          <component :is="nav.icon" :size="18" aria-hidden="true" />
          <span>{{ nav.label }}</span>
          <span
            v-if="nav.id === 'approvals' && pendingIncidents.length"
            class="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"
          >
            {{ pendingIncidents.length }}
          </span>
        </a>
      </nav>

      <!-- Thông tin nhân sự cố định ở chân Sidebar -->
      <div class="mt-auto pt-6 border-t border-slate-100 hidden md:block px-1">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Ca làm việc · 08:00–16:00</span>
        <div class="mt-1">
          <p class="text-sm font-semibold text-slate-800 m-0">Nguyễn Văn A</p>
          <p class="text-xs text-slate-500 m-0">NV Kĩ thuật</p>
        </div>
      </div>
    </aside>

    <!-- Khối nội dung bên phải: Tự cuộn độc lập (overflow-y-auto) -->
    <div class="min-w-0 flex-1 md:h-screen md:overflow-y-auto flex flex-col">
      <!-- Topbar Header -->
      <header class="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-7 py-3.5 flex justify-between items-center gap-4 text-sm">
        <div class="flex items-center gap-3">
          <button
            class="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            :aria-expanded="isMenuOpen"
            aria-label="Mở hoặc đóng menu"
            @click="isMenuOpen = !isMenuOpen"
          >
            <Menu :size="20" />
          </button>
          <Building2 :size="18" class="text-slate-500" aria-hidden="true" />
          <span class="font-medium text-slate-700">Nhà máy A1</span>
          <ChevronRight :size="14" class="text-slate-400" aria-hidden="true" />
          <span class="text-slate-500">{{ pageTitle }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="px-2 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-semibold tracking-wider uppercase">API Connected</span>
          <span class="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">AN</span>
        </div>
      </header>

      <!-- Main Content Layout -->
      <main id="main-content" class="flex-1 p-4 md:p-7 max-w-[1700px] w-full mx-auto">
        <div v-if="apiError" role="alert" class="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Backend: {{ apiError }}
        </div>
        <!-- VIEW: Tổng quan -->
        <template v-if="currentView === 'overview'">
          <div class="flex justify-between items-center gap-4 flex-wrap mb-6">
            <div>
              <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Tổng quan nhà máy</h1>
              <p class="text-sm text-slate-500 mt-1">Thứ Tư, 09 tháng 09, 2026 · Ca sáng</p>
            </div>
            <button class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer shadow-xs" @click="navigateTo('alerts')">
              Xem cảnh báo
            </button>
          </div>

          <!-- KPI Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <article class="rounded-xl border border-slate-200 border-t-4 border-t-blue-600 bg-white p-5 shadow-xs">
              <span class="text-sm font-medium text-slate-500">Cảnh báo đang mở</span>
              <strong class="block text-3xl font-bold text-slate-900 tracking-tight my-2 tabular-nums">
                {{ openIncidents.length.toString().padStart(2, '0') }}
              </strong>
              <small class="text-xs text-slate-400">{{ pendingIncidents.length }} đề xuất chờ duyệt</small>
            </article>
            <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <span class="text-sm font-medium text-slate-500">Đã xử lý hôm nay</span>
              <strong class="block text-3xl font-bold text-slate-900 tracking-tight my-2 tabular-nums">
                {{ 18 + incidentsList.filter(a => a.state === 'Đã đóng').length }}
              </strong>
              <small class="text-xs text-slate-400">Đã xác nhận và đóng</small>
            </article>
            <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <span class="text-sm font-medium text-slate-500">Xử lý đạt lần đầu</span>
              <strong class="block text-3xl font-bold text-slate-900 tracking-tight my-2 tabular-nums">
                89<span class="text-lg font-normal">%</span>
              </strong>
              <small class="text-xs text-slate-400">16 / 18 ca trước phiên demo</small>
            </article>
            <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <span class="text-sm font-medium text-slate-500">Phản hồi trung bình</span>
              <strong class="block text-3xl font-bold text-slate-900 tracking-tight my-2 tabular-nums">
                4.2 <span class="text-lg font-normal">phút</span>
              </strong>
              <small class="text-xs text-slate-400">Phát hiện → tiếp nhận · Mẫu</small>
            </article>
          </div>

          <!-- Fleet Map & Incidents Grid -->
          <div class="grid items-start gap-5 xl:grid-cols-[1.15fr_1fr]">
            <FleetMap :devices="devices" :incidents="incidentsList" @select="handleOpenDevice" />
            <div class="grid content-start gap-5">
              <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h2 class="text-base font-semibold text-slate-800 mb-2">Cảnh báo phát sinh</h2>
                <SensorPanel
                  :samples="overviewSamples"
                  :sensor="{ key: 'Motor_current', name: 'Dòng điện động cơ APU-01', unit: 'A' }"
                  :start="-windowMinutes * 60"
                  :end="0"
                />
              </section>

              <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div class="flex justify-between items-center gap-3 mb-4">
                  <h2 class="text-base font-semibold text-slate-800">Cần chú ý ngay</h2>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                    {{ openIncidents.length }} mở
                  </span>
                </div>
                <div 
                  v-for="incident in openIncidents" 
                  :key="incident.id" 
                  class="border-b border-slate-100 last:border-0 py-3.5 flex justify-between items-center gap-3"
                >
                  <div>
                    <button class="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline p-0 bg-transparent border-0 cursor-pointer text-left" @click="handleOpenIncident(incident.id)">
                      {{ incident.machine }} <span class="text-slate-400 font-normal">/ Dây chuyền {{ incident.line }}</span>
                    </button>
                    <p class="text-sm text-slate-700 m-0 mt-0.5">{{ incident.title }}</p>
                    <small class="text-xs text-slate-400">{{ incident.time }} · {{ incident.state }}</small>
                  </div>
                  <span 
                    class="px-2 py-0.5 rounded text-xs font-semibold shrink-0" 
                    :class="incident.risk === 'Cao' ? 'bg-red-50 text-red-700 border border-red-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'"
                  >
                    {{ incident.risk }}
                  </span>
                </div>
                <p v-if="!openIncidents.length" class="py-8 text-center text-sm text-slate-400">Không còn cảnh báo đang mở.</p>
              </section>
            </div>
          </div>
        </template>

        <!-- VIEW: Thiết bị -->
        <template v-else-if="currentView === 'machines'">
          <div class="flex justify-between items-center gap-4 flex-wrap mb-6">
            <div>
              <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Thiết bị & dây chuyền</h1>
              <p class="text-sm text-slate-500 mt-1">{{ devices.length }} máy nén khí có dữ liệu · Nhấn máy để xem toàn bộ cảm biến.</p>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              {{ Math.max(0, devices.length - openIncidents.length) }} bình thường
            </span>
          </div>
          <FleetMap :devices="devices" :incidents="incidentsList" @select="handleOpenDevice" />
        </template>

        <!-- VIEW: Theo dõi 1 thiết bị -->
        <template v-else-if="currentView === 'device'">
          <button class="text-sm font-medium text-blue-600 hover:underline mb-3 inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0" @click="navigateTo('machines')">
            ← Tất cả thiết bị
          </button>
          
          <div class="flex justify-between items-center gap-4 flex-wrap mb-5">
            <div>
              <h1 class="text-2xl font-bold text-slate-900 tracking-tight">{{ deviceId }} · Theo dõi cảm biến</h1>
              <p class="text-sm text-slate-500 mt-1">Dây chuyền {{ deviceLine }} · Máy nén khí</p>
            </div>
            <div class="flex items-center gap-3">
              <select :value="deviceId" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" aria-label="Chọn thiết bị" @change="handleSelectDevice">
                <option v-for="d in devices" :key="d.id">{{ d.id }}</option>
              </select>
              <button class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer shadow-xs" @click="handleOpenSimulation">
                Mô phỏng thiết bị
              </button>
            </div>
          </div>

          <div class="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap mb-5 shadow-xs">
            <div class="flex items-center gap-3">
              <span class="px-2.5 py-0.5 rounded text-xs font-semibold" :class="deviceIncident ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'">
                {{ deviceIncident ? 'Có cảnh báo' : 'Bình thường' }}
              </span>
              <small class="text-xs text-slate-400">Dữ liệu CSV thật · timestamp từ MetroPT-3</small>
            </div>
            <button v-if="deviceIncident" class="text-sm font-medium text-blue-600 hover:underline bg-transparent border-0 cursor-pointer" @click="handleOpenIncident(deviceIncident.id)">
              Xem {{ deviceIncident.id }} →
            </button>
            <small v-else class="text-xs text-slate-400">Không có cảnh báo đang mở</small>
          </div>

          <div class="flex justify-between items-center gap-3 mb-4">
            <h2 class="text-base font-semibold text-slate-800">Dữ liệu vận hành</h2>
            <div class="inline-flex gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg">
              <button
                v-for="n in [15, 30, 60]"
                :key="n"
                class="px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer"
                :class="windowMinutes === n ? 'bg-white text-blue-600 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'"
                :aria-pressed="windowMinutes === n"
                @click="setWindowMinutes(n)"
              >
                {{ n }} phút
              </button>
            </div>
          </div>

          <DeviceSensors
            :samples="deviceHistory"
            :start="-windowMinutes * 60"
            :end="0"
            :marker="deviceIncident ? -300 : null"
          />
        </template>

        <!-- VIEW: Cảnh báo -->
        <template v-else-if="currentView === 'alerts'">
          <div class="mb-6">
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Cảnh báo & sự cố</h1>
            <p class="text-sm text-slate-500 mt-1">Lọc theo dây chuyền, mức độ và tiến độ xử lý.</p>
          </div>
          <AlertTable :incidents="incidentsList" filters @select="handleOpenIncident" />
        </template>

        <!-- VIEW: Mô phỏng vận hành -->
        <template v-else-if="currentView === 'simulation'">
          <div class="flex justify-between items-center gap-4 flex-wrap mb-5">
            <div>
              <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Mô phỏng vận hành</h1>
              <p class="text-sm text-slate-500 mt-1">Thử kịch bản và quan sát phản ứng của các cảm biến.</p>
            </div>
            <span class="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Không điều khiển thiết bị
            </span>
          </div>

          <section class="rounded-xl border border-slate-200 bg-white p-5 mb-5 shadow-xs">
            <div class="flex justify-between items-center gap-4 flex-wrap">
              <div class="flex items-center gap-4 flex-wrap">
                <label class="text-xs font-medium text-slate-600 flex flex-col gap-1.5">
                  Thiết bị
                  <select :value="deviceId" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700" @change="handleSelectDevice">
                    <option v-for="d in devices" :key="d.id">{{ d.id }}</option>
                  </select>
                </label>
                <label class="text-xs font-medium text-slate-600 flex flex-col gap-1.5">
                  Kịch bản
                  <select v-model="currentScenario" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                    <option value="normal">Bình thường</option>
                    <option value="leak">Rò khí</option>
                  </select>
                </label>
                <label class="text-xs font-medium text-slate-600 flex flex-col gap-1.5">
                  Tốc độ
                  <select v-model.number="playbackSpeed" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                    <option v-for="n in [1, 2, 5, 10]" :key="n" :value="n">{{ n }}×</option>
                  </select>
                </label>
                <label class="text-xs font-medium text-slate-600 flex flex-col gap-1.5">
                  Animation
                  <select v-model.number="animationSpeed" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                    <option v-for="n in [100, 200, 500, 1000, 2000, 5000]" :key="n" :value="n">{{ n }} ms</option>
                  </select>
                </label>
              </div>

              <div class="flex items-center gap-2">
                <button
                  class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                  :disabled="isRunning"
                  @click="handleSimulationToggle"
                >
                  <Play :size="16" aria-hidden="true" />
                  Chạy mô phỏng
                </button>
                <button
                  class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                  :disabled="!isRunning"
                  @click="handleSimulationStop"
                >
                  <Pause :size="16" aria-hidden="true" />
                  Dừng mô phỏng
                </button>
                <button class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs" @click="handleSimulationReset">
                  <RotateCcw :size="16" aria-hidden="true" />
                  Chạy lại
                </button>
              </div>
            </div>

            <div class="flex items-center gap-4 flex-wrap my-4 text-xs text-slate-500">
              <strong class="text-2xl font-bold tracking-wider text-slate-900 tabular-nums">
                {{ formatTime(session.elapsed, true) }}
              </strong>
              <span>
                {{ simulationStatusLabel }} · {{ session.samples.length }} sample CSV
                · 1 giây thực = {{ playbackSpeed }} sample dữ liệu
              </span>
              <span class="px-2 py-0.5 rounded text-xs font-semibold" :class="currentScenario === 'leak' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'">
                {{ currentScenario === 'leak' ? 'Replay vùng rò khí' : 'State' }}
                · {{ latestSimSample?.loaded ? 'Động cơ nén' : 'Động cơ nghỉ' }}
              </span>
            </div>

            <p class="text-xs text-slate-400 m-0">
              {{ currentScenario === 'leak' ? 'Replay bắt đầu trước vùng rò khí đầu tiên trong CSV 05:00. Vạch cam đánh dấu điểm bắt đầu.' : 'Đang phát lại chuỗi timestamp thật từ CSV.' }}
              <span v-if="latestSimSample?.timestamp"> Sample: {{ latestSimSample.timestamp }}</span>
              Đổi thiết bị hoặc kịch bản sẽ đưa mô phỏng về đầu.
            </p>
          </section>

          <DeviceSensors
            :samples="session.samples"
            :start="Math.max(-60, session.elapsed - 300)"
            :end="Math.max(60, session.elapsed)"
            :animation-speed="animationSpeed"
            :marker="currentScenario === 'leak' && session.elapsed >= REPLAY_FAULT_START ? REPLAY_FAULT_START : null"
            relative
          />
        </template>

        <!-- VIEW: Phê duyệt -->
        <template v-else-if="currentView === 'approvals'">
          <div class="mb-6">
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Đề xuất chờ duyệt</h1>
            <p class="text-sm text-slate-500 mt-1">Xem bằng chứng và quyết định phương án trước khi giao việc.</p>
          </div>
          <div class="grid content-start gap-4">
            <section v-for="a in pendingIncidents" :key="a.id" class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div class="flex justify-between items-center gap-3">
                <h2 class="text-base font-semibold text-slate-800">{{ a.machine }} / {{ a.id }} · Dây chuyền {{ a.line }}</h2>
                <span class="px-2 py-0.5 rounded text-xs font-semibold" :class="a.risk === 'Cao' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'">
                  {{ a.risk }}
                </span>
              </div>
              <p class="text-sm text-slate-600 my-2">{{ a.title }}</p>
              <div class="flex justify-between items-center gap-3">
                <small class="text-xs text-slate-400">Chờ duyệt từ {{ a.time }}</small>
                <button class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer shadow-xs" @click="handleOpenIncident(a.id, 'approval')">
                  Xem & quyết định →
                </button>
              </div>
            </section>
            <section v-if="!pendingIncidents.length" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              Đã xử lý hết đề xuất chờ duyệt.
            </section>
          </div>
        </template>

        <!-- VIEW: Lịch sử -->
        <template v-else-if="currentView === 'history'">
          <div class="mb-6">
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Lịch sử xử lý</h1>
            <p class="text-sm text-slate-500 mt-1">Theo dõi quyết định, người thực hiện và các lần phân tích lại.</p>
          </div>
          <AlertTable :incidents="incidentsList" @select="handleOpenIncident($event, 'timeline')" />
        </template>

        <!-- VIEW: Chi tiết sự cố (IncidentWorkspace) -->
        <IncidentWorkspace
          v-else-if="currentView === 'incident'"
          :key="selectedIncident.id"
          :incident="selectedIncident"
          :initial-tab="incidentTab"
          @device="handleOpenDevice"
          @updated="handleIncidentUpdated"
          @back="navigateTo('alerts')"
          @document="handleOpenDocument"
        />

        <!-- VIEW: Tài liệu kỹ thuật -->
        <template v-else-if="currentView === 'knowledge'">
          <div class="mb-6">
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Tài liệu kỹ thuật</h1>
            <p class="text-sm text-slate-500 mt-1">Nguồn tham chiếu minh họa cho bước phân tích và đề xuất.</p>
          </div>
          <div class="grid gap-5 md:grid-cols-2">
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 class="text-base font-semibold text-slate-800">SOP-07 · Kiểm tra khí nén</h2>
              <p class="text-sm text-slate-500 my-2">Quy trình thao tác chuẩn (SOP) · Bản mẫu</p>
              <button class="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-sm font-medium text-slate-700 cursor-pointer transition-colors" @click="handleOpenDocument('sop')">
                Mở tài liệu ↗
              </button>
            </section>
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 class="text-base font-semibold text-slate-800">SC-011 · Sự cố tham khảo</h2>
              <p class="text-sm text-slate-500 my-2">Hồ sơ bảo trì · Bản mẫu</p>
              <button class="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-sm font-medium text-slate-700 cursor-pointer transition-colors" @click="handleOpenDocument('case')">
                Xem hồ sơ ↗
              </button>
            </section>
          </div>
        </template>

        <!-- Footer -->
        <footer class="mt-10 pt-4 border-t border-slate-200 flex justify-between gap-4 flex-wrap text-xs text-slate-400">
          <span>FactoryDoctor · Nhóm A1</span>
          <span>Dữ liệu cảm biến từ MetroPT-3 · Thao tác chỉ lưu trong phiên hiện tại</span>
        </footer>
      </main>
    </div>

    <!-- Modal Dialog Tài liệu -->
    <dialog ref="documentDialogRef" class="backdrop:bg-slate-900/50 rounded-2xl border border-slate-200 p-6 bg-white shadow-2xl max-w-lg w-[90vw] m-auto space-y-4" aria-labelledby="document-title">
      <h2 id="document-title" class="text-lg font-bold text-slate-900">
        {{ documentType === 'sop' ? 'SOP-07 · Quy trình mẫu' : 'SC-011 · Hồ sơ mẫu' }}
      </h2>
      <p class="inline-flex px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Tài liệu tham chiếu để duyệt UI
      </p>

      <div class="text-sm text-slate-600 space-y-2">
        <template v-if="documentType === 'sop'">
          <p>Phạm vi: kiểm tra dấu hiệu bất thường của hệ thống khí nén.</p>
          <p>Người thực hiện: kỹ thuật viên được phân công, tham chiếu quy trình bảo trì đã phê duyệt tại nhà máy.</p>
          <p>Đầu ra: kết quả kiểm tra, nguyên nhân xác nhận, ghi nhận trước/sau và người xác nhận.</p>
        </template>
        <template v-else>
          <p>Máy APU-03: áp suất giảm và chu kỳ nén tăng. Hồ sơ mẫu ghi nhận kiểm tra hiện trường, xử lý theo quy trình và theo dõi lại 20 phút.</p>
          <p>Đây không phải nhật ký lỗi thật của MetroPT-3.</p>
        </template>
      </div>

      <div class="pt-2 flex justify-end">
        <button class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer" @click="documentDialogRef.close()">
          Đóng
        </button>
      </div>
    </dialog>
  </div>
</template>
