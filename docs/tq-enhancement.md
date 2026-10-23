# TQ enhancement

Question-bank review for the PST-SA parallel items. The shared bank is the live question plus drafts A, B, and C, except where drafts are turned off. Questions 1–6 (name, email, and the other intake items) are left out. Each member validates the remaining variants on a private copy and can add more variants.

Questions 9, 13, 14, 18, 24, 27, 32, and 34 show the original only. Members add a recommendation instead of marking drafts. Questions 48–71 (confidence, motivation, and facilitation) show the original only.

## Routes

| Path | Who | What |
|------|-----|------|
| `/tq-enhancement` | Any signed-in member | Mark each variant good or not, comment on it, add variants |
| `/tq-enhancement/copies` | Reviewer account only | Every member's marks, comments, and added variants |

A member who opens `/copies` sees an explanation and a link back to their own review. The database enforces the same rule.

## What a member can change

On each shared variant (original, A, B, C when it exists):

- Good or not good
- A comment for that variant

They can also add a variant: stem, choices, an optional figure note, the same good / not-good mark, and a comment. Added variants belong to that member. They cannot edit the shared bank text.

Feedback is stored on `tq_variant_feedback`. Added variants are stored on `tq_added_variants`. Both policies require `user_id = auth.uid()` for writes.

## Reviewer

`tq_reviewers` holds one user: the account for `sreek@stsi.pro`. That account can select every row and can still edit only its own rows. Team `lead` is not used. The copies page tallies Good and Not good for each shared variant, then lists added variants with the member's name.

## Images

Original stems use the live question art. Questions 18 and 27 show the choice panels. Drafts that have a drawing show `public/tq/figures/qNNa.jpg` (and B, C) next to the figure brief. Added variants store a figure note, not an uploaded image.

## Regenerating the bank

From `Teaming App/Teaming`:

```bash
python scripts/build-tq-bank.py
```

That rereads `stsi.tools/src/tq_test/parallel_bank/source_items.json` and recopies the figures. The workbook and that JSON are produced together by `build_review.py`.
