<script setup>
import { computed, ref, watch } from 'vue'
import DeviceSensors from './DeviceSensors.vue'
import { createHistory } from '../mock-data/simulation.js'
import { transitionIncident } from '../mock-data/incidents.js'

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

const emit = defineEmits(['device', 'back', 'document'])

// Khai báo hằng số
const TAB_LIST = [
  { id: 'analysis', title: 'Phân tích & đề xuất' },
  { id: 'approval', title: 'Phê duyệt' },
  { id: 'verification', title: 'Sau xử lý' },
  { id: 'timeline', title: 'Lịch sử' }
]

// Khai báo state
const activeTab = ref(props.initialTab)
const decisionNote = ref('')
const draftAction = ref('')
const errorMessage = ref('')
const confirmDialog = ref(null)
const pendingDecision = ref('')

// Tạo dữ liệu mô phỏng trước/sau xử lý
const historyBefore = computed(() => createHistory(props.incident.machine, true))
const historyAfter = computed(() => createHistory(props.incident.machine, false))

// Đồng bộ tab và reset dữ liệu khi chuyển sang sự cố khác
watch(
  () => [props.incident.id, props.initialTab],
  () => {
    activeTab.value = props.initialTab
    decisionNote.value = props.incident.note
    errorMessage.value = ''
  }
)

function executeTransition(event, payload = {}) {
  try {
    transitionIncident(props.incident, event, payload)
    errorMessage.value = ''
    return true
  } catch (error) {
    errorMessage.value = error.message
    return false
  }
}

// Bắt đầu quy trình phê duyệt (hiển thị modal)
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

// Xác nhận quyết định từ modal
function confirmDecision() {
  const success = executeTransition(pendingDecision.value, {
    note: decisionNote.value,
    action: draftAction.value
  })

  if (success) {
    confirmDialog.value.close()
    if (pendingDecision.value === 'approve') activeTab.value = 'verification'
    if (pendingDecision.value === 'reject') activeTab.value = 'timeline'
  }
}

// Hoàn tất cửa sổ theo dõi
function finishVerification(event) {
  if (executeTransition(event)) {
    if (event === 'reanalyze') {
      activeTab.value = 'timeline'
    }
  }
}

function handleTabChange(tabId) {
  activeTab.value = tabId
  errorMessage.value = ''
}
</script>

<template>
  <!-- Header & Navigation -->
  <div class="row between">
    <button class="text-button" @click="emit('back')">← Danh sách cảnh báo</button>
    <button class="text-button" @click="emit('device', incident.machine)">
      Theo dõi cảm biến {{ incident.machine }} ↗
    </button>
  </div>

  <div class="page-heading">
    <div>
      <p class="caption">Dây chuyền {{ incident.line }} / {{ incident.id }}</p>
      <h1>{{ incident.machine }} · Chi tiết sự cố</h1>
      <p>{{ incident.title }} · Phát hiện {{ incident.time }}</p>
    </div>
    <div class="row">
      <span class="badge" :class="incident.risk === 'Cao' ? 'red' : 'amber'">
        {{ incident.risk }}
      </span>
      <span class="badge">{{ incident.state }}</span>
    </div>
  </div>

  <!-- Tabs Navigation -->
  <div class="tabs" aria-label="Nội dung sự cố">
    <button
      v-for="tab in TAB_LIST"
      :key="tab.id"
      :class="{ active: activeTab === tab.id }"
      :aria-pressed="activeTab === tab.id"
      @click="handleTabChange(tab.id)"
    >
      {{ tab.title }}
    </button>
  </div>

  <p v-if="errorMessage" role="alert" class="error">{{ errorMessage }}</p>

  <!-- TAB 1: Phân tích & Đề xuất -->
  <template v-if="activeTab === 'analysis'">
    <div class="detail-grid">
      <DeviceSensors :samples="historyBefore" :start="-1800" :end="0" :marker="-300" compact />
      
      <section class="panel">
        <div class="row between">
          <h2>Kết quả phát hiện bất thường</h2>
          <span class="badge">Minh họa</span>
        </div>
        
        <div class="metric-line">
          <span>Điểm bất thường</span>
          <strong>{{ incident.score.toFixed(2) }} / 1</strong>
        </div>
        <p class="caption">Không phải xác suất rò khí. Chưa kết nối mô hình học máy.</p>
        
        <div class="notice warning">
          Nghi vấn: rò khí hoặc nhu cầu sử dụng khí tăng. Cần kiểm tra để phân biệt.
        </div>
        
        <h2>Tóm tắt phân tích & bằng chứng</h2>
        <ol class="reason-list">
          <li>
            <h3>Quan sát tín hiệu</h3>
            <p>Áp suất giảm nhanh hơn đoạn nền; động cơ nén thường xuyên hơn.</p>
          </li>
          <li>
            <h3>Đối chiếu thông tin</h3>
            <p>Chưa có dữ liệu nhu cầu khí và kết quả kiểm tra hiện trường.</p>
          </li>
          <li>
            <h3>Đề xuất kiểm tra</h3>
            <p>Xác nhận nguyên nhân trước khi can thiệp thiết bị.</p>
          </li>
        </ol>
        
        <details>
          <summary>Nhật ký thao tác của trợ lý</summary>
          <p>Đọc cảm biến → nhận điểm bất thường → tìm tài liệu → soạn đề xuất. Các bước thực hiện được minh họa, chưa kết nối AI.</p>
        </details>
        
        <button class="source" @click="emit('document', 'sop')">↗ SOP-07 · Quy trình kiểm tra khí nén</button>
        <button class="source" @click="emit('document', 'case')">↗ SC-011 · Hồ sơ sự cố tham khảo</button>
      </section>
    </div>

    <section class="panel action-panel">
      <h2>Phương án đề xuất</h2>
      <p>{{ incident.action }}</p>
      
      <button v-if="incident.state === 'Chờ duyệt'" class="button primary" @click="activeTab = 'approval'">
        Xem & duyệt đề xuất
      </button>
      <button v-else-if="['Mới', 'Đang phân tích'].includes(incident.state)" class="button primary" @click="executeTransition('analyze') && (activeTab = 'approval')">
        Hoàn tất phân tích (demo)
      </button>
      <button v-else class="button" @click="activeTab = 'verification'">
        Theo dõi xử lý
      </button>
    </section>
  </template>

  <!-- TAB 2: Phê duyệt -->
  <template v-else-if="activeTab === 'approval'">
    <div v-if="incident.state === 'Chờ duyệt'" class="two-columns">
      <section class="panel">
        <h2>Quyết định của trưởng ca</h2>
        <div class="notice">{{ incident.action }}</div>
        <p>Duyệt đề xuất là giao việc kiểm tra cho kỹ thuật viên; không tự gửi lệnh điều khiển máy.</p>
        
        <label class="field">
          Ghi chú / lý do
          <textarea v-model="decisionNote" placeholder="Bắt buộc khi từ chối hoặc chỉnh sửa" />
        </label>
        
        <div class="row">
          <button class="button primary" @click="promptDecision('approve')">Duyệt đề xuất</button>
          <button class="button danger" @click="promptDecision('reject')">Từ chối</button>
          <button class="button" @click="promptDecision('edit')">Chỉnh sửa</button>
        </div>
      </section>
      
      <section class="panel">
        <h2>Thông tin phê duyệt</h2>
        <div class="metric-line"><span>Người duyệt</span><span>Nguyễn An · Trưởng ca</span></div>
        <div class="metric-line"><span>Gửi đề xuất lúc</span><span>{{ incident.time }}</span></div>
        <p>Mọi quyết định được ghi vào lịch sử sự cố trong phiên demo.</p>
      </section>
    </div>

    <section v-else class="panel">
      <h2>{{ ['Đang xử lý', 'Đang theo dõi', 'Đã đóng'].includes(incident.state) ? 'Đề xuất đã được duyệt' : 'Chưa có đề xuất chờ duyệt' }}</h2>
      <p>Trạng thái hiện tại: {{ incident.state }}.</p>
      <button class="button" @click="activeTab = 'timeline'">Xem lịch sử quyết định</button>
    </section>
  </template>

  <!-- TAB 3: Theo dõi sau xử lý -->
  <template v-else-if="activeTab === 'verification'">
    <section class="panel">
      <div class="row between">
        <h2>Theo dõi sau xử lý</h2>
        <span class="badge" :class="{ 'green': incident.state === 'Đã đóng' }">{{ incident.state }}</span>
      </div>
      
      <template v-if="['Đang xử lý', 'Đang theo dõi', 'Đã đóng'].includes(incident.state)">
        <p>{{ incident.machine }} · Cửa sổ theo dõi 20 phút (mô phỏng)</p>
        <progress :value="incident.progress" max="20" aria-label="Tiến trình theo dõi sau xử lý" />
        
        <div class="row between">
          <span>{{ incident.progress }} / 20 phút</span>
          <button v-if="incident.state === 'Đang xử lý'" class="button primary" @click="executeTransition('start')">Xác nhận đã thực hiện (demo)</button>
          <button v-if="incident.state === 'Đang theo dõi' && incident.progress < 20" class="button primary" @click="executeTransition('advance')">Tiến thêm 5 phút (demo)</button>
        </div>
        
        <template v-if="incident.state === 'Đang theo dõi' && incident.progress === 20">
          <div class="notice">Đã đủ cửa sổ theo dõi minh họa. Chọn kết quả để thử hai nhánh xử lý.</div>
          <div class="row">
            <button class="button primary" @click="finishVerification('close')">Ổn định → Đóng sự cố</button>
            <button class="button danger" @click="finishVerification('reanalyze')">Vẫn bất thường → Phân tích lại</button>
          </div>
        </template>
        
        <div v-if="incident.state === 'Đã đóng'" class="notice">Đã xác nhận ổn định và đóng sự cố.</div>
      </template>
      
      <template v-else>
        <p>Đề xuất cần được duyệt và kỹ thuật viên xác nhận đã thực hiện trước khi theo dõi.</p>
        <button class="button" @click="activeTab = incident.state === 'Chờ duyệt' ? 'approval' : 'analysis'">Quay lại đề xuất</button>
      </template>
    </section>
    
    <section v-if="incident.progress > 0" class="panel action-panel">
      <h2>So sánh trước / sau · dữ liệu mẫu</h2>
      <p>Kết quả mẫu minh họa trường hợp ổn định. Kỹ thuật viên vẫn cần xác nhận kết quả thực tế.</p>
      <div class="comparison">
        <div>
          <h3>Trước xử lý</h3>
          <DeviceSensors :samples="historyBefore" :start="-900" :end="0" :marker="-300" compact />
        </div>
        <div>
          <h3>Sau xử lý</h3>
          <DeviceSensors :samples="historyAfter" :start="-900" :end="0" compact />
        </div>
      </div>
    </section>
  </template>

  <!-- TAB 4: Lịch sử -->
  <section v-else class="panel">
    <h2>Lịch sử {{ incident.id }} · {{ incident.machine }}</h2>
    <ol class="timeline">
      <li v-for="(event, index) in incident.history" :key="index">
        <h3>{{ event.text }}</h3>
        <p>{{ event.time }} · {{ event.actor }}</p>
      </li>
    </ol>
  </section>

  <!-- Dialog xác nhận quyết định -->
  <dialog ref="confirmDialog" aria-labelledby="decision-title">
    <h2 id="decision-title">
      {{ pendingDecision === 'edit' ? 'Chỉnh sửa phương án' : pendingDecision === 'approve' ? 'Xác nhận duyệt đề xuất ? ' : 'Xác nhận từ chối đề xuất?' }}
    </h2>
    <p>{{ incident.id }} · {{ incident.machine }}</p>
    
    <label v-if="pendingDecision === 'edit'" class="field">
      Phương án
      <textarea v-model="draftAction" />
    </label>
    <p v-else>{{ decisionNote || 'Không có ghi chú bổ sung.' }}</p>
    
    <p v-if="errorMessage" role="alert" class="error">{{ errorMessage }}</p>
    
    <div class="row">
      <button class="button" @click="confirmDialog.close()">Quay lại</button>
      <button class="button primary" @click="confirmDecision">
        {{ pendingDecision === 'edit' ? 'Lưu phương án' : 'Xác nhận' }}
      </button>
    </div>
  </dialog>
</template>