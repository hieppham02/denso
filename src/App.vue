<script setup>
import { ref } from 'vue'
import { Activity, ArrowUpRight, Box, ChevronRight, CircleHelp, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Radio, ShieldCheck } from 'lucide-vue-next'
import MachineViewport from './components/MachineViewport.vue'
import SensorPanel from './components/SensorPanel.vue'

const sidebarOpen = ref(false)
const sensors = [
  { code: 'TP2', name: 'Áp suất máy nén', unit: 'bar', color: '#66e2bf' },
  { code: 'TP3', name: 'Áp suất hệ thống', unit: 'bar', color: '#79b8ff' },
  { code: 'Motor_current', name: 'Dòng điện động cơ', unit: 'A', color: '#d8b48d' },
]
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">Đến nội dung chính</a>
    <aside id="sidebar" class="sidebar" :class="{ 'is-open': sidebarOpen }">
      <a class="brand" href="#main-content" @click="sidebarOpen = false">
        <span class="brand-mark"><Activity :size="25" aria-hidden="true" /></span>
        <span>Factory<span class="font-normal">Doctor</span><small>DENSO HACKATHON 2026</small></span>
      </a>
      <p class="nav-label">Workspaces</p>
      <nav aria-label="Điều hướng chính">
        <a class="nav-item active" href="#main-content" aria-current="page" @click="sidebarOpen = false"><LayoutDashboard :size="19" aria-hidden="true" /> Tổng quan <ChevronRight :size="16" class="ml-auto" aria-hidden="true" /></a>
        <a class="nav-item" href="#sensors" @click="sidebarOpen = false"><Activity :size="19" aria-hidden="true" /> Tín hiệu cảm biến</a>
        <a class="nav-item" href="#machine-heading" @click="sidebarOpen = false"><Box :size="19" aria-hidden="true" /> Không gian thiết bị</a>
      </nav>
      <div class="sidebar-bottom">
        <div class="phase-note"><CircleHelp :size="18" aria-hidden="true" /><div>Bản dựng giao diện<p>Chưa kết nối dữ liệu máy.</p></div></div>
        <div class="team"><span>A1</span><div>Nhóm A1<small>Predictive & Knowledge AI</small></div></div>
      </div>
    </aside>

    <div class="main-shell">
      <header class="topbar">
        <div class="flex items-center gap-3">
          <button class="mobile-menu" type="button" :aria-expanded="sidebarOpen" aria-controls="sidebar" :aria-label="sidebarOpen ? 'Đóng menu' : 'Mở menu'" @click="sidebarOpen = !sidebarOpen"><component :is="sidebarOpen ? PanelLeftClose : PanelLeftOpen" :size="22" /></button>
          <span class="muted">Không gian làm việc</span><ChevronRight :size="15" class="muted" aria-hidden="true" /><span>Tổng quan</span>
        </div>
        <span class="header-badge">BẢN GIAO DIỆN · 01</span>
      </header>

      <main id="main-content">
        <div class="page-heading">
          <div><p class="eyebrow">GIÁM SÁT & HỖ TRỢ BẢO TRÌ</p><h1>Tổng quan thiết bị<span class="accent">.</span></h1><p class="page-description">Theo dõi máy nén khí và các tín hiệu vận hành.</p></div>
          <span class="connection-badge"><Radio :size="16" aria-hidden="true" /> Chưa kết nối dữ liệu</span>
        </div>

        <section class="metrics" aria-label="Thông số thiết bị">
          <article v-for="sensor in sensors" :key="sensor.code" class="metric-card">
            <div class="flex items-center justify-between gap-2"><span>{{ sensor.name }}</span><ArrowUpRight :size="17" class="muted" aria-hidden="true" /></div>
            <div class="metric-value">— <small>{{ sensor.unit }}</small></div>
            <div class="metric-footer"><span class="signal-marker" :style="{ '--signal-color': sensor.color }" aria-hidden="true"></span>{{ sensor.code }}<span class="ml-auto muted">Chưa có dữ liệu</span></div>
          </article>
        </section>

        <div class="workspace-grid">
          <div class="flex min-w-0 flex-col gap-5">
            <MachineViewport />
            <section class="panel status-panel" aria-labelledby="status-heading"><span class="status-icon"><ShieldCheck :size="22" aria-hidden="true" /></span><div><h2 id="status-heading">Đánh giá tình trạng</h2><p>Chưa có dữ liệu để đánh giá trạng thái máy.</p></div><span class="neutral-tag">Chưa đánh giá</span></section>
          </div>
          <section id="sensors" class="panel sensor-stack" aria-labelledby="sensor-heading">
            <div class="panel-heading"><div><p class="eyebrow">TÍN HIỆU VẬN HÀNH</p><h2 id="sensor-heading">Theo dõi cảm biến</h2></div><span class="neutral-tag">3 tín hiệu</span></div>
            <SensorPanel v-for="sensor in sensors" :key="sensor.code" v-bind="sensor" />
            <div class="time-axis"><span>Thời gian</span><span>Ba biểu đồ dùng chung trục thời gian</span></div>
          </section>
        </div>
        <footer class="page-footer"><span>FACTORY DOCTOR <span class="muted">/</span> NHÓM A1</span><span>MetroPT-3 · Máy nén khí</span></footer>
      </main>
    </div>
  </div>
</template>
