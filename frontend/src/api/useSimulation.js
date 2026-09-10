import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { api } from './client.js'
import { mergeSimulationMessages, SIMULATION_RENDER_INTERVAL_MS } from './simulationBuffer.js'

export function useSimulation(initialDeviceId = 'APU-01') {
  const session = shallowRef({ device_id: initialDeviceId, scenario: 'normal', elapsed: 0, samples: [] })
  const isRunning = ref(false)
  const connectionState = ref('idle')
  const currentScenario = ref('normal')
  const playbackSpeed = ref(1)
  let socket = null
  let connectPromise = null
  let pendingReset = null
  let renderTimer = null
  let pendingSampleMessages = []

  function flushPendingSamples() {
    if (renderTimer !== null) clearTimeout(renderTimer)
    renderTimer = null
    if (!pendingSampleMessages.length) return

    const messages = pendingSampleMessages
    pendingSampleMessages = []
    const latest = messages.at(-1)
    session.value = mergeSimulationMessages(session.value, messages)
    isRunning.value = latest.running
    connectionState.value = latest.running ? 'running' : 'paused'
  }

  function queueSamples(message) {
    pendingSampleMessages.push(message)
    isRunning.value = message.running
    connectionState.value = message.running ? 'running' : 'paused'
    if (renderTimer === null) {
      renderTimer = setTimeout(flushPendingSamples, SIMULATION_RENDER_INTERVAL_MS)
    }
  }

  function discardPendingSamples() {
    if (renderTimer !== null) clearTimeout(renderTimer)
    renderTimer = null
    pendingSampleMessages = []
  }

  function pause() {
    flushPendingSamples()
    isRunning.value = false
    connectionState.value = socket?.readyState === WebSocket.OPEN ? 'paused' : 'idle'
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ action: 'pause' }))
  }

  function closeSocket() {
    discardPendingSamples()
    if (socket) socket.close()
    socket = null
    connectPromise = null
    pendingReset = null
    isRunning.value = false
    connectionState.value = 'idle'
  }

  function handleMessage(message, deviceId) {
    if (message.type === 'reset') {
      discardPendingSamples()
      session.value = {
        device_id: deviceId,
        scenario: message.scenario,
        elapsed: message.elapsed,
        samples: [message.sample],
        data_source: message.dataSource,
      }
      isRunning.value = false
      connectionState.value = 'connected'
      pendingReset?.resolve(session.value)
      pendingReset = null
      return
    }
    if (message.type === 'samples') {
      queueSamples(message)
    }
  }

  function connect(deviceId) {
    if (socket?.readyState === WebSocket.OPEN && session.value.device_id === deviceId) return Promise.resolve()
    closeSocket()
    connectionState.value = 'connecting'
    connectPromise = new Promise((resolve, reject) => {
      const nextSocket = new WebSocket(api.websocketUrl(deviceId))
      socket = nextSocket
      nextSocket.onopen = () => resolve()
      nextSocket.onmessage = (event) => {
        try {
          handleMessage(JSON.parse(event.data), deviceId)
        } catch {
          connectionState.value = 'error'
        }
      }
      nextSocket.onerror = () => {
        connectionState.value = 'error'
        reject(new Error('Không thể kết nối WebSocket mô phỏng.'))
      }
      nextSocket.onclose = () => {
        if (socket === nextSocket) {
          socket = null
          isRunning.value = false
          connectionState.value = 'idle'
        }
      }
    })
    return connectPromise
  }

  async function reset(deviceId = initialDeviceId) {
    await connect(deviceId)
    if (socket?.readyState !== WebSocket.OPEN) throw new Error('WebSocket mô phỏng chưa sẵn sàng.')
    const result = new Promise((resolve, reject) => { pendingReset = { resolve, reject } })
    socket.send(JSON.stringify({ action: 'reset', scenario: currentScenario.value }))
    return result
  }

  async function play(deviceId = session.value.device_id) {
    await connect(deviceId)
    if (!session.value.samples.length) await reset(deviceId)
    if (socket?.readyState !== WebSocket.OPEN) throw new Error('WebSocket mô phỏng chưa sẵn sàng.')
    socket.send(JSON.stringify({ action: 'start', playbackSpeed: playbackSpeed.value }))
    isRunning.value = true
    connectionState.value = 'running'
  }

  watch(playbackSpeed, (speed) => {
    if (isRunning.value && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'start', playbackSpeed: speed }))
    }
  })

  onBeforeUnmount(closeSocket)

  return {
    session, isRunning, connectionState, currentScenario, playbackSpeed,
    pause, reset, play,
  }
}
