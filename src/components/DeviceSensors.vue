<script setup>
import { computed, ref, watch, useId } from 'vue'
import SensorPanel from './SensorPanel.vue'
import { analogSensors, digitalSensors, formatTime } from '../mock-data/simulation.js'

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
  }
})

// Khai báo state
const thirdSensorKey = ref('Motor_current')
const hoveredTime = ref(null)

// Mỗi cụm ba biểu đồ có group riêng; trước/sau xử lý không tác động lẫn nhau.
const chartGroup = `device-sensors-${useId()}`

const CHART_COLORS = ['#3563e9', '#159885', '#9370c9']

// Cố định 2 biểu đồ đầu là TP2, TP3; biểu đồ thứ 3 do người dùng chọn
const selectedSensors = computed(() => {
  return ['TP2', 'TP3', thirdSensorKey.value].map(
    (key) => analogSensors.find((sensor) => sensor.key === key)
  )
})

// Danh sách cảm biến cho dropdown (loại bỏ TP2, TP3)
const availableThirdSensors = computed(() => {
  return analogSensors.filter((sensor) => !['TP2', 'TP3'].includes(sensor.key))
})

// Lấy mẫu dữ liệu mới nhất
const latestSample = computed(() => props.samples.at(-1))

// Tính toán thời gian đang được đối chiếu (hover)
const activeHoverTime = computed(() => {
  const defaultHover = Math.min(props.end, latestSample.value?.time ?? props.end)
  return hoveredTime.value ?? defaultHover
})

// Reset hover khi khoảng thời gian hoặc dữ liệu thay đổi
watch(
  () => [props.samples, props.start, props.end],
  () => { hoveredTime.value = null }
)

function handleHover(time) {
  hoveredTime.value = time
}
</script>

<template>
  <div class="grid min-w-0 content-start gap-[18px]">
    <!-- Block 1: Thông số Analog hiện tại (ẩn nếu ở chế độ compact) -->
    <div v-if="!compact && latestSample" class="grid grid-cols-2 gap-3 min-[801px]:grid-cols-4 min-[1550px]:grid-cols-7">
      <div
        v-for="sensor in analogSensors"
        :key="sensor.key"
        class="sensor-value"
      >
        <span class="text-slate-500">{{ sensor.name }}</span>
        <div>
          <strong>
            {{ latestSample[sensor.key].toFixed(sensor.key === 'Oil_temperature' ? 1 : 2) }}
          </strong>
          <small>{{ sensor.unit }}</small>
        </div>
        <small>{{ sensor.key }}</small>
      </div>
    </div>

    <!-- Block 2: Đồ thị chuỗi thời gian -->
    <section class="min-w-0 rounded-lg border border-slate-200 bg-white p-4 lg:p-5">
      <div class="flex flex-wrap items-center gap-3 justify-between">
        <h2>Diễn biến cảm biến</h2>
        <span class="text-slate-500">Chung trục thời gian</span>
      </div>

      <label class="chart-picker">
        Biểu đồ thứ ba
        <select v-model="thirdSensorKey">
          <option
            v-for="sensor in availableThirdSensors"
            :key="sensor.key"
            :value="sensor.key"
          >
            {{ sensor.key }} · {{ sensor.name }}
          </option>
        </select>
      </label>

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
        @hover="handleHover"
      />

      <p class="caption">
        Thời điểm đối chiếu: {{ formatTime(activeHoverTime, relative) }} · Rê chuột hoặc chạm vào biểu đồ.
      </p>

      <p v-if="marker !== null" class="caption">
        Vạch cam: {{ relative ? 'bắt đầu rò khí' : 'bắt đầu đoạn bất thường' }} · {{ formatTime(marker, relative) }}
      </p>
    </section>

    <!-- Block 3: Trạng thái Digital 8 kênh -->
    <section v-if="!compact && latestSample" class="min-w-0 rounded-lg border border-slate-200 bg-white p-4 lg:p-5">
      <div class="flex flex-wrap items-center gap-3 justify-between">
        <h2>Tín hiệu trạng thái</h2>
        <span class="text-slate-500">8 kênh · 0 / 1</span>
      </div>

      <div class="digital-values">
        <div v-for="key in digitalSensors" :key="key">
          <span>{{ key }}</span>
          <strong
            class="bit"
            :class="{ 'one': latestSample[key] === 1 }"
          >
            {{ latestSample[key] }}
          </strong>
        </div>
      </div>

      <p class="caption">
        0 / 1 là trạng thái tín hiệu, không đồng nghĩa với bình thường / lỗi.
      </p>
    </section>
  </div>
</template>
