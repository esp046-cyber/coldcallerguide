/* 2026 Cold Caller Working Guide - app logic (ES6) */
'use strict';

const VERSION = '1.2.0';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* Live fill-in: [Owner Name] [Suburb] [Street] swap to typed values, else stay as placeholders */
const FILL_KEYS = { 'Owner Name': 'name', 'Suburb': 'suburb', 'Street': 'street' };
const fillState = { name: '', suburb: '', street: '' };
const rerender = [];
const fillVal = (k) => (FILL_KEYS[k] ? String(fillState[FILL_KEYS[k]] || '').trim() : '');
const personalize = (t) => String(t).replace(/\[(Owner Name|Suburb|Street)\]/g, (m, k) => fillVal(k) || m);
const hl = (s) => esc(s).replace(/\[([^\]]+)\]/g, (m, k) => {
  const v = fillVal(k);
  return v ? '<span class="filled">' + esc(v) + '</span>' : '<span class="ph">' + m + '</span>';
});

/* ---------- storage (safe) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
};

/* ---------- data ---------- */
const SCRIPTS = [
  {
    id: 'expired', cat: 'Expired Listings', title: 'Expired Listing - Fresh Start',
    cue: 'Warm, calm, unhurried. Slow down on the first sentence. Smile before you dial.',
    body: `Hi [Owner Name], it's [Your Name] calling from [Agency]. I'll be brief - I noticed your home on [Street] in [Suburb] came off the market recently.

I'm not calling to ask you to list with us today. I work with owners whose home didn't sell the first time, and I'd like to share one thing buyers in [Suburb] are responding to right now.

Can I ask - what do you think held it back? (PAUSE - let them talk.)

That makes sense. Our senior agent has a different approach to pricing and presentation. Would you be open to a 15-minute no-obligation chat on [Day] at [Time] or [Day] at [Time]?`
  },
  {
    id: 'fsbo', cat: 'FSBO', title: 'For Sale By Owner - Value Offer',
    cue: 'Respectful and curious. You are helping, not hijacking. Never criticise selling privately.',
    body: `Hi [Owner Name], it's [Your Name] with [Agency]. I saw your place on [Street] is for sale privately - is it still available?

Great. I'm not calling to take over. Many private sellers tell us the hardest parts are buyer enquiries and negotiation. Is that true for you so far?

If I could send you a free buyer-demand snapshot for [Suburb] - who is searching and what they paid recently - would that be useful? Our agent can run through it with you in 15 minutes on [Day] at [Time].`
  },
  {
    id: 'circle', cat: 'Circle / Just Sold', title: 'Circle Prospecting - Just Sold Nearby',
    cue: 'Neighbourly and upbeat. Lead with news, then ask for a quick opinion.',
    body: `Hi [Owner Name], it's [Your Name] from [Agency]. Quick call - we just sold a home near you in [Street], [Suburb], and we had strong buyer interest.

Some buyers missed out, and a few are still looking in your street. Out of curiosity, have you thought about what your home might be worth in this market?

No pressure at all. Our agent can give you a free, no-obligation appraisal - would [Day] at [Time] or [Day] at [Time] suit better?`
  },
  {
    id: 'absentee', cat: 'Absentee Owners', title: 'Absentee Owner / Investor',
    cue: 'Business-like and numbers-focused. Confirm identity first, keep it short.',
    body: `Hi [Owner Name], it's [Your Name] from [Agency]. Am I speaking with the owner of the property on [Street], [Suburb]?

Thanks. I'm calling because rental yields and sale prices have shifted in [Suburb] and we're updating owners who don't live locally. Have you reviewed your investment position this year?

We can provide a free sale and rental appraisal so you can compare both options. Can I book you a short call with our agent on [Day] at [Time]?`
  },
  {
    id: 'au', cat: 'AU Vendor Appraisal', title: 'Australian Market - Vendor Appraisal Pitch',
    cue: 'Friendly Aussie tone, no jargon. Confirm you are calling during permitted hours.',
    body: `G'day [Owner Name], it's [Your Name] calling from [Agency] in [Suburb] - have I caught you at an okay time?

Reason for the call: we've had a lot of buyer activity around [Street] lately, and we're offering local owners a free, no-obligation market appraisal. Have you thought about what your home might fetch at the moment?

Our agent only needs 20 minutes at the property - no pressure to list. Would [Day] morning or [Day] afternoon work better for you?`
  }
];

const OBJECTIONS = [
  { q: 'Send me an email.', rebut: 'Happy to. I want to send you something relevant, not generic. So I only send what matters - are you thinking of selling this year, or just keeping an eye on values?', pivot: 'What would make an email actually useful to you - a price guide for [Street], or recent sales near you?', tags: 'email send info brush off' },
  { q: "Not interested / I'm happy with my agent.", rebut: "That's great to hear, and I'm not asking you to change anything. Lots of owners like a second opinion on value anyway.", pivot: 'If a free appraisal showed your home was worth more than you expected, would you want to know?', tags: 'not interested happy agent already listed' },
  { q: 'How did you get my number?', rebut: 'Fair question. Your number is listed with public property and marketing records, and I only call to share local market updates. If you would rather not hear from us, I can remove you right now.', pivot: "Before I do - may I ask if you'd consider selling in the next 12 months?", tags: 'number data source privacy where' },
  { q: 'The market is too slow right now.', rebut: 'I hear that a lot. Slow markets are exactly when pricing strategy matters most, and well-presented homes in [Suburb] are still moving.', pivot: 'Would you like to see what comparable homes actually sold for in the last 90 days?', tags: 'market slow rates timing' },
  { q: 'Call me back in 6 months.', rebut: 'Absolutely, I can do that. Many owners prefer to plan ahead so they are ready when the time is right.', pivot: 'To make that call useful, what would need to change by then - price, timing, or something else? Can I book it for [Date]?', tags: 'call back later six months timing' },
  { q: "I'm not selling.", rebut: "Totally fine - I'm not asking you to. Plenty of owners just like to know their home's value for planning.", pivot: 'Would a free, no-obligation equity snapshot be useful to keep on file?', tags: 'not selling no plans' },
  { q: "I'm busy right now.", rebut: 'No problem at all - I will be quick. Is it better if I call back at a set time?', pivot: 'What time later today or tomorrow suits you best - morning or afternoon?', tags: 'busy bad time later' },
  { q: 'Take me off your list / Do not call.', rebut: "Understood, I'll remove you right away and apologise for the interruption. You will not be called again.", pivot: '(No pivot. End politely. Log DNC in CRM immediately.)', tags: 'dnc do not call remove stop' }
];

const WINDOWS = [
  ['Mon-Fri 9:00-11:30', 'Best for owners at home, retirees and shift workers. Strong connect rates.'],
  ['Mon-Fri 11:30-13:30', 'Lunch. Lower pickup, avoid pitching long scripts.'],
  ['Mon-Fri 16:00-18:30', 'Prime: people arriving home. Keep calls under 2 minutes.'],
  ['Mon-Fri 18:30-20:00', 'Good for working owners. Last compliant hour in AU.'],
  ['Saturday 9:00-12:00', 'High engagement. Must end by 17:00 in AU.'],
  ['Sunday / public holidays', 'Do not call (AU telemarketing).']
];

const CHECKS = [
  { g: 'Compliance', items: [
    ['Scrub list against the Do Not Call Register (DNCR)', 'Required before every campaign; wash numbers regularly.'],
    ['Confirm calling hours for the contact location', 'Check local time of the contact, not yours.'],
    ['State caller and agency name at the start', 'Identify yourself clearly.'],
    ['Honour opt-outs immediately', 'Tag DNC in CRM before the next dial.'],
    ['Record disposition for every call', 'Connected, voicemail, no answer, callback, appointment, DNC.']
  ]},
  { g: 'Setup', items: [
    ['Headset and mic audio test', 'Record a 10-second clip and listen back.'],
    ['Stable internet / backup hotspot ready', 'Run a quick speed test.'],
    ['CRM, dialler and scripts open', 'Close other tabs and notifications.'],
    ['Lead list loaded and prioritised', 'Expired and FSBO first.']
  ]},
  { g: 'Mindset', items: [
    ['2-minute energy warm-up', 'Stand, stretch, breathe, speak out loud.'],
    ['Water at your desk', 'Hydrated voice sounds warmer.'],
    ['Set today\'s targets', 'Dials, connects, appointments.']
  ]}
];

const PITCHES = [
  ['15-second opener', "Hi [Owner Name], it's [Your Name] from [Agency]. Is now a bad time for a quick 30 seconds?"],
  ['Appointment close', 'Our agent can pop by [Day] at [Time] or [Day] at [Time]. Which suits you better?'],
  ['Voicemail', "Hi [Owner Name], [Your Name] from [Agency]. I have a quick market update for [Street]. I'll try again soon - or call me on [Number]."],
  ['Polite exit', 'No worries at all, thanks for your time, [Owner Name]. Have a great day.']
];

const PLAN = [
  ['9:00-9:30', 'Setup &amp; warm-up', 'DNCR check, audio test, targets'],
  ['9:30-11:30', 'Power block 1', 'Expired &amp; FSBO calls'],
  ['11:30-12:00', 'Break', 'Step away from the screen'],
  ['12:00-15:00', 'Block 2', 'Circle prospecting, follow-ups'],
  ['15:00-16:00', 'CRM admin', 'Update notes, book appointments'],
  ['16:00-19:00', 'Prime block', 'Highest pickup window'],
  ['19:00-20:00', 'Final compliant calls', 'Last permitted hour for AU calls'],
  ['20:00-22:30', 'Non-AU / admin', 'Other markets, reporting, tomorrow\'s list']
];

/* ---------- toast ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (_) { toast('Copy failed'); ta.remove(); return; }
    ta.remove();
  }
  toast('Copied to clipboard');
}

/* ---------- tabs ---------- */
function initTabs() {
  const tabs = $$('.tab');
  const show = (name, focus) => {
    tabs.forEach((t) => {
      const on = t.dataset.tab === name;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    $$('.panel').forEach((p) => { p.hidden = p.id !== 'panel-' + name; });
    try { history.replaceState(null, '', '#' + name); } catch (e) {}
    window.scrollTo({ top: 0 });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t.dataset.tab));
    t.addEventListener('keydown', (e) => {
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); show(tabs[n].dataset.tab, true); }
    });
  });
  const h = location.hash.slice(1);
  if (tabs.some((t) => t.dataset.tab === h)) show(h);
  return show;
}

/* ---------- clocks & shift ---------- */
function fmt(tz) {
  const d = new Date();
  const o = tz ? { timeZone: tz } : {};
  return {
    time: d.toLocaleTimeString('en-AU', { ...o, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    date: d.toLocaleDateString('en-AU', { ...o, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    parts: new Intl.DateTimeFormat('en-AU', { ...o, hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'short' }).formatToParts(d)
  };
}
function aestMinutes() {
  const p = fmt('Australia/Sydney').parts;
  const h = +p.find((x) => x.type === 'hour').value % 24, m = +p.find((x) => x.type === 'minute').value;
  return { mins: h * 60 + m, wd: p.find((x) => x.type === 'weekday').value };
}
function tickClocks() {
  const a = fmt('Australia/Sydney'), l = fmt();
  $('#clockAest').textContent = a.time; $('#dateAest').textContent = a.date;
  $('#clockLocal').textContent = l.time; $('#dateLocal').textContent = l.date;
  const { mins, wd } = aestMinutes();
  let msg;
  if (wd === 'Sun') msg = 'Sunday in Sydney: no AU telemarketing calls.';
  else if (mins < 540) msg = 'Shift starts at 9:00 AM AEST. Run your setup checklist.';
  else if (mins >= 1350) msg = 'Shift complete (10:30 PM AEST). Log your numbers.';
  else if (mins >= 1200) msg = 'After 8:00 PM AEST: AU calls closed. Admin / other markets.';
  else msg = 'Shift in progress. Calling window open (AEST).';
  $('#shiftStatus').textContent = msg;
  paintPlanner(mins);
}
function paintPlanner(mins) {
  const bounds = [540, 570, 690, 720, 900, 960, 1140, 1200, 1350];
  $$('#planner li').forEach((li, i) => {
    li.classList.toggle('now', mins >= bounds[i] && mins < bounds[i + 1]);
    li.classList.toggle('done', mins >= bounds[i + 1]);
  });
}
function buildPlanner() {
  $('#planner').innerHTML = PLAN.map((r) => `<li><span class="t">${r[0]}</span><span class="d"><b>${r[1]}</b><br>${r[2]}</span></li>`).join('');
}

/* ---------- KPIs ---------- */
const todayKey = () => new Date().toISOString().slice(0, 10);
const KPI_DEF = [['dials', 'Dials'], ['connects', 'Connects'], ['appts', 'Appointments']];
let kpi = { date: todayKey(), dials: 0, connects: 0, appts: 0 };
function loadKpi() {
  const s = store.get('cc26.kpi', null);
  if (s && s.date === todayKey()) kpi = s; else {
    if (s) { const h = store.get('cc26.history', []); h.push(s); store.set('cc26.history', h.slice(-60)); }
    kpi = { date: todayKey(), dials: 0, connects: 0, appts: 0 };
  }
}
function paintKpi() {
  $('#kpis').innerHTML = KPI_DEF.map(([k, l]) => `<div class="kpi"><span class="n" id="n-${k}">${kpi[k]}</span><span class="l">${l}</span><button class="btn" type="button" data-k="${k}" aria-label="Add one ${l}">+1</button></div>`).join('');
  const cr = kpi.dials ? Math.round((kpi.connects / kpi.dials) * 100) : 0;
  const ar = kpi.connects ? Math.round((kpi.appts / kpi.connects) * 100) : 0;
  $('#kpiSummary').innerHTML = `Connect rate <strong>${cr}%</strong> &middot; Appointment rate <strong>${ar}%</strong>`;
}
function initKpi() {
  loadKpi(); paintKpi();
  $('#kpis').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    kpi[b.dataset.k]++; store.set('cc26.kpi', kpi); paintKpi();
  });
  $('#kpiReset').addEventListener('click', () => {
    if (!confirm('Reset today\'s KPI counters?')) return;
    kpi = { date: todayKey(), dials: 0, connects: 0, appts: 0 }; store.set('cc26.kpi', kpi); paintKpi(); toast('Reset');
  });
}

/* ---------- pitch cards ---------- */
function buildPitches() {
  const render = () => {
    $('#pitchCards').innerHTML = PITCHES.map((p, i) => `<article class="script"><header><h3>${esc(p[0])}</h3></header><pre>${hl(p[1])}</pre><button class="btn small" type="button" data-pitch="${i}">Copy</button></article>`).join('');
  };
  $('#pitchCards').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pitch]'); if (b) copyText(personalize(PITCHES[b.dataset.pitch][1]));
  });
  rerender.push(render);
  render();
}

/* ---------- live fill-in bar ---------- */
function initFill() {
  Object.assign(fillState, store.get('cc26.fill', {}));
  const map = { fillName: 'name', fillSuburb: 'suburb', fillStreet: 'street' };
  const bar = $('#fillbar'), toggle = $('#fillToggle'), summary = $('#fillSummary');
  const paintSummary = () => {
    const parts = [fillState.name, fillState.suburb, fillState.street].map((v) => String(v || '').trim()).filter(Boolean);
    summary.textContent = parts.length ? parts.join(' \u00b7 ') : 'No prospect details yet';
  };
  const setCollapsed = (on) => {
    bar.classList.toggle('collapsed', on);
    toggle.setAttribute('aria-expanded', String(!on));
    toggle.textContent = on ? 'Edit fill-in' : 'Hide fields';
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = $('#' + id);
    el.value = fillState[key] || '';
    el.addEventListener('input', () => {
      fillState[key] = el.value; store.set('cc26.fill', fillState); paintSummary(); rerender.forEach((f) => f());
    });
  });
  $('#fillClear').addEventListener('click', () => {
    Object.keys(map).forEach((id) => { $('#' + id).value = ''; fillState[map[id]] = ''; });
    store.set('cc26.fill', fillState); paintSummary(); rerender.forEach((f) => f()); toast('Fill-in cleared');
    $('#fillName').focus();
  });
  toggle.addEventListener('click', () => {
    const on = !bar.classList.contains('collapsed');
    setCollapsed(on); store.set('cc26.fillCollapsed', on);
  });
  setCollapsed(!!store.get('cc26.fillCollapsed', false));
  paintSummary();
  rerender.forEach((f) => f());
}

/* ---------- callback & hot lead scratchpad ---------- */
function initLeads() {
  let leads = store.get('cc26.leads', []);
  if (!Array.isArray(leads)) leads = [];
  const fmtCb = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d) ? v : d.toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const paint = () => {
    $('#leadList').innerHTML = leads.map((l) => {
      const tel = (l.phone || '').replace(/[^\d+]/g, '');
      return `<li class="lead"><div class="info"><strong>${esc(l.name || 'Unnamed prospect')}</strong>` +
        (l.phone ? `<div class="meta">Phone: ${tel ? `<a href="tel:${esc(tel)}">${esc(l.phone)}</a>` : esc(l.phone)}</div>` : '') +
        (l.addr ? `<div class="meta">Property: ${esc(l.addr)}</div>` : '') +
        (l.cb ? `<div class="meta">Callback: ${esc(fmtCb(l.cb))}</div>` : '') +
        `</div><button class="del" type="button" data-id="${esc(l.id)}" aria-label="Remove ${esc(l.name || 'lead')}">&times;</button></li>`;
    }).join('');
    $('#leadEmpty').hidden = leads.length > 0;
    $('#leadCount').textContent = leads.length ? `${leads.length} lead${leads.length === 1 ? '' : 's'} this shift` : '';
  };
  $('#leadForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const l = { id: String(Date.now()) + Math.random().toString(36).slice(2, 6), name: $('#leadName').value.trim(), phone: $('#leadPhone').value.trim(), addr: $('#leadAddr').value.trim(), cb: $('#leadCb').value };
    if (!l.name && !l.phone) { toast('Add a name or phone first'); return; }
    leads.push(l); store.set('cc26.leads', leads); e.target.reset(); paint(); toast('Lead saved');
    $('#leadName').focus();
  });
  $('#leadList').addEventListener('click', (e) => {
    const b = e.target.closest('.del'); if (!b) return;
    leads = leads.filter((l) => l.id !== b.dataset.id); store.set('cc26.leads', leads); paint();
  });
  $('#leadCopy').addEventListener('click', () => {
    if (!leads.length) { toast('Nothing to copy yet'); return; }
    const txt = 'Shift callbacks & hot leads (' + todayKey() + ')\n' + leads.map((l, i) =>
      `${i + 1}. ${l.name || 'Unnamed'} | ${l.phone || 'no phone'} | ${l.addr || 'no address'} | Callback: ${fmtCb(l.cb) || 'not set'}`).join('\n');
    copyText(txt);
  });
  $('#leadClear').addEventListener('click', () => {
    if (!leads.length) { toast('Already clear'); return; }
    if (!confirm('Clear all leads for this shift? This cannot be undone.')) return;
    leads = []; store.set('cc26.leads', leads); paint(); toast('Shift cleared');
  });
  paint();
}

/* ---------- scripts ---------- */
function buildScripts() {
  const cats = ['All', ...new Set(SCRIPTS.map((s) => s.cat))];
  let active = 'All';
  const f = $('#scriptFilters');
  f.innerHTML = cats.map((c) => `<button class="chip" type="button" aria-pressed="${c === 'All'}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
  const render = () => {
    $('#scriptList').innerHTML = SCRIPTS.filter((s) => active === 'All' || s.cat === active).map((s) => `
      <article class="script" id="s-${s.id}">
        <header><h3>${esc(s.title)}</h3><span class="badge">${esc(s.cat)}</span></header>
        <p class="cue"><strong>Tone &amp; pacing:</strong> ${esc(s.cue)}</p>
        <pre>${hl(s.body)}</pre>
        <button class="btn" type="button" data-copy="${s.id}">Copy script</button>
      </article>`).join('');
  };
  f.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    active = b.dataset.c;
    $$('.chip', f).forEach((c) => c.setAttribute('aria-pressed', c === b));
    render();
  });
  $('#scriptList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    copyText(personalize(SCRIPTS.find((s) => s.id === b.dataset.copy).body));
  });
  rerender.push(render);
  render();
}

/* ---------- objections ---------- */
function buildObjections() {
  const render = (q) => {
    const k = q.trim().toLowerCase();
    const list = OBJECTIONS.filter((o) => !k || (o.q + ' ' + o.rebut + ' ' + o.pivot + ' ' + o.tags).toLowerCase().includes(k));
    $('#objList').innerHTML = list.map((o) => `
      <article class="script obj">
        <h3>&ldquo;${esc(o.q)}&rdquo;</h3>
        <p class="lab">Rebuttal</p><p>${hl(o.rebut)}</p>
        <p class="lab">Pivot question</p><p>${hl(o.pivot)}</p>
        <div class="row"><button class="btn small" type="button" data-oc="${OBJECTIONS.indexOf(o)}">Copy response</button></div>
      </article>`).join('');
    $('#objEmpty').hidden = list.length > 0;
    $('#objCount').textContent = `${list.length} of ${OBJECTIONS.length} objections`;
  };
  $('#objSearch').addEventListener('input', (e) => render(e.target.value));
  $('#objList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-oc]'); if (!b) return;
    const o = OBJECTIONS[b.dataset.oc]; copyText(personalize(o.rebut + '\n\n' + o.pivot));
  });
  rerender.push(() => render($('#objSearch').value));
  render('');
}

/* ---------- checklist ---------- */
function buildChecklist() {
  let state = store.get('cc26.check', {});
  if (state.date !== todayKey()) state = { date: todayKey(), done: {} };
  let n = 0;
  $('#checkList').innerHTML = CHECKS.map((g) => `<div class="cgroup"><h3>${esc(g.g)}</h3><div class="stack">${g.items.map((it) => {
    const id = 'c' + (n++);
    return `<label class="check"><input type="checkbox" id="${id}" ${state.done[id] ? 'checked' : ''}><span>${esc(it[0])}<small>${esc(it[1])}</small></span></label>`;
  }).join('')}</div></div>`).join('');
  const total = n;
  const paint = () => {
    const d = Object.values(state.done).filter(Boolean).length;
    $('#checkBar').style.width = (d / total * 100) + '%';
    $('#checkSummary').textContent = `${d} of ${total} complete` + (d === total ? ' - ready to dial!' : '');
  };
  $('#checkList').addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    state.done[e.target.id] = e.target.checked; store.set('cc26.check', state); paint();
  });
  $('#checkReset').addEventListener('click', () => {
    state = { date: todayKey(), done: {} }; store.set('cc26.check', state);
    $$('#checkList input').forEach((i) => (i.checked = false)); paint();
  });
  $('#windows').innerHTML = WINDOWS.map((w) => `<tr><td><strong>${esc(w[0])}</strong></td><td>${esc(w[1])}</td></tr>`).join('');
  paint();
}

/* ---------- theme ---------- */
function initTheme() {
  const saved = store.get('cc26.theme', null);
  const pref = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const apply = (t) => {
    document.documentElement.dataset.theme = t;
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === 'dark' ? '#0B191C' : '#0A4D53';
  };
  apply(pref);
  $('#themeBtn').addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(t); store.set('cc26.theme', t);
  });
}

/* ---------- network ---------- */
function initNet() {
  const p = $('#netPill');
  const set = () => { const on = navigator.onLine; p.textContent = on ? 'Online' : 'Offline'; p.className = 'pill ' + (on ? 'online' : 'offline'); };
  addEventListener('online', set); addEventListener('offline', set); set();
}

/* ---------- PWA install, SW, export ---------- */
function initPwa() {
  $('#ver').textContent = VERSION;
  let deferred = null;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const dismissed = store.get('cc26.bannerDismissed', false);
  if (standalone) $('#installMsg').textContent = 'Installed. You are running the app version.';

  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferred = e;
    $('#installBtn').hidden = false;
    if (!dismissed && !standalone) $('#installBanner').hidden = false;
  });
  const doInstall = async () => {
    if (!deferred) return;
    deferred.prompt(); await deferred.userChoice; deferred = null;
    $('#installBtn').hidden = true; $('#installBanner').hidden = true;
  };
  $('#installBtn').addEventListener('click', doInstall);
  $('#bannerInstall').addEventListener('click', doInstall);
  $('#bannerClose').addEventListener('click', () => { $('#installBanner').hidden = true; store.set('cc26.bannerDismissed', true); });
  addEventListener('appinstalled', () => { $('#installBanner').hidden = true; toast('App installed'); });

  const dlg = $('#iosDialog');
  $('#iosBtn').addEventListener('click', () => (dlg.showModal ? dlg.showModal() : alert('Safari > Share > Add to Home Screen')));
  $('#iosClose').addEventListener('click', () => dlg.close());

  $('#exportBtn').addEventListener('click', () => {
    const data = { exported: new Date().toISOString(), today: kpi, history: store.get('cc26.history', []) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'coldcaller-kpi-' + todayKey() + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup downloaded');
  });
  $('#printBtn').addEventListener('click', () => print());

  const cs = $('#cacheStatus');
  if (!('serviceWorker' in navigator)) { cs.textContent = 'Offline mode is not supported in this browser.'; return; }
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    const report = () => { cs.textContent = reg.active ? 'Ready for offline use. All guide content is cached on this device.' : 'Caching content for offline use...'; };
    report();
    navigator.serviceWorker.ready.then(report);
    const offerUpdate = (worker) => {
      $('#updateBar').hidden = false;
      $('#updateBtn').onclick = () => worker.postMessage({ type: 'SKIP_WAITING' });
    };
    // A new version may already be waiting from an earlier visit
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw && nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(nw);
      });
    });
    // Look for updates whenever the app returns to the foreground
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => { cs.textContent = 'Offline caching failed to start. Try reloading over HTTPS.'; });
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded) return; reloaded = true; location.reload(); });
}

/* ---------- sticky offsets: expose real header height ---------- */
function initHeaderVar() {
  const hd = $('.app-header');
  const set = () => document.documentElement.style.setProperty('--hdr', Math.round(hd.getBoundingClientRect().height) + 'px');
  set();
  if ('ResizeObserver' in window) new ResizeObserver(set).observe(hd); else addEventListener('resize', set);
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initHeaderVar(); initTheme(); initNet(); initTabs();
  buildPlanner(); initKpi(); initLeads(); buildPitches(); buildScripts(); buildObjections(); buildChecklist(); initFill();
  tickClocks(); setInterval(tickClocks, 1000);
  initPwa();
});
