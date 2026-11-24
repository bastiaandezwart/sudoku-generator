const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 760 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/kids.html');
  // existing data: one 4x4 sticker, one earned on 6x6 but from the old (4x4) set, one junk
  await p.evaluate(() => localStorage.setItem('puzzelpret:v1', JSON.stringify({ stickers: [
    { s: '🐞', level: 'makkelijk', size: 4 }, { s: '🦄', level: 'moeilijk', size: 6 }, { s: '🎈' } ] })));
  await p.reload(); await p.waitForFunction(() => document.querySelectorAll('.cell').length > 0);
  const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('puzzelpret:v1')).stickers.map(x => x.s + x.size).join(' '));
  console.log('migrated:', kept);
  async function win() {
    const g = await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('puzzelpret:v1')).game.code.split('-'); return Sudoku.generate(+c[0], c[1], +c[2]); });
    for (let i = 0; i < g.puzzle.length; i++) if (!g.puzzle[i]) { await p.click(`.cell[data-index="${i}"]`); await p.click(`.pick >> nth=${g.solution[i] - 1}`); }
    await p.waitForSelector('#party:not([hidden])');
    const info = { s: await p.evaluate(() => document.getElementById('party-sticker').firstChild.textContent), text: await p.textContent('#party-sticker-text'), cls: await p.getAttribute('#party-sticker', 'class') };
    await p.waitForTimeout(3300);
    await p.click('#stick');
    await p.waitForSelector('#book-after:not([hidden])', { timeout: 9000 });
    info.label = await p.textContent('#page-label'); info.msg = await p.textContent('#book-after-text');
    return info;
  }
  console.log('4x4 win:', JSON.stringify(await win()));
  await p.click('#book-next-puzzle'); await p.waitForTimeout(400);
  await p.click('#size-6'); await p.waitForTimeout(500);
  const w6 = await win();
  console.log('6x6 win:', JSON.stringify(w6));
  await p.waitForTimeout(1500);
  await p.locator('.stickers').screenshot({ path: out + '/split-6.png' });
  // size switch -> 4x4 same level page, tabs
  await p.click('#book-sizes button[data-size="4"]'); await p.waitForTimeout(1300);
  console.log('after 4x4 switch:', await p.textContent('#page-label'));
  await p.click('.book-tab[data-level="moeilijk"]'); await p.waitForTimeout(1200);
  console.log('after ★★★ tab:', await p.textContent('#page-label'));
  await p.locator('.stickers').screenshot({ path: out + '/split-4hard.png' });
  await p.click('.book-tab[data-level="kaft"]'); await p.waitForTimeout(1500);
  await p.click('#book-sizes button[data-size="6"]'); await p.waitForTimeout(1500);
  console.log('cover -> 6x6 switch:', await p.textContent('#page-label'));
  console.log('scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth), 'errors', errs);
  await b.close();
})();
