<script setup>
import { computed, ref } from 'vue'
import { incidentStates } from '../data/incidents'
const props = defineProps({ incidents: { type: Array, required: true }, filters: Boolean })
defineEmits(['select'])
const search = ref(''), line = ref(''), risk = ref(''), state = ref('')
const filtered = computed(() => props.incidents.filter(a => (!line.value || line.value === a.line) && (!risk.value || risk.value === a.risk) && (!state.value || state.value === a.state) && `${a.id} ${a.machine} ${a.title}`.toLowerCase().includes(search.value.toLowerCase())))
</script>
<template>
  <section class="panel">
    <div v-if="filters" class="filters"><input v-model="search" type="search" placeholder="Tìm sự cố, thiết bị…"
        aria-label="Tìm sự cố hoặc thiết bị"><select v-model="line" aria-label="Lọc dây chuyền">
        <option value="">Mọi dây chuyền</option>
        <option v-for="l in ['A', 'B', 'C', 'D']" :key="l">{{ l }}</option>
      </select><select v-model="risk" aria-label="Lọc mức độ">
        <option value="">Mọi mức độ</option>
        <option>Cao</option>
        <option>Trung bình</option>
      </select><select v-model="state" aria-label="Lọc trạng thái">
        <option value="">Mọi trạng thái</option>
        <option v-for="s in incidentStates" :key="s">{{ s }}</option>
      </select></div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Sự cố / Phát hiện</th>
            <th>Thiết bị</th>
            <th>Mức độ</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in filtered" :key="a.id">
            <td><button class="text-button" @click="$emit('select', a.id)">{{ a.id }}</button><small>09/09 · {{ a.time
                }}</small></td>
            <td>{{ a.machine }}<small>Dây chuyền {{ a.line }}</small></td>
            <td><span class="badge" :class="a.risk === 'Cao' ? 'red' : 'amber'">{{ a.risk }}</span></td>
            <td><span class="badge" :class="{ 'green': a.state === 'Đã đóng', 'amber': a.state === 'Chờ duyệt' }">{{ a.state
                }}</span></td>
            <td><button class="text-button" @click="$emit('select', a.id)">Chi tiết →</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!filtered.length" class="empty">Không có sự cố phù hợp bộ lọc.</p>
    <p class="caption">{{ filtered.length }} sự cố · Mới nhất trước · Dữ liệu minh họa</p>
  </section>
</template>
