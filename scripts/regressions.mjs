import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const { valid } = require('../shared/scoring.js');
const baseline = 'a5ad48022b9bb38947beca1413d28d4a7ccc01d0';
function sourceFunction(source, name) {
  const pos = source.indexOf('function ' + name + '('); assert(pos >= 0, name + ' exists');
  const start = source.indexOf('{', pos); let depth = 1, end = start + 1;
  for (;depth && end < source.length; end++) { if (source[end] === '{') depth++; if (source[end] === '}') depth--; }
  return source.slice(source.slice(pos - 6, pos) === 'async ' ? pos - 6 : pos, end);
}
function blankProbe(source) {
  const ctx={ document:{ querySelector:()=>null }, $:()=>({value:''}), SCORE_FIELDS:['vocals','performance','song','original','stage'] };
  const vote=vm.runInNewContext(sourceFunction(source,'readForm')+';readForm()',ctx);
  assert.equal(valid(vote),false,'Unchecked scores must not form a valid saved vote');
}
async function resetProbe(source, legacy=false) {
  const tree={'semi-1':{MD:{total:5}},'semi-2':{BG:{total:10}}};
  if (!legacy) {
    const { harness, fakeDb, tick } = require('../tests/session-harness.cjs');
    const database = fakeDb();
    database.update = async (path, changes) => {
      for (const [p, value] of Object.entries(changes)) if (value === null) {
        if (p === 'votes') { delete tree['semi-1']; delete tree['semi-2']; }
        else if (p.startsWith('votes/')) delete tree[p.slice(6)];
      }
    };
    const h = harness(database, undefined, source);
    await h.session.connect('ABCDEF', 'semi-2'); await tick(); await h.session.reset();
    assert.equal(tree['semi-2'], undefined, 'Current stage removed');
    assert.equal(tree['semi-1']?.MD.total, 5, 'Other stage preserved');
    return;
  }
  const db={ref:p=>({remove:async()=>{ if(p.endsWith('/votes')) {delete tree['semi-1'];delete tree['semi-2'];} else delete tree[p.split('/').at(-1)];},update:async changes=>{ for(const [p,v] of Object.entries(changes)) if(v===null) {if(p==='votes') {delete tree['semi-1'];delete tree['semi-2'];} else if(p.startsWith('votes/')) delete tree[p.slice(6)];} }})};
  const noop=()=>{}; const elem={classList:{remove:noop},style:{}};
  const ctx={db,stage:'semi-2',STAGE:'semi-2',stopped:false,connected:true,activeWrite:Promise.resolve(),userBase:()=> '2026/parties/ABCDEF/users/me',timed:p=>p,
    firebase:{database:{ServerValue:{increment:n=>n}}},pending:{},persistPending:noop,S:{write:noop},key:k=>k,onVotes:noop,lastError:'',summary:noop,
    confirm:()=>true,votes:{BG:{}},localStorage:{removeItem:noop},KEY_VOTES:'x',partyCode:'ABCDEF',userId:'me',PARTY_YEAR:'2026',editingCode:null,
    rebuildQueue:noop,renderStats:noop,renderTable:noop,entryPanel:elem,setRatingActive:noop,donePanel:elem,startPanel:elem};
  const name=legacy?'resetVotes':'reset';
  await vm.runInNewContext(sourceFunction(source,name)+';'+name+'()',ctx);
  assert.equal(tree['semi-2'],undefined,'Current stage removed'); assert.equal(tree['semi-1']?.MD.total,5,'Other stage preserved');
}
function expectFailure(label, fn) { return Promise.resolve().then(fn).then(()=>{throw new Error(label+' unexpectedly passed');},()=>console.log('EXPECTED REGRESSION FAILURE: '+label)); }
const old=execFileSync('git',['show',baseline+':index.html'],{encoding:'utf8'});
const current=fs.readFileSync('index.html','utf8'); const session=fs.readFileSync('shared/session.js','utf8');
blankProbe(current); await resetProbe(session); console.log('PASS: current blank-score and current-stage-reset probes');
await expectFailure('baseline blank-score behavior',()=>blankProbe(old));
await expectFailure('baseline all-stage reset behavior',()=>resetProbe(old,true));
await expectFailure('sabotage unchecked scores become zero',()=>blankProbe(current.replace('const val = checked ? parseInt(checked.value, 10) : null;', 'const val = checked ? parseInt(checked.value, 10) : 0;')));
await expectFailure('sabotage reset deletes all stages',()=>resetProbe(session.replace("updates['votes/' + stage] = null", "updates['votes'] = null")));
const scratch=path.join(os.homedir(),'.hermes/cache/scratch'); fs.mkdirSync(scratch,{recursive:true});
const temp=fs.mkdtempSync(path.join(scratch,'eurovision-regressions-'));
const oldRules=path.join(temp,'baseline.rules.json'); fs.writeFileSync(oldRules,execFileSync('git',['show',baseline+':database.rules.json']));
const env={...process.env,TMPDIR:scratch,GCLOUD_PROJECT:'demo-eurovision',RULES_FILE:oldRules};
if(fs.existsSync('/opt/homebrew/opt/openjdk@21/bin/java')) env.PATH='/opt/homebrew/opt/openjdk@21/bin:'+env.PATH;
const run=spawnSync('npx',['firebase','emulators:exec','--project','demo-eurovision','--config','firebase.test.json','--only','auth,database','node --test tests/rules.test.mjs'],{encoding:'utf8',env});
fs.writeFileSync(path.join(temp,'baseline-rules-output.txt'),run.stdout+run.stderr);
assert.notEqual(run.status,0,'Baseline rules must fail the new permission/validation gates');
assert.match(run.stdout+run.stderr,/Expected request to fail, but it succeeded/,'Failure must be actual unauthorized/invalid acceptance, not infrastructure');
console.log('EXPECTED REGRESSION FAILURE: baseline rules accepted unauthorized/invalid writes. Full output: '+path.join(temp,'baseline-rules-output.txt'));
console.log('PASS: all baseline/sabotage probes detected regressions; no production was contacted.');
