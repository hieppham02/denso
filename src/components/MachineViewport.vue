<script setup>
import { Box, Maximize2 } from 'lucide-vue-next'
// TODO: Tích hợp thư viện 3D tại đây trong tương lai
// import { onMounted, ref } from 'vue'
// import * as THREE from 'three'

// const canvasRef = ref(null)
</script>

<template>
  <section class="min-w-0 rounded-lg border border-slate-200 bg-white p-4 lg:p-5 viewport-panel" aria-labelledby="machine-heading">
    <!-- Header -->
    <div class="panel-heading">
      <div>
        <p class="eyebrow">KHÔNG GIAN THIẾT BỊ</p>
        <h2 id="machine-heading">Máy nén khí</h2>
      </div>
      <button 
        class="icon-button" 
        aria-label="Phóng to mô hình 3D"
        title="Toàn màn hình"
      >
        <Maximize2 :size="18" aria-hidden="true" />
      </button>
    </div>

    <!-- 3D Canvas Placeholder -->
    <div class="machine-viewport">
      <span class="viewport-caption">APU–01 / METROPT-3</span>
      
      <div class="viewport-empty">
        <div class="model-icon">
          <Box :size="42" :stroke-width="1" aria-hidden="true" />
        </div>
        <h3>Vùng hiển thị mô hình 3D</h3>
        <p>Mô hình máy nén sẽ xuất hiện tại đây.</p>
        <span class="neutral-tag">Chưa có mô hình</span>
        
        <!-- Canvas cho Three.js/Babylon.js -->
        <!-- <canvas ref="canvasRef" class="webgl-canvas"></canvas> -->
      </div>
      
      <span class="viewport-footer">MÁY NÉN · BÌNH KHÍ · ĐƯỜNG ỐNG</span>
    </div>

    <!-- Thông số phụ -->
    <div class="machine-summary">
      <div>
        <span>Thiết bị</span>
        <strong>APU–01</strong>
      </div>
      <div>
        <span>Nguồn dữ liệu</span>
        <strong>Chưa kết nối</strong>
      </div>
      <div>
        <span>Trạng thái</span>
        <strong>Chưa xác định</strong>
      </div>
    </div>
  </section>
</template>