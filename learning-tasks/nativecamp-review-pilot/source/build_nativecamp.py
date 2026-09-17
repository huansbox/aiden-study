# /// script
# requires-python = ">=3.13"
# dependencies = []
# ///
"""Build the original Native Camp exercise pack and local, pre-generated speech."""

import argparse
import array
import base64
import hashlib
import json
import math
import shutil
import subprocess
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
TASK = SOURCE.parent
REPO = TASK.parent.parent
APP = REPO / "docs/nativecamp"
PRIVATE = SOURCE / "private"
VOICE = "Microsoft Zira Desktop - English (United States)"
TEACHER_ID = "2026-09-15-hats-question"
# Chosen from a bounded local recheck, not from a full-lesson ASR segment.
TEACHER_START = 1300.23
TEACHER_END = 1304.10


def scene(kind, count, heading=None):
    result = {"kind": kind, "count": count}
    if heading:
        result["heading"] = heading
    return result


def build_lesson():
    speech = {}

    def question(concept, mode, n, prompt, instruction, picture, answer_text, spoken, **extra):
        qid = f"{concept}-{mode}-{n}"
        result = {"id": qid, "prompt": prompt, "instruction": instruction,
                  "scene": picture, "answerText": answer_text, **extra,
                  "audio": {"question": f"audio/{qid}-q.mp3", "answer": f"audio/{qid}-a.mp3"}}
        speech[f"{qid}-q.mp3"] = spoken
        speech[f"{qid}-a.mp3"] = answer_text
        return result

    def choice(concept, n, prompt, picture, choices, answer, answer_text, spoken, explanation):
        return question(concept, "try", n, prompt, "Pick one.", picture, answer_text, spoken,
                        type="choice", choices=[{"id": text, "text": text} for text in choices],
                        answer=answer, explanation=explanation)

    def order(concept, n, prompt, picture, words, shuffled, explanation):
        ids = [f"w{i + 1}" for i in range(len(words))]
        tokens = [{"id": ids[i], "text": words[i]} for i in shuffled]
        return question(concept, "try", n, prompt, "Tap the words to make a sentence.",
                        picture, " ".join(words) + ".",
                        prompt + " Tap the words to make a sentence.", type="order", tokens=tokens,
                        acceptedOrders=[ids], explanation=explanation)

    is_are = {"id": "is-are", "title": "Is or are", "try": [
        choice("is-are", 1, "There ___ a cat.", scene("cats", 1), ["is", "are"], "is",
               "There is a cat.", "Look at the cat. Pick is or are.", "Use is for one cat."),
        choice("is-are", 2, "There ___ two dogs.", scene("dogs", 2), ["is", "are"], "are",
               "There are two dogs.", "Look at the dogs. Pick is or are.", "Use are for two dogs."),
        order("is-are", 3, "Tell me about the trees.", scene("trees", 3),
              ["There", "are", "three", "trees"], [2, 0, 3, 1], "Use are for more than one tree."),
    ], "say": [
        question("is-are", "say", 1, "What can you see?", "There …", scene("dogs", 1),
                 "There is a dog.", "What can you see? Start with there.",
                 accepted=["There is one dog."]),
        question("is-are", "say", 2, "How many trees can you see?", "There …", scene("trees", 4),
                 "There are four trees.", "How many trees can you see? Start with there.",
                 accepted=["There are 4 trees."]),
        question("is-are", "say", 3, "What can you see?", "There …", scene("cats", 2),
                 "There are two cats.", "What can you see? Start with there.",
                 accepted=["There are 2 cats."]),
    ]}
    odd_even = {"id": "odd-even", "title": "Odd or even", "try": [
        choice("odd-even", 1, "Is 5 odd or even?", {"kind": "numbers", "number": 5},
               ["odd", "even"], "odd", "Five is an odd number.", "Is five odd or even? Pick one.",
               "Make pairs. An odd number has one left over."),
        choice("odd-even", 2, "Is the number of toys odd or even?", scene("toys", 6),
               ["odd", "even"], "even", "Six is an even number.",
               "Count the toys. Is the number odd or even? Pick one.",
               "Make pairs. An even number has none left over."),
        choice("odd-even", 3, "Is the number of books odd or even?", scene("books", 9),
               ["odd", "even"], "odd", "Nine is an odd number.",
               "Count the books. Is the number odd or even? Pick one.",
               "Make pairs. An odd number has one left over."),
    ], "say": [
        question("odd-even", "say", 1, "Is the number of dogs odd or even?", "___ is ___.",
                 scene("dogs", 4), "Four is an even number.",
                 "Count the dogs. Is the number odd or even? Say the number, too.",
                 accepted=["Four is even.", "There are four dogs. Four is even."]),
        question("odd-even", "say", 2, "Is 7 odd or even?", "___ is ___.",
                 {"kind": "numbers", "number": 7}, "Seven is an odd number.",
                 "Is seven odd or even? Say the number, too.", accepted=["Seven is odd."]),
        question("odd-even", "say", 3, "Is the number of books odd or even?", "___ is ___.",
                 scene("books", 6), "Six is an even number.",
                 "Count the books. Is the number odd or even? Say the number, too.",
                 accepted=["Six is even.", "There are six books. Six is even."]),
    ]}
    too_many = {"id": "too-many", "title": "Too many", "try": [
        choice("too-many", 1, "I have too ___ books.",
               scene("books", 7, "This shelf has room for 3 books."), ["many", "much"], "many",
               "I have too many books.",
               "This shelf has room for three books. Look at the books. Pick many or much.",
               "You can count books. Use many with books."),
        choice("too-many", 2, "There are too ___ hats.",
               scene("hats", 6, "This shelf has room for 2 hats."), ["many", "much"], "many",
               "There are too many hats.",
               "This shelf has room for two hats. Look at the hats. Pick many or much.",
               "You can count hats. Use many with hats."),
        order("too-many", 3, "Tell me about your toys.",
              scene("toys", 8, "This box has room for 3 toys."),
              ["I", "have", "too", "many", "toys"], [4, 2, 0, 3, 1],
              "There are more toys than the box can hold. Start with I have."),
    ], "say": [
        question("too-many", "say", 1, "Tell me about your toys.", "… too many …",
                 scene("toys", 7, "This box has room for 3 toys."), "I have too many toys.",
                 "This box has room for three toys. Tell me about your toys. Use too many in a sentence.",
                 accepted=["There are too many toys.", "There are too many toys in the box."]),
        question("too-many", "say", 2, "What is the problem with the books?", "… too many …",
                 scene("books", 8, "This shelf has room for 4 books."), "There are too many books.",
                 "This shelf has room for four books. What is the problem with the books? Use too many in a sentence.",
                 accepted=["I have too many books.", "There are too many books for the shelf."]),
        question("too-many", "say", 3, "Do you think that Tanya has too many hats?",
                 "… too many …",
                 scene("hats", 8, "Tanya's shelf has room for 3 hats."),
                 "Yes, she has too many hats.", "Do you think that Tanya has too many hats?",
                 accepted=["Tanya has too many hats.", "Yes, Tanya has too many hats.",
                           "There are too many hats for the shelf."]),
    ]}
    # Keep the original teacher question private; it is never copied into public audio.
    teacher_question = too_many["say"][2]
    del speech["too-many-say-3-q.mp3"]
    teacher_question["audio"]["question"] = {"private": TEACHER_ID}
    # Ordering speech describes capacity but never reads the assembled answer.
    speech["too-many-try-3-q.mp3"] = (
        "This box has room for three toys. Tell me about your toys. Tap the words to make a sentence.")
    return {"schemaVersion": 1, "id": "2026-09-15", "date": "2026-09-15",
            "title": "Counting and talking", "concepts": [is_are, odd_even, too_many]}, speech


def probe(path):
    result = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                             "format=duration:stream=codec_name,sample_rate,channels",
                             "-of", "json", str(path)], check=True, capture_output=True, text=True)
    info = json.loads(result.stdout)
    decoded = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-v", "error", "-xerror",
                              "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                             check=True, capture_output=True)
    samples = array.array("h", decoded.stdout)
    rms = math.sqrt(sum(value * value for value in samples) / len(samples)) / 32768
    if rms < 0.001 or float(info["format"]["duration"]) < 0.4:
        raise SystemExit(f"Audio is silent or too short: {path.name}")
    return {"bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "durationSeconds": float(info["format"]["duration"]),
            "codec": info["streams"][0]["codec_name"], "rmsDbfs": round(20 * math.log10(rms), 2),
            "decode": "passed"}


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")


def build_teacher():
    verified = json.loads((SOURCE / "download-verification.json").read_text("utf-8"))
    original = TASK / "assets/audio/2026-09-15-1930-lesson.webm"
    if not original.is_file():
        raise SystemExit("Original private recording is missing; no private pack was generated")
    if hashlib.sha256(original.read_bytes()).hexdigest() != verified["sha256"]:
        raise SystemExit("Original recording SHA256 mismatch")
    clip = PRIVATE / f"{TEACHER_ID}.mp3"
    subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-v", "error", "-xerror", "-y",
                    "-ss", str(TEACHER_START), "-i", str(original),
                    "-t", str(TEACHER_END - TEACHER_START), "-af", "pan=mono|c0=c0",
                    "-ar", "44100", "-c:a", "libmp3lame", "-q:a", "3", "-map_metadata", "-1",
                    str(clip)], check=True)
    pack_path = PRIVATE / "nativecamp-audio-kv.json"
    write_json(pack_path, {TEACHER_ID: {"contentType": "audio/mpeg",
                                      "base64": base64.b64encode(clip.read_bytes()).decode("ascii")}})
    return {"id": TEACHER_ID, "sourceSha256": verified["sha256"], "channel": 0,
            "startSeconds": TEACHER_START, "endSeconds": TEACHER_END,
            "edited": "single continuous left-channel excerpt; no word splicing",
            "localClip": str(clip.relative_to(TASK)).replace("\\", "/"),
            "pack": str(pack_path.relative_to(TASK)).replace("\\", "/"), **probe(clip)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--teacher", action="store_true", help="Require and cut the original private recording")
    parser.add_argument("--skip-tts", action="store_true", help="Keep existing generated MP3s and verify them")
    args = parser.parse_args()
    for tool in ["ffmpeg", "ffprobe"]:
        if not shutil.which(tool):
            parser.error(f"{tool} must be on PATH")
    lesson, speech = build_lesson()
    write_json(APP / "lessons/2026-09-15.json", lesson)
    PRIVATE.mkdir(parents=True, exist_ok=True)
    (APP / "audio").mkdir(parents=True, exist_ok=True)
    jobs = [{"file": file, "text": text} for file, text in speech.items()]
    jobs_path = PRIVATE / "nativecamp-tts-jobs.json"
    write_json(jobs_path, jobs)
    if not args.skip_tts:
        subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
                        str(SOURCE / "speak_nativecamp.ps1"), "-JobsPath", str(jobs_path),
                        "-OutputDirectory", str(APP / "audio"), "-WorkDirectory", str(PRIVATE / "tts-work"),
                        "-VoiceName", VOICE], check=True)
    manifest = {"schemaVersion": 1, "lessonId": lesson["id"],
                "voice": {"engine": "Windows SAPI", "name": VOICE, "rate": -1,
                          "localOnly": True, "voiceCloning": False},
                "sources": {"is-are": "Original counts scenes; lesson review evidence 17:25–20:25",
                            "odd-even": "Original counting scenes; verified lesson vocabulary on printed page 88",
                            "too-many": "Original capacity scenes; lesson review evidence 21:05–23:00"},
                "tts": [{"file": f"audio/{file}", "text": text, **probe(APP / "audio" / file)}
                        for file, text in speech.items()],
                "limits": {"humanListening": "not performed", "iPadPlayback": "not performed",
                           "pronunciationAssessment": "not performed", "productionDeployment": "not performed"}}
    if args.teacher:
        manifest["teacher"] = [build_teacher()]
    else:
        manifest["teacher"] = [{"id": TEACHER_ID, "status": "not rebuilt; run with --teacher using private source"}]
    write_json(SOURCE / "nativecamp-audio-manifest.json", manifest)
    print(f"Built {sum(len(c['try']) + len(c['say']) for c in lesson['concepts'])} questions; verified {len(speech)} public MP3s.")
    if args.teacher:
        print(f"Private local pack: {PRIVATE / 'nativecamp-audio-kv.json'}")


if __name__ == "__main__":
    main()
