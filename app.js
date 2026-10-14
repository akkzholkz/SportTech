/* Журнал зала — статичное приложение. Данные хранятся в localStorage браузера. */
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
  const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

  // ---------- state ----------
  let S = load();
  let DB = null;
  const ui = { tab: "log", workoutId: null, groupId: null, q: "", pickFor: null };

  function blank() { return { profile: {}, measurements: [], workouts: [] }; }
  function load() {
    try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && v.workouts) return v; } catch (e) {}
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const fmtDate = (iso) => { const [y, m, d] = iso.split("-"); return `${+d} ${MONTHS[+m - 1]} ${y}`; };
  const n = (v) => { const x = parseFloat(String(v).replace(",", ".")); return isFinite(x) ? x : null; };
  const fmt = (x, d = 1) => x == null ? "—" : (Math.round(x * 10 ** d) / 10 ** d).toLocaleString("ru-RU");
  const img = (p) => "img/" + p;
  const ex = (id) => DB && DB.exercises[id];

  function toast(msg) {
    document.querySelectorAll(".toast").forEach((x) => x.remove());
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 1800);
  }

  // two-step destructive buttons (confirm() is not available everywhere)
  function armed(btn, fn) {
    if (btn.classList.contains("armed")) { fn(); return; }
    btn.classList.add("armed"); const old = btn.textContent; btn.textContent = "Точно? Нажмите ещё раз";
    setTimeout(() => { btn.classList.remove("armed"); btn.textContent = old; }, 3000);
  }

  // ---------- helpers on data ----------
  function workout(id) { return S.workouts.find((w) => w.id === id); }
  function tonnage(w) { let t = 0; w.items.forEach((it) => it.sets.forEach((s) => { t += (n(s.w) || 0) * (n(s.r) || 0); })); return t; }
  function setCount(w) { return w.items.reduce((a, it) => a + it.sets.length, 0); }
  function sortedWorkouts() { return [...S.workouts].sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created); }
  function history(exId, exceptWorkoutId) {
    return sortedWorkouts().filter((w) => w.id !== exceptWorkoutId)
      .map((w) => ({ w, it: w.items.find((i) => i.exId === exId) }))
      .filter((x) => x.it && x.it.sets.some((s) => n(s.r)));
  }
  function setsLine(sets) {
    return sets.filter((s) => n(s.r)).map((s) => (n(s.w) ? fmt(n(s.w)) + "×" : "") + n(s.r)).join(", ");
  }
  function best(exId) {
    let maxW = null, e1rm = null;
    S.workouts.forEach((w) => w.items.filter((i) => i.exId === exId).forEach((i) => i.sets.forEach((s) => {
      const W = n(s.w), R = n(s.r); if (!R) return;
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
    let it = w.items.find((i) => i.exId === exId);
    if (!it) {
      const prev = history(exId, w.id)[0];
      const first = prev ? prev.it.sets.find((s) => n(s.r)) : null;
      it = { exId, sets: [{ w: first ? first.w : "", r: "" }] };
      w.items.push(it);
    }
    save();
  }

  // ---------- routing ----------
  function go(tab, opts = {}) { Object.assign(ui, { tab }, opts); render(); window.scrollTo(0, 0); }
  document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => {
    const t = b.dataset.tab;
    go(t, t === "log" ? { workoutId: null } : t === "catalog" ? { groupId: null, q: "" } : {});
  }));

  function render() {
    document.querySelectorAll("nav button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.tab === ui.tab)));
    const v = $("#view");
    if (!DB) { v.innerHTML = `<p class="muted">Загрузка базы упражнений…</p>`; return; }
    if (ui.tab === "log") ui.workoutId ? renderWorkout(v) : renderLog(v);
    else if (ui.tab === "catalog") renderCatalog(v);
    else renderProfile(v);
  }

  // ---------- Тренировки ----------
  function renderLog(v) {
    const list = sortedWorkouts();
    const week = list.filter((w) => (Date.now() - new Date(w.date)) / 864e5 < 7).length;
    const total = list.reduce((a, w) => a + tonnage(w), 0);
    v.innerHTML = `
      <div class="row spread"><h1>Тренировки</h1>
        <button class="btn primary" id="newW">+ Тренировка сегодня</button></div>
      ${list.length ? `<div class="stats">
        <div class="stat"><span>Всего</span><b class="num">${list.length}</b></div>
        <div class="stat"><span>За 7 дней</span><b class="num">${week}</b></div>
        <div class="stat"><span>Тоннаж, т</span><b class="num">${fmt(total / 1000)}</b></div></div>` : ""}
      <div class="exlist" id="wl">${list.length ? list.map(wcard).join("") : `
        <div class="panel empty">
          <div class="plates" aria-hidden="true"><i style="height:48px;background:var(--plate-red)"></i><i style="height:44px;background:var(--accent)"></i><i style="height:38px;background:var(--plate-yellow)"></i><i style="height:32px;background:var(--plate-green)"></i></div>
          <h2>Журнал пока пуст</h2>
          <p class="muted" style="margin:0;max-width:46ch">Начните тренировку, добавьте упражнения из каталога и записывайте подходы: вес и количество повторов.</p>
        </div>`}</div>`;
    $("#newW").onclick = () => { const w = ensureWorkoutForToday(); go("log", { workoutId: w.id }); };
    v.querySelectorAll("[data-w]").forEach((b) => b.onclick = () => go("log", { workoutId: b.dataset.w }));
  }
  function wcard(w) {
    const [y, m, d] = w.date.split("-");
    const names = w.items.map((i) => ex(i.exId)?.name).filter(Boolean);
    return `<button class="wcard" data-w="${w.id}">
      <div class="date"><b class="num">${+d}</b>${MONTHS[+m - 1]}</div>
      <div style="min-width:0"><b>${esc(w.note || "Тренировка")}</b><br>
        <small class="muted">${names.length ? esc(names.slice(0, 3).join(" · ")) + (names.length > 3 ? ` +${names.length - 3}` : "") : "без упражнений"}</small></div>
      <div class="num muted" style="text-align:right;font-size:13px">${setCount(w)} подх.<br>${fmt(tonnage(w), 0)} кг</div></button>`;
  }

  function renderWorkout(v) {
    const w = workout(ui.workoutId);
    if (!w) return go("log", { workoutId: null });
    v.innerHTML = `
      <div class="row"><button class="btn ghost" id="back">← Все тренировки</button></div>
      <div class="panel">
        <div class="grid-f">
          <label class="f">Дата<input type="date" id="wDate" value="${w.date}"></label>
          <label class="f">Название<input id="wNote" placeholder="Например: Спина + бицепс" value="${esc(w.note)}"></label>
        </div>
        <div class="stats">
          <div class="stat"><span>Упражнений</span><b class="num" id="sEx">${w.items.length}</b></div>
          <div class="stat"><span>Подходов</span><b class="num" id="sSets">${setCount(w)}</b></div>
          <div class="stat"><span>Тоннаж, кг</span><b class="num" id="sTon">${fmt(tonnage(w), 0)}</b></div>
        </div>
      </div>
      <div class="panel" id="items">${w.items.length ? w.items.map((it, k) => itemHtml(w, it, k)).join("") :
        `<p class="muted" style="margin:0">Добавьте первое упражнение, чтобы записывать подходы.</p>`}</div>
      <div class="row spread">
        <button class="btn primary" id="addEx">+ Добавить упражнение</button>
        <button class="btn danger" id="delW">Удалить тренировку</button>
      </div>`;
    $("#back").onclick = () => go("log", { workoutId: null });
    $("#wDate").onchange = (e) => { if (e.target.value) { w.date = e.target.value; save(); } };
    $("#wNote").oninput = (e) => { w.note = e.target.value; save(); };
    $("#addEx").onclick = () => go("catalog", { pickFor: w.id, groupId: null, q: "" });
    $("#delW").onclick = (e) => armed(e.target, () => { S.workouts = S.workouts.filter((x) => x !== w); save(); toast("Тренировка удалена"); go("log", { workoutId: null }); });

    const box = $("#items");
    box.addEventListener("input", (e) => {
      const t = e.target; if (!t.dataset.f) return;
      const it = w.items[+t.dataset.i]; it.sets[+t.dataset.s][t.dataset.f] = t.value; save();
      $("#sSets").textContent = setCount(w); $("#sTon").textContent = fmt(tonnage(w), 0);
    });
    box.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const i = +b.dataset.i, it = w.items[i];
      if (b.dataset.act === "addset") { const last = it.sets[it.sets.length - 1] || {}; it.sets.push({ w: last.w || "", r: last.r || "" }); }
      else if (b.dataset.act === "delset") { it.sets.splice(+b.dataset.s, 1); }
      else if (b.dataset.act === "delex") { w.items.splice(i, 1); }
      else if (b.dataset.act === "up" && i > 0) { [w.items[i - 1], w.items[i]] = [w.items[i], w.items[i - 1]]; }
      else if (b.dataset.act === "info") { return openExercise(it.exId); }
      else return;
      save(); renderWorkout(v);
    });
  }
  function itemHtml(w, it, k) {
    const e = ex(it.exId) || { name: it.exId, images: [] };
    const prev = history(it.exId, w.id)[0];
    return `<div class="item">
      <div class="row spread" style="flex-wrap:nowrap">
        <button class="ex" data-act="info" data-i="${k}" style="border:0;padding:0;background:none">
          ${e.images[0] ? `<img src="${img(e.images[0])}" alt="" loading="lazy" style="width:48px;height:48px">` : ""}
          <span class="t"><b>${esc(e.name)}</b><small>${prev ? `Прошлый раз (${fmtDate(prev.w.date)}): ${esc(setsLine(prev.it.sets))}` : "Первый раз — техника по нажатию"}</small></span>
        </button>
        <div class="row" style="flex:none;gap:2px">
          ${k > 0 ? `<button class="x" data-act="up" data-i="${k}" title="Выше" aria-label="Переместить выше">↑</button>` : ""}
          <button class="x" data-act="delex" data-i="${k}" title="Убрать упражнение" aria-label="Убрать упражнение">×</button>
        </div>
      </div>
      <div class="sets">
        <span class="h">#</span><span class="h">Вес, кг</span><span class="h">Повторы</span><span></span>
        ${it.sets.map((s, j) => `
          <span class="n">${j + 1}</span>
          <input id="w-${k}-${j}" inputmode="decimal" placeholder="0" value="${esc(s.w)}" data-i="${k}" data-s="${j}" data-f="w" aria-label="Вес, подход ${j + 1}">
          <input id="r-${k}-${j}" inputmode="numeric" placeholder="0" value="${esc(s.r)}" data-i="${k}" data-s="${j}" data-f="r" aria-label="Повторы, подход ${j + 1}">
          <button class="x" data-act="delset" data-i="${k}" data-s="${j}" aria-label="Удалить подход ${j + 1}">×</button>`).join("")}
      </div>
      <div><button class="btn sm" data-act="addset" data-i="${k}">+ Подход</button></div>
    </div>`;
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
      sub = `Найдено: ${ids.length}`;
      body = exList(ids.slice(0, 80), false);
    } else if (ui.groupId) {
      const g = DB.groups.find((x) => x.id === ui.groupId);
      title = g.name; sub = `Топ-${g.exercises.length}: сначала популярная классика, затем вариации`;
      body = exList(g.exercises, true);
    } else {
      body = `<div class="groups">${DB.groups.map((g) => `<button class="group" data-g="${g.id}"><strong>${esc(g.name)}</strong>
        <small>${g.exercises.length} упражнений</small></button>`).join("")}</div>`;
      sub = "Выберите группу мышц";
    }
    v.innerHTML = `${banner}
      <div class="row spread">${ui.groupId && !q ? `<button class="btn ghost" id="backG">← Группы мышц</button>` : ""}</div>
      <div class="row spread"><div><h1>${esc(title)}</h1><div class="muted">${esc(sub)}</div></div></div>
      <input type="search" id="q" placeholder="Поиск по названию (англ.), например curl, press, squat" value="${esc(ui.q)}">
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
    const h = history(id).slice(0, 6), b = best(id);
    const pw = ui.pickFor && workout(ui.pickFor);
    const yt = "https://www.youtube.com/results?search_query=" + encodeURIComponent(e.name + " exercise technique");
    const ytRu = "https://www.youtube.com/results?search_query=" + encodeURIComponent(e.name + " техника выполнения");
    const tr = "https://translate.google.com/?sl=en&tl=ru&op=translate&text=" + encodeURIComponent(e.instructions.join("\n"));
    body.innerHTML = `
      <div class="row spread" style="flex-wrap:nowrap;align-items:flex-start">
        <h2>${esc(e.name)}</h2><button class="x" id="dlgClose" aria-label="Закрыть">×</button></div>
      <div class="row">
        ${[RU.equipment[e.equipment], RU.level[e.level], RU.mechanic[e.mechanic], RU.category[e.category]].filter(Boolean).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}
      </div>
      <div class="frames" id="frames">
        ${e.images.map((p, i) => `<img src="${img(p)}" alt="${i ? "Конечное" : "Начальное"} положение" style="opacity:${i ? 0 : 1}">`).join("")}
        <span class="lbl" id="flbl">Начальное положение</span>
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
      ${h.length ? `<div class="stats">
          <div class="stat"><span>Макс. вес</span><b class="num">${fmt(b.maxW)} кг</b></div>
          <div class="stat"><span>Расчётный 1ПМ</span><b class="num">${fmt(b.e1rm)} кг</b></div></div>
        <div class="scroll"><table class="m"><tr><th>Дата</th><th>Подходы (кг×повт.)</th></tr>
        ${h.map((x) => `<tr><td>${fmtDate(x.w.date)}</td><td class="num">${esc(setsLine(x.it.sets))}</td></tr>`).join("")}</table></div>`
        : `<p class="muted" style="margin:0">Ещё нет записей по этому упражнению.</p>`}
      <div class="row"><button class="btn primary" id="addTo">${pw ? `Добавить в тренировку ${fmtDate(pw.date)}` : "Добавить в тренировку сегодня"}</button></div>`;
    $("#dlgClose").onclick = () => dlg.close();
    $("#addTo").onclick = () => {
      const w = pw || ensureWorkoutForToday();
      addExercise(w, id); dlg.close(); ui.pickFor = null; toast("Добавлено");
      go("log", { workoutId: w.id });
    };
    clearInterval(frameTimer);
    const imgs = body.querySelectorAll("#frames img");
    if (imgs.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let k = 0;
      frameTimer = setInterval(() => { k ^= 1; imgs[0].style.opacity = k ? 0 : 1; imgs[1].style.opacity = k ? 1 : 0;
        $("#flbl").textContent = k ? "Конечное положение" : "Начальное положение"; }, 1200);
    }
    if (!dlg.open) dlg.showModal();
  }
  $("#dlg").addEventListener("close", () => clearInterval(frameTimer));
  $("#dlg").addEventListener("click", (e) => { if (e.target.id === "dlg") e.target.close(); });

  // ---------- Профиль ----------
  function renderProfile(v) {
    const p = S.profile;
    const ms = [...S.measurements].sort((a, b) => a.date.localeCompare(b.date));
    const lastW = ms.length ? ms[ms.length - 1].weight : n(p.weight);
    const h = n(p.height);
    const bmi = h && lastW ? lastW / (h / 100) ** 2 : null;
    const age = p.birth ? Math.floor((Date.now() - new Date(p.birth)) / 31557600000) : null;
    const startW = ms.length ? ms[0].weight : null;
    const bmiTxt = bmi == null ? "" : bmi < 18.5 ? "ниже нормы" : bmi < 25 ? "норма" : bmi < 30 ? "избыточный" : "ожирение";
    const field = (id, label, type = "text", extra = "") => `<label class="f">${label}<input id="p-${id}" type="${type}" ${extra} value="${esc(p[id])}"></label>`;
    const sel = (id, label, opts) => `<label class="f">${label}<select id="p-${id}"><option value="">—</option>${opts.map((o) => `<option ${p[id] === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    v.innerHTML = `
      <h1>${esc(p.name || "Мой профиль")}</h1>
      <div class="stats">
        <div class="stat"><span>Вес, кг</span><b class="num">${fmt(lastW)}</b></div>
        <div class="stat"><span>ИМТ</span><b class="num">${fmt(bmi)}</b>${bmiTxt ? `<small class="muted">${bmiTxt}</small>` : ""}</div>
        <div class="stat"><span>Изменение, кг</span><b class="num">${startW != null && ms.length > 1 ? (lastW - startW > 0 ? "+" : "") + fmt(lastW - startW) : "—"}</b></div>
        <div class="stat"><span>До цели, кг</span><b class="num">${n(p.target) && lastW ? fmt(n(p.target) - lastW) : "—"}</b></div>
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
          ${field("freq", "Тренировок в неделю", "text", 'inputmode="numeric"')}
        </div>
        <label class="f">Заметки (травмы, ограничения)<textarea id="p-notes" rows="2">${esc(p.notes)}</textarea></label>
        ${age != null ? `<div class="muted">Возраст: ${age}</div>` : ""}
        <div><button class="btn primary" type="submit">Сохранить профиль</button></div>
      </form>
      <div class="panel">
        <div class="row spread"><h2>Замеры тела</h2></div>
        ${ms.length > 1 ? spark(ms) : ""}
        <form class="grid-f" id="mf">
          <label class="f">Дата<input type="date" id="m-date" value="${today()}"></label>
          <label class="f">Вес, кг<input id="m-weight" inputmode="decimal" required></label>
          <label class="f">% жира<input id="m-fat" inputmode="decimal"></label>
          <label class="f">Талия, см<input id="m-waist" inputmode="decimal"></label>
          <label class="f">Грудь, см<input id="m-chest" inputmode="decimal"></label>
          <label class="f">Бицепс, см<input id="m-arm" inputmode="decimal"></label>
          <div style="display:flex;align-items:flex-end"><button class="btn primary" type="submit">+ Добавить замер</button></div>
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
      const prevW = n(p.weight);
      ["name", "sex", "birth", "height", "weight", "target", "goal", "level", "freq", "notes"].forEach((k) => { p[k] = $("#p-" + k).value.trim(); });
      if (n(p.weight) && !S.measurements.length) S.measurements.push({ id: uid(), date: today(), weight: n(p.weight) });
      else if (n(p.weight) && n(p.weight) !== prevW && !S.measurements.some((m) => m.date === today()))
        S.measurements.push({ id: uid(), date: today(), weight: n(p.weight) });
      save(); toast("Профиль сохранён"); renderProfile(v);
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
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `fitlog-${today()}.json`;
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
      <path d="${d} L${last[0]} ${H} L${pts[0][0]} ${H}Z" fill="var(--accent)" opacity=".12"></path>
      <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"></path>
      <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="var(--accent)"></circle></svg>
      <div class="row spread muted num" style="font-size:12px"><span>${fmtDate(ms[0].date)} · ${fmt(ms[0].weight)} кг</span><span>${fmtDate(ms[ms.length - 1].date)} · ${fmt(ms[ms.length - 1].weight)} кг</span></div>`;
  }

  // ---------- start ----------
  render();
  fetch("data/exercises.json").then((r) => r.json()).then((d) => { DB = d; render(); })
    .catch(() => { $("#view").innerHTML = `<div class="panel"><b>Не удалось загрузить базу упражнений.</b><span class="muted">Откройте приложение через веб-сервер (GitLab Pages или <code>python3 -m http.server</code>), а не двойным кликом по файлу.</span></div>`; });
})();
