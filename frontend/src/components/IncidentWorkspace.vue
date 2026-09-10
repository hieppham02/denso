<script setup>
import { ref, watch } from 'vue'
import DeviceSensors from './DeviceSensors.vue'
import { api } from '../api/client.js'

const props = defineProps({
  incident: {
    type: Object,
    required: true
  },
  initialTab: {
    type: String,
    default: 'analysis'
  }
})

const emit = defineEmits(['device', 'back', 'document', 'updated'])

const TAB_LIST = [
  { id: 'analysis', title: 'Phân tích & đề xuất' },
  { id: 'approval', title: 'Phê duyệt' },
  { id: 'verification', title: 'Sau xử lý' },
  { id: 'timeline', title: 'Lịch sử' }
]

const activeTab = ref(props.initialTab)
const decisionNote = ref('')
const draftAction = ref('')
const errorMessage = ref('')
const confirmDialog = ref(null)
const pendingDecision = ref('')

// Tạo dữ liệu trước/sau xử lý
const historyBefore = ref([])
const historyAfter = ref([])

async function loadHistories() {
  try {
    const [before, after] = await Promise.all([
      api.history(props.incident.machine, 15, true),
      api.history(props.incident.machine, 15, false),
    ])
    historyBefore.value = before
    historyAfter.value = after
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error.message
  }
}

watch(
  () => [props.incident.id, props.initialTab],
  () => {
    activeTab.value = props.initialTab
    decisionNote.value = props.incident.note
    errorMessage.value = ''
    loadHistories()
  },
  { immediate: true }
)

async function executeTransition(event, payload = {}) {
  try {
    const updatedIncident = await api.transition(props.incident.id, event, payload)
    emit('updated', updatedIncident)
    errorMessage.value = ''
    return true
  } catch (error) {
    errorMessage.value = error.message
    return false
  }
}

function promptDecision(event) {
  errorMessage.value = ''
  if (event !== 'approve' && !decisionNote.value.trim()) {
    errorMessage.value = 'Nhập lý do khi từ chối hoặc chỉnh sửa.'
    return
  }
  pendingDecision.value = event
  draftAction.value = props.incident.action
  confirmDialog.value.showModal()
}

async function confirmDecision() {
  const success = await executeTransition(pendingDecision.value, {
    note: decisionNote.value,
    action: draftAction.value
  })

  if (success) {
    confirmDialog.value.close()
    if (pendingDecision.value === 'approve') activeTab.value = 'verification'
    if (pendingDecision.value === 'reject') activeTab.value = 'timeline'
  }
}

async function finishVerification(event) {
  if (await executeTransition(event)) {
    if (event === 'reanalyze') {
      activeTab.value = 'timeline'
    }
  }
}

async function analyzeIncident() {
  if (await executeTransition('analyze')) activeTab.value = 'approval'
}

function handleTabChange(tabId) {
  activeTab.value = tabId
  errorMessage.value = ''
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header điều hướng -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <button class="text-sm font-medium text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0" @click="emit('back')">
        ← Danh sách cảnh báo
      </button>
      <button class="text-sm font-medium text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0" @click="emit('device', incident.machine)">
        Theo dõi cảm biến {{ incident.machine }} ↗
      </button>
    </div>

    <!-- Thông tin sự cố -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dây chuyền {{ incident.line }} / {{ incident.id }}</p>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight mt-1">{{ incident.machine }} · Chi tiết sự cố</h1>
        <p class="text-sm text-slate-500 mt-0.5">{{ incident.title }} · Phát hiện lúc {{ incident.time }}</p>
      </div>
      <div class="flex items-center gap-2">
        <span 
          class="px-2.5 py-1 rounded text-xs font-semibold"
          :class="incident.risk === 'Cao' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'"
        >
          Mức độ: {{ incident.risk }}
        </span>
        <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {{ incident.state }}
        </span>
      </div>
    </div>

    <!-- Tabs chuyển đổi thuần Tailwind -->
    <div class="flex items-center gap-6 border-b border-slate-200 text-sm font-medium">
      <button
        v-for="tab in TAB_LIST"
        :key="tab.id"
        class="py-3 border-b-2 transition-colors cursor-pointer bg-transparent"
        :class="activeTab === tab.id 
          ? 'border-blue-600 text-blue-600 font-semibold' 
          : 'border-transparent text-slate-500 hover:text-slate-800'"
        :aria-pressed="activeTab === tab.id"
        @click="handleTabChange(tab.id)"
      >
        {{ tab.title }}
      </button>
    </div>

    <!-- Thông báo lỗi nếu có -->
    <div v-if="errorMessage" role="alert" class="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
      {{ errorMessage }}
    </div>

    <!-- TAB 1: Phân tích & Đề xuất -->
    <template v-if="activeTab === 'analysis'">
      <div class="grid items-start gap-5 xl:grid-cols-[1.25fr_1fr]">
        <DeviceSensors :samples="historyBefore" :start="-1800" :end="0" :marker="-300" compact />
        
        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div class="flex justify-between items-center gap-3">
            <h2 class="text-base font-semibold text-slate-800">Kết quả phát hiện bất thường</h2>
            <span class="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">Minh họa</span>
          </div>
          
          <div class="flex justify-between items-center py-2.5 border-b border-slate-100">
            <span class="text-sm text-slate-500">Điểm dị biệt (Anomaly score)</span>
            <strong class="text-xl font-bold text-slate-900 tabular-nums">{{ incident.score.toFixed(2) }} / 1.00</strong>
          </div>
          <p class="text-xs text-slate-400">Không phải xác suất rò khí. Hiện chưa kết nối mô hình học máy trực tiếp.</p>
          
          <div class="p-3.5 rounded-lg bg-amber-50 border-l-4 border-amber-500 text-xs text-amber-800 leading-relaxed font-medium">
            Nghi vấn: Dấu hiệu rò khí hoặc nhu cầu phụ tải khí tăng đột biến. Cần cử kỹ thuật viên kiểm tra xác nhận.
          </div>
          
          <h3 class="text-sm font-semibold text-slate-800 pt-2">Bằng chứng phân tích</h3>
          <ol class="space-y-2 text-xs text-slate-600 list-decimal list-inside">
            <li><strong class="text-slate-800">Cảm biến áp suất:</strong> Tụt áp TP3 nhanh hơn dữ liệu nền; chu kỳ chạy máy nén dày hơn.</li>
            <li><strong class="text-slate-800">Đối chiếu vận hành:</strong> Chưa có ghi nhận lịch bảo dưỡng gần nhất tại hiện trường.</li>
            <li><strong class="text-slate-800">Đề xuất:</strong> Xác nhận vị trí rò rỉ van/đường ống trước khi ngắt cụm cấp khí.</li>
          </ol>
          
          <div class="pt-3 border-t border-slate-100 space-y-2">
            <button class="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer transition-colors" @click="emit('document', 'sop')">
              ↗ SOP-07 · Quy trình kiểm tra hệ thống khí nén
            </button>
            <button class="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer transition-colors" @click="emit('document', 'case')">
              ↗ SC-011 · Hồ sơ bảo dưỡng rò khí tương tự
            </button>
          </div>
        </section>
      </div>

      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 class="text-base font-semibold text-slate-800">Phương án đề xuất hiện tại</h2>
          <p class="text-sm text-slate-600 mt-1">{{ incident.action }}</p>
        </div>
        
        <div>
          <button v-if="incident.state === 'Chờ duyệt'" class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer" @click="activeTab = 'approval'">
            Xem & duyệt đề xuất
          </button>
          <button v-else-if="['Mới', 'Đang phân tích'].includes(incident.state)" class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer" @click="analyzeIncident">
            Hoàn tất phân tích (demo)
          </button>
          <button v-else class="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer shadow-xs" @click="activeTab = 'verification'">
            Theo dõi xử lý
          </button>
        </div>
      </section>
    </template>

    <!-- TAB 2: Phê duyệt -->
    <template v-else-if="activeTab === 'approval'">
      <div v-if="incident.state === 'Chờ duyệt'" class="grid gap-5 md:grid-cols-2">
        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h2 class="text-base font-semibold text-slate-800">Quyết định của trưởng ca</h2>
          <div class="p-3.5 rounded-lg bg-blue-50 border-l-4 border-blue-600 text-xs text-blue-900 leading-relaxed font-medium">
            {{ incident.action }}
          </div>
          <p class="text-xs text-slate-400">Duyệt đề xuất đồng nghĩa với việc phân công kỹ thuật viên kiểm tra; không tự ý can thiệp đóng ngắt máy từ xa.</p>
          
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-600 block">Ghi chú phê duyệt / Lý do:</label>
            <textarea 
              v-model="decisionNote" 
              placeholder="Bắt buộc nhập khi từ chối hoặc yêu cầu chỉnh sửa"
              class="w-full min-h-[90px] rounded-lg border border-slate-200 p-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          
          <div class="flex items-center gap-2 pt-2">
            <button class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-xs" @click="promptDecision('approve')">
              Duyệt đề xuất
            </button>
            <button class="px-4 py-2 rounded-lg text-sm font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 cursor-pointer shadow-xs" @click="promptDecision('reject')">
              Từ chối
            </button>
            <button class="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer shadow-xs" @click="promptDecision('edit')">
              Chỉnh sửa
            </button>
          </div>
        </section>
        
        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h2 class="text-base font-semibold text-slate-800">Thông tin ca trực</h2>
          <div class="flex justify-between py-2 border-b border-slate-100 text-sm">
            <span class="text-slate-500">Người phụ trách</span>
            <span class="font-medium text-slate-800">Nguyễn An · Trưởng ca</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-100 text-sm">
            <span class="text-slate-500">Thời điểm phát hiện</span>
            <span class="font-medium text-slate-800">{{ incident.time }}</span>
          </div>
          <p class="text-xs text-slate-400 pt-2">
            Mọi hành động phê duyệt sẽ được ghi vào nhật ký kiểm toán (Audit Log) phục vụ quản lý chất lượng theo tiêu chuẩn nhà máy.
          </p>
        </section>
      </div>

      <section v-else class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs text-center space-y-3">
        <h2 class="text-base font-semibold text-slate-800">
          {{ ['Đang xử lý', 'Đang theo dõi', 'Đã đóng'].includes(incident.state) ? 'Đề xuất đã được thông qua' : 'Chưa có đề xuất chờ duyệt' }}
        </h2>
        <p class="text-sm text-slate-500">Trạng thái hiện tại: <span class="font-semibold text-slate-800">{{ incident.state }}</span></p>
        <button class="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer shadow-xs" @click="activeTab = 'timeline'">
          Xem lịch sử xử lý
        </button>
      </section>
    </template>

    <!-- TAB 3: Theo dõi sau xử lý (Verification) -->
    <template v-else-if="activeTab === 'verification'">
      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div class="flex justify-between items-center gap-3">
          <h2 class="text-base font-semibold text-slate-800">Theo dõi ổn định sau bảo trì</h2>
          <span 
            class="px-2.5 py-0.5 rounded-full text-xs font-semibold"
            :class="incident.state === 'Đã đóng' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'"
          >
            {{ incident.state }}
          </span>
        </div>
        
        <template v-if="['Đang xử lý', 'Đang theo dõi', 'Đã đóng'].includes(incident.state)">
          <div class="space-y-1.5">
            <div class="flex justify-between text-xs text-slate-500 font-medium">
              <span>{{ incident.machine }} · Cửa sổ theo dõi tiêu chuẩn</span>
              <span>{{ incident.progress }} / 20 phút</span>
            </div>
            <!-- Progress bar Tailwind -->
            <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                class="h-full bg-blue-600 transition-all duration-300 rounded-full"
                :style="{ width: `${(incident.progress / 20) * 100}%` }"
              ></div>
            </div>
          </div>
          
          <div class="flex flex-wrap items-center gap-3 pt-2">
            <button 
              v-if="incident.state === 'Đang xử lý'" 
              class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer"
              @click="executeTransition('start')"
            >
              Xác nhận đã thực hiện tại hiện trường (demo)
            </button>
            <button 
              v-if="incident.state === 'Đang theo dõi' && incident.progress < 20" 
              class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer"
              @click="executeTransition('advance')"
            >
              Tiến thêm 5 phút quan sát (demo)
            </button>
          </div>
          
          <template v-if="incident.state === 'Đang theo dõi' && incident.progress === 20">
            <div class="p-3.5 rounded-lg bg-emerald-50 border-l-4 border-emerald-500 text-xs text-emerald-800 font-medium">
              Đã hoàn thành 20 phút theo dõi mô phỏng. Hãy đưa ra kết luận cuối cùng:
            </div>
            <div class="flex items-center gap-2">
              <button class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer" @click="finishVerification('close')">
                Áp suất ổn định → Đóng sự cố
              </button>
              <button class="px-4 py-2 rounded-lg text-sm font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 shadow-xs cursor-pointer" @click="finishVerification('reanalyze')">
                Vẫn bất thường → Phân tích lại
              </button>
            </div>
          </template>
        </template>
        
        <template v-else>
          <p class="text-sm text-slate-500">Đề xuất cần được trưởng ca duyệt và kỹ thuật viên bắt đầu xử lý trước khi kích hoạt quy trình theo dõi.</p>
          <button class="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer" @click="activeTab = 'approval'">
            Quay lại phê duyệt
          </button>
        </template>
      </section>
      
      <!-- Biểu đồ so sánh trước / sau -->
      <section v-if="incident.progress > 0" class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div>
          <h2 class="text-base font-semibold text-slate-800">Đối chứng trước & sau can thiệp</h2>
          <p class="text-xs text-slate-400 mt-0.5">Dữ liệu minh họa trạng thái ổn định sau khi siết/thay gioăng rò khí.</p>
        </div>
        <div class="grid gap-5 xl:grid-cols-2">
          <div class="rounded-lg border border-slate-100 p-3 bg-slate-50/50">
            <h3 class="text-xs font-semibold text-slate-600 mb-2">TRƯỚC CAN THIỆP (CÓ RÒ KHÍ)</h3>
            <DeviceSensors :samples="historyBefore" :start="-900" :end="0" :marker="-300" compact />
          </div>
          <div class="rounded-lg border border-slate-100 p-3 bg-slate-50/50">
            <h3 class="text-xs font-semibold text-emerald-700 mb-2">SAU CAN THIỆP (ĐÃ KHẮC PHỤC)</h3>
            <DeviceSensors :samples="historyAfter" :start="-900" :end="0" compact />
          </div>
        </div>
      </section>
    </template>

    <!-- TAB 4: Lịch sử Audit Trail -->
    <section v-else class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <h2 class="text-base font-semibold text-slate-800">Nhật ký xử lý {{ incident.id }} · {{ incident.machine }}</h2>
      
      <ol class="relative border-l-2 border-slate-200 ml-3 space-y-6 pt-2">
        <li v-for="(event, index) in incident.history" :key="index" class="ml-4">
          <span class="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-600"></span>
          <h3 class="text-sm font-semibold text-slate-800">{{ event.text }}</h3>
          <p class="text-xs text-slate-400 mt-0.5">{{ event.time }} · {{ event.actor }}</p>
        </li>
      </ol>
    </section>

    <!-- Dialog xác nhận phê duyệt -->
    <dialog ref="confirmDialog" class="backdrop:bg-slate-900/50 rounded-2xl border border-slate-200 p-6 bg-white shadow-2xl max-w-md w-[90vw] m-auto space-y-4" aria-labelledby="decision-title">
      <h2 id="decision-title" class="text-lg font-bold text-slate-900">
        {{ pendingDecision === 'edit' ? 'Chỉnh sửa phương án' : pendingDecision === 'approve' ? 'Xác nhận duyệt đề xuất?' : 'Xác nhận từ chối đề xuất?' }}
      </h2>
      <p class="text-xs text-slate-500">{{ incident.id }} · {{ incident.machine }}</p>
      
      <div v-if="pendingDecision === 'edit'" class="space-y-1">
        <label class="text-xs font-medium text-slate-600">Nội dung phương án mới:</label>
        <textarea v-model="draftAction" class="w-full min-h-[90px] rounded-lg border border-slate-200 p-2.5 text-sm text-slate-700" />
      </div>
      <p v-else class="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
        {{ decisionNote || 'Không có ghi chú bổ sung.' }}
      </p>
      
      <div class="flex justify-end gap-2 pt-2">
        <button class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer" @click="confirmDialog.close()">
          Quay lại
        </button>
        <button class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer" @click="confirmDecision">
          {{ pendingDecision === 'edit' ? 'Lưu phương án' : 'Xác nhận' }}
        </button>
      </div>
    </dialog>
  </div>
</template>
