# Ember Court

[![make.fun competition](https://make.fun/badge/competition/best-card-game-20261122-1826)](https://make.fun/c/best-card-game-20261122-1826)
[![make.fun rank](https://make.fun/badge/rank/best-card-game-20261122-1826/muhamadfajar160299-ctrl/makefun-best-card-game)](https://make.fun/c/best-card-game-20261122-1826)
[![make.fun reward](https://make.fun/badge/reward/best-card-game-20261122-1826)](https://make.fun/c/best-card-game-20261122-1826)

An original card battler built for the [make.fun "Make the best card game" bounty](https://make.fun/c/best-card-game-20261122-1826) ($50 prize).

## The game

Spend mana to play creatures and spells. Your creatures strike the enemy
across from them — or the enemy hero when the way is clear. First hero to
fall from 25 life to 0 loses the court.

- **Mana:** starts at 1, grows by 1 each turn up to 10, refills every turn.
- **Hand:** 4 cards to start, draw 1 each turn, max 7 in hand. 20-card deck.
- **Board:** up to 5 creatures a side. Creatures attack when you end your turn.
- **Spells:** Ember Bolt (3 damage to the enemy hero), Mend (restore 5 life),
  Rally (draw 2 cards).
- **Enemy:** an AI that plays its creatures first, then its spells, then attacks.

All art is drawn in code — gradients, shapes and text symbols. No external
images, no network. Mouse and keyboard (Enter to start / end turn, keys 1–7
to play a card).

## Play it

Serve `game/` with any static server and open `index.html`. Fixed screenshot
states are available with `?shot=start|play|win|loss`.

## Hand-in

`main.ts` copies `game/` and `screenshots/` into the output directory and
writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
