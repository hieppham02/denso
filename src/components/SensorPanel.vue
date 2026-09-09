<script setup>
import { computed, useId } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import { makeSensorOptions, toSensorPoints } from '../utils/sensorChart.js'

const props = defineProps({
  samples: { type: Array, required: true },
  sensor: { type: Object, required: true },
  color: { type: String, default: '#3563e9' },
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  relative: { type: Boolean, default: false },
  marker: { type: Number, default: null },
  hover: { type: Number, default: null },
  chartGroup: { type: String, default: '' },
})
const emit = defineEmits(['hover'])
const chartId = `sensor-${useId()}`
const points = computed(() => toSensorPoints(props.samples, props.sensor.key, props.start, props.end))

// VueApexCharts tự cập nhật khi series thay đổi; không cần tự dựng SVG nữa.
const series = computed(() => [{ name: props.sensor.key, data: points.value }])
function handlePointHover(index) {
  const point = points.value[index]
  if (point) emit('hover', point.x)
}
const chartOptions = computed(() => makeSensorOptions({
  id: chartId, group: props.chartGroup, sensor: props.sensor, color: props.color,
  start: props.start, end: props.end, relative: props.relative, marker: props.marker,
  onHover: handlePointHover,
}))

// Con số phía trên biểu đồ dùng cùng thời điểm với các biểu đồ anh em.
const activeValue = computed(() => {
  const data = points.value
  if (!data.length) return null
  if (props.hover === null) return data.at(-1).y
  const index = data.findIndex(point => point.x >= props.hover)
  if (index === -1) return data.at(-1).y
  if (index === 0) return data[0].y
  const previous = data[index - 1], current = data[index]
  const fraction = (props.hover - previous.x) / Math.max(1, current.x - previous.x)
  return previous.y + (current.y - previous.y) * fraction
})
</script>

<template>
  <article class="mt-4 min-w-0" :aria-label="`${sensor.name}, đơn vị ${sensor.unit}, dữ liệu giả lập`">
    <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm">
      <span>{{ sensor.key }} <small class="text-slate-500">· {{ sensor.name }} ({{ sensor.unit }})</small></span>
      <output class="text-sm tabular-nums text-slate-600">{{ activeValue === null ? '—' : activeValue.toFixed(sensor.key === 'DV_pressure' ? 3 : 2) }} {{ sensor.unit }}</output>
    </div>
    <VueApexCharts type="line" height="230" width="100%" :options="chartOptions" :series="series" />
  </article>
</template>
