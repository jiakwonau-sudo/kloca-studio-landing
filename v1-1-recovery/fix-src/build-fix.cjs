const fs = require('fs'), path = require('path'), crypto = require('crypto');
const runtime = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
let babelParse;
try {
  const { parse } = require('@babel/parser');
  babelParse = code => parse(code, { sourceType: 'module' });
} catch (error) {
  if (!runtime) throw new Error('Run npm ci before building.');
  ({ babelParse } = require(path.join(runtime, 'playwright/lib/transform/babelBundle.js')));
}
const base = path.resolve(__dirname, '..');
const source = path.resolve(process.argv[2] || path.join(base, 'original/muse-version'));
const target = path.join(base, 'fixed/muse-version');
const original = fs.readFileSync(path.join(source, 'assets/index-CQlsQNY7.js'), 'utf8');
const expected = '05669073c718d55fdd0548198d9834545fe879cc';
const bytes = Buffer.from(original);
const blob = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
if (![expected, '8687c8a15c655b1dd66e279721354df534003c00'].includes(blob)) throw new Error('Input is a different app version; refusing to patch unknown code.');
const ast = babelParse(original, 'app.js', true);
const edits = [];
function exact(code, before, after) {
  if (code.split(before).length !== 2) throw new Error('Expected one match: ' + before.slice(0, 90));
  return code.replace(before, after);
}
function rewrite(name, transform) {
  const node = ast.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === name);
  if (!node) throw new Error('Missing function: ' + name);
  edits.push({ start: node.start, end: node.end, text: transform(original.slice(node.start, node.end), node) });
}
rewrite('Be', () => 'function Be(e,t){return KlocaReadProfile(e,t)}');
rewrite('Ve', () => 'function Ve(e){return KlocaReadArray(e)}');
rewrite('Ge', code => code.replace(/localStorage\.setItem\(/g, 'KlocaSave('));
rewrite('Qt', code => exact(code, 'for(let t of Zt)', 'for(let t of KlocaBackupKeys())'));
rewrite('It', (code, node) => {
  const children = node.body.body.at(-1).argument.arguments[1].properties.find(prop => prop.key.name === 'children').value.elements;
  const dashboard = children[1], market = children[2];
  const marketCode = original.slice(market.start, market.end);
  const changes = [
    { start: dashboard.start-node.start, end: dashboard.end-node.start, text: 'null' },
    { start: market.start-node.start, end: market.end-node.start, text: `(0,j.jsx)(KlocaMarketSection,{children:${marketCode}})` }
  ];
  for (const change of changes.sort((a,b)=>b.start-a.start)) code = code.slice(0,change.start)+change.text+code.slice(change.end);
  return exact(code, 'children:[(0,j.jsx)(Pt,{})', 'children:[(0,j.jsx)(KlocaMuseHero,{}),(0,j.jsx)(Pt,{})');
});
rewrite('Pt', code => {
  code = exact(code, 'className:`search-shell`,children:[', 'className:`search-shell`,children:[(0,j.jsx)(KlocaPhotoButton,{}),(0,j.jsx)(KlocaVoiceButton,{onText:e=>{a(e),s(null)}}),');
  return exact(code, 'enterKeyHint:`search`', 'enterKeyHint:`search`,onKeyDown:e=>{if(e.key===`Enter`){e.preventDefault();e.currentTarget.blur()}}');
});
rewrite('dn', (code, node) => {
  // Keep the existing preview, recognition and confirmation flow. The two
  // controls must use different native inputs, with capture only on the camera.
  const modal = node.body.body.at(-1).argument.arguments[1];
  const conditional = modal.properties.find(p => p.key.name === 'children').value;
  let full = original.slice(conditional.consequent.start, conditional.consequent.end);
  function findResults(node){ if(!node||typeof node!=='object')return null; if(node.type==='LogicalExpression'&&original.slice(node.start,node.start+21).startsWith('s&&s.length>0&&'))return node; for(const value of Object.values(node)){for(const child of Array.isArray(value)?value:[value]){let found=findResults(child);if(found)return found}}return null; }
  const resultsNode=findResults(conditional.consequent);
  if(!resultsNode)throw new Error('Missing recognition results');
  const resultsStart=resultsNode.start-conditional.consequent.start,resultsEnd=resultsNode.end-conditional.consequent.start;
  full=full.slice(0,resultsStart)+'s&&s.length>0&&(0,j.jsx)(KlocaScanResults,{items:s})'+full.slice(resultsEnd);
  code = code.slice(0, conditional.start-node.start) + full + code.slice(conditional.end-node.start);
  code = exact(code, 'i=(0,_.useRef)(null),', 'i=(0,_.useRef)(null),h=(0,_.useRef)(null),');
  code = exact(code, 'u(URL.createObjectURL(t)),o(!0);', 'u(URL.createObjectURL(t));if(!d){c(null);r(`사진 인식은 설정에서 Gemini 키를 등록한 뒤 사용할 수 있어요`,`warn`);return}o(!0);');
  code = exact(code,
    '(0,j.jsx)(`input`,{ref:i,type:`file`,accept:`image/*`,capture:`environment`,hidden:!0,onChange:e=>{let t=e.target.files?.[0];t&&f(t)}})',
    '(0,j.jsx)(`input`,{ref:i,type:`file`,accept:`image/*`,capture:`environment`,hidden:!0,"data-photo-source":`camera`,onChange:e=>{let t=e.target.files?.[0];e.target.value=``;t&&f(t)}}),(0,j.jsx)(`input`,{ref:h,type:`file`,accept:`image/*`,hidden:!0,"data-photo-source":`gallery`,onChange:e=>{let t=e.target.files?.[0];e.target.value=``;t&&f(t)}})');
  code = exact(code,
    '(0,j.jsxs)(`button`,{className:`cta`,onClick:()=>i.current?.click(),disabled:a,children:[a?`Gemini 분석 중…`:l?`다른 사진 선택`:`사진 찍기 / 선택`,(0,j.jsx)(`span`,{className:`cta-orb`,children:(0,j.jsx)(qe,{size:16})})]})',
    '(0,j.jsxs)(`div`,{className:`scan-source-actions`,children:[(0,j.jsx)(`button`,{type:`button`,className:`cta`,onClick:()=>i.current?.click(),disabled:a,children:`사진 찍기`}),(0,j.jsx)(`button`,{type:`button`,className:`cta ghost`,onClick:()=>h.current?.click(),disabled:a,children:`사진 선택`})]}),a&&(0,j.jsx)(`p`,{role:`status`,children:`Gemini 분석 중…`}),!d&&(0,j.jsxs)(`div`,{className:`scan-key-notice`,children:[(0,j.jsx)(`p`,{children:`사진 인식에는 Gemini 키가 필요해요. 선택한 사진은 인식 전에 미리 볼 수 있어요.`}),(0,j.jsx)(`button`,{type:`button`,className:`cta ghost`,onClick:()=>t({type:`push`,modal:{type:`settings`}}),children:`설정에서 키 등록하기`})]})');
  code = exact(code, '};return(0,j.jsx)(Gt', '};(0,_.useEffect)(()=>{let source=e.modalStack[e.modalStack.length-1]?.source;if(source===`camera`)i.current?.click();if(source===`gallery`)h.current?.click()},[]);return(0,j.jsx)(Gt');
  return code;
});
rewrite('Tr', code => {
 code=exact(code,'t({type:`setTab`,tab:`home`}),t({type:`setDash`,open:!0})','t({type:`closeAll`}),t({type:`setTab`,tab:`dashboard`}),t({type:`setDash`,open:!0})');
 code=code.replaceAll('window.innerWidth','document.documentElement.clientWidth');
 code=exact(code,'},[a]);let f=', '},[a,e.profile.fontScale]);let f=');
 code=exact(code,'localStorage.getItem(br)!==`0`','localStorage.getItem(br)===`1`');
 code=exact(code,'className:`fnav-btn ${e.tab===n.key?`on`:``}`','className:`fnav-btn ${e.tab===n.key?`on`:``}`,"aria-current":e.tab===n.key?`page`:void 0');
 code=exact(code,'className:`fnav-btn`,onClick:h(','className:`fnav-btn ${e.tab===`dashboard`?`on`:``}`,"aria-current":e.tab===`dashboard`?`page`:void 0,onClick:h(');
 return code;
});
rewrite('Er', code => {
  code = exact(code, 'className:`frame`', 'className:`frame kloca-muse ${e.tab===`home`?`muse-home`:``}`');
  code = exact(code, 'className:`logo-mark`,children:(0,j.jsx)(Kn,{size:26})', 'className:`logo-mark`,children:(0,j.jsx)(KlocaLogoMark,{})');
  code = exact(code, '(0,j.jsxs)(`button`,{className:`diet-badge`,onClick:()=>t({type:`push`,modal:{type:`settings`}}),children:[(0,j.jsxs)(`span`,{className:`dname`,children:[r.emoji,` `,r.nameKo]}),(0,j.jsx)(`span`,{className:`chev`,children:`▾`})]})', '(0,j.jsx)(KlocaDietButton,{})');
  code = exact(code, 'e.tab===`home`&&(0,j.jsx)(It,{}),e.tab===`table`&&(0,j.jsx)(Rt,{}),e.tab===`history`&&(0,j.jsx)(Wt,{})', '(0,j.jsx)(KlocaMainView,{})');
  return exact(code, '(0,j.jsx)(dr,{payResult:i})', '(0,j.jsx)(KlocaViewBoundary,{onRecover:()=>t({type:`closeAll`}),recoveryLabel:`닫기`,children:(0,j.jsx)(dr,{payResult:i})},`modal:${JSON.stringify(e.modalStack)}`)');
});

rewrite('Ge', code => {
 // Replace the earlier Ge rewrite once, rather than adding overlapping edits.
 return code;
});
edits.pop();
const geEdit=edits.find(edit=>original.slice(edit.start,edit.start+12).startsWith('function Ge('));
geEdit.text=exact(geEdit.text,'document.documentElement.style.setProperty(`--font-scale`,String(t.profile.fontScale))','document.documentElement.style.setProperty(`--font-scale`,String(t.profile.fontScale));document.documentElement.dataset.fontLevel=String(t.profile.fontScale>=1.75?4:t.profile.fontScale>=1.5?3:t.profile.fontScale>=1.25?2:1)');
rewrite('ze',code=>exact(code,'case`clearUndo`:','case`clearTable`:return{...e,table:[],undo:null,clearUndo:e.table};case`restoreTable`:{let items=[...e.table];for(let old of e.clearUndo??[]){let found=items.find(x=>x.foodId===old.foodId&&x.meal===old.meal);if(found)items=items.map(x=>x.uid===found.uid?{...x,qty:Number((x.qty+old.qty).toFixed(2))}:x);else items.push(old)}return{...e,table:items,clearUndo:null}}case`clearUndo`:'));
rewrite('Rt',(code,node)=>{
 function collect(n,out=[]){if(!n||typeof n!=='object')return out;if(n.type==='CallExpression'&&n.arguments?.[1]?.type==='ObjectExpression'){const p=n.arguments[1].properties.find(p=>p.key?.name==='className');if(p?.value?.type==='TemplateLiteral'&&p.value.quasis[0].value.raw==='titem')out.push(n)}for(const value of Object.values(n))for(const child of Array.isArray(value)?value:[value])collect(child,out);return out}
 const card=collect(node)[0];if(!card)throw new Error('Missing table card');
 const cardArgs=card.arguments[1].properties.find(p=>p.key.name==='children').value.elements;
 const top=cardArgs[0].arguments[1].properties.find(p=>p.key.name==='children').value.elements;
 const macros=cardArgs[1].arguments[1].properties.find(p=>p.key.name==='children').value.elements;
 const slice=n=>original.slice(n.start,n.end);
 const cardChildren='['+slice(cardArgs[0]).replace(','+slice(top[2]),'')+',(0,j.jsxs)(`div`,{className:`kloca-table-controls`,children:['+slice(macros[0])+','+slice(macros[5])+','+slice(top[2])+']}),(0,j.jsxs)(`div`,{className:`titem-macros kloca-table-nutrition`,children:['+slice(macros[1])+',(0,j.jsxs)(`div`,{className:`kloca-macro-group`,"aria-label":`탄수화물 단백질 지방`,children:['+macros.slice(2,5).map(slice).join(',')+']})]})]';
 const arr=card.arguments[1].properties.find(p=>p.key.name==='children').value;
 code=code.slice(0,arr.start-node.start)+cardChildren+code.slice(arr.end-node.start);
 code=exact(code,'`여기서 끼니별로 정리할 수 있어요.`]})]})','`여기서 끼니별로 정리할 수 있어요.`]}),(0,j.jsx)(KlocaEmptyAction,{tab:`home`,label:`식재료 고르기`})]})');
 return exact(code,'(0,j.jsx)(`button`,{className:`icon-btn`,onClick:async','(0,j.jsx)(KlocaClearTableButton,{}),(0,j.jsx)(`button`,{className:`icon-btn`,onClick:async');
});
rewrite('Wt',code=>exact(code,'`끼니별로 따로 저장돼요.`]})]})','`끼니별로 따로 저장돼요.`]}),(0,j.jsx)(KlocaEmptyAction,{tab:`table`,label:`식탁 보기`})]})'));
rewrite('an',(code,node)=>{
 const arr=node.body.body.at(-1).argument.arguments[1].properties.find(p=>p.key.name==='children').value;
 const parts=arr.elements.map(n=>original.slice(n.start,n.end));
 const font=parts.findIndex(x=>x.includes('children:`글자 크기`'));
 const advanced=parts.findIndex(x=>x.includes('children:`고급 프로필`'));
 const ai=parts.findIndex(x=>x.includes('children:`AI 연결 (선택)`'));
 const backup=parts.findIndex(x=>x.includes('children:`데이터 백업`'));
 function details(title,group){return '(0,j.jsxs)(`details`,{className:`kloca-settings-group`,children:[(0,j.jsx)(`summary`,{children:'+JSON.stringify(title)+'}),(0,j.jsxs)(`div`,{className:`kloca-settings-content`,children:['+group.join(',')+']})]})'}
 const revised=['(0,j.jsx)(KlocaFontOptions,{value:c,onChange:l})',...parts.slice(0,font),details('고급 프로필',parts.slice(advanced+1,ai)),details('AI 연결',parts.slice(ai+1,backup)),details('백업',parts.slice(backup+1,-2)),'(0,j.jsx)(`div`,{className:`kloca-settings-save`,children:'+parts.at(-1)+'})'];
 code=code.slice(0,arr.start-node.start)+'['+revised.join(',')+']'+code.slice(arr.end-node.start);
 code=exact(code,'className:`d-emoji`,children:e.emoji','className:`d-emoji`,children:(0,j.jsx)(KlocaDietIcon,{dietId:e.id})');
 return exact(code,'profile:{fontScale:c,','profile:{fontScale:c,fontSchema:2,');
});


rewrite('Gt',()=>fs.readFileSync(path.join(__dirname,'sheet.js'),'utf8'));
rewrite('Xt',code=>exact(code,'title:r.name,','title:r.name,fullTitle:!0,'));

let code = original;
for (const edit of edits.sort((a,b)=>b.start-a.start)) code = code.slice(0,edit.start)+edit.text+code.slice(edit.end);
code=exact(code,'fontScale:1,allergies:','fontScale:1.25,fontSchema:2,allergies:');
// Empty only the built-in default. Existing user-entered keys stay in their profile.
code = code.replace(/geminiKey:"AIza[^"\n]+"/, 'geminiKey:""');
code = code.replace(/localStorage\.getItem\(/g, 'KlocaStorageGet(').replace(/localStorage\.setItem\(/g, 'KlocaStorageSet(');
const rootCall = ast.program.body.at(-1);
const rootMarker = original.slice(rootCall.start);
code = exact(code, rootMarker, 'var KlocaDietIcons='+fs.readFileSync(path.join(__dirname,'diet-icons.json'),'utf8')+';\n'+fs.readFileSync(path.join(__dirname,'navigation-fix.js'),'utf8') + '\n' + rootMarker);
babelParse(code, 'app.js', true);
fs.mkdirSync(path.join(target,'assets'), { recursive: true });
for (const name of ['index-CQXCXyQ1.css','reskin.css','logo-lens.webp']) fs.copyFileSync(path.join(source,'assets',name),path.join(target,'assets',name));
fs.writeFileSync(path.join(target,'assets/index-navigation-fix-v1.js'),code);
let html = fs.readFileSync(path.join(source,'index.html'),'utf8');
html = html.replace(/<title>[^<]*<\/title>/, '<title>KLoCa Lens v1.2.3</title>\n    <meta name="application-version" content="1.2.3" />');
html = html.replace('assets/index-CQlsQNY7.js', 'assets/index-navigation-fix-v1.js');
html = html.replace(/<script>\s*\/\* hide the[\s\S]*?<\/script>/, '');
html = html.replace(/\s*<script src="assets\/muse-(?:hero|key)\.js[^<]*<\/script>/g, '');
html = html.replace(/v=1791602018/g, 'v=navigation-fix-v1');
fs.writeFileSync(path.join(target,'index.html'),html);
let css = fs.readFileSync(path.join(source,'assets/muse.css'),'utf8');
css = css.replace(/\/\* home dashboard:[\s\S]*?\/\* home: hide duplicate History button/, '/* home: hide duplicate History button');
css = css.replace(/\.muse-has-hero/g,'.muse-home');
css = css.replace(/\.muse-scan-hero\.collapsed \.muse-finder,[\s\S]*?\n}\n\n/, '.muse-scan-hero.collapsed .muse-finder { display: none; }\n.muse-scan-hero.collapsed { min-height: 2rem; padding: 0.3rem 0; margin-bottom: 0.5rem; }\n\n');
css += `\n/* Navigation fix v1: all these elements are rendered by React. */
.muse-finder { width:100%; font-family:inherit; padding:0; }
.muse-photo-btn, .muse-voice-btn { font-size:1.3rem; padding:.3rem .5rem; cursor:pointer; background:none; border:0; }
.muse-section-toggle { display:flex; align-items:center; justify-content:space-between; gap:.5rem; width:100%; margin:.8rem 0; padding:.85rem 1rem; background:#fff4a4; border:2px solid var(--ink); border-radius:1rem; color:var(--ink); font:inherit; cursor:pointer; box-shadow:2px 3px 0 var(--ink); }
.muse-section-label { font-weight:700; }
.muse-section-hint { font-size:.8rem; opacity:.75; }
.muse-section-toggle[aria-expanded="true"] { width:2.75rem; height:2.75rem; margin:.4rem 0 .25rem auto; padding:0; justify-content:center; background:#b9f1d1; box-shadow:none; }
.muse-market-content[hidden] { display:none !important; }
.muse-market-content > .section > .section-head { display:none; }
.muse-dashboard .section-head { display:flex; align-items:center; justify-content:space-between; gap:.5rem; }
.kloca-recovery { border:2px solid var(--forest); padding:1rem; border-radius:1rem; }
.kloca-recovery .cta { margin-top:.6rem; }
.kloca-data-notice { padding:.8rem; background:var(--surface-warm); border-left:4px solid var(--forest); border-radius:.6rem; font-size:.9rem; }
.scan-source-actions { display:grid; grid-template-columns:1fr 1fr; gap:.65rem; }
.scan-source-actions .cta { width:100%; justify-content:center; }
.scan-key-notice { margin-top:1rem; font-size:.85rem; }
`;
css += fs.readFileSync(path.join(__dirname,'ux-v122.css'),'utf8');
css += fs.readFileSync(path.join(__dirname,'ux-v123.css'),'utf8');
fs.writeFileSync(path.join(target,'assets/muse.css'),css);
console.log(JSON.stringify({ target, sourceGitBlob:blob, files:fs.readdirSync(path.join(target,'assets')), browserVerification:'pending' }));

const dietIcons=JSON.parse(fs.readFileSync(path.join(__dirname,'diet-icons.json'),'utf8'));
for(const [id,icon] of Object.entries(dietIcons)){ const shapes=icon.shapes.map(([tag,props])=>'<'+tag+' '+Object.entries(props).map(([k,v])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+'="'+String(v).replace(/currentColor/g,'#08766b')+'"').join(' ')+' />').join('');fs.writeFileSync(path.join(target,'assets/diet-'+id+'.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none" stroke="#08766b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+shapes+'</svg>');}
