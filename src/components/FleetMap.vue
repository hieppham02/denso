<script setup>
import { devices } from '../data/simulation'
defineProps({ incidents: { type: Array, required: true } })
defineEmits(['select'])
function active(incidents, id) { return incidents.find(a => a.machine === id && a.state !== 'Đã đóng') }
</script>
<template>
  <section class="panel">
    <div class="row between">
      <h2>Thiết bị theo dây chuyền</h2><span class="muted">24 máy · 4 dây chuyền</span>
    </div>
    <div class="line-list">
      <section v-for="line in ['A', 'B', 'C', 'D']" :key="line" class="production-line">
        <div class="row between">
          <h3>Dây chuyền {{ line }}</h3><small>{{incidents.filter(a => a.line === line && a.state !== 'Đã đóng').length}} máy
            cần chú ý · 6 máy</small>
        </div>
        <div class="machine-grid"><button v-for="device in devices.filter(d => d.line === line)" :key="device.id"
            class="machine"
            :class="active(incidents, device.id) ? active(incidents, device.id).risk === 'Cao' ? 'critical' : 'warning' : ''"
            :aria-label="`${device.id}, dây chuyền ${line}, ${active(incidents, device.id)?.state ?? 'bình thường'}`"
            @click="$emit('select', device.id)">{{ device.id }}</button></div>
      </section>
    </div>
    <div class="legend"><span>Bình thường</span><span class="warn">Cần chú ý</span><span class="risk">Ưu tiên cao</span>
    </div>
  </section>
</template>
