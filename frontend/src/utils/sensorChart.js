import { formatTime } from '../domain/sensors.js'

// Adapter dữ liệu dùng chung cho mọi biểu đồ (thiết bị, mô phỏng, tổng quan).
export function toSensorPoints(samples, key, start, end) {
  return samples
    .filter(sample => Number.isFinite(sample.time) && Number.isFinite(sample[key]) && sample.time >= start && sample.time <= end)
    .map(sample => ({ x: sample.time, y: sample[key] }))
}

export function paddedYRange(points, visibleStart = -Infinity, visibleEnd = Infinity) {
  const values = points
    .filter(point => point.x >= visibleStart && point.x <= visibleEnd && Number.isFinite(point.y))
    .map(point => point.y)
  if (!values.length) return {}

  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const span = dataMax - dataMin
  const baseline = Math.max(Math.abs(dataMin), Math.abs(dataMax), 1)
  const padding = Math.max(span * 0.10, baseline * 0.02)

  return { min: dataMin - padding, max: dataMax + padding }
}

export function makeSensorOptions({
  id, group, sensor, color, start, end, relative, marker, curve = 'smooth', animationSpeed = 2000,
  zoomRange, points = [],
  onHover, onZoom, onZoomReset, timeFormatter,
}) {
  const precision = sensor.key === 'DV_pressure' ? 3 : 2
  const fullEnd = Math.max(start + 1, end)
  const visibleStart = Number.isFinite(zoomRange?.min) ? zoomRange.min : start
  const visibleEnd = Number.isFinite(zoomRange?.max) ? zoomRange.max : fullEnd
  const yRange = paddedYRange(points, visibleStart, visibleEnd)
  const transitionSpeed = [100, 200, 500, 1000, 2000, 5000].includes(Number(animationSpeed))
    ? Number(animationSpeed)
    : 2000
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
      animations: {
        enabled: relative,
        easing: 'linear',
        speed: transitionSpeed,
        dynamicAnimation: { enabled: relative, speed: transitionSpeed },
      },
      redrawOnParentResize: true, redrawOnWindowResize: true,
      parentHeightOffset: 0,
      toolbar: { show: true, tools: { download: false, selection: false, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true }, autoSelected: 'zoom' },
      zoom: { enabled: true, type: 'x', autoScaleYaxis: false },
      events: {
        mouseMove: reportPoint,
        click: reportPoint,
        zoomed: (_chart, { xaxis }) => onZoom?.({ min: xaxis.min, max: xaxis.max }),
        beforeResetZoom: () => {
          onZoomReset?.()
          return { xaxis: { min: start, max: fullEnd } }
        },
      },
    },
    theme: { mode: 'light' }, colors: [color],
    stroke: { curve, width: 2 },
    markers: { size: 0, hover: { size: 4 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: '#e6eaf0', padding: { left: 0, right: 14, top: 4, bottom: 0 } },
    xaxis: {
      type: 'numeric', min: visibleStart, max: visibleEnd, tickAmount: relative ? 8 : 6,
      labels: { hideOverlappingLabels: true, rotate: 0, formatter: value => timeFormatter?.(value) || formatTime(Number(value), relative) },
      title: { text: relative ? 'Thời gian mô phỏng (giờ:phút:giây)' : 'Thời gian (giờ:phút)', style: { fontWeight: 400 } },
      axisBorder: { color: '#dce3ed' }, axisTicks: { show: false },
      crosshairs: { show: true, stroke: { color: '#8695ac', dashArray: 3 } },
      tooltip: { enabled: false },
    },
    yaxis: {
      tickAmount: 5,
      ...yRange,
      labels: { minWidth: 64, maxWidth: 64, formatter: value => Number.isFinite(value) ? value.toFixed(precision) : '—' },
    },
    tooltip: {
      enabled: true, shared: false, intersect: false,
      x: { formatter: value => timeFormatter?.(value) || formatTime(value, relative) },
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
