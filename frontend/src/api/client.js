const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001').replace(/\/$/, '')
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws')

const STATE_LABELS = {
  NEW: 'Mới',
  ANALYZING: 'Đang phân tích',
  PENDING: 'Chờ duyệt',
  PROCESSING: 'Đang xử lý',
  MONITORING: 'Đang theo dõi',
  CLOSED: 'Đã đóng',
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (!response.ok) {
    let detail = `API request failed (${response.status})`
    try {
      const body = await response.json()
      detail = body.detail || detail
    } catch {
      // Keep the HTTP error when the server does not return JSON.
    }
    throw new Error(detail)
  }
  return response.json()
}

function normalizeIncident(incident) {
  return {
    ...incident,
    state: STATE_LABELS[incident.state] || incident.state,
    time: incident.time || '09:00',
    history: incident.history || [],
  }
}

export const api = {
  baseUrl: API_BASE_URL,
  websocketUrl: (deviceId) => `${WS_BASE_URL}/ws/simulation/${encodeURIComponent(deviceId)}`,
  health: () => request('/api/health'),
  devices: () => request('/api/devices'),
  history: (deviceId, minutes = 60, incident = false) =>
    request(`/api/devices/${encodeURIComponent(deviceId)}/history?minutes=${minutes}&incident=${incident}`),
  incidents: async (state) => {
    const query = state ? `?state=${encodeURIComponent(state)}` : ''
    return (await request(`/api/incidents${query}`)).map(normalizeIncident)
  },
  incident: async (incidentId) => normalizeIncident(await request(`/api/incidents/${encodeURIComponent(incidentId)}`)),
  transition: async (incidentId, event, payload = {}) => normalizeIncident(await request(
    `/api/incidents/${encodeURIComponent(incidentId)}/transition`,
    { method: 'POST', body: JSON.stringify({ event, ...payload }) },
  )),
}
