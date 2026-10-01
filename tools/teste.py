# Ritaglia solo la testa dalle carte (img/<id>.jpg) per le teste dei lottatori 3D (img/teste/<id>.jpg)
from PIL import Image
import os
HEAD = {  # centro della faccia (x, y) in frazione di larghezza/altezza della carta, lato del quadrato in frazione di larghezza
    'adriano': (0.500, 0.280, 0.36), 'alessandro': (0.500, 0.310, 0.34), 'andrea': (0.470, 0.235, 0.16), 'annastella': (.46, .28, .26),
    'carla': (.50, .25, .28), 'caterina': (0.470, 0.340, 0.32), 'celeste': (.50, .27, .32), 'chen': (0.520, 0.215, 0.17),
    'chicca': (0.510, 0.180, 0.15), 'christian': (.50, .22, .30), 'elia': (0.500, 0.220, 0.17), 'federica': (0.505, 0.200, 0.12),
    'grazia': (.50, .23, .22), 'katya': (0.470, 0.235, 0.18),
    'lorenzo': (0.500, 0.235, 0.18), 'niccolo': (.54, .23, .20), 'samuele': (0.600, 0.210, 0.14),
    'sara': (.46, .27, .28),
    'wangting': (.49, .185, .17), 'remigio': (.49, .20, .24), 'nicole': (.51, .25, .23),
    'signorello': (.46, .22, .19), 'annalisa': (.51, .28, .27), 'zhenglei': (.46, .20, .21), 'strahinja': (.48, .27, .24), 'viola': (.50, .27, .28), 'vittorio': (.49, .26, .28),
}
os.makedirs('img/teste', exist_ok=True)
for cid, (fx, fy, side) in HEAD.items():
    im = Image.open(f'img/{cid}.jpg')
    w, h = im.size
    s = side * w
    x0 = min(max(0, fx * w - s / 2), w - s)
    y0 = min(max(0, fy * h - s / 2), h - s)
    im.crop((round(x0), round(y0), round(x0 + s), round(y0 + s))).resize((192, 192), Image.LANCZOS).save(f'img/teste/{cid}.jpg', quality=82, optimize=True)
