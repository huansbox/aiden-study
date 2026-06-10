"""
AI 分類器 + 答案補充（可切換學期 taxonomy，PRD 深模組C）

讀取該學期的 raw 題目，用 claude -p 批次分類所屬單元/子主題；無官方答案者由 AI
補答案並標記需複查。核心分類邏輯與學期無關，學期差異全在注入的 config（system
prompt、合法 unit/subtopic、輸入輸出路徑、模型）。

用法：
  uv run python scripts/classify.py                 # 期中（預設）
  uv run python scripts/classify.py --semester final # 期末
"""
import sys
import os
import json
import subprocess
import re
import time
import argparse
import logging
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from data_helpers import (normalize_text, dedupe_by_text, merge_answer,
                          validate_unit_subtopic, VALID_BLANK_INPUTS)

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

MAX_RETRIES = 3


# ── 學期分類設定（模組C）──────────────────────────────────

MIDTERM_SYSTEM_PROMPT = """你是國小三年級自然科考題分類專家。請將每道題目分類到以下單元和子主題：

第1單元：田園樂
- 蔬菜從哪裡來：題目核心是蔬菜的產地、種類辨識、哪些部位可食用
- 影響蔬菜生長的因素：題目核心是光、水、土壤、氣候、蟲害、肥料對生長的影響
- 蔬菜生長的變化過程：題目核心是發芽、開花、結果等生命週期順序，播種方式，觀察記錄

第2單元：溫度變化對物質的影響
- 影響物質變化的因素：題目核心是「什麼條件造成物質狀態或外觀改變」（不限溫度，含空氣、水分等因素導致的生鏽、變質等）
- 溫度對水的變化：題目核心是冰、水、水蒸氣三態，含融化/結冰/蒸發/凝結
- 溫度對其他物質的影響：題目核心是非水物質（奶油、巧克力、鐵…）受溫度改變

衝突規則：若題目同時符合兩個單元，優先歸屬「題目直接詢問的核心概念」所屬單元。
不屬於以上任何子主題的題目，unit 填 "none"。

對於每道題目，請回傳：
- unit: "1" 或 "2" 或 "none"
- subtopic: 上述六個子主題之一，若 unit 為 "none" 則填 "none"
- confidence: 0-100 的整數，表示分類信心
- classify_reason: 一句話說明分類理由
- answer: 正確答案（是非題填 "true" 或 "false"，選擇題填 "1"/"2"/"3"/"4"）。若題目已有答案則直接回傳該答案，若無答案請根據國小三年級自然科知識判斷正確答案。

請以 JSON array 格式回傳，每個元素對應一道題目，按輸入順序排列。只回傳 JSON，不要有其他文字。"""


FINAL_SYSTEM_PROMPT = """你是國小三年級下學期自然科「期末」考題分類專家。期末範圍為以下兩個單元，請將每道題目分類到對應的單元與子主題（以桃子腳國小範圍為基準）：

第3單元：動物
- 動物分類：哺乳類/爬蟲類/兩生類/鳥類/魚類的辨識與特徵
- 身體構造：頭、軀幹、四肢，以及翅膀/羽毛/鱗片/鰭/蹼/爪等構造及其對應功能
- 生存與適應：保護色/警戒色、瞳孔受光變化、食性、棲地（如蚯蚓住處）等生存適應
- 觀察方法：在戶外觀察動物的方法、使用的工具與正確態度

第4單元：天氣
- 風：風向、風力，以及風向標／風向風力計等觀測工具
- 氣溫測量：氣溫計的使用、百葉箱
- 雨量降雨：雨量的測量（容器形狀）、西北雨／太陽雨的成因
- 天氣預報：預報種類（今日/一週/國際都市/漁業）、資訊判讀、降雨機率的意義

衝突規則：若題目同時符合兩個單元，優先歸屬「題目直接詢問的核心概念」所屬單元。
不屬於以上任何子主題的題目（超出期末範圍），unit 填 "none"。

對於每道題目，請回傳：
- unit: "3" 或 "4" 或 "none"
- subtopic: 上述八個子主題之一，若 unit 為 "none" 則填 "none"
- confidence: 0-100 的整數，表示分類信心
- classify_reason: 一句話說明分類理由
- answer: 正確答案（是非題填 "true" 或 "false"，選擇題填 "1"/"2"/"3"/"4"）。若題目已有答案則直接回傳該答案，若無答案請根據國小三年級自然科知識判斷正確答案。

請以 JSON array 格式回傳，每個元素對應一道題目，按輸入順序排列。只回傳 JSON，不要有其他文字。"""


MATH_SYSTEM_PROMPT = """你是國小三年級下學期數學「期末」考題分類專家。期末範圍為康軒版三下單元 5～9
（單元名稱依均一教育平台類康軒版與多來源交叉查證，與桃子腳/安和卷面內容吻合；issues/010 定案），
請將每道題目分類到對應的單元與子主題（以桃子腳國小範圍為基準）：

單元5：小數
- 小數的認識：一位小數讀寫、十分位、N個0.1 的化聚、小數與分數的關係
- 小數比大小：小數/分數/整數混合比較大小（>、<、=）
- 小數加減：小數加減計算（含直式）

單元6：圓
- 圓的構造：圓心/圓周/半徑/直徑的名稱與關係、對摺找圓心
- 圓規與畫圓：圓規開度與半徑/直徑的關係、用圓規畫圓或量長度
- 圓的大小比較：以半徑/直徑判斷圓的大小

單元7：乘法與除法
- 乘除互逆：用乘法驗算除法（或反之）、( )×5=120 式反推
- 乘除計算：整數乘除直式計算、商與餘數
- 乘除應用：乘除文字應用題（含兩步驟、列式判斷）

單元8：時間
- 時刻與時間單位：時刻判讀、合理時間單位的選擇
- 時制互換：24時制與12時制互換
- 時間計算：時間量的加減（幾時幾分±幾時幾分）、時間量比較

單元9：統計表
- 報讀表格：報讀功課表/票價表/時刻表等表格並回答問題

衝突規則：若題目同時符合兩個單元，優先歸屬「題目直接詢問的核心概念」所屬單元。
不屬於以上任何子主題的題目（超出期末範圍），unit 填 "none"。

對於每道題目，請回傳：
- unit: "5"～"9" 或 "none"
- subtopic: 上述子主題之一，若 unit 為 "none" 則填 "none"
- confidence: 0-100 的整數，表示分類信心
- classify_reason: 一句話說明分類理由
- answer: 若題目已有答案則直接回傳該答案；若無答案請依國小三年級數學計算正確答案（選擇題填 "1"/"2"/"3"/"4"）。
- blank_inputs: 僅填充題需要。陣列長度＝空格數，依序標每格的輸入型態：
  "number"（答案是數字，含小數）／"comparison"（答案是 >、<、=）／
  "code"（答案是題目自帶的代號，如 甲乙丙丁）／"text"（其他文字，如「圓心」「半」）。
  選擇題不需要此欄位。
- blank_choices: 僅含 "code" 空格的填充題需要。陣列長度＝空格數，code 格給該題的代號集合
  （從題目找，如 ["甲","乙","丙","丁"]），非 code 格填 null。

請以 JSON array 格式回傳，每個元素對應一道題目，按輸入順序排列。只回傳 JSON，不要有其他文字。"""


SEMESTERS = {
    "mid": {
        "input": os.path.join(DATA_DIR, "raw_questions.json"),
        "output": os.path.join(DATA_DIR, "classified_questions.json"),
        "valid_units": {"1", "2", "none"},
        "valid_subtopics": {
            "蔬菜從哪裡來", "影響蔬菜生長的因素", "蔬菜生長的變化過程",
            "影響物質變化的因素", "溫度對水的變化", "溫度對其他物質的影響",
        },
        "system_prompt": MIDTERM_SYSTEM_PROMPT,
        "unit_labels": {"1": "田園樂", "2": "溫度變化"},
        "model": None,        # 期中沿用 claude -p 預設模型（保持既有行為）
        "batch_size": 12,
    },
    "final": {
        "input": os.path.join(DATA_DIR, "raw_questions_期末.json"),
        "output": os.path.join(DATA_DIR, "classified_questions_期末.json"),
        "valid_units": {"3", "4", "none"},
        "valid_subtopics": {
            "動物分類", "身體構造", "生存與適應", "觀察方法",
            "風", "氣溫測量", "雨量降雨", "天氣預報",
        },
        "system_prompt": FINAL_SYSTEM_PROMPT,
        "unit_labels": {"3": "動物", "4": "天氣"},
        "model": "claude-sonnet-4-6",   # 動物/天氣 分類單純，用 sonnet 控成本
        "batch_size": 15,               # 較小批降低逾時風險（233 題曾在 30/批時偶發逾時）
    },
    "math": {
        "input": os.path.join(DATA_DIR, "raw_questions_數學.json"),
        "output": os.path.join(DATA_DIR, "classified_questions_數學.json"),
        "valid_units": {"5", "6", "7", "8", "9", "none"},
        "valid_subtopics": {
            "小數的認識", "小數比大小", "小數加減",
            "圓的構造", "圓規與畫圓", "圓的大小比較",
            "乘除互逆", "乘除計算", "乘除應用",
            "時刻與時間單位", "時制互換", "時間計算",
            "報讀表格",
        },
        "system_prompt": MATH_SYSTEM_PROMPT,
        "unit_labels": {"5": "小數", "6": "圓", "7": "乘法與除法", "8": "時間", "9": "統計表"},
        "model": "claude-sonnet-4-6",
        "batch_size": 15,
    },
}


def build_question_text(q: dict) -> str:
    """組合題目文字供 AI 閱讀"""
    if q["section"] == "true_false":
        return f"[是非題] {q['text']}"
    if q["section"] == "vertical_calc":
        return f"[計算題-直式] {q['text']}"
    if q["section"] == "fill_in_blank":
        answers = "、".join(b["answer"] for b in q["blanks"])
        return f"[填充題] {q['text']}（{len(q['blanks'])} 個空格，官方答案依序：{answers}）"
    opts_text = ""
    if q["options"]:
        opts_text = " ".join(f"({i+1}){opt}" for i, opt in enumerate(q["options"]))
    return f"[選擇題] {q['text']}" + (f" 選項：{opts_text}" if opts_text else "")


def classify_batch(batch: list[dict], batch_idx: int, config: dict) -> list[dict] | None:
    """
    用 claude -p 分類一批題目（依 config 切換 system prompt / 合法值 / 模型）。
    回傳分類結果 list，失敗回傳 None。
    """
    questions_text = []
    for i, q in enumerate(batch):
        has_ans = f" (已知答案: {q['answer']})" if q["answer"] else " (需提供答案)"
        questions_text.append(f"{i+1}. {build_question_text(q)}{has_ans}")

    user_prompt = f"請分類以下 {len(batch)} 道題目：\n\n" + "\n".join(questions_text)

    cmd = ["claude", "-p"]
    if config.get("model"):
        cmd += ["--model", config["model"]]
    cmd += ["--output-format", "json"]

    for attempt in range(MAX_RETRIES):
        try:
            result = subprocess.run(
                cmd,
                input=f"{config['system_prompt']}\n\n---\n\n{user_prompt}",
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=300,
            )

            if result.returncode != 0:
                log.warning(f"  批次 {batch_idx} 嘗試 {attempt+1}: claude -p 失敗: {result.stderr[:200]}")
                time.sleep(2)
                continue

            try:
                outer = json.loads(result.stdout)
                response_text = outer.get("result", result.stdout)
            except json.JSONDecodeError:
                response_text = result.stdout

            json_match = re.search(r"\[[\s\S]*\]", response_text)
            if not json_match:
                log.warning(f"  批次 {batch_idx} 嘗試 {attempt+1}: 無法找到 JSON array")
                time.sleep(2)
                continue

            classifications = json.loads(json_match.group())

            if len(classifications) != len(batch):
                log.warning(f"  批次 {batch_idx} 嘗試 {attempt+1}: 結果數量不符 ({len(classifications)} vs {len(batch)})")
                time.sleep(2)
                continue

            valid = True
            for ci, c in enumerate(classifications):
                if not validate_unit_subtopic(
                    c.get("unit", ""), c.get("subtopic", ""),
                    config["valid_units"], config["valid_subtopics"],
                ):
                    log.warning(f"  批次 {batch_idx} 題 {ci+1}: 非法 unit/subtopic "
                                f"'{c.get('unit')}'/'{c.get('subtopic')}'")
                    valid = False
                # 填充題：blank_inputs 長度須等於空格數、值須合法；code 格須有 choices
                if batch[ci]["section"] == "fill_in_blank":
                    bi = c.get("blank_inputs")
                    if (not isinstance(bi, list) or len(bi) != len(batch[ci]["blanks"])
                            or any(x not in VALID_BLANK_INPUTS for x in bi)):
                        log.warning(f"  批次 {batch_idx} 題 {ci+1}: blank_inputs 非法 {bi}")
                        valid = False
                    elif "code" in bi:
                        bc = c.get("blank_choices")
                        if (not isinstance(bc, list) or len(bc) != len(bi)
                                or any(x == "code" and not bc[i] for i, x in enumerate(bi))):
                            log.warning(f"  批次 {batch_idx} 題 {ci+1}: code 格缺 blank_choices {bc}")
                            valid = False

            if not valid and attempt < MAX_RETRIES - 1:
                time.sleep(2)
                continue

            return classifications

        except subprocess.TimeoutExpired:
            log.warning(f"  批次 {batch_idx} 嘗試 {attempt+1}: 逾時")
            time.sleep(2)
        except Exception as e:
            log.warning(f"  批次 {batch_idx} 嘗試 {attempt+1}: 例外 {e}")
            time.sleep(2)

    return None


def main():
    parser = argparse.ArgumentParser(description="AI 分類器（可切換學期 taxonomy）")
    parser.add_argument("--semester", choices=list(SEMESTERS), default="mid",
                        help="學期分類設定：mid（期中，預設）或 final（期末）")
    parser.add_argument("--input", default=None, help="覆寫輸入 raw JSON 路徑（預設用該學期 config）")
    parser.add_argument("--output", default=None, help="覆寫輸出 classified JSON 路徑（預設用該學期 config）")
    args = parser.parse_args()
    config = dict(SEMESTERS[args.semester])
    if args.input:
        config["input"] = os.path.abspath(args.input)
    if args.output:
        config["output"] = os.path.abspath(args.output)
    batch_size = config["batch_size"]

    log.info(f"學期: {args.semester}；模型: {config['model'] or '預設'}")

    with open(os.path.abspath(config["input"]), encoding="utf-8") as f:
        all_questions = json.load(f)

    # 跳過：含圖片題、有效選項不足的選擇題（含圖片型空選項）
    kept = [q for q in all_questions if not q["has_image"]
            and not (q["section"] == "multiple_choice"
                     and sum(1 for o in q["options"] if o.strip()) < 2)]

    # 去重（helper）並建立 正規化文字 → unique index 對照，供結果回填重複題
    unique_questions = dedupe_by_text(kept)
    seen_texts = {normalize_text(q["text"]): i for i, q in enumerate(unique_questions)}
    log.info(f"保留 {len(kept)} 題；去重後 {len(unique_questions)} 題")

    results = [None] * len(unique_questions)
    total_batches = (len(unique_questions) + batch_size - 1) // batch_size

    for bi in range(total_batches):
        start = bi * batch_size
        end = min(start + batch_size, len(unique_questions))
        batch = unique_questions[start:end]

        log.info(f"分類批次 {bi+1}/{total_batches} ({len(batch)} 題)")
        batch_results = classify_batch(batch, bi + 1, config)

        if batch_results is None:
            log.error(f"  批次 {bi+1} 完全失敗，該批題目標記為 none")
            for j in range(start, end):
                results[j] = {
                    "unit": "none", "subtopic": "none", "confidence": 0,
                    "classify_reason": "分類失敗", "answer": unique_questions[j]["answer"],
                }
        else:
            for j, cr in enumerate(batch_results):
                results[start + j] = cr

        if bi < total_batches - 1:
            time.sleep(1)

    # 回填分類結果到所有 kept（含重複題）
    classified = []
    for q in kept:
        cr = results[seen_texts[normalize_text(q["text"])]]
        entry = {**q}
        entry["unit"] = str(cr.get("unit", "none"))
        entry["subtopic"] = cr.get("subtopic", "none")
        entry["confidence"] = int(cr.get("confidence", 0))
        entry["classify_reason"] = cr.get("classify_reason", "")
        if q["section"] == "fill_in_blank":
            # 填充題答案全在 blanks（官方括號答案），AI 補每格 input 型態與 code 格 choices
            inputs = cr.get("blank_inputs") or []
            choices = cr.get("blank_choices") or []
            entry["blanks"] = []
            for i, b in enumerate(q["blanks"]):
                nb = {**b, "input": inputs[i] if i < len(inputs) else "text"}
                if nb["input"] == "code" and i < len(choices) and choices[i]:
                    nb["choices"] = choices[i]
                entry["blanks"].append(nb)
            entry["needs_review"] = False
        else:
            # 有官方答案用官方；無則 AI 補並標記需複查（helper）
            entry["answer"], entry["needs_review"] = merge_answer(q["answer"], cr.get("answer", ""))
        classified.append(entry)

    # 統計
    unit_counts = defaultdict(int)
    for c in classified:
        unit_counts[c["unit"]] += 1
    with_answer = sum(1 for c in classified if c["answer"])
    needs_review = sum(1 for c in classified if c.get("needs_review"))
    conf_low = sum(1 for c in classified if c["confidence"] < 70)
    conf_mid = sum(1 for c in classified if 70 <= c["confidence"] < 90)
    conf_high = sum(1 for c in classified if c["confidence"] >= 90)

    log.info("\n=== 分類統計 ===")
    for u, label in config["unit_labels"].items():
        log.info(f"單元 {u}（{label}）: {unit_counts.get(u, 0)}")
    log.info(f"none: {unit_counts.get('none', 0)}")
    log.info(f"有答案: {with_answer}/{len(classified)}；需複查(AI補答案): {needs_review}")
    log.info(f"信心分布: <70={conf_low}, 70-89={conf_mid}, >=90={conf_high}")

    with open(os.path.abspath(config["output"]), "w", encoding="utf-8") as f:
        json.dump(classified, f, ensure_ascii=False, indent=2)
    log.info(f"已輸出至 {config['output']}")


if __name__ == "__main__":
    main()
