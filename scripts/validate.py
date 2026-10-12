"""Validate the design handoff without reading the encrypted .pen source."""

from html.parser import HTMLParser
import json
from pathlib import Path
import struct
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
PROTOTYPE = ROOT / 'design' / 'prototype'
EXPORTS = ROOT / 'design' / 'exports'
errors = []
scaled_exports = set()


def check(condition, message):
    if not condition:
        errors.append(message)


def check_png(path, expected):
    if not path.is_file():
        errors.append(f'Missing PNG: {path.relative_to(ROOT)}')
        return
    with path.open('rb') as stream:
        header = stream.read(24)
    if len(header) != 24 or header[:8] != b'\x89PNG\r\n\x1a\n' or header[12:16] != b'IHDR':
        errors.append(f'Invalid PNG header: {path.relative_to(ROOT)}')
        return
    actual = struct.unpack('>II', header[16:24])
    if actual != expected:
        scale = 8192 / max(expected)
        capped = max(expected) > 8192 and max(actual) == 8192
        proportional = all(abs(a - e * scale) <= 1 for a, e in zip(actual, expected))
        check(capped and proportional,
              f'PNG dimensions: {path.name}: {actual}, expected {expected}')
        if capped and proportional:
            scaled_exports.add(path.name)


screens = json.loads((ROOT / 'design' / 'screens.json').read_text(encoding='utf-8'))
pages = json.loads((PROTOTYPE / 'navigation.json').read_text(encoding='utf-8'))
check((ROOT / 'yuliya-valishina.pen').is_file(), 'Missing editable design source')
check([s['number'] for s in screens] == [f'{i:02d}' for i in range(len(screens))],
      'Screen numbers must be sequential from 00')
check(len({s['id'] for s in screens}) == len(screens), 'Duplicate pen.dev frame IDs')
for screen in screens:
    if screen.get('export'):
        expected = tuple(screen.get('exportSize', [screen['width'], screen['height']]))
        check_png(EXPORTS / screen['export'], expected)

variants = {(p['slug'], p['mode']): p for p in pages}
check(len(variants) == len(pages), 'Duplicate page variants')
slugs = {p['slug'] for p in pages}
for slug in slugs:
    check({p['mode'] for p in pages if p['slug'] == slug} == {'desktop', 'mobile'},
          f'Missing desktop/mobile pair: {slug}')


def check_href(href, page):
    url = urlsplit(href)
    if url.scheme or url.netloc:
        return
    target = url.path or f'{page["slug"]}.html'
    file = (PROTOTYPE / target).resolve()
    check(file.is_relative_to(ROOT) and file.is_file(), f'Missing local target: {href}')
    if url.fragment:
        dest = variants.get((Path(target).stem, page['mode']))
        check(dest is not None and url.fragment in {a['id'] for a in dest['anchors']},
              f'Missing anchor in {page["mode"]}: {href}')


class ResourceParser(HTMLParser):
    def __init__(self, page):
        super().__init__()
        self.page = page

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and attrs.get('href'):
            check_href(attrs['href'], self.page)
        elif tag in {'script', 'link'}:
            path = attrs.get('src') if tag == 'script' else attrs.get('href')
            if path and not urlsplit(path).scheme:
                check((PROTOTYPE / path).is_file(), f'Missing HTML resource: {path}')


link_count = 0
for page in pages:
    check_png(EXPORTS / f'{page["image"]}-{page["mode"]}.png',
              (page['width'], page['height']))
    anchors = page['anchors']
    check(len({a['id'] for a in anchors}) == len(anchors),
          f'Duplicate anchors: {page["slug"]}/{page["mode"]}')
    for anchor in anchors:
        check(0 <= anchor['y'] <= page['height'], f'Anchor outside screen: {anchor["id"]}')
    for link in page['links']:
        link_count += 1
        check(link['width'] > 0 and link['height'] > 0 and link['x'] >= 0 and link['y'] >= 0
              and link['x'] + link['width'] <= page['width'] + 1
              and link['y'] + link['height'] <= page['height'] + 1,
              f'Link outside screen: {page["slug"]}/{page["mode"]}: {link["label"]}')
        check(bool(link.get('label')), f'Link without accessible name: {page["slug"]}')
        if link.get('href'):
            check_href(link['href'], page)
        else:
            check(link.get('action') == 'menu', f'Unknown link action: {link}')
    html = PROTOTYPE / f'{page["slug"]}.html'
    if html.is_file():
        ResourceParser(page).feed(html.read_text(encoding='utf-8'))
    else:
        errors.append(f'Missing HTML page: {html.name}')

if errors:
    for error in sorted(set(errors)):
        print(f'ERROR: {error}')
    raise SystemExit(1)
print(f'Validated {len(screens)} screens, {len(slugs)} pages, '
      f'{len(pages)} responsive variants and {link_count} hotspots')
if scaled_exports:
    print(f'Proportional 8192 px export limit: {", ".join(sorted(scaled_exports))}')
