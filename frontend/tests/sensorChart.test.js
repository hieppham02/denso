import test from 'node:test'
import assert from 'node:assert/strict'
import { toSensorPoints, makeSensorOptions, paddedYRange } from '../src/utils/sensorChart.js'
import { formatTime } from '../src/domain/sensors.js'
const defaults = { id: 'tp2', group: 'device-a', sensor: { key: 'TP2', unit: 'bar' }, color: '#3563e9', start: -60, end: 120, relative: true, marker: 60 }

test('Relative simulation time is formatted as hours, minutes and seconds', () => {
  assert.equal(formatTime(0,true),'00:00:00')
  assert.equal(formatTime(7795,true),'02:09:55')
  assert.equal(formatTime(-3661,true),'−01:01:01')
})

test('Invalid sensor readings and samples outside the visible window never reach ApexCharts', () => {
  assert.deepEqual(toSensorPoints([
    {time:-65,TP2:4}, {time:-60,TP2:7}, {time:0,TP2:NaN},
    {time:5,TP2:Infinity}, {time:10,TP2:null}, {time:20,TP2:8}, {time:125,TP2:9},
  ], 'TP2', -60, 120), [{x:-60,y:7},{x:20,y:8}])
  assert.deepEqual(toSensorPoints([], 'TP2', -60, 120), [])
})
test('Groups align x axes without forcing different sensor units onto one y scale', () => {
  const pressure = makeSensorOptions(defaults)
  const temperature = makeSensorOptions({...defaults,id:'oil',sensor:{key:'Oil_temperature',unit:'°C'}})
  const after = makeSensorOptions({...defaults,id:'after',group:'device-after'})
  assert.equal(pressure.chart.group,temperature.chart.group)
  assert.notEqual(pressure.chart.id,temperature.chart.id)
  assert.notEqual(pressure.chart.group,after.chart.group)
  assert.equal(pressure.yaxis.labels.minWidth,temperature.yaxis.labels.minWidth)
  assert.equal(pressure.yaxis.tickAmount,3)
  assert.equal(pressure.yaxis.min,undefined)
  assert.equal(pressure.xaxis.min,temperature.xaxis.min)
  assert.equal(pressure.xaxis.max,temperature.xaxis.max)
  assert.equal(pressure.xaxis.type,temperature.xaxis.type)
  assert.equal(pressure.stroke.curve,'smooth')
  assert.equal(makeSensorOptions({...defaults,curve:'straight'}).stroke.curve,'straight')
  assert.match(temperature.tooltip.y.formatter(54),/°C/)
})
test('Leak marker obeys the visible window and hover ignores invalid indexes', () => {
  const hits=[]
  const options=makeSensorOptions({...defaults,onHover:i=>hits.push(i)})
  assert.equal(options.annotations.xaxis[0].x,60)
  assert.deepEqual(makeSensorOptions({...defaults,end:30}).annotations.xaxis,[])
  assert.deepEqual(makeSensorOptions({...defaults,marker:null}).annotations.xaxis,[])
  options.chart.events.mouseMove(null,null,{dataPointIndex:-1})
  options.chart.events.mouseMove(null,null,{dataPointIndex:2})
  assert.deepEqual(hits,[2])
})

test('Y axis leaves visible space above and below the sensor line', () => {
  assert.deepEqual(paddedYRange([]),{})
  const range=paddedYRange([{x:0,y:8.8},{x:10,y:9},{x:20,y:20}],0,10)
  assert.ok(range.min<8.8)
  assert.ok(range.max>9)
  assert.ok(range.max<20)

  const options=makeSensorOptions({...defaults,points:[{x:0,y:8.8},{x:10,y:9}]})
  assert.ok(options.yaxis.min<8.8)
  assert.ok(options.yaxis.max>9)
})

test('Realtime charts keep the user zoom and expose denser time ticks', () => {
  const zooms=[]
  let resets=0
  const options=makeSensorOptions({
    ...defaults,
    zoomRange:{min:10,max:40},
    onZoom:range=>zooms.push(range),
    onZoomReset:()=>resets++,
  })
  assert.equal(options.xaxis.min,10)
  assert.equal(options.xaxis.max,40)
  assert.equal(options.xaxis.tickAmount,8)
  assert.equal(options.chart.animations.enabled,true)
  assert.equal(options.chart.animations.dynamicAnimation.speed,2000)
  assert.equal(makeSensorOptions({...defaults,animationSpeed:500}).chart.animations.speed,500)
  assert.equal(makeSensorOptions({...defaults,animationSpeed:123}).chart.animations.speed,2000)
  options.chart.events.zoomed(null,{xaxis:{min:15,max:25}})
  assert.deepEqual(zooms,[{min:15,max:25}])
  assert.deepEqual(options.chart.events.beforeResetZoom(),{xaxis:{min:-60,max:120}})
  assert.equal(resets,1)
})
