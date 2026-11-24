const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch(); const errs = [];
  for (const [w, h, lvl] of [[390, 640, 'moeilijk'], [390, 640, 'makkelijk'], [1000, 700, 'gemiddeld']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + process.cwd() + '/kids.html');
    await p.evaluate(() => localStorage.clear()); await p.reload();
    await p.waitForFunction(() => document.querySelectorAll('.cell').length > 0);
    await p.click('#level-' + lvl); await p.waitForTimeout(600);
    await p.evaluate(() => scrollTo(0, 0));
    const g = await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('puzzelpret:v1')).game.code.split('-'); return Sudoku.generate(+c[0], c[1], +c[2]); });
    for (let i = 0; i < g.puzzle.length; i++) if (!g.puzzle[i]) { await p.click(`.cell[data-index="${i}"]`); await p.click(`.pick >> nth=${g.solution[i] - 1}`); }
    await p.waitForSelector('#party:not([hidden])');
    const s = await p.evaluate(() => document.getElementById('party-sticker').firstChild.textContent);
    await p.waitForTimeout(3300);
    const y0 = await p.evaluate(() => scrollY);
    // sample flyer visibility during the animation
    await p.evaluate(() => {
      window.__samples = [];
      const iv = setInterval(() => {
        const f = document.querySelector('.flyer');
        if (!f) { if (window.__samples.length) clearInterval(iv); return; }
        const r = f.getBoundingClientRect();
        window.__samples.push({ y: Math.round(scrollY), top: Math.round(r.top), bottom: Math.round(r.bottom), vis: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth });
      }, 100);
    });
    await p.click('#stick');
    await p.waitForTimeout(1600);
    await p.screenshot({ path: out + `/follow-${lvl}-mid.png` });
    await p.waitForSelector('#book-after:not([hidden])', { timeout: 8000 });
    await p.waitForTimeout(150);
    const landed = await p.evaluate((s) => { const el = [...document.querySelectorAll('.page:not(.flipped) .slot')].find(x => x.dataset.s === s); const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, has: !!el.querySelector('.sticker') }; }, s);
    await p.screenshot({ path: out + `/follow-${lvl}-landed.png` });
    await p.waitForTimeout(2000);
    const fin = await p.evaluate((s) => { const el = [...document.querySelectorAll('.page:not(.flipped) .slot')].find(x => x.dataset.s === s); const r = el.getBoundingClientRect(); const a = document.getElementById('book-after').getBoundingClientRect(); return { slotTop: Math.round(r.top), afterBottom: Math.round(a.bottom), vh: innerHeight }; }, s);
    const samples = await p.evaluate(() => window.__samples);
    console.log(`${w}x${h} ${lvl}: sticker ${s} | scroll ${y0} -> ${samples.at(-1)?.y} | samples ${samples.length}, all visible: ${samples.every(x => x.vis)} | landed slot ${landed.top}-${landed.bottom} of ${landed.vh}, stuck: ${landed.has} | end: slotTop ${fin.slotTop}, Geplakt-panel bottom ${fin.afterBottom} of ${fin.vh}`);
    await p.close();
  }
  console.log('errors', errs); await b.close();
})();
