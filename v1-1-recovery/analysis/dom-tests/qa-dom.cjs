const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const base = path.resolve(__dirname, '../..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = [];
async function page(directory, helper = false, persisted = {}, mockScan = null) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push({name:error.name, message:error.message}));
  virtualConsole.on('error', (...args) => errors.push({name:'console.error',message:args.map(x => x?.message || String(x)).join(' ')}));
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    url:'https://lens.test/klocalens/v1-1/', runScripts:'outside-only', pretendToBeVisual:true, virtualConsole
  });
  const w = dom.window;
  w.addEventListener('error', e => {errors.push({name:e.error?.name || 'Error',message:e.message});e.preventDefault();});
  w.HTMLElement.prototype.scrollIntoView = function() {};
  w.scrollTo = function() {};
  w.URL.createObjectURL = () => 'blob:https://lens.test/mock-photo';
  if(mockScan)w.fetch=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(mockScan)}]}}]})});
  w.matchMedia = query => ({matches:false,media:query,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  w.SpeechRecognition = class {abort() {} };
  for (const [key,value] of Object.entries(persisted)) w.localStorage.setItem(key,value);
  // Reproduce body helper + deferred React entrypoint ordering. Never load external
  // scripts or make API, camera, speech, login, or payment requests in this suite.
  if (helper) w.eval(fs.readFileSync(path.join(directory,'assets/muse-hero.js'),'utf8'));
  const entry = fs.existsSync(path.join(directory,'assets/index-navigation-fix-v1.js')) ? 'index-navigation-fix-v1.js' : 'index-CQlsQNY7.js';
  const bundle = fs.readFileSync(path.join(directory,'assets',entry),'utf8').replace(/AIza[A-Za-z0-9_-]+/g,'TEST_UNUSED_KEY');
  w.eval(bundle);
  await sleep(helper ? 750 : 60);
  const expand = Array.from(w.document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === '메뉴 펼치기');
  if (expand) {expand.click();await sleep(35);}
  return {dom,w,doc:w.document,errors};
}
function button(p,label) {
  const found = Array.from(p.doc.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === label || b.textContent.trim() === label);
  assert.ok(found, 'Missing button: '+label); return found;
}
async function click(p,label) {button(p,label).click();await sleep(35);}
async function check(name,fn) {
  try { const detail = await fn();results.push({name,status:'PASS',detail}); }
  catch(error) {results.push({name,status:'FAIL',error:error.message});}
}
const original = path.join(base,'original/muse-version');
const historical = path.join(base,'recovery/v1-1-before-crash');
const fixed = path.join(base,'fixed/muse-version');

(async()=>{
  await check('current helper misses React render and produces no scan hero',async()=>{
    const p=await page(original,true);
    try {assert.ok(p.doc.querySelector('.search-wrap'));assert.equal(p.doc.querySelectorAll('.muse-scan-hero').length,0);return {heroCount:0,rootPresent:true};}
    finally {p.dom.window.close();}
  });
  for (const menu of ['기록','식탁']) await check('historical scan version fails at '+menu,async()=>{
    const p=await page(historical,true);
    try {
      assert.ok(p.doc.querySelector('.muse-scan-hero'),'Historical hero must render before navigation');
      await click(p,menu);await sleep(100);
      assert.ok(p.errors.some(e=>/NotFoundError|not a child|node to be removed/i.test(e.name+' '+e.message)),JSON.stringify(p.errors));
      return {errors:p.errors,rootEmpty:!p.doc.getElementById('root').textContent.trim()};
    } finally {p.dom.window.close();}
  });
  await check('historical dashboard action leaves the removed dashboard missing',async()=>{
    const p=await page(historical,true);
    try {await click(p,'대시보드 바로가기');assert.ok(p.doc.getElementById('root').textContent.trim());assert.equal(p.doc.querySelectorAll('.rings-core').length,0);return {dashboardCount:0,rootPresent:true,directWhiteScreenReproduced:false};}
    finally {p.dom.window.close();}
  });
  await check('fixed React renders the scan hero and search controls',async()=>{
    const p=await page(fixed);
    try {assert.ok(p.doc.querySelector('#root .muse-scan-hero'));assert.ok(p.doc.querySelector('.muse-finder'));button(p,'🖼️ 사진 선택');button(p,'음성 검색');assert.equal(p.doc.querySelectorAll('.rings-core').length,0);return {heroInsideReact:true,homeDashboardCount:0};}
    finally {p.dom.window.close();}
  });
  await check('fixed menus retain the React root through 40 navigation cycles',async()=>{
    const p=await page(fixed);
    try {
      for(let i=0;i<40;i++) {
        await click(p,'기록');assert.ok(p.doc.getElementById('root').textContent.trim());
        await click(p,'대시보드 바로가기');assert.ok(p.doc.querySelector('.muse-dashboard .rings-core'));
        await click(p,'홈');assert.ok(p.doc.querySelector('.muse-scan-hero'));assert.equal(p.doc.querySelectorAll('.rings-core').length,0);
        await click(p,'식탁');assert.ok(p.doc.getElementById('root').textContent.trim());
        await click(p,'홈');
      }
      assert.deepEqual(p.errors,[]);return {cycles:40,menuClicks:200,errors:0};
    } finally {p.dom.window.close();}
  });
  await check('fixed scan and nutritionist modals open and close with actual React',async()=>{
    const p=await page(fixed);
    try {
      await click(p,'사진으로 검색');assert.ok(p.doc.querySelector('.sheet'));await click(p,'닫기');assert.equal(p.doc.querySelectorAll('.sheet').length,0);
      await click(p,'🖼️ 사진 선택');assert.ok(p.doc.querySelector('.sheet'));await click(p,'닫기');
      await click(p,'AI 영양사');assert.ok(p.doc.querySelector('.sheet'));await click(p,'닫기');assert.equal(p.doc.querySelectorAll('.sheet').length,0);
      assert.deepEqual(p.errors,[]);return {modalOpens:3,modalCloses:3,errors:0};
    } finally {p.dom.window.close();}
  });
  for (const hasKey of [false,true]) await check('camera and gallery use separate inputs '+(hasKey?'with key':'without key'),async()=>{
    const p=await page(fixed,false,hasKey?{'nutrilens.profile':JSON.stringify({geminiKey:'TEST_ONLY_NOT_A_KEY'})}:{});
    try {
      await click(p,'사진으로 검색');
      const camera=p.doc.querySelector('input[data-photo-source="camera"]');
      const gallery=p.doc.querySelector('input[data-photo-source="gallery"]');
      assert.ok(camera);assert.ok(gallery);assert.notEqual(camera,gallery);
      assert.equal(camera.getAttribute('capture'),'environment');assert.equal(gallery.hasAttribute('capture'),false);
      assert.equal(camera.accept,'image/*');assert.equal(gallery.accept,'image/*');
      const opened=[];
      camera.addEventListener('click',e=>{opened.push('camera');e.preventDefault();});
      gallery.addEventListener('click',e=>{opened.push('gallery');e.preventDefault();});
      await click(p,'사진 찍기');assert.deepEqual(opened,['camera']);
      await click(p,'사진 선택');assert.deepEqual(opened,['camera','gallery']);
      await click(p,'닫기');await click(p,'기록');await click(p,'대시보드 바로가기');
      assert.deepEqual(p.errors,[]);
      return {cameraInput:'capture=environment',galleryInput:'no capture',separateClickTargets:true,phoneHardware:'unverified'};
    } finally {p.dom.window.close();}
  });
  await check('fixed collapsed hero survives leaving and returning home',async()=>{
    const p=await page(fixed);
    try {await click(p,'접기');assert.ok(p.doc.querySelector('.muse-scan-hero.collapsed'));await click(p,'기록');await click(p,'홈');assert.ok(p.doc.querySelector('.muse-scan-hero.collapsed'));await click(p,'펼치기');assert.ok(!p.doc.querySelector('.muse-scan-hero.collapsed'));assert.deepEqual(p.errors,[]);return {statePreserved:true};}
    finally {p.dom.window.close();}
  });
  await check('ingredients start collapsed with a clear invitation and remember the user choice',async()=>{
    const p=await page(fixed);
    try {
      assert.equal(p.doc.querySelector('.muse-market-content').hidden,true);
      assert.ok(button(p,'식품 목록 펼치기').textContent.includes('눌러서 펼치기'));
      await click(p,'식품 목록 펼치기');assert.equal(p.doc.querySelector('.muse-market-content').hidden,false);
      assert.equal(button(p,'식품 목록 접기').textContent.trim(),'▴');
      assert.equal(p.w.localStorage.getItem('muse-food-collapsed'),'0');
      await click(p,'기록');await click(p,'홈');assert.equal(p.doc.querySelector('.muse-market-content').hidden,false);
      await click(p,'식품 목록 접기');assert.equal(p.doc.querySelector('.muse-market-content').hidden,true);
      assert.equal(p.w.localStorage.getItem('muse-food-collapsed'),'1');assert.deepEqual(p.errors,[]);
      const returning=await page(fixed,false,{'muse-food-collapsed':'0'});
      try {assert.equal(returning.doc.querySelector('.muse-market-content').hidden,false);} finally {returning.dom.window.close();}
      return {firstVisitCollapsed:true,visibleInvitation:true,previousOpenChoicePreserved:true};
    } finally {p.dom.window.close();}
  });
  await check('fixed malformed records preserve the exact original and keep menus working',async()=>{
    const raw=JSON.stringify([{id:'history-broken',ts:Date.now(),meal:1,items:null,totals:null}]);
    const p=await page(fixed,false,{'nutrilens.history':raw});
    try {await click(p,'기록');await click(p,'대시보드 바로가기');await click(p,'AI 영양사');await click(p,'닫기');assert.equal(p.w.localStorage.getItem('nutrilens.history.recovery.v1'),raw);assert.deepEqual(p.errors,[]);return {originalPreserved:true,errors:0};}
    finally {p.dom.window.close();}
  });

  await check('v122 font migration, four levels, save and reload persistence',async()=>{
    const p=await page(fixed,false,{'nutrilens.profile':JSON.stringify({fontScale:1,allergies:['새우'],geminiKey:'TEST_ONLY_NOT_A_KEY'})});
    try {
      assert.equal(p.doc.documentElement.dataset.fontLevel,'2');
      let stored=JSON.parse(p.w.localStorage.getItem('nutrilens.profile'));assert.equal(stored.fontScale,1.25);assert.equal(stored.geminiKey,'TEST_ONLY_NOT_A_KEY');assert.deepEqual(stored.allergies,['새우']);
      for(const [label,scale,level] of [['1작게',1.05,'1'],['2중간',1.25,'2'],['3크게',1.5,'3'],['4아주 크게',1.75,'4']]){
        p.doc.querySelector('.diet-badge').click();await sleep(35);await click(p,label);await click(p,'저장하기');
        assert.equal(p.doc.documentElement.style.getPropertyValue('--font-scale'),String(scale));assert.equal(p.doc.documentElement.dataset.fontLevel,level);
      }
      const q=await page(fixed,false,{'nutrilens.profile':p.w.localStorage.getItem('nutrilens.profile')});try{assert.equal(q.doc.documentElement.dataset.fontLevel,'4');}finally{q.dom.window.close();}
      assert.deepEqual(p.errors,[]);return {levels:4,migrated:true,profilePreserved:true,reloadLevel:4};
    }finally{p.dom.window.close();}
  });
  await check('v122 clear confirms, cancels, preserves history and can undo after adding food',async()=>{
    const initial=[{uid:'qa-egg',foodId:'egg',qty:2,meal:1},{uid:'qa-egg-2',foodId:'egg',qty:1,meal:2}];
    const history=[{id:'qa-history',ts:1,meal:1,items:[],totals:{kcal:0,carbs:0,fiber:0,netCarbs:0,protein:0,fat:0,grams:0}}];
    const p=await page(fixed,false,{'nutrilens.table':JSON.stringify(initial),'nutrilens.history':JSON.stringify(history)});
    try{
      await click(p,'식탁');await click(p,'전체 비우기');assert.ok(p.doc.querySelector('[role="dialog"]'));await click(p,'취소');assert.deepEqual(JSON.parse(p.w.localStorage.getItem('nutrilens.table')),initial);
      await click(p,'전체 비우기');await click(p,'비우기');assert.deepEqual(JSON.parse(p.w.localStorage.getItem('nutrilens.table')),[]);assert.deepEqual(JSON.parse(p.w.localStorage.getItem('nutrilens.history')),history);
      await click(p,'되돌리기');assert.deepEqual(JSON.parse(p.w.localStorage.getItem('nutrilens.table')),initial);
      await click(p,'전체 비우기');await click(p,'비우기');await click(p,'식재료 고르기');assert.equal(p.doc.querySelector('.muse-market-content').hidden,false);
      p.doc.querySelector('.food-card').click();await sleep(35);const add=p.doc.querySelector('.add-cta');assert.ok(add);add.click();await sleep(35);await click(p,'되돌리기');
      const restored=JSON.parse(p.w.localStorage.getItem('nutrilens.table'));assert.equal(restored.reduce((n,x)=>n+x.qty,0),4);assert.deepEqual(JSON.parse(p.w.localStorage.getItem('nutrilens.history')),history);
      assert.deepEqual(p.errors,[]);return{cancelPreserves:true,clearPreservesHistory:true,undoMergesNewFood:true};
    }finally{p.dom.window.close();}
  });
  await check('v122 selected dashboard, settings grouping and empty actions',async()=>{
    const p=await page(fixed);
    try{
      await click(p,'대시보드 바로가기');assert.equal(button(p,'대시보드 바로가기').getAttribute('aria-current'),'page');assert.ok(button(p,'대시보드 바로가기').classList.contains('on'));
      await click(p,'식탁');button(p,'식재료 고르기');await click(p,'기록');await click(p,'식탁 보기');assert.ok(p.doc.querySelector('.section-title').textContent.includes('식탁'));
      p.doc.querySelector('.diet-badge').click();await sleep(35);assert.equal(p.doc.querySelectorAll('.kloca-settings-group').length,3);assert.equal(p.doc.querySelectorAll('.kloca-settings-group[open]').length,0);assert.ok(p.doc.querySelector('.kloca-settings-save'));await click(p,'닫기');assert.deepEqual(p.errors,[]);
      return {selectedDashboard:true,groupedSettings:true,emptyActions:true};
    }finally{p.dom.window.close();}
  });
  await check('v123 compact header uses ten distinct icons and persists each diet',async()=>{
    const p=await page(fixed);
    try{
      assert.ok(p.doc.querySelector('.logo-mark .kloca-logo-svg'));assert.equal(p.doc.querySelectorAll('.muse-handle').length,0);
      const shapes=new Set();
      for(const [id,name] of Object.entries({standard:'표준 균형식',keto:'케토제닉',lchf:'저탄고지',lowcarb:'저탄수화물',highprotein:'고단백',pescatarian:'페스코테리언',diabetic:'혈당 관리식',mediterranean:'지중해식',vegan:'비건',paleo:'팔레오'})){
        p.doc.querySelector('.diet-badge').click();await sleep(35);
        const opt=Array.from(p.doc.querySelectorAll('.diet-opt')).find(x=>x.textContent.includes(name));assert.ok(opt);opt.click();await sleep(35);await click(p,'저장하기');
        assert.equal(JSON.parse(p.w.localStorage.getItem('nutrilens.profile')).dietType,id);shapes.add(p.doc.querySelector('.kloca-diet-button svg').innerHTML);
      }
      assert.equal(shapes.size,10);assert.deepEqual(p.errors,[]);return {distinctIcons:10,dietSave:true,vectorLogo:true};
    }finally{p.dom.window.close();}
  });
  await check('v123 table order groups macros and preserves quantity and meal edits',async()=>{
    const p=await page(fixed,false,{'nutrilens.table':JSON.stringify([{uid:'qa-egg',foodId:'egg',qty:2,meal:1}])});
    try{
      await click(p,'식탁');const controls=p.doc.querySelector('.kloca-table-controls');
      assert.ok(controls.children[0].matches('.status-pill'));assert.ok(controls.children[1].matches('.meal-select'));assert.ok(controls.children[2].matches('.titem-ctrl'));
      assert.equal(p.doc.querySelectorAll('.kloca-macro-group .chip').length,3);
      await click(p,'수량 늘리기');assert.equal(JSON.parse(p.w.localStorage.getItem('nutrilens.table'))[0].qty,3);
      const select=p.doc.querySelector('.meal-select');select.value='2';select.dispatchEvent(new p.w.Event('change',{bubbles:true}));await sleep(35);assert.equal(JSON.parse(p.w.localStorage.getItem('nutrilens.table'))[0].meal,2);
      assert.deepEqual(p.errors,[]);return {order:'fit,meal,quantity,delete',macroGroup:3,editsPersist:true};
    }finally{p.dom.window.close();}
  });
  await check('v123 recipe title occupies a full row with its exact full name',async()=>{
    const p=await page(fixed);
    try{
      await click(p,'식품 목록 펼치기');p.doc.querySelector('.food-card').click();await sleep(35);
      const recipe=p.doc.querySelector('.recipe-main');assert.ok(recipe);const name=recipe.querySelector('.recipe-name').textContent;
      recipe.click();await sleep(35);assert.equal(p.doc.querySelector('.kloca-sheet-full-heading .sheet-title').textContent,name);
      assert.deepEqual(p.errors,[]);return {fullTitle:name,separateHeaderRow:true};
    }finally{p.dom.window.close();}
  });
  await check('v123 scan confirmation adds selected foods once and closes every modal',async()=>{
    const p=await page(fixed,false,{'nutrilens.profile':JSON.stringify({geminiKey:'TEST_ONLY_NOT_A_KEY'})},[{foodId:'egg',qty:2,confidence:.9},{foodId:'avocado',qty:1,confidence:.6}]);
    try{
      await click(p,'사진으로 검색');const input=p.doc.querySelector('input[data-photo-source="gallery"]');
      Object.defineProperty(input,'files',{configurable:true,value:[new p.w.File(['test-only-photo'],'test.png',{type:'image/png'})]});input.dispatchEvent(new p.w.Event('change',{bubbles:true}));await sleep(150);
      const low=p.doc.querySelector('[aria-label="아보카도 선택"]');assert.ok(low);assert.equal(low.checked,false);low.click();await sleep(35);
      p.doc.querySelector('.kloca-scan-confirm').click();await sleep(35);assert.equal(p.doc.querySelectorAll('.sheet').length,0);
      const table=JSON.parse(p.w.localStorage.getItem('nutrilens.table'));assert.equal(table.length,2);assert.equal(table.find(x=>x.foodId==='egg').qty,2);assert.equal(table.find(x=>x.foodId==='avocado').qty,1);
      assert.deepEqual(p.errors,[]);return {externalVision:'mocked,no paid call',lowConfidenceRequiresSelection:true,confirmedItems:2,allModalsClosed:true};
    }finally{p.dom.window.close();}
  });
  const output={environment:'JSDOM 30.1.2 + actual bundled React and React DOM; no mocked hooks, renderer or error boundaries',browserLayout:'unverified',results,passed:results.filter(r=>r.status==='PASS').length,total:results.length};
  fs.mkdirSync(path.join(base,'recovery/qa'),{recursive:true});
  fs.writeFileSync(path.join(base,'recovery/qa/react-dom-results.json'),JSON.stringify(output,null,2));
  console.log(JSON.stringify(output,null,2));
  if(output.passed!==output.total)process.exitCode=1;
})();
