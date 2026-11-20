/*
 * Sudoku-generator voor 4×4, 6×6 en 9×9 met vier niveaus.
 *
 * Werkt in de browser (globale `Sudoku`) en in Node (`require('./sudoku.js')`).
 *
 * Werkwijze:
 *  1. Vul een leeg rooster willekeurig met een backtracking-solver → oplossing.
 *  2. Haal cijfers weg (in puntsymmetrische paren, zoals in de krant) zolang
 *     de puzzel precies één oplossing houdt en, afhankelijk van het niveau,
 *     nog met eenvoudige logica op te lossen is.
 *  3. Beoordeel het resultaat met een "menselijke" solver en kies uit een
 *     paar pogingen de puzzel die het best bij het gevraagde niveau past.
 *
 * Alles is deterministisch op basis van een seed, zodat een puzzelcode
 * (bijv. 9-expert-123456) altijd dezelfde puzzel oplevert.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Sudoku = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Afmetingen van de blokken: 6×6 heeft blokken van 2 rijen bij 3 kolommen.
  const SIZES = {
    4: { boxRows: 2, boxCols: 2 },
    6: { boxRows: 2, boxCols: 3 },
    9: { boxRows: 3, boxCols: 3 },
  };

  const LEVELS = ['makkelijk', 'gemiddeld', 'moeilijk', 'expert'];

  const LEVEL_LABELS = {
    makkelijk: 'Makkelijk',
    gemiddeld: 'Gemiddeld',
    moeilijk: 'Moeilijk',
    expert: 'Expert',
  };

  // Gewenst aantal gegeven cijfers per grootte en niveau.
  const CLUES = {
    4: { makkelijk: 10, gemiddeld: 8, moeilijk: 6, expert: 5 },
    6: { makkelijk: 20, gemiddeld: 16, moeilijk: 13, expert: 11 },
    9: { makkelijk: 38, gemiddeld: 32, moeilijk: 28, expert: 24 },
  };

  // maxLogic: welke technieken de puzzel maximaal mag vereisen tijdens het weghalen.
  //   1 = alleen singles, 2 = ook pointing/claiming en naked pairs, 3 = alles (ook gokken).
  // wantGrade: welke beoordeling we na afloop het liefst zien.
  const LEVEL_RULES = {
    makkelijk: { maxLogic: 1, wantGrade: 1 },
    gemiddeld: { maxLogic: 1, wantGrade: 1 },
    moeilijk: { maxLogic: 2, wantGrade: 2 },
    expert: { maxLogic: 3, wantGrade: 3 },
  };

  // Aantal pogingen waaruit de best passende puzzel gekozen wordt.
  const ATTEMPTS = { 4: 6, 6: 40, 9: 40 };

  // ---------------------------------------------------------------- helpers

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  const POP = new Uint8Array(1 << 10);
  for (let i = 1; i < POP.length; i++) POP[i] = POP[i >> 1] + (i & 1);

  function bitsToDigits(mask) {
    const out = [];
    for (let v = 1; mask >> v; v++) if (mask & (1 << v)) out.push(v);
    return out;
  }

  // --------------------------------------------------------------- geometrie

  const geoCache = {};

  function geometry(size) {
    if (geoCache[size]) return geoCache[size];
    const spec = SIZES[size];
    if (!spec) throw new Error('Onbekende grootte: ' + size + ' (kies 4, 6 of 9)');
    const { boxRows, boxCols } = spec;
    const n = size * size;
    const boxesPerBand = size / boxCols;
    const rowOf = new Uint8Array(n);
    const colOf = new Uint8Array(n);
    const boxOf = new Uint8Array(n);
    const rows = [];
    const cols = [];
    const boxes = [];
    for (let k = 0; k < size; k++) {
      rows.push([]);
      cols.push([]);
      boxes.push([]);
    }
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / size);
      const c = i % size;
      const b = Math.floor(r / boxRows) * boxesPerBand + Math.floor(c / boxCols);
      rowOf[i] = r;
      colOf[i] = c;
      boxOf[i] = b;
      rows[r].push(i);
      cols[c].push(i);
      boxes[b].push(i);
    }
    const peers = [];
    for (let i = 0; i < n; i++) {
      const set = new Set([...rows[rowOf[i]], ...cols[colOf[i]], ...boxes[boxOf[i]]]);
      set.delete(i);
      peers.push([...set]);
    }
    const geo = {
      size,
      n,
      boxRows,
      boxCols,
      full: ((1 << (size + 1)) - 1) & ~1, // bits 1..size
      rowOf,
      colOf,
      boxOf,
      rows,
      cols,
      boxes,
      units: rows.concat(cols, boxes),
      peers,
    };
    geoCache[size] = geo;
    return geo;
  }

  // ---------------------------------------------------- backtracking-solver

  /**
   * Zoekt oplossingen tot `limit` gevonden is.
   * Met `rng` worden kandidaten in willekeurige volgorde geprobeerd (voor genereren).
   * Geeft { count, solution } terug; solution is de eerste gevonden oplossing.
   */
  function search(grid, geo, opts) {
    const limit = (opts && opts.limit) || 2;
    const rng = opts && opts.rng;
    const { size, n, rowOf, colOf, boxOf, full } = geo;
    const g = Array.from(grid);
    const rowM = new Int32Array(size);
    const colM = new Int32Array(size);
    const boxM = new Int32Array(size);
    for (let i = 0; i < n; i++) {
      const v = g[i];
      if (!v) continue;
      const bit = 1 << v;
      const r = rowOf[i], c = colOf[i], b = boxOf[i];
      if ((rowM[r] | colM[c] | boxM[b]) & bit) return { count: 0, solution: null };
      rowM[r] |= bit;
      colM[c] |= bit;
      boxM[b] |= bit;
    }
    let count = 0;
    let solution = null;

    function rec() {
      let best = -1;
      let bestMask = 0;
      let bestCount = 99;
      for (let i = 0; i < n; i++) {
        if (g[i]) continue;
        const m = full & ~(rowM[rowOf[i]] | colM[colOf[i]] | boxM[boxOf[i]]);
        const k = POP[m];
        if (k < bestCount) {
          best = i;
          bestMask = m;
          bestCount = k;
          if (k <= 1) break;
        }
      }
      if (best === -1) {
        count++;
        if (!solution) solution = g.slice();
        return count >= limit;
      }
      if (bestCount === 0) return false;
      const digits = bitsToDigits(bestMask);
      if (rng) shuffle(digits, rng);
      const r = rowOf[best], c = colOf[best], b = boxOf[best];
      for (const v of digits) {
        const bit = 1 << v;
        g[best] = v;
        rowM[r] |= bit;
        colM[c] |= bit;
        boxM[b] |= bit;
        if (rec()) return true;
        rowM[r] &= ~bit;
        colM[c] &= ~bit;
        boxM[b] &= ~bit;
      }
      g[best] = 0;
      return false;
    }

    rec();
    return { count, solution };
  }

  function countSolutions(grid, size, limit) {
    return search(grid, geometry(size), { limit: limit || 2 }).count;
  }

  function solve(grid, size) {
    return search(grid, geometry(size), { limit: 1 }).solution;
  }

  // ------------------------------------------------------- logische solver

  /**
   * Lost op zoals een mens dat doet, met technieken tot `maxLevel`:
   *   1: naked single, hidden single
   *   2: pointing / claiming (blok-lijn-reductie), naked pairs
   * Geeft { solved, level } terug; level is de zwaarste techniek die nodig was.
   */
  function solveLogically(grid, geo, maxLevel) {
    const { n, peers, units, full, size, rowOf, colOf, boxOf, rows, cols, boxes } = geo;
    const g = Array.from(grid);
    const cand = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      if (g[i]) continue;
      let m = full;
      for (const p of peers[i]) if (g[p]) m &= ~(1 << g[p]);
      cand[i] = m;
    }
    let level = 0;
    let empty = 0;
    for (let i = 0; i < n; i++) if (!g[i]) empty++;

    function place(i, v) {
      g[i] = v;
      cand[i] = 0;
      empty--;
      const bit = 1 << v;
      for (const p of peers[i]) cand[p] &= ~bit;
    }

    function eliminate(cells, bit, keep) {
      let changed = false;
      for (const i of cells) {
        if (g[i] || keep.has(i)) continue;
        if (cand[i] & bit) {
          cand[i] &= ~bit;
          changed = true;
        }
      }
      return changed;
    }

    for (;;) {
      if (empty === 0) return { solved: true, level };
      let progress = false;

      // Naked singles
      for (let i = 0; i < n; i++) {
        if (g[i]) continue;
        if (cand[i] === 0) return { solved: false, level };
        if (POP[cand[i]] === 1) {
          place(i, bitsToDigits(cand[i])[0]);
          progress = true;
        }
      }
      if (progress) {
        level = Math.max(level, 1);
        continue;
      }

      // Hidden singles
      for (const unit of units) {
        for (let v = 1; v <= size; v++) {
          const bit = 1 << v;
          let spot = -1;
          let hits = 0;
          for (const i of unit) {
            if (g[i] === v) {
              hits = -1;
              break;
            }
            if (!g[i] && cand[i] & bit) {
              hits++;
              spot = i;
            }
          }
          if (hits === 1) {
            place(spot, v);
            progress = true;
          }
        }
      }
      if (progress) {
        level = Math.max(level, 1);
        continue;
      }

      if (maxLevel < 2) return { solved: false, level };

      // Pointing: kandidaten van een cijfer in een blok liggen op één rij/kolom.
      for (const box of boxes) {
        for (let v = 1; v <= size; v++) {
          const bit = 1 << v;
          const spots = box.filter((i) => !g[i] && cand[i] & bit);
          if (spots.length < 2) continue;
          const keep = new Set(spots);
          if (spots.every((i) => rowOf[i] === rowOf[spots[0]])) {
            if (eliminate(rows[rowOf[spots[0]]], bit, keep)) progress = true;
          }
          if (spots.every((i) => colOf[i] === colOf[spots[0]])) {
            if (eliminate(cols[colOf[spots[0]]], bit, keep)) progress = true;
          }
        }
      }
      // Claiming: kandidaten van een cijfer in een rij/kolom liggen in één blok.
      for (const line of rows.concat(cols)) {
        for (let v = 1; v <= size; v++) {
          const bit = 1 << v;
          const spots = line.filter((i) => !g[i] && cand[i] & bit);
          if (spots.length < 2) continue;
          if (spots.every((i) => boxOf[i] === boxOf[spots[0]])) {
            if (eliminate(boxes[boxOf[spots[0]]], bit, new Set(spots))) progress = true;
          }
        }
      }
      // Naked pairs
      for (const unit of units) {
        const pairs = unit.filter((i) => !g[i] && POP[cand[i]] === 2);
        for (let a = 0; a < pairs.length; a++) {
          for (let b = a + 1; b < pairs.length; b++) {
            if (cand[pairs[a]] !== cand[pairs[b]]) continue;
            const mask = cand[pairs[a]];
            const keep = new Set([pairs[a], pairs[b]]);
            for (const i of unit) {
              if (g[i] || keep.has(i) || !(cand[i] & mask)) continue;
              cand[i] &= ~mask;
              progress = true;
            }
          }
        }
      }
      if (progress) {
        level = 2;
        continue;
      }
      return { solved: false, level };
    }
  }

  /** 1 = alleen singles, 2 = blok-lijn-reductie/naked pairs nodig, 3 = meer dan dat. */
  function grade(puzzle, size) {
    const geo = geometry(size);
    const res = solveLogically(puzzle, geo, 2);
    return res.solved ? Math.max(1, res.level) : 3;
  }

  // ------------------------------------------------------------ genereren

  function carve(solution, geo, target, maxLogic, rng) {
    const { n } = geo;
    const p = solution.slice();
    let clues = n;

    const isOk = () =>
      search(p, geo, { limit: 2 }).count === 1 &&
      (maxLogic >= 3 || solveLogically(p, geo, maxLogic).solved);

    // Eerst puntsymmetrische paren, daarna losse cellen om het doel te halen.
    const pairs = [];
    for (let i = 0; i < n; i++) {
      const j = n - 1 - i;
      if (i < j) pairs.push([i, j]);
      else if (i === j) pairs.push([i]);
    }
    shuffle(pairs, rng);
    for (const pair of pairs) {
      if (clues <= target) break;
      if (clues - pair.length < target) continue;
      const saved = pair.map((i) => p[i]);
      pair.forEach((i) => (p[i] = 0));
      if (isOk()) clues -= pair.length;
      else pair.forEach((i, k) => (p[i] = saved[k]));
    }
    if (clues > target) {
      const singles = shuffle(
        p.map((v, i) => (v ? i : -1)).filter((i) => i >= 0),
        rng
      );
      for (const i of singles) {
        if (clues <= target) break;
        const saved = p[i];
        p[i] = 0;
        if (isOk()) clues--;
        else p[i] = saved;
      }
    }
    return { puzzle: p, clues };
  }

  /**
   * Genereert een puzzel.
   * @param {4|6|9} size
   * @param {'makkelijk'|'gemiddeld'|'moeilijk'|'expert'} level
   * @param {number} [seed]
   */
  function generate(size, level, seed) {
    size = Number(size);
    const geo = geometry(size);
    if (!LEVEL_RULES[level]) throw new Error('Onbekend niveau: ' + level);
    if (seed === undefined || seed === null) seed = Math.floor(Math.random() * 1e6);
    seed = Number(seed) >>> 0;

    const rng = mulberry32(seed * 2654435761 + size * 97 + LEVELS.indexOf(level));
    const target = CLUES[size][level];
    const rules = LEVEL_RULES[level];
    // Bij kleine roosters zijn de zwaardere technieken zelden nodig;
    // daar zit het verschil vooral in het aantal gegeven cijfers.
    const wantGrade = size === 9 ? rules.wantGrade : size === 6 && level === 'expert' ? 2 : 1;

    let best = null;
    for (let a = 0; a < ATTEMPTS[size]; a++) {
      const solution = search(new Array(geo.n).fill(0), geo, { limit: 1, rng }).solution;
      const { puzzle, clues } = carve(solution, geo, target, rules.maxLogic, rng);
      const g = grade(puzzle, size);
      const score = Math.abs(clues - target) + (g >= wantGrade ? 0 : 3);
      if (!best || score < best.score) best = { puzzle, solution, clues, grade: g, score };
      if (score === 0) break;
    }

    return {
      size,
      level,
      seed,
      code: size + '-' + level + '-' + seed,
      boxRows: geo.boxRows,
      boxCols: geo.boxCols,
      puzzle: best.puzzle,
      solution: best.solution,
      clues: best.clues,
      grade: best.grade,
    };
  }

  /** Leest een puzzelcode zoals "9-expert-123456". */
  function parseCode(code) {
    const m = /^(4|6|9)-(makkelijk|gemiddeld|moeilijk|expert)-(\d{1,9})$/.exec(String(code || ''));
    if (!m) return null;
    return { size: Number(m[1]), level: m[2], seed: Number(m[3]) };
  }

  /** Tekstweergave, handig in de terminal: . voor lege vakjes. */
  function toText(grid, size) {
    const geo = geometry(size);
    const lines = [];
    for (let r = 0; r < size; r++) {
      if (r && r % geo.boxRows === 0) {
        lines.push(
          Array.from({ length: size / geo.boxCols }, () => '-'.repeat(geo.boxCols * 2 - 1)).join('-+-')
        );
      }
      const cells = [];
      for (let c = 0; c < size; c++) {
        if (c && c % geo.boxCols === 0) cells.push('|');
        const v = grid[r * size + c];
        cells.push(v ? String(v) : '.');
      }
      lines.push(cells.join(' '));
    }
    return lines.join('\n');
  }

  return {
    SIZES,
    LEVELS,
    LEVEL_LABELS,
    CLUES,
    geometry,
    generate,
    solve,
    countSolutions,
    grade,
    parseCode,
    toText,
  };
});
