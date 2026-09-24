'use strict';
(() => {
  /* ═════════════ Constantes ═════════════ */
  const KEY = 'sportmarks_v1';
  const KEY_INSTALL = 'sportmarks_install_oculto';
  const VERSION = '1.1';
  const PALETTE = ['#FF5A36', '#FFB020', '#D4FF3A', '#3DDC97', '#36C2FF', '#6C8CFF', '#B78BFF', '#FF5FA2'];
  const NO_CAT = { id: null, name: 'Sin categoría', color: '#8C92A1' };
  const TYPES = {
    peso:      { label: 'Peso × reps',  hint: 'Press banca, sentadilla…' },
    reps:      { label: 'Repeticiones', hint: 'Dominadas, fondos…' },
    tiempo:    { label: 'Tiempo',       hint: 'Plancha, 5 km…' },
    distancia: { label: 'Distancia',    hint: 'Carrera, remo…' },
    otro:      { label: 'Otra medida',  hint: 'Salto (cm), kcal, nivel…' },
  };
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  /* ═════════════ Utilidades ═════════════ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const icon = id => `<svg><use href="#i-${id}"/></svg>`;
  const hexRgb = h => { const n = parseInt(h.slice(1), 16); return `${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}`; };
  const pad = n => String(n).padStart(2, '0');
  const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayISO = () => isoOf(new Date());
  const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const num = v => { const s = String(v ?? '').trim().replace(',', '.'); return s === '' ? NaN : Number(s); };
  const fmtNum = (n, max = 2) => Number(n).toLocaleString('es-ES', { maximumFractionDigits: max });
  const inputNum = n => (n === null || n === undefined || Number.isNaN(n)) ? '' : String(Math.round(n * 100) / 100).replace('.', ',');
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const catStyle = c => `--c:${c.color};--cr:${hexRgb(c.color)}`;
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function fmtTime(total) {
    const s = Math.round(total), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    if (h) return `${h}:${pad(m)}:${pad(sec)}`;
    if (m) return `${m}:${pad(sec)}`;
    return String(sec);
  }
  function fmtDate(iso, forceYear = false) {
    const d = parseISO(iso);
    const y = forceYear || d.getFullYear() !== new Date().getFullYear();
    return `${d.getDate()} ${MONTHS[d.getMonth()]}${y ? ' ' + d.getFullYear() : ''}`;
  }
  function sinceText(iso) {
    const d = parseISO(iso);
    return d.getFullYear() === new Date().getFullYear()
      ? `${d.getDate()} ${MONTHS[d.getMonth()]}`
      : `${MONTHS[d.getMonth()]} ’${String(d.getFullYear()).slice(2)}`;
  }
  function relDate(iso) {
    const diff = Math.round((parseISO(todayISO()) - parseISO(iso)) / 86400000);
    if (diff === 0) return 'hoy';
    if (diff === 1) return 'ayer';
    if (diff > 1 && diff < 7) return `hace ${diff} días`;
    return fmtDate(iso);
  }

  /* ═════════════ Datos ═════════════ */
  function defaults() {
    return {
      v: 1, name: 'Juan', lastBackup: null,
      categories: [
        { id: 'fuerza', name: 'Fuerza', color: '#FF5A36' },
        { id: 'calistenia', name: 'Calistenia', color: '#B78BFF' },
        { id: 'cardio', name: 'Cardio', color: '#36C2FF' },
        { id: 'movilidad', name: 'Movilidad', color: '#3DDC97' },
      ],
      exercises: [],
      weights: [],
    };
  }

  // Limpia cualquier dato (guardado o importado) para que la app nunca reciba basura
  function normalize(s) {
    if (!s || !Array.isArray(s.categories) || !Array.isArray(s.exercises)) return null;
    const finite = v => (typeof v === 'number' && Number.isFinite(v)) ? v : null;
    return {
      v: 1,
      name: typeof s.name === 'string' ? s.name.slice(0, 40) : 'Juan',
      lastBackup: finite(s.lastBackup),
      categories: s.categories
        .filter(c => c && c.id != null && typeof c.name === 'string')
        .map(c => ({ id: String(c.id), name: c.name.slice(0, 30), color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : PALETTE[0] })),
      exercises: s.exercises
        .filter(e => e && e.id != null && typeof e.name === 'string' && TYPES[e.type])
        .map(e => ({
          id: String(e.id), name: e.name.slice(0, 80), cat: e.cat == null ? null : String(e.cat),
          type: e.type, unit: typeof e.unit === 'string' ? e.unit.slice(0, 12) : '', dir: e.dir === 'down' ? 'down' : 'up',
          created: finite(e.created) || Date.now(),
          marks: (Array.isArray(e.marks) ? e.marks : [])
            .filter(m => m && m.id != null && /^\d{4}-\d{2}-\d{2}$/.test(m.date))
            .map(m => ({
              id: String(m.id), date: m.date, ts: finite(m.ts) || 0,
              kg: finite(m.kg), reps: finite(m.reps), secs: finite(m.secs), val: finite(m.val),
              note: typeof m.note === 'string' ? m.note.slice(0, 200) : '',
            })),
        })),
      // Peso corporal: un registro por día (las copias de la v1.0 no lo traen)
      weights: Object.values(Object.fromEntries((Array.isArray(s.weights) ? s.weights : [])
        .filter(w => w && /^\d{4}-\d{2}-\d{2}$/.test(w.date) && finite(w.kg) > 0)
        .map(w => [w.date, { date: w.date, kg: w.kg }])))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw)) || defaults();
    } catch { /* datos corruptos: se empieza de cero */ }
    return defaults();
  }

  let state = load();
  let saveWarned = false;
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch {
      if (!saveWarned) { toast('No se ha podido guardar en este navegador'); saveWarned = true; }
    }
  }

  const getEx = id => state.exercises.find(e => e.id === id);
  const getCat = id => state.categories.find(c => c.id === id) || NO_CAT;

  /* ═════════════ Marcas y récords ═════════════ */
  function score(ex, m) {
    switch (ex.type) {
      case 'peso': return [m.kg, m.reps || 0];
      case 'reps': return [m.reps];
      case 'tiempo': return [ex.dir === 'down' ? -m.secs : m.secs];
      default: return [ex.dir === 'down' ? -m.val : m.val];
    }
  }
  function better(ex, a, b) {
    const x = score(ex, a), y = score(ex, b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return false;
  }
  function analyze(ex) {
    const list = [...ex.marks].sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts);
    let best = null;
    const beat = new Set(); // marcas que superaron el récord anterior
    for (const m of list) {
      if (!best) best = m;
      else if (better(ex, m, best)) { best = m; beat.add(m.id); }
    }
    return { list, best, beat, first: list[0] || null, last: list[list.length - 1] || null };
  }
  function parts(ex, m) {
    switch (ex.type) {
      case 'peso': return { n: fmtNum(m.kg), u: 'kg', x: m.reps ? `× ${m.reps}` : '' };
      case 'reps': return { n: fmtNum(m.reps, 0), u: m.reps === 1 ? 'rep' : 'reps', x: '' };
      case 'tiempo': return { n: fmtTime(m.secs), u: m.secs >= 3600 ? 'h' : m.secs >= 60 ? 'min' : 's', x: '' };
      case 'distancia': return { n: fmtNum(m.val), u: ex.unit || 'km', x: '' };
      default: return { n: fmtNum(m.val), u: ex.unit || '', x: '' };
    }
  }
  const markText = (ex, m) => { const p = parts(ex, m); return [p.n, p.u, p.x].filter(Boolean).join(' '); };
  function progress(ex, a) {
    if (!a.best || a.best === a.first) return null;
    const f = a.first, b = a.best;
    const sign = ex.dir === 'down' ? '−' : '+';
    switch (ex.type) {
      case 'peso': { const d = b.kg - f.kg; return d ? `+${fmtNum(d)} kg` : `+${(b.reps || 0) - (f.reps || 0)} reps`; }
      case 'reps': return `+${b.reps - f.reps}`;
      case 'tiempo': { const d = Math.abs(b.secs - f.secs); return `${sign}${fmtTime(d)}${d < 60 ? ' s' : ''}`; }
      default: return `${sign}${fmtNum(Math.abs(b.val - f.val))}${ex.unit ? ' ' + ex.unit : ''}`;
    }
  }
  function typeText(ex) {
    const t = TYPES[ex.type].label;
    if (ex.type === 'tiempo') return `${t} · ${ex.dir === 'down' ? 'menos es mejor' : 'más es mejor'}`;
    if (ex.type === 'distancia') return `${t} en ${ex.unit || 'km'}`;
    if (ex.type === 'otro') return `${ex.unit ? `Medida en ${ex.unit}` : t} · ${ex.dir === 'down' ? 'menos es mejor' : 'más es mejor'}`;
    return t;
  }

  /* ═════════════ Inicio ═════════════ */
  let filter = 'all';
  let query = '';
  let installEvent = null;

  function renderHome(animate = false) {
    $('#list').classList.toggle('still', !animate);
    const now = new Date();
    $('#today').textContent = `Sport Marks · ${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;
    $('#helloName').textContent = state.name.trim() || 'Sport Marks';
    document.title = 'Sport Marks';

    let marks = 0, beaten = 0;
    const analyses = new Map();
    for (const ex of state.exercises) {
      const a = analyze(ex);
      analyses.set(ex.id, a);
      marks += ex.marks.length;
      beaten += a.beat.size;
    }
    $('#stats').innerHTML = `
      <div class="stat"><b>${state.exercises.length}</b><span>Ejercicios</span></div>
      <div class="stat"><b>${marks}</b><span>Marcas</span></div>
      <div class="stat hot">${icon('crown')}<b>${beaten}</b><span>Récords</span></div>`;

    // Filtros por categoría
    const counts = {};
    let noCat = 0;
    for (const ex of state.exercises) {
      if (state.categories.some(c => c.id === ex.cat)) counts[ex.cat] = (counts[ex.cat] || 0) + 1;
      else noCat++;
    }
    if (filter !== 'all' && filter !== '_none' && !state.categories.some(c => c.id === filter)) filter = 'all';
    if (filter === '_none' && !noCat) filter = 'all';
    const chip = (id, name, color, n) =>
      `<button class="chip${filter === id ? ' on' : ''}" data-f="${esc(id)}" style="${color ? catStyle({ color }) : ''}">${color ? '<i></i>' : ''}${esc(name)}<em>${n}</em></button>`;
    $('#chips').innerHTML = chip('all', 'Todos', null, state.exercises.length)
      + state.categories.map(c => chip(c.id, c.name, c.color, counts[c.id] || 0)).join('')
      + (noCat ? chip('_none', NO_CAT.name, NO_CAT.color, noCat) : '');
    $('#toolbar').hidden = state.exercises.length === 0;
    $('#fab').hidden = state.exercises.length === 0;

    // Lista
    const list = $('#list');
    let html = installCard();
    if (!state.exercises.length) {
      list.innerHTML = html + `
        <div class="empty">
          <div class="empty-art">${icon('dumbbell')}</div>
          <h2>Empieza aquí</h2>
          <p>Añade tus ejercicios y ve apuntando tus marcas. Cada vez que superes una, quedará como récord.</p>
          <button class="btn btn-primary" data-act="new-ex">${icon('plus')}Añadir ejercicio</button>
        </div>`;
      return;
    }
    const q = norm(query.trim());
    const key = ex => { const a = analyses.get(ex.id); return a.last ? [a.last.date, a.last.ts] : [isoOf(new Date(ex.created)), ex.created]; };
    const shown = state.exercises
      .filter(ex => filter === 'all' || (filter === '_none' ? !state.categories.some(c => c.id === ex.cat) : ex.cat === filter))
      .filter(ex => !q || norm(ex.name).includes(q))
      .sort((a, b) => { const x = key(a), y = key(b); return y[0].localeCompare(x[0]) || y[1] - x[1]; });

    html += shown.map((ex, i) => cardHTML(ex, analyses.get(ex.id), i)).join('');
    if (!shown.length) html += `<p class="list-note">${q ? `Nada con «${esc(query.trim())}»` : 'No hay ejercicios en esta categoría'}</p>`;
    list.innerHTML = html;
  }

  function cardHTML(ex, a, i) {
    const c = getCat(ex.cat);
    let right, sub;
    if (a.best) {
      const p = parts(ex, a.best);
      right = `<div class="ex-pr">
          <span class="ex-pr-label">${icon('crown')}Récord</span>
          <span class="ex-pr-val">${esc(p.n)}<small>${esc(p.u)}</small></span>
          ${p.x ? `<span class="ex-pr-sub">${p.x} reps</span>` : ''}
        </div>`;
      sub = `${esc(markText(ex, a.last))} · ${relDate(a.last.date)}`;
    } else {
      right = `<div class="ex-empty"><span>${icon('plus')}</span>Sin marcas</div>`;
      sub = esc(TYPES[ex.type].label);
    }
    return `<button class="ex-card" data-id="${esc(ex.id)}" style="${catStyle(c)};animation-delay:${Math.min(i, 12) * 30}ms">
        <div style="min-width:0">
          <span class="tag"><i></i>${esc(c.name)}</span>
          <h3 class="ex-name">${esc(ex.name)}</h3>
          <p class="ex-sub">${sub}</p>
        </div>
        ${right}
      </button>`;
  }

  function installCard() {
    if (isStandalone()) return '';
    try { if (localStorage.getItem(KEY_INSTALL)) return ''; } catch { /* sin almacenamiento */ }
    let text, btn = '';
    if (installEvent) { text = 'Tenla como una app más, sin navegador.'; btn = `<button class="mini" data-act="install">Instalar</button>`; }
    else if (isIOS) text = 'En Safari: Compartir y «Añadir a pantalla de inicio». Hazlo antes de apuntar: lo guardado en Safari no pasa a la app.';
    else text = 'Menú del navegador y «Instalar app» o «Añadir a pantalla de inicio».';
    return `<div class="install">${icon('phone')}<div><b>Instálala en el móvil</b><p>${text}</p></div>
      <div style="display:flex;align-items:center;gap:2px">${btn}<button class="x" data-act="hide-install" aria-label="Ocultar">${icon('close')}</button></div></div>`;
  }

  /* ═════════════ Detalle de ejercicio ═════════════ */
  let currentId = null;

  function renderDetail() {
    const ex = getEx(currentId);
    if (!ex) return;
    const c = getCat(ex.cat), a = analyze(ex);
    const el = $('#detail');
    el.style.setProperty('--c', c.color);
    el.style.setProperty('--cr', hexRgb(c.color));
    const scrolled = el.scrollTop > 60;

    let pr;
    if (a.best) {
      const p = parts(ex, a.best);
      pr = `<span class="pr-label">${icon('crown')}Récord personal</span>
        <div class="pr-main">
          <span class="pr-num"${p.n.length > 5 ? ' style="font-size:62px"' : ''}>${esc(p.n)}</span><span class="pr-unit">${esc(p.u)}</span>
          ${p.x ? `<span class="pr-extra">${p.x} <span class="pr-unit">reps</span></span>` : ''}
        </div>
        <p class="pr-date">${a.best.date === todayISO() ? 'Conseguido hoy' : `Conseguido el ${fmtDate(a.best.date, true)}`}</p>`;
    } else {
      pr = `<span class="pr-label">${icon('crown')}Récord personal</span>
        <p class="pr-none">Aún sin marcas</p>
        <p class="pr-date">Apunta la primera y empieza a batirla.</p>`;
    }

    const prog = progress(ex, a);
    const thisYear = new Date().getFullYear();
    const rows = [...a.list].reverse().map((m, i) => {
      const d = parseISO(m.date), p = parts(ex, m), isBest = m === a.best;
      const yr = d.getFullYear() !== thisYear ? ` ’${String(d.getFullYear()).slice(2)}` : '';
      const badge = isBest ? `<span class="pr-pill">${icon('crown')}RÉCORD</span>`
        : a.beat.has(m.id) ? `<svg style="color:var(--accent);width:15px;height:15px" aria-label="Superó el récord"><use href="#i-crown"/></svg>` : '';
      return `<li><button class="mark${isBest ? ' is-pr' : ''}" data-mark="${esc(m.id)}" style="animation-delay:${Math.min(i, 12) * 25}ms">
          <div class="m-date"><b>${d.getDate()}</b><span>${MONTHS[d.getMonth()]}${yr}</span></div>
          <div style="min-width:0">
            <div class="m-val">${esc(p.n)} <small>${esc(p.u)}</small>${p.x ? ` <small>${p.x}</small>` : ''}</div>
            ${m.note ? `<div class="m-note">${esc(m.note)}</div>` : ''}
          </div>
          <div class="m-side">${badge}${icon('chev')}</div>
        </button></li>`;
    }).join('');

    el.innerHTML = `
      <div class="d-bar${scrolled ? ' scrolled' : ''}">
        <button class="icon-btn" data-act="back" aria-label="Volver">${icon('back')}</button>
        <span class="d-bar-title">${esc(ex.name)}</span>
        <button class="icon-btn" data-act="edit-ex" aria-label="Editar ejercicio">${icon('edit')}</button>
      </div>
      <div class="d-head">
        <span class="tag"><i></i>${esc(c.name)}</span>
        <h2 class="d-name">${esc(ex.name)}</h2>
        <p class="d-type">${esc(typeText(ex))}</p>
      </div>
      <div class="pr-card"><svg class="bg-crown"><use href="#i-crown"/></svg>${pr}</div>
      <div class="d-stats">
        <div class="stat"><b>${ex.marks.length}</b><span>Marcas</span></div>
        <div class="stat"><b class="${prog ? 'up' : ''}">${prog ? esc(prog) : '—'}</b><span>Progreso</span></div>
        <div class="stat"><b>${a.first ? sinceText(a.first.date) : '—'}</b><span>Desde</span></div>
      </div>
      <div class="d-cta"><button class="btn btn-primary" data-act="new-mark">${icon('plus')}Nueva marca</button></div>
      <div class="sec-title"><span>Historial</span><span>${ex.marks.length ? `${ex.marks.length} ${ex.marks.length === 1 ? 'marca' : 'marcas'}` : ''}</span></div>
      <ul class="marks">${rows || '<li class="marks-empty">Aquí aparecerán tus marcas</li>'}</ul>`;
  }

  function openDetail(id) {
    const el = $('#detail');
    if (currentId !== id) el.scrollTop = 0;
    currentId = id;
    renderDetail();
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    $('#pager').inert = true;
    $('#tabbar').inert = true;
    document.body.classList.add('locked');
  }
  function closeDetail() {
    const el = $('#detail');
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    $('#pager').inert = false;
    $('#tabbar').inert = false;
    document.body.classList.remove('locked');
    currentId = null;
  }

  /* ═════════════ Navegación (botón atrás del móvil incluido) ═════════════ */
  function route() {
    const m = location.hash.match(/^#e\/(.+)$/);
    const id = m ? decodeURIComponent(m[1]) : null;
    if (sheetOpen()) closeSheet();
    if (id && getEx(id)) openDetail(id);
    else {
      if (m) history.replaceState(null, '', location.pathname + location.search);
      closeDetail();
    }
    renderHome();
  }
  function goEx(id) {
    history.pushState({ e: id }, '', '#e/' + encodeURIComponent(id));
    route();
  }
  function goHome() {
    if (history.state && history.state.e) history.back();
    else { history.replaceState(null, '', location.pathname + location.search); route(); }
  }
  addEventListener('popstate', route);
  addEventListener('hashchange', route);

  /* ═════════════ Hoja inferior ═════════════ */
  const sheet = $('#sheet'), backdrop = $('#backdrop'), sheetBody = $('#sheetBody');
  const sheetOpen = () => sheet.classList.contains('open');

  // Cada hoja va en un contenedor nuevo: así sus eventos mueren con ella y no se acumulan
  function openSheet(html) {
    const inner = document.createElement('div');
    inner.innerHTML = html;
    sheetBody.replaceChildren(inner);
    sheetBody.scrollTop = 0;
    sheet.style.transform = '';
    sheet.classList.add('open');
    backdrop.classList.add('open');
    return inner;
  }
  function closeSheet() {
    if (document.activeElement && sheet.contains(document.activeElement)) document.activeElement.blur();
    sheet.style.transform = '';
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
  }
  const sheetHead = (title, sub = '') => `<div class="sh-head"><div><h2 class="sh-title">${title}</h2>${sub ? `<p class="sh-sub">${sub}</p>` : ''}</div>
    <button class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div>`;

  backdrop.addEventListener('click', closeSheet);
  sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && sheetOpen()) closeSheet(); });

  // Arrastrar la hoja hacia abajo para cerrarla
  (() => {
    const grip = $('#sheetGrip');
    let y0 = null, dy = 0;
    grip.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; sheet.classList.add('dragging'); grip.setPointerCapture(e.pointerId); });
    grip.addEventListener('pointermove', e => {
      if (y0 === null) return;
      dy = Math.max(0, e.clientY - y0);
      sheet.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (y0 === null) return;
      y0 = null;
      sheet.classList.remove('dragging');
      if (dy > 90) closeSheet(); else sheet.style.transform = '';
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  })();

  function confirmSheet({ title, text, ok = 'Eliminar', onOk, onCancel }) {
    const b = openSheet(`${sheetHead(title)}
      <p class="hint" style="font-size:15px;margin:-6px 0 22px;color:var(--muted)">${text}</p>
      <div class="actions">
        <button class="btn btn-primary" data-ok style="background:var(--danger);color:#fff;box-shadow:none">${ok}</button>
        <button class="btn btn-ghost" data-cancel>Cancelar</button>
      </div>`);
    b.querySelector('[data-ok]').onclick = () => { closeSheet(); onOk(); };
    b.querySelector('[data-cancel]').onclick = () => { closeSheet(); if (onCancel) onCancel(); };
  }

  /* ═════════════ Formulario de ejercicio ═════════════ */
  function exerciseForm(exId) {
    const ex = exId ? getEx(exId) : null;
    const locked = !!(ex && ex.marks.length);
    const f = {
      cat: ex ? ex.cat : (filter !== 'all' && filter !== '_none' ? filter : (state.categories[0] ? state.categories[0].id : null)),
      type: ex ? ex.type : 'peso',
      unit: ex ? ex.unit : '',
      dir: ex ? ex.dir : 'up',
      newColor: PALETTE[state.categories.length % PALETTE.length],
      adding: false,
    };

    const b = openSheet(`${sheetHead(ex ? 'Editar ejercicio' : 'Nuevo ejercicio')}
      <div class="field">
        <label class="lbl" for="fName">Nombre</label>
        <input class="input" id="fName" maxlength="80" placeholder="Ej: Press banca" autocomplete="off" enterkeyhint="done" value="${ex ? esc(ex.name) : ''}">
        <p class="hint err" id="fNameErr" hidden>Ponle un nombre al ejercicio</p>
      </div>
      <div class="field"><span class="lbl">Categoría</span><div id="fCats"></div></div>
      <div class="field">
        <span class="lbl">Cómo se mide</span>
        <div class="types${locked ? ' locked' : ''}" id="fTypes"></div>
        ${locked ? '<p class="hint">Ya tiene marcas guardadas, así que el tipo de medida no se puede cambiar.</p>' : ''}
      </div>
      <div id="fExtra"></div>
      <div class="actions">
        <button class="btn btn-primary" id="fSave">${ex ? 'Guardar cambios' : 'Crear ejercicio'}</button>
        ${ex ? `<button class="btn btn-danger" id="fDel">${icon('trash')}Eliminar ejercicio</button>` : ''}
      </div>`);

    const nameIn = b.querySelector('#fName');

    function drawCats() {
      const opts = state.categories.map(c =>
        `<button class="opt${f.cat === c.id ? ' on' : ''}" data-cat="${esc(c.id)}" style="${catStyle(c)}"><i></i>${esc(c.name)}</button>`).join('');
      const none = `<button class="opt${f.cat === null || !state.categories.some(c => c.id === f.cat) ? ' on' : ''}" data-cat="" style="${catStyle(NO_CAT)}"><i></i>Ninguna</button>`;
      b.querySelector('#fCats').innerHTML = `<div class="opts">${opts}${none}
          <button class="opt add" data-newcat>${icon('plus')}Nueva</button></div>
        ${f.adding ? `<div class="newcat"><input class="input" id="fCatName" maxlength="30" placeholder="Nombre de la categoría" autocomplete="off">
          <button class="btn btn-ghost" id="fCatAdd">Crear</button></div>
          <div class="swatches">${PALETTE.map(col => `<button class="sw${col === f.newColor ? ' on' : ''}" data-sw="${col}" style="--c:${col}" aria-label="Color"></button>`).join('')}</div>` : ''}`;
    }
    function drawTypes() {
      b.querySelector('#fTypes').innerHTML = Object.entries(TYPES).map(([k, t]) =>
        `<button class="type${f.type === k ? ' on' : ''}" data-type="${k}"><b>${t.label}</b><span>${t.hint}</span></button>`).join('');
    }
    function drawExtra() {
      const seg = (key, opts) => `<div class="seg">${opts.map(([v, label, small]) =>
        `<button class="${f[key] === v ? 'on' : ''}" data-${key}="${v}">${label}${small ? `<small>${small}</small>` : ''}</button>`).join('')}</div>`;
      let h = '';
      if (f.type === 'distancia') {
        if (f.unit !== 'm' && f.unit !== 'km') f.unit = 'km';
        h = `<div class="field"><span class="lbl">Unidad</span>${seg('unit', [['km', 'Kilómetros'], ['m', 'Metros']])}</div>`;
      } else if (f.type === 'otro') {
        h = `<div class="field"><label class="lbl" for="fUnit">Unidad <em>opcional</em></label>
          <input class="input" id="fUnit" maxlength="12" placeholder="cm, kcal, nivel…" autocomplete="off" value="${esc(f.unit)}"></div>`;
      }
      if (f.type === 'tiempo' || f.type === 'otro') {
        h += `<div class="field"><span class="lbl">¿Qué cuenta como mejor?</span>${seg('dir', [
          ['up', 'Más es mejor', f.type === 'tiempo' ? 'plancha, colgado' : 'salto, nivel'],
          ['down', 'Menos es mejor', f.type === 'tiempo' ? 'carrera, circuito' : 'tiempo de reacción'],
        ])}</div>`;
      }
      b.querySelector('#fExtra').innerHTML = h;
      const unitIn = b.querySelector('#fUnit');
      if (unitIn) unitIn.addEventListener('input', () => { f.unit = unitIn.value; });
    }
    drawCats(); drawTypes(); drawExtra();

    function addCategory() {
      const input = b.querySelector('#fCatName');
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      const cat = { id: uid(), name, color: f.newColor };
      state.categories.push(cat);
      save();
      f.cat = cat.id; f.adding = false;
      f.newColor = PALETTE[state.categories.length % PALETTE.length];
      drawCats();
      renderHome();
    }

    b.addEventListener('click', e => {
      const t = e.target.closest('button');
      if (!t || !b.contains(t)) return;
      if (t.dataset.cat !== undefined) { f.cat = t.dataset.cat || null; drawCats(); }
      else if (t.hasAttribute('data-newcat')) { f.adding = !f.adding; drawCats(); if (f.adding) b.querySelector('#fCatName').focus(); }
      else if (t.dataset.sw) { f.newColor = t.dataset.sw; const keep = b.querySelector('#fCatName').value; drawCats(); b.querySelector('#fCatName').value = keep; }
      else if (t.id === 'fCatAdd') addCategory();
      else if (t.dataset.type && !locked) {
        f.type = t.dataset.type;
        if (f.type === 'distancia') f.unit = 'km'; else if (f.type !== 'otro') f.unit = ''; else if (f.unit === 'km' || f.unit === 'm') f.unit = '';
        drawTypes(); drawExtra();
      }
      else if (t.dataset.unit) { f.unit = t.dataset.unit; drawExtra(); }
      else if (t.dataset.dir) { f.dir = t.dataset.dir; drawExtra(); }
    });
    b.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      if (e.target.id === 'fCatName') { e.preventDefault(); addCategory(); }
      else if (e.target.id === 'fName') { e.preventDefault(); nameIn.blur(); }
    });
    nameIn.addEventListener('input', () => { b.querySelector('#fNameErr').hidden = true; });

    b.querySelector('#fSave').onclick = () => {
      const name = nameIn.value.trim();
      if (!name) { b.querySelector('#fNameErr').hidden = false; nameIn.focus(); return; }
      const data = {
        name, cat: f.cat, type: f.type,
        unit: f.type === 'distancia' || f.type === 'otro' ? f.unit.trim() : '',
        dir: f.type === 'tiempo' || f.type === 'otro' ? f.dir : 'up',
      };
      if (ex) {
        Object.assign(ex, data, locked ? { type: ex.type } : {});
        save(); closeSheet(); renderDetail(); renderHome();
        toast('Cambios guardados');
      } else {
        const created = { id: uid(), ...data, created: Date.now(), marks: [] };
        state.exercises.push(created);
        save(); closeSheet();
        query = ''; $('#search').value = '';
        goEx(created.id);
        toast('Ejercicio creado. Apunta tu primera marca');
      }
    };

    if (ex) b.querySelector('#fDel').onclick = () => {
      const n = ex.marks.length;
      confirmSheet({
        title: '¿Eliminar ejercicio?',
        text: `Se borrará «${esc(ex.name)}»${n === 1 ? ' y su marca' : n ? ` y sus ${n} marcas` : ''}.`,
        onCancel: () => exerciseForm(ex.id),
        onOk: () => {
          const idx = state.exercises.indexOf(ex);
          state.exercises.splice(idx, 1);
          save();
          goHome();
          toast('Ejercicio eliminado', { action: 'Deshacer', onAction: () => { state.exercises.splice(idx, 0, ex); save(); renderHome(); } });
        },
      });
    };
  }

  /* ═════════════ Formulario de marca ═════════════ */
  const stepper = (id, label, value, step, mode = 'decimal', ph = '0') => `
      <div class="field"><label class="lbl" for="${id}">${label}</label>
        <div class="stepper">
          <button type="button" data-step="-${step}" data-for="${id}" aria-label="Restar ${step}">−${String(step).replace('.', ',')}</button>
          <input class="input" id="${id}" inputmode="${mode}" autocomplete="off" enterkeyhint="done" placeholder="${ph}" value="${value}">
          <button type="button" data-step="${step}" data-for="${id}" aria-label="Sumar ${step}">+${String(step).replace('.', ',')}</button>
        </div></div>`;
  function bindSteppers(b, onChange) {
    b.addEventListener('click', e => {
      const t = e.target.closest('[data-step]');
      if (!t) return;
      const input = b.querySelector('#' + t.dataset.for);
      const next = Math.max(0, Math.round(((num(input.value) || 0) + Number(t.dataset.step)) * 100) / 100);
      input.value = inputNum(next);
      onChange();
    });
  }

  function markForm(exId, markId) {
    const ex = getEx(exId);
    if (!ex) return;
    const mark = markId ? ex.marks.find(m => m.id === markId) : null;
    const a = analyze(ex);
    const base = mark || a.last; // una marca nueva parte de la última para ir más rápido

    let fields = '';
    if (ex.type === 'peso') {
      fields = stepper('mKg', 'Peso <em>kg</em>', inputNum(base ? base.kg : null), 2.5)
        + stepper('mReps', 'Repeticiones', base && base.reps ? base.reps : '', 1, 'numeric');
    } else if (ex.type === 'reps') {
      fields = stepper('mReps', 'Repeticiones', base ? base.reps : '', 1, 'numeric');
    } else if (ex.type === 'tiempo') {
      const s = base ? base.secs : 0;
      const v = n => (base ? String(n) : '');
      fields = `<div class="field"><span class="lbl">Tiempo</span>
        <div class="time-row">
          <input class="input" id="mH" inputmode="numeric" maxlength="2" placeholder="0" value="${base && s >= 3600 ? Math.floor(s / 3600) : ''}" aria-label="Horas"><i>:</i>
          <input class="input" id="mM" inputmode="numeric" maxlength="3" placeholder="00" value="${v(Math.floor(s % 3600 / 60))}" aria-label="Minutos"><i>:</i>
          <input class="input" id="mS" inputmode="numeric" maxlength="3" placeholder="00" value="${v(s % 60)}" aria-label="Segundos">
        </div>
        <div class="time-lbls"><span>horas</span><b></b><span>min</span><b></b><span>seg</span></div></div>`;
    } else {
      const step = ex.type === 'distancia' ? (ex.unit === 'm' ? 10 : 0.5) : 1;
      const unit = ex.type === 'distancia' ? (ex.unit || 'km') : ex.unit;
      fields = stepper('mVal', `Marca${unit ? ` <em>${esc(unit)}</em>` : ''}`, inputNum(base ? base.val : null), step);
    }

    const b = openSheet(`${sheetHead(mark ? 'Editar marca' : 'Nueva marca', esc(ex.name))}
      ${fields}
      <div class="field"><label class="lbl" for="mDate">Fecha</label>
        <input class="input" type="date" id="mDate" value="${mark ? mark.date : todayISO()}"></div>
      <div class="field"><label class="lbl" for="mNote">Nota <em>opcional</em></label>
        <textarea class="input" id="mNote" maxlength="200" rows="2" placeholder="Sensaciones, series, material…">${mark ? esc(mark.note) : ''}</textarea></div>
      <div class="preview" id="mPrev"><span>Marca</span><b>—</b></div>
      <div class="actions">
        <button class="btn btn-primary" id="mSave">${mark ? 'Guardar cambios' : 'Guardar marca'}</button>
        ${mark ? `<button class="btn btn-danger" id="mDel">${icon('trash')}Eliminar marca</button>` : ''}
      </div>`);

    const val = id => { const el = b.querySelector('#' + id); return el ? num(el.value) : NaN; };
    function read() {
      if (ex.type === 'peso') {
        const kg = val('mKg'), reps = val('mReps');
        if (!(kg >= 0)) return null;
        if (!Number.isNaN(reps) && !(reps >= 0 && Number.isInteger(reps))) return null;
        return { kg, reps: Number.isNaN(reps) || reps === 0 ? null : reps };
      }
      if (ex.type === 'reps') {
        const reps = val('mReps');
        return reps >= 1 && Number.isInteger(reps) ? { reps } : null;
      }
      if (ex.type === 'tiempo') {
        const h = val('mH') || 0, m = val('mM') || 0, s = val('mS') || 0;
        if ([h, m, s].some(n => n < 0 || !Number.isFinite(n))) return null;
        const secs = Math.round(h * 3600 + m * 60 + s);
        return secs > 0 ? { secs } : null;
      }
      const v = val('mVal');
      if (Number.isNaN(v) || (ex.type === 'distancia' && v < 0)) return null;
      return { val: v };
    }
    function preview() {
      const data = read();
      const box = b.querySelector('#mPrev');
      if (!data) { box.className = 'preview'; box.innerHTML = '<span>Marca</span><b>—</b>'; return; }
      const cand = { ...data, id: mark ? mark.id : '_', date: '', ts: 0 };
      const others = ex.marks.filter(m => !mark || m.id !== mark.id);
      const rival = others.reduce((best, m) => (!best || better(ex, m, best)) ? m : best, null);
      const isPR = rival && better(ex, cand, rival);
      box.className = 'preview' + (isPR ? ' pr' : '');
      box.innerHTML = `<span>${isPR ? `${icon('crown')} ¡Nuevo récord!` : rival ? `Récord: ${esc(markText(ex, rival))}` : 'Primera marca'}</span><b>${esc(markText(ex, cand))}</b>`;
    }
    preview();

    b.addEventListener('input', preview);
    bindSteppers(b, preview);

    b.querySelector('#mSave').onclick = () => {
      const data = read();
      if (!data) { toast('Revisa la marca: falta algún dato'); return; }
      const date = b.querySelector('#mDate').value || todayISO();
      const note = b.querySelector('#mNote').value.trim();
      const clean = { kg: null, reps: null, secs: null, val: null, ...data };

      if (mark) {
        Object.assign(mark, clean, { date, note });
        save(); closeSheet(); renderDetail(); renderHome();
        toast('Marca actualizada');
        return;
      }
      const prevBest = a.best;
      const created = { id: uid(), date, ts: Date.now(), note, ...clean };
      ex.marks.push(created);
      save(); closeSheet(); renderDetail(); renderHome();
      if (prevBest && better(ex, created, prevBest)) {
        celebrate();
        toast(`¡Nuevo récord! ${markText(ex, created)}`, { pr: true, ms: 3600 });
      } else {
        toast(prevBest ? 'Marca guardada' : 'Primera marca guardada');
      }
    };

    if (mark) b.querySelector('#mDel').onclick = () => {
      const idx = ex.marks.indexOf(mark);
      ex.marks.splice(idx, 1);
      save(); closeSheet(); renderDetail(); renderHome();
      toast('Marca eliminada', { action: 'Deshacer', onAction: () => { ex.marks.splice(idx, 0, mark); save(); renderDetail(); renderHome(); } });
    };
  }

  /* ═════════════ Peso corporal ═════════════ */
  const RANGES = [
    { id: '1m', label: '1M', days: 30 },
    { id: '3m', label: '3M', days: 91 },
    { id: '6m', label: '6M', days: 182 },
    { id: '1a', label: '1A', days: 365 },
    { id: 'all', label: 'Todo', days: 0 },
  ];
  let range = '3m';
  let calMonth = null; // primer día del mes que enseña el calendario
  const getWeight = date => state.weights.find(w => w.date === date);
  const sortWeights = () => state.weights.sort((a, b) => a.date.localeCompare(b.date));
  const signed = n => { const r = Math.round(n * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '') + fmtNum(Math.abs(r), 1); };

  function renderWeight() {
    renderWeightStats();
    renderCal();
    renderChart();
  }

  function renderWeightStats() {
    const ws = state.weights, first = ws[0], last = ws[ws.length - 1];
    $('#wStats').innerHTML = `
      <div class="stat hot"><b>${last ? `${fmtNum(last.kg, 1)}<small>kg</small>` : '—'}</b><span>Actual</span></div>
      <div class="stat"><b>${ws.length > 1 ? `${signed(last.kg - first.kg)}<small>kg</small>` : '—'}</b><span>Cambio</span></div>
      <div class="stat"><b>${ws.length}</b><span>${ws.length === 1 ? 'Día' : 'Días'}</span></div>`;
  }

  function renderCal() {
    const now = new Date(), today = todayISO();
    if (!calMonth) calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const y = calMonth.getFullYear(), mo = calMonth.getMonth();
    const isCurrent = y === now.getFullYear() && mo === now.getMonth();
    const byDate = new Map(state.weights.map(w => [w.date, w]));
    const offset = (new Date(y, mo, 1).getDay() + 6) % 7; // la semana empieza en lunes
    const days = new Date(y, mo + 1, 0).getDate();
    let cells = '<span></span>'.repeat(offset), n = 0;
    for (let d = 1; d <= days; d++) {
      const iso = `${y}-${pad(mo + 1)}-${pad(d)}`, w = byDate.get(iso);
      if (w) n++;
      cells += `<button class="cal-day${w ? ' has' : ''}${iso === today ? ' today' : ''}" data-date="${iso}"${iso > today ? ' disabled' : ''}
        aria-label="${d} de ${MONTHS_LONG[mo]}${w ? `, ${fmtNum(w.kg)} kg` : ''}"><b>${d}</b>${w ? `<span>${fmtNum(w.kg, 1)}</span>` : ''}</button>`;
    }
    $('#cal').innerHTML = `
      <div class="card-head">
        <div><h2 class="card-title">${MONTHS_LONG[mo]} <span>${y}</span></h2>
          <p class="card-sub">${n ? `${n} ${n === 1 ? 'día apuntado' : 'días apuntados'}` : 'Toca un día para apuntar tu peso'}</p></div>
        <div class="cal-nav">
          <button class="icon-btn" data-month="-1" aria-label="Mes anterior">${icon('back')}</button>
          <button class="icon-btn" data-month="1" aria-label="Mes siguiente"${isCurrent ? ' disabled' : ''}>${icon('chev')}</button>
        </div>
      </div>
      <div class="cal-week">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span>${d}</span>`).join('')}</div>
      <div class="cal-grid">${cells}</div>`;
  }

  function renderChart() {
    const ws = state.weights;
    const r = RANGES.find(x => x.id === range);
    const from = r.days ? isoOf(new Date(Date.now() - r.days * 86400000)) : '';
    const pts = ws.filter(w => w.date >= from);
    let sub;
    if (!ws.length) sub = 'Aquí verás cómo evoluciona tu peso';
    else if (pts.length > 1) sub = `${signed(pts[pts.length - 1].kg - pts[0].kg)} kg desde el ${fmtDate(pts[0].date)}`;
    else if (pts.length === 1) sub = 'Apunta otro día para ver la tendencia';
    else sub = 'Sin registros en este periodo';
    $('#chart').innerHTML = `
      <div class="card-head"><div><h2 class="card-title">Progreso</h2><p class="card-sub">${sub}</p></div></div>
      ${ws.length ? `<div class="seg seg-5">${RANGES.map(x => `<button class="${x.id === range ? 'on' : ''}" data-range="${x.id}">${x.label}</button>`).join('')}</div>` : ''}
      ${!ws.length ? '<p class="chart-empty">Toca un día del calendario y apunta tu peso. Con dos días apuntados empieza la gráfica.</p>'
        : pts.length ? '<div class="chart-wrap" id="chartWrap"></div>'
        : '<p class="chart-empty">No hay registros en este periodo. Prueba con un rango más largo.</p>'}`;
    const wrap = $('#chartWrap');
    if (wrap) drawChart(wrap, pts);
  }

  // Gráfica de línea en SVG: eje de fechas real (los huecos entre días se respetan)
  function drawChart(wrap, pts) {
    const W = Math.max(240, Math.round(wrap.clientWidth)), H = 200;
    const L = 38, R = 12, T = 26, B = 24;
    const ts = pts.map(p => parseISO(p.date).getTime());
    const t0 = ts[0], t1 = ts[ts.length - 1];
    let lo = Math.min(...pts.map(p => p.kg)), hi = Math.max(...pts.map(p => p.kg));
    const padV = Math.max((hi - lo) * 0.12, 0.4);
    lo -= padV; hi += padV;
    const step = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50].find(s => (hi - lo) / s <= 4) || 100;
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
    const X = t => t1 === t0 ? (L + W - R) / 2 : L + (t - t0) / (t1 - t0) * (W - L - R);
    const Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
    const dec = step < 1 ? 1 : 0;
    const tick = v => v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const f = n => n.toFixed(1);

    let grid = '';
    for (let i = 0, n = Math.round((hi - lo) / step); i <= n; i++) {
      const v = lo + i * step, y = f(Y(v));
      grid += `<line class="c-grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text class="c-ax" x="${L - 8}" y="${y}" dy="4" text-anchor="end">${tick(v)}</text>`;
    }

    const P = pts.map((p, i) => [X(ts[i]), Y(p.kg)]);
    const line = P.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('');
    const base = H - B;
    const area = P.length > 1 ? `${line}L${f(P[P.length - 1][0])} ${base}L${f(P[0][0])} ${base}Z` : '';
    const dots = P.length <= 24 ? P.slice(0, -1).map(([x, y]) => `<circle class="c-dot" cx="${f(x)}" cy="${f(y)}" r="4"/>`).join('') : '';

    // Valor al final de la línea, sin salirse por los bordes
    const [lx, ly] = P[P.length - 1];
    const anchor = lx > W - R - 28 ? 'end' : lx < L + 28 ? 'start' : 'middle';
    const endX = anchor === 'end' ? lx + 5 : anchor === 'start' ? lx - 5 : lx;
    const endY = ly - 12 < 16 ? ly + 26 : ly - 12;

    const dateLbl = t => { const d = new Date(t); return fmtDate(isoOf(d)); };
    let xl = '';
    if (t1 === t0) xl = `<text class="c-ax" x="${f(X(t0))}" y="${H - 5}" text-anchor="middle">${dateLbl(t0)}</text>`;
    else {
      xl = `<text class="c-ax" x="${L}" y="${H - 5}" text-anchor="start">${dateLbl(t0)}</text>`
        + `<text class="c-ax" x="${W - R}" y="${H - 5}" text-anchor="end">${dateLbl(t1)}</text>`;
      if (W >= 300 && t1 - t0 > 6 * 86400000) xl += `<text class="c-ax" x="${f((L + W - R) / 2)}" y="${H - 5}" text-anchor="middle">${dateLbl((t0 + t1) / 2)}</text>`;
    }

    const a = pts[0], z = pts[pts.length - 1];
    const label = pts.length > 1
      ? `Peso: de ${fmtNum(a.kg)} kg el ${fmtDate(a.date)} a ${fmtNum(z.kg)} kg el ${fmtDate(z.date)}`
      : `Peso: ${fmtNum(z.kg)} kg el ${fmtDate(z.date)}`;
    wrap.innerHTML = `
      <svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
        <defs><linearGradient id="wArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="c-area-top"/><stop offset="1" class="c-area-bot"/></linearGradient></defs>
        ${grid}
        ${area ? `<path d="${area}" fill="url(#wArea)"/><path class="c-line" d="${line}"/>` : ''}
        ${dots}
        <circle class="c-dot" cx="${f(lx)}" cy="${f(ly)}" r="5"/>
        <text class="c-end" x="${f(endX)}" y="${f(endY)}" text-anchor="${anchor}">${fmtNum(z.kg)}</text>
        ${xl}
        <g class="c-hover" visibility="hidden"><line class="c-cross" y1="${T - 8}" y2="${base}"/><circle class="c-dot" r="5"/></g>
      </svg>
      <div class="tip"></div>`;

    // Tocar o arrastrar sobre la gráfica: línea vertical en el día más cercano + su peso
    const svg = wrap.querySelector('svg'), tip = wrap.querySelector('.tip');
    const hov = svg.querySelector('.c-hover'), cross = hov.querySelector('line'), dot = hov.querySelector('circle');
    let hideTimer = null;
    function show(e) {
      clearTimeout(hideTimer);
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) * W / rect.width;
      let i = 0;
      for (let k = 1; k < P.length; k++) if (Math.abs(P[k][0] - x) < Math.abs(P[i][0] - x)) i = k;
      const [px, py] = P[i];
      cross.setAttribute('x1', f(px)); cross.setAttribute('x2', f(px));
      dot.setAttribute('cx', f(px)); dot.setAttribute('cy', f(py));
      hov.setAttribute('visibility', 'visible');
      const val = document.createElement('b');
      val.textContent = `${fmtNum(pts[i].kg)} kg`;
      tip.replaceChildren(val, document.createTextNode(fmtDate(pts[i].date)));
      tip.classList.add('show');
      wrap.classList.add('scrub');
      const half = tip.offsetWidth / 2, left = px * rect.width / W;
      tip.style.left = `${Math.min(Math.max(left, half), rect.width - half)}px`;
    }
    function hide() {
      hov.setAttribute('visibility', 'hidden');
      tip.classList.remove('show');
      wrap.classList.remove('scrub');
    }
    svg.addEventListener('pointerdown', e => { try { svg.setPointerCapture(e.pointerId); } catch { /* nada */ } show(e); });
    svg.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) show(e); });
    svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hide(); });
    const later = e => { if (e.pointerType !== 'mouse') { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 1800); } };
    svg.addEventListener('pointerup', later);
    svg.addEventListener('pointercancel', later);
  }

  /* ═════════════ Formulario de peso ═════════════ */
  function weightForm(date) {
    const entry = getWeight(date);
    const before = state.weights.filter(w => w.date < date);
    const prev = before[before.length - 1] || null;
    const base = entry || prev || state.weights[state.weights.length - 1] || null; // parte del último peso conocido
    const d = parseISO(date);
    const when = `${DAYS_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` de ${d.getFullYear()}` : ''}`;
    const b = openSheet(`${sheetHead(entry ? 'Editar peso' : 'Apuntar peso', when)}
      ${stepper('wKg', 'Peso <em>kg</em>', inputNum(base ? base.kg : null), 0.1)}
      <div class="preview" id="wPrev"><span>Peso</span><b>—</b></div>
      <div class="actions">
        <button class="btn btn-primary" id="wSave">${entry ? 'Guardar cambios' : 'Guardar peso'}</button>
        ${entry ? `<button class="btn btn-danger" id="wDel">${icon('trash')}Eliminar registro</button>` : ''}
      </div>`);

    const input = b.querySelector('#wKg');
    const read = () => { const kg = num(input.value); return kg > 0 && kg < 500 ? Math.round(kg * 100) / 100 : null; };
    function preview() {
      const kg = read(), box = b.querySelector('#wPrev');
      if (kg === null) { box.innerHTML = '<span>Peso</span><b>—</b>'; return; }
      box.innerHTML = prev
        ? `<span>Desde el ${fmtDate(prev.date)}</span><b>${signed(kg - prev.kg)} kg</b>`
        : `<span>Primer registro</span><b>${fmtNum(kg)} kg</b>`;
    }
    preview();
    input.addEventListener('input', preview);
    bindSteppers(b, preview);

    function saveWeight() {
      const kg = read();
      if (kg === null) { toast('Pon un peso válido'); input.focus(); return; }
      if (entry) entry.kg = kg;
      else { state.weights.push({ date, kg }); sortWeights(); }
      save(); closeSheet(); renderWeight();
      toast(entry ? 'Peso actualizado' : 'Peso guardado');
    }
    b.querySelector('#wSave').onclick = saveWeight;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveWeight(); } });

    if (entry) b.querySelector('#wDel').onclick = () => {
      state.weights = state.weights.filter(w => w !== entry);
      save(); closeSheet(); renderWeight();
      toast('Registro eliminado', {
        action: 'Deshacer',
        onAction: () => { if (!getWeight(entry.date)) { state.weights.push(entry); sortWeights(); save(); renderWeight(); } },
      });
    };
  }

  /* ═════════════ Ajustes ═════════════ */
  function settings() {
    const inUse = id => state.exercises.filter(e => e.cat === id).length;
    const backupText = state.lastBackup
      ? `Última copia: ${relDate(isoOf(new Date(state.lastBackup)))}`
      : 'Aún no has hecho ninguna copia';
    const b = openSheet(`${sheetHead('Ajustes')}
      <div class="field"><label class="lbl" for="sName">Tu nombre</label>
        <input class="input" id="sName" maxlength="40" autocomplete="off" value="${esc(state.name)}" placeholder="Nombre"></div>

      <div class="field"><span class="lbl">Categorías <em>toca el color para cambiarlo</em></span>
        <div class="group" id="sCats"></div>
        <button class="btn btn-ghost" id="sCatAdd" style="height:48px;font-size:15px">${icon('plus')}Añadir categoría</button>
      </div>

      <div class="field"><span class="lbl">Copia de seguridad</span>
        <div class="group">
          <button class="link-row" id="sExport">${icon('download')}<div><b>Guardar copia</b><span>Un archivo con tus ejercicios, marcas y peso</span></div>${icon('chev')}</button>
          <button class="link-row" id="sImport">${icon('upload')}<div><b>Recuperar copia</b><span>Sustituye los datos por los de un archivo</span></div>${icon('chev')}</button>
        </div>
        <p class="hint"><b style="color:var(--muted)">${backupText}.</b> Los datos se guardan solo en este móvil. Si cambias de móvil o borras el navegador, recupéralos con la copia.</p>
      </div>

      <div class="group">
        <button class="link-row danger" id="sWipe">${icon('trash')}<div><b>Borrar todo</b><span>Ejercicios, marcas, categorías y peso</span></div>${icon('chev')}</button>
      </div>
      <p class="about">Sport Marks · v${VERSION}</p>`);

    function drawCats() {
      b.querySelector('#sCats').innerHTML = state.categories.length ? state.categories.map(c => {
        const n = inUse(c.id);
        return `<div class="row" data-id="${esc(c.id)}">
          <button class="dot" style="--c:${c.color}" data-color aria-label="Cambiar color"></button>
          <input class="input" value="${esc(c.name)}" maxlength="30" aria-label="Nombre de la categoría">
          <div style="display:flex;align-items:center">${n ? `<small>${n}</small>` : ''}<button class="del" data-del aria-label="Eliminar categoría">${icon('trash')}</button></div>
        </div>`;
      }).join('') : '<p class="hint" style="padding:10px;margin:0">No hay categorías</p>';
    }
    drawCats();

    const nameIn = b.querySelector('#sName');
    nameIn.addEventListener('input', () => { state.name = nameIn.value; save(); renderHome(); });

    b.querySelector('#sCats').addEventListener('input', e => {
      const row = e.target.closest('.row');
      const cat = row && state.categories.find(c => c.id === row.dataset.id);
      if (!cat) return;
      cat.name = e.target.value;
      save(); renderHome();
    });
    b.querySelector('#sCats').addEventListener('focusout', e => {
      const row = e.target.closest('.row');
      const cat = row && state.categories.find(c => c.id === row.dataset.id);
      if (cat && !cat.name.trim()) { cat.name = 'Sin nombre'; e.target.value = cat.name; save(); renderHome(); }
    });
    b.querySelector('#sCats').addEventListener('click', e => {
      const row = e.target.closest('.row');
      const cat = row && state.categories.find(c => c.id === row.dataset.id);
      if (!cat) return;
      if (e.target.closest('[data-color]')) {
        cat.color = PALETTE[(PALETTE.indexOf(cat.color) + 1) % PALETTE.length];
        e.target.closest('[data-color]').style.setProperty('--c', cat.color);
        save(); renderHome();
      } else if (e.target.closest('[data-del]')) {
        const n = inUse(cat.id);
        const remove = () => {
          state.categories = state.categories.filter(c => c !== cat);
          state.exercises.forEach(ex => { if (ex.cat === cat.id) ex.cat = null; });
          save(); renderHome();
        };
        if (!n) { remove(); drawCats(); return; }
        confirmSheet({
          title: '¿Eliminar categoría?',
          text: `${n === 1 ? 'Su ejercicio pasará' : `Sus ${n} ejercicios pasarán`} a «Sin categoría». No se borra ninguna marca.`,
          onOk: () => { remove(); settings(); },
          onCancel: settings,
        });
      }
    });
    b.querySelector('#sCatAdd').onclick = () => {
      state.categories.push({ id: uid(), name: 'Nueva', color: PALETTE[state.categories.length % PALETTE.length] });
      save(); renderHome(); drawCats();
      const inputs = $$('#sCats .input', b);
      const last = inputs[inputs.length - 1];
      last.focus(); last.select();
    };
    b.querySelector('#sExport').onclick = exportData;
    b.querySelector('#sImport').onclick = () => $('#importFile').click();
    b.querySelector('#sWipe').onclick = () => confirmSheet({
      title: '¿Borrar todo?',
      text: 'Se eliminarán todos los ejercicios, marcas, categorías y registros de peso de este móvil. Si no tienes copia, no se pueden recuperar.',
      ok: 'Borrar todo',
      onCancel: settings,
      onOk: () => { state = defaults(); save(); filter = 'all'; goHomeIfDetail(); renderHome(); renderWeight(); toast('Datos borrados'); },
    });
  }

  function goHomeIfDetail() { if (currentId) goHome(); }

  async function exportData() {
    const json = JSON.stringify({ app: 'sportmarks', exportedAt: new Date().toISOString(), ...state }, null, 2);
    const name = `sport-marks-${todayISO()}.json`;
    const done = () => { state.lastBackup = Date.now(); save(); };
    let file = null;
    try { file = new File([json], name, { type: 'application/json' }); } catch { /* navegadores antiguos */ }
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && (isIOS || /android/i.test(navigator.userAgent))) {
      try { await navigator.share({ files: [file], title: 'Copia de Sport Marks' }); done(); settings(); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    done(); settings();
    toast('Copia descargada');
  }

  $('#importFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let data = null;
    try { data = normalize(JSON.parse(await file.text())); } catch { data = null; }
    if (!data) { toast('Ese archivo no es una copia de Sport Marks'); return; }
    const marks = data.exercises.reduce((n, ex) => n + ex.marks.length, 0);
    const days = data.weights.length;
    const what = [
      `${data.exercises.length} ${data.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}`,
      `${marks} ${marks === 1 ? 'marca' : 'marcas'}`,
      ...(days ? [`${days} ${days === 1 ? 'día' : 'días'} de peso`] : []),
    ];
    confirmSheet({
      title: '¿Recuperar copia?',
      text: `La copia tiene ${what.slice(0, -1).join(', ')} y ${what[what.length - 1]}. Sustituirá lo que hay ahora en la app.`,
      ok: 'Recuperar',
      onCancel: settings,
      onOk: () => { state = data; save(); filter = 'all'; goHomeIfDetail(); renderHome(); renderWeight(); toast('Copia recuperada'); },
    });
  });

  /* ═════════════ Avisos y celebración ═════════════ */
  let toastTimer = null;
  function toast(msg, { action, onAction, pr = false, ms = 2600 } = {}) {
    const t = $('#toast');
    t.className = 'toast' + (pr ? ' pr' : '');
    t.innerHTML = `<span class="t-msg">${pr ? icon('crown') : ''}${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
    if (action) t.querySelector('button').onclick = () => { hideToast(); onAction(); };
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 5000 : ms);
  }
  function hideToast() { $('#toast').classList.remove('show'); }

  function celebrate() {
    if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = $('#confetti');
    const colors = ['#D4FF3A', '#FFFFFF', '#36C2FF', '#FF5A36', '#FFB020', '#B78BFF'];
    let h = '';
    for (let i = 0; i < 54; i++) {
      const ang = Math.random() * Math.PI * 2, dist = 110 + Math.random() * 240;
      const x = Math.cos(ang) * dist, y = Math.sin(ang) * dist - 160;
      h += `<i style="--k:${colors[i % colors.length]};--x:${x.toFixed(0)}px;--y:${y.toFixed(0)}px;--r:${(Math.random() * 900 - 450).toFixed(0)}deg;animation-delay:${(Math.random() * 90).toFixed(0)}ms"></i>`;
    }
    box.innerHTML = h;
    setTimeout(() => { box.innerHTML = ''; }, 1500);
  }

  /* ═════════════ Páginas: Marcas ⇄ Peso (se desliza o se toca la pestaña) ═════════════ */
  const pager = $('#pager'), tabbar = $('#tabbar');
  let page = 0, pagerRaf = 0;
  function syncTabs() {
    pagerRaf = 0;
    const p = Math.min(1, Math.max(0, pager.scrollLeft / (pager.clientWidth || 1)));
    tabbar.style.setProperty('--p', p.toFixed(3)); // el fondo de la pestaña sigue al dedo
    const now = Math.round(p);
    if (now === page) return;
    page = now;
    $$('.tab', tabbar).forEach((t, i) => {
      t.classList.toggle('on', i === page);
      if (i === page) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
  }
  pager.addEventListener('scroll', () => { if (!pagerRaf) pagerRaf = requestAnimationFrame(syncTabs); }, { passive: true });
  tabbar.addEventListener('click', e => {
    const t = e.target.closest('[data-page]');
    if (!t) return;
    const i = Number(t.dataset.page);
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (i === page) $$('.page-scroll')[i].scrollTo({ top: 0, behavior }); // tocar la pestaña activa sube arriba
    else pager.scrollTo({ left: i * pager.clientWidth, behavior });
  });
  let lastWidth = innerWidth;
  addEventListener('resize', () => {
    pager.scrollLeft = page * pager.clientWidth;
    if (innerWidth !== lastWidth) { lastWidth = innerWidth; renderChart(); }
  });

  $('#cal').addEventListener('click', e => {
    const m = e.target.closest('[data-month]');
    if (m) { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + Number(m.dataset.month), 1); renderCal(); return; }
    const d = e.target.closest('[data-date]');
    if (d && !d.disabled) weightForm(d.dataset.date);
  });
  $('#chart').addEventListener('click', e => {
    const r = e.target.closest('[data-range]');
    if (r) { range = r.dataset.range; renderChart(); }
  });

  /* ═════════════ Eventos globales ═════════════ */
  $('#fab').addEventListener('click', () => exerciseForm());
  $$('[data-settings]').forEach(b => b.addEventListener('click', settings));
  $('#search').addEventListener('input', e => { query = e.target.value; renderHome(); });
  $('#chips').addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if (!c) return;
    filter = c.dataset.f;
    renderHome(true);
  });
  $('#list').addEventListener('click', async e => {
    const card = e.target.closest('.ex-card');
    if (card) { goEx(card.dataset.id); return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'new-ex') exerciseForm();
    if (act.dataset.act === 'hide-install') { try { localStorage.setItem(KEY_INSTALL, '1'); } catch { /* nada */ } renderHome(); }
    if (act.dataset.act === 'install' && installEvent) {
      installEvent.prompt();
      try { await installEvent.userChoice; } catch { /* nada */ }
      installEvent = null; renderHome();
    }
  });

  const detail = $('#detail');
  detail.addEventListener('click', e => {
    const act = e.target.closest('[data-act]');
    if (act) {
      if (act.dataset.act === 'back') goHome();
      if (act.dataset.act === 'edit-ex') exerciseForm(currentId);
      if (act.dataset.act === 'new-mark') markForm(currentId);
      return;
    }
    const m = e.target.closest('[data-mark]');
    if (m) markForm(currentId, m.dataset.mark);
  });
  detail.addEventListener('scroll', () => {
    const bar = $('.d-bar', detail);
    if (bar) bar.classList.toggle('scrolled', detail.scrollTop > 60);
  }, { passive: true });

  // Deslizar desde el borde izquierdo para volver
  (() => {
    let x0 = null, y0 = 0, dx = 0, active = false;
    detail.addEventListener('touchstart', e => {
      const t = e.touches[0];
      if (t.clientX > 28) { x0 = null; return; }
      x0 = t.clientX; y0 = t.clientY; dx = 0; active = false;
    }, { passive: true });
    detail.addEventListener('touchmove', e => {
      if (x0 === null) return;
      const t = e.touches[0];
      dx = t.clientX - x0;
      if (!active && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(t.clientY - y0)) active = true;
      if (active) { detail.style.transition = 'none'; detail.style.transform = `translateX(${Math.max(0, dx)}px)`; }
    }, { passive: true });
    detail.addEventListener('touchend', () => {
      if (x0 === null) return;
      x0 = null;
      detail.style.transition = ''; detail.style.transform = '';
      if (active && dx > 90) goHome();
      active = false;
    });
  })();

  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; renderHome(); });
  addEventListener('appinstalled', () => { installEvent = null; renderHome(); });

  // Si cambia el día con la app abierta, refresca fechas relativas
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { renderHome(); renderWeight(); if (currentId) renderDetail(); }
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  route();
  renderHome(true);
  renderWeight();
})();
