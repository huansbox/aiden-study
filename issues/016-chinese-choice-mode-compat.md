## Parent PRD

`issues/prd-chinese-handwriting.md`

## What to build

Make existing Chinese choice-mode correction practice run on top of mode-aware progress storage without changing the visible choice-mode behavior. This is the compatibility tracer for the handwriting PRD: old unmodeled Chinese progress must be interpreted as `choice`, existing choice practice must still work end to end, and the new `handwriting` mode space must not pollute choice-mode stats, mastered progress, error bank, or batch state.

## Acceptance criteria

- [ ] Existing Chinese choice practice still works end to end: enter a Chinese unit, pick the wrong character, answer the four-choice step, and advance normally.
- [ ] Existing unmodeled `stats`, `mastered`, `errorBank`, and `challenge` records are interpreted as `choice` mode and never as `handwriting`.
- [ ] Old `OLD_KEY` migration output is stored as `choice` stats.
- [ ] Old challenge keys such as `13` or `13/L7-L8 改錯字` do not collide with future handwriting batch keys; existing behavior may safely keep or discard old partial batches according to current rules, but progress must not move backward.
- [ ] Old `mastered[unit] = [questionId]` means choice mastered only; handwriting mastered starts empty.
- [ ] Old `errorBank: [{ questionId, unit }]` means choice error bank only.
- [ ] New error-bank deduplication and removal are keyed by `questionId + mode`.
- [ ] `wrongCount` is mode-aware; choice mode keeps the existing wrong-threshold behavior.
- [ ] `flagQuestion` clears all mode variants of stats, mastered entries, and error-bank entries for that question.
- [ ] Backup import accepts both old and new storage shapes; old backups reload as choice-mode progress.
- [ ] Backup export and localStorage do not include handwriting strokes, canvas data, or image data.
- [ ] Add or extend a sentinel pure-function block for Chinese mode state, and cover migration, compatibility, and mode isolation with `node:test`.
- [ ] Existing validation and regression tests still pass.

## Blocked by

None - can start immediately

## User stories addressed

- User story 29
- User story 30
- User story 31
- User story 32
- User story 36
- User story 41
- User story 44
