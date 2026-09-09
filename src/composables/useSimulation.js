import { onBeforeUnmount, ref, shallowRef } from 'vue'
import { advanceSimulation, createSimulation, SIMULATION_DURATION } from '../data/simulation'

export function useSimulation() {
  const session = shallowRef(createSimulation('APU-09'))
  const running = ref(false), scenario = ref('normal'), speed = ref(1)
  let timer = null
  function pause() {
    if (timer !== null) clearInterval(timer)
    timer = null
    running.value = false
  }
  function reset(id) {
    pause()
    session.value = createSimulation(id)
  }
  function play(id) {
    if (running.value) return
    if (session.value.elapsed >= SIMULATION_DURATION) reset(id)
    running.value = true
    timer = setInterval(() => {
      session.value = { ...advanceSimulation(session.value, scenario.value, speed.value) }
      if (session.value.elapsed >= SIMULATION_DURATION) pause()
    }, 1000)
  }
  onBeforeUnmount(pause)
  return { session, running, scenario, speed, pause, reset, play }
}
