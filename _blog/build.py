#!/usr/bin/env python3
"""Builds /blog/ from _blog/posts/*.md (front matter, then paragraphs; '> ' = pull quote, '## ' = heading)."""
import os, re, glob, html, datetime, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VER = '12'
SHELL = open(os.path.join(ROOT, '_blog/shell.html')).read()
SITE = 'https://blaccuniversal.com'
e = lambda s: html.escape(s, quote=True)

def parse(p):
    raw = open(p).read()
    fm, body = raw.split('\n---\n', 1)
    m = dict(l.split(': ', 1) for l in fm.strip().split('\n'))
    m['date'] = datetime.date.fromisoformat(m['date'])
    m['blocks'] = [b.strip() for b in re.split(r'\n\s*\n', body.strip()) if b.strip()]
    m['words'] = len(re.findall(r"\S+", body))
    m['mins'] = max(1, round(m['words'] / 230))
    return m

def nice(d): return d.strftime('%-d %B %Y')
def inline(s):
    s = e(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<!\*)\*(?!\*)(.+?)\*', r'<em>\1</em>', s)
    return s

def render_body(blocks):
    out = []
    for i, b in enumerate(blocks):
        if b.startswith('> '): out.append('<blockquote class="bl-quote"><p>%s</p></blockquote>' % inline(b[2:]))
        elif b.startswith('## '): out.append('<h2>%s</h2>' % inline(b[3:]))
        else: out.append('<p%s>%s</p>' % (' class="bl-lede"' if i == 0 else '', inline(b).replace('\n', '<br>')))
    return '\n        '.join(out)

ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
BACK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
SH = {
 'x': ('Share on X', '<path fill="currentColor" stroke="none" transform="translate(2.4 2.4) scale(.8)" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>'),
 'whatsapp': ('Share on WhatsApp', '<path d="M3.5 20.5l1.2-4.1a8.6 8.6 0 1 1 3.3 3.1z"/><path d="M9.2 8.6c.2 2.9 2.6 5.3 5.5 5.6l1.1-1.2-1.8-1-.8.7a4.4 4.4 0 0 1-2.4-2.4l.7-.8-1-1.8z"/>'),
 'facebook': ('Share on Facebook', '<path d="M14.5 21v-7.5h2.7l.4-3.2h-3.1V8.4c0-.9.3-1.6 1.6-1.6h1.7V4a21 21 0 0 0-2.5-.1c-2.5 0-4.1 1.5-4.1 4.2v2.3H8.4v3.2h2.8V21"/>'),
 'linkedin': ('Share on LinkedIn', '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M8 10.5V16M8 7.6v.1M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.3-2.6s2.2.9 2.2 2.6V16"/>'),
 'copy': ('Copy link', '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
}
def share(url, title):
    from urllib.parse import quote
    u, t = quote(url, safe=''), quote(title, safe='')
    href = {'x': 'https://x.com/intent/post?text=%s&url=%s' % (t, u), 'whatsapp': 'https://wa.me/?text=%s%%20%s' % (t, u),
            'facebook': 'https://www.facebook.com/sharer/sharer.php?u=%s' % u, 'linkedin': 'https://www.linkedin.com/sharing/share-offsite/?url=%s' % u}
    out = []
    for k, (lab, path) in SH.items():
        svg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % path
        if k == 'copy': out.append('<button class="bl-share__b" type="button" data-copy="%s" aria-label="%s">%s</button>' % (e(url), lab, svg))
        else: out.append('<a class="bl-share__b" href="%s" target="_blank" rel="noopener" aria-label="%s">%s</a>' % (e(href[k]), lab, svg))
    return '<div class="bl-share" aria-label="Share">' + ''.join(out) + '<span class="bl-share__ok" role="status" hidden>Link copied</span></div>'

def page(path, title, desc, url, main, ogtype='website', headx='', scripts='', og=None):
    s = SHELL
    if og: s = s.replace('https://blaccuniversal.com/assets/img/og.jpg', og)
    for k, v in {'{{TITLE}}': e(title), '{{DESC}}': e(desc), '{{URL}}': url, '{{OGTYPE}}': ogtype, '{{VER}}': VER, '{{HEADX}}': headx, '{{MAIN}}': main, '{{SCRIPTS}}': scripts}.items():
        s = s.replace(k, v)
    full = os.path.join(ROOT, path); os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w').write(s)

posts = sorted((parse(p) for p in glob.glob(os.path.join(ROOT, '_blog/posts/*.md'))), key=lambda m: m['date'], reverse=True)
JS = '<script src="/blog/blog.js?v=%s" defer></script>\n' % VER
FEED = '\n<link rel="alternate" type="application/rss+xml" title="BLACC Universal Blog" href="/blog/feed.xml">'

def meta(m):
    return '<span>%s</span><span aria-hidden="true">·</span><time datetime="%s">%s</time><span aria-hidden="true">·</span><span>%d min read</span>' % (e(m['author']), m['date'].isoformat(), nice(m['date']), m['mins'])

# posts
POSTPAGES = []
POP = '''
  <div class="bl-pop is-in" data-pop-static>
    <div class="bl-pop__card" tabindex="-1" role="dialog" aria-modal="true" aria-label="Blog post">
      <div class="bl-pop__bar"><b>Blog</b><a class="bl-pop__x" href="/blog/" data-pop-close aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></a><div class="bl-progress bl-progress--pop" aria-hidden="true"><i data-progress></i></div></div>
      <div class="bl-pop__scroll" data-pop-scroll><div class="bl-pop__body" data-pop-body>
      %s
      </div></div>
    </div>
  </div>'''
for i, m in enumerate(posts):
    url = '%s/blog/%s/' % (SITE, m['slug'])
    nxt = posts[i + 1] if i + 1 < len(posts) else None
    more = ('<a class="bl-next" href="/blog/%s/"><span class="eyebrow">Next read</span><b>%s</b>%s</a>' % (nxt['slug'], e(nxt['title']), ARROW)) if nxt else ''
    ld = json.dumps({'@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': m['title'], 'datePublished': m['date'].isoformat(),
                     'author': {'@type': 'Person', 'name': m['author']}, 'publisher': {'@type': 'Organization', 'name': 'BLACC Universal'}, 'mainEntityOfPage': url}, ensure_ascii=False)
    cov = ('<figure class="bl-cover"><img src="/blog/img/%s-lg.webp" srcset="/blog/img/%s-sm.webp 800w, /blog/img/%s-lg.webp 1200w" sizes="(max-width:1000px) 100vw, 1000px" alt="%s" fetchpriority="high"></figure>\n      ' % (m['cover'], m['cover'], m['cover'], e(m.get('coverAlt', '')))) if m.get('cover') else ''
    main = '''  <div class="bl-progress" aria-hidden="true"><i data-progress></i></div>
  <main class="bl bl--post gutter" id="top">
    <article class="bl-art">
      <header class="bl-art__head">
        <a class="bl-back" href="/blog/">%s Blog</a>
        <p class="eyebrow">%s</p>
        <h1 class="bl-art__title">%s</h1>
        <p class="bl-meta">%s</p>
      </header>
      %s<div class="bl-body" data-body>
        %s
      </div>
      <footer class="bl-art__foot">
        <div class="bl-by"><span class="bl-by__av" aria-hidden="true">%s</span><span><small>Written by</small><b>%s</b></span></div>
        %s
      </footer>
      <section class="bl-cm" data-comments data-post="%s" aria-labelledby="cm-%s">
        <h2 class="bl-cm__h" id="cm-%s"><span data-cm-count>Comments</span></h2>
        <form class="bl-cm__form" data-cm-form novalidate>
          <input class="bl-cm__in" name="name" maxlength="40" autocomplete="nickname" placeholder="Your name" aria-label="Your name" required>
          <textarea class="bl-cm__in bl-cm__ta" name="body" maxlength="1000" rows="3" placeholder="Join the conversation" aria-label="Your comment" required></textarea>
          <input class="bl-cm__hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="bl-cm__row"><span class="bl-cm__note" data-cm-note>Be kind. No links.</span><button class="bl-cm__go" type="submit">Post</button></div>
        </form>
        <ol class="bl-cm__list" data-cm-list></ol>
        <p class="bl-cm__empty" data-cm-empty hidden>No comments yet. Start the conversation.</p>
      </section>
      %s
    </article>
  </main>''' % (BACK, e(m['category']), e(m['title']), meta(m), cov, render_body(m['blocks']), e(''.join(w[0] for w in m['author'].split()[:2]).upper()), e(m['author']), share(url, m['title']), m['slug'], m['slug'], m['slug'], more)
    art = main[main.index('<article'):main.index('</article>') + 10]
    art = re.sub(r'\s*<a class="bl-back"[^>]*>.*?</a>', '', art, flags=re.S)
    POSTPAGES.append(lambda idx, m=m, url=url, art=art, ld=ld: page('blog/%s/index.html' % m['slug'], m['title'] + ' · BLACC Universal', m['excerpt'], url, idx + POP % art, 'article',
         FEED + '\n<meta property="article:published_time" content="%s">\n<meta name="author" content="%s">\n<script type="application/ld+json">%s</script>' % (m['date'].isoformat(), e(m['author']), ld.replace('</', '<\\/')), JS, (SITE + '/blog/img/%s-og.jpg' % m['cover']) if m.get('cover') else None))

# index
VIEWS = [('list', 'List', '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01" stroke-width="2.4"/>'),
         ('grid', 'Grid', '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>'),
         ('swipe', 'Swipe', '<rect x="7" y="4" width="10" height="16" rx="1.5"/><path d="M4 7v10M20 7v10"/>')]
def card(m):
    img = ('<span class="bl-card__img"><img src="/blog/img/%s-sm.webp" alt="" loading="lazy" decoding="async"></span>' % m['cover']) if m.get('cover') else '<span class="bl-card__img bl-card__img--none" aria-hidden="true"><b>%s</b></span>' % e(m['category'])
    return '''<li class="bl-item"><a class="bl-card" href="/blog/%s/">
          %s
          <span class="bl-card__txt">
            <span class="eyebrow">%s</span>
            <span class="bl-card__t">%s</span>
            <span class="bl-card__x">%s</span>
            <span class="bl-meta">%s</span>
          </span>
        </a></li>''' % (m['slug'], img, e(m['category']), e(m['title']), e(m['excerpt']), meta(m))
seg = ''.join('<button type="button" data-view="%s" aria-pressed="false" aria-label="%s view"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg><span>%s</span></button>' % (k, l, ic, l) for k, l, ic in VIEWS)
main = '''  <main class="bl bl--index gutter" id="top">
    <header class="bl-hero">
      <p class="eyebrow">Blog</p>
      <h1 class="bl-hero__t">Conversation and opinions of the world around us.</h1>
    </header>
    <div class="bl-bar">
      <p class="bl-bar__n">%d %s</p>
      <div class="bl-views" role="group" aria-label="Layout">%s</div>
    </div>
    <section class="bl-feed" data-feed data-view="grid" aria-label="Posts">
      <ul class="bl-items" data-track>
        %s
      </ul>
      <div class="bl-nav" aria-hidden="true"><button type="button" data-swipe="-1" tabindex="-1">%s</button><button type="button" data-swipe="1" tabindex="-1">%s</button></div>
    </section>
  </main>''' % (len(posts), 'post' if len(posts) == 1 else 'posts', seg, '\n        '.join(card(m) for m in posts), BACK, ARROW)
for f in POSTPAGES: f(main)
page('blog/index.html', 'Blog · BLACC Universal', 'Conversation and opinions of the world around us, from BLACC Universal.', SITE + '/blog/', main, 'website', FEED, JS, (SITE + '/blog/img/%s-og.jpg' % posts[0]['cover']) if posts and posts[0].get('cover') else None)

# feed
items = ''.join('<item><title>%s</title><link>%s/blog/%s/</link><guid>%s/blog/%s/</guid><pubDate>%s</pubDate><dc:creator>%s</dc:creator><description>%s</description></item>' % (
    e(m['title']), SITE, m['slug'], SITE, m['slug'], m['date'].strftime('%a, %d %b %Y 09:00:00 +0100'), e(m['author']), e(m['excerpt'])) for m in posts)
open(os.path.join(ROOT, 'blog/feed.xml'), 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>BLACC Universal Blog</title><link>%s/blog/</link><description>Conversation and opinions of the world around us.</description><language>en</language>%s</channel></rss>\n' % (SITE, items))
print('built', len(posts), 'posts')
