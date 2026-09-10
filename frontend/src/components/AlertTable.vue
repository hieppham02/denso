<script setup>
import { computed, ref } from 'vue'

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
const incidentStates = computed(() => [...new Set(props.incidents.map((incident) => incident.state))])

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
  <section class="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
    <!-- Bộ lọc tìm kiếm (Filters) -->
    <div v-if="filters" class="flex flex-wrap gap-2.5 mb-4">
      <input
        v-model="search"
        type="search"
        placeholder="Tìm sự cố, thiết bị…"
        aria-label="Tìm sự cố hoặc thiết bị"
        class="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >

      <select 
        v-model="selectedLine" 
        aria-label="Lọc dây chuyền"
        class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <option value="">Mọi dây chuyền</option>
        <option v-for="line in availableLines" :key="line" :value="line">
          Dây chuyền {{ line }}
        </option>
      </select>

      <select 
        v-model="selectedRisk" 
        aria-label="Lọc mức độ"
        class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <option value="">Mọi mức độ</option>
        <option v-for="risk in availableRisks" :key="risk" :value="risk">
          {{ risk }}
        </option>
      </select>

      <select 
        v-model="selectedState" 
        aria-label="Lọc trạng thái"
        class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <option value="">Mọi trạng thái</option>
        <option v-for="state in incidentStates" :key="state" :value="state">
          {{ state }}
        </option>
      </select>
    </div>

    <!-- Bảng sự cố -->
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <th class="py-3 px-3.5">Sự cố / Phát hiện</th>
            <th class="py-3 px-3.5">Thiết bị</th>
            <th class="py-3 px-3.5">Mức độ</th>
            <th class="py-3 px-3.5">Trạng thái</th>
            <th class="py-3 px-3.5 text-right" aria-label="Thao tác">Thao tác</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-slate-700">
          <tr 
            v-for="incident in filteredIncidents" 
            :key="incident.id"
            class="hover:bg-slate-50/70 transition-colors"
          >
            <td class="py-3.5 px-3.5">
              <button class="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-0 p-0" @click="handleSelect(incident.id)">
                {{ incident.id }}
              </button>
              <span class="block text-xs text-slate-400 mt-0.5">09/09 · {{ incident.time }}</span>
            </td>

            <td class="py-3.5 px-3.5">
              <span class="font-medium text-slate-900">{{ incident.machine }}</span>
              <span class="block text-xs text-slate-400 mt-0.5">Dây chuyền {{ incident.line }}</span>
            </td>

            <td class="py-3.5 px-3.5">
              <span 
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                :class="incident.risk === 'Cao' ? 'bg-red-50 text-red-700 border border-red-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'"
              >
                {{ incident.risk }}
              </span>
            </td>

            <td class="py-3.5 px-3.5">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="{
                  'bg-emerald-50 text-emerald-700 border border-emerald-200': incident.state === 'Đã đóng',
                  'bg-amber-50 text-amber-700 border border-amber-200': incident.state === 'Chờ duyệt',
                  'bg-blue-50 text-blue-700 border border-blue-200': incident.state === 'Đang xử lý' || incident.state === 'Đang theo dõi',
                  'bg-slate-100 text-slate-600 border border-slate-200': !['Đã đóng', 'Chờ duyệt', 'Đang xử lý', 'Đang theo dõi'].includes(incident.state)
                }"
              >
                {{ incident.state }}
              </span>
            </td>

            <td class="py-3.5 px-3.5 text-right">
              <button 
                class="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-0 p-0"
                @click="handleSelect(incident.id)"
              >
                Chi tiết →
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="!filteredIncidents.length" class="py-8 text-center text-sm text-slate-400">
      Không có sự cố phù hợp bộ lọc.
    </p>

    <p class="text-xs text-slate-400 mt-4 border-t border-slate-100 pt-3">
      {{ filteredIncidents.length }} sự cố · Mới nhất trước · Dữ liệu minh họa
    </p>
  </section>
</template>
