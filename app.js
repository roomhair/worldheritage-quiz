/* 世界遺産検定2級 一問一答 — 出題ロジック */
(function () {
  "use strict";

  var BANK = (window.WH_QUESTIONS || []).slice();
  var CATS = [];
  BANK.forEach(function (q) { if (CATS.indexOf(q.cat) < 0) CATS.push(q.cat); });

  var STORE_KEY = "wh2-quiz-v1";
  var RESUME_KEY = "wh2-quiz-v1-resume";
  var COUNTS = [10, 20, 30, 50, 0]; // 0 = すべて
  var LEVELS = [
    { v: 0, label: "すべて" },
    { v: 1, label: "簡単" },
    { v: 2, label: "普通" },
    { v: 3, label: "難しい" }
  ];
  var LEVEL_NAME = { 1: "簡単", 2: "普通", 3: "難しい" };
  var LEVEL_HELP = {
    0: "全難易度から出題します。",
    1: "基本用語と代表的な遺産。まずはここから。",
    2: "登録の経緯や基準の中身まで踏み込みます。",
    3: "年号・件数・勧告の経緯など、合格を確実にする細部。"
  };

  var state = {
    cats: CATS.slice(),
    level: 0,
    count: 20,
    order: "shuffle",   // 出題順（shuffle / seq）
    queue: [],
    idx: 0,
    answers: [],   // {q, picked}
    shown: [],     // 表示位置 → q.choices のインデックス
    streak: 0,     // 連続正解
    locked: false
  };

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- 保存（端末内のみ・失敗しても動く） ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); }
    catch (e) { return null; }
  }
  function save(data) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* 無視 */ }
  }

  /* ---------- 中断中のクイズ ----------
     天板のロゴから設定画面へ戻ったとき、答えた分をここに控える。
     「前回の記録」とは別の鍵にして、互いに壊さないようにしている。 */
  function loadResume() {
    try { return JSON.parse(localStorage.getItem(RESUME_KEY) || "null"); }
    catch (e) { return null; }
  }
  function saveResume(data) {
    try {
      if (data) localStorage.setItem(RESUME_KEY, JSON.stringify(data));
      else localStorage.removeItem(RESUME_KEY);
    } catch (e) { /* 無視 */ }
  }

  // 答えたのに「次の問題へ」を押していない場合、その問題はもう済んでいる。
  // 控える位置を1つ進めておかないと、再開したときに同じ問題を二重に数えてしまう。
  function suspend() {
    if (!state.queue.length) return;
    var at = state.idx + (state.locked ? 1 : 0);
    saveResume({
      ids: state.queue.map(function (q) { return q.id; }),
      idx: at,
      correct: correctCount(),
      answers: state.answers.map(function (x) { return { id: x.q.id, picked: x.picked }; }),
      cats: state.cats.slice(),
      level: state.level,
      count: state.count,
      order: state.order,
      at: Date.now()
    });
  }

  function resumeSaved() {
    var rs = loadResume();
    if (!rs || !rs.ids || !rs.ids.length) return;

    var byId = {};
    BANK.forEach(function (q) { byId[q.id] = q; });
    var queue = rs.ids.map(function (id) { return byId[id]; });
    // 設問が差し替わっていたら再開をあきらめる（控えを消して、ふつうに選び直してもらう）
    if (queue.indexOf(undefined) >= 0) { saveResume(null); buildSetup(); return; }

    state.queue = queue;
    state.answers = (rs.answers || [])
      .filter(function (x) { return byId[x.id]; })
      .map(function (x) { return { q: byId[x.id], picked: x.picked }; });
    state.idx = Math.min(rs.idx || 0, queue.length);
    // 連続正解は保存せず、末尾からさかのぼって数え直す
    var st = 0;
    for (var i = state.answers.length - 1; i >= 0; i--) {
      if (state.answers[i].picked === state.answers[i].q.a) st++; else break;
    }
    state.streak = st;
    saveResume(null);

    $("q-total").textContent = queue.length;
    // 最後まで答えた状態で中断していたら、そのまま結果へ
    if (state.idx >= queue.length) { finish(); return; }
    show("quiz");
    render();
  }

  // 中断中のクイズがあれば、その出題条件を設定画面に戻しておく。
  // 「初めから」を押したときに同じ条件でやり直せる。
  function restoreConditions() {
    var rs = loadResume();
    if (!rs) return;
    if (rs.cats) {
      var valid = rs.cats.filter(function (c) { return CATS.indexOf(c) >= 0; });
      if (valid.length) state.cats = valid;
    }
    if (LEVELS.filter(function (L) { return L.v === rs.level; }).length) state.level = rs.level;
    if (COUNTS.indexOf(rs.count) >= 0) state.count = rs.count;
    if (rs.order === "shuffle" || rs.order === "seq") state.order = rs.order;
  }

  function goHome() {
    // 出題中なら、続きから戻れるように控えてから設定画面へ
    if (!$("screen-quiz").hidden) suspend();
    buildSetup();
    sayGreeting();
    show("setup");
  }

  /* ---------- 画面切替 ---------- */
  function show(name) {
    ["setup", "quiz", "result"].forEach(function (n) {
      $("screen-" + n).hidden = (n !== name);
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------- 設定画面 ---------- */
  function buildSetup() {
    var box = $("cat-chips");
    box.innerHTML = "";
    CATS.forEach(function (cat) {
      var n = BANK.filter(function (q) { return q.cat === cat; }).length;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.id = "cat-" + CATS.indexOf(cat);
      b.setAttribute("aria-pressed", state.cats.indexOf(cat) >= 0 ? "true" : "false");
      b.innerHTML = cat + '<span class="n">' + n + "</span>";
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") === "true";
        if (on && state.cats.length === 1) return; // 最低1つは残す
        b.setAttribute("aria-pressed", on ? "false" : "true");
        state.cats = CATS.filter(function (c, i) {
          return $("cat-" + i).getAttribute("aria-pressed") === "true";
        });
        updateTally();
      });
      box.appendChild(b);
    });

    var lbox = $("level-chips");
    lbox.innerHTML = "";
    LEVELS.forEach(function (L) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.id = "level-" + L.v;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", L.v === state.level ? "true" : "false");
      b.innerHTML = L.label + '<span class="n"></span>';
      b.addEventListener("click", function () {
        state.level = L.v;
        LEVELS.forEach(function (o) {
          $("level-" + o.v).setAttribute("aria-checked", o.v === L.v ? "true" : "false");
        });
        updateTally();
      });
      lbox.appendChild(b);
    });

    var cbox = $("count-chips");
    cbox.innerHTML = "";
    COUNTS.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.id = "count-" + c;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", c === state.count ? "true" : "false");
      b.textContent = c === 0 ? "すべて" : c + "問";
      b.addEventListener("click", function () {
        state.count = c;
        COUNTS.forEach(function (o) { $("count-" + o).setAttribute("aria-checked", o === c ? "true" : "false"); });
        updateTally();
      });
      cbox.appendChild(b);
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-order]"), function (b) {
      b.setAttribute("aria-checked", b.dataset.order === state.order ? "true" : "false");
      b.addEventListener("click", function () {
        state.order = b.dataset.order;
        Array.prototype.forEach.call(document.querySelectorAll("[data-order]"), function (o) {
          o.setAttribute("aria-checked", o === b ? "true" : "false");
        });
      });
    });

    $("bank-count").textContent = BANK.length;
    $("foot-count").textContent = BANK.length;
    updateTally();

    var last = load();
    if (last && last.total) {
      $("last-result").hidden = false;
      $("last-line").innerHTML = "直近の成績：<b>" + last.correct + " / " + last.total + "</b>（正答率 " +
        Math.round(last.correct / last.total * 100) + "%）／ 未正解 <b>" + (last.wrongIds || []).length + "</b>問";
      $("btn-retry-wrong").disabled = !(last.wrongIds && last.wrongIds.length);
    }

    var rs = loadResume();
    var hasResume = !!(rs && rs.ids && rs.ids.length);
    $("resume-panel").hidden = !hasResume;
    if (hasResume) {
      $("resume-line").innerHTML = rs.idx >= rs.ids.length
        ? "全 <b>" + rs.ids.length + "</b> 問に答え終えています（正答 <b>" + rs.correct +
          "</b>）。再開すると結果が出ます。"
        : "全 <b>" + rs.ids.length + "</b> 問中 <b>" + (rs.idx + 1) +
          "</b> 問目まで進んでいます（ここまで正答 <b>" + rs.correct + "</b>）";
    }
  }

  function pool() {
    return BANK.filter(function (q) {
      return state.cats.indexOf(q.cat) >= 0 && (state.level === 0 || q.level === state.level);
    });
  }

  // 選択中のカテゴリの中で、その難易度が何問あるか
  function countAtLevel(lv) {
    return BANK.filter(function (q) {
      return state.cats.indexOf(q.cat) >= 0 && (lv === 0 || q.level === lv);
    }).length;
  }
  function plannedCount() {
    var p = pool().length;
    return state.count === 0 ? p : Math.min(state.count, p);
  }
  function updateTally() {
    LEVELS.forEach(function (L) {
      var el = $("level-" + L.v);
      if (el) el.querySelector(".n").textContent = countAtLevel(L.v);
    });
    $("level-help").textContent = LEVEL_HELP[state.level];

    var n = plannedCount();
    $("setup-tally").innerHTML = "出題 <b>" + n + "</b> 問<span> ／ 対象 " + pool().length + " 問</span>";
    $("btn-start").disabled = n === 0;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* ---------- 出題 ---------- */
  function start(list) {
    saveResume(null);   // 新しく始めるので、中断中の控えは捨てる
    state.queue = list;
    state.idx = 0;
    state.answers = [];
    state.streak = 0;
    $("q-total").textContent = list.length;
    show("quiz");
    render();
  }

  function startFromSetup() {
    var list = pool();
    list = state.order === "shuffle" ? shuffle(list.slice()) : list.slice();
    if (state.count > 0) list = list.slice(0, state.count);
    start(list);
  }

  function render() {
    var q = state.queue[state.idx];
    state.locked = false;
    // 正解の位置を覚えてしまわないよう、表示順は毎回シャッフルする。
    // shown[表示位置] = データ上のインデックス。出題順の state.order とは別物なので
    // 同じ名前にしないこと（同名にすると出題順の設定が上書きされ、ランダムが効かなくなる）。
    state.shown = shuffle(q.choices.map(function (c, i) { return i; }));

    $("q-index").textContent = state.idx + 1;
    $("progress-bar").style.width = (state.idx / state.queue.length * 100) + "%";
    $("score-line").innerHTML = "正答 <b>" + correctCount() + "</b>";
    $("q-cat").textContent = q.cat;
    $("q-level").dataset.level = q.level;
    $("q-level-txt").textContent = LEVEL_NAME[q.level];
    $("q-text").textContent = q.q;
    $("q-note").hidden = true;
    $("react").hidden = true;
    $("btn-next").hidden = true;
    $("hint").hidden = false;
    $("btn-next").textContent = state.idx === state.queue.length - 1 ? "結果を見る" : "次の問題へ";

    var ol = $("choices");
    ol.innerHTML = "";
    state.shown.forEach(function (src, pos) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "choice";
      b.dataset.src = src;
      b.innerHTML =
        '<span class="key">' + (pos + 1) + "</span>" +
        '<span class="label"></span>' +
        '<span class="mark"></span>';
      b.querySelector(".label").textContent = q.choices[src].t;
      b.addEventListener("click", function () { answer(src); });
      li.appendChild(b);
      ol.appendChild(li);
    });
  }

  function answer(picked) {
    if (state.locked) return;
    state.locked = true;

    var q = state.queue[state.idx];
    state.answers.push({ q: q, picked: picked });

    Array.prototype.forEach.call($("choices").querySelectorAll(".choice"), function (b) {
      var i = Number(b.dataset.src);
      b.disabled = true;
      var mark = b.querySelector(".mark");
      // 色だけに頼らず、記号（CSSの::before）と文字の両方で正誤を示す
      if (i === q.a) {
        b.classList.add("is-correct");
        mark.textContent = picked === q.a ? "正解・選択" : "正解";
      } else if (i === picked) {
        b.classList.add("is-wrong");
        mark.textContent = "あなたの回答";
      } else {
        b.classList.add("is-rest");
        mark.textContent = "誤り";
      }
      var exp = document.createElement("span");
      exp.className = "exp";
      exp.textContent = q.choices[i].e;
      b.querySelector(".label").appendChild(exp);
    });

    var hit = picked === q.a;
    state.streak = hit ? state.streak + 1 : 0;
    reactTo(hit, state.streak);

    if (q.note) { $("q-note").textContent = q.note; $("q-note").hidden = false; }
    $("score-line").innerHTML = "正答 <b>" + correctCount() + "</b>";
    $("progress-bar").style.width = ((state.idx + 1) / state.queue.length * 100) + "%";
    $("hint").hidden = true;
    $("btn-next").hidden = false;
    $("btn-next").focus({ preventScroll: true });
  }

  function correctCount() {
    return state.answers.filter(function (a) { return a.picked === a.q.a; }).length;
  }

  function next() {
    if (state.idx >= state.queue.length - 1) { finish(); return; }
    state.idx++;
    render();
  }


  /* ═══════ マスコット ═══════
     青いモコモコの人形。褒めたり励ましたりする役。
     SVGを1か所で組み立て、気分（mood）と台詞だけ差し替える。 */

  // 3体いる。青いのが普段の相棒で、あとの2体はたまにしか出てこない。
  // 珍しい順に判定し、どれにも当たらなければ青。率を変えるならここだけ直す。
  var RARE = [
    { who: "gent", p: 1 / 100 },   // 灰色のシルクハット
    { who: "non",  p: 1 / 20 }     // 白いモコモコ
  ];

  function rollWho() {
    var r = Math.random(), acc = 0;
    for (var i = 0; i < RARE.length; i++) {
      acc += RARE[i].p;
      if (r < acc) return RARE[i].who;
    }
    return "sun";
  }

  // 青いモコモコ
  function sunSVG() {
    return '<ellipse class="m-body" cx="50" cy="62" rx="30" ry="35" filter="url(#fur)"/>' +
      '<path class="arm arm-l" d="M26 58Q12 66 7 79"/>' +
      '<path class="arm arm-r" d="M74 58Q88 66 93 79"/>' +
      '<g class="eye">' +
        '<circle class="ball" cx="39" cy="30" r="12.5"/>' +
        '<circle class="pupil" cx="41" cy="32" r="5.2"/>' +
        '<circle class="glint" cx="38.6" cy="29.6" r="1.6"/>' +
      '</g>' +
      '<g class="eye">' +
        '<circle class="ball" cx="62" cy="28" r="12.5"/>' +
        '<circle class="pupil" cx="64" cy="30" r="5.2"/>' +
        '<circle class="glint" cx="61.6" cy="27.6" r="1.6"/>' +
      '</g>' +
      '<ellipse class="nose" cx="50" cy="48" rx="4.7" ry="5.8"/>' +
      '<path class="mouth mouth-o" d="M42 59c3 7 13 7 16 0-5 3-11 3-16 0z"/>' +
      '<path class="mouth mouth-wide" d="M39 57c4 13 18 13 22 0-7 5-15 5-22 0z"/>' +
      '<path class="mouth mouth-smile" d="M40 57q10 12 20 0" stroke-width="3.4"/>' +
      '<path class="mouth mouth-flat" d="M44 60h12" stroke-width="3.2"/>';
  }

  // 白いモコモコ。頭のぼんぼり、黒い豆粒の目、赤い鼻と腕。口はない。
  function nonSVG() {
    return '<g filter="url(#fur)">' +
        '<circle class="n-body" cx="50" cy="15" r="8.5"/>' +
        '<circle class="n-body" cx="50" cy="43" r="24"/>' +
        '<ellipse class="n-body" cx="50" cy="76" rx="23" ry="27"/>' +
      '</g>' +
      '<path class="n-scarf" d="M29 62q21 9 42 0"/>' +
      '<path class="arm arm-l n-arm" d="M29 68Q19 78 17 90"/>' +
      '<path class="arm arm-r n-arm" d="M71 68Q81 78 83 90"/>' +
      '<circle class="n-eye" cx="40" cy="41" r="3.6"/>' +
      '<circle class="n-eye" cx="60" cy="39" r="3.6"/>' +
      '<path class="n-eye-arc" d="M36.4 42q3.6-4.4 7.2 0" />' +
      '<path class="n-eye-arc" d="M56.4 40q3.6-4.4 7.2 0" />' +
      '<circle class="n-nose" cx="50" cy="50" r="6"/>';
  }

  // 灰色のふさふさ。シルクハット、長い黒の手足、とじた波形の目。
  function gentSVG() {
    return '<g class="g-leg">' +
        '<path d="M43 84v12"/><path d="M57 84v12"/>' +
      '</g>' +
      '<ellipse class="g-shoe" cx="39" cy="99" rx="10" ry="4.6"/>' +
      '<ellipse class="g-shoe" cx="61" cy="99" rx="10" ry="4.6"/>' +
      '<path class="g-body" d="M50 20c-11 0-16 8-17 19l-5 40c-1 8 8 13 22 13s23-5 22-13l-5-40c-1-11-6-19-17-19z" filter="url(#fur)"/>' +
      // 腕と手はひとつのグループにする。別々だと腕を上げたとき手が置き去りになる
      '<g class="limb limb-l">' +
        '<path class="g-arm" d="M33 40Q20 46 10 56"/>' +
        '<circle class="g-hand" cx="9" cy="57" r="6.4"/>' +
      '</g>' +
      '<g class="limb limb-r">' +
        '<path class="g-arm" d="M67 40Q80 46 90 56"/>' +
        '<circle class="g-hand" cx="91" cy="57" r="6.4"/>' +
      '</g>' +
      '<g class="g-hat">' +
        '<rect class="g-crown" x="40" y="2" width="20" height="15" rx="1.5"/>' +
        '<ellipse class="g-brim" cx="50" cy="17.5" rx="16" ry="3.4"/>' +
      '</g>' +
      '<path class="g-eye" d="M38 34q2.2-3.4 4.4 0t4.4 0"/>' +
      '<path class="g-eye" d="M53.2 34q2.2-3.4 4.4 0t4.4 0"/>' +
      '<circle class="g-nose" cx="50" cy="44" r="4.6"/>';
  }

  function mascotSVG(mood, who) {
    var art = who === "non" ? nonSVG() : who === "gent" ? gentSVG() : sunSVG();
    return '<svg class="mascot" viewBox="0 0 100 106" data-mood="' + mood + '" data-who="' + who +
      '" role="img" aria-hidden="true">' + art + '</svg>';
  }

  // 同じ台詞が続かないように、直前に出したものを覚えておく。
  // 引き直しではなく候補から除いて選ぶ。引き直し方式だと、乱数が偏ったときに
  // ループから抜けられなくなる可能性がある。
  var lastLine = {};
  function pick(key, lines) {
    var pool = lines.filter(function (t) { return t !== lastLine[key]; });
    if (!pool.length) pool = lines;
    var c = pool[Math.floor(Math.random() * pool.length)];
    lastLine[key] = c;
    return c;
  }

  var LINES = {
    greet: [
      "さあ、はじめよう。",
      "今日はどこからやる？",
      "少しずつでいい。積み上げよう。",
      "覚えるより、まず間違えるところからだよ。"
    ],
    good: [
      "やった、正解！",
      "そう、それ！",
      "よく覚えてたね。",
      "いいね、その調子。",
      "ばっちり。",
      "おみごと！"
    ],
    ng: [
      "おしい！ここ、間違えやすいところ。",
      "ドンマイ。解説を読めば次は取れる。",
      "いま覚えれば大丈夫。",
      "ここは差がつくところ。いこう。",
      "よくある引っかけだよ。覚えておこう。"
    ]
  };

  // 白いほうは口数が少ない。出番も少ないので、台詞も短く落ち着いた調子にする。
  var NON_LINES = {
    greet:  ["……こんにちは。", "きょうは わたしが みてるね。", "ゆっくり いこうね。"],
    good:   ["ふふ、せいかい。", "ちゃんと おぼえてるね。", "えらい。", "しずかに すごい。"],
    ng:     ["だいじょうぶ。", "わたしも まちがえるよ。", "つぎ、いこう。", "あわてなくて いいよ。"],
    finale: ["おつかれさま。", "よく がんばったね。"]
  };

  var GENT_LINES = {
    greet:  ["やあ。ごきげんよう。", "また会えたね。", "さて、はじめようか。"],
    good:   ["うむ、お見事。", "よく学んでいるね。", "その調子だ。", "見事な答えだ。"],
    ng:     ["なに、誰しも通る道だ。", "気に病むことはない。", "覚えればそれでよい。"],
    finale: ["よくやった。また、どこかで。", "今日はここまでだね。おつかれさま。"]
  };

  // toon = マスコット＋吹き出し。ひとつの部品として使い回す。
  // 表示のたびに 1/RARE で白いほうが出る。そのときは台詞も差し替える。
  function toon(box, mood, line, sub, ctx) {
    var who = rollWho();
    var own = who === "non" ? NON_LINES : who === "gent" ? GENT_LINES : null;
    if (own && own[ctx]) line = pick(who + "-" + ctx, own[ctx]);
    box.innerHTML = '<div class="toon">' + mascotSVG(mood, who) +
      '<p class="speak">' + esc(line) + (sub || "") + "</p></div>";
  }

  function esc(t) {
    return String(t).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  function sayGreeting() {
    var last = load();
    var sub = "";
    if (last && last.total) {
      sub = '<span class="sub">前回は ' + last.correct + " / " + last.total + " 問。" +
            ((last.wrongIds || []).length
              ? "まちがえた " + last.wrongIds.length + " 問から復習もできるよ。"
              : "全問正解だったね。") + "</span>";
    }
    toon($("greet"), last && last.total ? "idle" : "cheerup",
         pick("greet", LINES.greet), sub, "greet");
  }

  // 連続正解はその場で数える。褒め言葉を段階的に変える
  function reactTo(hit, streak) {
    var box = $("react");
    box.hidden = false;
    if (hit) {
      box.dataset.tone = "ok";
      if (streak >= 5)      toon(box, "party", streak + " 問連続。これはすごい。", "", "good");
      else if (streak >= 3) toon(box, "good",  streak + " 問連続！のってきたね。", "", "good");
      else                  toon(box, "good",  pick("good", LINES.good), "", "good");
    } else {
      box.dataset.tone = "ng";
      toon(box, "oops", pick("ng", LINES.ng), "", "ng");
    }
  }

  /* ---------- 結果 ---------- */
  // 出題した分だけを、指定の並び順で集計してバーにする
  function drawBars(box, keyOf, order) {
    var group = {};
    state.answers.forEach(function (a) {
      var k = keyOf(a);
      var g = group[k] || (group[k] = { n: 0, ok: 0 });
      g.n++;
      if (a.picked === a.q.a) g.ok++;
    });
    box.innerHTML = "";
    order.forEach(function (k) {
      var g = group[k];
      if (!g) return; // 出題されなかった区分は並べない
      var pct = Math.round(g.ok / g.n * 100);
      var li = document.createElement("li");
      li.className = "bar-row" + (pct < 60 ? " is-weak" : "");
      li.innerHTML =
        '<span class="bar-name"></span>' +
        '<span class="bar-num">' + g.ok + " / " + g.n + "　" + pct + '%</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + pct + '%"></span></span>';
      li.querySelector(".bar-name").textContent = k;
      box.appendChild(li);
    });
  }


  /* ═══════ 結果の前の演出 ═══════
     キャラクターがどこかの世界遺産を訪ねて帰ってくる。
     画面のどこかに触れる／キーを押すと、いつでも飛ばせる。 */

  var PLACES = window.WH_PLACES || [];
  var PERFECT = window.WH_PERFECT || null;
  var visitTimer = null;

  var curtainClosing = false;
  function closeCurtain() {
    var c = $("curtain");
    // pointerdown と click の両方から呼ばれるので、二重に走らせない
    if (c.hidden || curtainClosing) return;
    curtainClosing = true;
    clearTimeout(visitTimer);
    visitTimer = null;
    c.classList.add("is-leaving");
    // 閉じ終わってから隠す。連打されても二重に走らないよう先に外す
    setTimeout(function () {
      c.hidden = true;
      c.classList.remove("is-leaving", "is-perfect");
      document.body.style.overflow = "";
      curtainClosing = false;
    }, 300);
  }

  function confettiInto(box, n) {
    var colors = ["#FFD98A", "#E9705A", "#7FD6C0", "#F2F1EC", "#9BB8E8"];
    var html = "";
    for (var i = 0; i < n; i++) {
      html += '<i style="left:' + (Math.random() * 100).toFixed(1) + "%;" +
              "background:" + colors[i % colors.length] + ";" +
              "animation-duration:" + (1.7 + Math.random() * 1.6).toFixed(2) + "s;" +
              "animation-delay:" + (Math.random() * 1.2).toFixed(2) + 's"></i>';
    }
    box.innerHTML = html;
  }

  // perfect=true なら特別な景色。それ以外は訪問先をランダムに選ぶ
  function playVisit(perfect) {
    if (!PLACES.length) return;
    var c = $("curtain");
    var spot = perfect && PERFECT ? PERFECT : PLACES[Math.floor(Math.random() * PLACES.length)];

    $("scene-art").innerHTML =
      '<svg viewBox="0 0 240 120" preserveAspectRatio="xMidYMid slice">' + spot.art + "</svg>";
    $("scene-eyebrow").textContent = perfect ? "満点のごほうび" : "ひと息いれて";
    $("scene-name").textContent = spot.name;
    $("scene-where").textContent = spot.where;
    $("scene-line").textContent = spot.line;

    // 満点は3体そろって、それ以外はいつもの確率で1体
    var actors = $("actors");
    if (perfect) {
      actors.innerHTML =
        mascotSVG("party", "sun").replace("<svg", '<svg style="--x:24%"') +
        mascotSVG("party", "non").replace("<svg", '<svg style="--x:44%"') +
        mascotSVG("party", "gent").replace("<svg", '<svg style="--x:64%"');
      confettiInto($("confetti"), 30);
    } else {
      actors.innerHTML = mascotSVG("good", rollWho()).replace("<svg", '<svg style="--x:42%"');
      $("confetti").innerHTML = "";
    }

    c.classList.toggle("is-perfect", !!perfect);
    c.hidden = false;
    document.body.style.overflow = "hidden";

    var hold = perfect ? 5200 : 4000;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) hold = 2200;
    visitTimer = setTimeout(closeCurtain, hold);
  }

  function finish() {
    var total = state.answers.length;
    var ok = correctCount();
    var rate = total ? Math.round(ok / total * 100) : 0;

    $("result-correct").textContent = ok;
    $("result-total").textContent = total;
    $("result-rate").textContent = rate + "%";

    var verdict, comment;
    if (rate >= 90) {
      verdict = "合格圏"; comment = "十分な水準です。取りこぼした論点だけ確認して、あとは苦手カテゴリを回しましょう。";
    } else if (rate >= 75) {
      verdict = "ほぼ合格圏"; comment = "2級の合格ラインは60%程度とされます。安定して超えるために、誤答の選択肢の解説まで読み込みましょう。";
    } else if (rate >= 60) {
      verdict = "ボーダー"; comment = "合格ラインぎりぎりです。年号・件数・登録基準など数字がからむ問題を重点的に。";
    } else {
      verdict = "要復習"; comment = "まずは条約と理念、しくみと制度の基礎を固めるのが近道です。誤答の復習から始めましょう。";
    }
    $("result-verdict").textContent = verdict;
    $("result-comment").textContent = comment;

    var mood = rate >= 90 ? "party" : rate >= 75 ? "good" : rate >= 60 ? "idle" : "cheerup";
    var cheer =
      rate >= 90 ? "文句なし。よくやった！" :
      rate >= 75 ? "いい線いってる。あと少し！" :
      rate >= 60 ? "合格ラインは越えた。もうひと押し。" :
      total === 0 ? "またいつでもどうぞ。" :
                   "ここからここから。まちがえた問題からいこう。";
    toon($("finale"), mood, cheer,
      total ? '<span class="sub">' + ok + " / " + total + " 問正解（正答率 " + rate + "%）</span>" : "",
      "finale");

    drawBars($("result-bars"), function (a) { return a.q.cat; }, CATS);
    drawBars($("result-level-bars"), function (a) { return LEVEL_NAME[a.q.level]; },
             [LEVEL_NAME[1], LEVEL_NAME[2], LEVEL_NAME[3]]);

    // 誤答リスト
    var wrong = state.answers.filter(function (a) { return a.picked !== a.q.a; });
    $("wrong-count").textContent = wrong.length + " 問";
    var list = $("review-list");
    list.innerHTML = "";
    if (!wrong.length) {
      var p = document.createElement("p");
      p.className = "review-empty";
      p.textContent = "全問正解です。まちがえた問題はありません。";
      list.appendChild(p);
    } else {
      wrong.forEach(function (a) {
        var li = document.createElement("li");
        li.innerHTML = '<p class="r-q"></p><p class="r-a">正解：<b></b></p>';
        li.querySelector(".r-q").textContent = a.q.q;
        li.querySelector(".r-a b").textContent = a.q.choices[a.q.a].t;
        list.appendChild(li);
      });
    }
    $("btn-review-wrong").disabled = !wrong.length;

    save({
      total: total,
      correct: ok,
      level: state.level,
      wrongIds: wrong.map(function (a) { return a.q.id; }),
      at: Date.now()
    });

    show("result");
    if (total) playVisit(ok === total);
  }

  function reviewWrong(ids) {
    var list = BANK.filter(function (q) { return ids.indexOf(q.id) >= 0; });
    if (!list.length) return;
    start(shuffle(list));
  }

  /* ---------- イベント ---------- */
  $("btn-start").addEventListener("click", startFromSetup);
  $("btn-next").addEventListener("click", next);
  $("btn-quit").addEventListener("click", function () {
    // 1問も答えずに中断したら設定画面へ。あいさつは出し直す
    if (state.answers.length) finish();
    else { sayGreeting(); show("setup"); }
  });
  $("btn-again").addEventListener("click", startFromSetup);
  $("btn-home").addEventListener("click", goHome);
  $("btn-logo").addEventListener("click", goHome);
  $("btn-resume").addEventListener("click", resumeSaved);
  $("btn-restart").addEventListener("click", function () {
    saveResume(null);
    buildSetup();
    startFromSetup();
  });
  $("btn-review-wrong").addEventListener("click", function () {
    reviewWrong(state.answers.filter(function (a) { return a.picked !== a.q.a; })
      .map(function (a) { return a.q.id; }));
  });
  $("btn-retry-wrong").addEventListener("click", function () {
    var last = load();
    if (last && last.wrongIds) reviewWrong(last.wrongIds);
  });

  ["pointerdown", "click"].forEach(function (ev) {
    $("curtain").addEventListener(ev, closeCurtain);
  });

  document.addEventListener("keydown", function (e) {
    // 演出中はどのキーでも飛ばす。ほかの操作はそのあと
    if (!$("curtain").hidden) { closeCurtain(); e.preventDefault(); return; }
    if ($("screen-quiz").hidden) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!state.locked && e.key >= "1" && e.key <= "4") {
      var pos = Number(e.key) - 1;
      if (state.shown && pos < state.shown.length) {
        e.preventDefault();
        answer(state.shown[pos]);
      }
    } else if (state.locked && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault(); next();
    }
  });

  restoreConditions();
  buildSetup();
  sayGreeting();
})();
