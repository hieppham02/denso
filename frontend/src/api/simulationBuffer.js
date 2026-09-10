export const SIMULATION_RENDER_INTERVAL_MS = 100

export function mergeSimulationMessages(session, messages, maxSamples = 901) {
  if (!messages.length) return session
  const latest = messages.at(-1)
  const incomingSamples = messages.flatMap(message => message.samples)
  return {
    ...session,
    elapsed: latest.elapsed,
    scenario: latest.scenario,
    samples: [...session.samples, ...incomingSamples].slice(-maxSamples),
  }
}
