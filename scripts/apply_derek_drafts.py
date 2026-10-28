"""Apply Derek's TQ review notes to the shared drafts.

Rewrites the figures he marked, and turns the HTML he pasted for questions
18, 24, 27, 32, and 34 into drafts A, B, and C. Question 11 draft C uses
three gray bottles, because the music-staff version was not a real size series.
"""

import json
import math
import re
import shutil
from pathlib import Path
from xml.sax.saxutils import escape

APP = Path(__file__).resolve().parents[1]
PUBLIC = APP / "public" / "tq"
FIG = PUBLIC / "figures"
OPT = PUBLIC / "options"
BANK = APP / "src" / "apps" / "tq-enhancement" / "lib" / "bank.json"
ICONS_TS = APP / "src" / "apps" / "tq-enhancement" / "lib" / "partsIcons.ts"
ASSETS = Path(r"C:\Users\sreek\.cursor\projects\c-Users-sreek-OneDrive-Desktop-CRL\assets")

EXTRA_ICONS = {
    "plant": [
        "M12 21v-9",
        "M12 14c-5 0-7-4-7-7 5 0 7 4 7 7z",
        "M12 14c5 0 7-4 7-7-5 0-7 4-7 7z",
    ],
    "cloud-rain": [
        "M7 15a4 4 0 0 1 .4-8 5 5 0 0 1 9.4-1.2A3.5 3.5 0 1 1 17 15z",
        "M8 18l-1 3",
        "M12 18v3",
        "M16 18l1 3",
    ],
    "droplet": ["M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"],
    "ripple": [
        "M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
        "M7 12a5 5 0 0 1 10 0",
        "M4 12a8 8 0 0 1 16 0",
    ],
    "cloud": ["M7 17h10a4 4 0 0 0 .2-8 5 5 0 0 0-9.6-1.4A4 4 0 0 0 7 17z"],
    "mountain": ["M2 19l7-11 4 6 2-3 7 8z"],
    "snowflake": ["M12 3v18", "M4.5 7.5l15 9", "M4.5 16.5l15-9"],
}


def svg(w, h, body):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'width="{w}" height="{h}">{body}</svg>\n'
    )


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def load_icons():
    text = ICONS_TS.read_text(encoding="utf-8")
    icons = {}
    for name, body in re.findall(r"(\w[\w-]*):\s*\[(.*?)\]", text, re.S):
        icons[name] = re.findall(r"'([^']+)'", body)
    icons.update(EXTRA_ICONS)
    return icons


ICONS = load_icons()


def icon_at(name, x, y, size=22):
    paths = ICONS[name]
    scale = size / 24
    tx, ty = x - size / 2, y - size / 2
    body = "".join(
        f'<path d="{d}" fill="none" stroke="#5c5c56" stroke-width="1.7" '
        f'stroke-linecap="round" stroke-linejoin="round"/>'
        for d in paths
    )
    bubble = f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{size / 2 + 5:.1f}" fill="#fff"/>'
    return bubble + f'<g transform="translate({tx:.1f},{ty:.1f}) scale({scale:.4f})">{body}</g>'


def cycle(n):
    return [[i, (i + 1) % n] for i in range(n)]


def chain(n):
    return [[i, i + 1] for i in range(n - 1)]


def complete(n):
    return [[i, j] for i in range(n) for j in range(i + 1, n)]


def star(n):
    return [[0, i] for i in range(1, n)]


def positions(n, is_star, cx=110, cy=100, radius=72):
    if is_star:
        pts = [(cx, cy)]
        for i in range(n - 1):
            angle = -math.pi / 2 + i * 2 * math.pi / (n - 1)
            pts.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
        return pts
    pts = []
    for i in range(n):
        angle = -math.pi / 2 + i * 2 * math.pi / n
        pts.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return pts


def network(pool, n, edges, shift):
    is_star = n > 3 and len(edges) == n - 1 and all(a == 0 for a, _b in edges)
    pts = positions(n, is_star)
    lines = []
    gap = 18
    for a, b in edges:
        x1, y1 = pts[a]
        x2, y2 = pts[b]
        dist = math.hypot(x2 - x1, y2 - y1)
        ux, uy = (x2 - x1) / dist, (y2 - y1) / dist
        lines.append(
            f'<line x1="{x1 + ux * gap:.1f}" y1="{y1 + uy * gap:.1f}" '
            f'x2="{x2 - ux * gap:.1f}" y2="{y2 - uy * gap:.1f}" '
            f'stroke="#888780" stroke-width="1.6"/>'
        )
    icons = []
    for k, (x, y) in enumerate(pts):
        icons.append(icon_at(pool[(k + shift) % len(pool)], x, y))
    return svg(220, 200, "".join(lines) + "".join(icons))


def q18_items():
    return [
        (
            "A",
            "Garden icons on a circle. No count is printed on the options. "
            "Parts are things plus lines. Option e has the most: 6 things and 15 lines.",
            ["flower", "bug", "feather", "plant", "butterfly", "sun", "cloud-rain", "leaf"],
            [
                (7, cycle(7)),
                (5, complete(5)),
                (6, cycle(6) + [[0, 3], [1, 4]]),
                (4, complete(4)),
                (6, complete(6)),
            ],
            4,
        ),
        (
            "B",
            "Pond icons. No count is printed on the options. Option a has the most: 6 things and 10 lines.",
            ["fish", "droplet", "leaf", "feather", "sun", "bug", "ripple", "cloud"],
            [
                (6, cycle(6) + [[0, 2], [0, 3], [1, 4], [2, 5]]),
                (7, cycle(7)),
                (5, cycle(5) + [[0, 2], [0, 3]]),
                (7, chain(7)),
                (3, complete(3)),
            ],
            0,
        ),
        (
            "C",
            "Mountain icons. No count is printed on the options. Option c has the most: 5 things and 9 lines.",
            ["mountain", "snowflake", "tree", "paw", "mushroom", "cloud-rain", "feather"],
            [
                (4, complete(4)),
                (6, cycle(6)),
                (5, [edge for edge in complete(5) if edge != [0, 2]]),
                (7, star(7)),
                (3, chain(3)),
            ],
            2,
        ),
    ]


def write_q18():
    drafts = []
    for letter, figure, pool, options, key in q18_items():
        totals = []
        images = []
        for index, (n, edges) in enumerate(options):
            totals.append(n + len(edges))
            name = f"q18-{letter.lower()}-{chr(97 + index)}.svg"
            write(OPT / name, network(pool, n, edges, index * 2))
            images.append(f"tq/options/{name}")
        keyed = totals[key]
        if totals.count(keyed) != 1 or keyed != max(totals):
            raise SystemExit(f"Q18 {letter} key is not a unique maximum: {totals}")
        drafts.append(
            (
                letter,
                figure,
                "",
                [
                    {
                        "letter": "abcde"[i],
                        "text": "",
                        "keyed": i == key,
                        "image": images[i],
                    }
                    for i in range(5)
                ],
            )
        )
    return drafts


def shape(kind, x, y, r, color):
    if kind == "circle":
        return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}"/>'
    if kind == "square":
        return f'<rect x="{x - r}" y="{y - r}" width="{2 * r}" height="{2 * r}" fill="{color}"/>'
    return (
        f'<polygon points="{x},{y - r} {x + r},{y + r * 0.8} {x - r},{y + r * 0.8}" fill="{color}"/>'
    )


def write_q24():
    teal, green, purple, red = "#1d9e75", "#3b9a2a", "#7f3fbf", "#d23c2c"
    items = [
        (
            "A",
            "If you only see circles, how many objects will you see?",
            "Five teal circles and four teal triangles, unlabeled.",
            [
                ("circle", 40, 40, 16, teal),
                ("triangle", 140, 30, 18, teal),
                ("circle", 200, 80, 16, teal),
                ("triangle", 70, 100, 18, teal),
                ("circle", 150, 130, 16, teal),
                ("triangle", 210, 170, 18, teal),
                ("circle", 50, 180, 16, teal),
                ("triangle", 120, 210, 18, teal),
                ("circle", 200, 230, 16, teal),
            ],
            ["1", "4", "5", "9", "None of the above"],
            2,
        ),
        (
            "B",
            "If you only see green, how many objects will you see?",
            "Three green shapes among purple ones, unlabeled.",
            [
                ("square", 50, 40, 16, purple),
                ("circle", 170, 45, 16, green),
                ("triangle", 100, 100, 18, purple),
                ("square", 210, 110, 16, purple),
                ("square", 40, 160, 16, green),
                ("circle", 140, 170, 16, purple),
                ("triangle", 210, 215, 18, green),
                ("circle", 80, 230, 16, purple),
            ],
            ["2", "3", "5", "8", "None of the above"],
            1,
        ),
        (
            "C",
            "If you only see large objects, how many objects will you see?",
            "Three large red squares and four small ones. Three is not listed, so the key is e.",
            [
                ("square", 60, 50, 26, red),
                ("square", 170, 35, 10, red),
                ("square", 220, 95, 10, red),
                ("square", 110, 120, 10, red),
                ("square", 190, 165, 26, red),
                ("square", 45, 185, 10, red),
                ("square", 130, 225, 26, red),
            ],
            ["2", "4", "5", "7", "None of the above"],
            4,
        ),
    ]
    drafts = []
    for letter, stem, figure, shapes, options, key in items:
        body = "".join(shape(*spec) for spec in shapes)
        name = f"q24{letter.lower()}.svg"
        write(FIG / name, svg(250, 260, body))
        drafts.append((letter, stem, figure, f"tq/figures/{name}", options, key))
    large = sum(1 for spec in items[2][3] if spec[3] == 26)
    if large != 3:
        raise SystemExit(f"Q24 C should have 3 large squares, found {large}")
    return drafts


def pic(inner):
    return svg(180, 140, inner)


def railroad():
    ties = []
    for y in (134, 116, 101, 89, 79, 72, 67, 63):
        f = (140 - y) / 80
        left = 40 + 48 * f - 8 * (1 - f)
        right = 140 - 48 * f + 8 * (1 - f)
        ties.append(
            f'<line x1="{left:.1f}" y1="{y}" x2="{right:.1f}" y2="{y}" '
            f'stroke="#6b4f2c" stroke-width="{4 * (1 - f) + 1:.1f}"/>'
        )
    return (
        '<rect width="180" height="60" fill="#bcdcf2"/><rect y="60" width="180" height="80" fill="#c9b48a"/>'
        + "".join(ties)
        + '<line x1="40" y1="140" x2="88" y2="60" stroke="#555" stroke-width="3"/>'
        + '<line x1="140" y1="140" x2="92" y2="60" stroke="#555" stroke-width="3"/>'
    )


def hallway():
    return (
        '<rect width="180" height="140" fill="#e8e4dc"/>'
        '<polygon points="0,140 70,88 110,88 180,140" fill="#b89d78"/>'
        '<polygon points="0,0 70,40 110,40 180,0" fill="#f4f2ee"/>'
        '<rect x="70" y="40" width="40" height="48" fill="#d6d0c4" stroke="#999"/>'
        '<rect x="83" y="56" width="14" height="32" fill="#8a6a45"/>'
        '<polygon points="18,35 40,48 40,104 18,121" fill="#8a6a45"/>'
        '<polygon points="162,35 140,48 140,104 162,121" fill="#8a6a45"/>'
        '<line x1="0" y1="0" x2="70" y2="40" stroke="#999"/>'
        '<line x1="180" y1="0" x2="110" y2="40" stroke="#999"/>'
        '<line x1="0" y1="140" x2="70" y2="88" stroke="#999"/>'
        '<line x1="180" y1="140" x2="110" y2="88" stroke="#999"/>'
    )


def apple():
    return (
        '<rect width="180" height="140" fill="#f6f1e9"/>'
        '<circle cx="80" cy="80" r="34" fill="#d23c2c"/><circle cx="102" cy="80" r="34" fill="#d23c2c"/>'
        '<path d="M91 50 Q93 36 98 30" stroke="#5a3d1e" stroke-width="4" fill="none"/>'
        '<ellipse cx="108" cy="36" rx="12" ry="6" fill="#3b9a2a" transform="rotate(-25 108 36)"/>'
    )


def town_map():
    return (
        '<rect width="180" height="140" fill="#d9d4c7"/>'
        '<path d="M0 105 Q60 85 100 110 T180 95 L180 120 Q130 135 100 128 T0 125 Z" fill="#7fb6dc"/>'
        '<g stroke="#fff" stroke-width="7"><line x1="45" y1="0" x2="45" y2="140"/>'
        '<line x1="115" y1="0" x2="115" y2="140"/><line x1="0" y1="35" x2="180" y2="35"/>'
        '<line x1="0" y1="72" x2="180" y2="72"/></g>'
        '<rect x="55" y="42" width="50" height="24" fill="#7cb86a"/>'
        '<g fill="#a39a88"><rect x="8" y="6" width="28" height="22"/>'
        '<rect x="55" y="6" width="50" height="22"/><rect x="125" y="6" width="45" height="22"/>'
        '<rect x="8" y="42" width="28" height="24"/><rect x="125" y="42" width="45" height="24"/></g>'
    )


def fence():
    posts, tops, mids = [], [], []
    for x, h in ((18, 72), (54, 54), (82, 40), (103, 30), (119, 23), (131, 17), (140, 13)):
        bottom = 132 - (x - 18) * 0.5
        w = h / 6
        posts.append(
            f'<rect x="{x - w / 2:.1f}" y="{bottom - h:.1f}" width="{w:.1f}" height="{h}" fill="#7a5a36"/>'
        )
        tops.append(f"{x},{bottom - h * 0.85:.1f}")
        mids.append(f"{x},{bottom - h * 0.4:.1f}")
    return (
        '<rect width="180" height="70" fill="#bcdcf2"/><rect y="70" width="180" height="70" fill="#9cc57e"/>'
        f'<polyline points="{" ".join(tops)}" stroke="#7a5a36" stroke-width="3" fill="none"/>'
        f'<polyline points="{" ".join(mids)}" stroke="#7a5a36" stroke-width="3" fill="none"/>'
        + "".join(posts)
    )


def mug():
    return (
        '<rect width="180" height="140" fill="#eef1f4"/>'
        '<rect x="58" y="45" width="56" height="66" rx="6" fill="#3d7fc1"/>'
        '<path d="M114 58 Q138 58 138 78 Q138 98 114 98" stroke="#3d7fc1" stroke-width="8" fill="none"/>'
        '<g stroke="#aaa" stroke-width="3" fill="none">'
        '<path d="M74 38 q-6 -8 0 -16 q6 -8 0 -16"/>'
        '<path d="M96 38 q-6 -8 0 -16 q6 -8 0 -16"/></g>'
    )


def tower():
    rows = []
    for i in range(1, 8):
        y = 140 - i * i * 2.6
        f = (140 - y) / 130
        rows.append(
            f'<line x1="{40 + 35 * f:.1f}" y1="{y:.1f}" x2="{140 - 35 * f:.1f}" y2="{y:.1f}" '
            f'stroke="#d9dde2" stroke-width="2"/>'
        )
    return (
        '<rect width="180" height="140" fill="#9fcdf0"/>'
        '<polygon points="40,140 140,140 105,10 75,10" fill="#5f6b78"/>'
        + "".join(rows)
        + '<line x1="73" y1="140" x2="85" y2="10" stroke="#d9dde2" stroke-width="2"/>'
        + '<line x1="107" y1="140" x2="95" y2="10" stroke="#d9dde2" stroke-width="2"/>'
    )


def leaf():
    return (
        '<rect width="180" height="140" fill="#f4f1e6"/>'
        '<ellipse cx="90" cy="70" rx="58" ry="28" fill="#4f9a3a" transform="rotate(-20 90 70)"/>'
        '<line x1="38" y1="90" x2="142" y2="50" stroke="#2f6b22" stroke-width="3"/>'
        '<line x1="30" y1="93" x2="42" y2="88" stroke="#5a3d1e" stroke-width="4"/>'
    )


def write_q27():
    names = [
        "q27-a-a.jpg",
        "q27-a-b.jpg",
        "q27-a-c.jpg",
        "q27-b-a.jpg",
        "q27-b-b.jpg",
        "q27-b-c.jpg",
        "q27-c-a.jpg",
        "q27-c-b.jpg",
        "q27-c-c.jpg",
    ]
    missing = [name for name in names if not (OPT / name).exists()]
    if missing:
        raise SystemExit("Missing question 27 photographs: " + ", ".join(missing))

    def opt(text="", image=""):
        return text, image

    specs = [
        (
            "A",
            "Which image has a perspective?",
            "Photographs of tracks, an apple, and a hallway, with no labels. Every picture is from a point of view, so d is keyed.",
            [opt(image="tq/options/q27-a-a.jpg"), opt(image="tq/options/q27-a-b.jpg"), opt(image="tq/options/q27-a-c.jpg"), opt("All of the images"), opt("Answers a and c")],
            3,
        ),
        (
            "B",
            "Which image does not have a perspective?",
            "Photographs of a town, a fence, and a mug, with no labels. Each is still seen from somewhere, so none of them lacks a perspective.",
            [opt(image="tq/options/q27-b-a.jpg"), opt(image="tq/options/q27-b-b.jpg"), opt(image="tq/options/q27-b-c.jpg"), opt("None of the images"), opt("Answer c")],
            3,
        ),
        (
            "C",
            "Which images have a perspective?",
            "Photographs of a tower, a leaf, and a town, with no labels. All three are seen from a point of view.",
            [opt(image="tq/options/q27-c-a.jpg"), opt(image="tq/options/q27-c-b.jpg"), opt(image="tq/options/q27-c-c.jpg"), opt("Answer a only"), opt("All of the images")],
            4,
        ),
    ]
    drafts = []
    for letter, stem, figure, options, key in specs:
        choices = []
        for i, (text, image) in enumerate(options):
            choices.append({"letter": "abcde"[i], "text": text, "keyed": i == key, "image": image})
        drafts.append((letter, stem, figure, "", choices))
    return drafts


def relation(a, b, rel, vertical, color):
    if vertical:
        w, h = 140, 300
        points = {"A": (70, 48), "R": (70, 150), "B": (70, 252)}
    else:
        w, h = 320, 120
        points = {"A": (52, 60), "R": (160, 60), "B": (268, 60)}
    radius = {"A": 36, "B": 36, "R": 28 if len(rel) <= 3 else 36}

    def arrow(src, dst):
        x1, y1 = points[src]
        x2, y2 = points[dst]
        dx, dy = x2 - x1, y2 - y1
        dist = math.hypot(dx, dy)
        ux, uy = dx / dist, dy / dist
        return (
            f'<line x1="{x1 + ux * radius[src]:.1f}" y1="{y1 + uy * radius[src]:.1f}" '
            f'x2="{x2 - ux * (radius[dst] + 2):.1f}" y2="{y2 - uy * (radius[dst] + 2):.1f}" '
            f'stroke="#888780" stroke-width="4" marker-end="url(#head)"/>'
        )

    def circle(which, text):
        x, y = points[which]
        size = 12 if len(text) > 8 else 15
        return (
            f'<circle cx="{x}" cy="{y}" r="{radius[which]}" fill="{color}"/>'
            f'<text x="{x}" y="{y}" fill="#fff" font-size="{size}" text-anchor="middle" '
            f'dominant-baseline="central" font-family="Arial, Helvetica, sans-serif">{escape(text)}</text>'
        )

    body = (
        '<defs><marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto">'
        '<path d="M0,0 L10,5 L0,10 z" fill="#888780"/></marker></defs>'
        + arrow("R", "A")
        + arrow("R", "B")
        + circle("A", a)
        + circle("B", b)
        + circle("R", rel)
    )
    return svg(w, h, body)


def write_q32():
    specs = [
        (
            "A",
            "What is true about Teacher, Student, and Mentoring?",
            "Teacher and Student on the ends, Mentoring on the arrow between them.",
            "Teacher",
            "Student",
            "Mentoring",
            False,
            "#1d9e75",
            [
                "Teacher and Student are related to one another",
                "Teacher and Student are related to one another, but the relationship is not clear",
                "Mentoring is the relationship between Teacher and Student",
                "Answers a and c",
                "None of the above",
            ],
            3,
        ),
        (
            "B",
            "What is true about [P], [Q], and [M]?",
            "P above, Q below, and M on the arrow between them.",
            "P",
            "Q",
            "M",
            True,
            "#7f3fbf",
            [
                "[M] is a third thing that is not related to [P] or [Q]",
                "[P] and [Q] are not related to one another",
                "[P] and [Q] are related to one another, and [M] is that relationship",
                "Answer a only",
                "None of the above",
            ],
            2,
        ),
        (
            "C",
            "What is true about Rain, Crops, and Water?",
            "Rain and Crops on the ends, Water on the arrow between them.",
            "Rain",
            "Crops",
            "Water",
            False,
            "#3d7fc1",
            [
                "Rain and Crops are related to one another",
                "Water is the relationship between Rain and Crops",
                "Rain and Crops are related to one another, but how is not shown",
                "None of the above",
                "Answers a and b",
            ],
            4,
        ),
    ]
    drafts = []
    for letter, stem, figure, a, b, rel, vertical, color, options, key in specs:
        name = f"q32{letter.lower()}.svg"
        write(FIG / name, relation(a, b, rel, vertical, color))
        drafts.append((letter, stem, figure, f"tq/figures/{name}", options, key))
    return drafts


def metacog(labels, left_scale, right_scale, head_color, arrow):
    width, height = 360, 190
    head = (
        "M22 170 L22 128 Q4 100 10 62 Q20 10 70 8 Q112 8 120 48 Q122 62 132 82 "
        "Q136 90 124 92 L126 102 Q128 108 121 110 L122 118 Q122 132 100 132 L98 170 Z"
    )
    top, mid, bot = (72, 52), (72, 86), (72, 120)

    def one(side, scale):
        ty = height - 10 - 170 * scale
        tx = 10 if side == "left" else width - 10
        sx = scale if side == "left" else -scale

        def map_pt(point):
            return tx + sx * point[0], ty + scale * point[1]

        path = (
            f'<path d="{head}" fill="{head_color}" '
            f'transform="translate({tx:.2f},{ty:.2f}) scale({sx:.4f},{scale:.4f})"/>'
        )
        return path, map_pt, scale

    left, right = one("left", left_scale), one("right", right_scale)
    parts = [
        '<defs><marker id="tip" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">'
        f'<path d="M0,0 L10,5 L0,10 z" fill="{arrow}"/></marker></defs>',
        left[0],
        right[0],
    ]
    for node, direction in ((left, -1), (right, 1)):
        x1, y1 = node[1](top)
        x2, y2 = node[1](bot)
        parts.append(
            f'<path d="M{x1:.1f} {y1 + 7:.1f} Q{x1 + direction * 26 * node[2]:.1f} {(y1 + y2) / 2:.1f} '
            f'{x2:.1f} {y2 - 8:.1f}" stroke="{arrow}" stroke-width="2.5" fill="none" marker-end="url(#tip)"/>'
        )
    for src, dst in ((left, right), (right, left)):
        x1, y1 = src[1](bot)
        x2, y2 = dst[1](top)
        dx, dy = x2 - x1, y2 - y1
        dist = math.hypot(dx, dy)
        parts.append(
            f'<line x1="{x1 + dx / dist * 7:.1f}" y1="{y1 + dy / dist * 7:.1f}" '
            f'x2="{x2 - dx / dist * 9:.1f}" y2="{y2 - dy / dist * 9:.1f}" '
            f'stroke="{arrow}" stroke-width="2.5" marker-end="url(#tip)"/>'
        )
    for node in (left, right):
        size = 10 * max(node[2], 0.85)
        for point, word in ((top, labels[0]), (bot, labels[2])):
            x, y = node[1](point)
            radius = 6 * max(node[2], 0.85)
            parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{radius:.1f}" fill="#2b7de9"/>')
            parts.append(
                f'<text x="{x:.1f}" y="{y - 10 * node[2]:.1f}" font-size="{size:.1f}" text-anchor="middle" '
                f'fill="#333" font-family="Arial, Helvetica, sans-serif">{escape(word)}</text>'
            )
        x, y = node[1](mid)
        parts.append(
            f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size:.1f}" font-style="italic" text-anchor="middle" '
            f'fill="#555" font-family="Arial, Helvetica, sans-serif">{escape(labels[1])}</text>'
        )
    return svg(width, height, "".join(parts))


def write_q34():
    specs = [
        (
            "A",
            "In the image, choose the best explanation.",
            "Two adult heads. Inside each: impulse, pause, response. Arrows run inside each head and across between them.",
            ["impulse", "pause", "response"],
            1,
            1,
            "#c9c7c0",
            "#d23c2c",
            [
                "Two coworkers responding to each other",
                "Two coworkers responding to each other and to themselves (internally), so they pause instead of acting on impulse",
                "Thoughtful, responsible communication at work",
                "Answers b and c are the best answers",
                "Two coworkers reacting to each other on impulse",
            ],
            3,
        ),
        (
            "B",
            "In the image, choose the best explanation.",
            "A larger head and a smaller head. Inside each: feel, think, say. Arrows run inside each head and across between them.",
            ["feel", "think", "say"],
            1,
            0.75,
            "#b9c8d6",
            "#3d7fc1",
            [
                "A parent correcting a child",
                "A parent and child talking to each other",
                "A parent and child talking to each other and to themselves (internally), so neither one just reacts",
                "A parent and child talking to themselves instead of to each other",
                "None of the above",
            ],
            2,
        ),
        (
            "C",
            "In the image, choose the best explanation.",
            "Two adult heads. Inside each: hear, reflect, reply. Arrows run inside each head and across between them.",
            ["hear", "reflect", "reply"],
            1,
            1,
            "#cfc3b0",
            "#1d9e75",
            [
                "Calm, responsible negotiation",
                "Two negotiators interacting with each other and with themselves (internally) to avoid reacting",
                "Two negotiators interacting with each other",
                "Two negotiators interacting with each other and with themselves (internally)",
                "Answers a and b are the best answers",
            ],
            4,
        ),
    ]
    drafts = []
    for letter, stem, figure, labels, left, right, fill, color, options, key in specs:
        name = f"q34{letter.lower()}.svg"
        write(FIG / name, metacog(labels, left, right, fill, color))
        drafts.append((letter, stem, figure, f"tq/figures/{name}", options, key))
    return drafts


def text_in_shape(label, x, y):
    return (
        f'<text x="{x}" y="{y}" fill="#fff" font-size="28" font-weight="700" text-anchor="middle" '
        f'dominant-baseline="central" font-family="Arial, Helvetica, sans-serif">{escape(label)}</text>'
    )


def polygon(cx, cy, r, n):
    pts = []
    for i in range(n):
        angle = -math.pi / 2 + i * 2 * math.pi / n
        pts.append(f"{cx + r * math.cos(angle):.1f},{cy + r * math.sin(angle):.1f}")
    return " ".join(pts)


def star_points(cx, cy, outer, inner):
    pts = []
    for i in range(10):
        angle = -math.pi / 2 + i * math.pi / 5
        radius = outer if i % 2 == 0 else inner
        pts.append(f"{cx + radius * math.cos(angle):.1f},{cy + radius * math.sin(angle):.1f}")
    return " ".join(pts)


def write_q10():
    gray = "#8d8d8d"
    a = (
        f'<circle cx="150" cy="150" r="70" fill="{gray}"/>'
        + text_in_shape("X", 150, 150)
        + f'<ellipse cx="390" cy="150" rx="110" ry="72" fill="{gray}"/>'
        + text_in_shape("Y", 390, 150)
    )
    b = (
        f'<polygon points="{polygon(150, 150, 78, 5)}" fill="{gray}"/>'
        + text_in_shape("X", 150, 156)
        + f'<polygon points="{polygon(400, 150, 92, 6)}" fill="{gray}"/>'
        + text_in_shape("Y", 400, 150)
    )
    c = (
        f'<polygon points="{star_points(145, 155, 78, 34)}" fill="{gray}"/>'
        + text_in_shape("X", 145, 160)
        + f'<rect x="330" y="70" width="150" height="150" fill="{gray}"/>'
        + text_in_shape("Y", 405, 145)
    )
    write(FIG / "q10a.svg", svg(560, 300, a))
    write(FIG / "q10b.svg", svg(560, 300, b))
    write(FIG / "q10c.svg", svg(560, 300, c))


def write_q11():
    gray = "#8d8d8d"

    def bar(x, h, label):
        y = 250 - h
        return (
            f'<rect x="{x}" y="{y}" width="70" height="{h}" rx="6" fill="{gray}"/>'
            + text_in_shape(label, x + 35, y + h / 2)
        )

    write(FIG / "q11a.svg", svg(420, 280, bar(40, 70, "S") + bar(160, 130, "M") + bar(280, 200, "L")))

    def cup(x, w, h, label):
        y = 240 - h
        body = (
            f'<path d="M{x} {y} L{x + w * 0.18:.1f} {y + h} L{x + w * 0.82:.1f} {y + h} L{x + w} {y} Z" fill="{gray}"/>'
        )
        return body + text_in_shape(label, x + w / 2, y + h * 0.58)

    write(FIG / "q11b.svg", svg(460, 280, cup(30, 90, 70, "S") + cup(160, 110, 110, "M") + cup(310, 130, 160, "L")))

    def bottle(x, w, h, label):
        base = 250
        y = base - h
        neck_h = h * 0.2
        neck_w = w * 0.34
        nx = x + (w - neck_w) / 2
        shoulder = y + neck_h
        d = (
            f"M{nx:.1f} {y:.1f} H{nx + neck_w:.1f} V{shoulder:.1f} "
            f"C{x + w:.1f} {shoulder:.1f} {x + w:.1f} {shoulder + h * 0.08:.1f} {x + w:.1f} {shoulder + h * 0.16:.1f} "
            f"V{base - w * 0.14:.1f} "
            f"Q{x + w:.1f} {base:.1f} {x + w - w * 0.14:.1f} {base:.1f} "
            f"H{x + w * 0.14:.1f} "
            f"Q{x:.1f} {base:.1f} {x:.1f} {base - w * 0.14:.1f} "
            f"V{shoulder + h * 0.16:.1f} "
            f"C{x:.1f} {shoulder + h * 0.08:.1f} {x:.1f} {shoulder:.1f} {nx:.1f} {shoulder:.1f} Z"
        )
        cap = (
            f'<rect x="{nx:.1f}" y="{y - 7:.1f}" width="{neck_w:.1f}" height="8" rx="2" fill="{gray}"/>'
        )
        return f'<path d="{d}" fill="{gray}"/>' + cap + text_in_shape(label, x + w / 2, y + h * 0.64)

    write(
        FIG / "q11c.svg",
        svg(540, 280, bottle(24, 110, 130, "S") + bottle(180, 140, 180, "M") + bottle(360, 156, 220, "L")),
    )


def person(x, y, scale=1, shirt="#3d7fc1", hair="#3a2f2a"):
    return (
        f'<g transform="translate({x:.1f},{y:.1f}) scale({scale})" fill="none">'
        f'<circle cx="0" cy="-52" r="11" fill="#f0c7a8"/>'
        f'<path d="M-12 -54 q12 -16 24 0" fill="{hair}"/>'
        f'<rect x="-13" y="-40" width="26" height="28" rx="7" fill="{shirt}"/>'
        f'<rect x="-12" y="-14" width="10" height="20" fill="#2c3a4a"/>'
        f'<rect x="2" y="-14" width="10" height="20" fill="#2c3a4a"/>'
        f"</g>"
    )


def write_q20():
    street = [
        '<rect width="640" height="400" fill="#f7f4ee"/>',
        '<rect x="0" y="150" width="640" height="160" fill="#6e7570"/>',
        '<rect x="430" y="40" width="210" height="250" fill="#d9c7a6"/>',
        '<rect x="470" y="150" width="90" height="110" fill="#4f8fbe"/>',
        '<rect x="500" y="70" width="70" height="50" fill="#9fd0ea"/>',
        person(530, 118, 0.45, "#f2c14e"),
        '<rect x="80" y="168" width="110" height="46" rx="8" fill="#f0c84a"/>',
        '<circle cx="108" cy="214" r="12" fill="#333"/>',
        '<circle cx="162" cy="214" r="12" fill="#333"/>',
        person(112, 200, 0.42, "#2f6b4f"),
        person(156, 200, 0.38, "#c46b4a"),
        '<rect x="230" y="156" width="150" height="62" rx="8" fill="#3d7fc1"/>',
        person(268, 196, 0.4, "#1f4e79"),
        person(310, 188, 0.32, "#d8d2c8"),
        person(338, 188, 0.32, "#e07a5f"),
        person(366, 188, 0.32, "#f2c14e"),
        person(250, 300, 0.7, "#e07a3d"),
        person(360, 292, 0.55, "#3b6ea5"),
        '<ellipse cx="300" cy="318" rx="16" ry="10" fill="#8a5a3b"/>',
        '<circle cx="314" cy="312" r="7" fill="#8a5a3b"/>',
        person(470, 330, 0.62, "#3b9a2a"),
        '<circle cx="500" cy="338" r="16" fill="none" stroke="#2c3338" stroke-width="3"/>',
        '<circle cx="532" cy="338" r="16" fill="none" stroke="#2c3338" stroke-width="3"/>',
        person(590, 250, 0.55, "#6b4f3a"),
        '<rect x="40" y="250" width="70" height="8" fill="#fff"/>',
        '<rect x="40" y="268" width="70" height="8" fill="#fff"/>',
        '<rect x="40" y="286" width="70" height="8" fill="#fff"/>',
    ]
    write(FIG / "q20a.svg", svg(640, 400, "".join(street)))

    dinner = ['<rect width="640" height="400" fill="#f7f4ee"/>', '<ellipse cx="320" cy="230" rx="180" ry="70" fill="#e7d3b0"/>']
    seats = [
        (250, 175, "#3d7fc1"),
        (390, 175, "#c46b4a"),
        (180, 230, "#3b9a2a"),
        (460, 230, "#7f3fbf"),
        (230, 300, "#e07a3d"),
        (400, 300, "#1f4e79"),
        (320, 145, "#6b4f3a"),
        (320, 330, "#d8d2c8"),
        (120, 300, "#f2c14e"),
        (520, 160, "#2f6b4f"),
    ]
    for x, y, shirt in seats:
        dinner.append(person(x, y, 0.62, shirt))
    dinner.append('<ellipse cx="320" cy="230" rx="70" ry="24" fill="#f4efe4"/>')
    write(FIG / "q20b.svg", svg(640, 400, "".join(dinner)))

    ward = [
        '<rect width="640" height="400" fill="#f4f7f8"/>',
        '<rect x="40" y="70" width="250" height="140" rx="8" fill="#d5e4ea"/>',
        '<rect x="70" y="150" width="120" height="36" rx="6" fill="#f7f4ee"/>',
        person(130, 168, 0.45, "#e7e2d8"),
        person(250, 200, 0.7, "#f4f7fb"),
        person(360, 230, 0.7, "#3d7fc1"),
        person(450, 250, 0.62, "#c46b4a"),
        person(80, 330, 0.6, "#3b9a2a"),
        person(170, 340, 0.5, "#e07a3d"),
        person(250, 345, 0.42, "#f2c14e"),
        person(520, 250, 0.7, "#f7f4ee"),
        person(560, 330, 0.55, "#7f3fbf"),
        person(400, 340, 0.48, "#1f4e79"),
    ]
    write(FIG / "q20c.svg", svg(640, 400, "".join(ward)))


def write_q21():
    stroke = 'fill="none" stroke="#222" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"'
    bridge = (
        '<rect width="640" height="320" fill="#fff"/>'
        f'<path {stroke} d="M40 230 H600"/>'
        f'<path {stroke} d="M70 230 V150 H570 V230"/>'
        f'<path {stroke} d="M70 170 H570"/>'
        + "".join(f'<path {stroke} d="M{x} 170 V150"/>' for x in range(90, 560, 28))
        + f'<path {stroke} d="M90 230 V190 Q150 120 210 190 V230"/>'
        + f'<path {stroke} d="M250 230 V190 Q320 120 390 190 V230"/>'
        + f'<path {stroke} d="M430 230 V190 Q500 120 570 190 V230"/>'
    )
    meal = (
        '<rect width="640" height="360" fill="#fff"/>'
        f'<circle cx="320" cy="180" r="120" {stroke}/>'
        f'<ellipse cx="250" cy="200" rx="62" ry="28" {stroke}/>'
        f'<path {stroke} d="M210 188 q20 8 80 0 M205 200 q24 8 90 0 M210 212 q20 8 80 0"/>'
        f'<circle cx="390" cy="145" r="14" {stroke}/>'
        f'<circle cx="424" cy="168" r="14" {stroke}/>'
        f'<circle cx="392" cy="196" r="16" {stroke}/>'
        f'<path {stroke} d="M360 230 q28 18 70 -4"/>'
        f'<path {stroke} d="M470 120 v90 M458 132 h24 M458 150 h24"/>'
    )
    park = (
        '<rect width="640" height="360" fill="#fff"/>'
        f'<path {stroke} d="M40 250 Q180 180 320 230 T600 200"/>'
        f'<circle cx="140" cy="150" r="36" {stroke}/>'
        f'<path {stroke} d="M140 186 V250"/>'
        f'<circle cx="470" cy="130" r="42" {stroke}/>'
        f'<path {stroke} d="M470 172 V250"/>'
        f'<ellipse cx="300" cy="150" rx="50" ry="22" {stroke}/>'
        f'<path {stroke} d="M220 250 H270 V230 H250"/>'
    )
    write(FIG / "q21a.svg", svg(640, 320, bridge))
    write(FIG / "q21b.svg", svg(640, 360, meal))
    write(FIG / "q21c.svg", svg(640, 360, park))


def write_objects():
    stroke = 'fill="none" stroke="#243026" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"'
    stick = (
        '<rect width="640" height="360" fill="#fff"/>'
        '<path d="M230 28 h36 v188 l168 62 l-16 36 L250 252 V28 Z" fill="#1d3557"/>'
        '<path d="M242 48 h12 M242 68 h12 M242 88 h12 M242 108 h12" stroke="#f4f1ea" stroke-width="5"/>'
        '<path d="M266 216 L430 278 L414 312 L250 250 Z" fill="#111"/>'
        '<path d="M300 236 l18 7 M340 250 l18 7 M380 266 l16 6" stroke="#f4f1ea" stroke-width="3"/>'
    )
    branch = (
        '<rect width="640" height="360" fill="#fff"/>'
        '<path d="M90 230 C180 150 250 250 340 190 C430 130 500 210 570 150 '
        'L590 168 C510 236 450 160 360 214 C270 270 190 176 100 250 Z" fill="#6b4a2a"/>'
        '<path d="M250 190 L210 110 L230 104 L268 186" fill="#6b4a2a"/>'
        '<path d="M430 160 L470 90 L486 100 L448 172" fill="#6b4a2a"/>'
    )
    oar = (
        '<rect width="640" height="360" fill="#fff"/>'
        f'<path {stroke} d="M160 300 L430 70"/>'
        f'<path {stroke} d="M400 40 C470 50 520 110 470 170 C430 150 400 100 400 40 Z"/>'
    )
    for name, body in (("a", stick), ("b", branch), ("c", oar)):
        text = svg(640, 360, body)
        write(FIG / f"q25{name}.svg", text)
        write(FIG / f"q26{name}.svg", text)


def write_q30():
    bee = (
        '<g transform="translate(150,150)">'
        '<ellipse cx="0" cy="0" rx="54" ry="32" fill="#f2c14e" stroke="#222" stroke-width="3"/>'
        '<path d="M-30 -8 H30 M-24 8 H24" stroke="#222" stroke-width="4"/>'
        '<ellipse cx="-10" cy="-28" rx="22" ry="12" fill="#fff" stroke="#222"/>'
        '<ellipse cx="16" cy="-26" rx="18" ry="10" fill="#fff" stroke="#222"/>'
        '<circle cx="48" cy="-6" r="14" fill="#f2c14e" stroke="#222" stroke-width="3"/>'
        "</g>"
    )
    flower = (
        '<g transform="translate(430,160)">'
        + "".join(
            f'<ellipse cx="{34 * math.cos(a):.1f}" cy="{34 * math.sin(a):.1f}" rx="22" ry="14" '
            f'fill="#e07a8a" transform="rotate({math.degrees(a):.0f} {34 * math.cos(a):.1f} {34 * math.sin(a):.1f})"/>'
            for a in [i * math.pi / 3 for i in range(6)]
        )
        + '<circle r="16" fill="#f2c14e"/>'
        "</g>"
    )
    write(FIG / "q30a.svg", svg(640, 320, f'<rect width="640" height="320" fill="#fff"/>{bee}{flower}'))
    farmer = person(180, 230, 1.3, "#3d7fc1", "#3a2f2a") + (
        '<path d="M150 150 l30 -28 l30 28" fill="none" stroke="#3a2f2a" stroke-width="4"/>'
    )
    field = (
        '<g transform="translate(360,120)">'
        '<rect width="180" height="120" rx="8" fill="#7cb86a" stroke="#2f6b22" stroke-width="3"/>'
        + "".join(f'<path d="M10 {y} H170" stroke="#2f6b22" stroke-width="2"/>' for y in (30, 55, 80, 105))
        + "</g>"
    )
    write(FIG / "q30b.svg", svg(640, 320, f'<rect width="640" height="320" fill="#fff"/>{farmer}{field}'))
    fish = (
        '<g transform="translate(170,160)" fill="#3d7fc1" stroke="#1f4e79" stroke-width="3">'
        '<ellipse cx="0" cy="0" rx="70" ry="32"/>'
        '<polygon points="62,0 100,-24 100,24"/>'
        '<circle cx="-30" cy="-6" r="4" fill="#fff" stroke="none"/>'
        "</g>"
    )
    heron = (
        '<g transform="translate(430,150)" fill="none" stroke="#243026" stroke-width="4" stroke-linejoin="round">'
        '<circle cx="0" cy="-20" r="16" fill="#d8d2c8"/>'
        '<path d="M-20 10 Q0 50 30 20"/>'
        '<path d="M10 -10 L70 -40"/>'
        '<path d="M-10 40 L-20 80 M10 46 L20 80"/>'
        "</g>"
    )
    write(FIG / "q30c.svg", svg(640, 320, f'<rect width="640" height="320" fill="#fff"/>{fish}{heron}'))


def write_q31():
    def scene(prop):
        people = (
            '<circle cx="120" cy="118" r="26" fill="#4a4a4a"/>'
            '<path d="M78 150 h84 l16 90 h-30 l-8 50 h-40 l-8 -50 h-30 z" fill="#4a4a4a"/>'
            '<circle cx="500" cy="118" r="26" fill="#4a4a4a"/>'
            '<path d="M458 150 h84 l16 90 h-30 l-8 50 h-40 l-8 -50 h-30 z" fill="#4a4a4a"/>'
        )
        relation = (
            '<line x1="190" y1="200" x2="270" y2="200" stroke="#d0d0d0" stroke-width="12"/>'
            '<line x1="370" y1="200" x2="450" y2="200" stroke="#d0d0d0" stroke-width="12"/>'
            '<polygon points="190,200 208,190 208,210" fill="#d0d0d0"/>'
            '<polygon points="450,200 432,190 432,210" fill="#d0d0d0"/>'
            '<circle cx="320" cy="200" r="42" fill="#9a9a9a"/>'
            '<text x="320" y="200" fill="#fff" font-size="46" font-weight="700" text-anchor="middle" '
            'dominant-baseline="central" font-family="Arial, Helvetica, sans-serif">?</text>'
        )
        return svg(640, 340, f'<rect width="640" height="340" fill="#8a8a8a"/>{prop}{people}{relation}')

    houses = (
        '<path d="M18 150 l40 -36 l40 36 v58 h-80 z" fill="#5e5e5e"/>'
        '<rect x="48" y="176" width="16" height="22" fill="#8a8a8a"/>'
        '<path d="M542 150 l40 -36 l40 36 v58 h-80 z" fill="#5e5e5e"/>'
        '<rect x="572" y="176" width="16" height="22" fill="#8a8a8a"/>'
    )
    guitars = (
        '<g fill="#2c2c2c">'
        '<g transform="translate(48,292)">'
        '<rect x="-3" y="-58" width="6" height="40"/>'
        '<circle cy="-62" r="6"/>'
        '<ellipse cy="0" rx="16" ry="22"/>'
        '<circle cy="-2" r="4" fill="#c8c8c8"/>'
        "</g>"
        '<g transform="translate(592,292)">'
        '<rect x="-3" y="-58" width="6" height="40"/>'
        '<circle cy="-62" r="6"/>'
        '<ellipse cy="0" rx="16" ry="22"/>'
        '<circle cy="-2" r="4" fill="#c8c8c8"/>'
        "</g></g>"
    )
    cases = (
        '<g fill="#2c2c2c">'
        '<rect x="28" y="248" width="44" height="30" rx="3"/>'
        '<path d="M40 248 v-9 h20 v9" fill="none" stroke="#2c2c2c" stroke-width="4"/>'
        '<rect x="568" y="248" width="44" height="30" rx="3"/>'
        '<path d="M580 248 v-9 h20 v9" fill="none" stroke="#2c2c2c" stroke-width="4"/>'
        "</g>"
    )
    write(FIG / "q31a.svg", scene(houses))
    write(FIG / "q31b.svg", scene(guitars))
    write(FIG / "q31c.svg", scene(cases))


def write_q47():
    def regions(left, right):
        return svg(
            480,
            360,
            '<rect width="480" height="360" fill="#161616"/>'
            '<path d="M36,48 C90,18 170,36 200,90 C230,150 196,220 150,262 C96,312 40,300 34,230 C24,150 8,78 36,48 Z" '
            'fill="none" stroke="#9b9b9b" stroke-width="14"/>'
            '<path d="M214,78 C290,28 430,46 454,120 C478,196 420,304 330,322 C246,338 196,260 228,190 C248,140 176,112 214,78 Z" '
            'fill="none" stroke="#9b9b9b" stroke-width="14"/>'
            f'<text x="92" y="170" fill="#c8c8c8" font-size="26" font-family="Arial, Helvetica, sans-serif">{escape(left)}</text>'
            f'<text x="292" y="230" fill="#c8c8c8" font-size="26" font-family="Arial, Helvetica, sans-serif">{escape(right)}</text>',
        )

    write(FIG / "q47a.svg", regions("North", "South"))
    write(FIG / "q47b.svg", regions("East", "West"))
    write(FIG / "q47c.svg", regions("Harbor", "Ridge"))


def choices(texts, key, images=None):
    images = images or [""] * len(texts)
    return [
        {"letter": "abcde"[i], "text": text, "keyed": i == key, "image": images[i]}
        for i, text in enumerate(texts)
    ]


def upsert(item, letter, stem, figure, image, option_choices):
    variant = {
        "id": letter,
        "label": f"Draft {letter}",
        "stem": stem,
        "figure": figure,
        "image": image,
        "choices": option_choices,
    }
    for index, existing in enumerate(item["variants"]):
        if existing["id"] == letter:
            item["variants"][index] = variant
            return
    item["variants"].append(variant)


def patch(item, letter, **fields):
    for variant in item["variants"]:
        if variant["id"] == letter:
            variant.update(fields)
            return
    raise SystemExit(f"Missing draft {item['order']} {letter}")


def copy_revision_photos():
    mapping = {
        FIG / "q21b.jpg": ASSETS / "q21-meal-line.jpg",
        FIG / "q21c.jpg": ASSETS / "q21-park-line.jpg",
        FIG / "q25a.jpg": ASSETS / "q25-hockey-stick.jpg",
        FIG / "q26b.jpg": ASSETS / "q26-branch-snow.jpg",
        FIG / "q26c.jpg": ASSETS / "q26-oar-snow.jpg",
        FIG / "q30a.jpg": ASSETS / "q30-bee-flower.jpg",
        FIG / "q30b.jpg": ASSETS / "q30-key-lock.jpg",
        FIG / "q30c.jpg": ASSETS / "q30-fish-heron.jpg",
        FIG / "q31a.jpg": ASSETS / "q31-neighbors.jpg",
        FIG / "q31b.jpg": ASSETS / "q31-musicians.jpg",
        FIG / "q31c.jpg": ASSETS / "q31-founders.jpg",
        FIG / "q47a.jpg": ASSETS / "q47-hospitals-map.jpg",
        FIG / "q47b.jpg": ASSETS / "q47-universities-map.jpg",
        FIG / "q47c.jpg": ASSETS / "q47-cities-map.jpg",
        OPT / "q27-a-a.jpg": ASSETS / "q27-tracks.jpg",
        OPT / "q27-a-b.jpg": ASSETS / "q27-apple.jpg",
        OPT / "q27-a-c.jpg": ASSETS / "q27-hallway.jpg",
        OPT / "q27-b-a.jpg": ASSETS / "q27-aerial.jpg",
        OPT / "q27-b-b.jpg": ASSETS / "q27-fence.jpg",
        OPT / "q27-b-c.jpg": ASSETS / "q27-mug.jpg",
        OPT / "q27-c-a.jpg": ASSETS / "q27-tower.jpg",
        OPT / "q27-c-b.jpg": ASSETS / "q27-leaf.jpg",
        OPT / "q27-c-c.jpg": ASSETS / "q27-aerial.jpg",
    }
    for dest, source in mapping.items():
        if not source.exists():
            raise SystemExit(f"Missing photograph {source}")
        shutil.copyfile(source, dest)


def copy_q7():
    sources = {
        "q07a.jpg": ASSETS / "q07-oak-maple.jpg",
        "q07b.jpg": ASSETS / "q07-river-lake.jpg",
        "q07c.jpg": ASSETS / "q07-violin-drum.jpg",
    }
    for name, source in sources.items():
        if source.exists():
            shutil.copyfile(source, FIG / name)
        elif not (FIG / name).exists():
            raise SystemExit(f"Missing photograph {source}")


def apply_bank():
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    by_order = {item["order"]: item for item in bank}

    notes = {
        "A": "An oak leaf and a maple leaf, photographed on white, with no labels.",
        "B": "A river and a lake, photographed side by side on white, with no labels.",
        "C": "A violin and a drum, photographed on white, with no labels.",
    }
    for letter, name in (("A", "q07a.jpg"), ("B", "q07b.jpg"), ("C", "q07c.jpg")):
        patch(by_order[7], letter, figure=notes[letter], image=f"tq/figures/{name}")

    q10_notes = {
        "A": "X is a gray circle and Y is a larger gray oval. Each letter sits inside its shape. The areas are not equal.",
        "B": "X is a gray pentagon and Y is a gray hexagon of a different size. Each letter sits inside its shape.",
        "C": "X is a gray star and Y is a gray square of a different size. Each letter sits inside its shape.",
    }
    for letter in "ABC":
        patch(by_order[10], letter, figure=q10_notes[letter], image=f"tq/figures/q10{letter.lower()}.svg")

    patch(
        by_order[11],
        "A",
        figure="Three gray bars. S, M, and L sit inside the bars. S is shortest, M is between them, and L is longest.",
        image="tq/figures/q11a.svg",
    )
    patch(
        by_order[11],
        "B",
        figure="Three gray cups. S, M, and L sit inside the cups, and the cups increase in size.",
        image="tq/figures/q11b.svg",
    )
    patch(
        by_order[11],
        "C",
        stem="In the image, what makes bottle M the medium bottle?",
        figure="Three gray bottles. S, M, and L sit inside the bottles, and the bottles increase in size.",
        image="tq/figures/q11c.svg",
        choices=choices(["its size", "bottle S", "bottle L", "Answers b and c", "Answers a, b, and c"], 4),
    )

    for letter, stem, figure, image, option_choices in (
        (letter, "Which image shows the most parts?", figure, image, option_choices)
        for letter, figure, image, option_choices in write_q18()
    ):
        upsert(by_order[18], letter, stem, figure, image, option_choices)

    scene = {
        "A": "A street corner with drivers, passengers, people walking, a dog, a cyclist, and someone in a shop. No written labels. More than nine perspectives are available.",
        "B": "A dinner with ten people around one table. No written labels. More than nine perspectives are available.",
        "C": "A hospital room and waiting area with patients and staff. No written labels. More than nine perspectives are available.",
    }
    for letter in "ABC":
        patch(by_order[20], letter, figure=scene[letter], image=f"tq/figures/q20{letter.lower()}.svg")

    subjects = {
        "A": "The original line drawing of a bridge, with no labels.",
        "B": "A plated meal, drawn as a line drawing in the same style as the bridge, with no labels.",
        "C": "A park with a path, trees, and a bench, drawn as a line drawing in the same style as the bridge, with no labels.",
    }
    for letter in "ABC":
        patch(by_order[21], letter, figure=subjects[letter], image=f"tq/figures/q21{letter.lower()}.jpg")

    for letter, stem, figure, image, options, key in write_q24():
        upsert(by_order[24], letter, stem, figure, image, choices(options, key))

    objects = {"A": "hockey stick", "B": "wooden branch", "C": "oar"}
    for letter, noun in objects.items():
        patch(
            by_order[25],
            letter,
            figure=f"A {noun} on white, with no caption.",
            image=f"tq/figures/q25{letter.lower()}.jpg",
        )
        patch(
            by_order[26],
            letter,
            figure=f"The same {noun} as draft {letter} of question 25, lying in snow, with no caption.",
            image=f"tq/figures/q26{letter.lower()}.jpg",
        )

    for letter, stem, figure, image, option_choices in write_q27():
        upsert(by_order[27], letter, stem, figure, image, option_choices)

    patch(
        by_order[30],
        "A",
        figure="Two photographs side by side: a bee and a flower. Nectar, pollination, and a meadow are not shown.",
        image="tq/figures/q30a.jpg",
        choices=choices(["nectar", "pollination", "a meadow", "All of the above", "None of the above"], 3),
    )
    patch(
        by_order[30],
        "B",
        figure="Two photographs side by side: a key and a padlock. Metal, access, and a door are not shown.",
        image="tq/figures/q30b.jpg",
        choices=choices(["metal", "access", "a door", "All of the above", "None of the above"], 3),
    )
    patch(
        by_order[30],
        "C",
        figure="Two photographs side by side: a fish and a heron. Predation, the sky, and a wetland are not shown.",
        image="tq/figures/q30c.jpg",
        choices=choices(["predation", "the sky", "a wetland", "All of the above", "None of the above"], 3),
    )

    relations = {
        "A": "Two people, each at a house, with a line and a blank between them. No word labels.",
        "B": "Two people, each with a guitar, with a line and a blank between them. No word labels.",
        "C": "Two people, each with a briefcase, with a line and a blank between them. No word labels.",
    }
    for letter in "ABC":
        patch(by_order[31], letter, figure=relations[letter], image=f"tq/figures/q31{letter.lower()}.jpg")

    for letter, stem, figure, image, options, key in write_q32():
        upsert(by_order[32], letter, stem, figure, image, choices(options, key))

    by_order[34]["note"] = (
        "Derek noted that variants are hard to write for this item. These three keep the two-head arrow pattern and change the words inside the heads."
    )
    for letter, stem, figure, image, options, key in write_q34():
        upsert(by_order[34], letter, stem, figure, image, choices(options, key))

    maps = {
        "A": "A map of two hospital campuses, labeled North and South.",
        "B": "A map of two university campuses, labeled East and West.",
        "C": "A street map of two cities, labeled Harbor and Ridge.",
    }
    for letter in "ABC":
        patch(by_order[47], letter, figure=maps[letter], image=f"tq/figures/q47{letter.lower()}.jpg")

    BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    copy_q7()
    copy_revision_photos()
    write_q10()
    write_q11()
    write_q20()
    write_q21()
    write_objects()
    write_q30()
    write_q31()
    write_q47()
    apply_bank()
    print("Applied Derek's draft revisions")


if __name__ == "__main__":
    main()
