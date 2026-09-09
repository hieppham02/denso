<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatTime } from '../data/simulation'
const props = defineProps({
  samples: { type: Array, required: true }, sensor: { type: Object, required: true },
  color: { type: String, default: '#3563e9' }, start: { type: Number, required: true },
  end: { type: Number, required: true }, relative: Boolean,
  marker: { type: Number, default: null }, hover: { type: Number, default: null },
})
const emit = defineEmits(['hover'])
const element = ref(null), width = ref(640), height = 178
const margin = { left: 62, right: 22, top: 25, bottom: 36 }
let observer
onMounted(() => {
  observer = new ResizeObserver(([entry]) => { width.value = Math.max(180, entry.contentRect.width) })
  observer.observe(element.value)
})
onBeforeUnmount(() => observer?.disconnect())
const values = computed(() => props.samples.filter(s => Number.isFinite(s[props.sensor.key]) && s.time >= props.start && s.time <= props.end))
const bounds = computed(() => {
  if (!values.value.length) return [0, 1]
  const list = values.value.map(s => s[props.sensor.key]), low = Math.min(...list), high = Math.max(...list)
  const padding = Math.max((high - low) * 0.12, props.sensor.key === 'Oil_temperature' ? 0.5 : 0.025)
  return [low - padding, high + padding]
})
const x = time => margin.left + (time - props.start) / Math.max(1, props.end - props.start) * (width.value - margin.left - margin.right)
const y = value => height - margin.bottom - (value - bounds.value[0]) / (bounds.value[1] - bounds.value[0]) * (height - margin.top - margin.bottom)
const path = computed(() => values.value.map((s, i) => `${i ? 'L' : 'M'}${x(s.time).toFixed(2)},${y(s[props.sensor.key]).toFixed(2)}`).join(' '))
const ticks = computed(() => { const count = width.value < 400 ? 3 : 5; return Array.from({ length: count }, (_, i) => props.start + i * (props.end - props.start) / (count - 1)) })
const yTicks = computed(() => Array.from({ length: 3 }, (_, i) => bounds.value[0] + i * (bounds.value[1] - bounds.value[0]) / 2))
const selectedTime = computed(() => Math.max(props.start, Math.min(values.value.at(-1)?.time ?? props.end, props.hover ?? props.end)))
const selectedValue = computed(() => {
  const data = values.value
  if (!data.length) return null
  const index = data.findIndex(s => s.time >= selectedTime.value)
  if (index <= 0) return (index === -1 ? data.at(-1) : data[0])[props.sensor.key]
  const a = data[index - 1], b = data[index], fraction = (selectedTime.value - a.time) / (b.time - a.time)
  return a[props.sensor.key] + (b[props.sensor.key] - a[props.sensor.key]) * fraction
})
function point(event) {
  const box = element.value.getBoundingClientRect()
  const position = (event.clientX - box.left) * width.value / box.width
  emit('hover', Math.max(props.start, Math.min(props.end, props.start + (position - margin.left) / (width.value - margin.left - margin.right) * (props.end - props.start))))
}
</script>
<template>
  <article class="sensor-chart-panel">
    <div class="chart-heading"><span>{{ sensor.key }} <small>· {{ sensor.name }}</small></span><output>{{ selectedValue
      === null ? '—' : selectedValue.toFixed(2) }} {{ sensor.unit }}</output></div>
    <svg ref="element" class="sensor-chart" :viewBox="`0 0 ${width} ${height}`" role="img"
      :aria-label="`${sensor.name}, ${sensor.unit}, dữ liệu giả lập`" @pointermove="point" @click="point">
      <title>{{ sensor.name }} — dữ liệu giả lập</title>
      <rect :x="margin.left" :y="margin.top" :width="width - margin.left - margin.right"
        :height="height - margin.top - margin.bottom" fill="#fff" stroke="#e6eaf0" />
      <g v-for="tick in yTicks" :key="tick">
        <line :x1="margin.left" :x2="width - margin.right" :y1="y(tick)" :y2="y(tick)" stroke="#edf0f5" /><text
          :x="margin.left - 9" :y="y(tick) + 4" text-anchor="end">{{ tick.toFixed(sensor.key === 'DV_pressure' ? 3 : 1)
          }}</text>
      </g>
      <template v-if="marker !== null && marker >= start && marker <= end">
        <rect :x="x(marker)" :y="margin.top"
          :width="Math.max(0, x(Math.min(end, values.at(-1)?.time ?? end)) - x(marker))"
          :height="height - margin.top - margin.bottom" fill="#fff6e9" />
        <line :x1="x(marker)" :x2="x(marker)" :y1="margin.top" :y2="height - margin.bottom" stroke="#c88420"
          stroke-dasharray="4 3" />
      </template>
      <path :d="path" fill="none" :stroke="color" stroke-width="1.8" />
      <g v-if="selectedValue !== null">
        <line :x1="x(selectedTime)" :x2="x(selectedTime)" :y1="margin.top" :y2="height - margin.bottom"
          stroke="#a7b2c6" />
        <circle :cx="x(selectedTime)" :cy="y(selectedValue)" r="3" :fill="color" />
      </g>
      <text v-for="(tick, i) in ticks" :key="tick" :x="x(tick)" :y="height - 18"
        :text-anchor="i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'">{{ formatTime(tick, relative)
        }}</text>
      <text :x="margin.left" y="13">{{ sensor.unit }}</text><text :x="width - margin.right" :y="height - 2"
        text-anchor="end">{{
          relative ? 'Phút:giây' : 'Giờ:phút' }}</text>
      <text v-if="!values.length" :x="width / 2" y="85" text-anchor="middle">Chưa có dữ liệu</text>
    </svg>
  </article>
</template>
