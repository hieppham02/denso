<script setup>
import { computed, ref, watch, useId } from 'vue'
import SensorPanel from './SensorPanel.vue'
import { analogSensors, digitalSensors, formatTime } from '../domain/sensors.js'

const props = defineProps({
  samples: {
    type: Array,
    required: true
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
  compact: {
    type: Boolean,
    default: false
  },
  animationSpeed: {
    type: Number,
    default: 2000
  }
})

// Khai báo state
const thirdSensorKey = ref('Motor_current')
const hoveredTime = ref(null)
const chartCurve = ref('smooth')
const zoomRange = ref(null)

const chartGroup = `device-sensors-${useId()}`
const CHART_COLORS = ['#3563e9', '#159885', '#9370c9']

const selectedSensors = computed(() => {
  return ['TP2', 'TP3', thirdSensorKey.value].map(
    (key) => analogSensors.find((sensor) => sensor.key === key)
  )
})

const availableThirdSensors = computed(() => {
  return analogSensors.filter((sensor) => !['TP2', 'TP3'].includes(sensor.key))
})

const latestSample = computed(() => props.samples.at(-1))

const activeHoverTime = computed(() => {
  const defaultHover = Math.min(props.end, latestSample.value?.time ?? props.end)
  return hoveredTime.value ?? defaultHover
})

const activeHoverLabel = computed(() => {
  const sample = props.samples.find((item) => item.time === activeHoverTime.value)
  if (!sample?.timestamp) return formatTime(activeHoverTime.value, props.relative)
  return new Date(sample.timestamp).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit',
  })
})

watch(
  () => [props.samples.length, props.start, props.end],
  ([sampleCount, start, end]) => {
    hoveredTime.value = null
    if (
      sampleCount <= 1 ||
      (zoomRange.value && (zoomRange.value.max < start || zoomRange.value.min > end))
    ) {
      zoomRange.value = null
    }
  }
)

function handleHover(time) {
  hoveredTime.value = time
}

function handleZoom(range) {
  if (!Number.isFinite(range?.min) || !Number.isFinite(range?.max)) return
  if (zoomRange.value?.min === range.min && zoomRange.value?.max === range.max) return
  zoomRange.value = range
}

function handleZoomReset() {
  zoomRange.value = null
}
</script>

<template>
  <div class="grid min-w-0 content-start gap-4">
    <!-- Block 1: Thông số Analog hiện tại -->
    <div v-if="!compact && latestSample" class="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
      <div
        v-for="sensor in analogSensors"
        :key="sensor.key"
        class="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col justify-between"
      >
        <span class="text-xs font-medium text-slate-500">{{ sensor.name }}</span>
        <div class="my-1.5 flex items-baseline gap-1">
          <strong class="text-2xl font-bold text-slate-800 tabular-nums">
            {{ latestSample[sensor.key].toFixed(sensor.key === 'Oil_temperature' ? 1 : 2) }}
          </strong>
          <small class="text-xs text-slate-400">{{ sensor.unit }}</small>
        </div>
        <small class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{{ sensor.key }}</small>
      </div>
    </div>

    <!-- Block 2: Đồ thị chuỗi thời gian -->
    <section class="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-slate-800">Diễn biến cảm biến</h2>
          <span class="text-xs text-slate-400">Chung trục thời gian đối chiếu</span>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-3">
          <div
            class="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-0.5"
            role="group"
            aria-label="Kiểu đường biểu đồ"
          >
            <button
              v-for="option in [{ value: 'straight', label: 'Straight' }, { value: 'smooth', label: 'Smooth' }]"
              :key="option.value"
              type="button"
              class="min-w-16 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
              :class="chartCurve === option.value
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'"
              :aria-pressed="chartCurve === option.value"
              @click="chartCurve = option.value"
            >
              {{ option.label }}
            </button>
          </div>

          <!-- Bộ chọn biểu đồ thứ 3 -->
          <label class="flex items-center gap-2 text-xs font-medium text-slate-500">
            Biểu đồ thứ 3:
            <select 
              v-model="thirdSensorKey"
              class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option
                v-for="sensor in availableThirdSensors"
                :key="sensor.key"
                :value="sensor.key"
              >
                {{ sensor.key }} · {{ sensor.name }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <SensorPanel
        v-for="(sensor, index) in selectedSensors"
        :key="sensor.key"
        :sensor="sensor"
        :chart-group="chartGroup"
        :samples="samples"
        :start="start"
        :end="end"
        :relative="relative"
        :marker="marker"
        :hover="hoveredTime"
        :color="CHART_COLORS[index]"
        :curve="chartCurve"
        :animation-speed="animationSpeed"
        :zoom-range="zoomRange"
        @hover="handleHover"
        @zoom="handleZoom"
        @zoom-reset="handleZoomReset"
      />

      <div class="mt-4 pt-3 border-t border-slate-100 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
        <p class="m-0">
          Thời điểm đối chiếu: <span class="font-semibold text-slate-600">{{ activeHoverLabel }}</span>
          <span v-if="latestSample?.timestamp"> · CSV: {{ latestSample.timestamp }}</span>
          · Rê chuột để đồng bộ con trỏ.
        </p>

        <p v-if="marker !== null" class="m-0 text-amber-600 font-medium">
          Vạch cam: {{ relative ? 'Bắt đầu rò khí' : 'Bắt đầu đoạn bất thường' }} ({{ formatTime(marker, relative) }})
        </p>
      </div>
    </section>

    <!-- Block 3: Trạng thái Digital 8 kênh -->
    <section v-if="!compact && latestSample" class="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 class="text-base font-semibold text-slate-800">Tín hiệu trạng thái (Digital)</h2>
        <span class="text-xs text-slate-400">8 kênh · Bit 0 / 1</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3">
        <div 
          v-for="key in digitalSensors" 
          :key="key"
          class="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs"
        >
          <span class="font-medium text-slate-600">{{ key }}</span>
          <strong
            class="px-2 py-0.5 rounded text-xs font-bold shrink-0"
            :class="latestSample[key] === 1 ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-600'"
          >
            {{ latestSample[key] }}
          </strong>
        </div>
      </div>

      <p class="text-xs text-slate-400 m-0">
        0 / 1 là trạng thái logic vật lý của cảm biến, không đồng nghĩa với bình thường / hư hỏng.
      </p>
    </section>
  </div>
</template>
