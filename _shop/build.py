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

SV = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
IC = {
  'prev': '<svg ' + SV + '><path d="M6 5v14"/><path d="M19 5.5v13L9 12z" fill="currentColor" stroke="none"/></svg>',
  'next': '<svg ' + SV + '><path d="M18 5v14"/><path d="M5 5.5v13L15 12z" fill="currentColor" stroke="none"/></svg>',
  'back': '<svg ' + SV + '><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4v4.5H9"/><text x="12" y="15.2" font-size="6.5" font-family="system-ui,sans-serif" font-weight="600" text-anchor="middle" fill="currentColor" stroke="none">10</text></svg>',
  'fwd': '<svg ' + SV + '><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4v4.5H15"/><text x="12" y="15.2" font-size="6.5" font-family="system-ui,sans-serif" font-weight="600" text-anchor="middle" fill="currentColor" stroke="none">10</text></svg>',
  'play': '<svg class="ic-play" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg><svg class="ic-pause" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>',
  'swipe': '<svg ' + SV + '><rect x="7" y="5" width="10" height="14" rx="1"/><path d="M3.5 7v10M20.5 7v10"/></svg>',
  'list': '<svg ' + SV + '><rect x="3.5" y="5" width="4" height="4" rx=".5"/><rect x="3.5" y="15" width="4" height="4" rx=".5"/><path d="M10.5 7h10M10.5 17h10"/></svg>',
  'grid': '<svg ' + SV + '><rect x="4" y="4" width="6.5" height="6.5" rx=".5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx=".5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx=".5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx=".5"/></svg>',
  'left': '<svg ' + SV + '><path d="M15 5l-7 7 7 7"/></svg>',
  'right': '<svg ' + SV + '><path d="M9 5l7 7-7 7"/></svg>',
}

DL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/></svg>'
LINK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4l-1.1 1.1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.1-1.1"/></svg>'
SPLAY = '<svg class="ic-play" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg><svg class="ic-pause" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>'

def tape_html(it):
    t = it['tape']
    rows = ''
    for i, tr in enumerate(it['tracks']):
        fname = '%02d Bemshima - %s.mp3' % (i + 1, tr['title'].replace("'", '').replace('’', ''))
        rows += ('<li class="tape__row" data-bp-row="' + str(i) + '"><button class="tape__play" type="button" data-bp-play="' + str(i) + '" aria-label="Play ' + esc(tr['title']) + '">' + SPLAY + '</button>'
                 '<span class="tape__n">%02d</span>' % (i + 1) + '<span class="tape__t">' + esc(tr['title']) + '<i class="tape__line" aria-hidden="true"><b></b></i></span>'
                 '<span class="tape__bpm">' + str(round(float(tr['bpm']))) + ' BPM</span><span class="tape__d">' + tr['dur'] + '</span>'
                 '<a class="tape__dl" href="' + tr['src'] + '" download="' + esc(fname) + '" aria-label="Download ' + esc(tr['title']) + '" title="Download">' + DL + '</a></li>')
    return ('<section class="tape" aria-label="' + esc(it['name']) + ', free beat tape" id="' + it['slug'] + '" data-item>\n'
            '          <img class="tape__cover" src="' + it['cover'] + '" alt="' + esc(t['alt']) + '" width="' + str(t['w']) + '" height="' + str(t['h']) + '">\n'
            '          <div class="tape__info">\n            <p class="product__badge">Free beat tape</p>\n'
            '            <div class="item-head"><h2 class="product__name">' + esc(it['name']) + '</h2><button class="share-btn" type="button" data-share="{{share}}" data-share-title="' + esc(it['title']) + '">' + LINK + '<span>Copy link</span></button></div>\n'
            '            <p class="beat__meta">' + esc(t['meta']) + '</p>\n'
            '            <p class="tape__terms">Free for non-profit use. Credit: <b>Prod. by Bemshima</b>. For releases that make money, buy a lease.</p>\n'
            '            <a class="btn tape__get" href="' + t['zip'] + '" download="' + esc(t['zipname']) + '">' + DL + 'Download the tape · ' + t['zipsize'] + '</a>\n'
            '            {{player}}\n            <ol class="tape__list">' + rows + '</ol>\n          </div>\n        </section>')

def queue(items):
    q = []
    for it in items:
        url = '/shop/' + it['section'] + '/' + it['slug'] + '/'
        for t in it.get('tracks', []):
            meta = ((t['genre'] + ' · ') if t.get('genre') else '') + str(t['bpm']) + ' BPM'
            q.append({'src': t['src'], 'title': t['title'], 'cover': it.get('cover', it['card_img']), 'meta': meta,
                      'from': it.get('player_from', it['name']), 'cta': it.get('cta', 'View'), 'href': url, 'dur': t.get('dur', '0:00')})
    return q

def bplayer(q, compact=False):
    if not q: return ''
    f = q[0]
    btn = lambda a, lab, ic, cls='': '<button class="bp__btn' + cls + '" type="button" ' + a + ' aria-label="' + lab + '" title="' + lab + '">' + IC[ic] + '</button>'
    ctl = ('<div class="bp__ctl">' + btn('data-bp-prev', 'Previous track', 'prev') + btn('data-bp-back', 'Back 10 seconds', 'back')
           + btn('data-bp-toggle', 'Play', 'play', ' bp__play') + btn('data-bp-fwd', 'Forward 10 seconds', 'fwd') + btn('data-bp-next', 'Next track', 'next')
           + ('' if compact else '<span class="bp__count" data-bp-count>01 / ' + ('%02d' % len(q)) + '</span>') + '</div>')
    seek = ('<div class="bp__seek" data-bp-seek role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span data-bp-line></span><i data-bp-knob></i></div>'
            '<p class="bp__time"><span data-bp-cur>0:00</span><span data-bp-dur>' + f['dur'] + '</span></p>')
    if compact:
        inner = ('<div class="bp__body"><p class="bp__now"><span data-bp-title>' + esc(f['title']) + '</span><span data-bp-meta>' + esc(f['meta']) + '</span></p>' + seek + ctl + '</div>')
    else:
        inner = ('<img class="bp__cover" data-bp-cover src="' + f['cover'] + '" alt="">'
                 '<div class="bp__body"><p class="eyebrow" data-bp-from>' + esc(f['from']) + '</p><h2 class="bp__title" data-bp-title>' + esc(f['title']) + '</h2>'
                 '<p class="bp__meta" data-bp-meta>' + esc(f['meta']) + '</p>' + seek + ctl
                 + '<a class="bp__cta" data-bp-cta href="' + f['href'] + '">' + esc(f['cta']) + ' →</a></div>')
    return ('<section class="bp' + (' bp--compact' if compact else '') + '" data-bp data-queue="' + esc(json.dumps(q, ensure_ascii=False)) + '" aria-label="Player">' + inner + '</section>')

def viewbar(n):
    b = lambda v, lab: '<button class="shop-view__btn" type="button" data-view="' + v + '" aria-label="' + lab + '" title="' + lab + '">' + IC[v] + '</button>'
    return ('      <div class="shop-bar"><span class="shop-bar__count">' + str(n) + (' item' if n == 1 else ' items') + '</span>'
            '<div class="shop-bar__right"><div class="shop-swipe-nav" data-swipe-nav><button type="button" data-swipe="-1" aria-label="Previous">' + IC['left'] + '</button><button type="button" data-swipe="1" aria-label="Next">' + IC['right'] + '</button></div>'
            '<div class="shop-view" role="group" aria-label="View">' + b('swipe', 'Swipe') + b('list', 'List') + b('grid', 'Grid') + '</div></div></div>\n')

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
    return ('          <a class="shop-card shop-card--' + it['section'] + '" href="' + url + '"><span class="shop-card__img"><img src="' + it['card_img'] + '" alt="" loading="lazy"></span>'
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
        q = queue(items)
        if q: body += '      ' + bplayer(q) + '\n'
        body += viewbar(len(items)) + '      <div class="shop-cards" data-cards data-view-mode="swipe">\n' + ''.join(card(it) for it in items) + '      </div>\n'
    if s.get('soon'):
        body += '      <p class="shop-soon">' + esc(s['soon']) + '</p>\n'
    body += notify(s['slug'], s['notify']).replace('class="shop__more"', 'class="shop__more' + (' shop__more--soon' if not items else '') + '"') + '    </div>\n'
    write('/shop/' + s['slug'] + '/', page(s['name'] + ' — Shop | BLACC Universal', s['desc'], '/shop/' + s['slug'] + '/', '/assets/img/og.jpg', body))

# ---- /shop/<section>/<item>/
for it in ITEMS:
    s = SEC[it['section']]
    url = '/shop/' + s['slug'] + '/' + it['slug'] + '/'
    part = (tape_html(it) if it.get('tape') else P(it['partial'])).replace('{{share}}', SITE + url).replace('{{player}}', bplayer(queue([it]), compact=True))
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
