const { chromium } = require('playwright');
// Speelt puzzels na als "denker" of "gokker" en leest daarna het ouderscherm uit.
async function play(p, style, n) {
  for (let k = 0; k < n; k++) {
    const g = await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('puzzelpret:v1')).game.code.split('-'); return Sudoku.generate(+c[0], c[1], +c[2]); });
    const size = g.size, N = size * size;
    const vals = g.puzzle.slice();
    const geo = await p.evaluate((s) => { const G = Sudoku.geometry(s); return { peers: G.peers, units: G.units }; }, size);
    const legal = (c, v) => !geo.peers[c].some(q => vals[q] === v);
    const forcedCell = () => {
      for (let c = 0; c < N; c++) if (!vals[c]) { const o = []; for (let v = 1; v <= size; v++) if (legal(c, v)) o.push(v); if (o.length === 1) return c; }
      for (const u of geo.units) for (let v = 1; v <= size; v++) { const sp = u.filter(c => !vals[c] && legal(c, v)); if (sp.length === 1 && !u.some(c => vals[c] === v)) return sp[0]; }
      return -1;
    };
    let guard = 0;
    while (vals.some((v, i) => v !== g.solution[i]) && guard++ < 300) {
      let c, v;
      if (style === 'denker') { c = forcedCell(); v = g.solution[c]; await p.waitForTimeout(250); }
      else { const empty = []; for (let i = 0; i < N; i++) if (!vals[i] || vals[i] !== g.solution[i]) empty.push(i); c = empty[Math.floor(Math.random() * empty.length)]; v = 1 + Math.floor(Math.random() * size); if (vals[c] === v) continue; }
      await p.click(`.cell[data-index="${c}"]`); await p.click(`.pick >> nth=${v - 1}`);
      vals[c] = v;
    }
    await p.waitForSelector('#party:not([hidden])', { timeout: 5000 });
    await p.click('#close-party');
    await p.click('#owl-next'); await p.waitForTimeout(500);
  }
}
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch(); const errs = [];
  for (const style of ['denker', 'gokker']) {
    const p = await b.newPage({ viewport: { width: 400, height: 860 } });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + process.cwd() + '/kids.html');
    await p.evaluate(() => localStorage.clear()); await p.reload();
    await p.waitForFunction(() => document.querySelectorAll('.cell').length > 0);
    await play(p, style, 3);
    // ouderscherm via het rekensommetje
    await p.click('#parent-open');
    const q = await p.textContent('#gate-q');
    await p.fill('#gate-input', '1'); await p.click('#gate-form button');
    const errShown = await p.isVisible('#gate-error');
    const [a, c] = q.split('×').map(x => parseInt(x));
    await p.fill('#gate-input', String(a * c)); await p.click('#gate-form button');
    await p.waitForSelector('#parent-body:not([hidden])');
    const verdict = await p.textContent('.verdict');
    const nums = await p.textContent('.stack-nums');
    const notes = await p.$$eval('.notes-list li', els => els.map(e => e.textContent));
    console.log(`\n== ${style} == gate wrong answer blocked: ${errShown}\n${verdict}\n${nums}\n- ${notes.join('\n- ')}`);
    await p.screenshot({ path: `${out}/parent-${style}.png`, fullPage: false });
    await p.evaluate(() => document.querySelector('.parent-overlay').scrollTo(0, 99999));
    await p.screenshot({ path: `${out}/parent-${style}-bottom.png` });
    await p.close();
  }
  console.log('\nerrors', errs); await b.close();
})();
