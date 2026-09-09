import test from 'node:test'
import assert from 'node:assert/strict'
import { toSensorPoints, makeSensorOptions } from '../src/utils/sensorChart.js'
const defaults = { id: 'tp2', group: 'device-a', sensor: { key: 'TP2', unit: 'bar' }, color: '#3563e9', start: -60, end: 120, relative: true, marker: 60 }

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
  assert.equal(pressure.yaxis.min,undefined)
  assert.equal(pressure.xaxis.min,temperature.xaxis.min)
  assert.equal(pressure.xaxis.max,temperature.xaxis.max)
  assert.equal(pressure.xaxis.type,temperature.xaxis.type)
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
