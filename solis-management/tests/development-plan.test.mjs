import test from 'node:test';
import assert from 'node:assert/strict';
import {manilaDay,developmentPlan} from '../app/lib/development-plan.ts';
test('daily focus respects Manila dates, deadlines, completion, and deterministic prioritization without mutating work',()=>{
 assert.equal(manilaDay(new Date('2026-11-02T16:01:00Z')),'2026-11-03');
 assert.equal(manilaDay(new Date('2026-11-02T15:59:00Z')),'2026-11-02');
 const work=(id,options={})=>({id,name:id,kind:'development',status:'Backlog',data:{priority:'Normal'},...options});
 const records=[work('later',{data:{dueDate:'2026-11-04'}}),work('done',{status:'Done'}),work('archived',{archived:1}),work('backlog'),work('progress',{status:'In progress',data:{dueDate:'2026-12-01'}}),work('blocked',{status:'Blocked'}),work('today',{data:{dueDate:'2026-11-03'}}),work('overdue',{data:{dueDate:'2026-11-02'}}),work('inventory',{kind:'inventory'})];
 const before=structuredClone(records),result=developmentPlan(records,'2026-11-03',4);
 assert.equal(result.total,5);assert.deepEqual(result.items.map(x=>x.row.id),['overdue','today','blocked','progress']);assert.deepEqual(result.items.map(x=>x.reason),['Overdue','Due today','Resolve blocker','Continue work']);assert.deepEqual(records,before);
 assert.equal(developmentPlan([],'2026-11-03').items.length,0);
});
