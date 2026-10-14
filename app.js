/* Batyr FIT — статичное приложение. Данные хранятся в localStorage браузера.
   Прогресс (XP, уровни, задания) не хранится отдельно: он каждый раз пересчитывается из журнала,
   поэтому правка или удаление тренировки сразу честно меняет опыт. */
(function () {
  "use strict";
  const KEY = "fitlog.v1";
  const RU = {
    equipment: { "barbell": "штанга", "dumbbell": "гантели", "cable": "блок", "machine": "тренажёр", "body only": "свой вес",
      "e-z curl bar": "EZ-гриф", "kettlebells": "гиря", "bands": "резина", "medicine ball": "медбол", "exercise ball": "фитбол",
      "foam roll": "ролик", "other": "другое" },
    level: { beginner: "новичок", intermediate: "средний", expert: "продвинутый" },
    muscle: { "abdominals": "пресс", "abductors": "отводящие бедра", "adductors": "приводящие бедра", "biceps": "бицепс",
      "calves": "икры", "chest": "грудь", "forearms": "предплечья", "glutes": "ягодицы", "hamstrings": "бицепс бедра",
      "lats": "широчайшие", "lower back": "поясница", "middle back": "середина спины", "neck": "шея", "quadriceps": "квадрицепсы",
      "shoulders": "плечи", "traps": "трапеции", "triceps": "трицепс" },
    category: { strength: "силовое", stretching: "растяжка", plyometrics: "плиометрика", powerlifting: "пауэрлифтинг",
      "olympic weightlifting": "тяжёлая атлетика", strongman: "стронгмен", cardio: "кардио" },
    mechanic: { compound: "базовое", isolation: "изолирующее" },
  };
  const MUSCLE_GROUP = { chest: "chest", lats: "back", "middle back": "back", "lower back": "lowerback", shoulders: "shoulders",
    traps: "traps", biceps: "biceps", triceps: "triceps", forearms: "forearms", abdominals: "abs", quadriceps: "quads",
    hamstrings: "hamstrings", glutes: "glutes", calves: "calves", adductors: "hips", abductors: "hips", neck: "neck" };
  const GROUP_RU = { chest: "Грудь", back: "Спина", lowerback: "Поясница", shoulders: "Плечи", traps: "Трапеции", biceps: "Бицепс",
    triceps: "Трицепс", forearms: "Предплечья", abs: "Пресс", quads: "Квадрицепсы", hamstrings: "Бицепс бедра", glutes: "Ягодицы",
    calves: "Икры", hips: "Бёдра", neck: "Шея" };
  const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

  // ---------- уровни ----------
  const LEVELS = [
    { n: 1, name: "Бала", xp: 0, quests: 0, color: "#b08a6a", about: "Первые шаги в зале" },
    { n: 2, name: "Джигит", xp: 300, quests: 2, color: "#3fbf74", about: "Ловкий и упорный, тренировки вошли в привычку" },
    { n: 3, name: "Азамат", xp: 1000, quests: 5, color: "#4d7cff", about: "Настоящий мужчина: сила, режим, дисциплина" },
    { n: 4, name: "Железный Кайра", xp: 2500, quests: 9, color: "#c4ccd6", about: "Беркут со стальной хваткой" },
    { n: 5, name: "Батыр", xp: 5000, quests: 14, color: "#f5c518", about: "Богатырь. Вершина пути" },
  ];
  const XP_RULES = { workout: 10, perSet: 1, maxSets: 20, pr: 5, maxPr: 3, daily: 10 };

  // ---------- задания ----------
  const BENCH = ["Barbell_Bench_Press_-_Medium_Grip", "Wide-Grip_Barbell_Bench_Press"];
  const SQUAT = ["Barbell_Squat", "Barbell_Full_Squat"];
  const DEAD = ["Barbell_Deadlift"];
  const PULL = ["Pullups", "Chin-Up"];
  const QUESTS = [
    { id: "profile", icon: "user", title: "Заполни профиль: рост, вес и цель", xp: 20,
      p: (c) => [["height", "weight", "goal"].filter((k) => c.profile[k]).length, 3] },
    { id: "measure", icon: "ruler", title: "Сделай первый замер тела", xp: 10, p: (c) => [c.measurements.length, 1] },
    { id: "w1", icon: "flag", title: "Первая тренировка", xp: 20, p: (c) => [c.ws.length, 1] },
    { id: "w5", icon: "flag", title: "5 тренировок", xp: 30, p: (c) => [c.ws.length, 5] },
    { id: "week3", icon: "fire", title: "3 тренировки за одну неделю", xp: 40, p: (c) => [c.maxWeekWorkouts, 3] },
    { id: "w20", icon: "flag", title: "20 тренировок", xp: 80, p: (c) => [c.ws.length, 20] },
    { id: "groups8", icon: "body", title: "Проработай 8 групп мышц за неделю", xp: 60, p: (c) => [c.maxWeekGroups, 8] },
    { id: "ton5", icon: "weight", title: "Тоннаж 5 тонн за одну тренировку", xp: 50, p: (c) => [Math.round(c.maxTonnage / 100) / 10, 5], unit: "т" },
    { id: "bench60", icon: "bar", title: "Жим лёжа 60 кг на 5 раз", xp: 50, p: (c) => [c.best(BENCH, 5), 60], unit: "кг" },
    { id: "bench80", icon: "bar", title: "Жим лёжа 80 кг на 2 раза", xp: 100, p: (c) => [c.best(BENCH, 2), 80], unit: "кг" },
    { id: "squat80", icon: "bar", title: "Присед со штангой 80 кг на 5 раз", xp: 60, p: (c) => [c.best(SQUAT, 5), 80], unit: "кг" },
    { id: "squat100", icon: "bar", title: "Присед со штангой 100 кг на 3 раза", xp: 100, p: (c) => [c.best(SQUAT, 3), 100], unit: "кг" },
    { id: "dead100", icon: "bar", title: "Становая тяга 100 кг на 3 раза", xp: 80, p: (c) => [c.best(DEAD, 3), 100], unit: "кг" },
    { id: "dead120", icon: "bar", title: "Становая тяга 120 кг на 2 раза", xp: 100, p: (c) => [c.best(DEAD, 2), 120], unit: "кг" },
    { id: "pull10", icon: "bar", title: "Подтянись 10 раз за подход", xp: 60, p: (c) => [c.maxReps(PULL), 10], unit: "раз" },
    { id: "w50", icon: "flag", title: "50 тренировок", xp: 150, p: (c) => [c.ws.length, 50] },
    { id: "friend", icon: "users", title: "Пригласи 1 друга в приложение", xp: 100, locked: true },
    { id: "community", icon: "chat", title: "Активность в сообществе: 10 сообщений", xp: 50, locked: true },
  ];
  const DAILY = [
    { title: "Подними вес хотя бы в одном упражнении", check: (d) => d.prs.length > 0 },
    { title: "Сделай не меньше 12 подходов", check: (d) => d.a.sets >= 12 },
    { title: "Проработай 3 группы мышц", check: (d) => Object.keys(d.a.groups).length >= 3 },
    { title: "Добавь упражнение, которого раньше не делал", check: (d) => d.newEx },
    { title: "Тренировка ног: 4 подхода на ноги", check: (d) => ["quads", "hamstrings", "glutes", "calves", "hips"].reduce((s, g) => s + (d.a.groups[g] || 0), 0) >= 4 },
    { title: "Набери тоннаж 3 тонны", check: (d) => d.a.tonnage >= 3000 },
  ];
  const dailyFor = (iso) => DAILY[Math.floor(Date.parse(iso + "T00:00:00Z") / 864e5) % DAILY.length];

  // ---------- state ----------
  let S = load();
  let DB = null;
  const ui = { coach: false, tab: "home", workoutId: null, summaryId: null, groupId: null, q: "", pickFor: null, period: "month" };

  function blank() { return { profile: {}, measurements: [], workouts: [] }; }
  function load() {
    try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && v.workouts) return Object.assign(blank(), v); } catch (e) {}
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const isoOf = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
  const today = () => isoOf(new Date());
  const fmtDate = (iso) => { const [y, m, d] = iso.split("-"); return `${+d} ${MONTHS[+m - 1]} ${y}`; };
  const fmtShort = (iso) => { const [, m, d] = iso.split("-"); return `${+d}.${m}`; };
  const n = (v) => { const x = parseFloat(String(v ?? "").replace(",", ".")); return isFinite(x) ? x : null; };
  const fmt = (x, d = 1) => x == null ? "—" : (Math.round(x * 10 ** d) / 10 ** d).toLocaleString("ru-RU");
  const img = (p) => "img/" + p;
  const ex = (id) => DB && DB.exercises[id];
  const daysAgo = (iso) => (Date.parse(today()) - Date.parse(iso)) / 864e5;
  function weekStart(iso) { const d = new Date(iso + "T00:00:00Z"); const w = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - w); return d.toISOString().slice(0, 10); }

  function toast(msg) {
    document.querySelectorAll(".toast").forEach((x) => x.remove());
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 1800);
  }
  function armed(btn, fn) {
    if (btn.classList.contains("armed")) { fn(); return; }
    btn.classList.add("armed"); const old = btn.textContent; btn.textContent = "Точно? Нажмите ещё раз";
    setTimeout(() => { btn.classList.remove("armed"); btn.textContent = old; }, 3000);
  }

  // ---------- данные журнала ----------
  const workout = (id) => S.workouts.find((w) => w.id === id);
  const doneSets = (it) => it.sets.filter((s) => n(s.r));
  const hasSets = (w) => w.items.some((it) => doneSets(it).length);
  const byDate = (a, b) => a.date.localeCompare(b.date) || a.created - b.created;
  const sortedWorkouts = () => [...S.workouts].sort((a, b) => byDate(b, a));
  function exGroups(exId) {
    const e = ex(exId); if (!e) return [];
    return [...new Set(e.primaryMuscles.map((m) => MUSCLE_GROUP[m]).filter(Boolean))];
  }
  function analyze(w) {
    const a = { sets: 0, tonnage: 0, groups: {}, best: null, exCount: 0 };
    w.items.forEach((it) => {
      const ds = doneSets(it); if (!ds.length) return;
      a.exCount++;
      ds.forEach((s) => {
        const W = n(s.w) || 0, R = n(s.r);
        a.sets++; a.tonnage += W * R;
        if (!a.best || W > a.best.w || (W === a.best.w && R > a.best.r)) a.best = { exId: it.exId, w: W, r: R, sets: ds.length };
      });
      const gs = exGroups(it.exId);
      gs.forEach((g) => { a.groups[g] = (a.groups[g] || 0) + ds.length / gs.length; });
    });
    return a;
  }
  const itemMax = (it) => { const ws = doneSets(it).map((s) => n(s.w)).filter((x) => x != null); return ws.length ? Math.max(...ws) : null; };
  function exHistory(exId, exceptId) {
    return sortedWorkouts().filter((w) => w.id !== exceptId)
      .map((w) => ({ w, it: w.items.find((i) => i.exId === exId) })).filter((x) => x.it && doneSets(x.it).length);
  }
  const setsLine = (sets) => sets.filter((s) => n(s.r)).map((s) => (n(s.w) ? fmt(n(s.w)) + "×" : "") + n(s.r)).join(", ");
  function best(exId) {
    let maxW = null, e1rm = null;
    S.workouts.forEach((w) => w.items.filter((i) => i.exId === exId).forEach((i) => doneSets(i).forEach((s) => {
      const W = n(s.w), R = n(s.r);
      if (W != null && (maxW == null || W > maxW)) maxW = W;
      if (W && R <= 12) { const e = W * (1 + R / 30); if (e1rm == null || e > e1rm) e1rm = e; }
    })));
    return { maxW, e1rm };
  }
  function ensureWorkoutForToday() {
    let w = S.workouts.find((x) => x.date === today());
    if (!w) { w = { id: uid(), date: today(), created: Date.now(), note: "", items: [] }; S.workouts.push(w); save(); }
    return w;
  }
  function addExercise(w, exId) {
    if (!w.items.find((i) => i.exId === exId)) {
      const prev = exHistory(exId, w.id)[0];
      const first = prev ? doneSets(prev.it)[0] : null;
      w.items.push({ exId, sets: [{ w: first ? first.w : "", r: "" }] });
    }
    w.done = false; save();
  }

  // ---------- движок прогресса ----------
  function progress(excludeId) {
    const ws = S.workouts.filter((w) => w.id !== excludeId && hasSets(w)).sort(byDate);
    const maxW = {}, seen = new Set(), per = {};
    let xp = 0;
    const weeks = {};
    ws.forEach((w) => {
      const a = analyze(w), prs = []; let newEx = false;
      w.items.forEach((it) => {
        if (!doneSets(it).length) return;
        if (!seen.has(it.exId)) { if (seen.size) newEx = true; seen.add(it.exId); }
        const m = itemMax(it);
        if (m != null && maxW[it.exId] != null && m > maxW[it.exId]) prs.push(it.exId);
        if (m != null) maxW[it.exId] = Math.max(maxW[it.exId] ?? -Infinity, m);
      });
      const dq = dailyFor(w.date), dqDone = dq.check({ a, prs, newEx });
      const lines = [
        ["Тренировка завершена", XP_RULES.workout],
        [`Подходы: ${a.sets}`, Math.min(a.sets, XP_RULES.maxSets) * XP_RULES.perSet],
        [`Вес вырос: ${prs.length} упр.`, Math.min(prs.length, XP_RULES.maxPr) * XP_RULES.pr],
      ];
      if (dqDone) lines.push([`Задание дня`, XP_RULES.daily]);
      const sum = lines.reduce((s, l) => s + l[1], 0);
      xp += sum; per[w.id] = { lines, sum, prs, dq, dqDone, a };
      const wk = weekStart(w.date);
      weeks[wk] = weeks[wk] || { count: 0, groups: new Set() };
      weeks[wk].count++; Object.keys(a.groups).forEach((g) => weeks[wk].groups.add(g));
    });
    const wv = Object.values(weeks);
    const ctx = {
      ws, profile: S.profile, measurements: S.measurements,
      maxWeekWorkouts: Math.max(0, ...wv.map((x) => x.count)),
      maxWeekGroups: Math.max(0, ...wv.map((x) => x.groups.size)),
      maxTonnage: Math.max(0, ...ws.map((w) => per[w.id].a.tonnage)),
      best: (ids, minR) => { let b = 0; ws.forEach((w) => w.items.filter((i) => ids.includes(i.exId)).forEach((i) => doneSets(i).forEach((s) => { if (n(s.r) >= minR && n(s.w) > b) b = n(s.w); }))); return b; },
      maxReps: (ids) => { let b = 0; ws.forEach((w) => w.items.filter((i) => ids.includes(i.exId)).forEach((i) => doneSets(i).forEach((s) => { if (n(s.r) > b) b = n(s.r); }))); return b; },
    };
    const quests = QUESTS.map((q) => {
      if (q.locked) return { ...q, cur: 0, target: 1, done: false };
      const [cur, target] = q.p(ctx);
      return { ...q, cur: Math.min(cur, target), target, done: cur >= target };
    });
    const questsDone = quests.filter((q) => q.done).length;
    xp += quests.filter((q) => q.done).reduce((s, q) => s + q.xp, 0);
    let li = 0;
    LEVELS.forEach((L, i) => { if (xp >= L.xp && questsDone >= L.quests) li = i; });
    return { xp, per, quests, questsDone, level: LEVELS[li], next: LEVELS[li + 1] || null, ws };
  }

  // ---------- графика ----------
  const ICONS = {
    user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/>',
    ruler: '<path d="M4 16 16 4l4 4L8 20z"/><path d="M8 12l2 2M11 9l2 2M14 6l2 2"/>',
    flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
    fire: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5 1 1.5 2 2 2.5 2C11.5 7.5 11.5 5 12 3z"/>',
    body: '<circle cx="12" cy="4.5" r="2"/><path d="M6 8.5h12M12 8.5V14m0 0-3 7m3-7 3 7"/>',
    weight: '<path d="M7 9h10l2 11H5z"/><circle cx="12" cy="6" r="2.5"/>',
    bar: '<path d="M6 7v10M3.5 9.5v5M18 7v10M20.5 9.5v5M6 12h12"/>',
    users: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 20c.9-3.3 3.2-4.8 6-4.8s5.1 1.5 6 4.8"/><path d="M16 5.5a3 3 0 0 1 0 6M17.5 15.5c1.7.6 2.9 2 3.5 4.5"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>',
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.flag}</svg>`;
  function badge(L, size = 46) {
    return `<svg class="badge" style="width:${size}px;height:${size * 1.13}px" viewBox="0 0 46 52" role="img" aria-label="Уровень ${L.n}">
      <path d="M23 2 43 13v24L23 50 3 37V13z" fill="${L.color}" fill-opacity=".18" stroke="${L.color}" stroke-width="2.5"/>
      <text x="23" y="33" text-anchor="middle" fill="${L.color}" style="font:800 22px var(--f-display)">${L.n}</text></svg>`;
  }
  function bodyMap(g) {
    const vals = Object.values(g), max = Math.max(1, ...vals);
    const f = (id) => g[id] ? `fill="var(--accent)" fill-opacity="${(0.35 + 0.65 * g[id] / max).toFixed(2)}"` : `fill="var(--idle)"`;
    const s = 'fill="var(--skin)"';
    const pair = (cx, fn) => fn(cx) + fn(120 - cx);
    const front = `
      <circle cx="60" cy="16" r="11" ${s}/>
      <rect x="54" y="26" width="12" height="9" rx="3" ${f("neck")}/>
      <path d="M47 39 55 32h10l8 7z" ${f("traps")}/>
      ${pair(37, (x) => `<ellipse cx="${x}" cy="46" rx="10" ry="9" ${f("shoulders")}/>`)}
      <rect x="45" y="39" width="14.5" height="21" rx="6" ${f("chest")}/><rect x="60.5" y="39" width="14.5" height="21" rx="6" ${f("chest")}/>
      <rect x="49" y="62" width="22" height="38" rx="6" ${f("abs")}/>
      <path d="M60 64v34M50 74h20M50 86h20" stroke="var(--bg)" stroke-width="1.2" opacity=".55"/>
      ${pair(33, (x) => `<ellipse cx="${x}" cy="66" rx="6" ry="12" ${f("biceps")}/>`)}
      ${pair(29, (x) => `<ellipse cx="${x}" cy="94" rx="5" ry="13" ${f("forearms")}/>`)}
      ${pair(27, (x) => `<circle cx="${x}" cy="112" r="4" ${s}/>`)}
      <path d="M48 101h24l-6 11H54z" ${s}/>
      ${pair(50, (x) => `<ellipse cx="${x}" cy="138" rx="9" ry="26" ${f("quads")}/>`)}
      ${pair(56.5, (x) => `<ellipse cx="${x}" cy="124" rx="3" ry="11" ${f("hips")}/>`)}
      ${pair(50, (x) => `<ellipse cx="${x}" cy="193" rx="6" ry="21" ${f("calves")}/>`)}
      ${pair(50, (x) => `<ellipse cx="${x}" cy="219" rx="7" ry="4" ${s}/>`)}`;
    const back = `
      <circle cx="60" cy="16" r="11" ${s}/>
      <rect x="54" y="26" width="12" height="9" rx="3" ${f("neck")}/>
      ${pair(37, (x) => `<ellipse cx="${x}" cy="46" rx="10" ry="9" ${f("shoulders")}/>`)}
      <path d="M45 48 58 56v32l-8-2-6-22z" ${f("back")}/><path d="M75 48 62 56v32l8-2 6-22z" ${f("back")}/>
      <rect x="51" y="88" width="18" height="13" rx="4" ${f("lowerback")}/>
      <path d="M46 40 60 30l14 10-14 26z" ${f("traps")}/>
      ${pair(33, (x) => `<ellipse cx="${x}" cy="66" rx="6" ry="12" ${f("triceps")}/>`)}
      ${pair(29, (x) => `<ellipse cx="${x}" cy="94" rx="5" ry="13" ${f("forearms")}/>`)}
      ${pair(27, (x) => `<circle cx="${x}" cy="112" r="4" ${s}/>`)}
      ${pair(52, (x) => `<ellipse cx="${x}" cy="113" rx="9" ry="10" ${f("glutes")}/>`)}
      ${pair(50, (x) => `<ellipse cx="${x}" cy="146" rx="8.5" ry="22" ${f("hamstrings")}/>`)}
      ${pair(50, (x) => `<ellipse cx="${x}" cy="189" rx="7" ry="17" ${f("calves")}/>`)}
      ${pair(50, (x) => `<ellipse cx="${x}" cy="219" rx="7" ry="4" ${s}/>`)}`;
    return `<svg class="body" viewBox="0 0 250 244" role="img" aria-label="Карта проработанных мышц">
      <g>${front}</g><g transform="translate(130 0)">${back}</g>
      <text x="60" y="240" text-anchor="middle">спереди</text><text x="190" y="240" text-anchor="middle">сзади</text></svg>`;
  }
  function weekBars(weeks) {
    const W = 320, H = 130, top = 16, bottom = 22, max = Math.max(1, ...weeks.map((w) => w.v)), bw = W / weeks.length;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Объём по неделям">
      <line x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}" stroke="var(--line)"/>
      ${weeks.map((w, i) => {
        const h = Math.max(w.v ? 4 : 2, (w.v / max) * (H - top - bottom)), x = i * bw + bw * 0.22, y = H - bottom - h;
        const last = i === weeks.length - 1;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.56).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${w.v ? "var(--accent)" : "var(--idle)"}" fill-opacity="${last || !w.v ? 1 : 0.55}"/>
          ${w.v === max && w.v ? `<text x="${(x + bw * 0.28).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" style="fill:var(--fg)">${fmt(w.v / 1000)} т</text>` : ""}
          <text x="${(x + bw * 0.28).toFixed(1)}" y="${H - 6}" text-anchor="middle">${fmtShort(w.wk)}</text>`;
      }).join("")}</svg>`;
  }

  // ---------- навигация ----------
  // Каждый переход записывается в историю браузера, поэтому системный жест/кнопка «Назад»
  // возвращает на предыдущий экран, а не закрывает приложение.
  const snap = () => ({ tab: ui.tab, workoutId: ui.workoutId, summaryId: ui.summaryId, groupId: ui.groupId, q: ui.q, pickFor: ui.pickFor, period: ui.period, coach: ui.coach });
  function go(tab, opts = {}) {
    Object.assign(ui, { tab }, opts); render(); window.scrollTo(0, 0);
    try { history.pushState({ ui: snap() }, ""); } catch (e) {}
  }
  window.addEventListener("popstate", (e) => {
    if ($("#dlg").open) { finishClose(); return; }
    const st = e.state && e.state.ui;
    if (st) { Object.assign(ui, st); render(); window.scrollTo(0, 0); }
  });
  document.querySelectorAll("nav.tabs button").forEach((b) => b.addEventListener("click", () => {
    const t = b.dataset.tab;
    go(t, Object.assign({ coach: false }, t === "log" ? { workoutId: null, summaryId: null } : t === "catalog" ? { groupId: null, q: "" } : {}));
  }));
  function render() {
    document.querySelectorAll("nav.tabs button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.tab === ui.tab)));
    const v = $("#view");
    if (!DB) { v.innerHTML = `<p class="muted">Загрузка базы упражнений…</p>`; return; }
    if (ui.coach) renderCoach(v);
    else if (ui.tab === "home") renderHome(v);
    else if (ui.tab === "log") ui.summaryId ? renderSummary(v) : ui.workoutId ? renderWorkout(v) : renderLog(v);
    else if (ui.tab === "catalog") renderCatalog(v);
    else if (ui.tab === "progress") renderProgress(v);
    else renderProfile(v);
  }
  const backBtn = (id, title, sub) => `<button class="back" id="${id}"><i>‹</i><span><h1 style="font-size:24px">${esc(title)}</h1>${sub ? `<span class="muted" style="font-size:13px">${esc(sub)}</span>` : ""}</span></button>`;

  // ---------- Тренер: оценка формы 0–100 ----------
  // Всё считается на устройстве по журналу. Формулы простые и объяснимые: каждая оценка
  // показывает, из каких цифр она получилась.
  const LIFTS = [
    { name: "Жим лёжа", ids: ["Barbell_Bench_Press_-_Medium_Grip", "Wide-Grip_Barbell_Bench_Press", "Close-Grip_Barbell_Bench_Press"], elite: 1.75 },
    { name: "Присед", ids: ["Barbell_Squat", "Barbell_Full_Squat", "Front_Squat_Clean_Grip"], elite: 2.4 },
    { name: "Становая тяга", ids: ["Barbell_Deadlift", "Romanian_Deadlift", "Stiff-Legged_Barbell_Deadlift"], elite: 2.75 },
    { name: "Жим над головой", ids: ["Barbell_Shoulder_Press", "Standing_Military_Press", "Machine_Shoulder_Military_Press"], elite: 1.1 },
  ];
  const BW_IDS = ["Pullups", "Chin-Up", "Pushups", "Dips_-_Chest_Version", "Dips_-_Triceps_Version", "Bench_Dips", "Crunches", "Bodyweight_Squat"];
  const MAJOR = ["chest", "back", "shoulders", "quads", "hamstrings", "glutes", "biceps", "triceps"];
  const e1rm = (w, r) => r <= 1 ? w : w * (1 + r / 30);
  const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
  const pctStr = (x) => `${fmt(x * 100, 0)}%`;

  function coach() {
    const P = progress(), ws = P.ws;
    const bwKnown = lastWeight(), bw = bwKnown || 75;
    const kf = S.profile.sex === "Женский" ? 0.7 : 1;
    const within = (d) => ws.filter((w) => daysAgo(w.date) < d && daysAgo(w.date) >= 0);
    const w90 = within(90), w30 = within(30), w28 = within(28);
    const sets = (list, fn) => list.forEach((w) => w.items.forEach((it) => doneSets(it).forEach((s) => fn(it, n(s.w) || 0, n(s.r), w))));
    const stats = [];

    // 1. Сила: расчётный 1ПМ в базовых движениях относительно веса тела
    const lifts = LIFTS.map((L) => {
      let best = 0; sets(w90, (it, W, R) => { if (L.ids.includes(it.exId) && W > 0 && R <= 12) best = Math.max(best, e1rm(W, R)); });
      return { ...L, best, ratio: best / bw, score: best ? clamp((100 * best / bw) / (L.elite * kf)) : null };
    });
    let pullMax = 0; sets(w90, (it, W, R) => { if (["Pullups", "Chin-Up"].includes(it.exId)) pullMax = Math.max(pullMax, R); });
    const sParts = lifts.filter((l) => l.score != null).map((l) => l.score);
    if (pullMax) sParts.push(clamp(pullMax / (kf < 1 ? 10 : 20) * 100));
    let sScore = sParts.length ? sParts.reduce((a, b) => a + b, 0) / sParts.length : null, sDetail;
    if (sScore == null) { // нет базовых: берём лучший базовый (compound) подход любого упражнения
      // только свободные веса: тренажёры (жим ногами и т.п.) сильно завышают цифры
      let b = 0, bn = "";
      sets(w90, (it, W, R) => { const e = ex(it.exId); if (e && e.mechanic === "compound" && ["barbell", "dumbbell", "kettlebells"].includes(e.equipment) && W > 0 && R <= 12 && e1rm(W, R) > b) { b = e1rm(W, R); bn = e.name; } });
      if (b) { sScore = Math.min(50, clamp((100 * b / bw) / (2.2 * kf))); sDetail = `Жима, приседа и становой в журнале нет — оценка примерная, по лучшему подходу (${bn}: 1ПМ ≈ ${fmt(b, 0)} кг).`; }
    }
    if (!sDetail && sScore != null) sDetail = [...lifts.filter((l) => l.best).map((l) => `${l.name}: 1ПМ ≈ ${fmt(l.best, 0)} кг (${fmt(l.ratio, 2)}× веса тела)`),
      ...(pullMax ? [`Подтягивания: ${pullMax} раз`] : [])].join(" · ");
    stats.push({ key: "str", name: "Сила", short: "Сила", score: sScore, detail: sDetail || "Нет базовых упражнений со штангой или гантелями за 3 месяца — добавьте жим, присед или тягу." });

    // 2. Выносливость: объём за тренировку, доля многоповторных подходов, повторы с собственным весом
    let tot = 0, hi = 0, bwMax = 0;
    sets(w30, (it, W, R) => { tot++; if (R >= 12) hi++; });
    sets(w90, (it, W, R) => { const e = ex(it.exId); if (BW_IDS.includes(it.exId) || (e && e.equipment === "body only" && !W)) bwMax = Math.max(bwMax, R); });
    const avgSets = w30.length ? tot / w30.length : 0;
    const eScore = w30.length ? 40 * Math.min(1, avgSets / 20) + 30 * Math.min(1, (hi / (tot || 1)) / 0.4) + 30 * Math.min(1, bwMax / 30) : null;
    stats.push({ key: "end", name: "Выносливость", short: "Выносл.", score: eScore,
      detail: w30.length ? `${fmt(avgSets)} подходов за тренировку · ${pctStr(hi / (tot || 1))} подходов на 12+ повторов · ${bwMax ? `максимум ${bwMax} повторов с собственным весом` : "упражнений с собственным весом нет"}` : "Нет тренировок за последние 30 дней." });

    // 3. Масса (рабочий объём): подходов в неделю на крупную группу, норма 10+
    const g28 = {}; w28.forEach((w) => Object.entries(P.per[w.id].a.groups).forEach(([g, x]) => g28[g] = (g28[g] || 0) + x));
    const perWeek = Object.fromEntries(MAJOR.map((g) => [g, (g28[g] || 0) / 4]));
    const mScore = w28.length ? MAJOR.reduce((s, g) => s + Math.min(1, perWeek[g] / 10), 0) / MAJOR.length * 100 : null;
    const avgGroup = MAJOR.reduce((s, g) => s + perWeek[g], 0) / MAJOR.length;
    stats.push({ key: "mass", name: "Масса", short: "Масса", score: mScore,
      detail: w28.length ? `В среднем ${fmt(avgGroup)} подхода в неделю на крупную группу мышц (для роста мышц нужно 10–20)` : "Нет тренировок за последние 4 недели." });

    // 4. Режим: частота против цели из профиля
    const goal = Math.max(1, parseInt(S.profile.freq) || 3);
    const perW = w28.length / 4, activeWeeks = new Set(w28.map((w) => Math.floor(daysAgo(w.date) / 7))).size;
    const rScore = ws.length ? 80 * Math.min(1, perW / goal) + 20 * Math.min(1, activeWeeks / 4) : null;
    stats.push({ key: "reg", name: "Режим", short: "Режим", score: rScore,
      detail: `${fmt(perW)} тренировки в неделю при цели ${goal} · активных недель: ${activeWeeks} из 4` });

    // 5. Баланс: жимы / тяги / ноги / кор
    const g30 = {}; w30.forEach((w) => Object.entries(P.per[w.id].a.groups).forEach(([g, x]) => g30[g] = (g30[g] || 0) + x));
    const sum = (gs) => gs.reduce((s, g) => s + (g30[g] || 0), 0);
    const push = sum(["chest", "shoulders", "triceps"]), pull = sum(["back", "biceps", "traps"]),
      legs = sum(["quads", "hamstrings", "glutes", "calves", "hips"]), core = sum(["abs", "lowerback"]), all = push + pull + legs + core;
    let bScore = null;
    if (all >= 6) {
      const pen = 60 * Math.abs(push - pull) / ((push + pull) || 1) + (legs / all < 0.25 ? (0.25 - legs / all) / 0.25 * 35 : 0) + (core / all < 0.05 ? 15 : 0);
      bScore = clamp(100 - pen);
    }
    stats.push({ key: "bal", name: "Баланс", short: "Баланс", score: bScore,
      detail: all ? `Жимы ${pctStr(push / all)} · тяги ${pctStr(pull / all)} · ноги ${pctStr(legs / all)} · кор ${pctStr(core / all)}` : "Нет данных за 30 дней." });

    // 6. Прогресс: изменение рабочих весов (или повторов) за 2 месяца
    const ses = {};
    within(60).forEach((w) => w.items.forEach((it) => {
      const ds = doneSets(it); if (!ds.length) return;
      const m = Math.max(...ds.map((s) => (n(s.w) ? e1rm(n(s.w), Math.min(n(s.r), 12)) : n(s.r))));
      (ses[it.exId] = ses[it.exId] || []).push(m);
    }));
    const ch = Object.values(ses).filter((x) => x.length >= 2).map((x) => (x[x.length - 1] - x[0]) / x[0] * 100);
    const avgCh = ch.length ? ch.reduce((a, b) => a + b, 0) / ch.length : null;
    stats.push({ key: "prog", name: "Прогресс", short: "Прогресс", score: avgCh == null ? null : clamp(40 + avgCh * 4),
      detail: avgCh == null ? "Нужно хотя бы две записи одного упражнения за 2 месяца." : `${avgCh >= 0 ? "+" : ""}${fmt(avgCh)}% к рабочим весам за 2 месяца (по ${ch.length} упр.)` });

    // итог и тип атлета
    const W = { str: 0.25, end: 0.15, mass: 0.2, reg: 0.2, bal: 0.1, prog: 0.1 };
    const known = stats.filter((s) => s.score != null);
    const overall = known.length ? known.reduce((a, s) => a + s.score * W[s.key], 0) / known.reduce((a, s) => a + W[s.key], 0) : null;
    const by = Object.fromEntries(stats.map((s) => [s.key, s.score]));
    const trio = [["str", "Палуан", "силовой тип: главное — тяжёлые веса"], ["end", "Выносливый", "много повторов и объёма, хорошая работоспособность"], ["mass", "Бодибилдер", "большой рабочий объём на каждую группу"]]
      .filter(([k]) => by[k] != null).sort((a, b) => by[b[0]] - by[a[0]]);
    let type = null;
    if (trio.length >= 2 && ws.length >= 3) type = by[trio[0][0]] - by[trio[trio.length - 1][0]] < 12 ? { name: "Универсал", about: "показатели развиты ровно" } : { name: trio[0][1], about: trio[0][2] };
    const formName = overall == null ? "" : overall < 25 ? "Старт" : overall < 45 ? "Базовая форма" : overall < 65 ? "Хорошая форма" : overall < 80 ? "Сильная форма" : "Отличная форма";

    // советы: от слабых мест, с конкретными упражнениями
    const tips = [];
    const firstNotDone = (ids) => ids.find((i) => !ws.some((w) => w.items.some((it) => it.exId === i))) || ids[0];
    if (ws.length < 3) tips.push({ t: "Мало данных для точной оценки", d: `Записано тренировок: ${ws.length}. После 3–4 тренировок оценки станут точнее, особенно «Прогресс» и «Режим».`, ex: [] });
    if (!bwKnown) tips.push({ t: "Укажите вес в профиле", d: "Сила считается относительно веса тела. Сейчас взято 75 кг по умолчанию.", ex: [] });
    const missing = lifts.filter((l) => !l.best);
    if (missing.length && missing.length < 4) tips.push({ t: "Добавьте недостающие базовые движения", d: `Для полной оценки силы не хватает: ${missing.map((l) => l.name.toLowerCase()).join(", ")}.`, ex: missing.map((l) => l.ids[0]) });
    else if (missing.length === 4 && ws.length) tips.push({ t: "Включите базу: жим, присед, становую", d: "Базовые упражнения дают больше всего силы и позволяют честно её измерить.", ex: LIFTS.slice(0, 3).map((l) => l.ids[0]) });
    if (pull > 0 && push > pull * 1.4) tips.push({ t: "Тяги отстают от жимов", d: `На ${fmt(push, 0)} подходов жимов только ${fmt(pull, 0)} тяговых. Перекос нагружает плечи; добавьте 3–4 подхода тяг на тренировку.`, ex: ["Bent_Over_Barbell_Row", "Pullups", "Seated_Cable_Rows"] });
    if (all >= 6 && legs / all < 0.2) tips.push({ t: "Мало работы на ноги", d: `Ноги — только ${pctStr(legs / all)} подходов. Ноги — самые большие мышцы, их тренировка поднимает и силу, и общий тонус.`, ex: ["Barbell_Squat", "Leg_Press", "Romanian_Deadlift"] });
    const weakG = MAJOR.filter((g) => perWeek[g] < 4 && w28.length).sort((a, b) => perWeek[a] - perWeek[b]).slice(0, 3);
    if (mScore != null && mScore < 50 && weakG.length) tips.push({ t: "Добавьте объём", d: `Меньше всего подходов в неделю: ${weakG.map((g) => `${GROUP_RU[g].toLowerCase()} (${fmt(perWeek[g])})`).join(", ")}. Цель — 10+ подходов на группу в неделю.`, ex: weakG.map((g) => DB.groups.find((x) => x.id === g).exercises[0]) });
    if (sScore != null && sScore < 45) tips.push({ t: "Силовой блок", d: "2 раза в неделю делайте базовые упражнения по 4–6 повторов. Как выполнили все подходы — прибавляйте 2,5 кг.", ex: [firstNotDone(LIFTS[0].ids), firstNotDone(LIFTS[1].ids)] });
    if (eScore != null && eScore < 45) tips.push({ t: "Поработайте над выносливостью", d: "В конце тренировки добавьте 2–3 подхода на 15–20 повторов или круг из упражнений с собственным весом.", ex: ["Pushups", "Bodyweight_Squat", "Crunches"] });
    if (rScore != null && rScore < 60 && ws.length >= 2) tips.push({ t: "Наладьте режим", d: `Сейчас ${fmt(perW)} тренировки в неделю при цели ${goal}. Закрепите постоянные дни, например пн/ср/пт.`, ex: [] });
    if (avgCh != null && avgCh <= 0 && ch.length >= 2) tips.push({ t: "Веса стоят на месте", d: "Используйте двойную прогрессию: доведите повторы до верха диапазона (например 10), затем прибавьте вес. Раз в 6–8 недель — облегчённая неделя.", ex: [] });
    const strongest = known.slice().sort((a, b) => b.score - a.score)[0];
    return { stats, overall, formName, type, tips: tips.slice(0, 4), strongest, n: ws.length };
  }

  function radar(stats) {
    const cx = 190, cy = 136, R = 92, k = stats.length;
    const pt = (i, r) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / k; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    const ring = (f) => stats.map((_, i) => pt(i, R * f).map((v) => v.toFixed(1)).join(",")).join(" ");
    const poly = stats.map((s, i) => pt(i, R * (s.score || 0) / 100).map((v) => v.toFixed(1)).join(",")).join(" ");
    return `<svg class="chart" viewBox="0 0 380 272" role="img" aria-label="Профиль формы">
      ${[0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${ring(f)}" fill="none" stroke="var(--line)" stroke-width="1"/>`).join("")}
      ${stats.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)"/>`; }).join("")}
      <polygon points="${poly}" fill="var(--accent)" fill-opacity=".28" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
      ${stats.map((s, i) => { const [x, y] = pt(i, R * (s.score || 0) / 100); return s.score == null ? "" : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="var(--accent)"/>`; }).join("")}
      ${stats.map((s, i) => { const [x, y] = pt(i, R + 22); const anc = Math.abs(x - cx) < 5 ? "middle" : x > cx ? "start" : "end";
        return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anc}" style="fill:var(--fg);font:600 12px var(--f-body)">${s.short} <tspan style="fill:var(--muted);font:500 11px var(--f-num)">${s.score == null ? "—" : Math.round(s.score)}</tspan></text>`; }).join("")}
    </svg>`;
  }
  const scoreColor = (s) => s == null ? "var(--muted)" : s >= 65 ? "var(--good)" : s >= 40 ? "var(--xp)" : "var(--bad)";

  function renderCoach(v) {
    const C = coach();
    const exChip = (id) => { const e = ex(id); return e ? `<button class="chip ex-chip" data-ex="${id}">${esc(e.name)}</button>` : ""; };
    v.innerHTML = `
      ${backBtn("backC", "Тренер", "Разбор формы по вашему журналу")}
      ${C.n === 0 ? `<div class="panel empty"><div class="qicon" style="width:52px;height:52px">${icon("spark")}</div><h2>Пока нечего разбирать</h2>
        <p class="muted" style="margin:0;max-width:44ch">Запишите первую тренировку. Тренер оценит силу, выносливость, объём, режим, баланс и прогресс по шкале от 0 до 100 и подскажет, что подтянуть.</p>
        <button class="btn red" id="startC">Начать тренировку</button></div>` : `
      <div class="coach-hero">
        <div class="score-ring" style="--p:${C.overall ?? 0};--c:${scoreColor(C.overall)}"><b class="num">${C.overall == null ? "—" : Math.round(C.overall)}</b><small>из 100</small></div>
        <div style="min-width:0"><span class="lbl">Общая форма</span><h2 style="font-size:24px">${C.formName}</h2>
          ${C.type ? `<div class="muted" style="font-size:14px">Тип: <b style="color:var(--fg)">${C.type.name}</b> — ${C.type.about}</div>` : ""}
          ${C.strongest ? `<div class="muted" style="font-size:14px">Сильная сторона: ${C.strongest.name.toLowerCase()}</div>` : ""}</div>
      </div>
      <div class="panel">${radar(C.stats)}</div>
      <div class="exlist">${C.stats.map((s) => `
        <div class="panel" style="gap:8px">
          <div class="row spread"><b style="font:700 18px var(--f-display);text-transform:uppercase">${s.name}</b>
            <span class="num" style="font-weight:700;color:${scoreColor(s.score)}">${s.score == null ? "—" : Math.round(s.score)}<span class="muted" style="font-weight:500"> / 100</span></span></div>
          <div class="bar"><i style="width:${s.score ?? 0}%;background:${scoreColor(s.score)}"></i></div>
          <small class="muted">${esc(s.detail)}</small></div>`).join("")}</div>
      <h2>Советы тренера</h2>
      ${C.tips.length ? C.tips.map((t) => `<div class="quest-card" style="align-items:flex-start"><div class="qicon">${icon("spark")}</div>
        <div class="t"><b>${esc(t.t)}</b><small class="muted" style="font-size:14px">${esc(t.d)}</small>
        ${t.ex.length ? `<div class="row" style="gap:6px">${t.ex.map(exChip).join("")}</div>` : ""}</div></div>`).join("")
        : `<div class="quest-card done"><div class="qicon">${icon("check")}</div><div class="t"><b>Слабых мест не видно</b><small class="muted">Продолжайте в том же духе и постепенно прибавляйте веса.</small></div></div>`}
      <p class="muted" style="margin:0;font-size:13px">Как считается: сила — расчётный максимум на 1 повтор (формула Эпли) в жиме, приседе, становой и жиме над головой относительно веса тела; выносливость — подходы за тренировку, доля подходов на 12+ повторов и повторы с собственным весом; масса — подходы в неделю на крупные группы мышц; режим — частота против цели из профиля; баланс — соотношение жимов, тяг, ног и кора; прогресс — изменение рабочих весов за 2 месяца. Оценка — ориентир по вашим записям, не медицинская рекомендация.</p>`}`;
    $("#backC").onclick = () => go(ui.tab, { coach: false });
    if ($("#startC")) $("#startC").onclick = () => { const w = ensureWorkoutForToday(); go("log", { workoutId: w.id, summaryId: null, coach: false }); };
    v.querySelectorAll("[data-ex]").forEach((b) => b.onclick = () => openExercise(b.dataset.ex));
  }

  // ---------- Главная ----------
  function lastWeight() { const ms = [...S.measurements].sort((a, b) => a.date.localeCompare(b.date)); return ms.length ? ms[ms.length - 1].weight : n(S.profile.weight); }
  function renderHome(v) {
    const P = progress(), p = S.profile, L = P.level, N = P.next;
    const weekWs = P.ws.filter((w) => weekStart(w.date) === weekStart(today()));
    const goal = Math.max(1, parseInt(p.freq) || 3);
    const groups = {}; let ton = 0;
    weekWs.forEach((w) => { const a = P.per[w.id].a; ton += a.tonnage; Object.entries(a.groups).forEach(([g, x]) => groups[g] = (groups[g] || 0) + x); });
    const age = p.birth ? Math.floor((Date.now() - new Date(p.birth)) / 31557600000) : null;
    const tw = S.workouts.find((w) => w.date === today());
    const twP = tw && P.per[tw.id];
    const dq = dailyFor(today()), dqDone = twP && twP.dqDone;
    const xpPct = N ? Math.min(100, ((P.xp - L.xp) / (N.xp - L.xp)) * 100) : 100;
    const open = P.quests.filter((q) => !q.done && !q.locked).sort((a, b) => b.cur / b.target - a.cur / a.target).slice(0, 2);
    const C = coach(), cs = Object.fromEntries(C.stats.map((s) => [s.key, s]));
    const statTile = (k) => { const s = cs[k]; return `<button class="tile stat-tile" data-coach><span class="lbl">${s.short}</span><b>${s.score == null ? "—" : Math.round(s.score)}</b>
      <div class="bar"><i style="width:${s.score ?? 0}%;background:${scoreColor(s.score)}"></i></div></button>`; };
    v.innerHTML = `
      <div class="brandline" aria-label="Batyr FIT">BATYR<i></i><span>FIT</span></div>
      <div class="hero">
        <div class="row spread" style="flex-wrap:nowrap">
          <div class="lvl-line">${badge(L)}<div><h1>${esc(p.name || "Атлет")}</h1>
            <div class="lvl-name" style="color:${L.color}">Уровень ${L.n} · ${L.name}</div></div></div>
          <span class="streak" title="Тренировок на этой неделе / цель">${icon("fire")}${weekWs.length}/${goal}</span>
        </div>
        <div class="row spread"><span class="lbl">Опыт</span><span class="num muted" style="font-size:13px">${P.xp}${N ? ` / ${N.xp}` : ""} XP</span></div>
        <div class="bar xp"><i style="width:${xpPct}%"></i></div>
        ${N ? `<div class="muted" style="font-size:13px">До уровня «${N.name}»: ${Math.max(0, N.xp - P.xp)} XP${P.questsDone < N.quests ? ` и ещё ${N.quests - P.questsDone} зад.` : ""}</div>` : `<div class="muted" style="font-size:13px">Максимальный уровень. Ты Батыр!</div>`}
      </div>
      <div class="figure-grid">
        <div class="side">
          ${statTile("str")}${statTile("end")}${statTile("mass")}
        </div>
        <div>${bodyMap(groups)}</div>
        <div class="side">
          <div class="tile"><span class="lbl">Вес</span><b style="color:var(--accent)">${fmt(lastWeight())}</b><small>кг</small></div>
          <div class="tile"><span class="lbl">Рост</span><b>${fmt(n(p.height), 0)}</b><small>см</small></div>
          <div class="tile"><span class="lbl">Возраст</span><b>${age ?? "—"}</b><small>лет</small></div>
        </div>
      </div>
      <div class="quest-card ${dqDone ? "done" : ""}">
        <div class="qicon">${icon(dqDone ? "check" : "bar")}</div>
        <div class="t"><span class="lbl">Задание дня</span><b>${esc(dq.title)}</b>
          <div class="bar xp"><i style="width:${dqDone ? 100 : 0}%"></i></div></div>
        <span class="chip xp">+${XP_RULES.daily} XP</span>
      </div>
      ${open.map(questCard).join("")}
      <div class="row" style="flex-wrap:nowrap">
        <button class="btn round" id="goProg" aria-label="Уровни и задания" style="border-color:var(--accent);color:var(--accent)">${icon("trophy")}</button>
        <button class="btn round" id="goCoach" aria-label="Тренер" style="border-color:var(--blue);color:var(--blue)">${icon("spark")}</button>
        <button class="btn primary big" id="start">${tw && tw.items.length ? "Продолжить тренировку" : "Начать тренировку"}</button>
      </div>
      ${!p.height || !p.weight ? `<p class="muted" style="margin:0;font-size:14px">Заполните рост и вес в <a href="#" id="toProfile" style="color:var(--fg)">профиле</a>, чтобы видеть ИМТ и получить первое задание.</p>` : ""}`;
    $("#start").onclick = () => { const w = ensureWorkoutForToday(); go("log", { workoutId: w.id, summaryId: null }); };
    $("#goProg").onclick = () => go("progress");
    $("#goCoach").onclick = () => go("home", { coach: true });
    v.querySelectorAll("[data-coach]").forEach((b) => b.onclick = () => go("home", { coach: true }));
    if ($("#toProfile")) $("#toProfile").onclick = (e) => { e.preventDefault(); go("profile"); };
  }
  function questCard(q) {
    const pct = q.locked ? 0 : (q.cur / q.target) * 100;
    const prog = q.locked ? "Появится вместе с сообществом" : q.done ? "Выполнено" :
      `${fmt(q.cur)}${q.unit ? " " + q.unit : ""} из ${fmt(q.target)}${q.unit ? " " + q.unit : ""}`;
    return `<div class="quest-card ${q.done ? "done" : ""} ${q.locked ? "locked" : ""}">
      <div class="qicon">${icon(q.done ? "check" : q.locked ? "lock" : q.icon)}</div>
      <div class="t"><b>${esc(q.title)}</b>${q.locked ? "" : `<div class="bar ${q.done ? "xp" : ""}"><i style="width:${pct}%"></i></div>`}
        <small class="muted">${prog}</small></div>
      <span class="chip ${q.locked ? "" : "xp"}">${q.locked ? "скоро" : `+${q.xp} XP`}</span></div>`;
  }

  // ---------- Журнал ----------
  function renderLog(v) {
    const list = sortedWorkouts();
    v.innerHTML = `
      <div class="row spread"><h1>Журнал</h1><button class="btn red" id="newW">+ Тренировка</button></div>
      <div class="exlist">${list.length ? list.map(wcard).join("") : `
        <div class="panel empty"><h2>Журнал пока пуст</h2>
          <p class="muted" style="margin:0;max-width:46ch">Начните тренировку, добавьте упражнения из каталога и записывайте подходы: вес и количество повторов. За каждую тренировку начисляется опыт.</p></div>`}</div>`;
    $("#newW").onclick = () => { const w = ensureWorkoutForToday(); go("log", { workoutId: w.id }); };
    v.querySelectorAll("[data-w]").forEach((b) => b.onclick = () => {
      const w = workout(b.dataset.w); go("log", w.done ? { summaryId: w.id, workoutId: null } : { workoutId: w.id });
    });
  }
  function wcard(w) {
    const [, m, d] = w.date.split("-"), a = analyze(w);
    const names = w.items.map((i) => ex(i.exId)?.name).filter(Boolean);
    return `<button class="wcard" data-w="${w.id}">
      <div class="date"><b class="num">${+d}</b>${MONTHS[+m - 1]}</div>
      <div style="min-width:0"><b>${esc(w.note || "Тренировка")}</b>${w.done ? "" : ` <span class="chip red">идёт</span>`}<br>
        <small class="muted">${names.length ? esc(names.slice(0, 3).join(" · ")) + (names.length > 3 ? ` +${names.length - 3}` : "") : "без упражнений"}</small></div>
      <div class="num muted" style="text-align:right;font-size:13px">${a.sets} подх.<br>${fmt(a.tonnage, 0)} кг</div></button>`;
  }
  function renderWorkout(v) {
    const w = workout(ui.workoutId);
    if (!w) return go("log", { workoutId: null });
    const a = analyze(w);
    v.innerHTML = `
      ${backBtn("back", "Тренировка", fmtDate(w.date))}
      <div class="panel">
        <div class="grid-f">
          <label class="f">Дата<input type="date" id="wDate" value="${w.date}"></label>
          <label class="f">Название<input id="wNote" placeholder="Например: Спина + бицепс" value="${esc(w.note)}"></label>
        </div>
        <div class="tiles">
          <div class="tile"><span class="lbl">Упражн.</span><b id="sEx">${w.items.length}</b></div>
          <div class="tile"><span class="lbl">Подходов</span><b id="sSets">${a.sets}</b></div>
          <div class="tile"><span class="lbl">Тоннаж, кг</span><b id="sTon">${fmt(a.tonnage, 0)}</b></div>
        </div>
      </div>
      <div class="quest-card"><div class="qicon">${icon("bar")}</div><div class="t"><span class="lbl">Задание дня (${fmtShort(w.date)})</span><b>${esc(dailyFor(w.date).title)}</b></div><span class="chip xp">+${XP_RULES.daily} XP</span></div>
      <div class="panel" id="items">${w.items.length ? w.items.map((it, k) => itemHtml(w, it, k)).join("") :
        `<p class="muted" style="margin:0">Добавьте первое упражнение, чтобы записывать подходы.</p>`}</div>
      <button class="btn" id="addEx">+ Добавить упражнение</button>
      <button class="btn red big" id="finish" ${a.sets ? "" : "disabled style=\"opacity:.5\""}>Завершить тренировку</button>
      <div><button class="btn danger sm" id="delW">Удалить тренировку</button></div>`;
    $("#back").onclick = () => go("log", { workoutId: null });
    $("#wDate").onchange = (e) => { if (e.target.value) { w.date = e.target.value; save(); } };
    $("#wNote").oninput = (e) => { w.note = e.target.value; save(); };
    $("#addEx").onclick = () => go("catalog", { pickFor: w.id, groupId: null, q: "" });
    $("#finish").onclick = () => { if (!analyze(w).sets) return toast("Запишите хотя бы один подход"); w.done = true; save(); go("log", { summaryId: w.id, workoutId: null }); };
    $("#delW").onclick = (e) => armed(e.target, () => { S.workouts = S.workouts.filter((x) => x !== w); save(); toast("Тренировка удалена"); go("log", { workoutId: null }); });
    const box = $("#items");
    box.addEventListener("input", (e) => {
      const t = e.target; if (!t.dataset.f) return;
      w.items[+t.dataset.i].sets[+t.dataset.s][t.dataset.f] = t.value; save();
      const a2 = analyze(w);
      $("#sSets").textContent = a2.sets; $("#sTon").textContent = fmt(a2.tonnage, 0);
      const fb = $("#finish"); fb.disabled = !a2.sets; fb.style.opacity = a2.sets ? "" : ".5";
    });
    box.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const i = +b.dataset.i, it = w.items[i];
      if (b.dataset.act === "addset") { const last = it.sets[it.sets.length - 1] || {}; it.sets.push({ w: last.w || "", r: last.r || "" }); }
      else if (b.dataset.act === "delset") it.sets.splice(+b.dataset.s, 1);
      else if (b.dataset.act === "delex") w.items.splice(i, 1);
      else if (b.dataset.act === "up" && i > 0) [w.items[i - 1], w.items[i]] = [w.items[i], w.items[i - 1]];
      else if (b.dataset.act === "info") return openExercise(it.exId);
      else return;
      save(); renderWorkout(v);
    });
  }
  function itemHtml(w, it, k) {
    const e = ex(it.exId) || { name: it.exId, images: [] };
    const prev = exHistory(it.exId, w.id).filter((x) => x.w.date <= w.date)[0];
    return `<div class="item">
      <div class="row spread" style="flex-wrap:nowrap">
        <button class="ex" data-act="info" data-i="${k}" style="border:0;padding:0;background:none">
          ${e.images[0] ? `<img src="${img(e.images[0])}" alt="" loading="lazy" style="width:46px;height:46px">` : ""}
          <span class="t"><b>${esc(e.name)}</b><small>${prev ? `Прошлый раз (${fmtShort(prev.w.date)}): ${esc(setsLine(prev.it.sets))}` : "Первый раз: техника по нажатию"}</small></span>
        </button>
        <div class="row" style="flex:none;gap:2px">
          ${k > 0 ? `<button class="x" data-act="up" data-i="${k}" aria-label="Переместить выше">↑</button>` : ""}
          <button class="x" data-act="delex" data-i="${k}" aria-label="Убрать упражнение">×</button>
        </div>
      </div>
      <div class="sets">
        <span class="lbl">#</span><span class="lbl">Вес, кг</span><span class="lbl">Повторы</span><span></span>
        ${it.sets.map((s, j) => `
          <span class="n">${j + 1}</span>
          <input id="w-${k}-${j}" inputmode="decimal" placeholder="0" value="${esc(s.w)}" data-i="${k}" data-s="${j}" data-f="w" aria-label="Вес, подход ${j + 1}">
          <input id="r-${k}-${j}" inputmode="numeric" placeholder="0" value="${esc(s.r)}" data-i="${k}" data-s="${j}" data-f="r" aria-label="Повторы, подход ${j + 1}">
          <button class="x" data-act="delset" data-i="${k}" data-s="${j}" aria-label="Удалить подход ${j + 1}">×</button>`).join("")}
      </div>
      <div><button class="btn sm" data-act="addset" data-i="${k}">+ Подход</button></div>
    </div>`;
  }

  // ---------- Итоги тренировки ----------
  function renderSummary(v) {
    const w = workout(ui.summaryId);
    if (!w) return go("log", { summaryId: null });
    const P = progress(), before = progress(w.id), r = P.per[w.id];
    if (!r) { ui.summaryId = null; ui.workoutId = w.id; return renderWorkout(v); }
    const a = r.a, b = a.best, be = b && ex(b.exId);
    const totalG = Object.values(a.groups).reduce((s, x) => s + x, 0) || 1;
    const gl = Object.entries(a.groups).sort((x, y) => y[1] - x[1]);
    const newQ = P.quests.filter((q) => q.done && !before.quests.find((o) => o.id === q.id).done);
    const lvlUp = P.level.n > before.level.n;
    v.innerHTML = `
      ${backBtn("back", "Итоги тренировки", fmtDate(w.date))}
      ${lvlUp ? `<div class="levelup">${badge(P.level, 52)}<div><span class="lbl" style="color:var(--xp)">Новый уровень</span><h2 style="font-size:24px">${P.level.name}</h2><small class="muted">${P.level.about}</small></div></div>` : ""}
      <div class="figure-grid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)">
        <div>${bodyMap(a.groups)}</div>
        <div class="side">
          <div class="tile"><span class="lbl">Упражнений</span><b>${a.exCount}</b></div>
          <div class="tile"><span class="lbl">Подходов</span><b>${a.sets}</b></div>
          <div class="tile"><span class="lbl">Тоннаж</span><b>${fmt(a.tonnage, 0)}</b><small>кг</small></div>
          ${be ? `<div class="tile"><span class="lbl">Лучший подход</span><div style="font-weight:600;line-height:1.25;margin-top:2px">${esc(be.name)}</div><small>${b.w ? fmt(b.w) + " кг × " : ""}${b.r} повт.</small></div>` : ""}
        </div>
      </div>
      <div><span class="lbl">Проработано</span><div class="row" style="margin-top:6px;gap:6px">${gl.map(([g, x]) => `<span class="chip red">${GROUP_RU[g]} ${Math.round((x / totalG) * 100)}%</span>`).join("")}</div></div>
      <div class="xpcard">
        <span class="lbl">Опыт за тренировку</span>
        <div class="big">+${r.sum + newQ.reduce((s, q) => s + q.xp, 0)} XP</div>
        <hr>
        ${r.lines.map(([t, x]) => `<div class="ln"><span>${esc(t)}</span><span>+${x}</span></div>`).join("")}
        ${r.dqDone ? "" : `<div class="ln muted"><span>Задание дня не выполнено: ${esc(r.dq.title.toLowerCase())}</span><span>+0</span></div>`}
        ${newQ.map((q) => `<div class="ln"><span>Задание: ${esc(q.title)}</span><span>+${q.xp}</span></div>`).join("")}
      </div>
      <div class="row" style="flex-wrap:nowrap">
        <button class="btn" id="edit" style="flex:1">Изменить запись</button>
        <button class="btn" id="toCoach" style="flex:1;border-color:var(--blue);color:var(--blue)">${icon("spark")}Разбор тренера</button>
      </div>
      <button class="btn primary big" id="toHome">Готово</button>`;
    $("#back").onclick = () => go("log", { summaryId: null });
    $("#edit").onclick = () => { w.done = false; save(); go("log", { summaryId: null, workoutId: w.id }); };
    $("#toHome").onclick = () => go("home", { summaryId: null });
    $("#toCoach").onclick = () => go("log", { coach: true });
  }

  // ---------- Прогресс ----------
  function renderProgress(v) {
    const P = progress(), per = ui.period;
    const inP = (w) => per === "all" || daysAgo(w.date) < (per === "week" ? 7 : 30);
    const ws = P.ws.filter(inP);
    const vol = ws.reduce((s, w) => s + P.per[w.id].a.tonnage, 0);
    const groups = {}; ws.forEach((w) => Object.entries(P.per[w.id].a.groups).forEach(([g, x]) => groups[g] = (groups[g] || 0) + x));
    const totalG = Object.values(groups).reduce((s, x) => s + x, 0);
    const weeks = []; let wk = weekStart(today());
    for (let i = 0; i < 8; i++) { weeks.unshift({ wk, v: 0 }); const d = new Date(wk + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 7); wk = d.toISOString().slice(0, 10); }
    P.ws.forEach((w) => { const x = weeks.find((k) => k.wk === weekStart(w.date)); if (x) x.v += P.per[w.id].a.tonnage; });
    // рост и спад: первая и последняя запись упражнения
    const ses = {};
    P.ws.forEach((w) => w.items.forEach((it) => { if (!doneSets(it).length) return; const m = itemMax(it), r = Math.max(...doneSets(it).map((s) => n(s.r)));
      (ses[it.exId] = ses[it.exId] || []).push(m ? { v: m, u: "кг" } : { v: r, u: "повт." }); }));
    const grow = Object.entries(ses).filter(([, s]) => s.length >= 2).map(([id, s]) => {
      const f = s[0], l = s[s.length - 1]; return { id, f, l, pct: f.v ? ((l.v - f.v) / f.v) * 100 : 0 };
    }).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 6);
    const L = P.level;
    v.innerHTML = `
      <div><h1>Прогресс</h1><div class="muted">Аналитика, уровни и задания</div></div>
      ${(() => { const C = coach(); return `<button class="coach-card" id="openCoach">
        <div class="score-ring sm" style="--p:${C.overall ?? 0};--c:${scoreColor(C.overall)}"><b class="num">${C.overall == null ? "—" : Math.round(C.overall)}</b></div>
        <div style="min-width:0;flex:1;text-align:left"><span class="lbl" style="color:var(--blue)">Тренер</span><b style="display:block">${C.n ? `${C.formName}${C.type ? " · " + C.type.name : ""}` : "Разбор формы"}</b>
          <small class="muted">${C.n ? `Советов: ${C.tips.length} · сила, выносливость, масса, режим, баланс, прогресс` : "Появится после первой тренировки"}</small></div>
        <span style="color:var(--muted);font-size:22px">›</span></button>`; })()}
      <div class="seg" role="group" aria-label="Период">
        ${[["week", "Неделя"], ["month", "Месяц"], ["all", "Всё время"]].map(([k, t]) => `<button data-p="${k}" aria-pressed="${per === k}">${t}</button>`).join("")}
      </div>
      <div class="tiles">
        <div class="tile"><span class="lbl">Тренировок</span><b>${ws.length}</b></div>
        <div class="tile"><span class="lbl">Объём, т</span><b>${fmt(vol / 1000)}</b></div>
        <div class="tile"><span class="lbl">Вес тела</span><b>${fmt(lastWeight())}</b></div>
      </div>
      <div class="panel"><span class="lbl">Объём по неделям, тонн</span>${weekBars(weeks)}</div>
      <div class="panel"><span class="lbl">Нагрузка по группам (подходы)</span>
        ${totalG ? `<div class="gload">${Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([g, x]) => `
          <div class="r"><div class="row spread"><span>${GROUP_RU[g]}</span><span class="num muted" style="font-size:13px">${Math.round((x / totalG) * 100)}%</span></div>
          <div class="bar"><i style="width:${(x / totalG) * 100}%"></i></div></div>`).join("")}</div>`
          : `<p class="muted" style="margin:0">За этот период тренировок нет.</p>`}
      </div>
      <div class="panel"><span class="lbl">Упражнения: рост и спад</span>
        ${grow.length ? `<div class="grow">${grow.map((g) => `<span class="nm">${esc(ex(g.id)?.name || g.id)}<br><small class="muted num">${fmt(g.f.v)} → ${fmt(g.l.v)} ${g.l.u}</small></span>
          <span class="chip ${g.pct > 0 ? "good" : g.pct < 0 ? "bad" : ""}">${g.pct > 0 ? "+" : ""}${fmt(g.pct, 0)}%</span>`).join("")}</div>`
          : `<p class="muted" style="margin:0">Нужно хотя бы две записи одного упражнения.</p>`}
      </div>
      <h2>Уровни</h2>
      <div class="ladder">${LEVELS.map((x) => {
        const cur = x.n === L.n, passed = x.n < L.n;
        return `<div class="step ${cur ? "cur" : ""} ${x.n > L.n ? "locked" : ""}">${badge(x, 38)}
          <div class="t"><b style="color:${x.color}">${x.name}</b><small>${x.about}</small>
          <small class="num">${x.xp} XP${x.quests ? ` + ${x.quests} заданий` : ""}</small></div>
          ${cur ? `<span class="chip xp">сейчас</span>` : passed ? `<span class="chip good">пройден</span>` : ""}</div>`;
      }).join("")}</div>
      <div class="muted" style="font-size:13px">Опыт: тренировка +${XP_RULES.workout}, каждый подход +${XP_RULES.perSet} (до ${XP_RULES.maxSets}), рост рабочего веса +${XP_RULES.pr} (до ${XP_RULES.maxPr} упр.), задание дня +${XP_RULES.daily}, задания из списка ниже. Для уровня нужны и опыт, и выполненные задания.</div>
      <h2>Задания · ${P.questsDone}/${P.quests.length}</h2>
      <div class="exlist">${[...P.quests].sort((a, b) => (a.locked - b.locked) || (a.done - b.done)).map(questCard).join("")}</div>`;
    v.querySelectorAll("[data-p]").forEach((b) => b.onclick = () => { ui.period = b.dataset.p; renderProgress(v); });
    $("#openCoach").onclick = () => go("progress", { coach: true });
  }

  // ---------- Упражнения ----------
  function renderCatalog(v) {
    const pw = ui.pickFor && workout(ui.pickFor);
    const banner = pw ? `<div class="pick row spread"><span>Выберите упражнение для тренировки ${fmtDate(pw.date)}</span>
      <button class="btn sm" id="cancelPick">Отмена</button></div>` : "";
    const q = ui.q.trim().toLowerCase();
    let body, title = "Упражнения", sub = "";
    if (q) {
      const ids = Object.keys(DB.exercises).filter((id) => DB.exercises[id].name.toLowerCase().includes(q) ||
        (RU.equipment[DB.exercises[id].equipment] || "").includes(q));
      sub = `Найдено: ${ids.length}`; body = exList(ids.slice(0, 80), false);
    } else if (ui.groupId) {
      const g = DB.groups.find((x) => x.id === ui.groupId);
      title = g.name; sub = `Топ-${g.exercises.length}: сначала популярная классика, затем вариации`; body = exList(g.exercises, true);
    } else {
      body = `<div class="groups">${DB.groups.map((g) => `<button class="group" data-g="${g.id}"><strong>${esc(g.name)}</strong>
        <small>${g.exercises.length} упражнений</small></button>`).join("")}</div>`;
      sub = "Выберите группу мышц";
    }
    v.innerHTML = `${banner}
      ${ui.groupId && !q ? backBtn("backG", title, sub) : `<div><h1>${esc(title)}</h1><div class="muted">${esc(sub)}</div></div>`}
      <input type="search" id="q" placeholder="Поиск: curl, press, squat, гантели…" value="${esc(ui.q)}">
      ${body}`;
    const qi = $("#q");
    qi.oninput = () => { ui.q = qi.value; const pos = qi.selectionStart; renderCatalog(v); const nq = $("#q"); nq.focus(); nq.setSelectionRange(pos, pos); };
    if ($("#cancelPick")) $("#cancelPick").onclick = () => { const id = ui.pickFor; ui.pickFor = null; go("log", { workoutId: id }); };
    if ($("#backG")) $("#backG").onclick = () => go("catalog", { groupId: null });
    v.querySelectorAll("[data-g]").forEach((b) => b.onclick = () => go("catalog", { groupId: b.dataset.g }));
    v.querySelectorAll("[data-ex]").forEach((b) => b.onclick = () => openExercise(b.dataset.ex));
  }
  function exList(ids, ranked) {
    return `<div class="exlist">${ids.map((id, i) => {
      const e = DB.exercises[id];
      return `<button class="ex" data-ex="${id}">${ranked ? `<span class="rank">${i + 1}</span>` : ""}
        <img src="${img(e.images[0])}" alt="" loading="lazy">
        <span class="t"><b>${esc(e.name)}</b>
        <small>${esc([RU.equipment[e.equipment] || e.equipment, RU.level[e.level], e.primaryMuscles.map((m) => RU.muscle[m] || m).join(", ")].filter(Boolean).join(" · "))}</small></span></button>`;
    }).join("")}</div>`;
  }

  // ---------- Карточка упражнения ----------
  let frameTimer = null;
  function openExercise(id) {
    const e = ex(id); if (!e) return;
    const dlg = $("#dlg"), body = $("#dlgBody");
    const h = exHistory(id).slice(0, 6), b = best(id);
    const pw = ui.pickFor && workout(ui.pickFor);
    const inW = ui.tab === "log" && ui.workoutId;
    const yt = "https://www.youtube.com/results?search_query=" + encodeURIComponent(e.name + " exercise technique");
    const ytRu = "https://www.youtube.com/results?search_query=" + encodeURIComponent(e.name + " техника выполнения");
    const tr = "https://translate.google.com/?sl=en&tl=ru&op=translate&text=" + encodeURIComponent(e.instructions.join("\n"));
    body.innerHTML = `
      <h2 style="text-transform:none;font-size:24px">${esc(e.name)}</h2>
      <div class="row" style="gap:6px">${[RU.equipment[e.equipment], RU.level[e.level], RU.mechanic[e.mechanic], RU.category[e.category]].filter(Boolean).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
      <div class="frames">
        ${e.images.map((p, i) => `<img src="${img(p)}" alt="${i ? "Конечное" : "Начальное"} положение" style="opacity:${i ? 0 : 1}">`).join("")}
        <span class="cap" id="flbl">Начальное положение</span>
      </div>
      <div class="muted" style="font-size:14px">Мышцы: <b style="color:var(--fg)">${esc(e.primaryMuscles.map((m) => RU.muscle[m] || m).join(", "))}</b>${e.secondaryMuscles.length ? ` · вспомогательные: ${esc(e.secondaryMuscles.map((m) => RU.muscle[m] || m).join(", "))}` : ""}</div>
      <div class="row">
        <a class="btn" href="${yt}" target="_blank" rel="noopener">▶ Видео техники</a>
        <a class="btn" href="${ytRu}" target="_blank" rel="noopener">▶ Видео на русском</a>
        <a class="btn ghost" href="${tr}" target="_blank" rel="noopener">Перевести инструкцию</a>
      </div>
      <h3>Как выполнять</h3>
      <ol class="steps">${e.instructions.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      <h3>Мои результаты</h3>
      ${h.length ? `<div class="tiles" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          <div class="tile"><span class="lbl">Макс. вес</span><b>${fmt(b.maxW)} кг</b></div>
          <div class="tile"><span class="lbl">Расчётный 1ПМ</span><b>${fmt(b.e1rm)} кг</b></div></div>
        <div class="scroll"><table class="m"><tr><th>Дата</th><th>Подходы (кг×повт.)</th></tr>
        ${h.map((x) => `<tr><td>${fmtDate(x.w.date)}</td><td class="num">${esc(setsLine(x.it.sets))}</td></tr>`).join("")}</table></div>`
        : `<p class="muted" style="margin:0">Ещё нет записей по этому упражнению.</p>`}`;
    // кнопки внизу шторки — в зоне большого пальца
    $("#dlgFoot").innerHTML = `<button class="btn" id="dlgClose">Закрыть</button>
      ${inW ? "" : `<button class="btn red" id="addTo">${pw ? `В тренировку ${fmtShort(pw.date)}` : "В тренировку"}</button>`}`;
    $("#dlgClose").onclick = () => closeSheet();
    if ($("#addTo")) $("#addTo").onclick = () => {
      const w = pw || ensureWorkoutForToday();
      addExercise(w, id); ui.pickFor = null; toast("Добавлено");
      closeSheet(() => go("log", { workoutId: w.id, summaryId: null }));
    };
    body.scrollTop = 0;
    clearInterval(frameTimer);
    const imgs = body.querySelectorAll(".frames img");
    if (imgs.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let k = 0;
      frameTimer = setInterval(() => { k ^= 1; imgs[0].style.opacity = k ? 0 : 1; imgs[1].style.opacity = k ? 1 : 0;
        $("#flbl").textContent = k ? "Конечное положение" : "Начальное положение"; }, 1200);
    }
    if (!dlg.open) {
      dlg.querySelector(".sheet").style.transform = "";
      dlg.showModal();
      try { history.pushState({ sheet: true, ui: snap() }, ""); } catch (er) {}
    }
  }
  // Закрытие шторки: кнопка, тап по фону, свайп вниз, системная кнопка «Назад».
  let afterClose = null;
  function closeSheet(then) {
    const dlg = $("#dlg"); if (!dlg.open) { if (then) then(); return; }
    afterClose = then || null;
    if (history.state && history.state.sheet) history.back(); // popstate закроет шторку
    else finishClose();
  }
  function finishClose() {
    const dlg = $("#dlg"), sh = dlg.querySelector(".sheet");
    sh.classList.add("leaving");
    setTimeout(() => {
      sh.classList.remove("leaving"); sh.style.transform = ""; dlg.close();
      const f = afterClose; afterClose = null; if (f) f();
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180);
  }
  $("#dlg").addEventListener("close", () => clearInterval(frameTimer));
  $("#dlg").addEventListener("cancel", (e) => { e.preventDefault(); closeSheet(); }); // Esc
  $("#dlg").addEventListener("click", (e) => { if (e.target.id === "dlg") closeSheet(); });
  (function swipeToClose() {
    const sheet = $("#dlg .sheet"), body = $("#dlgBody");
    let y0 = null, dy = 0;
    sheet.addEventListener("touchstart", (e) => {
      const onHandle = e.target.closest(".grab-zone");
      y0 = (onHandle || body.scrollTop <= 0) ? e.touches[0].clientY : null; dy = 0;
    }, { passive: true });
    sheet.addEventListener("touchmove", (e) => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) { e.preventDefault(); sheet.style.transition = "none"; sheet.style.transform = `translateY(${dy}px)`; }
      else { y0 = null; sheet.style.transform = ""; }
    }, { passive: false });
    sheet.addEventListener("touchend", () => {
      if (y0 == null) return;
      sheet.style.transition = "";
      if (dy > 110) closeSheet(); else sheet.style.transform = "";
      y0 = null;
    });
  })();

  // ---------- Профиль ----------
  function renderProfile(v) {
    const p = S.profile;
    const ms = [...S.measurements].sort((a, b) => a.date.localeCompare(b.date));
    const lastW = lastWeight(), h = n(p.height);
    const bmi = h && lastW ? lastW / (h / 100) ** 2 : null;
    const startW = ms.length ? ms[0].weight : null;
    const bmiTxt = bmi == null ? "" : bmi < 18.5 ? "ниже нормы" : bmi < 25 ? "норма" : bmi < 30 ? "избыточный" : "ожирение";
    const field = (id, label, type = "text", extra = "") => `<label class="f">${label}<input id="p-${id}" type="${type}" ${extra} value="${esc(p[id])}"></label>`;
    const sel = (id, label, opts) => `<label class="f">${label}<select id="p-${id}"><option value="">—</option>${opts.map((o) => `<option ${p[id] === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    v.innerHTML = `
      <h1>${esc(p.name || "Мой профиль")}</h1>
      <div class="tiles" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        <div class="tile"><span class="lbl">Вес, кг</span><b>${fmt(lastW)}</b></div>
        <div class="tile"><span class="lbl">ИМТ</span><b>${fmt(bmi)}</b>${bmiTxt ? `<small>${bmiTxt}</small>` : ""}</div>
        <div class="tile"><span class="lbl">Изменение, кг</span><b>${startW != null && ms.length > 1 ? (lastW - startW > 0 ? "+" : "") + fmt(lastW - startW) : "—"}</b></div>
        <div class="tile"><span class="lbl">До цели, кг</span><b>${n(p.target) && lastW ? fmt(n(p.target) - lastW) : "—"}</b></div>
      </div>
      <form class="panel" id="pf">
        <h2>Стартовые данные</h2>
        <div class="grid-f">
          ${field("name", "Имя")}
          ${sel("sex", "Пол", ["Мужской", "Женский"])}
          ${field("birth", "Дата рождения", "date")}
          ${field("height", "Рост, см", "text", 'inputmode="decimal"')}
          ${field("weight", "Стартовый вес, кг", "text", 'inputmode="decimal"')}
          ${field("target", "Целевой вес, кг", "text", 'inputmode="decimal"')}
          ${sel("goal", "Цель", ["Снижение веса", "Набор массы", "Сила", "Поддержание формы", "Выносливость"])}
          ${sel("level", "Опыт", ["Новичок", "1–3 года", "3+ года"])}
          ${field("freq", "Тренировок в неделю (цель)", "text", 'inputmode="numeric"')}
        </div>
        <label class="f">Заметки (травмы, ограничения)<textarea id="p-notes" rows="2">${esc(p.notes)}</textarea></label>
        <div><button class="btn red" type="submit">Сохранить профиль</button></div>
      </form>
      <div class="panel">
        <h2>Замеры тела</h2>
        ${ms.length > 1 ? spark(ms) : ""}
        <form class="grid-f" id="mf">
          <label class="f">Дата<input type="date" id="m-date" value="${today()}"></label>
          <label class="f">Вес, кг<input id="m-weight" inputmode="decimal" required></label>
          <label class="f">% жира<input id="m-fat" inputmode="decimal"></label>
          <label class="f">Талия, см<input id="m-waist" inputmode="decimal"></label>
          <label class="f">Грудь, см<input id="m-chest" inputmode="decimal"></label>
          <label class="f">Бицепс, см<input id="m-arm" inputmode="decimal"></label>
          <div style="display:flex;align-items:flex-end"><button class="btn red" type="submit">+ Добавить замер</button></div>
        </form>
        ${ms.length ? `<div class="scroll"><table class="m"><tr><th>Дата</th><th>Вес</th><th>% жира</th><th>Талия</th><th>Грудь</th><th>Бицепс</th><th></th></tr>
          ${[...ms].reverse().map((m) => `<tr><td>${fmtDate(m.date)}</td><td class="num">${fmt(m.weight)}</td><td class="num">${fmt(m.fat)}</td>
          <td class="num">${fmt(m.waist)}</td><td class="num">${fmt(m.chest)}</td><td class="num">${fmt(m.arm)}</td>
          <td><button class="x" data-m="${m.id}" aria-label="Удалить замер">×</button></td></tr>`).join("")}</table></div>`
          : `<p class="muted" style="margin:0">Добавляйте вес и объёмы раз в 1–2 недели, чтобы видеть динамику.</p>`}
      </div>
      <div class="panel">
        <h2>Данные</h2>
        <p class="muted" style="margin:0">Всё хранится только в этом браузере. Сохраняйте резервную копию, чтобы перенести журнал на другое устройство.</p>
        <div class="row">
          <button class="btn" id="exp">Скачать резервную копию</button>
          <label class="btn" for="imp">Загрузить из файла</label><input type="file" id="imp" accept=".json,application/json" hidden>
          <button class="btn danger" id="wipe">Стереть все данные</button>
        </div>
      </div>`;
    $("#pf").onsubmit = (e) => {
      e.preventDefault();
      const prevW = n(p.weight), lvl = progress().level.n;
      ["name", "sex", "birth", "height", "weight", "target", "goal", "level", "freq", "notes"].forEach((k) => { p[k] = $("#p-" + k).value.trim(); });
      if (n(p.weight) && (!S.measurements.length || (n(p.weight) !== prevW && !S.measurements.some((m) => m.date === today()))))
        S.measurements.push({ id: uid(), date: today(), weight: n(p.weight) });
      save(); const L = progress().level;
      toast(L.n > lvl ? `Новый уровень: ${L.name}!` : "Профиль сохранён"); renderProfile(v);
    };
    $("#mf").onsubmit = (e) => {
      e.preventDefault();
      const m = { id: uid(), date: $("#m-date").value || today(), weight: n($("#m-weight").value),
        fat: n($("#m-fat").value), waist: n($("#m-waist").value), chest: n($("#m-chest").value), arm: n($("#m-arm").value) };
      if (m.weight == null) return toast("Укажите вес");
      S.measurements.push(m); save(); toast("Замер добавлен"); renderProfile(v);
    };
    v.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => { S.measurements = S.measurements.filter((m) => m.id !== b.dataset.m); save(); renderProfile(v); });
    $("#exp").onclick = () => {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `batyr-fit-${today()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
    };
    $("#imp").onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then((t) => { const d = JSON.parse(t); if (!d.workouts) throw 0; S = Object.assign(blank(), d); save(); toast("Данные загружены"); renderProfile(v); })
        .catch(() => toast("Файл не подходит"));
    };
    $("#wipe").onclick = (e) => armed(e.target, () => { S = blank(); save(); toast("Данные стёрты"); renderProfile(v); });
  }
  function spark(ms) {
    const W = 600, H = 80, pad = 8, ys = ms.map((m) => m.weight), lo = Math.min(...ys), hi = Math.max(...ys), r = hi - lo || 1;
    const pts = ms.map((m, i) => [pad + (i / (ms.length - 1)) * (W - 2 * pad), pad + (1 - (m.weight - lo) / r) * (H - 2 * pad)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="График веса">
      <path d="${d} L${last[0]} ${H} L${pts[0][0]} ${H}Z" fill="var(--accent)" opacity=".15"></path>
      <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"></path></svg>
      <div class="row spread muted num" style="font-size:12px"><span>${fmtDate(ms[0].date)} · ${fmt(ms[0].weight)} кг</span><span>${fmtDate(ms[ms.length - 1].date)} · ${fmt(ms[ms.length - 1].weight)} кг</span></div>`;
  }

  // ---------- старт ----------
  // старые записи без флага считаем завершёнными, кроме сегодняшней
  S.workouts.forEach((w) => { if (w.done === undefined) w.done = w.date !== today(); });
  try { history.replaceState({ ui: snap() }, ""); } catch (e) {}
  render();
  fetch("data/exercises.json").then((r) => r.json()).then((d) => { DB = d; render(); })
    .catch(() => { $("#view").innerHTML = `<div class="panel"><b>Не удалось загрузить базу упражнений.</b><span class="muted">Откройте приложение через веб-сервер (GitHub Pages или <code>python3 -m http.server</code>), а не двойным кликом по файлу.</span></div>`; });
})();
