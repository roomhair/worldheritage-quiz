/* 結果画面の演出で訪れる世界遺産
 * name  : 遺産名
 * where : 国・地域
 * line  : その場でキャラクターが言うひとこと（出題内容と結びつける）
 * art   : 240×120 のシルエット。色はCSSのクラスで与える
 *         s-far 遠景 / s-mid 中景 / s-near 主役 / s-sun 太陽 / s-water 水面 / s-snow 雪
 */
window.WH_PLACES = [
  {
    name: "富士山", where: "日本 ／ 文化遺産",
    line: "自然じゃなくて文化遺産。三保松原もここの仲間だよ。",
    art:
      '<circle class="s-sun" cx="192" cy="34" r="13"/>' +
      '<path class="s-far" d="M0 100V78l34-20 30 22 26-14 24 16V100z"/>' +
      '<polygon class="s-near" points="120,24 180,100 60,100"/>' +
      '<path class="s-snow" d="M120 24l18 23-9-5-8 8-8-8-9 5z"/>' +
      '<path class="s-mid" d="M0 100v-8l18-10 16 12 14-8 18 14v-0z"/>'
  },
  {
    name: "メンフィスとその墓地遺跡", where: "エジプト ／ 文化遺産",
    line: "ギザの三大ピラミッド。古代世界の七不思議で、残っているのはここだけ。",
    art:
      '<circle class="s-sun" cx="46" cy="32" r="12"/>' +
      '<polygon class="s-mid" points="34,100 58,64 82,100"/>' +
      '<polygon class="s-near" points="96,100 136,36 176,100"/>' +
      '<polygon class="s-mid" points="160,100 188,58 216,100"/>' +
      '<path class="s-far" d="M0 100v-6q30-10 60 0t60 0 60-8 60 6v8z" opacity=".5"/>'
  },
  {
    name: "万里の長城", where: "中国 ／ 文化遺産",
    line: "1987年登録。北の遊牧民に備えて、途方もない距離を積み上げた。",
    art:
      '<path class="s-far" d="M0 100V70q30-22 58-6t56-14 62 8 64-14v56z"/>' +
      '<path class="s-near" d="M0 84q34-24 62-8t56-16 62 10 60-16v10q-30 18-60 18t-62-10-56 16-62 8z"/>' +
      '<rect class="s-near" x="54" y="58" width="12" height="18"/>' +
      '<rect class="s-near" x="146" y="52" width="12" height="18"/>' +
      '<rect class="s-near" x="214" y="42" width="12" height="18"/>'
  },
  {
    name: "タージ・マハル", where: "インド ／ 文化遺産",
    line: "シャー・ジャハーンが、亡くなった妃のために建てた霊廟なんだって。",
    art:
      '<circle class="s-sun" cx="40" cy="30" r="11"/>' +
      '<rect class="s-near" x="74" y="20" width="5" height="80"/>' +
      '<rect class="s-near" x="161" y="20" width="5" height="80"/>' +
      '<rect class="s-near" x="88" y="66" width="64" height="34"/>' +
      '<path class="s-near" d="M120 26c-16 10-22 22-22 32h44c0-10-6-22-22-32z"/>' +
      '<rect class="s-near" x="118.5" y="16" width="3" height="10"/>' +
      '<rect class="s-mid" x="96" y="76" width="10" height="24"/>' +
      '<rect class="s-mid" x="134" y="76" width="10" height="24"/>'
  },
  {
    name: "モン・サン・ミシェルとその湾", where: "フランス ／ 文化遺産",
    line: "潮が満ちると海に浮かぶ。陸続きをやめて、橋に架け替えたそうだよ。",
    art:
      '<path class="s-water" d="M0 90h240v30H0z"/>' +
      '<path class="s-near" d="M64 92c8-22 22-28 32-38 9-8 16-20 20-34 4 14 11 26 20 34 10 10 24 16 32 38z"/>' +
      '<rect class="s-near" x="134.5" y="8" width="3" height="16"/>' +
      '<path class="s-mid" d="M0 92q30 8 60 0t60 0 60 0 60 0v4H0z" opacity=".6"/>'
  },
  {
    name: "姫路城", where: "日本 ／ 文化遺産",
    line: "白鷺城。木造の城がそのまま残っているのが、いちばんの値打ち。",
    art:
      '<path class="s-far" d="M0 100V84l40-14 44 12 40-10 48 14 68-16v30z" opacity=".55"/>' +
      '<rect class="s-near" x="92" y="86" width="56" height="14"/>' +
      '<path class="s-near" d="M84 86q36-14 72 0z"/>' +
      '<rect class="s-near" x="100" y="70" width="40" height="14"/>' +
      '<path class="s-near" d="M92 70q28-12 56 0z"/>' +
      '<rect class="s-near" x="108" y="56" width="24" height="12"/>' +
      '<path class="s-near" d="M100 56q20-10 40 0z"/>' +
      '<path class="s-near" d="M108 44q12-8 24 0z"/>' +
      '<rect class="s-near" x="119" y="36" width="2" height="8"/>'
  },
  {
    name: "ストーンヘンジ、エーヴベリーと関連する遺跡群", where: "イギリス ／ 文化遺産",
    line: "何のために並べたのか、じつはまだ分かっていないんだ。",
    art:
      '<circle class="s-sun" cx="120" cy="40" r="15"/>' +
      '<path class="s-far" d="M0 100v-8q60-10 120 0t120 0v8z" opacity=".5"/>' +
      '<rect class="s-near" x="58" y="58" width="13" height="42"/>' +
      '<rect class="s-near" x="86" y="58" width="13" height="42"/>' +
      '<rect class="s-near" x="54" y="50" width="49" height="9"/>' +
      '<rect class="s-near" x="140" y="62" width="12" height="38"/>' +
      '<rect class="s-near" x="166" y="62" width="12" height="38"/>' +
      '<rect class="s-near" x="136" y="54" width="46" height="9"/>' +
      '<rect class="s-mid" x="114" y="70" width="10" height="30"/>'
  },
  {
    name: "ローマ歴史地区", where: "イタリア ／ 文化遺産",
    line: "コロッセウムには5万人も入ったらしいよ。すごい人だね。",
    art:
      '<path class="s-near" d="M66 100V58a54 24 0 0 1 108 0v42z"/>' +
      '<g class="s-mid">' +
        '<rect x="76" y="62" width="11" height="16" rx="5"/>' +
        '<rect x="94" y="58" width="11" height="16" rx="5"/>' +
        '<rect x="112" y="56" width="11" height="16" rx="5"/>' +
        '<rect x="130" y="56" width="11" height="16" rx="5"/>' +
        '<rect x="148" y="60" width="11" height="16" rx="5"/>' +
        '<rect x="76" y="84" width="11" height="16" rx="5"/>' +
        '<rect x="94" y="84" width="11" height="16" rx="5"/>' +
        '<rect x="130" y="84" width="11" height="16" rx="5"/>' +
        '<rect x="148" y="84" width="11" height="16" rx="5"/>' +
      '</g>' +
      '<rect class="s-mid" x="24" y="72" width="6" height="28"/>' +
      '<rect class="s-mid" x="38" y="72" width="6" height="28"/>' +
      '<rect class="s-mid" x="20" y="66" width="28" height="6"/>'
  },
  {
    name: "厳島神社", where: "日本 ／ 文化遺産",
    line: "島そのものが神さま。だから社殿を海の上に建てたんだって。",
    art:
      '<circle class="s-sun" cx="60" cy="36" r="12"/>' +
      '<path class="s-far" d="M0 88V66l40-24 44 30 36-14 40 22 80-18v26z"/>' +
      '<path class="s-water" d="M0 88h240v32H0z"/>' +
      '<rect class="s-near" x="92" y="44" width="7" height="48"/>' +
      '<rect class="s-near" x="146" y="44" width="7" height="48"/>' +
      '<path class="s-near" d="M78 40h90l-6 8H84z"/>' +
      '<rect class="s-near" x="84" y="54" width="78" height="6"/>' +
      '<rect class="s-near" x="119" y="40" width="7" height="20"/>'
  },
  {
    name: "マチュ・ピチュの歴史保護区", where: "ペルー ／ 複合遺産",
    line: "標高2400m。文化と自然の両方をみたす複合遺産だよ。",
    art:
      '<path class="s-far" d="M0 100V62l46-34 38 42 28-20 36 32 46-28 46 24v22z" opacity=".55"/>' +
      '<path class="s-near" d="M150 100L186 28l38 72z"/>' +
      '<path class="s-mid" d="M24 100l40-44 42 44z"/>' +
      '<g class="s-near">' +
        '<rect x="56" y="82" width="52" height="4"/>' +
        '<rect x="62" y="90" width="44" height="4"/>' +
        '<rect x="50" y="74" width="40" height="4"/>' +
      '</g>'
  },
  {
    name: "アンコール", where: "カンボジア ／ 文化遺産",
    line: "登録と同時に危機遺産。修復が実って2004年に抜け出したんだ。",
    art:
      '<path class="s-water" d="M0 96h240v24H0z"/>' +
      '<rect class="s-near" x="46" y="86" width="148" height="10"/>' +
      '<path class="s-near" d="M120 22c-9 12-12 24-12 36h24c0-12-3-24-12-36z"/>' +
      '<path class="s-near" d="M80 44c-8 10-10 20-10 30h20c0-10-2-20-10-30z"/>' +
      '<path class="s-near" d="M160 44c-8 10-10 20-10 30h20c0-10-2-20-10-30z"/>' +
      '<path class="s-mid" d="M52 56c-7 9-9 18-9 26h18c0-8-2-17-9-26z"/>' +
      '<path class="s-mid" d="M188 56c-7 9-9 18-9 26h18c0-8-2-17-9-26z"/>' +
      '<rect class="s-near" x="58" y="74" width="124" height="12"/>'
  },
  {
    name: "屋久島", where: "日本 ／ 自然遺産",
    line: "日本で最初の4件のひとつ。千年を超えた杉だけを屋久杉と呼ぶ。",
    art:
      '<path class="s-far" d="M0 100V70l50-28 44 34 40-22 52 30 54-22v38z" opacity=".5"/>' +
      '<path class="s-near" d="M114 100V58c-10-2-18-10-20-20 8 4 14 4 20 2V26c-8-4-12-12-12-20 6 6 10 8 14 8 5 0 9-3 14-9 1 9-3 17-11 21v14c6 2 12 2 20-2-2 10-10 18-20 20v42z"/>' +
      '<path class="s-mid" d="M48 100V76c-6-2-10-7-12-13 5 3 9 3 12 2V52c-4-3-7-8-7-13 4 4 6 5 9 5s5-2 9-6c0 6-2 11-7 14v13c4 1 8 1 13-2-2 6-7 11-13 13v24z"/>' +
      '<path class="s-mid" d="M196 100V80c-5-2-9-6-10-11 4 2 7 3 10 2V60c-4-2-6-7-6-11 3 3 5 4 8 4s4-1 7-5c0 5-2 9-6 12v11c4 1 7 1 11-2-2 5-6 9-11 11v20z"/>'
  }
];

/* 満点のときだけ出る特別な景色。世界遺産をひとめぐりした帰り道。 */
window.WH_PERFECT = {
  name: "全問正解", where: "世界をひとめぐり",
  line: "ぜんぶ正解。おみごと！",
  art:
    '<circle class="s-sun" cx="120" cy="30" r="17"/>' +
    '<path class="s-far" d="M0 100V80l26-14 22 12 20-10 24 12 22-14 26 16 22-12 26 14 26-16v32z" opacity=".45"/>' +
    '<polygon class="s-mid" points="30,100 54,68 78,100"/>' +
    '<path class="s-mid" d="M96 100V78a26 12 0 0 1 52 0v22z"/>' +
    '<polygon class="s-mid" points="166,100 188,62 210,100"/>' +
    '<path class="s-near" d="M0 100v-6q30-8 60 0t60 0 60-6 60 6v6z"/>'
};
