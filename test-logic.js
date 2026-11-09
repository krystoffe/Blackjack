/**
 * Tests Node pour la logique Blackjack (sans DOM).
 * Lance : node test-logic.js
 */
const assert = require('assert');
const path = require('path');

// Charger game.js en mode module (document absent → pas d'UI)
const Logic = require(path.join(__dirname, 'game.js'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓', name);
  } catch (e) {
    failed++;
    console.error('  ✗', name);
    console.error('   ', e.message);
  }
}

function card(rank, suit = '♠') {
  const map = { A: 11, J: 10, Q: 10, K: 10 };
  const value = map[rank] || Number(rank);
  const color = suit === '♥' || suit === '♦' ? 'red' : 'black';
  return { rank, value, suit, color, id: rank + suit };
}

console.log('Tests Blackjack\n');

test('as + 9 = 20 souple', () => {
  const v = Logic.handValue([card('A'), card('9')]);
  assert.strictEqual(v.total, 20);
  assert.strictEqual(v.soft, true);
  assert.strictEqual(v.bust, false);
});

test('as + as = 12 souple', () => {
  const v = Logic.handValue([card('A'), card('A')]);
  assert.strictEqual(v.total, 12);
  assert.strictEqual(v.soft, true);
});

test('as + 6 + 10 = 17 dur', () => {
  const v = Logic.handValue([card('A'), card('6'), card('10')]);
  assert.strictEqual(v.total, 17);
  assert.strictEqual(v.soft, false);
});

test('bust 22', () => {
  const v = Logic.handValue([card('K'), card('Q'), card('2')]);
  assert.strictEqual(v.total, 22);
  assert.strictEqual(v.bust, true);
});

test('blackjack A+K', () => {
  assert.strictEqual(Logic.isBlackjack([card('A'), card('K')]), true);
});

test('21 en 3 cartes n’est pas blackjack', () => {
  assert.strictEqual(Logic.isBlackjack([card('7'), card('7'), card('7')]), false);
});

test('séparer paires de même valeur (10+J)', () => {
  assert.strictEqual(Logic.canSplit({ cards: [card('10'), card('J')] }), true);
});

test('ne pas séparer 10+9', () => {
  assert.strictEqual(Logic.canSplit({ cards: [card('10'), card('9')] }), false);
});

test('croupier tire sur 16', () => {
  assert.strictEqual(Logic.dealerShouldHit([card('10'), card('6')]), true);
});

test('croupier reste sur 17 dur', () => {
  assert.strictEqual(Logic.dealerShouldHit([card('10'), card('7')]), false);
});

test('croupier reste sur soft 17 (A+6)', () => {
  assert.strictEqual(Logic.dealerShouldHit([card('A'), card('6')]), false);
});

test('croupier reste sur 18 souple', () => {
  assert.strictEqual(Logic.dealerShouldHit([card('A'), card('7')]), false);
});

test('paiement blackjack 3:2 (mise 100 → 250)', () => {
  const s = Logic.settleHand([card('A'), card('K')], [card('10'), card('9')], 100, false);
  assert.strictEqual(s.result, 'blackjack');
  assert.strictEqual(s.payout, 250);
});

test('victoire normale 1:1 (mise 50 → 100)', () => {
  const s = Logic.settleHand([card('10'), card('9')], [card('10'), card('8')], 50, false);
  assert.strictEqual(s.result, 'win');
  assert.strictEqual(s.payout, 100);
});

test('égalité (push) rend la mise', () => {
  const s = Logic.settleHand([card('10'), card('9')], [card('K'), card('9')], 40, false);
  assert.strictEqual(s.result, 'push');
  assert.strictEqual(s.payout, 40);
});

test('bust joueur = perte', () => {
  const s = Logic.settleHand([card('K'), card('Q'), card('5')], [card('10'), card('7')], 20, false);
  assert.strictEqual(s.result, 'lose');
  assert.strictEqual(s.payout, 0);
});

test('croupier bust = gain', () => {
  const s = Logic.settleHand([card('10'), card('8')], [card('10'), card('6'), card('8')], 30, false);
  assert.strictEqual(s.result, 'win');
  assert.strictEqual(s.payout, 60);
});

test('doubler : gain sur mise doublée', () => {
  const s = Logic.settleHand([card('10'), card('9'), card('2')], [card('10'), card('8')], 25, true);
  assert.strictEqual(s.result, 'win');
  assert.strictEqual(s.payout, 100); // stake 50 * 2
});

test('deux blackjacks = push', () => {
  const s = Logic.settleHand([card('A'), card('Q')], [card('A'), card('K')], 100, false);
  assert.strictEqual(s.result, 'push');
  assert.strictEqual(s.payout, 100);
});

test('sabot 6 jeux = 312 cartes', () => {
  const shoe = Logic.createShoe(6);
  assert.strictEqual(shoe.length, 312);
});

console.log(`\nRésultat : ${passed} réussis, ${failed} échoués`);
process.exit(failed ? 1 : 0);
