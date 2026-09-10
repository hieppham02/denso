<script setup>
import { Box, Maximize2 } from 'lucide-vue-next'
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4" aria-labelledby="machine-heading">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">KHÔNG GIAN THIẾT BỊ</p>
        <h2 id="machine-heading" class="text-base font-bold text-slate-900">Mô hình máy nén khí (3D)</h2>
      </div>
      <button 
        class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer" 
        aria-label="Phóng to mô hình 3D"
        title="Toàn màn hình"
      >
        <Maximize2 :size="18" aria-hidden="true" />
      </button>
    </div>

    <!-- 3D Canvas Placeholder thuần Tailwind -->
    <div class="relative w-full h-64 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 flex flex-col items-center justify-center p-4 text-center">
      <span class="absolute top-3 left-3 text-[11px] font-mono text-slate-400">APU–01 / METROPT-3</span>
      
      <div class="flex flex-col items-center gap-2">
        <div class="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-blue-600">
          <Box :size="28" :stroke-width="1.5" aria-hidden="true" />
        </div>
        <h3 class="text-sm font-semibold text-slate-800">Vùng hiển thị mô hình 3D</h3>
        <p class="text-xs text-slate-400 max-w-xs">Đang chờ tích hợp tệp GLB và thư viện Three.js.</p>
        <span class="px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-200/70 text-slate-600 mt-1">
          Chưa kết nối mô hình
        </span>
      </div>
      
      <span class="absolute bottom-3 text-[10px] tracking-wider text-slate-400 uppercase">
        ĐỘNG CƠ · BÌNH TÍCH KHÍ · ĐƯỜNG ỐNG
      </span>
    </div>

    <!-- Thông số tóm tắt -->
    <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
      <div class="p-2 rounded-lg bg-slate-50 border border-slate-100">
        <span class="block text-[11px] text-slate-400">Thiết bị</span>
        <strong class="text-sm font-semibold text-slate-800">APU–01</strong>
      </div>
      <div class="p-2 rounded-lg bg-slate-50 border border-slate-100">
        <span class="block text-[11px] text-slate-400">Nguồn dữ liệu</span>
        <strong class="text-sm font-semibold text-slate-800">Mô phỏng</strong>
      </div>
      <div class="p-2 rounded-lg bg-slate-50 border border-slate-100">
        <span class="block text-[11px] text-slate-400">Trạng thái</span>
        <strong class="text-sm font-semibold text-emerald-600">Sẵn sàng</strong>
      </div>
    </div>
  </section>
</template>