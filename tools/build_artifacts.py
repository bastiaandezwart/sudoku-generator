#!/usr/bin/env python3
"""Maakt publiceerbare kopieën van index.html en kids.html voor de claude.ai-artifacts.

Artifacts krijgen bij publiceren zelf een <!doctype>/<head>/<body>-skelet, dus dit script
haalt dat weg, laat <title>, fonts en <style> staan en vervangt de onderlinge links
(index.html <-> kids.html) door de artifact-URL's.

Gebruik:  python3 tools/build_artifacts.py <uitvoermap>
Daarna publiceren met de Artifact-tool (zie OVERDRACHT.md):
  <uitvoermap>/site/sudokumaker.html  + files {"sudoku.js": ...}
  <uitvoermap>/kids/puzzelpret.html   + files {"sudoku.js": ..., "assets/kaft-evi.webp": ..., "assets/kaft-evi.jpg": ...}
"""
import os, re, shutil, sys

SUDOKUMAKER_URL = 'https://claude.ai/artifact/RW6UevvC3q7egpsp7uVQPF'
PUZZELPRET_URL = 'https://claude.ai/artifact/AVAazgAjGyJeGG4yeXMkPx'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def strip(src, out, links):
    s = open(os.path.join(ROOT, src), encoding='utf-8').read()
    head = re.search(r'<head>(.*?)</head>', s, re.S).group(1)
    body = re.search(r'<body>(.*?)</body>', s, re.S).group(1)
    head = re.sub(r'<meta charset[^>]*>\s*', '', head)
    head = re.sub(r'<meta name="viewport"[^>]*>\s*', '', head)
    for a, b in links.items():
        if a not in body:
            sys.exit('Link niet gevonden in %s: %s' % (src, a))
        body = body.replace(a, b)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(head.strip() + '\n' + body.strip() + '\n')
    print('  ' + out)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    dest = os.path.abspath(sys.argv[1])
    strip('index.html', os.path.join(dest, 'site', 'sudokumaker.html'),
          {'<a href="kids.html">': '<a href="%s" target="_blank" rel="noopener">' % PUZZELPRET_URL})
    strip('kids.html', os.path.join(dest, 'kids', 'puzzelpret.html'),
          {'<a href="index.html">': '<a href="%s" target="_blank" rel="noopener">' % SUDOKUMAKER_URL})
    for sub in ('site', 'kids'):
        shutil.copy(os.path.join(ROOT, 'sudoku.js'), os.path.join(dest, sub, 'sudoku.js'))
    os.makedirs(os.path.join(dest, 'kids', 'assets'), exist_ok=True)
    for f in ('kaft-evi.webp', 'kaft-evi.jpg'):
        shutil.copy(os.path.join(ROOT, 'assets', f), os.path.join(dest, 'kids', 'assets', f))
    print('Klaar. Publiceer de twee .html-bestanden met hun files (zie OVERDRACHT.md).')


if __name__ == '__main__':
    main()
