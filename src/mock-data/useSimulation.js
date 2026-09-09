import { onBeforeUnmount, ref, shallowRef } from 'vue'
import { advanceSimulation, createSimulation, SIMULATION_DURATION } from './simulation'

export function useSimulation() {
  // Trạng thái mô phỏng
  const session = shallowRef(createSimulation('APU-09'))
  const isRunning = ref(false)
  const currentScenario = ref('normal')
  const playbackSpeed = ref(1)
  
  let timerId = null

  function pause() {
    if (timerId !== null) {
      clearInterval(timerId)
      timerId = null
    }
    isRunning.value = false
  }

  function reset(deviceId) {
    pause()
    session.value = createSimulation(deviceId)
  }

  function play(deviceId) {
    if (isRunning.value) return

    // Tự động quay về từ đầu nếu đã mô phỏng hết thời gian
    if (session.value.elapsed >= SIMULATION_DURATION) {
      reset(deviceId)
    }

    isRunning.value = true
    
    // Khởi chạy bộ đếm theo thời gian thực (1 giây)
    timerId = setInterval(() => {
      // Cập nhật shallowRef bằng cách tạo tham chiếu object mới
      session.value = { 
        ...advanceSimulation(session.value, currentScenario.value, playbackSpeed.value) 
      }
      
      // Dừng tự động khi đạt giới hạn thời gian
      if (session.value.elapsed >= SIMULATION_DURATION) {
        pause()
      }
    }, 1000)
  }

  // Tự động dọn dẹp interval khi component gọi hook này bị hủy
  onBeforeUnmount(() => {
    pause()
  })

  return { 
    session, 
    isRunning, 
    currentScenario, 
    playbackSpeed, 
    pause, 
    reset, 
    play 
  }
}