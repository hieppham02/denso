<script setup>
import { Activity } from 'lucide-vue-next'

defineProps({
  code: { type: String, required: true },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  color: { type: String, default: '#66e2bf' },
})
</script>

<template>
  <article class="sensor-panel" :style="{ '--signal-color': color }">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="signal-marker" aria-hidden="true"></span>
        <h3>{{ code }} <span class="sensor-name">{{ name }}</span></h3>
      </div>
      <span class="sensor-reading">— <small>{{ unit }}</small></span>
    </div>
    <div class="chart-placeholder" role="img" :aria-label="`Vùng biểu đồ ${code}, chưa có dữ liệu`">
      <div class="chart-empty"><Activity :size="16" aria-hidden="true" /> Chờ dữ liệu</div>
    </div>
  </article>
</template>
