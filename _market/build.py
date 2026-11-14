#!/usr/bin/env python3
"""Builds the BLACC Universal Market (unlisted) from _market/market.json.

    python3 _market/build.py

Pages written:
  /market/                      doors to the five categories
  /market/<category>/           grid of stores (artists, brands) in that category
  /market/<category>/<store>/   the store: hero, then a grid of its products
To add a store: add it to market.json under "stores", run this script.
A product with "url" links to that page; without one, it opens an order request form.
"""
import json, os, re, html, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '_market')
OUT = os.path.join(ROOT, 'market')
data = json.load(open(os.path.join(SRC, 'market.json'), encoding='utf-8'))
CATS = data['categories']
STORES = data['stores']
VER = '2'

def esc(s): return html.escape(str(s), quote=True)

SV = 'width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
ICON = {
  'merch': '<svg ' + SV + '><g class="ani-hanger"><path d="M10 6.2a2 2 0 1 1 2.7 1.9c-.4.15-.7.5-.7.95V10"/><path d="M12 10 3.4 16.4a.9.9 0 0 0 .55 1.6h16.1a.9.9 0 0 0 .55-1.6L12 10z"/></g></svg>',
  'music': '<svg ' + SV + '><g class="mk-ani-note"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></g></svg>',
  'art': '<svg ' + SV + '><path d="M12 3a9 9 0 0 0 0 18c.95 0 1.6-.7 1.6-1.55 0-.45-.17-.8-.43-1.1-.26-.3-.42-.65-.42-1.1 0-.88.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5C21 6.8 17 3 12 3z"/><circle class="ani-dot" cx="7.5" cy="11.5" r="1" fill="currentColor"/><circle class="ani-dot" cx="9.6" cy="7.4" r="1" fill="currentColor"/><circle class="ani-dot" cx="14.4" cy="7.4" r="1" fill="currentColor"/><circle class="ani-dot" cx="17.2" cy="11" r="1" fill="currentColor"/></svg>',
  'tech': '<svg ' + SV + '><rect x="6" y="6" width="12" height="12" rx="1.5"/><rect class="mk-ani-core" x="9.5" y="9.5" width="5" height="5" rx=".5"/><path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/></svg>',
  'events': '<svg ' + SV + '><g class="mk-ani-ticket"><path d="M3.5 8.5V6.5a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v2a2.5 2.5 0 0 0 0 5v2a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-2a2.5 2.5 0 0 0 0-5z"/><path d="M14.5 5.5v1.5M14.5 10v1.5M14.5 14.5v2" /></g></svg>',
}
BLACC = '<svg viewBox="0 0 563 418" aria-hidden="true"><g fill="#ffffff"><rect x="0" y="0" width="128" height="128" rx="3"/><rect x="0" y="145" width="128" height="128" rx="3"/><rect x="145" y="145" width="128" height="128" rx="3"/><rect x="435" y="145" width="128" height="128" rx="3"/><rect x="0" y="290" width="128" height="128" rx="3"/><rect x="145" y="290" width="128" height="128" rx="3"/><rect x="290" y="290" width="128" height="128" rx="3"/><rect x="435" y="290" width="128" height="128" rx="3"/></g></svg>'
SOC = {
  'instagram': ('Instagram', '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.25"/><circle cx="12" cy="12" r="4.25"/><circle cx="17.4" cy="6.6" r=".6" fill="currentColor" stroke="none"/></svg>'),
  'x': ('X', '<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'),
  'youtube': ('YouTube', '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.2 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none"/></svg>'),
  'tiktok': ('TikTok', '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.6 2.4 4.4 5 4.6"/></svg>'),
  'facebook': ('Facebook', '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 21v-7.5h2.7l.4-3.2h-3.1V8.4c0-.9.3-1.6 1.6-1.6h1.7V4a21 21 0 0 0-2.5-.1c-2.5 0-4.1 1.5-4.1 4.2v2.3H8.4v3.2h2.8V21"/></svg>'),
  'spotify': ('Spotify', '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.25"/><path d="M7.5 9.5c3-1 6.5-.7 9.2.8M8 12.6c2.5-.7 5.3-.4 7.4.8M8.6 15.4c2-.5 3.9-.3 5.6.6"/></svg>'),
  'web': ('Website', '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.25"/><path d="M2.75 12h18.5M12 2.75c2.6 2.6 3.8 5.7 3.8 9.25S14.6 18.65 12 21.25C9.4 18.65 8.2 15.55 8.2 12S9.4 5.35 12 2.75z"/></svg>'),
}
ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>'

# page shell borrowed from the shop
shop = open(os.path.join(ROOT, 'shop', 'merch', 'index.html'), encoding='utf-8').read()
HEAD = shop[:shop.index('  <main')]
TAIL = shop[shop.index('  </main>') + len('  </main>\n'):]
# drop the tee's order panel from the shell
TAIL = re.sub(r'  <div class="build" id="order".*?\n  </div>\n(?=  <div class="build"|  <div class="menu"|<script|  <footer|</div>)', '', TAIL, flags=re.S)
BAR = re.search(r'      <div class="shop-bar">.*?</div></div></div>\n', shop, re.S).group(0)
NOTIFY = re.search(r'      <div class="shop__more">.*?\n      </div>\n      </div>\n', shop, re.S).group(0)

def shell(title, desc, path, body, og='/assets/img/og.jpg'):
    h = HEAD
    h = re.sub(r'<title>.*?</title>', '<title>' + esc(title) + '</title>', h)
    h = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1) + esc(desc), h)
    h = re.sub(r'(<meta property="og:description" content=")[^"]*', lambda m: m.group(1) + esc(desc), h)
    h = re.sub(r'(<meta property="og:title" content=")[^"]*', lambda m: m.group(1) + esc(title), h)
    h = re.sub(r'(<link rel="canonical" href=")[^"]*', lambda m: m.group(1) + 'https://blaccuniversal.com' + path, h)
    h = re.sub(r'(<meta property="og:url" content=")[^"]*', lambda m: m.group(1) + 'https://blaccuniversal.com' + path, h)
    h = re.sub(r'(<meta property="og:image" content=")[^"]*', lambda m: m.group(1) + 'https://blaccuniversal.com' + og, h)
    h = re.sub(r'(<meta name="twitter:image" content=")[^"]*', lambda m: m.group(1) + 'https://blaccuniversal.com' + og, h)
    h = re.sub(r'<meta name="robots"[^>]*>\n?', '', h)
    h = h.replace('<meta name="viewport"', '<meta name="robots" content="noindex, nofollow">\n<meta name="viewport"', 1)
    h = h.replace('</head>', '<link rel="stylesheet" href="/assets/css/market.css?v=' + VER + '">\n</head>', 1)
    t = TAIL.replace('</body>', '<script src="/assets/js/market.js?v=' + VER + '" defer></script>\n</body>', 1)
    return h + body + t

def write(path, s):
    p = os.path.join(ROOT, path.strip('/'), 'index.html')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(s)

def plural(n, w, ws=None): return '%d %s' % (n, w if n == 1 else (ws or w + 's'))

def tabs(cur):
    return '<nav class="shop-tabs" aria-label="Market categories">' + ''.join(
        '<a class="shop-tab' + (' is-on' if c['slug'] == cur else '') + '" href="/market/' + c['slug'] + '/" aria-label="' + c['name'] + '" title="' + c['name'] + '"' + (' aria-current="page"' if c['slug'] == cur else '') + '>' + ICON[c['slug']] + '</a>'
        for c in CATS) + '</nav>'

def bar(n, word, words=None):
    return BAR.replace(re.search(r'<span class="shop-bar__count">[^<]*</span>', BAR).group(0), '<span class="shop-bar__count">' + plural(n, word, words) + '</span>')

def notify(page, hint):
    s = NOTIFY.replace('value="shop-merch"', 'value="' + page + '"')
    return re.sub(r'<p class="notify__hint">[^<]*</p>', '<p class="notify__hint">' + esc(hint) + '</p>', s)

def avatar(st, cls):
    if st.get('logo'):
        return '<span class="' + cls + ' mk-logo">' + BLACC + '</span>'
    if not st.get('avatar'):
        return '<span class="' + cls + ' mk-mono"><b>' + esc(st['name']) + '</b></span>'
    return '<span class="' + cls + '"><img src="' + esc(st['avatar']) + '" alt="" loading="lazy"></span>'

# ---------- /market/ ----------
for old in ('market',):
    if os.path.isdir(OUT): shutil.rmtree(OUT)
doors = ''.join(
    '<a class="shop-door mk-door" href="/market/' + c['slug'] + '/" style="--d:' + str(i) + '"><span class="shop-door__icon">' + ICON[c['slug']] + '</span><span class="shop-door__label">' + c['name'] + '</span><span class="mk-door__n">' + (plural(sum(1 for s in STORES if s['cat'] == c['slug']), 'store') if any(s['cat'] == c['slug'] for s in STORES) else 'Soon') + '</span></a>'
    for i, c in enumerate(CATS))
write('/market/', shell('Market — BLACC Universal', 'Merch, music, art, tech and events from creatives and brands.', '/market/',
  '  <main class="shop shop--home gutter mk" id="top">\n    <div class="wrap">\n      <p class="eyebrow shop-home__eyebrow">Market</p>\n      <h1 class="sr-only">Market</h1>\n      <div class="shop-doors mk-doors">' + doors + '</div>\n    </div>\n  </main>\n'))

# ---------- categories + stores ----------
for c in CATS:
    sts = [s for s in STORES if s['cat'] == c['slug']]
    head = '      <div class="shop__head">\n        <p class="eyebrow"><a class="crumb" href="/market/">Market</a></p>\n        <h1 class="shop__title">' + c['name'] + '.</h1>\n        <p class="mk-desc">' + esc(c['desc']) + '</p>\n        ' + tabs(c['slug']) + '\n      </div>\n'
    if sts:
        cards = ''.join(
            '<a class="shop-card mk-store" href="/market/' + c['slug'] + '/' + s['slug'] + '/">' + avatar(s, 'shop-card__img mk-store__img') +
            '<span class="shop-card__name">' + esc(s['name']) + '</span><span class="shop-card__meta">' + esc(s.get('tag', '')) + '</span><span class="shop-card__price">' + plural(len(s.get('items', [])), 'item') + '</span></a>'
            for s in sts)
        body = head + bar(len(sts), 'store') + '      <div class="shop-cards" data-cards data-view-mode="grid">\n          ' + cards + '\n      </div>\n' + notify('market-' + c['slug'], 'More ' + c['name'].lower() + ' stores are joining. Get notified first.')
    else:
        body = head + '      <div class="mk-empty"><span class="mk-empty__icon">' + ICON[c['slug']] + '</span><p>' + esc(c['empty']) + '</p></div>\n' + notify('market-' + c['slug'], 'Get notified when the first ' + c['name'].lower() + ' stores open.')
    write('/market/' + c['slug'] + '/', shell(c['name'] + ' · Market — BLACC Universal', c['desc'], '/market/' + c['slug'] + '/',
      '  <main class="shop gutter mk" id="top">\n    <div class="wrap">\n' + body + '    </div>\n  </main>\n'))

    for s in sts:
        items = s.get('items', [])
        links = ''.join('<a class="icon-btn" href="' + esc(u) + '" target="_blank" rel="noopener" aria-label="' + SOC[k][0] + '" title="' + SOC[k][0] + '">' + SOC[k][1] + '</a>' for k, u in s.get('links', {}).items() if k in SOC)
        cards = ''
        for it in items:
            pic = '<img src="' + esc(it['img']) + '" alt="" loading="lazy">' if it.get('img') else '<span class="mk-cover"><small>' + esc(s['name']) + '</small><b>' + esc(it['name']) + '</b><small>' + esc(it.get('kind', '')) + '</small></span>'
            inner = ('<span class="shop-card__img">' + pic + '</span><span class="shop-card__name">' + esc(it['name']) + '</span>'
                     '<span class="shop-card__meta">' + esc(it.get('meta', '')) + '</span><span class="shop-card__price">' + esc(it.get('price', '')) + (' ' + ARROW if it.get('ext') else '') + '</span>')
            if it.get('url'):
                cards += '<a class="shop-card mk-item" href="' + esc(it['url']) + '"' + (' target="_blank" rel="noopener"' if it.get('ext') else '') + '>' + inner + '</a>'
            else:
                payload = json.dumps({'store': s['name'], 'name': it['name'], 'price': it.get('price', ''), 'meta': it.get('meta', ''), 'img': it['img'], 'desc': it.get('desc', '')}, ensure_ascii=False)
                cards += '<button class="shop-card mk-item" type="button" data-mk-item="' + esc(payload) + '">' + inner + '</button>'
        hero = ('  <section class="mk-hero gutter' + (' mk-hero--blur' if s.get('heroBlur') else '') + '">\n' + ('    <div class="mk-hero__bg" aria-hidden="true"><img src="' + esc(s['hero']) + '" alt=""' + (' style="object-position:' + esc(s['heroPos']) + '"' if s.get('heroPos') else '') + '></div>\n' if s.get('hero') else '    <div class="mk-hero__bg mk-hero__bg--type" aria-hidden="true"><span>' + esc(s['name']) + '</span></div>\n') +
                '    <div class="wrap mk-hero__in">\n      <p class="eyebrow"><a class="crumb" href="/market/">Market</a> <span class="mk-sep">/</span> <a class="crumb" href="/market/' + c['slug'] + '/">' + c['name'] + '</a></p>\n'
                '      <div class="mk-hero__id">' + avatar(s, 'mk-hero__av') + '<div><h1 class="mk-hero__name">' + esc(s['name']) + '</h1><p class="mk-hero__tag">' + esc(s.get('tag', '')) + '</p></div></div>\n'
                '      <p class="mk-hero__bio">' + esc(s.get('bio', '')) + '</p>\n'
                '      <div class="mk-hero__row">' + ('<div class="mk-hero__soc">' + links + '</div>' if links else '') + '<span class="mk-hero__n">' + plural(len(items), 'item') + '</span></div>\n    </div>\n  </section>\n')
        body = hero + '  <main class="shop gutter mk mk--store" id="top">\n    <div class="wrap">\n' + bar(len(items), 'item') + '      <div class="shop-cards" data-cards data-view-mode="grid">\n          ' + cards + '\n      </div>\n    </div>\n  </main>\n'
        write('/market/' + c['slug'] + '/' + s['slug'] + '/', shell(s['name'] + ' · ' + c['name'] + ' · Market — BLACC Universal', s.get('bio', ''), '/market/' + c['slug'] + '/' + s['slug'] + '/', body))

print('Market built:', len(CATS), 'categories,', len(STORES), 'stores')
