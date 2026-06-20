## Parent PRD

`issues/prd-chinese-handwriting.md`

## What to build

Add the handwriting failure and remedial-practice path. Handwriting mode should let the child ask for help with `看提示` before writing, or self-assess as `不太會寫` after comparing their writing. Either path immediately records a handwriting mistake and starts three remedial writing attempts: first with a faint tracing character, then two blank rice-grid attempts.

## Acceptance criteria

- [ ] The initial handwriting screen exposes `看提示`.
- [ ] Pressing `看提示` immediately records a handwriting mistake and adds the question to the handwriting error bank.
- [ ] The self-check screen exposes `不太會寫`.
- [ ] Pressing `不太會寫` immediately records a handwriting mistake and adds the question to the handwriting error bank.
- [ ] Both help paths start the three-attempt remedial practice flow.
- [ ] The first remedial attempt shows a faint complete correct character as tracing guidance.
- [ ] The second and third remedial attempts use blank rice-grid handwriting boxes.
- [ ] Each remedial attempt provides only `清除` and `我寫好了`.
- [ ] Completing the third remedial attempt shows `練完了，真棒`.
- [ ] Remedial completion advances to the next question only after an explicit `下一題` action.
- [ ] Remedial completion does not remove the handwriting error-bank entry.
- [ ] Remedial completion does not mark handwriting mastered.
- [ ] Handwriting error-bank entries can coexist with choice error-bank entries for the same question ID.
- [ ] Help/remedial state updates do not affect choice stats, choice mastered, or choice error bank.
- [ ] Sentinel pure-function tests cover `看提示`, `不太會寫`, remedial attempt progression, and error-bank retention.
- [ ] Desktop, iPad portrait, and mobile-width smoke checks pass for both the `看提示` path and the `不太會寫` path through remedial completion.

## Blocked by

- Blocked by `issues/018-chinese-handwriting-happy-path.md`

## User stories addressed

- User story 18
- User story 19
- User story 20
- User story 21
- User story 22
- User story 23
- User story 24
- User story 25
- User story 37
- User story 45
