"use strict";
/* Ember Court — an original card battler.
   Spend mana to play creatures and spells. Your creatures strike the enemy
   across from them, or the enemy hero when the way is clear. First hero to
   fall from 25 life to 0 loses. Mouse and keyboard. No network, no assets. */

var CARDS = {
  imp:    { name: "Ember Imp",   cost: 1, atk: 2, hp: 1, kind: "creature", sym: "\u2726", c1: "#ff8c42", c2: "#7a1f00" },
  golem:  { name: "Stone Golem", cost: 2, atk: 2, hp: 3, kind: "creature", sym: "\u25C6", c1: "#aab6c2", c2: "#3d4852" },
  knight: { name: "Flame Knight",cost: 3, atk: 3, hp: 3, kind: "creature", sym: "\u265E", c1: "#ffb347", c2: "#8a2f00" },
  hawk:   { name: "Storm Hawk",  cost: 2, atk: 3, hp: 2, kind: "creature", sym: "\u2708", c1: "#7dd3fc", c2: "#1e3a5f" },
  warden: { name: "Iron Warden", cost: 4, atk: 3, hp: 5, kind: "creature", sym: "\u25A3", c1: "#dbe4ee", c2: "#334155" },
  dragon: { name: "Ember Dragon",cost: 6, atk: 6, hp: 6, kind: "creature", sym: "\u2739", c1: "#fb923c", c2: "#450a0a" },
  wolf:   { name: "Thorn Wolf",  cost: 3, atk: 4, hp: 2, kind: "creature", sym: "\u25C8", c1: "#86efac", c2: "#14532d" },
  mage:   { name: "Frost Mage",  cost: 4, atk: 5, hp: 3, kind: "creature", sym: "\u2744", c1: "#bae6fd", c2: "#0c4a6e" },
  bolt:   { name: "Ember Bolt",  cost: 2, kind: "spell", text: "Deal 3 damage to the enemy hero.", sym: "\u26A1", c1: "#fbbf24", c2: "#7c2d12" },
  mend:   { name: "Mend",        cost: 2, kind: "spell", text: "Restore 5 life to your hero.", sym: "\u271A", c1: "#4ade80", c2: "#14532d" },
  rally:  { name: "Rally",       cost: 1, kind: "spell", text: "Draw 2 cards.", sym: "\u2691", c1: "#facc15", c2: "#713f12" }
};

/* Two copies of each card, except one Ember Dragon and one Rally: 20 total. */
var DECK_SPEC = [
  ["imp", 2], ["golem", 2], ["knight", 2], ["hawk", 2], ["warden", 2],
  ["dragon", 1], ["wolf", 2], ["mage", 2], ["bolt", 2], ["mend", 2], ["rally", 1]
];

function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rnd) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(rnd() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function buildDeck(rnd) {
  var deck = [];
  DECK_SPEC.forEach(function (pair) {
    for (var i = 0; i < pair[1]; i++) deck.push(pair[0]);
  });
  return shuffle(deck, rnd);
}

function makeSide(rnd) {
  return { hp: 25, deck: buildDeck(rnd), hand: [], board: [], discard: [],
    mana: 1, maxMana: 1 };
}

function newGame(seed) {
  var rnd = mulberry32(seed);
  var g = {
    seed: seed, rnd: rnd, screen: "play", over: false, winner: null,
    turn: 1, phase: "player",
    me: makeSide(rnd), foe: makeSide(rnd),
    log: ["The court is set. Your move, challenger."]
  };
  for (var i = 0; i < 4; i++) { drawCard(g.me); drawCard(g.foe); }
  return g;
}

function drawCard(side) {
  if (side.hand.length >= 7) return null;
  if (side.deck.length === 0) return null;
  var id = side.deck.pop();
  side.hand.push(id);
  return id;
}

function log(g, msg) {
  g.log.push(msg);
  if (g.log.length > 3) g.log.shift();
}

function damageHero(g, side, amount) {
  side.hp -= amount;
  if (side.hp <= 0) {
    side.hp = 0;
    g.over = true;
    g.winner = side === g.foe ? "player" : "enemy";
    g.screen = g.winner === "player" ? "win" : "loss";
  }
}

function canPlay(g, id) {
  var c = CARDS[id];
  if (g.phase !== "player" || g.over) return false;
  if (c.cost > g.me.mana) return false;
  if (c.kind === "creature" && g.me.board.length >= 5) return false;
  return true;
}

/* Play a card from the player's hand by index. Returns true when played. */
function playCard(g, idx) {
  if (g.phase !== "player" || g.over) return false;
  if (idx < 0 || idx >= g.me.hand.length) return false;
  var id = g.me.hand[idx];
  if (!canPlay(g, id)) return false;
  var c = CARDS[id];
  g.me.hand.splice(idx, 1);
  g.me.mana -= c.cost;
  if (c.kind === "creature") {
    g.me.board.push({ id: id, atk: c.atk, hp: c.hp });
    log(g, c.name + " takes the field (" + c.atk + "/" + c.hp + ").");
  } else if (id === "bolt") {
    g.me.discard.push(id);
    damageHero(g, g.foe, 3);
    log(g, "Ember Bolt sears the enemy hero for 3!");
  } else if (id === "mend") {
    g.me.discard.push(id);
    g.me.hp = Math.min(25, g.me.hp + 5);
    log(g, "Mend restores 5 life to your hero.");
  } else if (id === "rally") {
    g.me.discard.push(id);
    drawCard(g.me); drawCard(g.me);
    log(g, "Rally! You draw 2 cards.");
  }
  return true;
}

/* One side's creatures attack: each strikes the foe across from it, or the
   enemy hero when nothing stands across. Dead creatures leave the board. */
function attackPhase(g, atkSide, defSide, atkName, defName) {
  for (var i = 0; i < atkSide.board.length; i++) {
    if (g.over) return;
    var cr = atkSide.board[i];
    var target = defSide.board[i];
    if (target) {
      target.hp -= cr.atk;
      log(g, CARDS[cr.id].name + " hits " + CARDS[target.id].name + " for " + cr.atk + ".");
      if (target.hp <= 0) {
        log(g, CARDS[target.id].name + " falls!");
        defSide.discard.push(target.id);
        defSide.board.splice(i, 1);
        /* The attacker keeps its slot; the defender's line closes up. */
      }
    } else {
      damageHero(g, defSide, cr.atk);
      log(g, CARDS[cr.id].name + " strikes " + defName + " for " + cr.atk + ".");
    }
  }
  /* Sweep any creature that reached 0 without being the direct target. */
  defSide.board = defSide.board.filter(function (c) { return c.hp > 0; });
}

/* Enemy turn: play every affordable creature (best first), then spells,
   then attack. Deterministic. */
function aiTurn(g) {
  g.phase = "enemy";
  g.foe.maxMana = Math.min(10, g.turn);
  g.foe.mana = g.foe.maxMana;
  render();
  var foe = g.foe;
  var guard = 0;
  var played = true;
  while (played && guard++ < 20 && !g.over) {
    played = false;
    var best = -1, bestScore = -1;
    for (var i = 0; i < foe.hand.length; i++) {
      var c = CARDS[foe.hand[i]];
      if (c.kind !== "creature" || c.cost > foe.mana) continue;
      if (c.kind === "creature" && foe.board.length >= 5) continue;
      var score = c.atk * 2 + c.hp + (c.cost === 6 ? 3 : 0);
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best >= 0) {
      var id = foe.hand[best];
      foe.hand.splice(best, 1);
      foe.mana -= CARDS[id].cost;
      foe.board.push({ id: id, atk: CARDS[id].atk, hp: CARDS[id].hp });
      log(g, "Enemy plays " + CARDS[id].name + ".");
      played = true;
    }
  }
  for (var s = 0; s < foe.hand.length && !g.over; s++) {
    var sid = foe.hand[s];
    var sc = CARDS[sid];
    if (sc.kind !== "spell" || sc.cost > foe.mana) continue;
    if (sid === "mend" && foe.hp >= 25) continue;
    if (sid === "bolt" && foe.hp > 20 && foe.board.length === 0) continue;
    foe.hand.splice(s, 1);
    foe.mana -= sc.cost;
    foe.discard.push(sid);
    if (sid === "bolt") { damageHero(g, g.me, 3); log(g, "Enemy Ember Bolt sears you for 3!"); }
    else if (sid === "mend") { foe.hp = Math.min(25, foe.hp + 5); log(g, "Enemy Mend restores 5 life."); }
    else if (sid === "rally") { drawCard(foe); drawCard(foe); log(g, "Enemy Rally draws 2 cards."); }
    s--;
  }
  if (!g.over) attackPhase(g, foe, g.me, "Enemy", "your hero");
  if (!g.over) {
    g.turn += 1;
    g.me.maxMana = Math.min(10, g.turn);
    g.me.mana = g.me.maxMana;
    g.phase = "player";
    drawCard(g.me);
    drawCard(g.foe);
    log(g, "Turn " + g.turn + " — mana refilled to " + g.me.mana + ". Your move.");
  }
  render();
}

function endTurn(g) {
  if (g.phase !== "player" || g.over) return;
  attackPhase(g, g.me, g.foe, "You", "the enemy hero");
  if (!g.over) aiTurn(g);
  else render();
}

function startPlayerTurn(g) {
  g.phase = "player";
}

/* ---------------- fixed shot states (deterministic, for screenshots) ----- */
function shotState(kind) {
  var g = newGame(7);
  if (kind === "play") {
    g.me.hp = 14; g.foe.hp = 11;
    g.turn = 7; g.me.maxMana = 7; g.me.mana = 6; g.foe.maxMana = 7; g.foe.mana = 7; g.phase = "player";
    g.me.board = [
      { id: "knight", atk: 3, hp: 3 }, { id: "golem", atk: 2, hp: 3 },
      { id: "imp", atk: 2, hp: 1 }, { id: "hawk", atk: 3, hp: 2 }
    ];
    g.foe.board = [
      { id: "warden", atk: 3, hp: 5 }, { id: "mage", atk: 5, hp: 3 },
      { id: "wolf", atk: 4, hp: 2 }
    ];
    g.me.hand = ["dragon", "bolt", "mage", "mend", "knight", "rally", "imp"];
    g.foe.hand = ["imp", "golem", "hawk"];
    g.me.discard = ["imp", "bolt"];
    g.foe.discard = ["hawk", "golem"];
    g.log = ["Flame Knight strikes Iron Warden for 3!", "Storm Hawk takes the field (3/2).", "Turn 7 — mana refilled to 6. Your move."];
    g.screen = "play";
  } else if (kind === "win") {
    g.over = true; g.winner = "player"; g.screen = "win";
    g.me.hp = 9; g.foe.hp = 0;
  } else if (kind === "loss") {
    g.over = true; g.winner = "enemy"; g.screen = "loss";
    g.me.hp = 0; g.foe.hp = 12;
  }
  return g;
}

/* ---------------- rendering ---------------------------------------------- */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function cardHtml(id, opts) {
  opts = opts || {};
  var c = CARDS[id];
  var cls = "card" + (opts.mini ? " mini-card" : "") +
    (opts.playable ? " playable" : "") + (opts.cant ? " cant" : "");
  var click = opts.onclick ? ' onclick="' + opts.onclick + '"' : "";
  var body = "";
  if (c.kind === "creature") {
    body = '<div class="stats"><span class="atk">\u2694 ' + opts.atk + '</span>' +
      '<span class="hpv">\u2665 ' + opts.hp + '</span></div>';
  } else {
    body = '<div class="ctext">' + esc(c.text) + '</div>';
  }
  return '<div class="' + cls + '"' + click + '>' +
    '<div class="cost">' + c.cost + '</div>' +
    '<div class="cname">' + esc(c.name) + '</div>' +
    '<div class="art" style="background:linear-gradient(135deg,' + c.c1 + ',' + c.c2 + ')"><span>' + c.sym + '</span></div>' +
    body + '</div>';
}

function boardHtml(board) {
  var out = "";
  for (var i = 0; i < 5; i++) {
    if (i < board.length) {
      var cr = board[i];
      out += cardHtml(cr.id, { mini: true, atk: cr.atk, hp: cr.hp });
    } else {
      out += '<div class="slot"></div>';
    }
  }
  return out;
}

function deckPileHtml(side) {
  return '<div class="pile deck"><div class="pcount">' + side.deck.length +
    '</div><div class="plabel">DECK</div></div>';
}

function discardPileHtml(side) {
  if (side.discard.length === 0) {
    return '<div class="pile discard empty"><div class="pcount">0</div>' +
      '<div class="plabel">DISCARD</div></div>';
  }
  var top = CARDS[side.discard[side.discard.length - 1]];
  return '<div class="pile discard"><div class="psym">' + top.sym + '</div>' +
    '<div class="pcount">' + side.discard.length + '</div>' +
    '<div class="plabel">DISCARD</div></div>';
}

function manaHtml(g) {
  var s = "";
  for (var i = 0; i < 10; i++) {
    s += i < g.me.mana
      ? '<span class="crystal">\u25CF</span>'
      : '<span class="empty">\u25CB</span>';
  }
  return '<div class="mana">MANA ' + s + ' ' + g.me.mana + '/' + g.me.maxMana + '</div>';
}

function renderTitle() {
  return '<div class="screen">' +
    '<div class="title">EMBER COURT</div>' +
    '<div class="subtitle">A CARD BATTLER OF FIRE AND IRON</div>' +
    '<div class="rules">Spend mana to play creatures and spells. Your creatures strike ' +
    'the enemy across from them — or the enemy hero when the way is clear. ' +
    'First hero to fall from 25 life to 0 loses the court.</div>' +
    '<button class="btn bigbtn" onclick="__ember.start()">START GAME</button>' +
    '<div class="deco">' +
    cardHtml("dragon", { atk: 6, hp: 6 }) +
    cardHtml("knight", { atk: 3, hp: 3 }) +
    cardHtml("bolt", {}) +
    '</div>' +
    '<div class="hint">Mouse: click a card to play it &middot; Enter: start / end turn &middot; Keys 1-7: play a card</div>' +
    '</div>';
}

function renderEnd(win, g) {
  var title = win ? "VICTORY" : "DEFEAT";
  var cls = win ? "win" : "lose";
  var line = win
    ? "The Ember Court is yours!"
    : "The court falls silent. The ember fades.";
  return '<div class="screen">' +
    '<div class="endtitle ' + cls + '">' + title + '</div>' +
    '<div class="endscore">' + line + '<br>Final life — You ' + g.me.hp + ' &nbsp;·&nbsp; Enemy ' + g.foe.hp + '</div>' +
    '<button class="btn bigbtn" onclick="__ember.start()">PLAY AGAIN</button>' +
    '<div class="hint">Enter: play again</div>' +
    '</div>';
}

function renderPlay(g) {
  var oppMinis = "";
  for (var i = 0; i < g.foe.hand.length; i++) oppMinis += '<div class="mini"></div>';
  var hand = "";
  for (var j = 0; j < g.me.hand.length; j++) {
    var id = g.me.hand[j];
    var ok = canPlay(g, id);
    hand += cardHtml(id, {
      atk: CARDS[id].atk, hp: CARDS[id].hp,
      playable: ok, cant: !ok,
      onclick: ok ? "__ember.play(" + j + ")" : null
    });
  }
  var tag = g.over ? "GAME OVER"
    : g.phase === "player" ? "YOUR TURN — TURN " + g.turn : "ENEMY TURN...";
  return '<div class="table">' +
    '<div class="row opp-hand">' + oppMinis + '</div>' +
    '<div class="row hero-row">' +
      '<div class="hero"><span class="hname">EMBER QUEEN</span><span class="hp' + (g.foe.hp <= 8 ? " low" : "") + '">\u2665 ' + g.foe.hp + '</span></div>' +
      '<div class="turntag">' + tag + '</div>' +
      '<div style="width:220px"></div>' +
    '</div>' +
    '<div class="board-label">ENEMY BOARD</div>' +
    '<div class="boardline">' + deckPileHtml(g.foe) +
    '<div class="row board">' + boardHtml(g.foe.board) + '</div>' +
    discardPileHtml(g.foe) + '</div>' +
    '<div class="board-label">YOUR BOARD</div>' +
    '<div class="boardline">' + deckPileHtml(g.me) +
    '<div class="row board">' + boardHtml(g.me.board) + '</div>' +
    discardPileHtml(g.me) + '</div>' +
    '<div class="row hand">' + hand + '</div>' +
    '<div class="controls">' +
      manaHtml(g) +
      '<div class="log">' + esc(g.log[g.log.length - 1] || "") + '</div>' +
      '<button class="btn endbtn" onclick="__ember.end()"' + (g.phase !== "player" || g.over ? " disabled" : "") + '>END TURN</button>' +
    '</div>' +
    '<div class="row hero-row" style="padding-top:6px">' +
      '<div class="hero me"><span class="hname">YOU</span><span class="hp' + (g.me.hp <= 8 ? " low" : "") + '">\u2665 ' + g.me.hp + '</span></div>' +
      '<div class="keys">Enter: end turn &middot; Keys 1-7: play a card &middot; Deck: you ' + g.me.deck.length + ' &middot; enemy ' + g.foe.deck.length + '</div>' +
      '<div style="width:220px"></div>' +
    '</div>' +
    '</div>';
}

var app = document.getElementById("app");
var G = null;

function render() {
  if (!G) return;
  if (G.screen === "title") app.innerHTML = renderTitle();
  else if (G.screen === "win") app.innerHTML = renderEnd(true, G);
  else if (G.screen === "loss") app.innerHTML = renderEnd(false, G);
  else app.innerHTML = renderPlay(G);
}

function startGame() {
  var params = new URLSearchParams(location.search);
  var seed = parseInt(params.get("seed") || "7", 10);
  if (isNaN(seed)) seed = 7;
  G = newGame(seed);
  render();
}

window.__ember = {
  get state() { return G; },
  start: function () { startGame(); },
  play: function (i) { if (G && playCard(G, i)) render(); },
  end: function () { if (G) endTurn(G); },
  /* Test hook: play a sensible game until it ends, for automated checks.
     Picks the strongest affordable creature, fires Bolt at a low hero,
     Mends only when hurt, Rallies only with a small hand. */
  autoplay: function () {
    var guard = 0;
    while (G && !G.over && guard++ < 400) {
      if (G.phase !== "player") break;
      var choice = -1;
      var i, c;
      for (i = 0; i < G.me.hand.length; i++) {
        if (G.me.hand[i] === "bolt" && G.foe.hp <= 3 && CARDS.bolt.cost <= G.me.mana) { choice = i; break; }
      }
      if (choice < 0) {
        var best = -1;
        for (i = 0; i < G.me.hand.length; i++) {
          c = CARDS[G.me.hand[i]];
          if (c.kind === "creature" && c.cost <= G.me.mana && G.me.board.length < 5) {
            var score = c.atk * 2 + c.hp;
            if (score > best) { best = score; choice = i; }
          }
        }
      }
      if (choice < 0) {
        for (i = 0; i < G.me.hand.length; i++) {
          if (G.me.hand[i] === "mend" && G.me.hp <= 15 && CARDS.mend.cost <= G.me.mana) { choice = i; break; }
        }
      }
      if (choice < 0) {
        for (i = 0; i < G.me.hand.length; i++) {
          if (G.me.hand[i] === "rally" && G.me.hand.length <= 3 && CARDS.rally.cost <= G.me.mana) { choice = i; break; }
        }
      }
      if (choice < 0) {
        for (i = 0; i < G.me.hand.length; i++) {
          if (G.me.hand[i] === "bolt" && CARDS.bolt.cost <= G.me.mana) { choice = i; break; }
        }
      }
      if (choice >= 0) { playCard(G, choice); render(); }
      else endTurn(G);
    }
    render();
    return G ? { over: G.over, winner: G.winner, me: G.me.hp, foe: G.foe.hp, turn: G.turn } : null;
  },
  passTurns: function () {
    var guard = 0;
    while (G && !G.over && guard++ < 400) {
      if (G.phase !== "player") break;
      endTurn(G);
    }
    render();
    return G ? { over: G.over, winner: G.winner, me: G.me.hp, foe: G.foe.hp, turn: G.turn } : null;
  }
};

document.addEventListener("keydown", function (e) {
  if (!G) return;
  if (e.key === "Enter") {
    if (G.screen === "title" || G.screen === "win" || G.screen === "loss") startGame();
    else if (G.phase === "player") endTurn(G);
  } else if (/^[1-7]$/.test(e.key)) {
    var i = parseInt(e.key, 10) - 1;
    if (G.screen === "play" && playCard(G, i)) render();
  }
});

/* Boot: title screen, or a fixed shot state when ?shot= is given. */
(function boot() {
  var params = new URLSearchParams(location.search);
  var shot = params.get("shot");
  if (shot === "play" || shot === "win" || shot === "loss") {
    G = shotState(shot);
    render();
  } else {
    G = newGame(7);
    G.screen = "title";
    render();
  }
})();
