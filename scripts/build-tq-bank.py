"""Rebuild the TQ enhancement bank and copy its figures.

Reads the parallel-item JSON that build_review.py writes next to the workbook.
"""

import json
import shutil
from pathlib import Path

LETTERS = "abcdefghijklmnopqrstuvwxyz"
# Question 9 keeps the original only. Reviewers write a recommendation instead of marking drafts.
# Questions 13 and 14 take their drafts from parts-drafts.json.
# Questions 18, 24, 27, 32, and 34, and the figure revisions, are reapplied
# by apply_derek_drafts.py after this script writes the bank.
RECOMMENDATION_ORDERS = {9}
ROOT = Path(__file__).resolve().parents[3]
BANK = ROOT / "stsi.tools" / "src" / "tq_test" / "parallel_bank"
MEDIA = ROOT / "stsi.tools" / "src" / "media"
APP = Path(__file__).resolve().parents[1]
PUBLIC = APP / "public" / "tq"
OUT = APP / "src" / "apps" / "tq-enhancement" / "lib" / "bank.json"
PARTS = APP / "src" / "apps" / "tq-enhancement" / "lib" / "parts-drafts.json"


def group_of(item):
    if item["scoring"] == "confidence":
        return "confidence"
    if item["category"] in {"DESC", "MO", "FA"}:
        return "intake" if item["category"] == "DESC" else item["category"]
    return item["category"]


def keyed(option):
    return bool(option.get("weights")) or bool(option.get("correct"))


def main():
    items = json.loads((BANK / "source_items.json").read_text(encoding="utf-8"))
    parts = json.loads(PARTS.read_text(encoding="utf-8")) if PARTS.exists() else {}
    for folder in ("originals", "figures", "options"):
        (PUBLIC / folder).mkdir(parents=True, exist_ok=True)

    bank = []
    for item in items:
        if item["order"] <= 6:
            continue
        image_rel = ""
        if item.get("image"):
            name = Path(item["image"]).name
            shutil.copy2(MEDIA / "tq_questions" / name, PUBLIC / "originals" / name)
            image_rel = f"tq/originals/{name}"

        original_choices = []
        for index, option in enumerate(item["options"]):
            choice_image = ""
            if option.get("image") and item["order"] in (18, 27):
                letter = LETTERS[index]
                src_name = f"Answer{item['order']}{letter}.png"
                dest = f"q{item['order']}{letter}.png"
                shutil.copy2(MEDIA / "tq_options" / src_name, PUBLIC / "options" / dest)
                choice_image = f"tq/options/{dest}"
            original_choices.append({
                "letter": LETTERS[index],
                "text": option["text"],
                "keyed": keyed(option),
                "image": choice_image,
            })

        variants = [{
            "id": "original",
            "label": "Original",
            "stem": item["text"],
            "figure": "",
            "image": image_rel,
            "choices": original_choices,
        }]
        for draft in item.get("drafts") or []:
            fig_file = f"q{item['order']:02d}{draft['label'].lower()}.jpg"
            fig_rel = ""
            fig_path = BANK / "figures" / fig_file
            if fig_path.exists():
                shutil.copy2(fig_path, PUBLIC / "figures" / fig_file)
                fig_rel = f"tq/figures/{fig_file}"
            texts = draft.get("options") or [choice["text"] for choice in original_choices]
            choices = []
            for index, text in enumerate(texts):
                source = original_choices[index] if index < len(original_choices) else None
                choices.append({
                    "letter": LETTERS[index],
                    "text": text,
                    "keyed": bool(source and source["keyed"]),
                    "image": "",
                })
            variants.append({
                "id": draft["label"],
                "label": f"Draft {draft['label']}",
                "stem": draft["stem"],
                "figure": draft.get("figure") or "",
                "image": fig_rel,
                "choices": choices,
            })
        if item["order"] in RECOMMENDATION_ORDERS or 48 <= item["order"] <= 71:
            variants = [variant for variant in variants if variant["id"] == "original"]
        extra = parts.get(str(item["order"])) or []
        if extra:
            variants = [variant for variant in variants if variant["id"] == "original"] + extra
        bank.append({
            "order": item["order"],
            "category": item["category"],
            "scoring": item["scoring"],
            "qtype": item["qtype"],
            "note": item.get("note") or "",
            "group": group_of(item),
            "variants": variants,
        })

    OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=2), encoding="utf-8")
    from apply_derek_drafts import main as apply_derek_drafts

    apply_derek_drafts()
    bank = json.loads(OUT.read_text(encoding="utf-8"))
    drafted = sum(1 for item in bank if len(item["variants"]) > 1)
    print(f"Items: {len(bank)}")
    print(f"With drafts: {drafted}")
    print(OUT)


if __name__ == "__main__":
    main()
