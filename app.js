/* 世界遺産検定2級 一問一答 — 出題ロジック */
(function () {
  "use strict";

  var BANK = (window.WH_QUESTIONS || []).slice();
  var CATS = [];
  BANK.forEach(function (q) { if (CATS.indexOf(q.cat) < 0) CATS.push(q.cat); });

  var STORE_KEY = "wh2-quiz-v1";
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
    order: "shuffle",
    queue: [],
    idx: 0,
    answers: [],   // {q, picked}
    order: [],     // 表示位置 → q.choices のインデックス
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
      b.setAttribute("aria-pressed", "true");
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
    // order[表示位置] = データ上のインデックス。
    state.order = shuffle(q.choices.map(function (c, i) { return i; }));

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
    state.order.forEach(function (src, pos) {
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

  var MOODS = ["idle", "think", "good", "oops", "party", "cheerup"];

  function mascotSVG(mood) {
    return '<svg class="mascot" viewBox="0 0 100 106" data-mood="' + mood + '" role="img" aria-hidden="true">' +
      // 胴（毛のフィルタ）
      '<ellipse class="m-body" cx="50" cy="62" rx="30" ry="35" filter="url(#fur)"/>' +
      // 腕は胴の手前に描く。太い線で引くと小さく表示しても形が残る
      '<path class="arm arm-l" d="M26 58Q12 66 7 79"/>' +
      '<path class="arm arm-r" d="M74 58Q88 66 93 79"/>' +
      // 顔
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
      '<path class="mouth mouth-flat" d="M44 60h12" stroke-width="3.2"/>' +
    '</svg>';
  }

  // 同じ台詞が続かないように、直前に出したものを覚えておく
  var lastLine = {};
  function pick(key, lines) {
    if (lines.length === 1) return lines[0];
    var c;
    do { c = lines[Math.floor(Math.random() * lines.length)]; } while (c === lastLine[key]);
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

  // toon = マスコット＋吹き出し。ひとつの部品として使い回す
  function toon(box, mood, html) {
    box.innerHTML = '<div class="toon">' + mascotSVG(mood) + '<p class="speak">' + html + "</p></div>";
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
    toon($("greet"), last && last.total ? "idle" : "cheerup", esc(pick("greet", LINES.greet)) + sub);
  }

  // 連続正解はその場で数える。褒め言葉を段階的に変える
  function reactTo(hit, streak) {
    var box = $("react");
    box.hidden = false;
    if (hit) {
      box.dataset.tone = "ok";
      var line;
      if (streak >= 5) { line = streak + " 問連続。これはすごい。"; toon(box, "party", esc(line)); }
      else if (streak >= 3) { line = streak + " 問連続！のってきたね。"; toon(box, "good", esc(line)); }
      else { toon(box, "good", esc(pick("good", LINES.good))); }
    } else {
      box.dataset.tone = "ng";
      toon(box, "oops", esc(pick("ng", LINES.ng)));
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
    toon($("finale"), mood, esc(cheer) +
      (total ? '<span class="sub">' + ok + " / " + total + " 問正解（正答率 " + rate + "%）</span>" : ""));

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
    if (state.answers.length) finish(); else show("setup");
  });
  $("btn-again").addEventListener("click", startFromSetup);
  $("btn-home").addEventListener("click", function () { buildSetup(); sayGreeting(); show("setup"); });
  $("btn-review-wrong").addEventListener("click", function () {
    reviewWrong(state.answers.filter(function (a) { return a.picked !== a.q.a; })
      .map(function (a) { return a.q.id; }));
  });
  $("btn-retry-wrong").addEventListener("click", function () {
    var last = load();
    if (last && last.wrongIds) reviewWrong(last.wrongIds);
  });

  document.addEventListener("keydown", function (e) {
    if ($("screen-quiz").hidden) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!state.locked && e.key >= "1" && e.key <= "4") {
      var pos = Number(e.key) - 1;
      if (state.order && pos < state.order.length) {
        e.preventDefault();
        answer(state.order[pos]);
      }
    } else if (state.locked && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault(); next();
    }
  });

  buildSetup();
  sayGreeting();
})();
