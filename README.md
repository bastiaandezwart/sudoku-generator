# Sudokumaker

Een sudoku-generator voor **4×4**, **6×6** en **9×9** met vier niveaus: **Makkelijk**, **Gemiddeld**, **Moeilijk** en **Expert**. Je speelt de puzzels direct in de browser. Er zijn geen afhankelijkheden en er is geen build-stap.

## Gebruiken

Open `index.html` in je browser. Dat is alles.

- Kies een grootte en een niveau en klik op **Nieuwe puzzel maken**.
- Klik op een vakje en typ een cijfer, of gebruik het cijferpaneel.
- **Notities** (toets `N`) zet potloodstreepjes. Als je een cijfer invult, verdwijnt die notitie vanzelf uit de rij, de kolom en het blok.
- **Terug** (`Ctrl+Z`), **Wissen** (`Backspace`), **Hint**, **Controleren** en **Oplossing tonen**.
- Je voortgang en de tijd worden in de browser bewaard.
- Elke puzzel heeft een code, bijvoorbeeld `9-expert-482113`. Met dezelfde code krijgt iedereen precies dezelfde puzzel. De code staat ook in de adresbalk (`index.html#9-expert-482113`).
- Afdrukken kan met `Ctrl+P`. Dan wordt alleen het rooster afgedrukt.

## Puzzelpret: de kinderversie

Open `kids.html` voor een versie voor kinderen van 5 tot 8 jaar:

- Plaatjes in plaats van cijfers: dieren, fruit of sprookjes. Cijfers kan ook.
- Alleen 4×4 en 6×6, met de moeilijkheid in sterren (★ tot ★★★).
- Twee manieren om te spelen: tik eerst een leeg vakje en dan een plaatje, of kies eerst een plaatje en "stempel" het op de vakjes.
- Een uiltje legt uit wat er mis is ("Er staat al een 🐱 in deze rij") en moedigt aan.
- **Help mij** legt een goed plaatje neer, het liefst op een plek waar maar één plaatje past.
- Na het oplossen: confetti, 1 tot 3 hartjes (minder fouten en hulp = meer hartjes) en een sticker voor in het stickerboek.
- Elk niveau heeft een eigen set van 25 stickers, met een eigen kleur en sterren op de sticker: groen ★, blauw ★★, goud ★★★. Je krijgt pas een sticker dubbel als je de hele set hebt.
- Geen timer. Het geluid en het meteen tonen van fouten kun je uitzetten.

## Roosters

| Grootte | Blokken | Cijfers |
|---------|---------|---------|
| 4×4     | 2×2     | 1–4     |
| 6×6     | 2 rijen × 3 kolommen | 1–6 |
| 9×9     | 3×3     | 1–9     |

## Niveaus

Elke puzzel heeft precies één oplossing. Het niveau bepaalt hoeveel cijfers er gegeven zijn en welke technieken je nodig hebt.

| Niveau    | 4×4 | 6×6 | 9×9 | Wat je nodig hebt |
|-----------|-----|-----|-----|-------------------|
| Makkelijk | 10  | 20  | 38  | Alleen *singles* (een vakje of cijfer dat nog maar op één manier kan) |
| Gemiddeld | 8   | 16  | 32  | Alleen singles, maar met minder hulp |
| Moeilijk  | 6   | 13  | 28  | Op 9×9 ook *pointing/claiming* en *naked pairs* |
| Expert    | 5   | 11  | 24  | Meer dan dat: geavanceerde technieken of vooruitdenken |

De getallen zijn het aantal gegeven cijfers.

## Hoe het werkt (`sudoku.js`)

1. Een backtracking-solver met bitmaskers vult een leeg rooster in willekeurige volgorde. Dat wordt de oplossing.
2. Daarna worden cijfers weggehaald, eerst in puntsymmetrische paren zoals in de krant. Een cijfer blijft alleen weg als de puzzel nog steeds precies één oplossing heeft. Voor Makkelijk en Gemiddeld moet de puzzel bovendien met singles op te lossen blijven, en voor Moeilijk met de technieken tot en met naked pairs.
3. Een "menselijke" solver beoordeelt het resultaat. Uit een aantal pogingen wordt de puzzel gekozen die het best bij het niveau past.

Alles hangt af van een seed. Daardoor levert een code altijd dezelfde puzzel op.

De module werkt ook in Node:

```js
const Sudoku = require('./sudoku.js');
const p = Sudoku.generate(9, 'moeilijk', 42);
console.log(Sudoku.toText(p.puzzle, 9));
```

## Tests

```sh
node test.js
```

De tests controleren 180 puzzels: elke puzzel moet uniek oplosbaar en geldig zijn, de niveaus moeten kloppen en dezelfde code moet dezelfde puzzel geven.
