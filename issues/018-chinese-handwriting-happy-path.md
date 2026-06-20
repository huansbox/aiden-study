## Parent PRD

`issues/prd-chinese-handwriting.md`

## What to build

Add the first complete handwriting-mode path for Chinese correction practice. This slice makes the new `手寫` entry visible only once it can complete a full happy path: choose handwriting mode, find the wrong character, write in a rice-grid canvas, self-check against the correct character and corrected sentence, then mark the question as handwriting mastered by choosing `我寫對了`.

## Acceptance criteria

- [ ] Chinese units show a working `手寫` entry in addition to the existing `選擇` entry.
- [ ] The `手寫` entry starts handwriting mode with batch size 5.
- [ ] The Chinese type label for handwriting practice is `改錯：手寫`.
- [ ] Step 1 finding the wrong character reuses the existing Chinese correction interaction.
- [ ] After the wrong character is picked, the original sentence remains visible and the picked wrong character remains highlighted.
- [ ] The initial handwriting screen does not show the correct answer.
- [ ] The handwriting area is a large centered square with faint rice-grid helper lines.
- [ ] The handwriting area uses Pointer Events so finger, pen, and mouse share the same drawing path.
- [ ] The handwriting screen provides `清除` and `我寫好了`.
- [ ] This slice does not expose unfinished `看提示` or `不太會寫` controls.
- [ ] `清除` clears the current writing without changing progress.
- [ ] Pressing `我寫好了` opens self-check.
- [ ] Self-check shows the child's writing, the correct character as a large single character, and the corrected full sentence.
- [ ] Desktop and iPad layouts may show the child's writing and correct character side by side; mobile may stack them vertically.
- [ ] Pressing `我寫對了` records a handwriting correct answer and adds handwriting mastered.
- [ ] `我寫對了` does not add choice mastered and does not touch choice error-bank state.
- [ ] Handwriting strokes are transient and are not stored in localStorage or backup data.
- [ ] Sentinel pure-function tests cover handwriting mastered isolation, handwriting batch size 5, and stroke persistence exclusion where applicable.
- [ ] Desktop, iPad portrait, and mobile-width smoke checks pass for the full handwriting happy path.

## Blocked by

- Blocked by `issues/016-chinese-choice-mode-compat.md`
- Blocked by `issues/017-chinese-home-choice-entry.md`

## User stories addressed

- User story 1
- User story 4
- User story 5
- User story 6
- User story 7
- User story 8
- User story 9
- User story 10
- User story 11
- User story 12
- User story 13
- User story 14
- User story 15
- User story 16
- User story 17
- User story 33
- User story 34
- User story 38
- User story 42
- User story 43
- User story 45
