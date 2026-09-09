<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatTime } from '../mock-data/simulation'

const props = defineProps({
  samples: {
    type: Array,
    required: true
  },
  sensor: {
    type: Object,
    required: true
  },
  color: {
    type: String,
    default: '#3563e9'
  },
  start: {
    type: Number,
    required: true
  },
  end: {
    type: Number,
    required: true
  },
  relative: {
    type: Boolean,
    default: false
  },
  marker: {
    type: Number,
    default: null
  },
  hover: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['hover'])

const chartRef = ref(null)
const chartWidth = ref(640)
const CHART_HEIGHT = 178
const MARGIN = {
  left: 62,
  right: 22,
  top: 25,
  bottom: 36
}

let resizeObserver = null

onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => {
    chartWidth.value = Math.max(180, entry.contentRect.width)
  })

  if (chartRef.value) {
    resizeObserver.observe(chartRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

// Lọc các sample hợp lệ nằm trong khoảng [start, end]
const validSamples = computed(() => {
  const sensorKey = props.sensor.key
  return props.samples.filter((item) => (
    Number.isFinite(item[sensorKey]) &&
    item.time >= props.start &&
    item.time <= props.end
  ))
})

// Tính min/max và padding cho trục Y
const yBounds = computed(() => {
  if (!validSamples.value.length) {
    return [0, 1]
  }

  const values = validSamples.value.map((sample) => sample[props.sensor.key])
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const isOilTemp = props.sensor.key === 'Oil_temperature'
  const padding = Math.max((maxValue - minValue) * 0.12, isOilTemp ? 0.5 : 0.025)

  return [minValue - padding, maxValue + padding]
})

// Hàm scale tọa độ X, Y trong SVG
function scaleX(time) {
  const timeRange = Math.max(1, props.end - props.start)
  const drawableWidth = chartWidth.value - MARGIN.left - MARGIN.right
  return MARGIN.left + ((time - props.start) / timeRange) * drawableWidth
}

function scaleY(value) {
  const [minBound, maxBound] = yBounds.value
  const valueRange = maxBound - minBound || 1
  const drawableHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom
  return CHART_HEIGHT - MARGIN.bottom - ((value - minBound) / valueRange) * drawableHeight
}

// Đường path của biểu đồ chuỗi thời gian
const svgPathD = computed(() => {
  const sensorKey = props.sensor.key
  return validSamples.value
    .map((sample, index) => {
      const command = index === 0 ? 'M' : 'L'
      const px = scaleX(sample.time).toFixed(2)
      const py = scaleY(sample[sensorKey]).toFixed(2)
      return `${command}${px},${py}`
    })
    .join(' ')
})

// Các mốc tick trục X
const xTicks = computed(() => {
  const count = chartWidth.value < 400 ? 3 : 5
  const step = (props.end - props.start) / (count - 1)
  return Array.from({ length: count }, (_, index) => props.start + index * step)
})

// Các mốc tick trục Y (3 đường ngang)
const yTicks = computed(() => {
  const [minBound, maxBound] = yBounds.value
  const step = (maxBound - minBound) / 2
  return Array.from({ length: 3 }, (_, index) => minBound + index * step)
})

// Thời gian đang được trỏ/hover
const activeTime = computed(() => {
  const lastSampleTime = validSamples.value.at(-1)?.time ?? props.end
  const targetTime = props.hover ?? props.end
  return Math.max(props.start, Math.min(lastSampleTime, targetTime))
})

// Nội suy giá trị cảm biến tại thời điểm activeTime
const activeValue = computed(() => {
  const samples = validSamples.value
  if (!samples.length) return null

  const targetIndex = samples.findIndex((item) => item.time >= activeTime.value)
  const sensorKey = props.sensor.key

  if (targetIndex <= 0) {
    const fallbackItem = targetIndex === -1 ? samples.at(-1) : samples[0]
    return fallbackItem[sensorKey]
  }

  const prev = samples[targetIndex - 1]
  const current = samples[targetIndex]
  const fraction = (activeTime.value - prev.time) / (current.time - prev.time)

  return prev[sensorKey] + (current[sensorKey] - prev[sensorKey]) * fraction
})

function handlePointerMove(event) {
  if (!chartRef.value) return

  const rect = chartRef.value.getBoundingClientRect()
  const pointerX = (event.clientX - rect.left) * (chartWidth.value / rect.width)
  const drawableWidth = chartWidth.value - MARGIN.left - MARGIN.right
  const normalizedTime = props.start + ((pointerX - MARGIN.left) / drawableWidth) * (props.end - props.start)

  emit('hover', Math.max(props.start, Math.min(props.end, normalizedTime)))
}
</script>

<template>
  <article class="sensor-chart-panel">
    <div class="chart-heading">
      <span>
        {{ sensor.key }} <small>· {{ sensor.name }}</small>
      </span>
      <output>
        {{ activeValue === null ? '—' : activeValue.toFixed(2) }} {{ sensor.unit }}
      </output>
    </div>

    <svg
      ref="chartRef"
      class="sensor-chart"
      :viewBox="`0 0 ${chartWidth} ${CHART_HEIGHT}`"
      role="img"
      :aria-label="`${sensor.name}, ${sensor.unit}, dữ liệu giả lập`"
      @pointermove="handlePointerMove"
      @click="handlePointerMove"
    >
      <title>{{ sensor.name }} — dữ liệu giả lập</title>

      <!-- Khung biểu đồ -->
      <rect
        :x="MARGIN.left"
        :y="MARGIN.top"
        :width="chartWidth - MARGIN.left - MARGIN.right"
        :height="CHART_HEIGHT - MARGIN.top - MARGIN.bottom"
        fill="#ffffff"
        stroke="#e6eaf0"
      />

      <!-- Lưới trục Y và nhãn giá trị -->
      <g v-for="tick in yTicks" :key="tick">
        <line
          :x1="MARGIN.left"
          :x2="chartWidth - MARGIN.right"
          :y1="scaleY(tick)"
          :y2="scaleY(tick)"
          stroke="#edf0f5"
        />
        <text
          :x="MARGIN.left - 9"
          :y="scaleY(tick) + 4"
          text-anchor="end"
        >
          {{ tick.toFixed(sensor.key === 'DV_pressure' ? 3 : 1) }}
        </text>
      </g>

      <!-- Vạch cảnh báo bất thường / rò rỉ (Marker) -->
      <template v-if="marker !== null && marker >= start && marker <= end">
        <rect
          :x="scaleX(marker)"
          :y="MARGIN.top"
          :width="Math.max(0, scaleX(Math.min(end, validSamples.at(-1)?.time ?? end)) - scaleX(marker))"
          :height="CHART_HEIGHT - MARGIN.top - MARGIN.bottom"
          fill="#fff6e9"
        />
        <line
          :x1="scaleX(marker)"
          :x2="scaleX(marker)"
          :y1="MARGIN.top"
          :y2="CHART_HEIGHT - MARGIN.bottom"
          stroke="#c88420"
          stroke-dasharray="4 3"
        />
      </template>

      <!-- Đường dữ liệu chính -->
      <path
        :d="svgPathD"
        fill="none"
        :stroke="color"
        stroke-width="1.8"
      />

      <!-- Con trỏ hover và điểm tròn giá trị đối chiếu -->
      <g v-if="activeValue !== null">
        <line
          :x1="scaleX(activeTime)"
          :x2="scaleX(activeTime)"
          :y1="MARGIN.top"
          :y2="CHART_HEIGHT - MARGIN.bottom"
          stroke="#a7b2c6"
        />
        <circle
          :cx="scaleX(activeTime)"
          :cy="scaleY(activeValue)"
          r="3"
          :fill="color"
        />
      </g>

      <!-- Mốc thời gian trục X -->
      <text
        v-for="(tick, index) in xTicks"
        :key="tick"
        :x="scaleX(tick)"
        :y="CHART_HEIGHT - 18"
        :text-anchor="index === 0 ? 'start' : index === xTicks.length - 1 ? 'end' : 'middle'"
      >
        {{ formatTime(tick, relative) }}
      </text>

      <!-- Đơn vị đo -->
      <text :x="MARGIN.left" y="13">{{ sensor.unit }}</text>
      <text :x="chartWidth - MARGIN.right" :y="CHART_HEIGHT - 2" text-anchor="end">
        {{ relative ? 'Phút:giây' : 'Giờ:phút' }}
      </text>

      <text
        v-if="!validSamples.length"
        :x="chartWidth / 2"
        y="85"
        text-anchor="middle"
      >
        Chưa có dữ liệu
      </text>
    </svg>
  </article>
</template>