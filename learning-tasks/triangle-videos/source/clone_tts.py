"""Narration in the parent's own cloned voice (local IndexTTS 2.0), one clip per script line.

Run by make_audio.mjs when VOICE=clone; uses the IndexTTS runtime's own Python:
  <index-tts/.venv/bin/python> clone_tts.py <runtime> <models_root> <reference.wav> <jobs.json>
jobs.json: [{"text": "...", "wav": "/abs/out.wav"}]. The model is loaded once for all jobs.
The method (pinyin tokens to pin readings, t2s before the tokenizer, FP32 on Apple Silicon) follows
huansbox/phy-redraw-video's wiki page "Voice cloning"; the reference recording stays outside this repo.
"""
import json, os, random, sys, time, wave
from pathlib import Path

runtime, models, ref, jobs_path = sys.argv[1:5]
jobs = json.loads(Path(jobs_path).read_text(encoding="utf-8"))
PRON = json.loads((Path(__file__).with_name("pronunciation.json")).read_text(encoding="utf-8"))
PRON = {k: v for k, v in PRON.items() if not k.startswith("_")}
SEED = 20261011

import numpy as np, torch
from opencc import OpenCC
sys.path.insert(0, runtime); os.chdir(runtime)
from indextts.infer_v2 import IndexTTS2
models = Path(models); shared = models / "shared"
model = IndexTTS2(cfg_path=str(models / "index2" / "config.yaml"), model_dir=str(models / "index2"),
                  use_fp16=False, use_cuda_kernel=False, use_deepspeed=False, use_accel=False,
                  use_torch_compile=False, use_qwen_emo=False,
                  aux_paths=dict(w2v_bert=str(shared / "w2v-bert-2.0"),
                                 semantic_codec=str(shared / "MaskGCT" / "semantic_codec" / "model.safetensors"),
                                 campplus=str(shared / "campplus" / "campplus_cn_common.bin"),
                                 bigvgan=str(shared / "bigvgan")))
print("device", model.device, flush=True)
conv = OpenCC("t2s")
for n, job in enumerate(jobs, 1):
    src = job["text"]
    for w in sorted(PRON, key=len, reverse=True):
        src = src.replace(w, PRON[w])
    model_text = conv.convert(src)
    tokens = model.tokenizer.tokenize(model_text)
    unk = [t for t, i in zip(tokens, model.tokenizer.convert_tokens_to_ids(tokens)) if i == model.tokenizer.unk_token_id]
    if unk:
        sys.exit(f"cannot encode {unk!r} in: {job['text']}")
    random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
    tmp = job["wav"] + ".part.wav"
    t0 = time.monotonic()
    model.infer(spk_audio_prompt=ref, text=model_text, output_path=tmp, use_random=False,
                max_text_tokens_per_segment=80, interval_silence=200)
    os.replace(tmp, job["wav"])
    with wave.open(job["wav"]) as w:
        dur = w.getnframes() / w.getframerate()
    print(f"[{n}/{len(jobs)}] {dur:.1f}s (synth {time.monotonic() - t0:.0f}s) {model_text}", flush=True)
