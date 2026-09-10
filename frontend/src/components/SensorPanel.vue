<script setup>
import { computed, useId } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import { makeSensorOptions, toSensorPoints } from '../utils/sensorChart.js'
import { formatTime } from '../domain/sensors.js'

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
  curve: {
    type: String,
    default: 'smooth',
    validator: value => ['straight', 'smooth'].includes(value),
  },
  zoomRange: { type: Object, default: null },
  animationSpeed: { type: Number, default: 2000 },
})

const emit = defineEmits(['hover', 'zoom', 'zoom-reset'])
const chartId = `sensor-${useId()}`
const points = computed(() => toSensorPoints(props.samples, props.sensor.key, props.start, props.end))

const series = computed(() => [{ name: props.sensor.key, data: points.value }])

function handlePointHover(index) {
  const point = points.value[index]
  if (point) emit('hover', point.x)
}

const chartOptions = computed(() => makeSensorOptions({
  id: chartId, group: props.chartGroup, sensor: props.sensor, color: props.color,
  start: props.start, end: props.end, relative: props.relative, marker: props.marker,
  curve: props.curve, animationSpeed: props.animationSpeed,
  zoomRange: props.zoomRange, points: points.value,
  onHover: handlePointHover,
  onZoom: range => emit('zoom', range),
  onZoomReset: () => emit('zoom-reset'),
  timeFormatter: formatChartTime,
}))

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

function formatChartTime(value) {
  if (props.relative) return formatTime(Number(value), true)
  const sample = props.samples.find((item) => item.time === Number(value))
  return sample?.timestamp
    ? new Date(sample.timestamp).toLocaleTimeString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit',
    })
    : formatTime(Number(value), false)
}
</script>

<template>
  <article class="mt-4 min-w-0" :aria-label="`${sensor.name}, đơn vị ${sensor.unit}`">
    <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
      <span class="font-semibold text-slate-800">
        {{ sensor.key }} 
        <small class="text-xs font-normal text-slate-400">· {{ sensor.name }} ({{ sensor.unit }})</small>
      </span>
      <output class="text-sm font-semibold tabular-nums text-slate-700">
        {{ activeValue === null ? '—' : activeValue.toFixed(sensor.key === 'DV_pressure' ? 3 : 2) }} {{ sensor.unit }}
      </output>
    </div>
    <div class="h-[230px] w-full">
      <VueApexCharts type="line" height="230" width="100%" :options="chartOptions" :series="series" />
    </div>
  </article>
</template>
