import test from 'node:test'
import assert from 'node:assert/strict'
import { analogSensors, digitalSensors, devices, createHistory, createSimulation, advanceSimulation } from '../src/mock-data/simulation.js'

test('Every device exposes 15 finite sensor values on the same ordered timeline',()=>{
  for(const device of devices){
    const samples=createHistory(device.id,true)
    assert.equal(samples.length,721)
    for(let i=0;i<samples.length;i++){
      const sample=samples[i]
      for(const {key} of analogSensors)assert.ok(Number.isFinite(sample[key]))
      for(const key of digitalSensors)assert.ok([0,1].includes(sample[key]))
      assert.ok(Math.abs(sample.TP3-sample.Reservoirs-.02)<1e-9)
      assert.equal(sample.DV_eletric,Number(sample.loaded))
      assert.equal(sample.Motor_current>6,sample.loaded)
      if(i)assert.equal(sample.time-samples[i-1].time,5)
    }
  }
})
test('Leak scenario diverges only after injection and increases compressor duty',()=>{
  const normal=createSimulation('APU-09'),leak=createSimulation('APU-09')
  for(let i=0;i<11;i++){advanceSimulation(normal,'normal');advanceSimulation(leak,'leak')}
  assert.deepEqual(normal.samples,leak.samples)
  while(normal.elapsed<900){advanceSimulation(normal,'normal',5);advanceSimulation(leak,'leak',5)}
  const duty=s=>s.samples.filter(p=>p.time>=60&&p.loaded).length
  assert.ok(duty(leak)>duty(normal))
  assert.ok(leak.samples.every(s=>s.TP3>0))
})
test('Simulation duration, speed, buffer and reset are deterministic',()=>{
  const session=createSimulation('APU-01')
  advanceSimulation(session,'normal',5)
  assert.equal(session.elapsed,25)
  for(let i=0;i<100;i++)advanceSimulation(session,'normal',5)
  assert.equal(session.elapsed,900)
  assert.ok(session.samples.length<=181)
  assert.equal(session.samples.at(-1).time,900)
  assert.equal(createSimulation('APU-01').elapsed,0)
  assert.throws(()=>advanceSimulation(session,'unknown'))
})
