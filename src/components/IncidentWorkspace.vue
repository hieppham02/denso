<script setup>
import { computed, ref, watch } from 'vue'
import DeviceSensors from './DeviceSensors.vue'
import { createHistory } from '../data/simulation'
import { transitionIncident } from '../data/incidents'
const props = defineProps({ incident: { type: Object, required: true }, initialTab: { type: String, default: 'analysis' } })
const emit = defineEmits(['device', 'back', 'document'])
const tab = ref(props.initialTab), note = ref(''), draft = ref(''), error = ref(''), dialog = ref(null), decision = ref('')
watch(() => [props.incident.id, props.initialTab], () => { tab.value = props.initialTab; note.value = props.incident.note; error.value = '' })
const before = computed(() => createHistory(props.incident.machine, true))
const after = computed(() => createHistory(props.incident.machine, false))
const tabs = [['analysis', 'Phân tích & đề xuất'], ['approval', 'Phê duyệt'], ['verification', 'Sau xử lý'], ['timeline', 'Lịch sử']]
function change(event, payload = {}) {
  try { transitionIncident(props.incident, event, payload); error.value = ''; return true }
  catch (e) { error.value = e.message; return false }
}
function ask(event) {
  error.value = ''
  if (event !== 'approve' && !note.value.trim()) { error.value = 'Nhập lý do khi từ chối hoặc chỉnh sửa.'; return }
  decision.value = event; draft.value = props.incident.action; dialog.value.showModal()
}
function confirm() {
  if (change(decision.value, { note: note.value, action: draft.value })) {
    dialog.value.close()
    if (decision.value === 'approve') tab.value = 'verification'
    if (decision.value === 'reject') tab.value = 'timeline'
  }
}
function finish(event) { if (change(event)) { if (event === 'reanalyze') tab.value = 'timeline' } }
</script>
<template>
  <div class="row between"><button class="text-button" @click="emit('back')">← Danh sách cảnh báo</button><button
      class="text-button" @click="emit('device', incident.machine)">Theo dõi cảm biến {{ incident.machine }} ↗</button>
  </div>
  <div class="page-heading">
    <div>
      <p class="caption">Dây chuyền {{ incident.line }} / {{ incident.id }}</p>
      <h1>{{ incident.machine }} · Chi tiết sự cố</h1>
      <p>{{ incident.title }} · Phát hiện {{ incident.time }}</p>
    </div>
    <div class="row"><span class="badge" :class="incident.risk === 'Cao' ? 'red' : 'amber'">{{ incident.risk }}</span><span
        class="badge">{{ incident.state }}</span></div>
  </div>
  <div class="tabs" aria-label="Nội dung sự cố"><button v-for="[id, title] in tabs" :key="id" :class="{ active: tab === id }"
      :aria-pressed="tab === id" @click="tab = id; error = ''">{{ title }}</button></div>
  <p v-if="error" role="alert" class="error">{{ error }}</p>
  <template v-if="tab === 'analysis'">
    <div class="detail-grid">
      <DeviceSensors :samples="before" :start="-1800" :end="0" :marker="-300" compact />
      <section class="panel">
        <div class="row between">
          <h2>Kết quả phát hiện bất thường</h2><span class="badge">Minh họa</span>
        </div>
        <div class="metric-line"><span>Điểm bất thường</span><strong>{{ incident.score.toFixed(2) }} / 1</strong></div>
        <p class="caption">Không phải xác suất rò khí. Chưa kết nối mô hình học máy.</p>
        <div class="notice warning">Nghi vấn: rò khí hoặc nhu cầu sử dụng khí tăng. Cần kiểm tra để phân biệt.</div>
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
          <p>Đọc cảm biến → nhận điểm bất thường → tìm tài liệu → soạn đề xuất. Các bước thực hiện được minh họa, chưa
            kết nối AI.</p>
        </details><button class="source" @click="emit('document', 'sop')">↗ SOP-07 · Quy trình kiểm tra khí
          nén</button><button class="source" @click="emit('document', 'case')">↗ SC-011 · Hồ sơ sự cố tham khảo</button>
      </section>
    </div>
    <section class="panel action-panel">
      <h2>Phương án đề xuất</h2>
      <p>{{ incident.action }}</p><button v-if="incident.state === 'Chờ duyệt'" class="button primary"
        @click="tab = 'approval'">Xem & duyệt đề xuất</button><button
        v-else-if="['Mới', 'Đang phân tích'].includes(incident.state)" class="button primary"
        @click="change('analyze') && (tab = 'approval')">Hoàn tất phân tích (demo)</button><button v-else class="button"
        @click="tab = 'verification'">Theo dõi xử lý</button>
    </section>
  </template>
  <template v-else-if="tab === 'approval'">
    <div v-if="incident.state === 'Chờ duyệt'" class="two-columns">
      <section class="panel">
        <h2>Quyết định của trưởng ca</h2>
        <div class="notice">{{ incident.action }}</div>
        <p>Duyệt đề xuất là giao việc kiểm tra cho kỹ thuật viên; không tự gửi lệnh điều khiển máy.</p><label
          class="field">Ghi chú / lý do<textarea v-model="note"
            placeholder="Bắt buộc khi từ chối hoặc chỉnh sửa" /></label>
        <div class="row"><button class="button primary" @click="ask('approve')">Duyệt đề xuất</button><button
            class="button danger" @click="ask('reject')">Từ chối</button><button class="button"
            @click="ask('edit')">Chỉnh sửa</button></div>
      </section>
      <section class="panel">
        <h2>Thông tin phê duyệt</h2>
        <div class="metric-line"><span>Người duyệt</span><span>Nguyễn An · Trưởng ca</span></div>
        <div class="metric-line"><span>Gửi đề xuất lúc</span><span>{{ incident.time }}</span></div>
        <p>Mọi quyết định được ghi vào lịch sử sự cố trong phiên demo.</p>
      </section>
    </div>
    <section v-else class="panel">
      <h2> {{ ['Đang xử lý', 'Đang theo dõi', 'Đã đóng'].includes(incident.state) ? 'Đề xuất đã được duyệt' : 'Chưa có đề xuất chờ duyệt' }}</h2>
      <p>Trạng thái hiện tại: {{ incident.state }}.</p><button class="button" @click="tab = 'timeline'">Xem lịch sử quyết
        định</button>
    </section>
  </template>
  <template v-else-if="tab === 'verification'">
    <section class="panel">
      <div class="row between">
        <h2>Theo dõi sau xử lý</h2><span class="badge" :class="{ 'green': incident.state === 'Đã đóng' }">{{ incident.state
          }}</span>
      </div>
      <template v-if="['Đang xử lý', 'Đang theo dõi', 'Đã đóng'].includes(incident.state)">
        <p>{{ incident.machine }} · Cửa sổ theo dõi 20 phút (mô phỏng)</p><progress :value="incident.progress" max="20"
          aria-label="Tiến trình theo dõi sau xử lý" />
        <div class="row between"><span>{{ incident.progress }} / 20 phút</span><button
            v-if="incident.state === 'Đang xử lý'" class="button primary" @click="change('start')">Xác nhận đã thực hiện
            (demo)</button><button v-if="incident.state === 'Đang theo dõi' && incident.progress < 20" class="button primary"
            @click="change('advance')">Tiến thêm 5 phút (demo)</button></div><template
          v-if="incident.state === 'Đang theo dõi' && incident.progress === 20">
          <div class="notice">Đã đủ cửa sổ theo dõi minh họa. Chọn kết quả để thử hai nhánh xử lý.</div>
          <div class="row"><button class="button primary" @click="finish('close')">Ổn định → Đóng sự cố</button><button
              class="button danger" @click="finish('reanalyze')">Vẫn bất thường → Phân tích lại</button></div>
        </template>
        <div v-if="incident.state === 'Đã đóng'" class="notice">Đã xác nhận ổn định và đóng sự cố.</div>
      </template>
      <template v-else>
        <p>Đề xuất cần được duyệt và kỹ thuật viên xác nhận đã thực hiện trước khi theo dõi.</p><button class="button"
          @click="tab = incident.state === 'Chờ duyệt' ? 'approval' : 'analysis'">Quay lại đề xuất</button>
      </template>
    </section>
    <section v-if="incident.progress > 0" class="panel action-panel">
      <h2>So sánh trước / sau · dữ liệu mẫu</h2>
      <p>Kết quả mẫu minh họa trường hợp ổn định. Kỹ thuật viên vẫn cần xác nhận kết quả thực tế.</p>
      <div class="comparison">
        <div>
          <h3>Trước xử lý</h3>
          <DeviceSensors :samples="before" :start="-900" :end="0" :marker="-300" compact />
        </div>
        <div>
          <h3>Sau xử lý</h3>
          <DeviceSensors :samples="after" :start="-900" :end="0" compact />
        </div>
      </div>
    </section>
  </template>
  <section v-else class="panel">
    <h2>Lịch sử {{ incident.id }} · {{ incident.machine }}</h2>
    <ol class="timeline">
      <li v-for="(event, i) in incident.history" :key="i">
        <h3>{{ event.text }}</h3>
        <p>{{ event.time }} · {{ event.actor }}</p>
      </li>
    </ol>
  </section>
  <dialog ref="dialog" aria-labelledby="decision-title">
    <h2 id="decision-title">{{ decision === 'edit' ? 'Chỉnh sửa phương án' : decision === 'approve' ? 'Xác nhận duyệt đề xuất ? ':'Xác nhận từ chối đề xuất?' }}</h2>
    <p>{{ incident.id }} · {{ incident.machine }}</p><label v-if="decision === 'edit'" class="field">Phương án<textarea
        v-model="draft" /></label>
    <p v-else>{{ note || 'Không có ghi chú bổ sung.' }}</p>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <div class="row"><button class="button" @click="dialog.close()">Quay lại</button><button class="button primary"
        @click="confirm">{{ decision === 'edit' ? 'Lưu phương án' : 'Xác nhận' }}</button></div>
  </dialog>
</template>
