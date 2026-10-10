/* KLoCa Lens navigation repair v1.
 * This module is appended inside the existing app bundle. The original bundle
 * supplies React (_), the JSX runtime (j), the store (M), and the app views.
 * All new UI is owned by React; no helper inserts/removes children of #root.
 */
var KlocaRecovery = [];
var KlocaUnsavedRecovery = new Set();
function KlocaStorageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function KlocaStorageSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
function KlocaSave(key, value) {
  if (!KlocaUnsavedRecovery.has(key)) KlocaStorageSet(key, value);
}
function KlocaPreserve(key, raw) {
  var backup = key + '.recovery.v1';
  var saved = KlocaStorageGet(backup);
  // Keep the first original. If a different malformed value appears later,
  // retain it separately rather than replacing the first recovery copy.
  if (saved !== null && saved !== raw) backup += '.' + Date.now();
  if (!KlocaStorageSet(backup, raw)) KlocaUnsavedRecovery.add(key);
  if (!KlocaRecovery.includes(key)) KlocaRecovery.push(key);
}
function KlocaMacrosValid(value) {
  return value && typeof value === 'object' &&
    ['kcal', 'carbs', 'fiber', 'netCarbs', 'protein', 'fat', 'grams']
      .every(key => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0);
}
function KlocaReadArray(key) {
  var raw = KlocaStorageGet(key);
  if (raw === null) return [];
  var value;
  try { value = JSON.parse(raw); } catch { KlocaPreserve(key, raw); return []; }
  if (!Array.isArray(value)) { KlocaPreserve(key, raw); return []; }
  var valid = value.filter(entry => {
    if (!entry || typeof entry !== 'object') return false;
    if (key === 'nutrilens.table') return typeof entry.uid === 'string' &&
      !!O[entry.foodId] && typeof entry.qty === 'number' && Number.isFinite(entry.qty) && entry.qty > 0 &&
      Number.isInteger(entry.meal) && entry.meal >= 1 && entry.meal <= 4;
    if (key === 'nutrilens.history') return typeof entry.id === 'string' &&
      typeof entry.ts === 'number' && Number.isFinite(entry.ts) &&
      Number.isInteger(entry.meal) && entry.meal >= 1 && entry.meal <= 4 &&
      Array.isArray(entry.items) && KlocaMacrosValid(entry.totals) &&
      entry.items.every(item => item && typeof item.name === 'string' &&
        typeof item.qty === 'number' && Number.isFinite(item.qty) && item.qty > 0 && KlocaMacrosValid(item.macros));
    return true;
  });
  if (valid.length !== value.length) KlocaPreserve(key, raw);
  return valid;
}
function KlocaReadProfile(key, defaults) {
  var raw = KlocaStorageGet(key);
  if (raw === null) return defaults;
  var value;
  try { value = JSON.parse(raw); } catch { KlocaPreserve(key, raw); return defaults; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    KlocaPreserve(key, raw); return defaults;
  }
  var profile = { ...defaults, ...value };
  var changed = false;
  if (!Object.prototype.hasOwnProperty.call(b, profile.dietType)) {
    profile.dietType = defaults.dietType; changed = true;
  }
  var targetDefaults = b[profile.dietType].targets;
  var supplied = profile.targets;
  profile.targets = { ...targetDefaults };
  for (var target of Object.keys(targetDefaults)) {
    if (supplied && typeof supplied[target] === 'number' && Number.isFinite(supplied[target]) &&
        (target === 'kcal' ? supplied[target] > 0 : supplied[target] >= 0))
      profile.targets[target] = supplied[target];
    else if (value.targets !== undefined) changed = true;
  }
  for (var list of ['allergies', 'dislikes']) {
    if (!Array.isArray(profile[list]) || !profile[list].every(item => typeof item === 'string')) {
      profile[list] = []; changed = true;
    }
  }
  if (typeof profile.fontScale !== 'number' || !Number.isFinite(profile.fontScale) || profile.fontScale <= 0) {
    profile.fontScale = defaults.fontScale; changed = true;
  }
  if (typeof profile.geminiKey !== 'string') { profile.geminiKey = ''; changed = true; }
  if (changed) KlocaPreserve(key, raw);
  return profile;
}
function KlocaBackupKeys() {
  var keys = [...Zt];
  try {
    for (var index = 0; index < localStorage.length; index++) {
      var key = localStorage.key(index);
      if (/^nutrilens\.(profile|table|history)\.recovery\.v1(?:\.\d+)?$/.test(key)) keys.push(key);
    }
  } catch {}
  return keys;
}

class KlocaViewBoundary extends _.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) {
    // Do not log persisted food records or API credentials.
    console.error('[KLoCa Lens] view render failed:', error.name, error.message);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return j.jsxs('div', { className: 'section kloca-recovery', role: 'alert', children: [
      j.jsx('h2', { className: 'section-title', children: '화면을 열지 못했어요' }),
      j.jsx('p', { children: '저장된 자료는 유지됩니다. 메뉴를 바꾸거나 다시 시도해 주세요.' }),
      j.jsx('button', { className: 'cta ghost', onClick: () => this.setState({ failed: false }), children: '다시 시도' }),
      j.jsx('button', { className: 'cta', onClick: this.props.onRecover, children: this.props.recoveryLabel || '홈으로' })
    ] });
  }
}

function KlocaMuseHero() {
  var { dispatch } = M();
  var [collapsed, setCollapsed] = _.useState(() => KlocaStorageGet('muse-hero-collapsed') === '1');
  var toggle = () => setCollapsed(previous => {
    KlocaStorageSet('muse-hero-collapsed', previous ? '0' : '1'); return !previous;
  });
  return j.jsxs('div', { className: 'muse-scan-hero' + (collapsed ? ' collapsed' : ''), children: [
    j.jsxs('button', { type: 'button', className: 'muse-finder', 'aria-label': '사진으로 검색',
      onClick: () => dispatch({ type: 'push', modal: { type: 'scan' } }), children: [
        ...['c1','c2','c3','c4'].map(corner => j.jsx('span', { className: 'muse-corner ' + corner, 'aria-hidden': true }, corner)),
        j.jsx('span', { className: 'muse-scanline', 'aria-hidden': true }),
        j.jsx('span', { className: 'muse-finder-emoji', 'aria-hidden': true, children: '🥑' }),
        j.jsx('span', { className: 'muse-finder-hint', children: '접시 · 영수증 · 바코드 모두 OK' })
      ] }),
    j.jsx('button', { type: 'button', className: 'muse-collapse', 'aria-label': collapsed ? '펼치기' : '접기',
      'aria-expanded': !collapsed, onClick: toggle, children: collapsed ? '▼' : '▲' })
  ] });
}
function KlocaPhotoButton() {
  var { dispatch } = M();
  return j.jsx('button', { type: 'button', className: 'muse-photo-btn', 'aria-label': '사진 올리기',
    onClick: () => dispatch({ type: 'push', modal: { type: 'scan' } }), children: '🖼️' });
}
function KlocaVoiceButton({ onText }) {
  var [listening, setListening] = _.useState(false);
  var recognition = _.useRef(null);
  _.useEffect(() => () => { if (recognition.current) recognition.current.abort(); }, []);
  var SR = typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  return j.jsx('button', { type: 'button', className: 'muse-voice-btn', 'aria-label': '음성 검색', disabled: listening,
    onClick: () => {
      var rec = new SR(); recognition.current = rec;
      rec.lang = 'ko-KR'; rec.interimResults = false;
      rec.onresult = event => { onText(event.results[0][0].transcript); setListening(false); };
      rec.onerror = rec.onend = () => setListening(false);
      try { rec.start(); setListening(true); } catch { setListening(false); }
    }, children: listening ? '●' : '🎤' });
}
function KlocaMarketSection({ children }) {
  var [collapsed, setCollapsed] = _.useState(() => {
    var saved = KlocaStorageGet('muse-food-collapsed');
    return saved === null || saved === '1';
  });
  return j.jsxs('div', { className: 'muse-market-section', children: [
    j.jsxs('button', { type: 'button', className: 'muse-section-toggle', 'aria-expanded': !collapsed,
      'aria-label': collapsed ? '식품 목록 펼치기' : '식품 목록 접기',
      onClick: () => setCollapsed(previous => {
        KlocaStorageSet('muse-food-collapsed', previous ? '0' : '1'); return !previous;
      }), children: [
        j.jsx('span', { className: 'muse-section-label', children: collapsed ? '식재료 보기 ▾' : '식재료 접기 ▴' }),
        collapsed && j.jsx('span', { className: 'muse-section-hint', children: '눌러서 펼치기' })
      ] }),
    j.jsx('div', { className: 'muse-market-content', hidden: collapsed, children })
  ] });
}
function KlocaDashboardView() {
  var { state, dispatch } = M();
  return j.jsxs('div', { className: 'section muse-dashboard', id: 'dashboard', children: [
    j.jsxs('div', { className: 'section-head', children: [
      j.jsx('h2', { className: 'section-title', children: '오늘의 영양 대시보드' }),
      j.jsx('button', { type: 'button', className: 'dash-toggle-icon',
        'aria-label': state.dashCollapsed ? '대시보드 펼치기' : '대시보드 접기',
        onClick: () => dispatch({ type: 'toggleDash' }), children: state.dashCollapsed ? '+' : '−' })
    ] }), j.jsx(ht, { collapsed: state.dashCollapsed })
  ] });
}
function KlocaMainView() {
  var { state, dispatch } = M();
  var View = { home: It, table: Rt, history: Wt, dashboard: KlocaDashboardView }[state.tab] || It;
  return j.jsxs(j.Fragment, { children: [
    KlocaRecovery.length > 0 && j.jsx('p', { className: 'kloca-data-notice', role: 'status',
      children: KlocaUnsavedRecovery.size > 0
        ? '일부 자료의 형식이 달라 화면에서 제외했습니다. 원본은 유지되며, 저장 공간 부족으로 복구 사본을 만들지 못했습니다.'
        : '일부 자료의 형식이 달라 화면에서 제외했습니다. 수정 전 자료는 기기 안에 복구 사본으로 보관했습니다.' }),
    j.jsx(KlocaViewBoundary, { onRecover: () => { dispatch({ type: 'closeAll' }); dispatch({ type: 'setTab', tab: 'home' }); },
      children: j.jsx(View, {}) }, state.tab)
  ] });
}
