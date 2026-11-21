'use strict';
/*
 * Nhật ký thời gian
 * Dữ liệu lưu ngay trên thiết bị (localStorage), không gửi đi đâu.
 *
 * Cấu trúc dữ liệu:
 *   types:   [{ id, name, emoji, kind: 'duration' | 'instant', enabled, color }]
 *   entries: [{ id, typeId, k: 'd' | 'i', start, end }]
 *            k = 'i' (việc nhanh): chỉ có start
 *            k = 'd' (có thời gian): end = null khi đang chạy
 */
(() => {
  const STORE_KEY = 'nktg-data-v1';
  const UI_KEY = 'nktg-ui-v1';
  const DAY = 86400000;
  const HOUR = 3600000;
  const PALETTE = ['#0a84ff', '#ff9f0a', '#34c759', '#ff375f', '#af52de', '#32ade6',
                   '#e5b800', '#a2845e', '#5856d6', '#ff6b4a', '#00b3a4', '#8e8e93'];

  const DEFAULT_TYPES = [
    ['work', 'Làm việc', '💼', 'duration'],
    ['study', 'Học', '📚', 'duration'],
    ['sleep', 'Giấc ngủ', '😴', 'duration'],
    ['nap', 'Ngủ trưa', '💤', 'duration'],
    ['meal', 'Ăn uống', '🍜', 'duration'],
    ['exercise', 'Vận động', '🏃', 'duration'],
    ['commute', 'Di chuyển', '🛵', 'duration'],
    ['phone', 'Lướt mạng', '📱', 'duration'],
    ['fun', 'Giải trí', '🎮', 'duration'],
    ['chores', 'Việc nhà', '🧹', 'duration'],
    ['read', 'Đọc sách', '📖', 'duration'],
    ['family', 'Gia đình', '👨‍👩‍👧', 'duration'],
    ['water', 'Uống nước', '💧', 'instant'],
    ['coffee', 'Cà phê', '☕', 'instant'],
    ['meds', 'Uống thuốc', '💊', 'instant'],
    ['wake', 'Thức dậy', '🌅', 'instant'],
    ['toilet', 'Đi vệ sinh', '🚻', 'instant'],
    ['mood', 'Tâm trạng tốt', '🙂', 'instant'],
    ['tired', 'Mệt mỏi', '🥱', 'instant'],
    ['snack', 'Ăn vặt', '🍪', 'instant'],
  ];

  const EMOJI_CHOICES = ['💼', '📚', '💻', '😴', '🍜', '🏃', '🏋️', '🧘', '🚗', '🛵', '📱', '🎮', '📺', '🎬',
    '🎧', '🎸', '📖', '✍️', '🧹', '🍳', '🛒', '👨‍👩‍👧', '💬', '❤️', '🚿', '🐶', '🌱', '🙏', '💧', '☕',
    '🍵', '💊', '🍺', '🚬', '🍪', '🙂', '😡', '🥱', '🤒', '🌅'];

  /* ============ Lưu trữ ============ */
  function freshData() {
    return {
      version: 1,
      types: DEFAULT_TYPES.map((t, i) => ({
        id: t[0], name: t[1], emoji: t[2], kind: t[3], enabled: true, color: PALETTE[i % PALETTE.length],
      })),
      entries: [],
      goals: [],
    };
  }
  function normalize(d) {
    if (!Array.isArray(d.goals)) d.goals = [];
    d.goals = d.goals.filter(g => g && typeof g.typeId === 'string' && (g.dir === 'min' || g.dir === 'max') && g.target > 0);
    return d;
  }
  function isValidData(d) {
    return d && Array.isArray(d.types) && Array.isArray(d.entries) &&
      d.types.every(t => t && typeof t.id === 'string' && typeof t.name === 'string' && (t.kind === 'duration' || t.kind === 'instant')) &&
      d.entries.every(e => e && typeof e.id === 'string' && typeof e.typeId === 'string' && typeof e.start === 'number' && (e.k === 'd' || e.k === 'i'));
  }
  function loadData() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (isValidData(d)) return normalize(d);
      }
    } catch (e) { /* bỏ qua, dùng dữ liệu mới */ }
    return freshData();
  }
  let db = loadData();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
    catch (e) { toast('⚠️ Không lưu được dữ liệu trên máy này'); }
  }
  const ui = (() => { try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (e) { return {}; } })();
  function saveUi() { try { localStorage.setItem(UI_KEY, JSON.stringify({ tab: state.tab, range: state.range, coachSeen: state.coachSeen })); } catch (e) { /* không sao */ } }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  /* ============ Tiện ích ============ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const pad = n => String(n).padStart(2, '0');
  const typeById = id => db.types.find(t => t.id === id);
  const typeOf = e => typeById(e.typeId) || { id: e.typeId, name: '(Đã xóa)', emoji: '❔', color: '#8e8e93', kind: e.k === 'i' ? 'instant' : 'duration' };

  function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function addDays(t, n) { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); }
  function startOfMonth(t) { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  const fmtTime = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtDayLong = t => cap(new Date(t).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  const fmtDayShort = t => { const d = new Date(t); return `${d.getDate()}/${d.getMonth() + 1}`; };
  function dayLabel(d0) {
    const today = startOfDay(Date.now());
    if (d0 === today) return 'Hôm nay';
    if (d0 === addDays(today, -1)) return 'Hôm qua';
    return fmtDayLong(d0);
  }
  function fmtDur(ms) {
    const m = Math.round(ms / 60000);
    if (m < 1) return 'dưới 1 phút';
    const h = Math.floor(m / 60), mm = m % 60;
    if (!h) return `${mm} phút`;
    return mm ? `${h} giờ ${mm} phút` : `${h} giờ`;
  }
  function fmtShort(ms) {
    const m = Math.round(ms / 60000);
    if (m < 60) return `${m}p`;
    return `${Math.floor(m / 60)}h${pad(m % 60)}`;
  }
  function fmtClock(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return h ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`;
  }
  const fmtNum = n => (Math.round(n * 10) / 10).toLocaleString('vi-VN');
  function toLocalInput(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromLocalInput(s) { const t = new Date(s).getTime(); return Number.isFinite(t) ? t : null; }
  function firstGrapheme(s) {
    s = (s || '').trim();
    if (!s) return '';
    if (window.Intl && Intl.Segmenter) {
      for (const g of new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(s)) return g.segment;
    }
    return Array.from(s)[0];
  }

  /* ============ Tính toán ============ */
  const running = () => db.entries.find(e => e.k === 'd' && e.end === null);
  function overlap(e, a, b, now) {
    const end = e.end === null ? now : e.end;
    return Math.max(0, Math.min(end, b) - Math.max(e.start, a));
  }
  function durTotals(a, b, now = Date.now()) {
    const m = new Map();
    for (const e of db.entries) {
      if (e.k !== 'd') continue;
      const v = overlap(e, a, b, now);
      if (v > 0) m.set(e.typeId, (m.get(e.typeId) || 0) + v);
    }
    return m;
  }
  function instCounts(a, b) {
    const m = new Map();
    for (const e of db.entries) if (e.k === 'i' && e.start >= a && e.start < b) m.set(e.typeId, (m.get(e.typeId) || 0) + 1);
    return m;
  }
  const sumMap = m => { let s = 0; for (const v of m.values()) s += v; return s; };
  const sortedByValue = m => Array.from(m.entries()).sort((x, y) => y[1] - x[1]);

  // Khoảng thời gian thống kê
  function rangeBounds() {
    const now = Date.now();
    const today = startOfDay(now);
    let from;
    if (state.range === 'all') {
      const min = db.entries.reduce((acc, e) => Math.min(acc, e.start), now);
      from = startOfDay(min);
    } else {
      from = addDays(today, -(state.range - 1));
    }
    let days = 0;
    for (let d = from; d < now; d = addDays(d, 1)) days++;
    return { from, to: now, days: Math.max(1, days) };
  }
  // Giờ hay xảy ra nhất (cho việc nhanh) -> "~8h50"
  function typicalTime(times) {
    if (!times.length) return null;
    const hours = new Array(24).fill(0);
    times.forEach(t => hours[new Date(t).getHours()]++);
    const peak = hours.indexOf(Math.max(...hours));
    const mins = times.filter(t => new Date(t).getHours() === peak).map(t => new Date(t).getMinutes());
    const avg = Math.round(mins.reduce((s, x) => s + x, 0) / mins.length);
    return `${peak}h${pad(avg)}`;
  }
  // Phân bố theo giờ trong ngày: phút (duration) hoặc số lần (instant)
  function hourDistribution(type, from, to) {
    const out = new Array(24).fill(0);
    const now = Date.now();
    for (const e of db.entries) {
      if (e.typeId !== type.id) continue;
      if (e.k === 'i') {
        if (e.start >= from && e.start < to) out[new Date(e.start).getHours()]++;
        continue;
      }
      let s = Math.max(e.start, from);
      const end = Math.min(e.end === null ? now : e.end, to);
      while (s < end) {
        const d = new Date(s);
        const next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1).getTime();
        const stop = Math.min(next, end);
        out[d.getHours()] += (stop - s) / 60000;
        s = stop;
      }
    }
    return out;
  }
  function dailySeries(type, from, to) {
    const out = [];
    const now = Date.now();
    for (let d = from; d < to; d = addDays(d, 1)) {
      const d1 = addDays(d, 1);
      let v = 0;
      for (const e of db.entries) {
        if (e.typeId !== type.id) continue;
        if (e.k === 'i') { if (e.start >= d && e.start < d1) v++; }
        else v += overlap(e, d, d1, now);
      }
      out.push({ day: d, v });
    }
    return out;
  }

  /* ============ Trạng thái giao diện ============ */
  const state = {
    tab: ['log', 'timeline', 'calendar', 'stats'].includes(ui.tab) ? ui.tab : 'log',
    range: [7, 30, 90, 'all'].includes(ui.range) ? ui.range : 7,
    calMonth: startOfMonth(Date.now()),
    calDay: startOfDay(Date.now()),
    tlDays: 7,
    renderedDay: startOfDay(Date.now()),
  };

  /* ============ Hành động ============ */
  function tapType(t, tileEl) {
    const now = Date.now();
    if (navigator.vibrate) navigator.vibrate(12);
    if (t.kind === 'instant') {
      const e = { id: uid(), typeId: t.id, k: 'i', start: now };
      db.entries.push(e);
      save();
      render();
      const fresh = $(`.tile[data-id="${CSS.escape(t.id)}"]`);
      if (fresh) { fresh.classList.add('flash'); }
      toast(`${t.emoji} Đã ghi ${t.name} lúc ${fmtTime(now)}`, () => removeEntry(e.id));
      return;
    }
    const cur = running();
    if (cur && cur.typeId === t.id) {
      cur.end = now;
      save();
      render();
      toast(`Đã dừng ${t.emoji} ${t.name} · ${fmtDur(now - cur.start)}`, () => { cur.end = null; save(); });
      return;
    }
    const e = { id: uid(), typeId: t.id, k: 'd', start: now, end: null };
    if (cur) cur.end = now;
    db.entries.push(e);
    save();
    render();
    const prev = cur ? typeOf(cur) : null;
    toast(prev ? `${prev.emoji} → ${t.emoji} Chuyển sang ${t.name}` : `${t.emoji} Bắt đầu ${t.name}`, () => {
      removeEntry(e.id, true);
      if (cur) cur.end = null;
      save();
    });
  }
  function stopRunning() {
    const cur = running();
    if (!cur) return;
    const t = typeOf(cur);
    cur.end = Date.now();
    save();
    render();
    toast(`Đã dừng ${t.emoji} ${t.name} · ${fmtDur(cur.end - cur.start)}`, () => { cur.end = null; save(); });
  }
  function removeEntry(id, silent) {
    db.entries = db.entries.filter(e => e.id !== id);
    if (!silent) save();
  }

  /* ============ Giao diện: Ghi nhận ============ */
  const ICON_SLIDERS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';

  function viewLog() {
    const now = Date.now();
    const d0 = startOfDay(now), d1 = addDays(d0, 1);
    const cur = running();
    const enabled = db.types.filter(t => t.enabled);
    const dur = enabled.filter(t => t.kind === 'duration');
    const ins = enabled.filter(t => t.kind === 'instant');
    const totals = durTotals(d0, d1, now);
    const counts = instCounts(d0, d1);
    const tracked = sumMap(totals);
    const elapsed = now - d0;

    let h = `<header class="page-head"><div><h1>Hôm nay</h1><p class="sub">${esc(fmtDayLong(now))}</p></div>
      <button class="round-btn" data-act="types" aria-label="Quản lý loại hoạt động">${ICON_SLIDERS}</button></header>`;

    if (cur) {
      const t = typeOf(cur);
      h += `<div class="now-card" style="--c:${t.color}">
        <span class="now-emoji">${t.emoji}</span>
        <div class="now-text"><span class="now-label">Đang làm</span><strong>${esc(t.name)}</strong><span class="now-since">từ ${fmtTime(cur.start)}</span></div>
        <span class="now-clock" data-since="${cur.start}">${fmtClock(now - cur.start)}</span>
        <button class="stop-btn" data-act="stop">Dừng</button></div>`;
    }

    const segs = sortedByValue(totals).map(([id, ms]) => {
      const t = typeById(id) || { color: '#8e8e93', name: '?' };
      return `<span style="--c:${t.color};width:${(ms / elapsed) * 100}%" title="${esc(t.name)}: ${fmtDur(ms)}"></span>`;
    }).join('');
    h += `<div class="today-card">
      <div class="today-top"><span>Đã ghi lại <strong class="num">${fmtShort(tracked)}</strong></span><span class="num">/ ${fmtShort(elapsed)} đã trôi qua</span></div>
      <div class="stack" role="img" aria-label="Đã ghi ${fmtDur(tracked)} trên ${fmtDur(elapsed)} của hôm nay">${segs}</div></div>`;

    if (!enabled.length) {
      h += `<div class="empty"><b>🫙</b>Chưa có loại hoạt động nào được bật.<br><button class="link-btn" data-act="types">Bật hoặc thêm hoạt động</button></div>`;
      return h;
    }
    if (dur.length) {
      h += `<h2 class="section-title">⏱ Có thời gian <span class="hint">bấm để bắt đầu / dừng</span></h2><div class="grid">`;
      h += dur.map(t => {
        const on = cur && cur.typeId === t.id;
        const tot = totals.get(t.id) || 0;
        const meta = on ? `<span class="tile-meta" data-since="${cur.start}">${fmtClock(now - cur.start)}</span>`
                        : `<span class="tile-meta">${tot >= 60000 ? fmtShort(tot) : ''}</span>`;
        return `<button class="tile${on ? ' on' : ''}" data-act="tap" data-id="${esc(t.id)}" style="--c:${t.color}" aria-pressed="${on ? 'true' : 'false'}">
          <span class="tile-emoji">${t.emoji}</span><span class="tile-name">${esc(t.name)}</span>${meta}</button>`;
      }).join('');
      h += `</div>`;
    }
    if (ins.length) {
      h += `<h2 class="section-title">⚡ Bấm nhanh <span class="hint">ghi lại thời điểm</span></h2><div class="grid">`;
      h += ins.map(t => {
        const c = counts.get(t.id) || 0;
        return `<button class="tile" data-act="tap" data-id="${esc(t.id)}" style="--c:${t.color}">
          <span class="tile-emoji">${t.emoji}</span><span class="tile-name">${esc(t.name)}</span><span class="tile-meta">${c ? '×' + c : ''}</span></button>`;
      }).join('');
      h += `</div>`;
    }
    return h;
  }

  /* ============ Giao diện: Dòng thời gian ============ */
  function entryRow(e) {
    const t = typeOf(e);
    let sub = '', right;
    if (e.k === 'i') {
      right = `<span class="num">${fmtTime(e.start)}</span>`;
    } else if (e.end === null) {
      sub = `Từ ${fmtTime(e.start)} · đang chạy`;
      right = `<span class="live num" style="--c:${t.color}" data-since="${e.start}">${fmtClock(Date.now() - e.start)}</span>`;
    } else {
      const nextDay = startOfDay(e.end) !== startOfDay(e.start) ? ' (hôm sau)' : '';
      sub = `${fmtTime(e.start)} – ${fmtTime(e.end)}${nextDay}`;
      right = `<strong class="num">${fmtShort(e.end - e.start)}</strong>`;
    }
    return `<button class="row" data-act="entry" data-id="${esc(e.id)}">
      <span class="avatar" style="--c:${t.color}">${t.emoji}</span>
      <span class="row-main"><span class="row-title">${esc(t.name)}</span>${sub ? `<span class="row-sub num">${sub}</span>` : ''}</span>
      <span class="row-right">${right}</span><span class="chev" aria-hidden="true">›</span></button>`;
  }

  function viewTimeline() {
    const now = Date.now();
    const today = startOfDay(now);
    const from = addDays(today, -(state.tlDays - 1));
    const list = db.entries.filter(e => e.start >= from || (e.k === 'd' && e.end === null)).sort((a, b) => b.start - a.start);
    let h = `<header class="page-head"><div><h1>Dòng thời gian</h1></div>
      <button class="round-btn" data-act="add" aria-label="Thêm thủ công">＋</button></header>`;
    if (!db.entries.length) {
      return h + `<div class="empty"><b>🕊️</b>Chưa có gì cả.<br>Vào <b style="display:inline;font-size:inherit">Ghi nhận</b> và bấm một nút để bắt đầu.</div>`;
    }
    const groups = new Map();
    for (const e of list) {
      const d = startOfDay(e.start);
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d).push(e);
    }
    if (!groups.size) h += `<div class="empty">Không có gì trong ${state.tlDays} ngày gần đây.</div>`;
    for (const [d, items] of groups) {
      const tracked = sumMap(durTotals(d, addDays(d, 1), now));
      h += `<h2 class="group-title">${esc(dayLabel(d))}<span>${tracked >= 60000 ? 'Đã ghi ' + fmtShort(tracked) : ''}</span></h2>
        <div class="card">${items.map(entryRow).join('')}</div>`;
    }
    if (db.entries.some(e => e.start < from)) {
      h += `<div class="btn-row"><button class="btn" data-act="more">Xem thêm 7 ngày trước</button></div>`;
    }
    return h;
  }

  /* ============ Giao diện: Lịch ============ */
  function daySummary(d0) {
    const d1 = addDays(d0, 1);
    const totals = sortedByValue(durTotals(d0, d1));
    const counts = sortedByValue(instCounts(d0, d1));
    if (!totals.length && !counts.length) return '';
    let h = '';
    if (totals.length) {
      const max = totals[0][1];
      h += `<div class="card">` + totals.map(([id, ms]) => {
        const t = typeById(id) || { emoji: '❔', name: '(Đã xóa)', color: '#8e8e93' };
        return `<div class="row-static"><span class="avatar" style="--c:${t.color}">${t.emoji}</span>
          <span class="row-main"><span class="row-title">${esc(t.name)}</span><span class="mini-bar" style="--c:${t.color}"><i style="width:${(ms / max) * 100}%"></i></span></span>
          <span class="row-right"><strong class="num">${fmtShort(ms)}</strong></span></div>`;
      }).join('') + `</div>`;
    }
    if (counts.length) {
      h += `<div class="card" style="margin-top:10px"><div class="chips">` + counts.map(([id, c]) => {
        const t = typeById(id) || { emoji: '❔', name: '(Đã xóa)' };
        return `<span class="chip">${t.emoji} ${esc(t.name)} ×${c}</span>`;
      }).join('') + `</div></div>`;
    }
    return h;
  }

  function viewCalendar() {
    const m = new Date(state.calMonth);
    const y = m.getFullYear(), mo = m.getMonth();
    const lead = (new Date(y, mo, 1).getDay() + 6) % 7;
    const daysIn = new Date(y, mo + 1, 0).getDate();
    const mStart = state.calMonth, mEnd = new Date(y, mo + 1, 1).getTime();
    const counts = new Map();
    for (const e of db.entries) {
      if (e.start >= mStart && e.start < mEnd) {
        const d = new Date(e.start).getDate();
        counts.set(d, (counts.get(d) || 0) + 1);
      }
    }
    const today = startOfDay(Date.now());
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span></span>';
    for (let i = 1; i <= daysIn; i++) {
      const ts = new Date(y, mo, i).getTime();
      const c = counts.get(i);
      const cls = ['cal-day', ts === state.calDay ? 'sel' : '', ts === today ? 'today' : '', ts > today ? 'future' : ''].join(' ');
      cells += `<button class="${cls}" data-act="calDay" data-day="${ts}" aria-label="Ngày ${i}${c ? ', ' + c + ' mục' : ''}"><span>${i}</span>${c ? `<small>${c}</small>` : '<small style="visibility:hidden">0</small>'}</button>`;
    }
    const monthTitle = cap(m.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }));
    const d0 = state.calDay, d1 = addDays(d0, 1);
    const dayEntries = db.entries.filter(e => e.start >= d0 && e.start < d1).sort((a, b) => b.start - a.start);

    let h = `<header class="page-head"><div><h1>Lịch</h1></div></header>
      <div class="cal-nav"><button data-act="calPrev" aria-label="Tháng trước">‹</button><h2>${esc(monthTitle)}</h2><button data-act="calNext" aria-label="Tháng sau">›</button></div>
      <div class="cal-week"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div>
      <div class="card cal-grid">${cells}</div>
      <h2 class="group-title">${esc(fmtDayLong(d0))}<span>${dayEntries.length} mục</span></h2>`;
    const sum = daySummary(d0);
    if (sum) h += sum;
    if (dayEntries.length) {
      h += `<h2 class="section-title">Chi tiết</h2><div class="card">${dayEntries.map(entryRow).join('')}</div>`;
    } else if (!sum) {
      h += `<div class="empty">Ngày này chưa ghi gì.</div>`;
    }
    h += `<div class="btn-row"><button class="btn" data-act="add" data-day="${d0}">＋ Thêm vào ngày này</button></div>`;
    return h;
  }

  /* ============ Giao diện: Thống kê ============ */
  function donutSvg(parts, centerTop, centerBottom) {
    const total = parts.reduce((s, p) => s + p.v, 0) || 1;
    const r = 52, c = 2 * Math.PI * r;
    let off = 0;
    const gap = parts.length > 1 ? 1.5 : 0;
    const arcs = parts.map(p => {
      const len = (p.v / total) * c;
      const seg = `<circle r="${r}" cx="66" cy="66" fill="none" stroke="${p.color}" stroke-width="20"
        stroke-dasharray="${Math.max(0, len - gap)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 66 66)"><title>${esc(p.label)}</title></circle>`;
      off += len;
      return seg;
    }).join('');
    return `<svg class="donut" viewBox="0 0 132 132" role="img" aria-label="Biểu đồ phân bổ thời gian">
      <circle r="${r}" cx="66" cy="66" fill="none" stroke="var(--fill)" stroke-width="20"/>${arcs}
      <text x="66" y="63" text-anchor="middle" font-size="17" font-weight="700">${esc(centerTop)}</text>
      <text x="66" y="81" text-anchor="middle" font-size="11" style="fill:var(--muted)">${esc(centerBottom)}</text></svg>`;
  }

  function viewStats() {
    const { from, to, days } = rangeBounds();
    const seg = [[7, '7 ngày'], [30, '30 ngày'], [90, '90 ngày'], ['all', 'Tất cả']].map(([v, l]) =>
      `<button data-act="range" data-r="${v}" aria-pressed="${state.range === v}">${l}</button>`).join('');
    let h = `<header class="page-head"><div><h1>Thống kê</h1></div></header><div class="seg" role="group" aria-label="Khoảng thời gian">${seg}</div>`;
    if (!db.entries.length) return h + `<div class="empty"><b>📊</b>Ghi lại vài ngày, thống kê sẽ hiện ở đây.</div>`;

    // --- Có thời gian
    const totals = sortedByValue(durTotals(from, to));
    const tracked = totals.reduce((s, [, v]) => s + v, 0);
    h += `<h2 class="section-title">⏱ Thời gian đã dành <span class="hint">trung bình / ngày</span></h2>`;
    if (totals.length) {
      const top = totals.slice(0, 7);
      const rest = totals.slice(7).reduce((s, [, v]) => s + v, 0);
      const parts = top.map(([id, v]) => { const t = typeById(id) || { name: '?', color: '#8e8e93' }; return { v, color: t.color, label: `${t.name}: ${fmtDur(v)}` }; });
      if (rest) parts.push({ v: rest, color: '#8e8e93', label: `Khác: ${fmtDur(rest)}` });
      const legend = top.map(([id, v]) => {
        const t = typeById(id) || { name: '(Đã xóa)', color: '#8e8e93' };
        return `<div style="--c:${t.color}"><i></i><span>${esc(t.name)}</span><b>${Math.round((v / tracked) * 100)}%</b></div>`;
      }).join('') + (rest ? `<div style="--c:#8e8e93"><i></i><span>Khác</span><b>${Math.round((rest / tracked) * 100)}%</b></div>` : '');
      const untrackedAvg = Math.max(0, (to - from - tracked) / days);
      h += `<div class="card"><div class="donut-wrap">${donutSvg(parts, fmtShort(tracked / days), 'mỗi ngày')}<div class="legend">${legend}</div></div>
        <p class="note">Trung bình mỗi ngày còn khoảng <b>${fmtShort(untrackedAvg)}</b> chưa được ghi lại.</p></div>
        <div class="card" style="margin-top:10px">` + totals.map(([id, v]) => {
          const t = typeById(id) || { id, name: '(Đã xóa)', emoji: '❔', color: '#8e8e93' };
          return `<button class="row" data-act="statType" data-id="${esc(id)}"><span class="avatar" style="--c:${t.color}">${t.emoji}</span>
            <span class="row-main"><span class="row-title">${esc(t.name)}</span><span class="row-sub num">Tổng ${fmtShort(v)}</span></span>
            <span class="row-right"><span class="accent num">${fmtShort(v / days)}</span><small>/ ngày</small></span><span class="chev" aria-hidden="true">›</span></button>`;
        }).join('') + `</div>`;
    } else {
      h += `<div class="card"><p class="note" style="padding-top:14px">Chưa có hoạt động có thời gian nào trong khoảng này.</p></div>`;
    }

    // --- Bấm nhanh
    const counts = sortedByValue(instCounts(from, to));
    if (counts.length) {
      h += `<h2 class="section-title">⚡ Bấm nhanh <span class="hint">số lần / ngày</span></h2><div class="card">` + counts.map(([id, c]) => {
        const t = typeById(id) || { id, name: '(Đã xóa)', emoji: '❔', color: '#8e8e93' };
        const times = db.entries.filter(e => e.typeId === id && e.k === 'i' && e.start >= from && e.start < to).map(e => e.start);
        const tt = typicalTime(times);
        return `<button class="row" data-act="statType" data-id="${esc(id)}"><span class="avatar" style="--c:${t.color}">${t.emoji}</span>
          <span class="row-main"><span class="row-title">${esc(t.name)}</span><span class="row-sub num">${c} lần${tt ? ' · hay vào lúc ~' + tt : ''}</span></span>
          <span class="row-right"><span class="accent num">${fmtNum(c / days)}</span><small>/ ngày</small></span><span class="chev" aria-hidden="true">›</span></button>`;
      }).join('') + `</div>`;
    }
    return h;
  }

  function barChart(values, opts) {
    const W = 320, H = 136, top = 18, bottom = 18, left = 2, right = 2;
    const n = values.length;
    const max = Math.max(...values, 0) || 1;
    const bw = (W - left - right) / n;
    const gap = n > 40 ? 0.5 : Math.min(3, bw * 0.25);
    const bars = values.map((v, i) => {
      const hh = (v / max) * (H - top - bottom);
      const x = left + i * bw + gap / 2;
      return `<rect x="${x.toFixed(2)}" y="${(H - bottom - hh).toFixed(2)}" width="${Math.max(0.6, bw - gap).toFixed(2)}" height="${Math.max(v > 0 ? 1.5 : 0, hh).toFixed(2)}" rx="${Math.min(3, (bw - gap) / 2).toFixed(2)}" fill="${opts.color}"><title>${esc(opts.title(i, v))}</title></rect>`;
    }).join('');
    const labels = opts.ticks.map(i => {
      const x = left + i * bw + bw / 2;
      const anchor = i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle');
      const xx = anchor === 'start' ? left : anchor === 'end' ? W - right : x;
      return `<text class="axis" x="${xx.toFixed(1)}" y="${H - 4}" text-anchor="${anchor}">${esc(opts.label(i))}</text>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria)}">
      <line class="grid-line" x1="0" x2="${W}" y1="${H - bottom + 0.5}" y2="${H - bottom + 0.5}"/>
      <text class="axis" x="${W - right}" y="10" text-anchor="end">${esc(opts.maxLabel(max))}</text>${bars}${labels}</svg>`;
  }

  function openTypeStats(id) {
    const t = typeById(id) || { id, name: '(Đã xóa)', emoji: '❔', color: '#8e8e93', kind: 'duration' };
    const { from, to, days } = rangeBounds();
    const isDur = t.kind === 'duration';
    let series = dailySeries(t, from, to);
    if (series.length > 120) series = series.slice(-120);
    const vals = series.map(s => isDur ? s.v / HOUR : s.v);
    const total = series.reduce((s, x) => s + x.v, 0);
    const activeDays = series.filter(s => s.v > 0).length;
    const hours = hourDistribution(t, from, to);
    const n = vals.length;
    const ticks = n <= 1 ? [0] : [0, n - 1];
    if (n > 8) ticks.splice(1, 0, Math.floor((n - 1) / 2));

    let kpi;
    if (isDur) {
      kpi = `<div class="kpi"><small>Trung bình / ngày</small><b>${fmtShort(total / days)}</b></div>
        <div class="kpi"><small>Tổng</small><b>${fmtShort(total)}</b></div>
        <div class="kpi"><small>Số ngày có làm</small><b>${activeDays} / ${days}</b></div>
        <div class="kpi"><small>Trung bình ngày có làm</small><b>${activeDays ? fmtShort(total / activeDays) : '–'}</b></div>`;
    } else {
      const times = db.entries.filter(e => e.typeId === t.id && e.k === 'i' && e.start >= from && e.start < to).map(e => e.start);
      kpi = `<div class="kpi"><small>Trung bình / ngày</small><b>${fmtNum(total / days)} lần</b></div>
        <div class="kpi"><small>Tổng</small><b>${total} lần</b></div>
        <div class="kpi"><small>Số ngày có ghi</small><b>${activeDays} / ${days}</b></div>
        <div class="kpi"><small>Hay vào lúc</small><b>${typicalTime(times) ? '~' + typicalTime(times) : '–'}</b></div>`;
    }
    const daily = barChart(vals, {
      color: t.color, ticks, aria: 'Biểu đồ theo ngày',
      label: i => fmtDayShort(series[i].day),
      title: (i, v) => `${fmtDayShort(series[i].day)}: ${isDur ? fmtDur(v * HOUR) : v + ' lần'}`,
      maxLabel: m => isDur ? fmtShort(m * HOUR) : `${fmtNum(m)} lần`,
    });
    const hourly = barChart(hours, {
      color: t.color, ticks: [0, 6, 12, 18, 23], aria: 'Biểu đồ theo giờ trong ngày',
      label: i => `${i}h`,
      title: (i, v) => `${i}h–${i + 1}h: ${isDur ? fmtDur(v * 60000) : v + ' lần'}`,
      maxLabel: m => isDur ? fmtShort(m * 60000) : `${fmtNum(m)} lần`,
    });
    const body = `<div class="kpis">${kpi}</div>
      <div class="card chart-card" style="margin-top:12px"><h3>Theo ngày</h3>${daily}</div>
      <div class="card chart-card" style="margin-top:12px"><h3>${isDur ? 'Thường làm vào giờ nào' : 'Thường xảy ra vào giờ nào'}</h3>${hourly}</div>`;
    openSheet(`${t.emoji} ${t.name}`, body);
  }

  /* ============ Sheet (cửa sổ trượt lên) ============ */
  let sheetCleanup = null;
  function openSheet(title, bodyHtml, onMount) {
    const root = $('#sheet-root');
    $('#toast').classList.remove('show');
    root.innerHTML = `<div class="backdrop" data-close></div>
      <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <header class="sheet-head"><button class="pill" data-close>Đóng</button><h2>${esc(title)}</h2><span></span></header>
        <div class="sheet-body">${bodyHtml}</div></section>`;
    requestAnimationFrame(() => root.classList.add('open'));
    root.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeSheet));
    if (onMount) sheetCleanup = onMount($('.sheet', root)) || null;
  }
  function closeSheet() {
    const root = $('#sheet-root');
    root.classList.remove('open');
    if (typeof sheetCleanup === 'function') sheetCleanup();
    sheetCleanup = null;
    setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 260);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#sheet-root').classList.contains('open')) closeSheet(); });

  /* ---- Sửa / thêm một mục ---- */
  function openEntryForm(entry, defaultDay) {
    const isNew = !entry;
    const now = Date.now();
    let start, end;
    if (isNew) {
      if (defaultDay !== undefined && defaultDay !== startOfDay(now)) {
        start = defaultDay + 9 * HOUR; end = start + HOUR;
      } else {
        end = now; start = now - 30 * 60000;
      }
    }
    const types = db.types.filter(t => isNew ? t.enabled : (t.kind === typeOf(entry).kind || t.id === entry.typeId));
    const selId = isNew ? (types[0] && types[0].id) : entry.typeId;
    const opts = types.map(t => `<option value="${esc(t.id)}" ${t.id === selId ? 'selected' : ''}>${t.emoji} ${esc(t.name)}${isNew ? (t.kind === 'duration' ? ' ⏱' : ' ⚡') : ''}</option>`).join('');
    const isRunning = entry && entry.k === 'd' && entry.end === null;
    const body = `<form id="entry-form" novalidate>
      <label class="field"><span>Hoạt động</span><select class="input" name="type">${opts}</select></label>
      <label class="field"><span data-start-label>Bắt đầu</span><input class="input" type="datetime-local" name="start" value="${toLocalInput(isNew ? start : entry.start)}" required></label>
      <div data-end-wrap>
        ${isRunning ? `<label class="check"><input type="checkbox" name="running" checked> Vẫn đang làm (chưa kết thúc)</label>` : ''}
        <label class="field" data-end-field><span>Kết thúc</span><input class="input" type="datetime-local" name="end" value="${toLocalInput(isNew ? end : (entry.end || now))}"></label>
      </div>
      <p class="err" data-err></p>
      <div class="btn-row">
        <button class="btn primary" type="submit">${isNew ? 'Thêm' : 'Lưu'}</button>
        ${isNew ? '' : '<button class="btn danger" type="button" data-del>Xóa mục này</button>'}
      </div></form>`;
    openSheet(isNew ? 'Thêm thủ công' : 'Sửa', body, sheet => {
      const f = $('#entry-form', sheet);
      const kindOf = () => (typeById(f.type.value) || {}).kind;
      const sync = () => {
        const dur = kindOf() === 'duration';
        $('[data-end-wrap]', sheet).hidden = !dur;
        $('[data-start-label]', sheet).textContent = dur ? 'Bắt đầu' : 'Thời điểm';
        if (f.running) $('[data-end-field]', sheet).hidden = f.running.checked;
      };
      f.type.addEventListener('change', sync);
      if (f.running) f.running.addEventListener('change', sync);
      sync();
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        const err = $('[data-err]', sheet);
        const t = typeById(f.type.value);
        if (!t) { err.textContent = 'Hãy chọn một hoạt động.'; return; }
        const keep = (val, orig) => (entry && orig != null && val === toLocalInput(orig)) ? orig : fromLocalInput(val);
        const s = keep(f.start.value, entry && entry.start);
        if (s == null) { err.textContent = 'Thời gian bắt đầu chưa đúng.'; return; }
        let e2 = null;
        const stillRunning = f.running && f.running.checked;
        if (t.kind === 'duration' && !stillRunning) {
          e2 = keep(f.end.value, entry && entry.end);
          if (e2 == null) { err.textContent = 'Thời gian kết thúc chưa đúng.'; return; }
          if (e2 <= s) { err.textContent = 'Kết thúc phải sau bắt đầu.'; return; }
          if (e2 > Date.now() + 60000) { err.textContent = 'Kết thúc không được ở tương lai.'; return; }
        }
        if (s > Date.now() + 60000) { err.textContent = 'Không ghi được thời điểm ở tương lai.'; return; }
        if (isNew) {
          db.entries.push(t.kind === 'duration' ? { id: uid(), typeId: t.id, k: 'd', start: s, end: e2 } : { id: uid(), typeId: t.id, k: 'i', start: s });
        } else {
          entry.typeId = t.id;
          entry.start = s;
          if (entry.k === 'd') entry.end = stillRunning ? null : e2;
        }
        save();
        closeSheet();
        render();
        toast(isNew ? `${t.emoji} Đã thêm ${t.name}` : 'Đã lưu thay đổi');
      });
      const del = $('[data-del]', sheet);
      if (del) del.addEventListener('click', () => {
        const backup = entry;
        removeEntry(entry.id);
        closeSheet();
        render();
        toast('Đã xóa', () => { db.entries.push(backup); save(); });
      });
    });
  }

  /* ---- Quản lý loại hoạt động ---- */
  function openTypesSheet() {
    const rows = db.types.map((t, i) => `
      <div class="row-static">
        <div class="move"><button type="button" data-up="${i}" aria-label="Lên" ${i === 0 ? 'disabled' : ''}>▲</button><button type="button" data-down="${i}" aria-label="Xuống" ${i === db.types.length - 1 ? 'disabled' : ''}>▼</button></div>
        <button type="button" class="type-name" data-edit="${esc(t.id)}"><span class="avatar" style="--c:${t.color}">${t.emoji}</span>
          <span class="row-main"><span class="row-title">${esc(t.name)}</span><span class="row-sub">${t.kind === 'duration' ? '⏱ Có thời gian' : '⚡ Bấm nhanh'}</span></span></button>
        <label class="switch" title="Hiện ở màn Ghi nhận"><input type="checkbox" data-toggle="${esc(t.id)}" ${t.enabled ? 'checked' : ''} aria-label="Hiện ${esc(t.name)}"><i></i></label>
      </div>`).join('');
    const body = `<p class="note" style="padding:0 4px 10px">Bấm vào tên để sửa. Tắt công tắc để ẩn khỏi màn Ghi nhận (dữ liệu cũ vẫn giữ).</p>
      <div class="card">${rows}</div>
      <div class="btn-row"><button class="btn primary" data-new>＋ Thêm loại mới</button></div>
      <h2 class="section-title">Dữ liệu</h2>
      <p class="note" style="padding:0 4px 10px">Dữ liệu chỉ lưu trên trình duyệt của máy này. Nên sao lưu định kỳ.</p>
      <div class="btn-row" style="margin-top:0">
        <button class="btn" data-export>⬇️ Sao lưu ra file</button>
        <button class="btn" data-import>⬆️ Khôi phục từ file</button>
        <button class="btn danger" data-wipe>Xóa toàn bộ dữ liệu</button>
      </div>
      <input type="file" accept="application/json,.json" data-file hidden>`;
    openSheet('Loại hoạt động', body, sheet => {
      sheet.addEventListener('click', ev => {
        const b = ev.target.closest('button');
        if (!b) return;
        if (b.dataset.up !== undefined || b.dataset.down !== undefined) {
          const i = +(b.dataset.up ?? b.dataset.down);
          const j = b.dataset.up !== undefined ? i - 1 : i + 1;
          [db.types[i], db.types[j]] = [db.types[j], db.types[i]];
          save(); render(); reopen();
        } else if (b.dataset.edit) openTypeForm(typeById(b.dataset.edit));
        else if (b.hasAttribute('data-new')) openTypeForm(null);
        else if (b.hasAttribute('data-export')) exportData();
        else if (b.hasAttribute('data-import')) $('[data-file]', sheet).click();
        else if (b.hasAttribute('data-wipe')) {
          if (confirm('Xóa TOÀN BỘ dữ liệu đã ghi và đưa về mặc định? Không hoàn tác được.')) {
            db = freshData(); save(); closeSheet(); render(); toast('Đã xóa toàn bộ dữ liệu');
          }
        }
      });
      sheet.addEventListener('change', ev => {
        const tg = ev.target.closest('[data-toggle]');
        if (tg) { const t = typeById(tg.dataset.toggle); if (t) { t.enabled = tg.checked; save(); render(); } }
        const file = ev.target.closest('[data-file]');
        if (file && file.files[0]) importData(file.files[0]);
      });
      function reopen() {
        const scroller = $('.sheet-body', sheet);
        const y = scroller.scrollTop;
        openTypesSheet();
        const nb = $('#sheet-root .sheet-body');
        if (nb) nb.scrollTop = y;
      }
    });
    $('#sheet-root').classList.add('open');
  }

  function openTypeForm(t) {
    const isNew = !t;
    const used = !isNew && db.entries.some(e => e.typeId === t.id);
    const cur = t || { name: '', emoji: '⭐', kind: 'duration', color: PALETTE[db.types.length % PALETTE.length], enabled: true };
    const body = `<form id="type-form" novalidate>
      <label class="field"><span>Tên</span><input class="input" name="name" maxlength="30" value="${esc(cur.name)}" placeholder="Ví dụ: Học tiếng Anh" required></label>
      <div class="field"><span>Biểu tượng</span>
        <input class="input emoji-input" name="emoji" value="${esc(cur.emoji)}" aria-label="Biểu tượng (gõ emoji bất kỳ)">
        <div class="emoji-pick">${EMOJI_CHOICES.map(e => `<button type="button" data-emoji="${e}">${e}</button>`).join('')}</div></div>
      <div class="field"><span>Kiểu</span><div class="radio-row">
        <label class="${used ? 'disabled' : ''}"><input type="radio" name="kind" value="duration" ${cur.kind === 'duration' ? 'checked' : ''} ${used ? 'disabled' : ''}><span><b>⏱ Có thời gian</b>Bấm bắt đầu, bấm lại để dừng</span></label>
        <label class="${used ? 'disabled' : ''}"><input type="radio" name="kind" value="instant" ${cur.kind === 'instant' ? 'checked' : ''} ${used ? 'disabled' : ''}><span><b>⚡ Bấm nhanh</b>Chỉ ghi thời điểm</span></label>
      </div>${used ? '<p class="note" style="padding:6px 4px 0">Đã có dữ liệu nên không đổi kiểu được.</p>' : ''}</div>
      <div class="field"><span>Màu</span><div class="swatches">${PALETTE.map(c => `<button type="button" data-color="${c}" style="--c:${c}" aria-label="Màu ${c}" aria-pressed="${c === cur.color}"></button>`).join('')}</div></div>
      <p class="err" data-err></p>
      <div class="btn-row"><button class="btn primary" type="submit">${isNew ? 'Thêm' : 'Lưu'}</button>
        ${isNew ? '' : '<button class="btn danger" type="button" data-del>Xóa loại này</button>'}
        <button class="btn" type="button" data-back>Quay lại</button></div></form>`;
    openSheet(isNew ? 'Loại mới' : 'Sửa loại', body, sheet => {
      const f = $('#type-form', sheet);
      let color = cur.color;
      sheet.addEventListener('click', ev => {
        const b = ev.target.closest('button');
        if (!b) return;
        if (b.dataset.emoji) f.emoji.value = b.dataset.emoji;
        else if (b.dataset.color) {
          color = b.dataset.color;
          $$('[data-color]', sheet).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        } else if (b.hasAttribute('data-back')) openTypesSheet();
        else if (b.hasAttribute('data-del')) {
          const n = db.entries.filter(e => e.typeId === t.id).length;
          const msg = n ? `Xóa "${t.name}" và ${n} mục đã ghi của nó? Nếu chỉ muốn ẩn, hãy tắt công tắc thay vì xóa.` : `Xóa "${t.name}"?`;
          if (!confirm(msg)) return;
          db.types = db.types.filter(x => x.id !== t.id);
          db.entries = db.entries.filter(e => e.typeId !== t.id);
          save(); render(); openTypesSheet(); toast('Đã xóa');
        }
      });
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        const name = f.name.value.trim();
        const emoji = firstGrapheme(f.emoji.value) || '⭐';
        if (!name) { $('[data-err]', sheet).textContent = 'Hãy đặt tên.'; f.name.focus(); return; }
        const kindInput = f.querySelector('input[name="kind"]:checked');
        const kind = kindInput ? kindInput.value : cur.kind;
        if (isNew) db.types.push({ id: uid(), name, emoji, kind, enabled: true, color });
        else Object.assign(t, { name, emoji, color, kind: used ? t.kind : kind });
        save(); render(); openTypesSheet();
        toast(isNew ? `${emoji} Đã thêm ${name}` : 'Đã lưu');
      });
      if (isNew) setTimeout(() => f.name.focus(), 300);
    });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = `nhat-ky-thoi-gian-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Đã tạo file sao lưu');
  }
  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!isValidData(d)) throw new Error('bad');
        if (!confirm(`Khôi phục ${d.entries.length} mục và ${d.types.length} loại hoạt động? Dữ liệu hiện tại trên máy này sẽ bị thay thế.`)) return;
        db = d; save(); closeSheet(); render(); toast('Đã khôi phục dữ liệu');
      } catch (e) { toast('File không hợp lệ'); }
    };
    reader.readAsText(file);
  }

  /* ============ Toast ============ */
  let toastTimer;
  function toast(msg, undo) {
    const el = $('#toast');
    el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button">Hoàn tác</button>' : ''}`;
    el.classList.add('show');
    if (undo) el.querySelector('button').onclick = () => { undo(); el.classList.remove('show'); render(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), undo ? 4500 : 2200);
  }

  /* ============ Vẽ & sự kiện ============ */
  const VIEWS = { log: viewLog, timeline: viewTimeline, calendar: viewCalendar, stats: viewStats };
  function render() {
    $('#view').innerHTML = VIEWS[state.tab]();
    $$('.tabbar button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === state.tab ? 'page' : 'false'));
    state.renderedDay = startOfDay(Date.now());
  }
  function tick() {
    if (document.hidden) return;
    if (startOfDay(Date.now()) !== state.renderedDay) { render(); return; }
    const now = Date.now();
    $$('[data-since]').forEach(el => { el.textContent = fmtClock(now - Number(el.dataset.since)); });
  }
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { db = loadData(); render(); } });
  // Đồng bộ giữa các tab trình duyệt trên cùng một máy
  window.addEventListener('storage', ev => { if (ev.key === STORE_KEY) { db = loadData(); render(); } });

  const ACTIONS = {
    tap: el => { const t = typeById(el.dataset.id); if (t) tapType(t, el); },
    stop: () => stopRunning(),
    entry: el => { const e = db.entries.find(x => x.id === el.dataset.id); if (e) openEntryForm(e); },
    add: el => openEntryForm(null, el.dataset.day ? Number(el.dataset.day) : undefined),
    types: () => openTypesSheet(),
    more: () => { state.tlDays += 7; render(); },
    calPrev: () => { const d = new Date(state.calMonth); state.calMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(); render(); },
    calNext: () => { const d = new Date(state.calMonth); state.calMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(); render(); },
    calDay: el => { state.calDay = Number(el.dataset.day); render(); },
    range: el => { const r = el.dataset.r; state.range = r === 'all' ? 'all' : Number(r); saveUi(); render(); },
    statType: el => openTypeStats(el.dataset.id),
  };
  $('#view').addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (el && ACTIONS[el.dataset.act]) ACTIONS[el.dataset.act](el, ev);
  });
  $$('.tabbar button').forEach(b => b.addEventListener('click', () => {
    if (state.tab === b.dataset.tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    state.tab = b.dataset.tab;
    if (state.tab === 'calendar') { state.calMonth = startOfMonth(state.calDay); }
    saveUi();
    render();
    window.scrollTo(0, 0);
  }));

  render();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // Dùng khi kiểm thử
  window.__nktg = { get db() { return db; }, set db(v) { db = v; save(); render(); } };
})();
