// Tests voor de generator. Uitvoeren met: node test.js
'use strict';
const assert = require('assert');
const S = require('./sudoku.js');

function isValidSolution(grid, size) {
  const geo = S.geometry(size);
  for (const unit of geo.units) {
    const seen = new Set(unit.map((i) => grid[i]));
    if (seen.size !== size) return false;
    for (let v = 1; v <= size; v++) if (!seen.has(v)) return false;
  }
  return true;
}

let checked = 0;
for (const size of [4, 6, 9]) {
  for (const level of S.LEVELS) {
    for (let seed = 1; seed <= 15; seed++) {
      const p = S.generate(size, level, seed);
      const where = p.code;
      assert.strictEqual(p.puzzle.length, size * size, where);
      assert.ok(isValidSolution(p.solution, size), 'ongeldige oplossing ' + where);
      p.puzzle.forEach((v, i) => {
        if (v) assert.strictEqual(v, p.solution[i], 'gegeven wijkt af van oplossing ' + where);
      });
      assert.strictEqual(S.countSolutions(p.puzzle, size, 2), 1, 'niet uniek ' + where);
      assert.deepStrictEqual(S.solve(p.puzzle, size), p.solution, 'solver vindt andere oplossing ' + where);
      assert.strictEqual(p.clues, p.puzzle.filter(Boolean).length, where);
      if (level === 'makkelijk' || level === 'gemiddeld') {
        assert.strictEqual(S.grade(p.puzzle, size), 1, 'zou met singles oplosbaar moeten zijn ' + where);
      }
      checked++;
    }
  }
}

// Zelfde code → zelfde puzzel.
const a = S.generate(9, 'expert', 1234);
const b = S.generate(9, 'expert', 1234);
assert.deepStrictEqual(a.puzzle, b.puzzle, 'niet deterministisch');

// Moeilijkere niveaus geven minder cijfers.
for (const size of [4, 6, 9]) {
  const avg = (level) => {
    let t = 0;
    for (let s = 1; s <= 10; s++) t += S.generate(size, level, s).clues;
    return t / 10;
  };
  const c = S.LEVELS.map(avg);
  for (let k = 1; k < c.length; k++) assert.ok(c[k] < c[k - 1], size + '×' + size + ': ' + c.join(' > '));
}

assert.deepStrictEqual(S.parseCode('6-moeilijk-42'), { size: 6, level: 'moeilijk', seed: 42 });
assert.strictEqual(S.parseCode('7-expert-1'), null);
assert.strictEqual(S.parseCode('9-heel-moeilijk-1'), null);

console.log('OK: ' + checked + ' puzzels gecontroleerd (uniek, geldig, juiste niveaus).');
