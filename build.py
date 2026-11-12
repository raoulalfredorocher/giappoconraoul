#!/usr/bin/env python3
"""Costruisce index.html e sw.js dai file in src/. Uso: python3 build.py"""
import hashlib
from pathlib import Path

src = Path(__file__).parent / 'src'
read = lambda name: (src / name).read_text(encoding='utf-8')

core = read('core.js').replace('/*__SD__*/null', read('strokes.json')).replace('/*__RECOG__*/', read('recog.js'))
app = '<script>\n' + core + read('views.js') + '</script>\n'
page = read('page.html').replace('<!--HEAD-->', read('head.html')).replace('<!--APP-->', app)
version = hashlib.sha1(page.encode()).hexdigest()[:8]

root = Path(__file__).parent
(root / 'index.html').write_text(page.replace('__VER__', version), encoding='utf-8')
(root / 'sw.js').write_text(read('sw.tpl.js').replace('__VER__', version), encoding='utf-8')
print(f'index.html {len(page)} byte, versione {version}')
