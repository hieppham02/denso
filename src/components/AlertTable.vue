<script setup>
import { computed, ref } from 'vue'
import { incidentStates } from '../mock-data/incidents'

const props = defineProps({
  incidents: {
    type: Array,
    required: true
  },
  filters: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])

const search = ref('')
const selectedLine = ref('')
const selectedRisk = ref('')
const selectedState = ref('')

const availableLines = ['A', 'B', 'C', 'D']
const availableRisks = ['Cao', 'Trung bình']

const filteredIncidents = computed(() => {
  const query = search.value.trim().toLowerCase()

  return props.incidents.filter((item) => {
    const matchLine = !selectedLine.value || item.line === selectedLine.value
    const matchRisk = !selectedRisk.value || item.risk === selectedRisk.value
    const matchState = !selectedState.value || item.state === selectedState.value
    const matchQuery = !query || `${item.id} ${item.machine} ${item.title}`.toLowerCase().includes(query)

    return matchLine && matchRisk && matchState && matchQuery
  })
})

function handleSelect(id) {
  emit('select', id)
}
</script>

<template>
  <section class="panel">
    <div v-if="filters" class="filters">
      <input
        v-model="search"
        type="search"
        placeholder="Tìm sự cố, thiết bị…"
        aria-label="Tìm sự cố hoặc thiết bị"
      >

      <select v-model="selectedLine" aria-label="Lọc dây chuyền">
        <option value="">Mọi dây chuyền</option>
        <option v-for="line in availableLines" :key="line" :value="line">
          {{ line }}
        </option>
      </select>

      <select v-model="selectedRisk" aria-label="Lọc mức độ">
        <option value="">Mọi mức độ</option>
        <option v-for="risk in availableRisks" :key="risk" :value="risk">
          {{ risk }}
        </option>
      </select>

      <select v-model="selectedState" aria-label="Lọc trạng thái">
        <option value="">Mọi trạng thái</option>
        <option v-for="state in incidentStates" :key="state" :value="state">
          {{ state }}
        </option>
      </select>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Sự cố / Phát hiện</th>
            <th>Thiết bị</th>
            <th>Mức độ</th>
            <th>Trạng thái</th>
            <th aria-label="Thao tác"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="incident in filteredIncidents" :key="incident.id">
            <td>
              <button class="text-button" @click="handleSelect(incident.id)">
                {{ incident.id }}
              </button>
              <small>09/09 · {{ incident.time }}</small>
            </td>

            <td>
              {{ incident.machine }}
              <small>Dây chuyền {{ incident.line }}</small>
            </td>

            <td>
              <span class="badge" :class="incident.risk === 'Cao' ? 'red' : 'amber'">
                {{ incident.risk }}
              </span>
            </td>

            <td>
              <span
                class="badge"
                :class="{
                  'green': incident.state === 'Đã đóng',
                  'amber': incident.state === 'Chờ duyệt'
                }"
              >
                {{ incident.state }}
              </span>
            </td>

            <td>
              <button class="text-button" @click="handleSelect(incident.id)">
                Chi tiết →
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="!filteredIncidents.length" class="empty">
      Không có sự cố phù hợp bộ lọc.
    </p>

    <p class="caption">
      {{ filteredIncidents.length }} sự cố · Mới nhất trước · Dữ liệu minh họa
    </p>
  </section>
</template>