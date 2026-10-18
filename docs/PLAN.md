# Tabletest — Plan técnico de desarrollo

> **Documento:** Plan técnico maestro · **Versión:** 2.0 · **Estado:** aprobado para el Capítulo 1
> **Autor y dueño único:** Mateo Casciotti · **Licencia:** MIT
> **Nombres:** *Tabletest* (la herramienta, nombre provisional) y *Rulebook* (el lenguaje de reglas, con archivos `.rules`)

---

## Índice

1. Resumen ejecutivo
2. El problema y para quién es
3. Estado del arte y diferenciación
4. Alcance: qué sí y qué no
5. Principios de diseño
6. Experiencia de uso: del juego en la cabeza al reporte
7. Arquitectura general
8. Contrato central: `GameModule` y `Scene`
9. El lenguaje Rulebook
10. Compilador
11. Motor de ejecución
12. Información oculta
13. Capa visual: cualquier juego, dibujado y animado automáticamente
14. Crear juegos de forma fácil y dinámica
15. Bots (jugadores simulados)
16. Simulación masiva y reproducibilidad
17. Análisis: detectores de reglas rotas
18. Variantes, ablación y barridos
19. Reporte de calidad
20. Línea de comandos (CLI)
21. Escalera de juegos de referencia
22. Estructura del repositorio
23. Herramientas y convenciones
24. Estrategia de pruebas
25. Objetivos de rendimiento
26. Hoja de ruta por fases
27. Riesgos y mitigaciones
28. **Capítulo 1: lo que se construye antes de postular**
29. Instrucciones para el agente de desarrollo

---

## 1. Resumen ejecutivo

**Tabletest es un banco de pruebas para juegos de mesa.** Cualquier persona describe las reglas de un juego, existente o inventado, en un lenguaje simple (Rulebook), y Tabletest:

1. **Lo valida como un compilador**: errores claros, con ubicación exacta y sugerencias.
2. **Lo dibuja y lo vuelve jugable al instante**: tablero, cartas, fichas, dados y manos aparecen en pantalla y se animan solos, sin escribir código gráfico. Se puede jugar contra bots o mirar cómo juegan entre ellos.
3. **Simula miles de partidas** con bots de distinta habilidad.
4. **Diagnostica qué está roto**, con evidencia estadística y una partida concreta que lo demuestra: ventaja del primer jugador, estrategias dominantes, cartas inútiles o demasiado fuertes, partidas que no terminan o se trancan, decisiones falsas, peso del azar contra la habilidad, ventaja temprana que decide todo.
5. **Compara versiones de las reglas** ("¿y si esta carta costara 2?") y hace **ablación automática** de cada carta y acción.

Funciona desde juegos mínimos (tatetí, Nim) hasta complejos (Corazones a 4 jugadores, Backgammon, damas con capturas encadenadas y juegos originales con mercado y recursos). Todo corre en el navegador, sin servidor y sin cuentas.

**Stack:** TypeScript de punta a punta, en un monorepo pnpm. Node.js para la CLI y la simulación; React + SVG para la capa visual.

---

## 2. El problema y para quién es

**El problema.** Testear un juego de mesa es manual, lento y caro: armar prototipos de papel, juntar gente y jugar decenas de partidas. Los defectos estructurales (el que empieza gana, una carta rompe el juego, otra no sirve, el juego se tranca) aparecen tarde, muchas veces después de imprimir. Las herramientas digitales actuales permiten mover piezas en una mesa virtual, pero no entienden las reglas, así que no pueden probarlas.

**Para quién es:**

| Persona | Qué quiere |
|---|---|
| Diseñador independiente de juegos | Encontrar defectos antes de imprimir; comparar versiones de sus reglas |
| Jugador o grupo que inventa variantes caseras | Saber si su "regla de la casa" arruina o mejora el juego |
| Docente de diseño de juegos o de programación | Un lenguaje legible y visual para enseñar sistemas de reglas |
| Desarrollador de juegos digitales por turnos | Un motor de reglas verificable con una vista lista para usar |

**Propuesta de valor:** *"Escribí tus reglas en una página. Al instante lo ves en pantalla y lo jugás. Un minuto después sabés qué está roto, por qué y en qué partida pasa."*

---

## 3. Estado del arte y diferenciación

| Herramienta | Qué hace | Qué le falta respecto a Tabletest |
|---|---|---|
| **Tabletop Simulator, Tabletopia** | Mesas virtuales para mover componentes | No entienden las reglas: no validan, no simulan, no analizan |
| **Ludii** | Sistema general de juegos académico, con lenguaje propio | Enfocado en investigación; no ofrece diagnóstico práctico, comparación de variantes ni flujo de diseño |
| **boardgame.io** | Framework JS para juegos por turnos | Las reglas se escriben en JavaScript y la interfaz se programa a mano; sin análisis de balance |
| **OpenSpiel** | Colección de juegos para investigación | Orientado a aprendizaje automático; nada para diseñadores |
| **Machinations** | Diagramas de economía de juegos | Modela flujos de recursos, no reglas jugables completas |

**Diferenciadores:**

1. **Reglas → vista jugable → diagnóstico** en una sola herramienta.
2. **Visual automático:** la interfaz sale de las reglas, no se programa.
3. **Diagnóstico con evidencia** pensado para diseñadores, no para investigadores.
4. **Variantes y ablación** como funciones centrales.
5. **Sin servidor, sin cuentas, MIT.**

> Antes de la versión 1.0 hay que revisar el estado actualizado de cada herramienta y actualizar esta tabla.

---

## 4. Alcance: qué sí y qué no

### Sí (v1.0)

- Juegos **por turnos** de **1 a 6 jugadores**, con soporte de **equipos**.
- **Tableros:** grilla cuadrada, hexagonal, recorrido (track), pozos (tipo mancala) y grafo libre (mapas de nodos y conexiones).
- **Componentes:** cartas, fichas, piezas, dados, contadores y recursos.
- **Azar** (barajar, robar, tirar dados) e **información oculta** (manos privadas, cartas boca abajo, dados tapados).
- **Decisiones dentro del turno**: elegir un palo después de jugar, aceptar o rechazar una apuesta, capturas encadenadas.
- **Vista visual automática**, jugable en el navegador, contra bots o en modo *hot-seat* (varias personas en la misma pantalla).
- Simulación reproducible, análisis estadístico y reporte visual.
- CLI, editor web y extensión de VS Code.

### No (explícito)

- Juegos en tiempo real o de destreza física.
- Movimientos simultáneos (se evalúa después de 1.0).
- **Aprendizaje automático de cualquier tipo.** Los bots usan reglas escritas a mano y búsqueda clásica (Monte Carlo); no entrenan modelos.
- Cuentas, servidores con datos de usuarios, telemetría o multijugador en línea. **El proyecto no procesa datos personales.**
- Incluir juegos comerciales con derechos de autor. Los ejemplos son juegos tradicionales de dominio público u originales.

---

## 5. Principios de diseño

1. **Las reglas son la única fuente de verdad.** La vista, los bots y el análisis se derivan de ellas. Nunca hay que describir el juego dos veces.
2. **Visual por defecto, personalizable después.** Un juego sin ninguna indicación visual igual se ve bien y es jugable; el bloque `look` solo lo embellece.
3. **Determinismo total.** Cada partida se reproduce exactamente a partir de *(reglas, versión, variante, semilla)*.
4. **La información oculta se impone por la API.** Ni los bots ni la vista de un jugador pueden acceder a lo que ese jugador no ve.
5. **Errores de primera clase.** Código, ubicación, explicación y sugerencia en cada error.
6. **Hallazgos con evidencia.** Ningún diagnóstico sin intervalo de confianza, tamaño de muestra y partida de ejemplo.
7. **Un núcleo, muchas caras.** El mismo compilador y motor corren en la CLI, el navegador, VS Code y los workers.
8. **El lenguaje crece por ejemplos.** Cada construcción nueva se justifica con un juego de la escalera de referencia (sección 21).

---

## 6. Experiencia de uso: del juego en la cabeza al reporte

```
 ① Crear           ② Ver y jugar          ③ Simular             ④ Diagnosticar         ⑤ Iterar
 ───────────       ──────────────         ─────────────         ──────────────         ──────────
 Plantilla o       La mesa aparece        10.000 partidas        Reporte con           Variante "B",
 reglas desde      sola. Jugás contra     entre bots, en         hallazgos, mapas      se compara con
 cero; cartas      bots o mirás una       segundos, con          de calor y            "A" lado a lado
 desde CSV         partida bot vs bot     barra de progreso      partidas ejemplo
```

**Escenario típico:** una diseñadora tiene un juego de cartas con 30 cartas en una planilla. Elige la plantilla "juego de cartas", pega la planilla y escribe tres acciones. La mesa aparece con el mazo, las manos y la zona de juego. Juega dos partidas contra un bot para sentirlo y aprieta **Analizar**. El reporte le dice que el primer jugador gana el 58% de las veces y que la carta "Tormenta" decide el 31% de las partidas, y le muestra una partida concreta donde pasa. Crea la variante "Tormenta cuesta 4", compara, y el desbalance baja al 51%.

---

## 7. Arquitectura general

```
                              archivo .rules  (+ cartas.csv, imágenes opcionales)
                                    │
             ┌──────────────────────┴───────────────────────┐
             ▼                                              │
  ┌──────────────────────┐   IR tipado    ┌─────────────────┴────┐
  │ lang: lexer, parser, │ ─────────────▶ │ compiler: checker,   │
  │ AST, diagnósticos    │                │ IR, closures         │
  └──────────────────────┘                └──────────┬───────────┘
                                                     │ implementa
                                                     ▼
                                       ┌───────────────────────────┐
              juegos escritos  ───────▶│  GameModule (contrato)    │◀──── mismo contrato
              a mano en TS             │  reglas + scene()         │
                                       └──┬──────────┬──────────┬──┘
                       observación +      │          │ Scene    │ registros
                       jugadas legales    ▼          ▼          ▼
                              ┌────────────────┐ ┌─────────┐ ┌────────────────────┐
                              │ players (bots) │ │ render  │ │ sim → analysis →   │
                              └────────────────┘ │ (React/ │ │ report             │
                                                 │  SVG)   │ └────────────────────┘
                                                 └────┬────┘
                                                      ▼
                                       apps/web · apps/vscode · cli (vista ASCII)
```

### Paquetes

| Paquete | Responsabilidad | Depende de |
|---|---|---|
| `@tabletest/core` | Contratos `GameModule` y `Scene`, RNG, hash, utilidades | — |
| `@tabletest/lang` | Lexer, parser, AST, diagnósticos, formateador | core |
| `@tabletest/compiler` | Checker, IR, compilación a `GameModule`, derivación de `Scene` | core, lang |
| `@tabletest/players` | Bots | core |
| `@tabletest/sim` | Partidas, pool de workers, registros, replay | core, players |
| `@tabletest/analysis` | Métricas, estadística, detectores, ablación | core, sim |
| `@tabletest/render` | Componentes React que dibujan cualquier `Scene`, animaciones e interacción | core |
| `@tabletest/report` | Reporte HTML autocontenido | analysis |
| `@tabletest/games` | Juegos de referencia en TS y en `.rules` | core |
| `@tabletest/cli` | Comando `tabletest`, con vista ASCII para jugar en la terminal | todos menos render |
| `apps/web` | Editor y mesa web | todos menos cli |
| `apps/vscode` | Extensión y servidor de lenguaje | lang, compiler |

**Regla de dependencias:** `core` no importa nada interno; nadie importa de `cli` ni de `apps/*`; `render` no conoce el lenguaje (solo dibuja `Scene`). Se verifica en CI.

---

## 8. Contrato central: `GameModule` y `Scene`

Es la decisión de arquitectura más importante. **Todo juego, escrito a mano en TS o compilado desde Rulebook, implementa el mismo contrato, que incluye cómo se ve.** Eso permite:

- construir motor, bots, simulador y **visor** antes que el lenguaje (Capítulo 1);
- hacer **pruebas diferenciales** entre la versión en TS y la versión en `.rules` de un mismo juego;
- que la capa visual funcione con **cualquier** juego sin código específico.

### 8.1 Reglas

```ts
export type PlayerId = number;                 // 0..players-1
export type Seed = string;
export type Viewer = PlayerId | "spectator" | "omniscient";

export interface GameMeta {
  readonly id: string;                         // "tictactoe"
  readonly name: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly variants: readonly string[];
}

export interface SetupOptions {
  readonly players: number;
  readonly seed: Seed;
  readonly variant?: string;
}

export interface Outcome {
  readonly payoffs: readonly number[];         // por jugador, en [0, 1]
  readonly ranking: readonly (readonly PlayerId[])[];
  readonly reason: string;                     // "tres en línea", "mazo agotado"
}

export interface GameModule<S, M, O> {
  readonly meta: GameMeta;

  setup(opts: SetupOptions): S;                // el RNG con semilla vive dentro de S
  toAct(state: S): PlayerId | null;            // null: terminada
  legalMoves(state: S): readonly M[];          // orden determinista
  apply(state: S, move: M): void;              // MUTA el estado (rendimiento)
  isTerminal(state: S): boolean;
  outcome(state: S): Outcome;

  observe(state: S, player: PlayerId): O;      // nunca incluye lo oculto para ese jugador
  determinize(obs: O, player: PlayerId, seed: Seed): S;

  clone(state: S): S;
  hash(state: S): string;
  moveKey(move: M): string;                    // id estable y serializable
  describeMove(move: M): string;               // "Coloca X en B2"

  // ── Vista ──
  scene(state: S, viewer: Viewer): Scene;      // respeta la visibilidad de viewer
  moveAnchors(move: M): readonly NodeId[];     // nodos que el usuario toca para hacer la jugada, en orden
}
```

**Decisiones y por qué:**

- **`apply` muta.** Las simulaciones aplican millones de jugadas; la inmutabilidad multiplicaría la basura en memoria. `clone()` es explícito y está testeado.
- **El RNG vive dentro del estado.** Clonar el estado clona el azar, así que replay y búsqueda son deterministas.
- **`payoffs` en [0,1]** unifica victoria, empate, equipos y puntajes en una sola métrica.
- **`scene` recibe un `Viewer`.** La misma partida se ve distinta para cada jugador (su mano boca arriba, las demás boca abajo); `omniscient` muestra todo para depurar y ver repeticiones.
- **`moveAnchors`** convierte cualquier jugada en una secuencia de clics: el tatetí tiene un ancla (la celda), las damas dos (la pieza y el destino) y una carta con elección de palo tiene dos (la carta y el palo). La interfaz arma sola un **árbol de selección** sobre las jugadas legales, sin código específico de cada juego.

### 8.2 Escena

La escena es una **descripción declarativa y plana** de lo que hay en la mesa. El renderizador la dibuja y anima las diferencias entre una escena y la siguiente.

```ts
export type NodeId = string;                   // ESTABLE entre escenas: la misma carta conserva su id

export interface Scene {
  readonly seats: readonly SeatInfo[];         // nombre, color y si es su turno
  readonly nodes: readonly SceneNode[];
  readonly status?: string;                    // "Turno de Ana · elegí un palo"
  readonly log?: readonly string[];            // últimas jugadas en texto
}

interface NodeBase {
  readonly id: NodeId;
  readonly parent: NodeId | "table" | `seat:${number}`;  // dónde está
  readonly order?: number;                     // posición dentro del padre
  readonly tags?: readonly string[];           // para estilos del bloque `look`
}

export type SceneNode =
  | (NodeBase & { kind: "board"; layout: BoardLayout; style?: string })
  | (NodeBase & { kind: "slot"; coord: string; label?: string })            // celda, casilla, pozo
  | (NodeBase & { kind: "zone"; arrangement: "stack" | "fan" | "row" | "grid" | "spread";
                  label?: string; hiddenCount?: number })
  | (NodeBase & { kind: "card"; face: CardFace | null; template?: string })  // null = boca abajo
  | (NodeBase & { kind: "piece"; shape: PieceShape; color: string; label?: string; stack?: number })
  | (NodeBase & { kind: "die"; sides: number; value: number | null })        // null = tapado
  | (NodeBase & { kind: "counter"; label: string; value: number; icon?: string });

export type BoardLayout =
  | { type: "grid"; cols: number; rows: number; checkered?: boolean }
  | { type: "hex"; radius: number }
  | { type: "track"; length: number; path?: "line" | "loop" | "snake" | "u" }
  | { type: "pits"; rows: number; perRow: number; stores?: number }
  | { type: "graph"; nodes: readonly { id: string; x: number; y: number }[];
      edges: readonly [string, string][] };

export interface CardFace {
  readonly title?: string;
  readonly corner?: string;                    // costo, valor
  readonly body?: string;
  readonly suit?: string;
  readonly rank?: string;
  readonly color?: string;
  readonly image?: string;                     // referencia a un recurso local
}
```

**Por qué una escena plana con ids estables:** si la carta `c17` pasa de `zone:stock` a `zone:hand:0`, el renderizador detecta el cambio de padre y anima el vuelo de la carta. **Repartir, jugar, capturar y tirar dados se animan solos en cualquier juego**, sin escribir animaciones.

---

## 9. El lenguaje Rulebook

### 9.1 Decisiones de diseño

| Decisión | Elegido | Descartado | Motivo |
|---|---|---|---|
| Tipo | **Lenguaje externo** con sintaxis propia | DSL embebido en TS | Legible para no programadores, análisis estático completo, editable en la web |
| Estilo | **Declarativo arriba, imperativo acotado en los cuerpos** | Totalmente declarativo | Las reglas reales son secuencias ("mover, después robar") |
| Terminación | **Sin recursión ni `while`**; solo `for` sobre colecciones finitas | Lenguaje completo | Cada acción termina siempre; la no-terminación solo puede venir de la estructura del juego, que es justo lo que se analiza |
| Tipos | **Estáticos con inferencia local** | Dinámicos | Errores antes de jugar; autocompletado |
| Visibilidad | **Declarada en cada zona** | Implícita | `observe`, `determinize` y la vista por jugador se derivan solos |
| Vista | **Derivada de la estructura + bloque `look` opcional** | Interfaz programada | Jugable sin trabajo extra |

### 9.2 Conceptos

| Construcción | Para qué |
|---|---|
| `game`, `players 2..4`, `teams` | Raíz y jugadores |
| `board grid 8x8` / `hex 4` / `track 24` / `pits 2x6` / `graph { ... }` | Tableros con funciones de geometría incluidas (`adjacent`, `line`, `path`, `neighbors`, `distance`) |
| `piece` | Piezas con dueño y atributos |
| `dice` y `roll` | Dados con caras configurables |
| `enum`, `card` | Tipos de carta con atributos |
| `deck` | Mazos: estándar incluidos (`standard52`, `spanish40`), generados (`all Card`) o **desde CSV** |
| `zone` | Contenedores: dueño (`shared`, `per player`), forma (`stack`, `fan`, `row`, `set`) y visibilidad (`public`, `hidden`, `visible to owner`) |
| `state`, `per player`, `per team` | Variables del juego |
| `const`, `derive` | Constantes y valores calculados |
| `setup` | Preparación de la partida |
| `phase`, `turns` | Fases y orden de turnos (`alternate`, `clockwise`, `starting random`, turnos extra) |
| `action` | Jugada con parámetros tipados, condición `when` y cuerpo |
| `ask` | Decisión pendiente dentro de un turno (elegir palo, aceptar apuesta, seguir capturando) |
| `end when` | Fin y resultado (`win`, `lose`, `draw`, `rank players by`) |
| `heuristic` | Evaluación para el bot heurístico |
| `strategy` | Políticas con nombre escritas por el diseñador |
| `variant` | Versiones alternativas de las reglas |
| `look` | Personalización visual opcional |

### 9.3 Ejemplo: tatetí (tablero y patrones)

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

### 9.4 Ejemplo: Ocho loco (cartas, información oculta, decisión dentro del turno)

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

> Este ejemplo tiene un **defecto a propósito**: si el mazo se agota y nadie puede jugar, la partida se tranca. El detector D10 (*callejón sin salida*) lo encuentra y muestra la partida exacta. Es el tipo de error que Tabletest existe para detectar.

### 9.5 Ejemplo: juego original con cartas desde una planilla

```rules
game "Mercaderes" {
  players 2..4

  card Goods from "cards/goods.csv" {        // columnas: name, cost, value, copies, art
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

### 9.6 Gramática (extracto en EBNF)

```ebnf
file        = "game" STRING "{" { item } "}" ;
item        = players | teams | board | piece | dice | enum | card | deck | zone
            | state | const | derive | setup | phase | turns | action | end
            | heuristic | strategy | variant | look ;
board       = "board" ( "grid" INT "x" INT | "hex" INT | "track" INT
            | "pits" INT "x" INT | "graph" graphBody ) ;
card        = "card" IDENT [ "from" STRING ] "{" field { "," field } "}" ;
zone        = "zone" IDENT ":" owner shape visibility [ "=" expr ] ;
owner       = "shared" | "per" "player" | "per" "team" ;
shape       = "stack" | "fan" | "row" | "set" ;
visibility  = "public" | "hidden" | "visible" "to" "owner" ;
action      = "action" IDENT "(" [ params ] ")" [ "when" expr ] block ;
param       = IDENT ":" domain ;
domain      = range | "cell" "of" expr | "index" "of" expr | type "in" expr ;
stmt        = let | assign | if | for | move | put | shuffle | deal | roll
            | ask | win | lose | draw | rank | next_turn | goto_phase | expr ;
ask         = "ask" expr IDENT "(" [ params ] ")" block ;
look        = "look" "{" { selector "{" { prop } "}" } "}" ;
```

La gramática normativa vive en `docs/language/grammar.ebnf`, sincronizada con pruebas *golden* del parser.

### 9.7 Tipos

- Primitivos: `int`, `bool`, `string`; rangos como dominio (`1..6`).
- Del juego: `player`, `team`, `cell`, `enum`, `card` (registro inmutable), `piece`, `die`.
- Colecciones: `list<T>`, `set<T>`, `zone<T>` (con visibilidad).
- Inferencia local en `let` y lambdas; anotación obligatoria en `state` y en los parámetros de las acciones.
- Sin `null`: los accesos que pueden fallar requieren un guardia (`if not empty(stock)`) o dan error en el chequeo.

### 9.8 Diagnósticos

```
error[R0207]: `top(stock)` puede fallar porque `stock` puede estar vacío
  --> juegos/ocho.rules:31:5
   |
31 |     move top of stock to hand[current]
   |          ^^^^^^^^^^^^ falta comprobar que la zona tenga cartas
   |
   = ayuda: agregá `and not empty(stock)` a la condición `when` de la acción
```

Familias de códigos: `R00xx` sintaxis, `R02xx` nombres y tipos, `R03xx` semántica del juego (fin inalcanzable, acción imposible, zona sin uso), `R04xx` vista (`look` inválido), y `Wxxxx` para advertencias. Catálogo en `docs/language/diagnostics.md`. Los mensajes van en español e inglés.

---

## 10. Compilador

1. **Lexer** escrito a mano, con posiciones exactas e identificadores Unicode (nombres con tildes).
2. **Parser**: descenso recursivo más Pratt para las expresiones, con **recuperación de errores** (tokens de sincronización), para informar varios errores y seguir mostrando la mesa mientras se escribe.
3. **AST** tipado (uniones discriminadas) con *spans* en todos los nodos.
4. **Checker**, en pasadas: símbolos → nombres → tipos → semántica (visibilidad, fin alcanzable, jugadas iniciales posibles, `ask` bien formados) → variantes como capas sobre la base → validación de `look`.
5. **Carga de recursos:** los CSV se parsean con verificación de tipos por columna (error con fila y columna) y las imágenes se referencian por ruta relativa.
6. **IR** con slots numéricos resueltos y dominios normalizados.
7. **Compilación a closures:** cada nodo del IR pasa a ser una función JS enlazada. Es rápido, no usa `eval` y es compatible con CSP estricta.
8. **Derivación de la escena:** a partir de tableros, zonas, piezas, dados y contadores se genera `scene()` y `moveAnchors()` automáticamente, aplicando el bloque `look` por encima.
9. **Formateador** canónico e idempotente.

---

## 11. Motor de ejecución

- **Estado plano:** cada componente (carta, pieza o dado) es un entero que indexa una tabla inmutable; las zonas y las celdas son arreglos de enteros y las variables van en slots. `clone` es una copia de arreglos y `hash` es estable.
- **RNG:** `sfc32` sembrado vía `splitmix32` a partir del hash de la semilla. Vive dentro del estado.
- **Generación de jugadas:** enumeración determinista de dominios, incluidos los parámetros dependientes, filtrada por `when`.
- **Pila de decisiones** para `ask`: cambia quién decide y qué puede elegir, y al resolverse continúa el flujo. Modela elegir un palo, aceptar o rechazar, capturas encadenadas y respuestas a apuestas.
- **Geometría de tableros:** utilidades precalculadas (vecinos, líneas, recorridos, distancias) por tipo de tablero.
- **Fin, tope y ciclos:** se evalúa `end when` después de cada jugada; hay un tope de jugadas configurable, detección de ciclos por hash (estado repetido K veces → `stalled`) y detección de **callejón sin salida** (nadie puede jugar y la partida no terminó → `deadlock`).
- **Modo depuración:** verificación de invariantes después de cada jugada (conservación de componentes, rangos de las variables).

---

## 12. Información oculta

- `observe` y `scene(viewer)` se derivan de la visibilidad de las zonas: lo `hidden` muestra solo cuántos elementos hay, lo `visible to owner` solo se ve para su dueño, y los dados tapados muestran `value: null`.
- **Memoria pública:** las cartas reveladas quedan registradas y no se reinventan al determinizar.
- `determinize`: reparte al azar lo desconocido respetando tamaños y lo ya revelado. Limitación documentada: no infiere qué tiene el rival a partir de sus jugadas.
- **Garantías:** los bots reciben `Observation`, nunca `State` (lo impone el tipo); hay pruebas automáticas de que ni `observe` ni `scene(p)` filtran información oculta para `p`.

---

## 13. Capa visual: cualquier juego, dibujado y animado automáticamente

Esta capa es la que hace al proyecto **divertido, comprensible y fácil de mostrar**. Su meta es que el diseñador escriba reglas y vea su juego vivo en pantalla.

### 13.1 Arquitectura del renderizador

- **React + SVG** para tableros, piezas y dados (nítidos a cualquier tamaño y fáciles de estilizar); **HTML/CSS** para las cartas (texto, imágenes y plantillas).
- **Reconciliación por ids estables:** entre escena y escena, el renderizador calcula qué nodos aparecieron, cuáles desaparecieron y cuáles cambiaron de padre u orden, y anima cada caso con la técnica **FLIP** usando la Web Animations API.
- **Animaciones incluidas:** repartir (las cartas vuelan en secuencia), dar vuelta una carta, mover una pieza por el recorrido, capturar (la pieza sale de la mesa), tirar un dado (giro y resultado), cambio de turno (resalta el asiento activo) y sumar puntos (el contador "salta").
- **Velocidad:** 0,25× a 8× y "instantáneo"; se respeta `prefers-reduced-motion`.

### 13.2 Disposición automática de la mesa

- **Asientos alrededor de la mesa** según la cantidad de jugadores (de 2 a 6): el jugador local abajo y los demás repartidos por los bordes.
- **Centro compartido:** tableros y zonas `shared`, organizados con un algoritmo de empaquetado simple con prioridades (tablero al centro, mazos a un costado, zona de descarte junto al mazo).
- **Zonas por jugador** frente a su asiento: las manos en abanico y las zonas públicas en fila.
- **Adaptable:** en pantallas angostas, los asientos rivales se compactan en una franja superior con conteos y las manos se pueden desplazar.

### 13.3 Estilos y plantillas

- **Temas incluidos:** "Mesa de madera", "Papel" (estilo prototipo), "Fieltro", "Noche" (oscuro) y "Neón".
- **Colores de jugador** de una paleta apta para daltonismo; además de color, cada jugador tiene una **forma** distinta, así que nunca se depende solo del color.
- **Plantillas de carta:** `classic` (título, costo en la esquina, texto e imagen), `minimal` (solo texto grande), `standard` (palos y números de baraja francesa) y `spanish` (baraja española).
- **Bloque `look`:** selectores por tipo, por etiqueta o por condición (`Card where rank == 8 { glow: true }`).
- **Imágenes propias:** el diseñador carga sus ilustraciones; quedan en su navegador y no se suben a ningún servidor.

### 13.4 Interacción

- **Jugadas legales resaltadas:** al pasar el mouse, se iluminan las piezas o cartas que se pueden usar.
- **Árbol de selección por anclas** (sección 8.1): clic en una pieza → se iluminan los destinos válidos → clic en un destino. Funciona igual con arrastrar y soltar.
- **Decisiones con `ask`:** aparece un selector contextual (por ejemplo, los cuatro palos como botones grandes).
- **Modos de juego:**
  - **Contra bots**, eligiendo el nivel (aleatorio, heurístico, Monte Carlo, experto).
  - **Hot-seat:** varias personas en la misma pantalla, con una "cortina" entre turnos para no ver la mano ajena.
  - **Espectador:** bot contra bot a la velocidad elegida.
  - **Repetición:** línea de tiempo con avance, retroceso y salto a cualquier jugada; vista omnisciente opcional.
- **"¿Por qué jugó eso?":** en partidas con bots de búsqueda, un panel muestra las jugadas consideradas con su valor estimado y cantidad de simulaciones, como barras sobre la mesa. Educativo y llamativo.
- **Deshacer** en partidas de prueba.

### 13.5 Capas de análisis sobre la mesa

- **Mapas de calor** sobre el tablero: dónde se juega más y qué casillas se asocian con ganar.
- **Insignias en cartas:** después del análisis, cada carta muestra su "impacto" (ablación) con colores: inútil, equilibrada o dominante.
- **Partida ejemplo de cada hallazgo:** un clic en un hallazgo del reporte abre la repetición en el momento exacto del problema.

### 13.6 Imprimir y jugar

- Exportación de cartas, tablero y fichas a hojas **A4/Carta con marcas de corte**, mediante CSS de impresión del navegador → PDF. Así el diseñador pasa directo a probar con gente en una mesa real.

### 13.7 Accesibilidad

- Todo se puede jugar con teclado (Tab entre elementos jugables, Enter para elegir).
- Lista de jugadas legales y registro de la partida en texto, legibles por lectores de pantalla.
- Contraste AA en todos los temas.

### 13.8 Vista en la terminal

- La CLI (`tabletest play`) dibuja la misma `Scene` en ASCII o Unicode: grillas, manos como listas y dados como `⚃`. Es útil para jugar rápido y para pruebas automatizadas de la escena.

---

## 14. Crear juegos de forma fácil y dinámica

- **Asistente de nuevo juego** (en la web): se elige el tipo base, cantidad de jugadores y componentes, y genera un `.rules` inicial que ya funciona y se ve. Tipos base:
  - **Tablero de grilla** (estilo tatetí o damas),
  - **Recorrido con dados** (carreras),
  - **Juego de cartas con manos**,
  - **Mercado y recursos**,
  - **Pozos y semillas** (mancala),
  - **Mapa de nodos** (territorios conectados).
- **Vista previa en vivo:** cada cambio en las reglas recompila (con un retardo corto mientras se escribe) y redibuja la mesa. Si el cambio no altera la forma del estado, la partida en curso se conserva.
- **Cartas desde planillas:** pegar una tabla de Google Sheets o Excel, o cargar un CSV. Las columnas se mapean a atributos y una columna `copies` indica cuántas copias hay de cada carta.
- **Biblioteca estándar:** baraja francesa, baraja española, dados d4–d20, fichas genéricas y tableros clásicos (8×8 ajedrezado, hex de radio 4, recorrido de 24).
- **Fragmentos insertables:** "turno extra si...", "robar hasta tener N cartas", "seguir palo", "captura por salto"; se insertan con un clic y se adaptan.
- **Compartir sin servidor:** el juego completo (reglas + CSV) se comprime en el fragmento de la URL. Las imágenes grandes se exportan en un `.zip` aparte.
- **Galería de ejemplos:** todos los juegos de la escalera (sección 21) se abren y se juegan con un clic.

---

## 15. Bots (jugadores simulados)

> En toda la documentación pública se llaman **"bots"** o **"jugadores simulados"**. Son algoritmos clásicos, sin entrenamiento.

| Bot | Cómo decide | Rol en el análisis |
|---|---|---|
| `random` | Jugada legal al azar | Línea base; detecta jugadas que nunca son posibles |
| `heuristic` | Un paso adelante maximizando el bloque `heuristic` | Jugador "razonable" y barato |
| `flat-mc` | N partidas al azar por cada jugada; elige la de mejor promedio | Calidad media, muy paralelizable |
| `ismcts` | *Information Set MCTS* con determinización y UCT | El bot "experto"; mide cuánto importa la habilidad |
| `strategy:<nombre>` | Política escrita por el diseñador | Detectar estrategias dominantes |

```ts
export interface Player<O, M> {
  readonly id: string;
  choose(obs: O, legal: readonly M[], ctx: PlayerContext): M;   // ctx: rng, presupuesto
  explain?(): MoveExplanation;                                   // para el panel "¿por qué jugó eso?"
}
```

**Validación contra hechos conocidos:** en Nim [3,4,5] gana el primer jugador con juego perfecto; en tatetí, `ismcts` contra `ismcts` empata casi siempre; en Connect Four, el primer jugador tiene ventaja con buen juego.

---

## 16. Simulación masiva y reproducibilidad

- **Plan de simulación:** juego, variante, bots por asiento, cantidad de partidas y semilla base.
- **Semillas derivadas:** `seed_i = hash(seedBase, i)`; cada partida es independiente del orden de ejecución.
- **Rotación de asientos** en cada enfrentamiento, para separar el efecto del asiento del efecto de la estrategia.
- **Paralelismo:** `worker_threads` en Node y Web Workers en el navegador, detrás de una misma abstracción.
- **Parada temprana:** "simular hasta que el intervalo de confianza mida menos de ±1%".
- **Registros NDJSON** (una línea por partida); la lista completa de jugadas es opcional.
- **Replay** exacto desde la semilla, en la CLI o en la mesa visual.
- **Prueba de oro:** el mismo plan con 1, 2 y 8 workers da el mismo resultado agregado (mismo hash).

---

## 17. Análisis: detectores de reglas rotas

Cada hallazgo tiene una forma fija:

```ts
interface Finding {
  id: string;                                   // "seat-advantage"
  severity: "info" | "warning" | "critical";
  title: string;                                // texto claro, para humanos
  evidence: { metric: string; value: number; ci95: [number, number]; n: number };
  examples: { seed: Seed; atMove?: number }[];  // abren la repetición en el momento justo
  suggestion?: string;
}
```

| ID | Qué detecta | Método | Estadística |
|---|---|---|---|
| D1 `seat-advantage` | Ventaja del primer jugador o de un asiento | Tasa de victorias por asiento con bots idénticos | Intervalo de Wilson; chi-cuadrado si hay más de 2 asientos |
| D2 `dominant-strategy` | Una estrategia gana contra todas | Matriz de enfrentamientos entre estrategias y bots | Wilson por celda; dominancia con margen |
| D3 `dead-content` | Cartas o acciones nunca posibles, nunca elegidas o irrelevantes | Frecuencias más ablación | Δ de tasa de victoria con IC; prueba de equivalencia |
| D4 `overpowered-content` | Un componente decide demasiadas partidas | Victoria condicionada más ablación | IC del Δ; se informa como "asociación" salvo que la ablación lo confirme |
| D5 `non-termination` | Partidas que no terminan o repiten estados | Tope de jugadas y ciclos de hash | Proporción con IC |
| D6 `length-profile` | Partidas demasiado cortas, largas o variables | Distribución de largo | Cuantiles contra un rango objetivo opcional |
| D7 `false-choice` | Turnos con una sola opción real | % de turnos con 1 jugada; jugadas de valor indistinguible | Proporción con IC |
| D8 `skill-vs-luck` | El juego es casi todo azar (o casi todo cálculo) | `ismcts` contra `random`, `ismcts` contra `heuristic` | Tasa de victorias con IC |
| D9 `snowball` | Una ventaja temprana decide la partida | Predictibilidad del ganador según la ventaja en el turno t | Curva de exactitud por turno |
| D10 `deadlock` | Estados sin jugadas legales que no son finales | Detección en el motor | Proporción con IC y partida ejemplo |

**Rigor:** corrección por comparaciones múltiples (Benjamini–Hochberg, FDR 5%); umbrales configurables en `tabletest.config.json`; si algo no es concluyente, el reporte lo dice y sugiere cuántas partidas más correr.

---

## 18. Variantes, ablación y barridos

- **Variantes:** `variant` en el archivo; `tabletest compare` y la vista web "A contra B" muestran las métricas lado a lado con sus intervalos.
- **Ablación automática:** cada carta, acción o regla marcada como `ablatable` (o todas, con `--ablate all`) se neutraliza en una variante sintética y se mide el cambio. Es la base de D3 y D4, y pasa de "los que tienen X ganan más" a "sin X, el juego cambia así".
- **Barridos:** `--sweep "Goods.cost[Tormenta]=2..6"` grafica cómo cambia una métrica según un parámetro, para encontrar el valor equilibrado.

---

## 19. Reporte de calidad

- **En la web:** pestaña "Reporte" con resumen ("2 críticos, 3 advertencias, 4 OK"), tarjetas por hallazgo con evidencia, mini gráfico y botón "ver partida".
- **HTML autocontenido** (`tabletest report --html`): un solo archivo, sin dependencias externas, que se abre sin conexión y se comparte por mail o chat.
- **Gráficos** en SVG propio: barras con IC, histograma de largo, matriz de enfrentamientos, curva de *snowball*, mapa de calor del tablero e impacto por carta.
- **Bilingüe** (español e inglés) desde el inicio.

---

## 20. Línea de comandos (CLI)

```
tabletest new     <nombre> --template cards|grid|track|market|pits|graph
tabletest check   <archivo.rules>
tabletest fmt     <archivo.rules> [--write]
tabletest play    <juego> [--vs heuristic] [--seat 0]          # en la terminal
tabletest watch   <juego> --players ismcts,random [--speed 2]  # bots jugando, en la terminal
tabletest sim     <juego> --games 10000 --players random,random --seed abc [--workers 8]
tabletest analyze <juego> [--budget 2m] [--variant X] [--ablate all]
tabletest compare <juego> --variants base,B
tabletest report  <analysis.json> --html report.html
tabletest replay  <juego> --seed s [--step]
tabletest serve   [carpeta]                                     # abre la mesa web local con esos juegos
```

`<juego>` acepta un `.rules` o el id de un juego de referencia. Códigos de salida: `0` OK, `1` errores de compilación, `2` hallazgos críticos (útil para usar en CI) y `3` error interno.

---

## 21. Escalera de juegos de referencia

Todos los juegos son de dominio público u originales. Cada escalón obliga al lenguaje y a la vista a soportar algo nuevo; **ninguna construcción entra al lenguaje si no la pide un juego de esta lista.**

| # | Juego | Jugadores | Qué exige |
|---|---|---|---|
| 1 | **Nim** | 2 | Estado, acciones con parámetros dependientes |
| 2 | **Tatetí** | 2 | Tablero de grilla, patrones en línea, empate |
| 3 | **Cerdo** (*Pig*, dados) | 2–6 | Dados, azar, decisión de arriesgar o plantarse |
| 4 | **Conecta cuatro** | 2 | Gravedad por columnas, líneas de 4 |
| 5 | **Kalah** (mancala) | 2 | Tablero de pozos, siembra circular, turno extra, captura |
| 6 | **Ocho loco** | 2–5 | Mazo, manos ocultas, `ask` (elegir palo), callejón sin salida |
| 7 | **Dados mentirosos** (*Liar's Dice*) | 2–6 | Dados ocultos, apuestas crecientes, desafío |
| 8 | **Corazones** | 4 | Bazas, seguir palo, pase de cartas, puntaje acumulado |
| 9 | **Damas** | 2 | Movimiento diagonal, coronación, capturas encadenadas obligatorias |
| 10 | **Backgammon** | 2 | Recorrido, dos dados, golpe y barra, sacar fichas |
| 11 | **Mercaderes** (original) | 2–4 | Cartas desde CSV, mercado, recursos, imágenes propias; **con desbalances a propósito** para mostrar el análisis |
| 12 | **Territorios** (original) | 2–4 | Tablero de grafo (mapa), control de zonas, mayorías |
| ★ | Ajedrez | 2 | Meta opcional: prueba de fuego de expresividad (enroque, al paso, jaque) |

Además, `games/broken/` tiene **juegos rotos a propósito** (uno donde el primero siempre gana, uno con una carta inútil, uno que no termina, uno que se tranca), que funcionan como pruebas de los detectores.

---

## 22. Estructura del repositorio

```
tabletest/
├─ README.md
├─ LICENSE                       # MIT
├─ CLAUDE.md                     # instrucciones para asistentes de código
├─ package.json  pnpm-workspace.yaml  tsconfig.base.json  biome.json
├─ .github/workflows/ci.yml
├─ docs/
│  ├─ PLAN.md                    # este documento
│  ├─ adr/                       # decisiones de arquitectura (0001-gamemodule-and-scene.md, ...)
│  ├─ language/                  # overview.md, grammar.ebnf, diagnostics.md
│  └─ media/                     # capturas y GIF para el README
├─ packages/
│  ├─ core/       src/ test/
│  ├─ lang/       src/ test/     (fase 1)
│  ├─ compiler/   src/ test/     (fase 2)
│  ├─ players/    src/ test/
│  ├─ sim/        src/ test/
│  ├─ analysis/   src/ test/     (fase 8)
│  ├─ render/     src/ test/
│  ├─ report/     src/ test/     (fase 8)
│  ├─ games/      src/ (TS)  rules/ (.rules)  broken/  test/
│  └─ cli/        src/ test/
├─ apps/
│  ├─ web/                       # mesa y editor
│  └─ vscode/                    (fase 12)
└─ bench/
```

---

## 23. Herramientas y convenciones

| Área | Elección |
|---|---|
| Entorno | Node.js 22 LTS, pnpm 9, ES Modules |
| Lenguaje | TypeScript 5.x `strict`, con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` |
| Build | `tsc -b` con project references; `tsup` para el binario de la CLI; Vite para `apps/web` |
| Interfaz | React 18, SVG, CSS Modules, Web Animations API; CodeMirror 6 para el editor |
| Pruebas | Vitest, `fast-check` (propiedades) y Playwright (pruebas visuales y de punta a punta en la web) |
| Lint y formato | Biome |
| Benchmarks | tinybench en CI (alerta si algo empeora más de 15%) |
| CI | GitHub Actions: instalar → lint → typecheck → test → build web → bench (en `main`) |
| Despliegue | GitHub Pages para la web |
| Commits | Conventional Commits, chicos y frecuentes |
| Decisiones | ADR en `docs/adr/` |

---

## 24. Estrategia de pruebas

1. **Unitarias** por paquete.
2. **Golden tests** de parser, formateador y diagnósticos.
3. **Propiedades** (`fast-check`) para cualquier `GameModule`:
   - jugar al azar nunca lanza excepciones; toda partida termina o se marca `stalled`/`deadlock`;
   - `clone` es independiente; `hash(clone(s)) === hash(s)`;
   - el replay con la misma semilla es idéntico;
   - se conservan los componentes;
   - ni `observe(s, p)` ni `scene(s, p)` filtran información oculta para `p`;
   - `determinize(observe(s, p))` es consistente con lo observado;
   - toda jugada legal tiene anclas y sus anclas existen en la escena.
4. **Diferenciales:** TS contra `.rules` del mismo juego, con árboles de jugadas idénticos hasta profundidad N y resultados idénticos en 10.000 partidas con semilla.
5. **Validación de bots** contra resultados teóricos (sección 15).
6. **Validación de detectores** con `games/broken/`: cada defecto se detecta y no hay falsos positivos en los juegos sanos.
7. **Visuales:** capturas de Playwright de la mesa de cada juego de referencia en estados fijos (con semilla), comparadas contra referencias.
8. **De punta a punta:** CLI con salidas comparadas; en la web, crear un juego con el asistente, jugar una partida y generar el reporte.

Cobertura objetivo: 90% o más en `core`, `lang`, `compiler` y `analysis`.

---

## 25. Objetivos de rendimiento

Referencia: un núcleo de laptop moderna, bots `random`.

| Caso | Objetivo |
|---|---|
| Nim (TS) | ≥ 200.000 partidas/min |
| Juego compilado desde `.rules` | ≥ 50% del rendimiento de su versión en TS |
| Corazones (compilado) | ≥ 20.000 partidas/min |
| `ismcts`, 1.000 iteraciones por jugada | ≤ 50 ms por jugada en juegos medianos |
| `analyze` estándar con 8 workers | ≤ 2 minutos |
| Vista: transición animada entre escenas | 60 fps con hasta 150 nodos en mesa |
| Vista previa en vivo (recompilar + redibujar) | ≤ 150 ms después de dejar de escribir |

---

## 26. Hoja de ruta por fases

| Fase | Entregable | Criterio de aceptación | Horas est. |
|---|---|---|---|
| **0 · Fundación (Capítulo 1)** | Contratos, RNG, Nim y tatetí en TS, bot aleatorio, sim con D1, visor web mínimo | Sección 28 | 12–16 |
| 1 · Sintaxis | Lexer, parser con recuperación, AST, diagnósticos, `check`, `fmt` | Los ejemplos 9.3–9.5 parsean; golden tests; formato idempotente | 30 |
| 2 · Semántica | Checker, tipos, IR, variantes, validación de `look` | Una prueba por cada código de diagnóstico | 30 |
| 3 · Compilación y tableros | Closures, geometría de tableros; Nim, tatetí, Cerdo y Conecta cuatro en `.rules` | Pruebas diferenciales contra TS | 30 |
| 4 · Cartas y ocultamiento | Zonas, visibilidad, `ask`, CSV, determinización; Kalah, Ocho loco, Dados mentirosos | Propiedades de no filtración; D10 detecta el defecto de Ocho loco | 30 |
| 5 · Capa visual completa | Escena derivada de las reglas, disposición automática, temas, plantillas, animaciones, interacción por anclas, hot-seat, repetición | Los juegos 1–7 se ven y se juegan sin código visual específico; pruebas visuales | 45 |
| 6 · Bots | `heuristic`, `flat-mc`, `ismcts`, `strategy`, panel "¿por qué jugó eso?" | Validación teórica | 35 |
| 7 · Simulación a escala | Workers (Node y navegador), NDJSON, replay, parada temprana | Prueba de oro de determinismo | 20 |
| 8 · Análisis y reporte | D1–D10, estadística, reporte HTML, capas sobre la mesa | Juegos rotos detectados; cero falsos positivos | 35 |
| 9 · Juegos complejos | Corazones, Damas, Backgammon, Mercaderes, Territorios | Todos jugables, analizados y con reporte publicado | 40 |
| 10 · Variantes y ablación | `compare`, ablación, barridos, vista A contra B | La ablación encuentra la carta inútil del juego roto | 20 |
| 11 · Editor y creación | Asistente, vista previa en vivo, fragmentos, compartir por URL, imprimir y jugar | Un usuario nuevo crea y analiza un juego de cartas simple en menos de 20 minutos | 40 |
| 12 · VS Code | Gramática, LSP, vista previa de la mesa en un panel | Diagnósticos, autocompletado y vista previa en vivo | 20 |
| 13 · Lanzamiento 1.0 | Documentación, tutorial, galería, npm, sitio publicado | Revisión completa de la documentación | 15 |
| | | **Total estimado** | **≈ 400 h** |

**Paralelismo posible:** gracias al contrato común, las fases 5 (vista) y 6 (bots) pueden avanzar con juegos escritos en TS mientras el lenguaje (1–4) madura.

---

## 27. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El lenguaje crece sin control | Alto | Solo entra lo que pide la escalera de juegos; un ADR por construcción |
| La disposición automática se ve mal en juegos raros | Medio | Pruebas visuales por juego; el bloque `look` permite fijar posiciones; galería como control de calidad |
| Rendimiento de las animaciones con muchas piezas | Medio | Solo se animan los nodos que cambian; virtualización de zonas grandes; meta de 60 fps medida |
| Rendimiento del código compilado | Medio | Closures, estado plano, benchmarks; plan B: generar JS en el build |
| Falsos positivos en el diagnóstico | Alto | IC, FDR, juegos sanos como control, lenguaje prudente ("asociación" frente a "efecto") |
| Debilidades de ISMCTS | Medio | Documentarlas; el análisis usa varios bots, no uno solo |
| Elegibilidad del proyecto | Alto | Sin ML, sin datos personales, sin juegos comerciales, autor único, MIT |

---

## 28. Capítulo 1: lo que se construye antes de postular

### 28.1 Cuánto conviene tener hecho

1. **Credibilidad:** Alignerr tiene que aprobar el proyecto, así que necesita ver un repo real, propio, con historia y con un futuro claro.
2. **Lo que se hace antes no se cobra:** cada hora de ahora es una hora sin pago y sin sesión registrada.
3. **Lo jugoso conviene guardarlo:** el lenguaje, la capa visual completa, los bots de búsqueda y el análisis son donde las dos respuestas del asistente van a diferir más y donde tu criterio vale más.
4. **La primera impresión es visual:** un GIF en el README con bots jugando en una mesa animada vale más que mil palabras para la aprobación.

**Conclusión: un "esqueleto que camina" de 12 a 16 horas**, que funcione de punta a punta en versión mínima y se vea bien, sin consumir lo valioso. Este plan demuestra que quedan unas 400 horas de trabajo.

### 28.2 Alcance

**Incluye:**

1. Repo público en GitHub con MIT, `README.md`, `docs/PLAN.md` y `CLAUDE.md`.
2. Monorepo pnpm con `core`, `players`, `sim`, `games`, `render`, `cli` y `apps/web`.
3. `core`: contratos `GameModule` y `Scene` completos (sección 8), RNG (`sfc32` + `splitmix32`) y hash.
4. `players`: solo `random`.
5. `games`: **Nim** y **tatetí** escritos a mano en TS, con `scene()` y `moveAnchors()`.
6. `sim`: ejecución secuencial con semillas derivadas y rotación de asientos.
7. **D1 (ventaja de asiento) con intervalo de Wilson**, como primera métrica real.
8. `cli`: `tabletest sim <nim|tictactoe> --games N --seed S`.
9. `render` mínimo: tablero de **grilla**, **zonas en fila** (las pilas de Nim como fichas), **piezas** (cruz, círculo y ficha) y **contadores**; animación FLIP básica de aparición y movimiento.
10. `apps/web` mínimo: elegir juego → ver bot contra bot con control de velocidad y lista de jugadas → o jugar contra el bot haciendo clic (resaltado de jugadas legales mediante anclas).
11. Pruebas: RNG determinista; propiedades de `clone`, `hash`, replay y anclas sobre los dos juegos; Wilson contra valores conocidos.
12. CI en verde.
13. `docs/language/overview.md`: borrador del lenguaje con los ejemplos 9.3–9.5 (**solo documentación, sin parser**).
14. ADR 0001: "GameModule mutable con RNG en el estado y Scene declarativa con ids estables".
15. GIF corto en `docs/media/demo.gif` (bots jugando tatetí) enlazado desde el README.

**No incluye** (queda para las sesiones pagas): parser, checker, compilador, cartas, información oculta, bots de búsqueda, workers, reporte, temas, plantillas, asistente de creación.

### 28.3 Criterios de aceptación

```bash
pnpm install && pnpm build && pnpm test && pnpm lint     # todo en verde
pnpm tabletest sim tictactoe --games 20000 --seed demo   # imprime el informe de abajo
pnpm --filter web dev                                    # mesa jugable en el navegador
```

Salida esperada (aproximada):

```
Tabletest · tictactoe · 20,000 games · random vs random · seed "demo"

Seat advantage
  seat 0   58.5%  [57.8% – 59.2%]
  seat 1   28.8%  [28.2% – 29.4%]
  draws    12.7%  [12.2% – 13.2%]
  → seat 0 wins significantly more often (p < 0.001)

Game length: median 7 moves (p10 5 · p90 9)
Completed in 0.38 s
```

La misma semilla tiene que dar exactamente la misma salida (salvo el tiempo). En la web, una partida bot contra bot se ve animada y se puede jugar con el mouse.

### 28.4 Higiene de git

Varios commits con sentido (scaffold → core → juegos → sim → cli → render → web → CI → docs), con vos como autor, sin secretos ni `.env`.

### 28.5 Presentación en la postulación

*"Tabletest: an open-source rules language, visual tabletop and simulator that finds broken rules in board and card games — first-player advantage, dominant strategies, dead or overpowered cards, games that stall. Write the rules, see the game come alive on screen, play it against bots, and get a quality report with statistical evidence and replayable examples."* Agregar el enlace al repo, el GIF y una mención del roadmap (unas 400 horas).

---

## 29. Instrucciones para el agente de desarrollo

> Esta sección está dirigida al asistente de código que implemente el proyecto.

1. **Implementá solo el Capítulo 1 (sección 28)** hasta que el autor diga lo contrario. No te adelantes.
2. Respetá los contratos `GameModule` y `Scene` de la sección 8. Si creés que hay que cambiarlos, proponelo y justificalo antes.
3. Pasos chicos y verificables; después de cada uno corré `pnpm build && pnpm test && pnpm lint`.
4. Sugerí un mensaje de commit (Conventional Commits) al final de cada paso; los commits los hace el autor.
5. Código, identificadores y comentarios en **inglés**; `docs/` puede ir en español.
6. Ninguna dependencia fuera de la sección 23 sin justificarla.
7. La interfaz no tiene código específico por juego: todo se dibuja a partir de `Scene`.
8. Nada de aprendizaje automático, telemetría, cuentas ni datos personales. Nada de juegos comerciales con derechos. Nunca secretos en el repo.
