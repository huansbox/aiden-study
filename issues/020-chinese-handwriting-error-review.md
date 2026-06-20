## Parent PRD

`issues/prd-chinese-handwriting.md`

## What to build

Complete the mode-aware mistake-review loop for Chinese correction practice. The home screen should distinguish choice mistakes from handwriting mistakes, and handwriting mistake practice should retest the same question through the handwriting self-check path. A handwriting mistake is cleared only when the child independently writes and self-assesses as correct.

## Acceptance criteria

- [ ] The Chinese mistake area displays separate `選擇錯題` and `手寫錯題` entries.
- [ ] Choice mistake counts and handwriting mistake counts are separate.
- [ ] Old flat error-bank entries appear only under `選擇錯題`.
- [ ] Choice mistake review behavior remains unchanged.
- [ ] Handwriting mistake review starts handwriting mode and does not show the answer before writing.
- [ ] Handwriting mistake review still begins with Step 1 finding the wrong character, then proceeds to handwriting and self-check.
- [ ] Pressing `我寫對了` in handwriting mistake review removes only the handwriting error-bank entry.
- [ ] Pressing `我寫對了` in handwriting mistake review adds handwriting mastered.
- [ ] Pressing `我寫對了` in handwriting mistake review does not remove choice error-bank entries for the same question.
- [ ] Pressing `我寫對了` in handwriting mistake review does not add choice mastered.
- [ ] Pressing `看提示` or `不太會寫` in handwriting mistake review keeps the question in handwriting error bank and runs remedial practice.
- [ ] The same original question ID can have separate choice and handwriting progress without duplicating the question data.
- [ ] Sentinel pure-function tests cover handwriting error review removal, choice/handwriting error coexistence, and mode-isolated mastered updates.
- [ ] Desktop, iPad portrait, and mobile-width smoke checks cover: create handwriting mistake, enter `手寫錯題`, self-assess correct, verify removal; then verify choice mistake review is unaffected.

## Blocked by

- Blocked by `issues/019-chinese-handwriting-remediation.md`

## User stories addressed

- User story 26
- User story 27
- User story 28
- User story 29
- User story 30
- User story 31
- User story 40
- User story 44
- User story 45
