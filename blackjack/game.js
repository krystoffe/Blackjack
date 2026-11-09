/**
 * Blackjack — logique du jeu + UI
 * Sabot 6 jeux, croupier reste sur soft 17, BJ 3:2
 */

(function () {
  'use strict';

  const SUITS = [
    { symbol: '♠', color: 'black', name: 'pique' },
    { symbol: '♥', color: 'red', name: 'coeur' },
    { symbol: '♦', color: 'red', name: 'carreau' },
    { symbol: '♣', color: 'black', name: 'trefle' },
  ];
  const RANKS = [
    { r: 'A', v: 11 },
    { r: '2', v: 2 },
    { r: '3', v: 3 },
    { r: '4', v: 4 },
    { r: '5', v: 5 },
    { r: '6', v: 6 },
    { r: '7', v: 7 },
    { r: '8', v: 8 },
    { r: '9', v: 9 },
    { r: '10', v: 10 },
    { r: 'J', v: 10 },
    { r: 'Q', v: 10 },
    { r: 'K', v: 10 },
  ];

  const DECKS = 6;
  const RESHUFFLE_AT = 78; // ~1.5 decks left
  const STARTING_BANKROLL = 1000;
  const CHIP_VALUES = [5, 10, 25, 50, 100];

  // ——— Pure game logic (exported for tests via window / module) ———

  function createShoe(decks = DECKS) {
    const cards = [];
    for (let d = 0; d < decks; d++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          cards.push({
            rank: rank.r,
            value: rank.v,
            suit: suit.symbol,
            color: suit.color,
            id: `${d}-${suit.name}-${rank.r}`,
          });
        }
      }
    }
    return shuffle(cards);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function handValue(cards) {
    let total = 0;
    let aces = 0;
    for (const c of cards) {
      total += c.value;
      if (c.rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    const soft = aces > 0 && total <= 21;
    return { total, soft, bust: total > 21 };
  }

  function isBlackjack(cards) {
    return cards.length === 2 && handValue(cards).total === 21;
  }

  function canSplit(hand) {
    if (!hand || hand.cards.length !== 2) return false;
    const [a, b] = hand.cards;
    return a.value === b.value;
  }

  function dealerShouldHit(cards) {
    const { total, soft } = handValue(cards);
    if (total < 17) return true;
    // Soft 17: stand (dealer stands on soft 17)
    if (total === 17 && soft) return false;
    return false;
  }

  function settleHand(playerCards, dealerCards, bet, doubled) {
    const pv = handValue(playerCards);
    const dv = handValue(dealerCards);
    const stake = doubled ? bet * 2 : bet;
    const playerBJ = isBlackjack(playerCards);
    const dealerBJ = isBlackjack(dealerCards);

    if (pv.bust) {
      return { result: 'lose', payout: 0, message: 'Perdu — vous avez dépassé 21.' };
    }
    if (playerBJ && !dealerBJ) {
      // Blackjack pays 3:2 on original bet (not doubled)
      const win = Math.floor(bet * 2.5);
      return { result: 'blackjack', payout: win, message: 'Blackjack ! Paiement 3:2.' };
    }
    if (dealerBJ && !playerBJ) {
      return { result: 'lose', payout: 0, message: 'Perdu — blackjack du croupier.' };
    }
    if (playerBJ && dealerBJ) {
      return { result: 'push', payout: bet, message: 'Égalité — deux blackjacks.' };
    }
    if (dv.bust) {
      return { result: 'win', payout: stake * 2, message: 'Gagné — le croupier a dépassé 21.' };
    }
    if (pv.total > dv.total) {
      return { result: 'win', payout: stake * 2, message: `Gagné ! ${pv.total} contre ${dv.total}.` };
    }
    if (pv.total < dv.total) {
      return { result: 'lose', payout: 0, message: `Perdu — ${pv.total} contre ${dv.total}.` };
    }
    return { result: 'push', payout: stake, message: `Égalité — ${pv.total}.` };
  }

  const Logic = {
    createShoe,
    shuffle,
    handValue,
    isBlackjack,
    canSplit,
    dealerShouldHit,
    settleHand,
    SUITS,
    RANKS,
    DECKS,
    STARTING_BANKROLL,
  };

  if (typeof window !== 'undefined') {
    window.BlackjackLogic = Logic;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logic;
  }

  // ——— UI / Game state ———

  if (typeof document === 'undefined') return;

  const el = {
    dealerCards: document.getElementById('dealer-cards'),
    dealerValue: document.getElementById('dealer-value'),
    playerHands: document.getElementById('player-hands'),
    message: document.getElementById('message'),
    bankroll: document.getElementById('bankroll'),
    currentBet: document.getElementById('current-bet'),
    chipRow: document.getElementById('chip-row'),
    btnDeal: document.getElementById('btn-deal'),
    btnHit: document.getElementById('btn-hit'),
    btnStand: document.getElementById('btn-stand'),
    btnDouble: document.getElementById('btn-double'),
    btnSplit: document.getElementById('btn-split'),
    btnClear: document.getElementById('btn-clear'),
    btnNew: document.getElementById('btn-new'),
  };

  const state = {
    shoe: createShoe(),
    bankroll: STARTING_BANKROLL,
    pendingBet: 0,
    phase: 'betting', // betting | playing | dealer | settled
    dealer: [],
    hands: [], // { cards, bet, doubled, stood, bust, splitFromAces }
    active: 0,
    hideDealerHole: true,
    lastMessages: [],
  };

  function drawCard() {
    if (state.shoe.length <= RESHUFFLE_AT) {
      state.shoe = createShoe();
      flashHint('Sabot mélangé.');
    }
    return state.shoe.pop();
  }

  function flashHint(text) {
    // soft notice mixed into message area briefly if betting
    if (state.phase === 'betting') {
      setMessage(text, '');
      setTimeout(() => {
        if (state.phase === 'betting') setMessage('Placez vos jetons, puis Distribuer.', '');
      }, 1800);
    }
  }

  function setMessage(text, kind) {
    el.message.textContent = text;
    el.message.className = 'message-banner' + (kind ? ' ' + kind : '');
  }

  function updateBankrollUI() {
    el.bankroll.textContent = state.bankroll;
    el.currentBet.textContent = state.phase === 'betting' ? state.pendingBet : totalActiveBets();
  }

  function totalActiveBets() {
    return state.hands.reduce((s, h) => s + (h.doubled ? h.bet * 2 : h.bet), 0);
  }

  function cardHTML(card, faceDown, delayMs) {
    if (faceDown) {
      return `<div class="card back" style="animation-delay:${delayMs || 0}ms" aria-label="Carte face cachée"></div>`;
    }
    return `<div class="card ${card.color}" style="animation-delay:${delayMs || 0}ms" aria-label="${card.rank} ${card.suit}">
      <div class="corner"><span>${card.rank}</span><span>${card.suit}</span></div>
      <div class="suit-center">${card.suit}</div>
      <div class="corner bottom"><span>${card.rank}</span><span>${card.suit}</span></div>
    </div>`;
  }

  function renderDealer() {
    let html = '';
    state.dealer.forEach((c, i) => {
      const hide = state.hideDealerHole && i === 1;
      html += cardHTML(c, hide, i * 80);
    });
    el.dealerCards.innerHTML = html;
    if (state.dealer.length === 0) {
      el.dealerValue.textContent = '';
    } else if (state.hideDealerHole) {
      const shown = handValue([state.dealer[0]]).total;
      el.dealerValue.textContent = `Montre : ${shown}`;
    } else {
      const v = handValue(state.dealer);
      el.dealerValue.textContent = v.soft && v.total !== 21 ? `${v.total} (souple)` : String(v.total);
    }
  }

  function renderPlayer() {
    el.playerHands.innerHTML = '';
    state.hands.forEach((hand, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'player-hand' +
        (idx === state.active && state.phase === 'playing' ? ' active' : '') +
        (hand.stood || hand.bust || hand.settled ? ' done' : '');
      const v = handValue(hand.cards);
      let valText = '';
      if (hand.cards.length) {
        if (isBlackjack(hand.cards) && !hand.doubled) valText = 'Blackjack !';
        else if (v.bust) valText = `${v.total} — Bust`;
        else valText = v.soft ? `${v.total} (souple)` : String(v.total);
      }
      const stake = hand.doubled ? hand.bet * 2 : hand.bet;
      wrap.innerHTML = `
        <div class="hand-label">Main ${state.hands.length > 1 ? idx + 1 : 'joueur'}</div>
        <div class="hand-value">${valText}</div>
        <div class="cards">${hand.cards.map((c, i) => cardHTML(c, false, i * 80)).join('')}</div>
        <div class="bet-spot">Mise : ${stake} jetons</div>
      `;
      el.playerHands.appendChild(wrap);
    });
  }

  function renderAll() {
    renderDealer();
    renderPlayer();
    updateBankrollUI();
    updateButtons();
  }

  function updateButtons() {
    const betting = state.phase === 'betting';
    const playing = state.phase === 'playing';
    const hand = state.hands[state.active];

    el.btnDeal.disabled = !(betting && state.pendingBet > 0 && state.bankroll >= 0);
    el.btnClear.disabled = !(betting && state.pendingBet > 0);
    el.btnNew.disabled = !betting;

    let canHit = false, canStand = false, canDouble = false, canSplit = false;
    if (playing && hand && !hand.stood && !hand.bust) {
      canHit = !hand.splitFromAces || hand.cards.length < 2;
      // After split aces, only one card each — already dealt; no hit
      if (hand.splitFromAces) {
        canHit = false;
        canStand = true;
      } else {
        canHit = true;
        canStand = true;
        canDouble =
          hand.cards.length === 2 &&
          !hand.doubled &&
          state.bankroll >= hand.bet;
        canSplit =
          canSplitHand(hand) &&
          state.hands.length < 4 &&
          state.bankroll >= hand.bet;
      }
    }

    el.btnHit.disabled = !canHit;
    el.btnStand.disabled = !canStand;
    el.btnDouble.disabled = !canDouble;
    el.btnSplit.disabled = !canSplit;

    document.querySelectorAll('.chip').forEach((btn) => {
      const val = Number(btn.dataset.value);
      btn.disabled = !betting || state.bankroll < val;
    });
  }

  function canSplitHand(hand) {
    return canSplit(hand);
  }

  function addChip(value) {
    if (state.phase !== 'betting') return;
    if (state.bankroll < value) return;
    state.bankroll -= value;
    state.pendingBet += value;
    updateBankrollUI();
    updateButtons();
    setMessage(`Mise : ${state.pendingBet} jetons`, '');
  }

  function clearBet() {
    if (state.phase !== 'betting') return;
    state.bankroll += state.pendingBet;
    state.pendingBet = 0;
    updateBankrollUI();
    updateButtons();
    setMessage('Placez vos jetons, puis Distribuer.', '');
  }

  function deal() {
    if (state.phase !== 'betting' || state.pendingBet <= 0) return;
    const bet = state.pendingBet;
    state.pendingBet = 0;
    state.dealer = [];
    state.hands = [{ cards: [], bet, doubled: false, stood: false, bust: false, splitFromAces: false }];
    state.active = 0;
    state.hideDealerHole = true;
    state.phase = 'playing';
    state.lastMessages = [];

    state.hands[0].cards.push(drawCard());
    state.dealer.push(drawCard());
    state.hands[0].cards.push(drawCard());
    state.dealer.push(drawCard());

    renderAll();

    const playerBJ = isBlackjack(state.hands[0].cards);
    const dealerBJ = isBlackjack(state.dealer);

    if (playerBJ || dealerBJ) {
      state.hideDealerHole = false;
      finishRound();
      return;
    }
    setMessage('À vous de jouer.', '');
  }

  function hit() {
    if (state.phase !== 'playing') return;
    const hand = state.hands[state.active];
    if (!hand || hand.stood || hand.bust || hand.splitFromAces) return;
    hand.cards.push(drawCard());
    const v = handValue(hand.cards);
    if (v.bust) {
      hand.bust = true;
      hand.stood = true;
      setMessage('Bust !', 'lose');
      advanceHand();
    } else {
      renderAll();
      setMessage(`Main à ${v.total}. Tirer ou Rester ?`, '');
    }
  }

  function stand() {
    if (state.phase !== 'playing') return;
    const hand = state.hands[state.active];
    if (!hand) return;
    hand.stood = true;
    advanceHand();
  }

  function doubleDown() {
    if (state.phase !== 'playing') return;
    const hand = state.hands[state.active];
    if (!hand || hand.cards.length !== 2 || hand.doubled) return;
    if (state.bankroll < hand.bet) return;
    state.bankroll -= hand.bet;
    hand.doubled = true;
    hand.cards.push(drawCard());
    const v = handValue(hand.cards);
    if (v.bust) hand.bust = true;
    hand.stood = true;
    renderAll();
    advanceHand();
  }

  function split() {
    if (state.phase !== 'playing') return;
    const hand = state.hands[state.active];
    if (!canSplit(hand) || state.hands.length >= 4) return;
    if (state.bankroll < hand.bet) return;
    state.bankroll -= hand.bet;

    const card2 = hand.cards.pop();
    const fromAces = hand.cards[0].rank === 'A';
    const newHand = {
      cards: [card2],
      bet: hand.bet,
      doubled: false,
      stood: false,
      bust: false,
      splitFromAces: fromAces,
    };
    hand.splitFromAces = fromAces;
    state.hands.splice(state.active + 1, 0, newHand);

    hand.cards.push(drawCard());
    newHand.cards.push(drawCard());

    if (fromAces) {
      // One card only on split aces
      hand.stood = true;
      newHand.stood = true;
      renderAll();
      // Move to dealer if all stood
      state.active = state.hands.length - 1;
      advanceHand();
      return;
    }
    renderAll();
    setMessage('Main séparée. Jouez la main active.', '');
  }

  function advanceHand() {
    let next = state.active + 1;
    while (next < state.hands.length && (state.hands[next].stood || state.hands[next].bust)) {
      next++;
    }
    if (next < state.hands.length) {
      state.active = next;
      renderAll();
      setMessage(`Main ${next + 1} — à vous.`, '');
      return;
    }
    // All player hands done
    const allBust = state.hands.every((h) => h.bust);
    if (allBust) {
      state.hideDealerHole = false;
      finishRound();
      return;
    }
    playDealer();
  }

  function playDealer() {
    state.phase = 'dealer';
    state.hideDealerHole = false;
    renderAll();
    setMessage('Le croupier joue…', '');

    const step = () => {
      if (dealerShouldHit(state.dealer)) {
        state.dealer.push(drawCard());
        renderAll();
        setTimeout(step, 450);
      } else {
        finishRound();
      }
    };
    setTimeout(step, 500);
  }

  function finishRound() {
    state.phase = 'settled';
    state.hideDealerHole = false;
    const messages = [];
    let netKind = 'push';
    let wins = 0, losses = 0, pushes = 0;

    state.hands.forEach((hand, i) => {
      const outcome = settleHand(hand.cards, state.dealer, hand.bet, hand.doubled);
      state.bankroll += outcome.payout;
      hand.settled = true;
      const label = state.hands.length > 1 ? `Main ${i + 1} : ` : '';
      messages.push(label + outcome.message);
      if (outcome.result === 'win' || outcome.result === 'blackjack') wins++;
      else if (outcome.result === 'lose') losses++;
      else pushes++;
    });

    if (wins && !losses) netKind = 'win';
    else if (losses && !wins) netKind = 'lose';
    else if (wins && losses) netKind = '';
    else netKind = 'push';

    setMessage(messages.join(' '), netKind);
    state.phase = 'betting';
    state.pendingBet = 0;
    renderAll();

    if (state.bankroll <= 0) {
      setMessage('Banque à sec ! Cliquez « Nouvelle partie » pour recommencer.', 'lose');
    } else {
      // keep result message; hint below via pending
    }
  }

  function newGame() {
    state.shoe = createShoe();
    state.bankroll = STARTING_BANKROLL;
    state.pendingBet = 0;
    state.phase = 'betting';
    state.dealer = [];
    state.hands = [];
    state.active = 0;
    state.hideDealerHole = true;
    setMessage('Nouvelle partie — placez vos jetons.', '');
    renderAll();
  }

  // Chips
  CHIP_VALUES.forEach((v, i) => {
    const colors = ['red', 'blue', 'green', 'black', 'purple'];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chip ${colors[i]}`;
    btn.dataset.value = String(v);
    btn.textContent = v;
    btn.setAttribute('aria-label', `Jeton de ${v}`);
    btn.addEventListener('click', () => addChip(v));
    el.chipRow.appendChild(btn);
  });

  el.btnDeal.addEventListener('click', deal);
  el.btnHit.addEventListener('click', hit);
  el.btnStand.addEventListener('click', stand);
  el.btnDouble.addEventListener('click', doubleDown);
  el.btnSplit.addEventListener('click', split);
  el.btnClear.addEventListener('click', clearBet);
  el.btnNew.addEventListener('click', newGame);

  setMessage('Placez vos jetons, puis Distribuer.', '');
  renderAll();
})();
