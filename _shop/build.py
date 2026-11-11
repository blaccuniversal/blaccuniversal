#!/usr/bin/env python3
"""Builds the BLACC Universal shop pages from _shop/products.json and _shop/partials/.

    python3 _shop/build.py

Pages written:
  /shop/                         icon doors to each section
  /shop/<section>/               list of items in that section
  /shop/<section>/<item>/        the item itself (order form, player, etc.)
  /shop/<old-slug>/              redirects from the first short links
To add a product: write its markup in _shop/partials/<name>.html, add it to products.json, run this script.
"""
import json, os, re, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '_shop')
SITE = 'https://blaccuniversal.com'
P = lambda n: open(os.path.join(SRC, 'partials', n + '.html'), encoding='utf-8').read()
data = json.load(open(os.path.join(SRC, 'products.json'), encoding='utf-8'))
SECTIONS = data['sections']
ITEMS = data['items']
SEC = {s['slug']: s for s in SECTIONS}

def esc(s): return html.escape(s, quote=True)

def page(title, desc, path, img, body, ogtype='website'):
    head = P('head')
    for k, v in {'title': esc(title), 'desc': esc(desc), 'url': SITE + path, 'img': SITE + img, 'ogtype': ogtype}.items():
        head = head.replace('{{' + k + '}}', v)
    return head + P('top') + body + '  </main>\n' + P('tail')

def write(path, content):
    full = os.path.join(ROOT, path.strip('/'), 'index.html')
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8').write(content)
    print('wrote', path)

def notify(section, hint):
    n = P('notify')
    n = re.sub(r'<p class="notify__hint">.*?</p>', '<p class="notify__hint">' + esc(hint) + '</p>', n, count=1)
    n = n.replace('<input type="hidden" name="page" value="shop">', '<input type="hidden" name="page" value="shop-' + section + '">')
    return '      <div class="shop__more">\n      ' + n + '      </div>\n'

def nav(current):
    out = '        <nav class="shop-tabs" aria-label="Shop sections">\n'
    for s in SECTIONS:
        on = s['slug'] == current
        out += ('          <a class="shop-tab' + (' is-on' if on else '') + '" href="/shop/' + s['slug'] + '/" aria-label="' + s['name'] + '" title="' + s['name'] + '"'
                + (' aria-current="page"' if on else '') + '>' + P(s['icon']) + '</a>\n')
    return out + '        </nav>\n'

def card(it):
    url = '/shop/' + it['section'] + '/' + it['slug'] + '/'
    return ('          <a class="shop-card" href="' + url + '"><span class="shop-card__img"><img src="' + it['card_img'] + '" alt="" loading="lazy"></span>'
            '<span class="shop-card__name">' + esc(it['name']) + '</span><span class="shop-card__meta">' + esc(it['card_meta']) + '</span>'
            '<span class="shop-card__price">' + esc(it['card_price']) + '</span></a>\n')

# ---- /shop/ : the doors
redirects = {'merch': '/shop/merch/', 'art': '/shop/frames/', 'frames': '/shop/frames/', 'beats': '/shop/instrumentals/', 'instrumentals': '/shop/instrumentals/'}
for it in ITEMS:
    redirects[it['slug']] = '/shop/' + it['section'] + '/' + it['slug'] + '/'
doors = ''
for k, s in enumerate(SECTIONS):
    doors += ('        <a class="shop-door" href="/shop/' + s['slug'] + '/" style="--d:' + str(k) + '"><span class="shop-door__icon">' + P(s['icon']) + '</span>'
              '<span class="shop-door__label">' + s['name'] + '</span></a>\n')
body = ('  <main class="shop shop--home gutter" id="top" data-shop-redirects="' + esc(json.dumps(redirects)) + '">\n    <div class="wrap">\n'
        '      <p class="eyebrow shop-home__eyebrow">Shop</p>\n      <h1 class="sr-only">Shop</h1>\n'
        '      <div class="shop-doors">\n' + doors + '      </div>\n    </div>\n')
write('/shop/', page('Shop — BLACC Universal', 'Merch, frames and instrumentals from BLACC Universal.', '/shop/', '/assets/img/og.jpg', body))

# ---- /shop/<section>/
for s in SECTIONS:
    items = [it for it in ITEMS if it['section'] == s['slug']]
    body = ('  <main class="shop gutter" id="top">\n    <div class="wrap">\n      <div class="shop__head">\n'
            '        <p class="eyebrow"><a class="crumb" href="/shop/">Shop</a></p>\n        <h1 class="shop__title">' + esc(s['title']) + '</h1>\n'
            + nav(s['slug']) + '      </div>\n')
    if items:
        body += '      <div class="shop-cards">\n' + ''.join(card(it) for it in items) + '      </div>\n'
    if s.get('soon'):
        body += '      <p class="shop-soon">' + esc(s['soon']) + '</p>\n'
    body += notify(s['slug'], s['notify']).replace('class="shop__more"', 'class="shop__more' + (' shop__more--soon' if not items else '') + '"') + '    </div>\n'
    write('/shop/' + s['slug'] + '/', page(s['name'] + ' — Shop | BLACC Universal', s['desc'], '/shop/' + s['slug'] + '/', '/assets/img/og.jpg', body))

# ---- /shop/<section>/<item>/
for it in ITEMS:
    s = SEC[it['section']]
    url = '/shop/' + s['slug'] + '/' + it['slug'] + '/'
    part = P(it['partial']).replace('{{share}}', SITE + url)
    part = re.sub(r'<h2 class="product__name">(.*?)</h2>', r'<h1 class="product__name">\1</h1>', part, count=1)
    body = ('  <main class="shop shop--item gutter" id="top">\n    <div class="wrap">\n'
            '      <p class="eyebrow crumbs"><a class="crumb" href="/shop/">Shop</a><span aria-hidden="true">/</span><a class="crumb" href="/shop/' + s['slug'] + '/">' + s['name'] + '</a></p>\n'
            '      ' + part + '\n' + notify(s['slug'], s['notify']) + '    </div>\n')
    write(url, page(it['title'], it['desc'], url, it['img'], body, ogtype='product'))
    # old short link
    if it.get('old'):
        old = '/shop/' + it['old'] + '/'
        if old != url:
            csp = re.search(r'<meta http-equiv="Content-Security-Policy"[^>]*>', P('head')).group(0)
            write(old, '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' + csp + '\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
                  '<title>' + esc(it['title']) + '</title>\n<link rel="canonical" href="' + SITE + url + '">\n'
                  '<meta property="og:title" content="' + esc(it['title']) + '">\n<meta property="og:description" content="' + esc(it['desc']) + '">\n'
                  '<meta property="og:url" content="' + SITE + url + '">\n<meta property="og:image" content="' + SITE + it['img'] + '">\n'
                  '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="' + SITE + it['img'] + '">\n'
                  '<meta name="robots" content="noindex">\n<meta http-equiv="refresh" content="0; url=' + url + '">\n'
                  '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#fff;font:15px system-ui,sans-serif}a{color:#fff}</style>\n'
                  '</head>\n<body><p><a href="' + url + '">' + esc(it['name']) + '</a></p></body>\n</html>\n')

# ---- sitemap
sm_path = os.path.join(ROOT, 'sitemap.xml')
sm = open(sm_path, encoding='utf-8').read()
sm = re.sub(r'  <url><loc>https://blaccuniversal\.com/shop/[^<]*</loc></url>\n', '', sm)
urls = ['/shop/'] + ['/shop/' + s['slug'] + '/' for s in SECTIONS] + ['/shop/' + it['section'] + '/' + it['slug'] + '/' for it in ITEMS]
sm = sm.replace('</urlset>', ''.join('  <url><loc>' + SITE + u + '</loc></url>\n' for u in urls) + '</urlset>')
open(sm_path, 'w', encoding='utf-8').write(sm)
print('sitemap updated')
