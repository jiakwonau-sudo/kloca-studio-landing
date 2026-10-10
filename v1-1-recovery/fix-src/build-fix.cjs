const fs = require('fs'), path = require('path'), crypto = require('crypto');
const runtime = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if (!runtime) throw new Error('Set CODEX_PRIMARY_RUNTIME_NODE_MODULES to the provided runtime dependencies.');
const { babelParse } = require(path.join(runtime, 'playwright/lib/transform/babelBundle.js'));
const base = path.resolve(__dirname, '..');
const source = path.resolve(process.argv[2] || path.join(base, 'original/muse-version'));
const target = path.join(base, 'fixed/muse-version');
const original = fs.readFileSync(path.join(source, 'assets/index-CQlsQNY7.js'), 'utf8');
const expected = '05669073c718d55fdd0548198d9834545fe879cc';
const bytes = Buffer.from(original);
const blob = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
if (blob !== expected) throw new Error('Input is a different app version; refusing to patch unknown code.');
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
  const full = original.slice(conditional.consequent.start, conditional.consequent.end);
  code = code.slice(0, conditional.start-node.start) + full + code.slice(conditional.end-node.start);
  code = exact(code, 'i=(0,_.useRef)(null),', 'i=(0,_.useRef)(null),h=(0,_.useRef)(null),');
  code = exact(code, 'u(URL.createObjectURL(t)),o(!0);', 'u(URL.createObjectURL(t));if(!d){c(null);r(`사진 인식은 설정에서 Gemini 키를 등록한 뒤 사용할 수 있어요`,`warn`);return}o(!0);');
  code = exact(code,
    '(0,j.jsx)(`input`,{ref:i,type:`file`,accept:`image/*`,capture:`environment`,hidden:!0,onChange:e=>{let t=e.target.files?.[0];t&&f(t)}})',
    '(0,j.jsx)(`input`,{ref:i,type:`file`,accept:`image/*`,capture:`environment`,hidden:!0,"data-photo-source":`camera`,onChange:e=>{let t=e.target.files?.[0];e.target.value=``;t&&f(t)}}),(0,j.jsx)(`input`,{ref:h,type:`file`,accept:`image/*`,hidden:!0,"data-photo-source":`gallery`,onChange:e=>{let t=e.target.files?.[0];e.target.value=``;t&&f(t)}})');
  code = exact(code,
    '(0,j.jsxs)(`button`,{className:`cta`,onClick:()=>i.current?.click(),disabled:a,children:[a?`Gemini 분석 중…`:l?`다른 사진 선택`:`사진 찍기 / 선택`,(0,j.jsx)(`span`,{className:`cta-orb`,children:(0,j.jsx)(qe,{size:16})})]})',
    '(0,j.jsxs)(`div`,{className:`scan-source-actions`,children:[(0,j.jsx)(`button`,{type:`button`,className:`cta`,onClick:()=>i.current?.click(),disabled:a,children:`사진 찍기`}),(0,j.jsx)(`button`,{type:`button`,className:`cta ghost`,onClick:()=>h.current?.click(),disabled:a,children:`사진 선택`})]}),a&&(0,j.jsx)(`p`,{role:`status`,children:`Gemini 분석 중…`}),!d&&(0,j.jsxs)(`div`,{className:`scan-key-notice`,children:[(0,j.jsx)(`p`,{children:`사진 인식에는 Gemini 키가 필요해요. 선택한 사진은 인식 전에 미리 볼 수 있어요.`}),(0,j.jsx)(`button`,{type:`button`,className:`cta ghost`,onClick:()=>t({type:`push`,modal:{type:`settings`}}),children:`설정에서 키 등록하기`})]})');
  return code;
});
rewrite('Tr', code => exact(code, 't({type:`setTab`,tab:`home`}),t({type:`setDash`,open:!0})', 't({type:`closeAll`}),t({type:`setTab`,tab:`dashboard`}),t({type:`setDash`,open:!0})'));
rewrite('Er', code => {
  code = exact(code, 'className:`frame`', 'className:`frame kloca-muse ${e.tab===`home`?`muse-home`:``}`');
  code = exact(code, 'className:`logo-mark`,children:(0,j.jsx)(Kn,{size:26})', 'className:`logo-mark`,children:(0,j.jsxs)(j.Fragment,{children:[(0,j.jsx)(Kn,{size:26}),(0,j.jsx)(`span`,{className:`muse-handle`,"aria-hidden":!0})]})');
  code = exact(code, 'e.tab===`home`&&(0,j.jsx)(It,{}),e.tab===`table`&&(0,j.jsx)(Rt,{}),e.tab===`history`&&(0,j.jsx)(Wt,{})', '(0,j.jsx)(KlocaMainView,{})');
  return exact(code, '(0,j.jsx)(dr,{payResult:i})', '(0,j.jsx)(KlocaViewBoundary,{onRecover:()=>t({type:`closeAll`}),recoveryLabel:`닫기`,children:(0,j.jsx)(dr,{payResult:i})},`modal:${JSON.stringify(e.modalStack)}`)');
});
let code = original;
for (const edit of edits.sort((a,b)=>b.start-a.start)) code = code.slice(0,edit.start)+edit.text+code.slice(edit.end);
// Empty only the built-in default. Existing user-entered keys stay in their profile.
code = code.replace(/geminiKey:"AIza[^"\n]+"/, 'geminiKey:""');
code = code.replace(/localStorage\.getItem\(/g, 'KlocaStorageGet(').replace(/localStorage\.setItem\(/g, 'KlocaStorageSet(');
const rootCall = ast.program.body.at(-1);
const rootMarker = original.slice(rootCall.start);
code = exact(code, rootMarker, fs.readFileSync(path.join(__dirname,'navigation-fix.js'),'utf8') + '\n' + rootMarker);
babelParse(code, 'app.js', true);
fs.mkdirSync(path.join(target,'assets'), { recursive: true });
for (const name of ['index-CQXCXyQ1.css','reskin.css','logo-lens.webp']) fs.copyFileSync(path.join(source,'assets',name),path.join(target,'assets',name));
fs.writeFileSync(path.join(target,'assets/index-navigation-fix-v1.js'),code);
let html = fs.readFileSync(path.join(source,'index.html'),'utf8');
html = html.replace(/<title>[^<]*<\/title>/, '<title>KLoCa Lens v1-2</title>\n    <meta name="application-version" content="1-2" />');
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
.muse-section-toggle { display:block; margin:.6rem 0; padding:.4rem 0; background:none; border:0; color:var(--ink-2); font:inherit; cursor:pointer; }
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
fs.writeFileSync(path.join(target,'assets/muse.css'),css);
console.log(JSON.stringify({ target, sourceGitBlob:blob, files:fs.readdirSync(path.join(target,'assets')), browserVerification:'pending' }));
