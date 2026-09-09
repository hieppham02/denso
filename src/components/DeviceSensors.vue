<script setup>
import { computed, ref, watch } from 'vue'
import SensorPanel from './SensorPanel.vue'
import { analogSensors, digitalSensors, formatTime } from '../data/simulation'
const props = defineProps({ samples: { type: Array, required: true }, start: { type: Number, required: true }, end: { type: Number, required: true }, relative: Boolean, marker: { type: Number, default: null }, compact: Boolean })
const third = ref('Motor_current'), hover = ref(null)
const selectedSensors = computed(() => ['TP2', 'TP3', third.value].map(key => analogSensors.find(s => s.key === key)))
const latest = computed(() => props.samples.at(-1))
watch(() => [props.samples, props.start, props.end], () => { hover.value = null })
</script>
<template>
  <div class="stack">
    <div v-if="!compact && latest" class="sensor-values">
      <div v-for="sensor in analogSensors" :key="sensor.key" class="sensor-value"><span class="muted">{{ sensor.name
          }}</span>
        <div><strong>{{ latest[sensor.key].toFixed(sensor.key === 'Oil_temperature' ? 1 : 2) }}</strong> <small>{{ sensor.unit
            }}</small></div><small>{{ sensor.key }}</small>
      </div>
    </div>
    <section class="panel">
      <div class="row between">
        <h2>Diễn biến cảm biến</h2><span class="muted">Chung trục thời gian</span>
      </div>
      <label class="chart-picker">Biểu đồ thứ ba <select v-model="third">
          <option v-for="sensor in analogSensors.filter(s => !['TP2', 'TP3'].includes(s.key))" :key="sensor.key"
            :value="sensor.key">{{ sensor.key }} · {{ sensor.name }}</option>
        </select></label>
      <SensorPanel v-for="(sensor, i) in selectedSensors" :key="sensor.key" :sensor="sensor" :samples="samples"
        :start="start" :end="end" :relative="relative" :marker="marker" :hover="hover"
        :color="['#3563e9', '#159885', '#9370c9'][i]" @hover="hover = $event" />
      <p class="caption">Thời điểm đối chiếu: {{ formatTime(hover ?? Math.min(end, latest?.time ?? end), relative) }} · Rê
        chuột hoặc chạm vào biểu đồ.</p>
      <p v-if="marker !== null" class="caption">Vạch cam: {{ relative ? 'bắt đầu rò khí' : 'bắt đầu đoạn bất thường' }} · {{
        formatTime(marker, relative) }}</p>
    </section>
    <section v-if="!compact && latest" class="panel">
      <div class="row between">
        <h2>Tín hiệu trạng thái</h2><span class="muted">8 kênh · 0 / 1</span>
      </div>
      <div class="digital-values">
        <div v-for="key in digitalSensors" :key="key"><span>{{ key }}</span><strong class="bit"
            :class="{ one: latest[key] === 1 }">{{ latest[key] }}</strong></div>
      </div>
      <p class="caption">0 / 1 là trạng thái tín hiệu, không đồng nghĩa với bình thường / lỗi.</p>
    </section>
  </div>
</template>
