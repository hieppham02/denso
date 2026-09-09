import test from 'node:test'
import assert from 'node:assert/strict'
import { createIncidents, transitionIncident } from '../src/data/incidents.js'
test('Approval cannot skip execution or verification window',()=>{
  const incident=createIncidents()[0]
  assert.throws(()=>transitionIncident(incident,'start'))
  transitionIncident(incident,'approve',{note:'Phân công kiểm tra'})
  assert.equal(incident.state,'Đang xử lý')
  assert.throws(()=>transitionIncident(incident,'close'))
  transitionIncident(incident,'start')
  assert.throws(()=>transitionIncident(incident,'close'))
  for(let i=0;i<4;i++)transitionIncident(incident,'advance')
  transitionIncident(incident,'close')
  assert.equal(incident.state,'Đã đóng')
  assert.match(incident.history.at(-1).text,/đóng sự cố/)
})
test('Reject and edit require notes; edits record the actual action',()=>{
  const incident=createIncidents()[0]
  const previous=structuredClone(incident)
  assert.throws(()=>transitionIncident(incident,'reject'))
  assert.throws(()=>transitionIncident(incident,'edit',{note:'Thay đổi'}))
  assert.deepEqual(incident,previous)
  transitionIncident(incident,'edit',{note:'Cần xác nhận',action:'Kiểm tra tại hiện trường'})
  assert.equal(incident.state,'Chờ duyệt')
  assert.match(incident.history.at(-1).text,/Kiểm tra tại hiện trường/)
  transitionIncident(incident,'reject',{note:'Thiếu dữ liệu'})
  assert.equal(incident.state,'Đang phân tích')
})
test('Failed verification returns to analysis while retaining the audit history',()=>{
  const incident=createIncidents()[0]
  transitionIncident(incident,'approve');transitionIncident(incident,'start')
  for(let i=0;i<4;i++)transitionIncident(incident,'advance')
  const before=incident.history.length
  transitionIncident(incident,'reanalyze')
  assert.equal(incident.state,'Đang phân tích')
  assert.equal(incident.progress,0)
  assert.equal(incident.history.length,before+1)
  transitionIncident(incident,'analyze')
  assert.equal(incident.state,'Chờ duyệt')
})
