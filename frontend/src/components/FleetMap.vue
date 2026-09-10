<script setup>
import { computed } from 'vue'

const props = defineProps({
  devices: {
    type: Array,
    required: true
  },
  incidents: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['select'])

const productionLines = computed(() => [...new Set(props.devices.map((device) => device.line))])

// Map incidents chưa đóng theo machine ID để tra cứu O(1)
const activeIncidentMap = computed(() => {
  const map = new Map()
  for (const incident of props.incidents) {
    if (incident.state !== 'Đã đóng' && !map.has(incident.machine)) {
      map.set(incident.machine, incident)
    }
  }
  return map
})

function getActiveIncident(deviceId) {
  return activeIncidentMap.value.get(deviceId)
}

function getMachineStatusClass(deviceId) {
  const incident = getActiveIncident(deviceId)
  if (!incident) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:ring-2 hover:ring-blue-500 hover:border-transparent'
  }
  return incident.risk === 'Cao' 
    ? 'bg-red-50 text-red-700 border-red-200 hover:ring-2 hover:ring-red-500 font-semibold' 
    : 'bg-amber-50 text-amber-800 border-amber-200 hover:ring-2 hover:ring-amber-500 font-semibold'
}

function getMachineAriaLabel(deviceId, line) {
  const incident = getActiveIncident(deviceId)
  const statusText = incident ? `${incident.risk === 'Cao' ? 'ưu tiên cao' : 'cần chú ý'}, trạng thái: ${incident.state}` : 'bình thường'
  return `${deviceId}, dây chuyền ${line}, ${statusText}`
}

function countAttentionMachines(line) {
  return props.incidents.filter(
    (incident) => incident.line === line && incident.state !== 'Đã đóng'
  ).length
}

function getDevicesByLine(line) {
  return props.devices.filter((device) => device.line === line)
}

function handleSelectDevice(deviceId) {
  emit('select', deviceId)
}
</script>

<template>
  <section class="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h2 class="text-base font-semibold text-slate-800">Thiết bị theo dây chuyền</h2>
      <span class="text-xs text-slate-400">{{ props.devices.length }} máy · {{ productionLines.length }} dây chuyền</span>
    </div>

    <div class="space-y-4">
      <section
        v-for="line in productionLines"
        :key="line"
        class="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 class="text-sm font-semibold text-slate-700">Dây chuyền {{ line }}</h3>
          <span class="text-xs text-slate-500">
            {{ countAttentionMachines(line) }} máy cần chú ý · {{ getDevicesByLine(line).length }} máy
          </span>
        </div>

        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <button
            v-for="device in getDevicesByLine(line)"
            :key="device.id"
            class="py-2.5 px-2 text-xs rounded-lg border text-center transition-all cursor-pointer font-medium"
            :class="getMachineStatusClass(device.id)"
            :aria-label="getMachineAriaLabel(device.id, line)"
            @click="handleSelectDevice(device.id)"
          >
            {{ device.id }}
          </button>
        </div>
      </section>
    </div>

    <!-- Chú thích màu (Legend) thuần Tailwind -->
    <div class="flex items-center gap-4 flex-wrap text-xs text-slate-500 mt-5 pt-3 border-t border-slate-100">
      <span class="inline-flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
        Bình thường
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
        Cần chú ý
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
        Ưu tiên cao
      </span>
    </div>
  </section>
</template>
