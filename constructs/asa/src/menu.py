# ÀṢÀ menu data -> HTML for /constructs/asa/index.html
# Prices are in thousands of naira as on the printed menu (10.0 = ₦10,000; 5.5 = ₦5,500).
import re, html, os
def N(p): return '₦{:,}'.format(round(p*1000))
def e(s): return html.escape(s, quote=True)

NIGERIAN = [
 ('Appetizers', [
  ('Chicken Suya Satay',10,'Chicken skewers marinated in suya spices, coconut milk and groundnut sauce, grilled with a subtle smoky heat'),
  ('Beef Suya Bruschetta',10,'Suya-spiced beef on toasted crusty bread with fresh tomato relish and herbs'),
  ('Plantain Croquettes',8,'Golden croquettes of seasoned ripe plantain, filled with melted mozzarella'),
  ('Asun Stuffed Plantain',10,'Fried plantain filled with smoky, spicy asun, onions and peppers'),
  ('Gizdodo',8,'Peppered chicken gizzard tossed with fried plantain, bell peppers and onions'),
  ('Àsà Peppered Snails',15,'Snails in spicy peppered sauce with bell peppers, onions and parsley'),
  ('Cheese Stuffed Puff-Puff',8,'Soft puff-puff filled with melted cheese and a gentle kick of spice'),
  ('Àsà Peppered Wings',10,'Chicken wings in spicy peppered sauce with bell peppers, onions and parsley'),
  ('Asun',12,'Fire-roasted goat meat in a vibrant pepper sauce with sautéed onions and spices'),
  ('Àsà Peppered Prawns',18,'Prawns in spicy peppered sauce with bell peppers, onions and parsley'),
 ]),
 ('Pepper Soups', [
  ('Naija Pepper Soup Ramen (Prawn)',18,'Japanese-style noodles in a spicy Nigerian pepper soup broth, topped with prawns'),
  ('Catfish Pepper Soup',12,'Fresh catfish simmered in spicy, aromatic pepper soup broth'),
  ('Goat Meat Pepper Soup',10,'Goat meat simmered in spicy, aromatic pepper soup broth'),
  ('Turkey Pepper Soup',10,'Turkey simmered in spicy, aromatic pepper soup broth'),
  ('Seafood Pepper Soup',18,'A medley of fresh seafood in a rich, comforting pepper soup broth'),
  ('Tilapia Pepper Soup',12,'Fresh tilapia simmered in spicy, aromatic pepper soup broth'),
 ]),
 ('Mains', [
  ('Seafood Ofada Rice Mix',26,'Al dente ofada rice folded into a rich ayamase sauce, topped with scent leaves and onions'),
  ('Seafood Native Rice',26,'Basmati rice layered with prawns, fish, calamari and stockfish in Nigerian pepper spices'),
  ('Goat Meat Native Pasta',16,'Spiced goat meat layered with al dente pasta and traditional Nigerian herbs'),
  ('Naija Prawn Pesto Pasta',18,'Scent leaf and cashew pesto with parmesan, topped with grilled suya prawns'),
  ('House Chicken & Chips',12,'Oven-grilled chicken in spicy Nigerian pepper sauce with crispy fries'),
  ('Seafood Fried Rice',18,'Basmati rice stir-fried with prawns, calamari, fish and vegetables'),
  ('All-In-One Jollof Rice',12,'Smoky party jollof with peppered chicken, fried plantain, moi moi and coleslaw'),
  ('All-In-One Fried Rice',12,'Basmati fried rice with peppered chicken, fried plantain, moi moi and coleslaw'),
 ]),
 ('Soups', [
  ('Fisherman Soup Pot',50,'Seafood broth with whole catfish, calamari, crab claws, snails, periwinkle, prawns, stockfish and crayfish'),
  ('Seafood Efo Riro',26,'Rich Yoruba vegetable soup in palm oil, loaded with assorted seafood'),
  ('Seafood Okro',30,'Comforting draw soup loaded with assorted seafood'),
  ('Ofe Nsala (White Soup)',15,'South-East classic: a light, creamy broth with tender chicken and spices'),
  ('Efo Riro',10,'Classic Yoruba vegetable soup in a peppered palm oil sauce'),
  ('Edikaikong',10,'Hearty South-South soup of ugwu and waterleaf in palm oil'),
  ('Afang',10,'South-South soup of okazi and waterleaf, slow-simmered in palm oil'),
  ('Ogbono',10,'Smooth, slightly stretchy South-South soup thickened with ground ogbono seed'),
  ('Egusi',10,'Ground melon seed simmered in rich palm oil with orishirishi'),
 ], 'All soups come with your choice of swallow.'),
]
NIG_SMALL = [
 ('Protein', [('Croaker',9),('Barracuda Steak',13),('Goat Meat',8),('Chicken',7),('Beef',7),('Turkey',9)]),
 ('Swallow', [('Poundo',2.5),('Wheat',2),('Semo',2),('Amala',2),('Eba',2),('Amala Ogede (unripe plantain)',2)]),
 ('Extras', [('Plantain Fries',4),('Extra Jollof Rice',4),('Extra Fried Rice',9),('Basmati Rice',5),('French Fries',5),('Yam Fingers',4)]),
]
P5 = [('Chicken',13),('Lamb',15),('Beef',13.5),('Fish',16.5),('Prawns',19.5)]
NOOD = [('Vegetarian',10),('Chicken',12.5),('Beef',13),('Shrimps',14),('Seafood',15)]
CHINESE = [
 ('Starters', [
  ('Spring Roll · Veg',4),('Spring Roll · Chicken',5),('Spring Roll · Mayo & Shrimps',10),('Onion Cake',1.2),('Butterfly Prawns',14),
  ('Samosa · Chicken',5),('Samosa · Beef',4),('Samosa · Veg',3.5),('Steamed Dumplings · Veg',6),('Steamed Dumplings · Chicken',6.5),
  ('Steamed Dumplings · Prawns',7),('Chicken Kung Pao',13.5),('Crispy Deep Fried Chicken · Full',19),('Crispy Deep Fried Chicken · Half',13),
  ('Dry Beef in Chillies',13),('Dry Prawns in Chillies',19),('Pan Fried Dumplings · Veg',6),('Pan Fried Dumplings · Chicken',6.5),
  ('Pan Fried Dumplings · Prawns',7),('Pan Fried Wontons · Prawns',14)]),
 ('Soups', [('Sweet Corn Soup · Veg',10),('Sweet Corn Soup · Chicken',10),('Peking Soup · Veg',10),('Peking Soup · Chicken',10),('Peking Soup · Shrimp',12),('Seafood Creamy Soup',14)]),
]
CH_GROUPS = [
 ('Mains', [('Chilli Sauce',P5),('Black Bean Sauce',P5),('Spring Onion & Ginger',P5)], 'Choose your protein.'),
 ('Noodles', [('Stir-Fried Singapore Noodles',NOOD),('Stir-Fried Noodles, Chinese Style',NOOD)], None),
]
CH_RICE = ('Rice', [('Steamed Rice',8.5),('Veg Fried Rice',8.5),('Egg Fried Rice',10),('Beef Fried Rice',10),('Chicken Fried Rice',11),('Shrimps Fried Rice',12),('Special Fried Rice',13.5)])

def full(title, items, note=None):
    li = ''.join('<li><b>%s</b><i></i><span>%s</span><small>%s</small></li>' % (e(n), N(p), e(d)) for n, p, d in items)
    return '<div class="mgrp"><h3 class="mgrp__t"><button type="button" data-acc>%s<em>%d</em></button></h3><div class="mgrp__b"><div class="mgrp__i">%s<ul class="dishes">%s</ul></div></div></div>' % (e(title), len(items), ('<p class="mgrp__n">%s</p>' % e(note)) if note else '', li)
def compact(title, items):
    li = ''.join('<li><b>%s</b><i></i><span>%s</span></li>' % (e(n), N(p)) for n, p in items)
    return '<div class="mgrp mgrp--c"><h3 class="mgrp__t"><button type="button" data-acc>%s<em>%d</em></button></h3><div class="mgrp__b"><div class="mgrp__i"><ul class="plain">%s</ul></div></div></div>' % (e(title), len(items), li)
def groups(title, gs, note):
    out = ''
    for g, vs in gs:
        out += '<div class="var"><b>%s</b><ul>%s</ul></div>' % (e(g), ''.join('<li><span>%s</span><em>%s</em></li>' % (e(v), N(p)) for v, p in vs))
    return '<div class="mgrp"><h3 class="mgrp__t"><button type="button" data-acc>%s<em>%d</em></button></h3><div class="mgrp__b"><div class="mgrp__i">%s<div class="vars">%s</div></div></div></div>' % (e(title), len(gs), ('<p class="mgrp__n">%s</p>' % e(note)) if note else '', out)

nig = ''.join(full(*s) for s in NIGERIAN) + '<div class="mrow">' + ''.join(compact(*s) for s in NIG_SMALL) + '</div>'
W = lambda x: x.replace('mgrp mgrp--c','mgrp mgrp--c mgrp--wide')
chi = ('<figure class="mban"><img src="/constructs/asa/img/kungpao-held-s.webp" srcset="/constructs/asa/img/kungpao-held-s.webp 720w, /constructs/asa/img/kungpao-held.webp 1200w" sizes="(min-width:900px) 1100px, 92vw" alt="Wok-tossed chicken with peppers, peanuts and carrot on a wooden board" loading="lazy" width="720" height="900"><figcaption>From the wok</figcaption></figure>') + W(compact(*CHINESE[0])) + W(compact(*CHINESE[1])) + ''.join(groups(*g) for g in CH_GROUPS) + W(compact(*CH_RICE))
more = ('<div class="mgrp"><h3 class="mgrp__t"><button type="button" data-acc>Coming soon<em>2</em></button></h3><div class="mgrp__b"><div class="mgrp__i"><ul class="dishes">'
        '<li><b>Signature Cocktails</b><i></i><span>Soon</span><small>House creations, wines, champagne and spirits</small></li>'
        '<li><b>Grill, Continental &amp; Pizza</b><i></i><span>Soon</span><small>The rest of the kitchen, coming to this page</small></li></ul></div></div></div>')

tabs = ('<div class="tabs reveal" role="tablist" aria-label="Menu sections" data-tabs>'
        '<button role="tab" aria-selected="true" data-tab="naija">Nigerian</button>'
        '<button role="tab" aria-selected="false" data-tab="chinese">Chinese</button>'
        '<button role="tab" aria-selected="false" data-tab="more">Bar &amp; more</button></div>'
        '<div class="panels">'
        '<div class="panel" data-panel="naija">%s</div><div class="panel" data-panel="chinese" hidden>%s</div><div class="panel" data-panel="more" hidden>%s</div></div>') % (nig, chi, more)

p = os.path.join(os.path.dirname(__file__), '..', 'index.html')
h = open(p, encoding='utf-8').read()
h = re.sub(r'<div class="tabs reveal" role="tablist".*?</div>\s*<div class="panels">.*?</div>\s*(?=<p class="note)', tabs + '\n    ', h, count=1, flags=re.S)
open(p, 'w', encoding='utf-8').write(h)
print('ok', h.count('data-panel='))
