<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Activity, Bell, BookOpen, Building2, ChevronRight, Factory, FlaskConical, History, LayoutDashboard, Menu, ShieldCheck } from 'lucide-vue-next'

// Components
import FleetMap from './components/FleetMap.vue'
import DeviceSensors from './components/DeviceSensors.vue'
import IncidentWorkspace from './components/IncidentWorkspace.vue'
import AlertTable from './components/AlertTable.vue'
import SensorPanel from './components/SensorPanel.vue'

// Logic & Dữ liệu
import { createHistory, devices, formatTime, LEAK_START, SIMULATION_DURATION } from './mock-data/simulation.js'
import { createIncidents } from './mock-data/incidents.js'
import { useSimulation } from './mock-data/useSimulation.js'

// Hằng số Navigation
const NAVIGATION_MENU = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'machines', label: 'Thiết bị', icon: Factory },
  { id: 'simulation', label: 'Mô phỏng', icon: FlaskConical },
  { id: 'alerts', label: 'Cảnh báo', icon: Bell },
  { id: 'approvals', label: 'Chờ duyệt', icon: ShieldCheck },
  { id: 'history', label: 'Lịch sử xử lý', icon: History },
  { id: 'knowledge', label: 'Tài liệu kỹ thuật', icon: BookOpen }
]

const ALLOWED_ROUTES = [...NAVIGATION_MENU.map(n => n.id), 'device', 'incident']

// Trạng thái toàn cục (Global State)
const currentView = ref('overview')
const deviceId = ref('APU-09')
const incidentId = ref('SC-024')
const incidentTab = ref('analysis')
const isMenuOpen = ref(false)
const windowMinutes = ref(15)

const incidentsList = ref(createIncidents())
const documentDialogRef = ref(null)
const documentType = ref('sop')

// Hook Mô phỏng
const { session, isRunning, currentScenario, playbackSpeed, pause, reset, play } = useSimulation()

// Computed Properties: Xử lý dữ liệu hiển thị
const openIncidents = computed(() => incidentsList.value.filter(a => a.state !== 'Đã đóng'))
const pendingIncidents = computed(() => incidentsList.value.filter(a => a.state === 'Chờ duyệt'))
const selectedIncident = computed(() => incidentsList.value.find(a => a.id === incidentId.value) || incidentsList.value[0])

const deviceIncident = computed(() => openIncidents.value.find(a => a.machine === deviceId.value))
const deviceHistory = computed(() => createHistory(deviceId.value, !!deviceIncident.value))
const deviceLine = computed(() => devices.find(d => d.id === deviceId.value)?.line)

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
const trendSamples = [1, 2, 1, 3, 2, 4, 3, 5].map((value, index) => ({ time: (index - 7) * 3600, count: value }))

// Router thủ công (Hash-based Routing)
function navigateTo(nextView, id = '', tab = 'analysis') {
  const hashParts = [nextView, id, tab === 'analysis' ? '' : tab].filter(Boolean)
  window.location.hash = hashParts.join('/')
}

function parseHashRoute() {
  const [nextView, id, tab] = window.location.hash.slice(1).split('/')

  currentView.value = ALLOWED_ROUTES.includes(nextView) ? nextView : 'overview'

  if (['device', 'simulation'].includes(nextView) && devices.some(d => d.id === id)) {
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
  reset(deviceId.value)
  navigateTo('simulation', deviceId.value)
}

function handleSelectDevice(event) {
  navigateTo(currentView.value, event.target.value)
}

function handleOpenDocument(type) {
  documentType.value = type
  documentDialogRef.value.showModal()
}

// Theo dõi thay đổi trạng thái
watch(currentView, (newView) => {
  if (newView !== 'simulation') pause()
})
watch(deviceId, () => reset(deviceId.value))
watch(currentScenario, () => reset(deviceId.value))

// Lifecycle
onMounted(() => {
  parseHashRoute()
  window.addEventListener('hashchange', parseHashRoute)
})
onBeforeUnmount(() => {
  window.removeEventListener('hashchange', parseHashRoute)
})
</script>

<template>
  <div class="block min-h-screen min-[801px]:flex">
    <a class="skip-link" href="#main-content">Đến nội dung chính</a>

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: isMenuOpen }">
      <a class="brand" href="#overview">
        <span></span>FactoryDoctor
      </a>
      <p class="sidebar-label">DENSO · NHÓM A1</p>

      <nav aria-label="Điều hướng chính">
        <a
          v-for="nav in NAVIGATION_MENU"
          :key="nav.id"
          :href="`#${nav.id}`"
          :class="{ active: activeNavMenu === nav.id }"
          :aria-current="activeNavMenu === nav.id ? 'page' : undefined"
        >
          <component :is="nav.icon" :size="18" aria-hidden="true" />
          {{ nav.label }}
          <span
            v-if="nav.id === 'approvals' && pendingIncidents.length"
            class="badge amber"
          >
            {{ pendingIncidents.length }}
          </span>
        </a>
      </nav>

      <div class="sidebar-bottom">
        <small>CA SÁNG · 08:00–16:00</small>
        <p>Nguyễn An<small>Trưởng ca bảo trì · Demo</small></p>
      </div>
    </aside>

    <div class="min-w-0 flex-1">
      <!-- Topbar -->
      <header class="topbar">
        <div class="flex flex-wrap items-center gap-3">
          <button
            class="icon-button mobile-toggle"
            :aria-expanded="isMenuOpen"
            aria-label="Mở hoặc đóng menu"
            @click="isMenuOpen = !isMenuOpen"
          >
            <Menu :size="20" />
          </button>
          <Building2 :size="18" aria-hidden="true" />
          <span>Nhà máy A1</span>
          <ChevronRight :size="14" aria-hidden="true" />
          <span class="text-slate-500">{{ pageTitle }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="demo-label">DỮ LIỆU MẪU</span>
          <span class="avatar">AN</span>
        </div>
      </header>

      <!-- Main Content -->
      <main id="main-content">
        <!-- VIEW: Tổng quan -->
        <template v-if="currentView === 'overview'">
          <div class="page-heading">
            <div>
              <h1>Tổng quan nhà máy</h1>
              <p>Thứ Tư, 09 tháng 09, 2026 · Ca sáng</p>
            </div>
            <button class="button primary" @click="navigateTo('alerts')">Xem cảnh báo</button>
          </div>

          <div class="kpis">
            <article>
              <span>Cảnh báo đang mở</span>
              <strong>{{ openIncidents.length.toString().padStart(2, '0') }}</strong>
              <small>{{ pendingIncidents.length }} đề xuất chờ duyệt</small>
            </article>
            <article>
              <span>Đã xử lý hôm nay</span>
              <strong>{{ 18 + incidentsList.filter(a => a.state === 'Đã đóng').length }}</strong>
              <small>Đã xác nhận và đóng</small>
            </article>
            <article>
              <span>Xử lý đạt lần đầu</span>
              <strong>89<small>%</small></strong>
              <small>16 / 18 ca trước phiên demo</small>
            </article>
            <article>
              <span>Phản hồi trung bình</span>
              <strong>4.2 <small>phút</small></strong>
              <small>Phát hiện → tiếp nhận · Mẫu</small>
            </article>
          </div>

          <div class="grid items-start gap-5 min-[1201px]:grid-cols-[1.15fr_1fr]">
            <FleetMap :incidents="incidentsList" @select="handleOpenDevice" />
            <div class="grid min-w-0 content-start gap-[18px]">
              <section class="min-w-0 rounded-lg border border-slate-200 bg-white p-4 lg:p-5">
                <h2>Cảnh báo phát sinh</h2>
                <SensorPanel
                  :samples="trendSamples"
                  :sensor="{ key: 'count', name: '8 giờ gần nhất', unit: 'cảnh báo' }"
                  :start="-25200"
                  :end="0"
                />
              </section>
              <section class="min-w-0 rounded-lg border border-slate-200 bg-white p-4 lg:p-5">
                <div class="flex flex-wrap items-center gap-3 justify-between">
                  <h2>Cần chú ý ngay</h2>
                  <span class="badge amber">{{ openIncidents.length }} mở</span>
                </div>
                <div v-for="incident in openIncidents" :key="incident.id" class="feed-row">
                  <div>
                    <button class="text-button" @click="handleOpenIncident(incident.id)">
                      {{ incident.machine }} <span class="text-slate-500">/ Dây chuyền {{ incident.line }}</span>
                    </button>
                    <p>{{ incident.title }}</p>
                    <small>{{ incident.time }} · {{ incident.state }}</small>
                  </div>
                  <span class="badge" :class="incident.risk === 'Cao' ? 'red' : 'amber'">
                    {{ incident.risk }}
                  </span>
                </div>
                <p v-if="!openIncidents.length" class="p-7 text-center text-slate-500">Không còn cảnh báo đang mở.</p>
              </section>
            </div>
          </div>
        </template>

        <!-- VIEW: Thiết bị -->
        <template v-else-if="currentView === 'machines'">
          <div class="page-heading">
            <div>
              <h1>Thiết bị & dây chuyền</h1>
              <p>24 máy nén khí · Nhấn bất kỳ máy nào để xem toàn bộ cảm biến.</p>
            </div>
            <span class="badge green">{{ 24 - openIncidents.length }} bình thường</span>
          </div>
          <FleetMap :incidents="incidentsList" @select="handleOpenDevice" />
        </template>

        <!-- VIEW: Theo dõi 1 thiết bị -->
        <template v-else-if="currentView === 'device'">
          <button class="text-button" @click="navigateTo('machines')">← Tất cả thiết bị</button>
          <div class="page-heading">
            <div>
              <h1>{{ deviceId }} · Theo dõi cảm biến</h1>
              <p>Dây chuyền {{ deviceLine }} · Máy nén khí</p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <select :value="deviceId" aria-label="Chọn thiết bị" @change="handleSelectDevice">
                <option v-for="d in devices" :key="d.id">{{ d.id }}</option>
              </select>
              <button class="button primary" @click="handleOpenSimulation">Mô phỏng thiết bị</button>
            </div>
          </div>

          <div class="device-strip">
            <div class="flex flex-wrap items-center gap-3">
              <span class="badge" :class="deviceIncident ? 'amber' : 'green'">
                {{ deviceIncident ? 'Có cảnh báo' : 'Bình thường' }}
              </span>
              <small>Dữ liệu mẫu · 09/09/2026 10:00:00</small>
            </div>
            <button v-if="deviceIncident" class="text-button" @click="handleOpenIncident(deviceIncident.id)">
              Xem {{ deviceIncident.id }} →
            </button>
            <small v-else>Không có cảnh báo đang mở</small>
          </div>

          <div class="flex flex-wrap items-center gap-3 justify-between mb-4">
            <h2>Dữ liệu vận hành</h2>
            <div class="range-buttons">
              <button
                v-for="n in [15, 30, 60]"
                :key="n"
                :class="{ active: windowMinutes === n }"
                :aria-pressed="windowMinutes === n"
                @click="windowMinutes = n"
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
          <div class="page-heading">
            <div>
              <h1>Cảnh báo & sự cố</h1>
              <p>Lọc theo dây chuyền, mức độ và tiến độ xử lý.</p>
            </div>
          </div>
          <AlertTable :incidents="incidentsList" filters @select="handleOpenIncident" />
        </template>

        <!-- VIEW: Mô phỏng vận hành -->
        <template v-else-if="currentView === 'simulation'">
          <!-- Block mô phỏng... (Đã căn chỉnh thụt lề tương tự) -->
          <div class="page-heading">
            <div>
              <h1>Mô phỏng vận hành</h1>
              <p>Thử kịch bản và quan sát phản ứng của các cảm biến.</p>
            </div>
            <span class="badge">Không điều khiển thiết bị</span>
          </div>
          <section class="min-w-0 rounded-lg border border-slate-200 bg-white p-4 lg:p-5 simulation-controls">
            <div class="flex flex-wrap items-center gap-3 justify-between">
              <div class="flex flex-wrap items-center gap-3">
                <label>
                  Thiết bị
                  <select :value="deviceId" @change="handleSelectDevice">
                    <option v-for="d in devices" :key="d.id">{{ d.id }}</option>
                  </select>
                </label>
                <label>
                  Kịch bản
                  <select v-model="currentScenario">
                    <option value="normal">Bình thường</option>
                    <option value="leak">Rò khí</option>
                  </select>
                </label>
                <label>
                  Tốc độ
                  <select v-model.number="playbackSpeed">
                    <option v-for="n in [1, 2, 5]" :key="n" :value="n">{{ n }}×</option>
                  </select>
                </label>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <button class="button primary" @click="isRunning ? pause() : play(deviceId)">
                  {{ isRunning ? 'Tạm dừng' : 'Chạy mô phỏng' }}
                </button>
                <button class="button" @click="reset(deviceId)">Chạy lại</button>
              </div>
            </div>
            <div class="simulation-status">
              <strong>{{ formatTime(session.elapsed, true) }}</strong>
              <span>
                {{ session.elapsed >= SIMULATION_DURATION ? 'Đã hoàn tất 15 phút' : isRunning ? 'Đang chạy' : 'Đang tạm dừng' }}
                · 1 giây thực = {{ 5 * playbackSpeed }} giây mô phỏng
              </span>
              <span class="badge" :class="currentScenario === 'leak' && session.elapsed >= LEAK_START ? 'amber' : 'green'">
                {{ currentScenario === 'leak' && session.elapsed >= LEAK_START ? 'Đang rò khí' : 'Bình thường' }}
                · {{ latestSimSample.loaded ? 'Động cơ nén' : 'Động cơ nghỉ' }}
              </span>
            </div>
            <p class="caption">
              {{ currentScenario === 'leak' ? 'Rò khí bắt đầu tại 01:00. Vạch cam đánh dấu thời điểm bắt đầu.' : 'Chu kỳ nạp và tiêu thụ khí bình thường.' }}
              Đổi thiết bị hoặc kịch bản sẽ đưa mô phỏng về đầu.
            </p>
          </section>
          <DeviceSensors
            :samples="session.samples"
            :start="Math.max(-300, session.elapsed - 900)"
            :end="Math.max(60, session.elapsed)"
            :marker="currentScenario === 'leak' && session.elapsed >= LEAK_START ? LEAK_START : null"
            relative
          />
        </template>

        <!-- VIEW: Các view phụ (Approvals, History, Workspace, Knowledge) -->
        <template v-else-if="currentView === 'approvals'">
          <div class="page-heading">
            <div>
              <h1>Đề xuất chờ duyệt</h1>
              <p>Xem bằng chứng và quyết định phương án trước khi giao việc.</p>
            </div>
          </div>
          <div class="grid min-w-0 content-start gap-[18px]">
            <section v-for="a in pendingIncidents" :key="a.id" class="min-w-0 rounded-lg border border-slate-200 bg-white p-4 lg:p-5">
              <div class="flex flex-wrap items-center gap-3 justify-between">
                <h2>{{ a.machine }} / {{ a.id }} · Dây chuyền {{ a.line }}</h2>
                <span class="badge" :class="a.risk === 'Cao' ? 'red' : 'amber'">{{ a.risk }}</span>
              </div>
              <p>{{ a.title }}</p>
              <div class="flex flex-wrap items-center gap-3 justify-between">
                <small>Chờ duyệt từ {{ a.time }}</small>
                <button class="button primary" @click="handleOpenIncident(a.id, 'approval')">Xem & quyết định →</button>
              </div>
            </section>
            <section v-if="!pendingIncidents.length" class="min-w-0 rounded-lg border border-slate-200 bg-white p-4 lg:p-5 p-7 text-center text-slate-500">Đã xử lý hết đề xuất chờ duyệt.</section>
          </div>
        </template>

        <template v-else-if="currentView === 'history'">
          <div class="page-heading">
            <div>
              <h1>Lịch sử xử lý</h1>
              <p>Theo dõi quyết định, người thực hiện và các lần phân tích lại.</p>
            </div>
          </div>
          <AlertTable :incidents="incidentsList" @select="handleOpenIncident($event, 'timeline')" />
        </template>

        <IncidentWorkspace
          v-else-if="currentView === 'incident'"
          :key="selectedIncident.id"
          :incident="selectedIncident"
          :initial-tab="incidentTab"
          @device="handleOpenDevice"
          @back="navigateTo('alerts')"
          @document="handleOpenDocument"
        />

        <template v-else-if="currentView === 'knowledge'">
          <div class="page-heading">
            <div>
              <h1>Tài liệu kỹ thuật</h1>
              <p>Nguồn tham chiếu minh họa cho bước phân tích và đề xuất.</p>
            </div>
          </div>
          <div class="grid gap-5 min-[801px]:grid-cols-2">
            <section class="min-w-0 rounded-lg border border-slate-200 bg-white p-4 lg:p-5">
              <h2>SOP-07 · Kiểm tra khí nén</h2>
              <p>Quy trình thao tác chuẩn (SOP) · Bản mẫu</p>
              <button class="source" @click="handleOpenDocument('sop')">Mở tài liệu ↗</button>
            </section>
            <section class="min-w-0 rounded-lg border border-slate-200 bg-white p-4 lg:p-5">
              <h2>SC-011 · Sự cố tham khảo</h2>
              <p>Hồ sơ bảo trì · Bản mẫu</p>
              <button class="source" @click="handleOpenDocument('case')">Xem hồ sơ ↗</button>
            </section>
          </div>
        </template>

        <footer>
          <span>FactoryDoctor · Nhóm A1</span>
          <span>Dữ liệu giả lập · Thao tác chỉ lưu trong phiên hiện tại</span>
        </footer>
      </main>
    </div>

    <!-- Modal Tài liệu -->
    <dialog ref="documentDialogRef" aria-labelledby="document-title">
      <h2 id="document-title">
        {{ documentType === 'sop' ? 'SOP-07 · Quy trình mẫu' : 'SC-011 · Hồ sơ mẫu' }}
      </h2>
      <p class="badge amber">Tài liệu giả lập để duyệt UI</p>

      <template v-if="documentType === 'sop'">
        <p>Phạm vi: kiểm tra dấu hiệu bất thường của hệ thống khí nén.</p>
        <p>Người thực hiện: kỹ thuật viên được phân công, tham chiếu quy trình bảo trì đã phê duyệt tại nhà máy.</p>
        <p>Đầu ra: kết quả kiểm tra, nguyên nhân xác nhận, ghi nhận trước/sau và người xác nhận.</p>
      </template>
      <template v-else>
        <p>Máy APU-03: áp suất giảm và chu kỳ nén tăng. Hồ sơ mẫu ghi nhận kiểm tra hiện trường, xử lý theo quy trình và theo dõi lại 20 phút.</p>
        <p>Đây không phải nhật ký lỗi thật của MetroPT-3.</p>
      </template>

      <div class="flex flex-wrap items-center gap-3">
        <button class="button" @click="documentDialogRef.close()">Đóng</button>
      </div>
    </dialog>
  </div>
</template>
