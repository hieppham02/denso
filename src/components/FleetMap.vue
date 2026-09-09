<script setup>
import { computed } from 'vue'
import { devices } from '../mock-data/simulation'

const props = defineProps({
  incidents: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['select'])

const PRODUCTION_LINES = ['A', 'B', 'C', 'D']

// Map incidents chưa đóng theo machine ID để tra cứu O(1) thay vì lặp find lồng nhau
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
  if (!incident) return ''
  return incident.risk === 'Cao' ? 'critical' : 'warning'
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
  return devices.filter((device) => device.line === line)
}

function handleSelectDevice(deviceId) {
  emit('select', deviceId)
}
</script>

<template>
  <section class="panel">
    <div class="row between">
      <h2>Thiết bị theo dây chuyền</h2>
      <span class="muted">24 máy · 4 dây chuyền</span>
    </div>

    <div class="line-list">
      <section
        v-for="line in PRODUCTION_LINES"
        :key="line"
        class="production-line"
      >
        <div class="row between">
          <h3>Dây chuyền {{ line }}</h3>
          <small>
            {{ countAttentionMachines(line) }} máy cần chú ý · {{ getDevicesByLine(line).length }} máy
          </small>
        </div>

        <div class="machine-grid">
          <button
            v-for="device in getDevicesByLine(line)"
            :key="device.id"
            class="machine"
            :class="getMachineStatusClass(device.id)"
            :aria-label="getMachineAriaLabel(device.id, line)"
            @click="handleSelectDevice(device.id)"
          >
            {{ device.id }}
          </button>
        </div>
      </section>
    </div>

    <div class="legend">
      <span>Bình thường</span>
      <span class="warn">Cần chú ý</span>
      <span class="risk">Ưu tiên cao</span>
    </div>
  </section>
</template>