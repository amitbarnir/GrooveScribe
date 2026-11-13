// Run: node _test_mini_monster.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const context = {window: {localStorage: {getItem: () => null}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/groove_library.js', 'utf8'), context);
const {GrooveLibrary, DEFAULT_SEED} = context.GrooveLibrary;
const counts = [20,18,10,18,20,18,18,32,18,18,18,36,32,18,18];
assert.equal(DEFAULT_SEED.length, 312);
assert.equal(new Set(DEFAULT_SEED.map(e => e.path.join('/'))).size, 312);
for (let p=1;p<=15;p++) assert.equal(DEFAULT_SEED.filter(e=>e.path[0]===`Page ${p}`).length, counts[p-1]);
for (const entry of DEFAULT_SEED) {
 const q=new URLSearchParams(entry.query), page=+entry.path[0].split(' ')[1];
 assert.equal(q.get('TimeSig'), [8,12,13].includes(page)?'2/4':'4/4');
 assert.equal(+q.get('Measures'),page===3?2:1);
 for (const instrument of ['H','S','K']) {
  const bars=q.get(instrument).split('|').filter(Boolean);
  assert.equal(bars.length,+q.get('Measures'));
  bars.forEach(bar=>assert.equal(bar.length,[8,12,13].includes(page)?8:16));
 }
 if(page===5) assert(!q.get('K').includes('o'));
}
function backend(initial={}) {
 return {tree:initial,writes:0,read(){return JSON.parse(JSON.stringify(this.tree));},write(t){this.tree=t;this.writes++;}};
}
let b=backend(), lib=new GrooveLibrary(b);lib.seedMissing();assert.equal(b.writes,1);lib.seedMissing();assert.equal(b.writes,1);
const corrected=DEFAULT_SEED.find(e=>e.path.join('/')==='Page 6/Beat 1');
b=backend({'Mini Monster':{'Page 6':{'Beat 1':corrected.previousQuery,'Beat 2':null,'Beat 3':'?custom=1'}},Me:{Practice:'?mine=1'}});
lib=new GrooveLibrary(b);lib.seedMissing();
assert.equal(b.tree['Mini Monster']['Page 6']['Beat 1'],corrected.query);
assert.equal(typeof b.tree['Mini Monster']['Page 6']['Beat 2'],'string');
assert.equal(b.tree['Mini Monster']['Page 6']['Beat 3'],'?custom=1');
assert.equal(b.tree.Me.Practice,'?mine=1');
lib.seedMissing();assert.equal(b.writes,1);
// User-owned folders or leaves at conflicting paths must not be destroyed.
b=backend({'Mini Monster':{'Page 1':'?custom=page','Page 2':{'Beat 1':{Custom:'?custom=folder'}}}});
new GrooveLibrary(b).seedMissing();assert.equal(b.tree['Mini Monster']['Page 1'],'?custom=page');assert.equal(b.tree['Mini Monster']['Page 2']['Beat 1'].Custom,'?custom=folder');
console.log('PASS: 312 unique complete exercises; time signatures, measures, empty bass part, migration, custom preservation and idempotence.');
