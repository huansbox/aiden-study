#!/usr/bin/env bash
# Mac 驗證 helper（PRD #7 / issue #10）：在「備忘錄」建一則測試備份筆記，
# 供「Aiden還原」捷徑驗證用。建好捷徑後跑：
#   bash scripts/seed_test_backup_note.sh
#   shortcuts run Aiden還原
#
# 注意：osascript 寫進 Notes 的內文經 HTML 轉換，未必跟「真的從網站分享到備忘錄」逐字相同。
# 這支當快速冒煙測試；最終驗收請也用真機從 live 站按「備份到備忘錄」存一則真備份再跑一次。
set -euo pipefail

MARKER="AIDEN備份"
TS="$(date '+%Y-%m-%d %H:%M')"
# 形狀＝物件且含 mastered 或 challenge（網站 parseBackup 的驗證規則）。
# 用一個顯眼的 sentinel key，還原後好辨認 localStorage 確實被覆蓋。
JSON='{"mastered":{"__RESTORE_TEST__":true},"challenge":{},"errorBank":[],"stats":{},"flagged":[]}'
NOTE_TEXT="${MARKER} ${TS}"$'\n'"${JSON}"
# Notes 的 body 是 HTML：直接塞 \n 會被 HTML 併成空白，捷徑讀回的 Body 就沒換行，
# 害網站 parseBackup 剝不掉記號行而解析失敗。改用 <div> 分段，強制保留換行。
NOTE_HTML="<div>${MARKER} ${TS}</div><div>${JSON}</div>"

# 1) 在 Notes 建測試筆記（第一段＝標題＝記號＋日期；第二段＝JSON）
osascript - "$NOTE_HTML" <<'APPLESCRIPT'
on run argv
  set noteBody to item 1 of argv
  tell application "Notes"
    make new note with properties {body:noteBody}
  end tell
end run
APPLESCRIPT

# 2) 算出「捷徑應該組出」的 URL-safe base64，供肉眼比對
B64="$(printf '%s' "$NOTE_TEXT" | base64 | tr '+/' '-_' | tr -d '=' | tr -d '\n')"
URL="https://huansbox.github.io/aiden-study/#restore=${B64}"

echo "✓ 已在「備忘錄」建測試筆記，標題：${MARKER} ${TS}"
echo
echo "接著跑捷徑（捷徑名稱須一字不差 = Aiden還原）："
echo "    shortcuts run Aiden還原"
echo
echo "驗收要看到："
echo "  - 捷徑彈出 Choose from List，列出含「${TS}」的那則"
echo "  - 選下去後，瀏覽器開啟的網址 = 下面這串（捷徑組的應與此一致）"
echo "  - 網站二次確認顯示「（${TS} 的備份）」，按確定後 localStorage 被覆蓋"
echo
echo "預期 URL："
echo "    ${URL}"
echo
echo "（清理：在 Notes 把這則「${MARKER} ${TS}」測試筆記刪掉即可。）"
