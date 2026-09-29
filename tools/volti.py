# Ritaglia i volti dalle carte (img/<id>.jpg) in miniature quadrate (img/volti/<id>.jpg)
from PIL import Image
FOCUS = {  # centro del volto (x, y) in frazione di larghezza/altezza, lato del quadrato in frazione di larghezza
    'adriano': (.50, .28, .46), 'alessandro': (.50, .30, .46), 'andrea': (.46, .28, .50), 'annastella': (.46, .30, .46),
    'carla': (.50, .28, .46), 'caterina': (.48, .36, .46), 'celeste': (.50, .31, .46), 'chen': (.55, .32, .50),
    'chicca': (.42, .31, .46), 'christian': (.50, .26, .46), 'elia': (.50, .30, .48), 'federica': (.50, .28, .50),
    'federico': (.40, .29, .48), 'flavio': (.56, .27, .46), 'grazia': (.50, .28, .48), 'katya': (.45, .31, .48),
    'lorenzo': (.55, .28, .46), 'niccolo': (.55, .31, .48), 'oksana': (.50, .30, .46), 'samuele': (.50, .31, .50),
    'sara': (.45, .30, .46),
    'wangting': (.49, .24, .48), 'remigio': (.50, .26, .50), 'nicole': (.50, .30, .50),
    'signorello': (.46, .26, .50), 'annalisa': (.50, .30, .50), 'zhenglei': (.47, .26, .48), 'strahinja': (.50, .32, .46), 'viola': (.50, .30, .46), 'vittorio': (.50, .30, .48),
}
for cid, (fx, fy, side) in FOCUS.items():
    im = Image.open(f'img/{cid}.jpg')
    w, h = im.size
    s = side * w
    x0 = min(max(0, fx * w - s / 2), w - s)
    y0 = min(max(0, fy * h - s / 2), h - s)
    im.crop((round(x0), round(y0), round(x0 + s), round(y0 + s))).resize((240, 240), Image.LANCZOS).save(f'img/volti/{cid}.jpg', quality=80, optimize=True)
