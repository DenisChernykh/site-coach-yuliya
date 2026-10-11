from pathlib import Path
from html import escape
import argparse
import json

parser = argparse.ArgumentParser(description='Build the click-through design preview.')
parser.add_argument('--check', action='store_true', help='Check generated HTML without writing files.')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1] / 'design' / 'prototype'
data = json.loads((root / 'navigation.json').read_text())
pages = {item['slug']: item['title'] for item in data}
stale = []
for slug, title in pages.items():
    links = ''.join(
        f'<a href="{name}.html"' + (' aria-current="page"' if name == slug else '') + f'>{label}</a>'
        for name, label in [('index', 'Главная'), ('coaching', 'Коучинг'), ('journal', 'Журнал')]
    )
    html = f'''<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)} — Юля Валишина · макет</title><link rel="stylesheet" href="prototype.css"></head>
<body data-page="{slug}">
<nav class="preview-bar" aria-label="Страницы макета"><span>ПРЕВЬЮ МАКЕТА</span>{links}</nav>
<main id="board"></main>
<dialog id="menu" aria-label="Навигация">
<div class="menu-heading">Юля Валишина<button id="close-menu" aria-label="Закрыть меню">×</button></div>
<nav class="menu-links" aria-label="Мобильное меню">
<a href="index.html">Главная</a><a href="index.html#about">Обо мне</a><a href="index.html#approach">Мой подход</a>
<a href="coaching.html">Индивидуальный коучинг</a><a href="index.html#art">Арт-практики</a><a href="journal.html">Журнал</a>
<a class="cta" href="index.html#contact">Бесплатно познакомиться</a>
</nav></dialog>
<script src="prototype.js"></script>
</body></html>'''
    target = root / f'{slug}.html'
    if args.check:
        if not target.is_file() or target.read_text(encoding='utf-8') != html:
            stale.append(target.name)
    else:
        target.write_text(html, encoding='utf-8')
if stale:
    parser.exit(1, f'Stale HTML: {", ".join(stale)}. Run make build.\n')
print(f'{"Checked" if args.check else "Built"} {len(pages)} linked preview pages')
