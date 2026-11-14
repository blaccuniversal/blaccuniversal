#!/usr/bin/env python3
"""The Key Daily: builds the static pages from thekeydaily/data/*.json.

Run from the repo root:  python3 tools/thekeydaily/build.py
"""
import json, os, re, html, hashlib, datetime, shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SITE = os.path.join(ROOT, 'thekeydaily')
BASE = '/thekeydaily'
ORIGIN = 'https://blaccuniversal.com'
V = '6'  # asset version

CATS = [
    ('entertainment', 'Entertainment', 'Music, film, TV and the culture around them.'),
    ('sports', 'Sports', 'Football, F1 and the scores that matter.'),
    ('business', 'Business', 'Markets, money and the companies moving them.'),
    ('tech', 'Tech', 'AI, gadgets, space and the platforms we live on.'),
    ('politics', 'Politics', 'Power, policy and elections at home and abroad.'),
]
CAT = {k: (n, d) for k, n, d in CATS}
COL = {'entertainment': '#c2185b', 'sports': '#12a26b', 'business': '#c9a54a', 'tech': '#3b82f6', 'politics': '#d64545'}

stories = json.load(open(os.path.join(SITE, 'data', 'stories.json'), encoding='utf-8'))
feat = json.load(open(os.path.join(SITE, 'data', 'features.json'), encoding='utf-8'))
for s in stories:
    s['d'] = datetime.date.fromisoformat(s['date'])
stories.sort(key=lambda s: (s['d'], -s.get('featured', 99) if s.get('featured') else -100), reverse=True)
today = datetime.date.today()

def e(t): return html.escape(str(t), quote=True)
def url(s): return '%s/news/%s/' % (BASE, s['slug'])
def fdate(d): return '%d %s %d' % (d.day, d.strftime('%B'), d.year)
def sdate(d): return '%d %s' % (d.day, d.strftime('%b'))
def words(s): return sum(len(p.split()) for p in s['body'])
def mins(s): return max(1, round(words(s) / 200))

KEY_SVG = '<span class="kmark" aria-hidden="true"></span>'

def h(seed, n):
    return int(hashlib.md5((seed).encode()).hexdigest()[:8], 16) % n

def art(s, cls='art', shape='card'):
    """Typographic cover: category colour glow, fine gold rules, big figure.
    shape: card (16:10), square, wide (21:9, figure top-right), tall (4:5, figure top)."""
    c = COL[s['cat']]
    big = s['art']['big']; small = s['art'].get('small', '')
    seed = s['slug'] + shape
    n = max(1, len(big))
    W, H = {'card': (1600, 1000), 'square': (1000, 1000), 'wide': (2100, 900), 'tall': (1000, 1250)}[shape]
    if shape == 'card':
        fs = min(560, int(1450 / (n * 0.56))); x, anchor = 800, 'middle'; y = 520 + fs * 0.34; sy = min(930, y + 110); ss = 40
    elif shape == 'square':
        fs = min(470, int(900 / (n * 0.56))); x, anchor = 500, 'middle'; y = 520 + fs * 0.34; sy = min(930, y + 100); ss = 40
    elif shape == 'wide':
        fs = min(520, int(1150 / (n * 0.56))); x, anchor = 2010, 'end'; y = 120 + fs * 0.74; sy = y + 70; ss = 30
    else:
        fs = min(470, int(900 / (n * 0.56))); x, anchor = 500, 'middle'; y = 150 + fs * 0.74; sy = y + 80; ss = 34
    gx, gy = (70 + h(seed + 'x', 25), 10 + h(seed + 'y', 30)) if shape in ('wide', 'tall') else (20 + h(seed + 'x', 60), 15 + h(seed + 'y', 50))
    lines = ''.join('<line x1="%d" y1="0" x2="%d" y2="%d"/>' % (x0, x0 - int(H * .42), H) for x0 in range(140 + h(seed, 120), W + 600, 160))
    gid = 'g' + hashlib.md5(seed.encode()).hexdigest()[:6]
    par = {'wide': 'xMaxYMid slice', 'tall': 'xMidYMin slice'}.get(shape, 'xMidYMid slice')
    small_svg = '' if not small else '<text x="%d" y="%d" text-anchor="%s" class="art__small" font-size="%d" fill="#fff" fill-opacity=".7" letter-spacing="%d">%s</text>' % (
        x, sy, anchor, ss, int(ss * .22), e(small.upper()))
    return ('<svg class="%s" viewBox="0 0 %d %d" preserveAspectRatio="%s" role="img" aria-label="%s">'
            '<defs><radialGradient id="%s" cx="%d%%" cy="%d%%" r="75%%"><stop offset="0" stop-color="%s" stop-opacity=".95"/><stop offset=".45" stop-color="%s" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'
            '<linearGradient id="%sf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity=".55"/></linearGradient></defs>'
            '<rect width="%d" height="%d" fill="#050505"/><rect width="%d" height="%d" fill="url(#%s)"/>'
            '<g stroke="#c9a54a" stroke-opacity=".13" stroke-width="1.2">%s</g>'
            '<text x="%d" y="%d" text-anchor="%s" class="art__big" font-size="%d" fill="url(#%sf)">%s</text>%s'
            '</svg>') % (cls, W, H, par, e(s['title']), gid, gx, gy, c, c, gid, W, H, W, H, gid, lines, x, y, anchor, fs, gid, e(big), small_svg)

def pill(cat, link=True):
    n = CAT[cat][0]
    if link:
        return '<a class="pill pill--%s" href="%s/%s/">%s</a>' % (cat, BASE, cat, n)
    return '<span class="pill pill--%s">%s</span>' % (cat, n)

def meta(s):
    return '<span class="meta"><time datetime="%s">%s</time><i></i>%d min read<i></i>via %s</span>' % (s['date'], fdate(s['d']), mins(s), e(s['source']['name']))

def card(s, kind='row'):
    if kind == 'row':
        return ('<article class="crow"><a class="crow__art" href="%s" tabindex="-1" aria-hidden="true">%s</a>'
                '<div class="crow__b">%s<h3 class="crow__t"><a href="%s">%s</a></h3><p class="crow__d">%s</p>%s</div></article>') % (
            url(s), art(s), pill(s['cat']), url(s), e(s['title']), e(s['dek']), meta(s))
    if kind == 'tile':
        return ('<article class="tile"><a class="tile__art" href="%s" tabindex="-1" aria-hidden="true">%s</a>'
                '%s<h3 class="tile__t"><a href="%s">%s</a></h3>%s</article>') % (url(s), art(s), pill(s['cat']), url(s), e(s['title']), meta(s))
    if kind == 'big':
        return ('<article class="tbig"><a class="tbig__art" href="%s" tabindex="-1" aria-hidden="true">%s</a>'
                '<div class="tbig__b">%s<h3 class="tbig__t"><a href="%s">%s</a></h3><p class="tbig__d">%s</p>%s</div></article>') % (
            url(s), art(s), pill(s['cat']), url(s), e(s['title']), e(s['dek']), meta(s))
    if kind == 'mini':
        return ('<li class="mini"><a href="%s"><span class="mini__art">%s</span><span class="mini__b"><span class="mini__c c-%s">%s</span><b>%s</b><small>%s</small></span></a></li>') % (
            url(s), art(s, 'art', 'square'), s['cat'], CAT[s['cat']][0], e(s['title']), fdate(s['d']))

NAV = [('Latest', BASE + '/#latest')] + [(n, '%s/%s/' % (BASE, k)) for k, n, _ in CATS] + [('Top 7', BASE + '/#top7'), ('The Key Picks', BASE + '/#picks')]

def header(active=''):
    nav = ''.join('<a href="%s"%s>%s</a>' % (u, ' aria-current="page"' if n.lower() == active else '', n) for n, u in NAV)
    tick = ''.join('<a href="%s"><b class="c-%s">%s</b>%s</a>' % (url(s), s['cat'], CAT[s['cat']][0], e(s['title'])) for s in stories[:8])
    return ('<div class="util"><div class="wrap util__in"><span data-today>%s</span><a href="/" class="util__b"><svg viewBox="0 0 563 418" aria-hidden="true"><use href="#blacc"/></svg>A BLACC Universal publication</a></div></div>'
            '<header class="hdr"><div class="wrap hdr__in"><a class="logo" href="%s/" aria-label="The Key Daily home">%s<span>The Key Daily</span></a>'
            '<nav class="nav" aria-label="Sections">%s</nav>'
            '<button class="menu" type="button" data-menu aria-label="Open menu" aria-expanded="false"><i></i><i></i></button></div>'
            '<nav class="drawer" data-drawer hidden aria-label="Sections">%s</nav></header>'
            '%s') % (
        today.strftime('%A, ') + fdate(today), BASE, KEY_SVG, nav, nav,
        ('<div class="tick" aria-label="Latest headlines"><div class="wrap tick__in"><span class="tick__l">Latest</span><div class="tick__m"><div class="tick__r">%s%s</div></div></div></div>' % (tick, tick)) if stories else '')

SPRITE = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="blacc" viewBox="0 0 563 418"><g><rect x="0" y="0" width="128" height="128" rx="3"/><rect x="0" y="145" width="128" height="128" rx="3"/><rect x="145" y="145" width="128" height="128" rx="3"/><rect x="435" y="145" width="128" height="128" rx="3"/><rect x="0" y="290" width="128" height="128" rx="3"/><rect x="145" y="290" width="128" height="128" rx="3"/><rect x="290" y="290" width="128" height="128" rx="3"/><rect x="435" y="290" width="128" height="128" rx="3"/></g></symbol></svg>'

def footer():
    cats = ''.join('<a href="%s/%s/">%s</a>' % (BASE, k, n) for k, n, _ in CATS)
    return ('<footer class="ftr"><div class="wrap"><div class="ftr__top"><a class="logo logo--lg" href="%s/">%s<span>The Key Daily</span></a>'
            '<p class="ftr__tag">News, culture and the music that matters, every day.</p></div>'
            '<div class="ftr__cols"><div><h4>Sections</h4>%s</div><div><h4>Features</h4><a href="%s/#top7">Top 7 Countdown</a><a href="%s/#week">Artist of the Week</a><a href="%s/#week">Creative of the Week</a><a href="%s/#picks">The Key Picks</a></div>'
            '<div><h4>Listen</h4><a href="%s" target="_blank" rel="noopener">Spotify</a><a href="%s" target="_blank" rel="noopener">Apple Music</a></div></div>'
            '<div class="ftr__bot"><span>© %d The Key Daily</span><a href="/">A BLACC Universal publication</a></div></div></footer>') % (
        BASE, KEY_SVG, cats, BASE, BASE, BASE, BASE, feat['picks']['spotify'], feat['picks']['apple'], today.year)

def page(path, title, desc, body, active='', extra_head='', og_type='website'):
    full = ORIGIN + path
    doc = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
           '<title>%s</title>\n<meta name="description" content="%s">\n<link rel="canonical" href="%s">\n<meta name="theme-color" content="#000000">\n'
           '<meta property="og:site_name" content="The Key Daily"><meta property="og:type" content="%s"><meta property="og:title" content="%s"><meta property="og:description" content="%s"><meta property="og:url" content="%s"><meta name="twitter:card" content="summary_large_image">\n'
           '<link rel="icon" type="image/png" sizes="64x64" href="%s/icon-64.png">\n<link rel="apple-touch-icon" href="/thekeydaily/apple-touch-icon.png">\n<meta property="og:image" content="https://blaccuniversal.com/thekeydaily/icon-512.png">\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
           '<link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wdth,wght@0,75..100,300..800;1,75..100,300..800&amp;display=swap" rel="stylesheet">\n'
           '<link rel="stylesheet" href="/assets/thekeydaily/tkd.css?v=%s">\n%s</head>\n<body>\n%s\n%s\n<main id="main">\n%s\n</main>\n%s\n<script src="/assets/thekeydaily/tkd.js?v=%s" defer></script>\n</body>\n</html>\n') % (
        e(title), e(desc), full, og_type, e(title), e(desc), full, BASE, V, extra_head, SPRITE, header(active), body, footer(), V)
    out = os.path.join(ROOT, path.strip('/'), 'index.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(doc)

def picks_block(compact=False):
    p = feat['picks']
    if compact:
        return ('<section class="side side--picks"><p class="eyebrow eyebrow--gold">Playlist</p><h3 class="side__t">The Key Picks</h3><p class="side__p">%s</p>'
                '<div class="lbtns"><a class="btn btn--sm" href="%s" target="_blank" rel="noopener">Spotify</a><a class="btn btn--sm btn--ghost" href="%s" target="_blank" rel="noopener">Apple Music</a></div></section>') % (e(p['blurb']), p['spotify'], p['apple'])
    return ('<section class="picks" id="picks"><div class="wrap picks__in"><div class="picks__copy"><p class="eyebrow eyebrow--gold">Weekly playlist</p><h2 class="h2">The Key Picks</h2><p class="lead">%s</p>'
            '<div class="lbtns"><a class="btn" href="%s" target="_blank" rel="noopener">Open in Spotify</a><a class="btn btn--ghost" href="%s" target="_blank" rel="noopener">Open in Apple Music</a></div></div>'
            '<div class="picks__player"><div class="seg" role="tablist" aria-label="Choose a service"><button role="tab" aria-selected="true" data-svc="spotify">Spotify</button><button role="tab" aria-selected="false" data-svc="apple">Apple Music</button></div>'
            '<div class="player" data-player="spotify"><iframe title="The Key Picks on Spotify" src="%s" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>'
            '<div class="player" data-player="apple" hidden><iframe title="The Key Picks on Apple Music" data-src="%s" loading="lazy" allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"></iframe></div>'
            '</div></div></section>') % (e(p['blurb']), p['spotify'], p['apple'], p['spotify_embed'], p['apple_embed'])

def top7_block():
    t = feat['top7']
    if t['entries']:
        ent = t['entries'][:7]
        rows = ''.join(('<li class="t7__r"><span class="t7__n">%02d</span><span class="t7__s"><b>%s</b><small>%s</small></span>'
                        '%s</li>') % (i + 1, e(x['title']), e(x['artist']),
                        ('<a class="t7__play" href="%s" target="_blank" rel="noopener" aria-label="Play %s on Spotify"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg></a>' % (e(x['spotify']), e(x['title']))) if x.get('spotify') else '')
                       for i, x in enumerate(ent))
        top = ent[0]
        lead = ('<p class="lead">Seven songs, counted down every Friday. This week, <b>%s</b> by %s takes the top spot.</p>') % (e(top['title']), e(top['artist']))
        when = ' · ' + fdate(datetime.date.fromisoformat(t['date'])) if t.get('date') else ''
        return ('<section class="t7" id="top7"><div class="wrap t7__grid"><div class="t7__head"><p class="eyebrow eyebrow--gold">%s%s</p><h2 class="h2">The Top 7</h2>%s'
                '<div class="lbtns"><a class="btn" href="%s" target="_blank" rel="noopener">Play No. 1 on Spotify</a><a class="btn btn--ghost" href="#picks">The Key Picks</a></div></div>'
                '<ol class="t7__list">%s</ol></div></section>') % (e(t.get('edition') or 'This week'), when, lead, e(top.get('spotify', '#')), rows)
    nxt = datetime.date.fromisoformat(t['next'])
    ghosts = ''.join('<li class="t7__r t7__r--ghost"><span class="t7__n">%02d</span><span class="t7__bar"></span></li>' % i for i in range(7, 0, -1))
    return ('<section class="t7" id="top7"><div class="wrap t7__grid"><div class="t7__head"><p class="eyebrow eyebrow--gold">Weekly countdown · Fridays</p><h2 class="h2">The Top 7</h2>'
            '<p class="lead">Seven songs, counted down every Friday. The first countdown drops on <b>Friday, %s</b>.</p>'
            '<a class="btn btn--ghost" href="#picks">Listen to The Key Picks</a></div><ol class="t7__list" aria-label="Countdown positions">%s</ol></div></section>') % (fdate(nxt), ghosts)

def week_block():
    def one(kind, label, d):
        if d:
            return ('<article class="wk wk--on"><p class="eyebrow eyebrow--gold">%s</p><h3 class="wk__t">%s</h3><p class="wk__p">%s</p>%s</article>') % (
                label, e(d['name']), e(d.get('blurb', '')), ('<a class="btn btn--sm" href="%s">Read more</a>' % e(d['link'])) if d.get('link') else '')
        nxt = fdate(datetime.date.fromisoformat(feat['top7']['next']))
        return ('<article class="wk"><p class="eyebrow eyebrow--gold">%s</p><h3 class="wk__t">Revealed Friday</h3>'
                '<p class="wk__p">%s</p><p class="wk__date">Next pick: %s</p></article>') % (label, 'Every week we spotlight one artist whose music deserves your full attention.' if kind == 'artist' else 'Every week we celebrate one creative, from designers and directors to photographers and stylists, shaping the culture.', nxt)
    return '<section class="week" id="week"><div class="wrap week__grid">%s%s</div></section>' % (one('artist', 'Artist of the Week', feat.get('artist')), one('creative', 'Creative of the Week', feat.get('creative')))

# ---------------- home ----------------
SOON = ('<div class="soon"><p class="eyebrow eyebrow--gold">%s</p><h2 class="soon__t">Stories are on the way.</h2>'
        '<p class="lead">Our first reports in entertainment, sports, business, tech and politics land here soon.</p></div>')

def build_home():
    if not stories:
        secs = ''.join('<a class="sec" href="%s/%s/"><span class="sec__dot c-bg-%s"></span><span><b>%s</b><small>%s</small></span></a>' % (BASE, k, k, n, d) for k, n, d in CATS)
        body = ('<section class="mast"><div class="wrap mast__in"><span class="mast__key" aria-hidden="true"></span><h1 class="mast__h">The key to<br><span>what matters</span><br>right now.</h1></div></section>'
                '<section class="wrap split" id="latest"><div class="split__main">%s</div><aside class="split__side"><section class="side"><p class="eyebrow">Sections</p>%s</section></aside></section>'
                '%s%s%s') % (SOON % 'Latest', secs, top7_block(), week_block(), picks_block())
        page(BASE + '/', 'The Key Daily · News, culture and music',
             'The Key Daily: entertainment, sports, business, tech and politics, plus the Top 7 countdown, Artist and Creative of the Week, and The Key Picks playlist.', body, 'latest')
        return
    lead = sorted([s for s in stories if s.get('featured')], key=lambda s: s['featured'])[:3]
    slides = ''.join(('<article class="slide%s" data-slide><a href="%s" class="slide__a">%s<span class="slide__shade"></span>'
                      '<span class="slide__b">%s<span class="slide__t">%s</span><span class="slide__d">%s</span>%s</span></a></article>') % (
        ' is-on' if i == 0 else '', url(s), art(s, 'art art--wide', 'wide') + art(s, 'art art--tall', 'tall'), pill(s['cat'], False), e(s['title']), e(s['dek']), meta(s)) for i, s in enumerate(lead))
    dots = ''.join('<button type="button" data-dot="%d" aria-label="Story %d"%s></button>' % (i, i + 1, ' aria-current="true"' if i == 0 else '') for i in range(len(lead)))
    lead_ids = {s['slug'] for s in lead}
    latest = [s for s in stories if s['slug'] not in lead_ids][:7]
    picks = [s for s in stories if s['slug'] not in lead_ids and s not in latest][:5] or stories[-5:]
    secs = ''.join('<a class="sec" href="%s/%s/"><span class="sec__dot c-bg-%s"></span><span><b>%s</b><small>%s</small></span><em>%d</em></a>' % (
        BASE, k, k, n, d, sum(1 for s in stories if s['cat'] == k)) for k, n, d in CATS)
    rows = ''
    for k, n, d in CATS:
        ss = [s for s in stories if s['cat'] == k]
        if not ss: continue
        rows += ('<section class="row"><div class="row__head"><h2 class="h3"><span class="c-%s">%s</span></h2><a class="more" href="%s/%s/">All %s</a></div>'
                 '<div class="row__grid">%s<div class="row__side">%s</div></div></section>') % (
            k, n, BASE, k, n.lower(), card(ss[0], 'big'), ''.join(card(s, 'tile') for s in ss[1:4]))
    body = ('<section class="mast"><div class="wrap mast__in"><span class="mast__key" aria-hidden="true"></span><h1 class="mast__h">The key to<br><span>what matters</span><br>right now.</h1></div></section>'
            '<section class="hero"><div class="wrap"><div class="slider" data-slider>%s<div class="dots">%s</div></div></div></section>'
            '<section class="wrap split" id="latest"><div class="split__main"><div class="row__head"><h2 class="h3">Latest</h2></div>%s</div>'
            '<aside class="split__side"><section class="side"><p class="eyebrow">Editor’s picks</p><ul class="minis">%s</ul></section>'
            '<section class="side"><p class="eyebrow">Sections</p>%s</section>%s</aside></section>'
            '%s%s%s<div class="wrap rows">%s</div>') % (
        slides, dots, ''.join(card(s) for s in latest), ''.join(card(s, 'mini') for s in picks), secs, picks_block(True),
        top7_block(), week_block(), picks_block(), rows)
    page(BASE + '/', 'The Key Daily · News, culture and music',
         'The Key Daily: the latest in entertainment, sports, business, tech and politics, plus the Top 7 countdown, Artist and Creative of the Week, and The Key Picks playlist.', body, 'latest')

# ---------------- sections ----------------
def build_cats():
    for k, n, d in CATS:
        ss = [s for s in stories if s['cat'] == k]
        if not ss:
            body = ('<section class="mast mast--cat"><div class="wrap"><p class="eyebrow c-%s">Section</p><h1 class="mast__h mast__h--cat">%s</h1><p class="lead">%s</p></div></section>'
                    '<div class="wrap catwrap">%s</div>%s') % (k, n, d, SOON % n, picks_block())
            page('%s/%s/' % (BASE, k), '%s · The Key Daily' % n, '%s from The Key Daily. %s' % (n, d), body, n.lower())
            continue
        body = ('<section class="mast mast--cat"><div class="wrap"><p class="eyebrow c-%s">Section</p><h1 class="mast__h mast__h--cat">%s</h1><p class="lead">%s</p></div></section>'
                '<div class="wrap catwrap"><div class="catlead">%s</div><div class="grid3">%s</div></div>%s') % (
            k, n, d, card(ss[0], 'big'), ''.join(card(s, 'tile') for s in ss[1:]), picks_block())
        page('%s/%s/' % (BASE, k), '%s · The Key Daily' % n, '%s news from The Key Daily. %s' % (n, d), body, n.lower())

# ---------------- stories ----------------
def build_stories():
    newsdir = os.path.join(SITE, 'news')
    if os.path.isdir(newsdir): shutil.rmtree(newsdir)
    for s in stories:
        more = [x for x in stories if x['cat'] == s['cat'] and x['slug'] != s['slug']][:3]
        if len(more) < 3: more += [x for x in stories if x['slug'] != s['slug'] and x not in more][:3 - len(more)]
        src = '<a href="%s" target="_blank" rel="noopener">%s</a>' % (e(s['source']['url']), e(s['source']['name']))
        also = ''.join('<li><a href="%s" target="_blank" rel="noopener">%s</a></li>' % (e(a['url']), e(a['name'])) for a in s.get('also', []))
        paras = ''.join('<p>%s</p>' % e(p) for p in s['body'])
        ld = json.dumps({'@context': 'https://schema.org', '@type': 'NewsArticle', 'headline': s['title'], 'description': s['dek'],
                         'datePublished': s['date'], 'publisher': {'@type': 'Organization', 'name': 'The Key Daily'},
                         'mainEntityOfPage': ORIGIN + url(s)}, ensure_ascii=False)
        body = ('<article class="story"><header class="wrap story__head">%s<h1 class="story__t">%s</h1><p class="story__d">%s</p>'
                '<p class="story__meta"><span>By The Key Daily Desk</span><i></i><time datetime="%s">%s</time><i></i><span>%d min read</span></p></header>'
                '<div class="wrap story__art">%s</div>'
                '<div class="wrap story__cols"><div class="story__body">%s'
                '<aside class="src"><p class="eyebrow">Source</p><p>Reported by %s. We summarised it in our own words.</p>%s'
                '<a class="btn btn--sm btn--ghost" href="%s" target="_blank" rel="noopener">Read the original report</a></aside></div>'
                '<aside class="story__side">%s</aside></div>'
                '<section class="wrap related"><div class="row__head"><h2 class="h3">More stories</h2></div><div class="grid3">%s</div></section></article>') % (
            pill(s['cat']), e(s['title']), e(s['dek']), s['date'], fdate(s['d']), mins(s), art(s, 'art art--story'), paras, src,
            ('<p class="src__also">Also reported by:</p><ul>%s</ul>' % also) if also else '', e(s['source']['url']), picks_block(True),
            ''.join(card(x, 'tile') for x in more))
        page(url(s), '%s · The Key Daily' % s['title'], s['dek'], body, CAT[s['cat']][0].lower(),
             '<script type="application/ld+json">%s</script>\n' % ld.replace('</', '<\\/'), 'article')

def build_icon():
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#000"/>'
           '<g fill="none" stroke="#c9a54a" stroke-width="5"><circle cx="21" cy="32" r="11"/><path d="M32 32h22M47 32v8M54 32v6" stroke-linecap="square"/></g></svg>')
    open(os.path.join(SITE, 'icon.svg'), 'w').write(svg)

def build_sitemap_entries():
    urls = [BASE + '/'] + ['%s/%s/' % (BASE, k) for k, _, _ in CATS] + [url(s) for s in stories]
    sm = os.path.join(ROOT, 'sitemap.xml')
    x = open(sm, encoding='utf-8').read()
    x = re.sub(r'\n?  <!-- thekeydaily -->.*?<!-- /thekeydaily -->', '', x, flags=re.S)
    block = '\n  <!-- thekeydaily -->\n' + '\n'.join('  <url><loc>%s%s</loc></url>' % (ORIGIN, u) for u in urls) + '\n  <!-- /thekeydaily -->'
    x = x.replace('\n</urlset>', block + '\n</urlset>')
    open(sm, 'w', encoding='utf-8').write(x)

build_home(); build_cats(); build_stories(); build_sitemap_entries()
print('built', len(stories), 'stories')
