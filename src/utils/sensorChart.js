import { formatTime } from '../mock-data/simulation.js'

// Adapter dữ liệu dùng chung cho mọi biểu đồ (thiết bị, mô phỏng, tổng quan).
export function toSensorPoints(samples, key, start, end) {
  return samples
    .filter(sample => Number.isFinite(sample.time) && Number.isFinite(sample[key]) && sample.time >= start && sample.time <= end)
    .map(sample => ({ x: sample.time, y: sample[key] }))
}

export function makeSensorOptions({ id, group, sensor, color, start, end, relative, marker, onHover }) {
  const precision = sensor.key === 'DV_pressure' ? 3 : sensor.key === 'count' ? 0 : 2
  const reportPoint = (_event, _chart, options) => {
    if (Number.isInteger(options?.dataPointIndex) && options.dataPointIndex >= 0) onHover?.(options.dataPointIndex)
  }

  return {
    chart: {
      id,
      // Chỉ các biểu đồ thuộc cùng DeviceSensors mới đồng bộ với nhau.
      ...(group ? { group } : {}),
      type: 'line', background: 'transparent', foreColor: '#67768d',
      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
      animations: { enabled: false },
      redrawOnParentResize: true, redrawOnWindowResize: true,
      parentHeightOffset: 0,
      toolbar: { show: true, tools: { download: false, selection: false, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true }, autoSelected: 'zoom' },
      zoom: { enabled: true, type: 'x', autoScaleYaxis: false },
      events: { mouseMove: reportPoint, click: reportPoint },
    },
    theme: { mode: 'light' }, colors: [color],
    stroke: { curve: 'straight', width: 2 },
    markers: { size: 0, hover: { size: 4 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: '#e6eaf0', padding: { left: 0, right: 14, top: 4, bottom: 0 } },
    xaxis: {
      type: 'numeric', min: start, max: Math.max(start + 1, end), tickAmount: 4,
      labels: { hideOverlappingLabels: true, rotate: 0, formatter: value => formatTime(Number(value), relative) },
      title: { text: relative ? 'Thời gian mô phỏng (phút:giây)' : 'Thời gian (giờ:phút)', style: { fontWeight: 400 } },
      axisBorder: { color: '#dce3ed' }, axisTicks: { show: false },
      crosshairs: { show: true, stroke: { color: '#8695ac', dashArray: 3 } },
      tooltip: { enabled: false },
    },
    yaxis: {
      tickAmount: 3,
      labels: { minWidth: 64, maxWidth: 64, formatter: value => Number.isFinite(value) ? value.toFixed(precision) : '—' },
    },
    tooltip: {
      enabled: true, shared: false, intersect: false,
      x: { formatter: value => formatTime(value, relative) },
      y: { formatter: value => `${Number.isFinite(value) ? value.toFixed(precision) : '—'} ${sensor.unit}` },
    },
    annotations: {
      xaxis: marker !== null && marker >= start && marker <= end ? [{
        x: marker, borderColor: '#c88420', strokeDashArray: 4,
        label: { text: relative ? 'Rò khí' : 'Bất thường', orientation: 'horizontal', style: { color: '#8a570a', background: '#fff4df' } },
      }] : [],
    },
    noData: { text: 'Chưa có dữ liệu', style: { color: '#67768d' } },
  }
}
