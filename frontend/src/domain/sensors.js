export const analogSensors = [
  { key: 'TP2', name: 'Áp suất máy nén', unit: 'bar' },
  { key: 'TP3', name: 'Áp suất hệ thống', unit: 'bar' },
  { key: 'H1', name: 'Áp suất H1', unit: 'bar' },
  { key: 'DV_pressure', name: 'Chênh áp DV', unit: 'bar' },
  { key: 'Reservoirs', name: 'Áp suất bình chứa', unit: 'bar' },
  { key: 'Oil_temperature', name: 'Nhiệt độ dầu', unit: '°C' },
  { key: 'Motor_current', name: 'Dòng điện động cơ', unit: 'A' },
]

export const digitalSensors = [
  'COMP', 'DV_eletric', 'Towers', 'MPG',
  'LPS', 'Pressure_switch', 'Oil_level', 'Caudal_impulses',
]

export function formatTime(seconds, isRelative = false) {
  if (isRelative) {
    const sign = seconds < 0 ? '−' : ''
    const totalSeconds = Math.floor(Math.abs(seconds))
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
    const secs = String(totalSeconds % 60).padStart(2, '0')
    return `${sign}${hours}:${mins}:${secs}`
  }

  return '--:--'
}
