<script setup>
import { Box, Maximize2 } from 'lucide-vue-next'
</script>

<template>
  <section class="panel viewport-panel" aria-labelledby="machine-heading">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">KHÔNG GIAN THIẾT BỊ</p>
        <h2 id="machine-heading">Máy nén khí</h2>
      </div>
      <span class="muted"><Maximize2 :size="18" aria-hidden="true" /></span>
    </div>
    <div class="machine-viewport">
      <span class="viewport-caption">APU–01 / METROPT-3</span>
      <div class="viewport-empty">
        <div class="model-icon"><Box :size="42" :stroke-width="1" aria-hidden="true" /></div>
        <h3>Vùng hiển thị mô hình 3D</h3>
        <p>Mô hình máy nén sẽ xuất hiện tại đây.</p>
        <span class="neutral-tag">Chưa có mô hình</span>
      </div>
      <span class="viewport-footer">MÁY NÉN · BÌNH KHÍ · ĐƯỜNG ỐNG</span>
    </div>
    <div class="machine-summary">
      <div><span>Thiết bị</span><strong>APU–01</strong></div>
      <div><span>Nguồn dữ liệu</span><strong>Chưa kết nối</strong></div>
      <div><span>Trạng thái</span><strong>Chưa xác định</strong></div>
    </div>
  </section>
</template>
