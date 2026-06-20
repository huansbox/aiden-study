# PRD：國語改錯字手寫進階版

## Problem Statement

目前國語改錯字第一版已能讓孩子先在句子中找出錯字，再用四選一選出正確字。這個流程適合初階辨識，但孩子真正需要補強的不只是「知道哪個字對」，還包含「能不能自己寫出正確的字」。

四選一模式也無法區分兩種能力：孩子可能能從選項中認出正確字，卻在沒有提示時寫不出來。家長希望第二階段提供一個手寫進階版，讓孩子在找出錯字後，不看選項，直接嘗試寫出正確字。若孩子寫不出來或自評不熟，系統要立刻安排當場補練，幫助孩子熟悉字形。

這個功能必須延續第一階段的穩定性：不改四選一題庫品質、不引入外部筆順資料、不做高風險的自動手寫判斷，也不能讓手寫模式污染既有四選一進度與錯題統計。

## Solution

國語改錯字新增「手寫」進階入口，與既有「選擇」初階入口並存。

孩子進入手寫模式後，仍先完成 Step 1：在句子中點出錯字。點中錯字後不再進入四選一，而是進入手寫 Step 2：畫面保留原句與錯字 highlight，顯示一個大正方形米字格手寫區。此時不顯示正確答案，操作只有清除、我寫好了、看提示。

孩子按「我寫好了」後進入自我檢查畫面。系統不自動判斷字跡對錯，而是並排或上下顯示「你寫的」與「正確字」，並顯示改正後完整句子。孩子自評「我寫對了」即算手寫答對；孩子選「不太會寫」即算手寫答錯，進入手寫錯題庫，並進行三次補練。

孩子一開始若按「看提示」，等同選「不太會寫」：立即算手寫答錯，進手寫錯題庫，直接開始三次補練。

三次補練規則：

1. 第一次顯示淡灰色完整正確字作為描紅提示。
2. 第二次與第三次是空白米字格，孩子自己寫。
3. 每次都只提供清除與我寫好了。
4. 第三次完成後顯示「練完了，真棒」，按下一題繼續。
5. 補練完成不會把本題改成答對，也不會從手寫錯題庫移除；之後需在手寫錯題練習中獨立寫對，才算真正掌握。

國語首頁也要配合簡化：國語沒有其他科目的「依概念練習」層級，目前只有改錯字。國語首頁應移除多餘的「全部練習」大按鈕與重複 subtopic row，每個國語單元直接顯示題數與兩個入口：「選擇」和「手寫」。題型標籤改成「改錯：選擇」與「改錯：手寫」。

錯題統計要依模式分開：四選一錯題與手寫錯題分別記錄、分別顯示、分別練習。正式題目 ID 不拆成兩份；同一題仍只有一個原始題目 ID，但作答紀錄、mastered、errorBank、batch 需加入 mode 維度，避免四選一答對讓手寫模式通關，或手寫錯題污染四選一錯題。

## User Stories

1. As a child, I want to choose handwrite practice for Chinese correction questions, so that I can practice writing the correct character without seeing choices.
2. As a child, I want to keep using choice practice when I am tired, so that I can practice recognition without being forced to handwrite every time.
3. As a parent, I want choice and handwriting to be separate entrances, so that I can pick the difficulty level for the child.
4. As a child, I want the sentence to stay visible after I pick the wrong character, so that I remember the context of the character I need to write.
5. As a child, I want the wrong character I picked to remain highlighted, so that I know which character I am correcting.
6. As a child, I want the handwriting screen to hide the correct answer at first, so that I really try to recall the character myself.
7. As a child, I want a large writing box, so that I can write comfortably with my finger on an iPad.
8. As a child, I want the writing box to show a rice-grid guide, so that I can place the character structure more easily.
9. As a child, I want a clear button, so that I can erase the whole box and rewrite when I make a mistake.
10. As a child, I do not need an eraser or undo tool, so that the writing controls stay simple.
11. As a child, I want to use my finger to write, so that the feature works on the iPad without requiring Apple Pencil.
12. As a parent, I want Apple Pencil to work naturally if available, so that the same writing surface supports both finger and pen input.
13. As a child, I want to press "我寫好了" after writing, so that I can compare my writing with the correct answer.
14. As a child, I want to see my own writing next to the correct character, so that I can judge whether I wrote it correctly.
15. As a child, I want to see the correct character as a large single character, so that I can compare the shape clearly.
16. As a child, I want to see the corrected full sentence, so that I understand how the character is used in context.
17. As a child, I want to press "我寫對了" when I think my writing is correct, so that the system counts the handwriting question as mastered.
18. As a child, I want to press "不太會寫" when I am unsure, so that I can practice the character immediately.
19. As a child, I want to press "看提示" if I cannot start, so that I do not get stuck on a blank writing box.
20. As a parent, I want "看提示" and "不太會寫" to count as handwriting mistakes, so that the mistake record reflects that the child could not write independently.
21. As a child, I want the first remedial practice to show a faint correct character, so that I can trace and learn the shape.
22. As a child, I want the second and third remedial practices to be blank, so that I can practice recalling the character myself.
23. As a child, I want to complete three practice attempts right away, so that I build familiarity before moving on.
24. As a child, I want to see "練完了，真棒" after the three practices, so that I have a clear and positive stopping point.
25. As a parent, I want remedial practice not to remove the question from the handwriting mistake bank, so that the child must prove mastery later.
26. As a child, I want handwriting mistake practice to test the character again without showing the answer first, so that I can confirm I have learned it.
27. As a parent, I want handwriting mistake practice answered correctly to remove the handwriting mistake, so that the mistake bank reflects current ability.
28. As a parent, I want handwriting mistake practice answered correctly to count toward handwriting progress, so that progress reflects real independent writing.
29. As a parent, I want choice progress and handwriting progress to be separate, so that recognizing a character does not falsely mark writing as mastered.
30. As a parent, I want choice mistakes and handwriting mistakes to be separate, so that I can tell whether the child struggles with recognition or writing.
31. As a parent, I want the original question ID to stay the same, so that the question bank does not duplicate every Chinese question.
32. As a developer, I want mode-aware stats, mastered, errorBank, and batch state, so that choice and handwriting can share the same question data safely.
33. As a child, I want handwriting batches to be shorter than choice batches, so that writing practice does not feel too long.
34. As a parent, I want handwriting batches to use 5 questions, so that a practice session is manageable.
35. As a child, I want choice mode to keep the existing four-choice behavior, so that familiar practice remains available.
36. As a parent, I want choice mode to keep its existing mistake threshold, so that the first-stage behavior does not change.
37. As a parent, I want handwriting mode to add a mistake after one "看提示" or "不太會寫", so that acknowledged writing difficulty is captured immediately.
38. As a child, I want the Chinese homepage to show "選擇" and "手寫" clearly, so that I know which practice mode I am entering.
39. As a child, I do not want to see duplicated "依概念練習" rows for Chinese correction, so that the homepage is simpler.
40. As a parent, I want Chinese mistake buttons to show "選擇錯題" and "手寫錯題", so that I can start the right kind of review.
41. As a developer, I want handwriting strokes not to be stored in localStorage, so that backups stay small and private.
42. As a developer, I want the handwriting board to use pointer events, so that finger, pen, and mouse input share one implementation.
43. As a developer, I want no external stroke-order dependency in version one, so that the feature works offline with the existing static site model.
44. As a developer, I want pure-function tests for mode state transitions, so that storage and progress rules do not regress.
45. As a parent, I want browser smoke tests for desktop, iPad portrait, and mobile widths, so that the handwriting UI is usable on real practice screens.

## Implementation Decisions

- Keep the existing Chinese correction question schema. Do not add new data fields for handwriting mode.
- Do not duplicate question IDs for choice and handwriting. Add a practice mode dimension to progress and mistake records instead.
- Use two Chinese practice modes: choice and handwriting.
- Choice mode keeps the existing Step 2 four-choice behavior.
- Handwriting mode replaces Step 2 with a handwriting workflow.
- Existing first-stage Chinese progress should be treated as choice-mode progress during migration or compatibility reads.
- Mode-aware state must cover stats, mastered, errorBank, and challenge batch state.
- Choice mode keeps the existing batch size and mistake threshold.
- Handwriting mode uses 5 questions per batch.
- Handwriting mistakes enter the handwriting mistake bank immediately when the child presses "看提示" or "不太會寫".
- Handwriting remedial practice completion does not remove the mistake and does not mark mastered.
- Handwriting mistake practice answered with "我寫對了" removes the handwriting mistake and marks the handwriting question as mastered.
- Handwriting strokes are transient UI state only and must not be saved in persistent storage or backups.
- The handwriting board uses pointer events and supports finger-first input, while naturally accepting pen and mouse.
- The handwriting board uses a large square surface modeled after the reference stroke-order website: roughly 86vw on phone, with a practical iPad cap around 520px.
- The handwriting board shows faint rice-grid helper lines.
- The first remedial practice shows a faint complete correct character as tracing guidance.
- The second and third remedial practices show blank rice-grid writing boxes.
- The self-check screen shows both the child's writing and the correct character. Desktop and iPad can use side-by-side layout; mobile can stack vertically.
- The self-check screen also shows the corrected full sentence generated from the existing text, wrong character, and answer.
- Chinese homepage rendering is a Chinese-specific special case: remove the large "全部練習" button and the redundant "依概念練習" row, then show direct "選擇" and "手寫" buttons per unit.
- Chinese type labels should be "改錯：選擇" and "改錯：手寫".
- Chinese mistake review buttons should distinguish "選擇錯題" and "手寫錯題".
- Do not use external stroke-order services, cloud recognition, OCR, or handwriting recognition in version one.
- Use the existing static site architecture and avoid adding a backend.

## Testing Decisions

- Test external behavior and state transitions rather than implementation details.
- Add pure-function tests for mode-aware state rules where possible.
- Cover that choice mastered and handwriting mastered are independent.
- Cover that choice error bank and handwriting error bank are independent.
- Cover that existing unmodeled Chinese progress is interpreted as choice mode for compatibility.
- Cover that handwriting batch size is 5 while choice batch behavior remains unchanged.
- Cover that "看提示" and "不太會寫" immediately create handwriting mistakes.
- Cover that remedial practice completion does not remove a handwriting mistake.
- Cover that handwriting mistake practice answered correctly removes the handwriting mistake and marks handwriting mastered.
- Cover that transient handwriting strokes are not part of backup or localStorage payloads.
- Keep existing Chinese curated data validation.
- Keep existing build and regression tests.
- Run browser smoke tests for desktop, iPad portrait, and mobile width.
- Smoke test choice mode still works.
- Smoke test handwriting mode "我寫對了" path.
- Smoke test handwriting mode "看提示" or "不太會寫" path through three remedial practices.
- Smoke test handwriting mistake review path: create a handwriting mistake, enter handwriting mistake review, self-check as correct, and verify removal.

## Out of Scope

- Changing four-choice option quality or option generation rules.
- Adding more Chinese correction questions.
- Automatic handwriting recognition.
- Stroke-order validation.
- Stroke-order animation.
- External stroke-order website integration.
- Cloud handwriting APIs.
- Saving handwritten images or strokes.
- Apple Pencil-specific pressure, tilt, palm rejection, or pencil-only mode.
- Eraser and undo tools.
- Changing non-Chinese subject home rendering.
- Reworking the existing reward system.

## Further Notes

- The reference stroke-order website is used only for size and interaction inspiration. It measured roughly 338px square on a 390px-wide phone viewport and roughly 558px square on a 768px-wide iPad portrait viewport.
- The implementation should preserve the first-stage choice mode as the beginner path. Handwriting is an advanced path, not a replacement.
- Because handwriting uses self-assessment, wording matters. Avoid shame language; use "不太會寫" and positive completion copy.
- The phrase after three remedial practices is "練完了，真棒".
- The PRD intentionally keeps data and UI simple enough for one-person maintenance.
