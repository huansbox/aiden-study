## Parent PRD

`issues/prd-chinese-handwriting.md`

## What to build

Simplify the Chinese home screen while keeping only fully working choice-mode entry points visible. Chinese correction currently has no meaningful subtopic layer beyond the unit itself, so the home screen should remove redundant Chinese-only "全部練習" and "依概念練習" UI and expose a clear `選擇` entrance that still launches the existing four-choice flow.

## Acceptance criteria

- [ ] Chinese units no longer show the large `全部練習` button.
- [ ] Chinese units no longer show the redundant `依概念練習` row.
- [ ] Each Chinese unit displays its question count and a working `選擇` entry.
- [ ] The `選擇` entry starts choice mode and keeps existing four-choice behavior.
- [ ] The Chinese type label for choice practice is `改錯：選擇`.
- [ ] Existing choice progress shown on the home screen reads from choice-mode progress only.
- [ ] No unfinished `手寫` entry is shown in this slice.
- [ ] Non-Chinese subject home rendering is unchanged.
- [ ] Desktop, iPad portrait, and mobile-width smoke checks confirm Chinese choice entry still reaches Step 1 and Step 2 four-choice practice.

## Blocked by

- Blocked by `issues/016-chinese-choice-mode-compat.md`

## User stories addressed

- User story 2
- User story 3
- User story 35
- User story 38
- User story 39
