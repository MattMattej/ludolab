# Rulebook language overview

Rulebook is the planned plain-text language for describing turn-based tabletop
games. This document defines the direction and examples only: **Chapter 1 does
not include a lexer, parser, compiler, editor, or executable `.rules` files.**
The first games are implemented by hand in TypeScript and share the
[`GameModule` and `Scene` contract](../PLAN.md#8-contrato-central-gamemodule-y-scene).

## Design principles

- Rules are the source of truth for rendering, legal moves, bots, and analysis.
- A game should be playable and legible without writing UI code.
- Seeds make setups, simulations, and replays reproducible.
- Hidden information is enforced by observations; a player's view must not
  disclose another player's private information.
- Diagnostics will include stable codes, exact locations, explanations, and
  suggestions.
- New language features are introduced only when a reference game needs them.

## Core concepts

| Concept | Purpose |
| --- | --- |
| `game`, `players`, `teams` | Declare the game and its seats. |
| `board` | Choose a grid, hex, track, pits, or graph geometry. |
| `piece`, `card`, `dice`, `deck`, `zone` | Define components and their containers. |
| `state`, `const`, `derive` | Store or calculate game values. |
| `setup`, `turns`, `phase` | Prepare a match and define turn order. |
| `action` | Declare a legal move, its parameters, and effects. |
| `ask` | Pause an action for a choice within a turn. |
| `end when` | Define win, loss, draw, or ranking conditions. |
| `look` | Optionally customize how components appear. |
| `variant`, `heuristic`, `strategy` | Describe later extensions; not in Chapter 1. |

## Tic-tac-toe

```rules
game "Tatetí" {
  players 2
  board grid 3x3
  piece Mark { owner: player }

  turns alternate

  action place(c: cell of board) when empty(c) {
    put Mark(owner: current) at c
  }

  end when line(board, length: 3, owner: last_player) { win last_player }
  end when full(board) { draw }

  look {
    board { style: "paper" }
    Mark  { shape: if owner == 0 then "cross" else "circle" }
  }
}
```

## Crazy Eights: hidden zones and a choice within a turn

```rules
game "Ocho loco" {
  players 2..5
  deck standard52

  zone stock: shared stack hidden = standard52
  zone hand:  per player fan visible to owner
  zone pile:  shared stack public

  state { suit_in_play: Suit }

  setup {
    shuffle stock
    deal 5 from stock to hand of each player
    move top of stock to pile
    suit_in_play = top(pile).suit
  }

  turns clockwise

  derive playable(c: Card): bool =
    c.rank == 8 or c.suit == suit_in_play or c.rank == top(pile).rank

  action play(c: Card in hand[current]) when playable(c) {
    move c to pile
    suit_in_play = c.suit
    if c.rank == 8 {
      ask current choose_suit(s: Suit) { suit_in_play = s }
    }
  }

  action draw() when not any(hand[current], playable) and not empty(stock) {
    move top of stock to hand[current]
  }

  end when empty(hand[last_player]) { win last_player }
}
```

## An original market game with cards from a spreadsheet

```rules
game "Mercaderes" {
  players 2..4

  card Goods from "cards/goods.csv" {
    name: string, cost: 1..6, value: int, art: image?
  }
  zone market: shared row public
  zone deck:   shared stack hidden = all Goods
  zone stall:  per player row public

  state { per player coins: int = 5 }

  setup { shuffle deck; deal 4 from deck to market }

  turns clockwise

  action buy(g: Goods in market) when coins[current] >= g.cost {
    coins[current] -= g.cost
    move g to stall[current]
    move top of deck to market
  }
  action rest() { coins[current] += 2 }

  end when empty(deck) {
    rank players by sum(stall[p], g => g.value) desc
  }

  look {
    Goods { template: "classic", title: name, corner: cost, body: "+{value}", image: art }
    counter coins { icon: "coin" }
  }
}
```

These snippets illustrate intended syntax, not a grammar or implementation
promise beyond the scope in [`PLAN.md`](../PLAN.md).
