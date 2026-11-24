# Overdracht: Sudokumaker en Puzzelpret

Stand van zaken op 24 november 2026, aan het eind van de eerste bouwsessie.
Lees dit voordat je verder bouwt. `README.md` beschrijft het product voor gebruikers; dit document beschrijft hoe het in elkaar zit en wat er besloten is.

## In het kort

- **Sudokumaker** (`index.html`): sudoku's van 4×4, 6×6 en 9×9 in vier niveaus, met cijfers. Voor volwassenen.
- **Puzzelpret** (`kids.html`): de kinderversie voor **Evi** (5 tot 8 jaar). Plaatjes in plaats van cijfers, 4×4 en 6×6, drie niveaus (★ tot ★★★), een uiltje dat helpt, een stickerboek met een eigen kaft, en een ouderscherm dat meet of ze het weet of gokt.
- Alles is statische HTML/CSS/JS zonder build-stap en zonder dependencies. Beide pagina's gebruiken dezelfde generator `sudoku.js`.
- De opdrachtgever is Bastiaan (de vader). Hij schrijft Nederlands; antwoord in het Nederlands.

## Waar alles staat

| Wat | Waar |
|---|---|
| Branch | `ccr-0f5b84f9-w52rzc` (alles gepusht, geen pull request) |
| Puzzelpret online | https://claude.ai/artifact/AVAazgAjGyJeGG4yeXMkPx (privé artifact van Bastiaan) |
| Sudokumaker online | https://claude.ai/artifact/RW6UevvC3q7egpsp7uVQPF (privé artifact van Bastiaan) |
| Generator | `sudoku.js` |
| Kinderversie | `kids.html` (± 1900 regels: CSS, HTML en JS in één bestand) |
| Volwassenversie | `index.html` |
| Kaftplaatje | `assets/kaft-evi.webp` (72 KB) en `assets/kaft-evi.jpg` (reserve), 1000×1241 |
| Unit tests | `node test.js` (180 puzzels: uniek, geldig, juiste niveaus) |
| Browsertests | `tests/e2e/` (zie de README daar) |
| Online versies klaarmaken | `python3 tools/build_artifacts.py <map>` |

## De online versies bijwerken

De artifacts krijgen bij publiceren zelf een `<head>`/`<body>`-skelet. Daarom publiceer je niet de bestanden uit de repo, maar een gestripte kopie:

1. `python3 tools/build_artifacts.py <scratchpad>/build`
2. In een **nieuwe sessie** eerst de artifact lezen met de Artifact-tool (`action: "read"`, met de `url`). Een publicatie naar een artifact dat de sessie nog niet gelezen heeft, wordt geweigerd.
3. Publiceren met `url` erbij:
   - Puzzelpret: `file_path` = `<build>/kids/puzzelpret.html`, `files` = `{"sudoku.js": "<build>/kids/sudoku.js"}`. De kaftplaatjes (`assets/kaft-evi.webp`/`.jpg`) staan er al en blijven staan; stuur ze alleen mee als ze veranderd zijn.
   - Sudokumaker: `file_path` = `<build>/site/sudokumaker.html`, `files` = `{"sudoku.js": "<build>/site/sudoku.js"}`.
4. Geen `icon` meegeven bij bijwerken (de artifacts houden hun icoon: Puzzelpret "star", Sudokumaker "puzzle").

Het script vervangt de onderlinge links: in de repo linken de pagina's naar `index.html`/`kids.html`, online naar elkaars artifact-URL.

## sudoku.js (generator)

- Werkt in de browser (globale `Sudoku`) en in Node (`require('./sudoku.js')`).
- API: `generate(size, level, seed)` geeft `{size, level, seed, code, boxRows, boxCols, puzzle, solution, clues, grade}`. Verder `geometry(size)` (rows/cols/boxes/units/peers), `solve`, `countSolutions`, `grade`, `parseCode`, `toText`, `CLUES`, `LEVELS`, `LEVEL_LABELS`.
- Niveaus: `makkelijk`, `gemiddeld`, `moeilijk`, `expert` (Puzzelpret gebruikt alleen de eerste drie).
- Blokken: 4×4 = 2×2, 6×6 = 2 rijen × 3 kolommen, 9×9 = 3×3.
- Werkwijze: een willekeurige oplossing maken, dan cijfers weghalen (puntsymmetrische paren) zolang de puzzel uniek blijft. Makkelijk en gemiddeld moeten met singles op te lossen blijven, moeilijk met pointing/claiming/naked pairs. Uit een aantal pogingen kiest hij de best passende puzzel.
- Deterministisch per seed: de **puzzelcode** `9-expert-482113` geeft altijd dezelfde puzzel. Wijzig je de generator, dan veranderen bestaande codes (en de opgeslagen spellen in browsers). Doe dat dus alleen bewust.

## kids.html (Puzzelpret): opbouw

Het script staat in één IIFE. De onderdelen in volgorde (zoek op de `// ----`-kopjes):

1. **Gegevens:** `THEMES` (dieren/fruit/sprookjes/cijfers), `STICKER_SETS`, `LEVEL_NAMES`, `CHEERS`.
2. **Opslag:** `settings`, `stickers`, `persist()`, `normalizeStickers()`.
3. **Zetten bijhouden (voor ouders):** `logStart`, `logPlace`, `logMove`, `logEnd`.
4. **Geluid:** WebAudio, met tonen en ruis; alleen na een tik van de gebruiker.
5. **Instellingen:** grootte/niveau kiezen start meteen een nieuwe puzzel (`requestNew` → vraagt eerst als je bezig bent).
6. **Spel:** `startGame`, `buildBoard` (DOM per blok, dus `data-index` ≠ DOM-volgorde), `render`, `tapCell`/`tapPick`, `place`, `erase`, `hint`, `afterChange`, `win`.
7. **Stickerboek:** `PAGES`, `renderBook`, `applyPages`, `flipTo` (3D-omslaan), `coverScene()` (getekende reservekaft in SVG).
8. **Plakken:** `stickIt`. Een eigen rAF-"camera" scrollt mee terwijl de sticker zweeft. Daarna bladert het boek en vliegt de sticker naar zijn plekje, midden in beeld.
9. **Ouderscherm:** `renderParent`, `openParent` (met een rekensommetje als poort), `summarize`.
10. **Start:** `boot()` en `window.claude.hot` voor live updates in de viewer.

### Bediening (zo besloten na testen)
- Eerst een leeg vakje en dan een plaatje: het plaatje komt in dat vakje.
- Eerst een plaatje: je "stempelt" het daarna op elk vakje dat je aantikt.
- De gum werkt op dezelfde twee manieren.
- "Fouten meteen laten zien" staat standaard aan. Het uiltje legt dan uit waarom iets botst en laat het botsende vakje knipperen.

### Opslag in de browser (`localStorage`)
| Sleutel | Inhoud |
|---|---|
| `puzzelpret:v1` | `{settings, stickers, game}`. Een sticker is `{s: emoji, level, size: 4\|6, t}`. `game` bevat de code en de voortgang. |
| `puzzelpret:log` | `{games: [...]}`, de laatste 60 puzzels: `{code, size, level, start, end, solved, fb, moves}`. Een zet is `[ms sinds start, cel, waarde, soort, aantal mogelijke plaatjes, snelHerkans 0/1]`. `fb`: 1 = fouten getoond, 0 = niet, 2 = gewisseld tijdens de puzzel. |
| `sudokumaker:v1` | Voortgang van de volwassenversie. |

Soorten zetten: `L` wist het, `G` gegokt (goed, maar er waren meer plaatjes mogelijk), `P` goed na eerdere fout in hetzelfde vakje, `W` fout maar past volgens de regels, `B` fout en botst, `E` gegumd, `H` hulp, `R` opnieuw begonnen. "Zeker" betekent: een naked of hidden single op het bord zoals het kind het zag.

### Stickers
- Zes sets van 25: `4-makkelijk`, `4-gemiddeld`, `4-moeilijk`, `6-makkelijk`, `6-gemiddeld`, `6-moeilijk`. Geen emoji komt dubbel voor.
- **Niveau** = kleur en sterren (groen ★, blauw ★★, goud ★★★). **Grootte** = vorm: 4×4 rond, 6×6 vierkant met ronde hoeken.
- Geen herhaling: een sticker komt pas dubbel als de hele set binnen is, en nooit twee keer dezelfde achter elkaar.
- Stickers zonder niveau (uit de allereerste versie) worden bij het laden opgeruimd; dat wilde Bastiaan zo. Stickers die eerder met een 6×6-puzzel verdiend werden maar uit een 4×4-set kwamen, staan op de 4×4-bladzijden.
- Vermijd emoji die vierkante plaatjes zijn (🎆 🎇 🌠). Hun schaduw op een leeg plekje wordt een blok.

### Boek en kaft
- Zeven bladzijden: kaft, 4×4 ★ ★★ ★★★, 6×6 ★ ★★ ★★★. Er is een knop 4×4 | 6×6 en er zijn tabbladen per niveau; bladeren kan ook door te vegen.
- De kaft is Evi's eigen plaatje (gemaakt met Gemini, met de titel "Het stickerboek van Evi" erin). De getekende SVG-kaft eronder verschijnt alleen als het plaatje niet laadt.

## Beslissingen en waarom

- Puzzelpret heeft **geen timer** (geen haast) en een **uiltje** in plaats van foutmeldingen.
- Na het oplossen geeft het spel **hartjes** voor hoe goed het ging (fouten plus hulp), geen sterren. Sterren betekenen overal het niveau, en twee soorten sterren was verwarrend.
- Een nieuwe puzzel krijgt duidelijke **feedback**: een schud-animatie, een geluidje, het uiltje meldt hem en de pagina scrolt naar het bord. Bastiaan vond het eerst raar dat er niets leek te gebeuren.
- **Plakken**: het scherm moet zichtbaar meebewegen. `scrollIntoView` was niet genoeg; daarom de eigen camera.
- **Ouderscherm**: Bastiaan vermoedde dat Evi meer gokt dan weet. Het scherm geeft een conclusie over de laatste 10 puzzels (≥ 70% "wist het" en ≤ 15% fout = "weet het meestal", ≥ 45% = "wisselt af", anders "gokt vaak"), opvallende dingen en tips. Het is bewust voorzichtig geformuleerd ("een aanwijzing, geen cijfer").
- Bastiaan wil dat dingen **getest worden** voordat ze online gaan: de unit tests en een browsertest per wijziging, met een screenshot om naar te kijken.

## Valkuilen

- **Artifact-viewer:** `window.print()`, `alert` en `confirm` werken daar niet. Bevestigingen zijn daarom "tik nog eens"-knoppen. Opslag in `localStorage` hoort bij één apparaat en browser.
- **Headless screenshots:** een element-screenshot van het boek toont soms de reservekaft, door de 3D-transforms. Een screenshot van de hele pagina toont het echt. Het kaftplaatje werkt wel.
- **Volgorde in de DOM:** de cellen staan per blok in de DOM. Gebruik `.cell[data-index="i"]`, niet `nth(i)`.
- In `index.html` zorgt `[hidden]{display:none!important}` ervoor dat de "bezig"-laag echt verdwijnt. Haal dat niet weg.
- **CLAUDE.md:** daarin staan afspraken over een "Regiebord" (gedeelde takenlijst in een artifact-database). Een andere sessie heeft dat bestand toegevoegd. In deze sessie is het Regiebord niet gelezen of bijgewerkt, omdat Bastiaan daar hier niet om vroeg. Vraag hem of hij dat wil.

## Open punten en ideeën

Aangeboden, maar nog niet gevraagd of gedaan:
- Evi's naam ook in de app gebruiken, bijvoorbeeld "Hallo Evi!" van het uiltje.
- Andere plaatjessets, bijvoorbeeld paarden of zeedieren.
- Opdrachten voorlezen voor als ze nog niet goed kan lezen.
- Het ouderscherm heeft nog geen echte gegevens van Evi gezien. De drempels zijn getest met nagespeelde kinderen ("denker" 100%, "gokker" 6%). Zodra Bastiaan echte resultaten heeft, kun je de drempels en teksten bijstellen.
- Een instelling voor ouders om "Fouten meteen laten zien" vast te zetten, zodat Evi hem niet zelf aan kan zetten. Nu is het een knop die iedereen kan gebruiken.
