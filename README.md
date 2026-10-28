# crispz-flux3.pinokio

1-click [Pinokio](https://pinokio.computer) launcher for
**[crispz-flux3](https://github.com/mikecastrodemaria/crispz-flux3)**, a
**FLUX.3 Image Klein** creation + editing studio (Fooocus-style, 100% local).

## What it does

Installs and launches crispz-flux3 in one click:

- **Install** clones `mikecastrodemaria/crispz-flux3` into `app/`, creates a
  **Python 3.11** venv (diffusers 0.42.1, the first release with FLUX.3, is not
  published for 3.10), installs the project requirements (`requirements.txt` +
  `requirements-extra.txt`), Pillow 13 apart, the Face Swap deps, and PyTorch
  (torch 2.11 + CUDA cu128 on NVIDIA / ROCm / MPS / CPU). Ends with a check that
  the installed diffusers really exposes the FLUX.3 modular blocks.
- **Start** runs `python app.py` and opens the Gradio Web UI.
- **Update** force-updates the launcher and the app to their `origin/main`,
  refreshes deps, reasserts the right torch build, re-runs the blocks check.
- **Reset** removes `app/` (and its venv) to reinstall from scratch.

## Before the first render: the licence and the token

FLUX.3 Image Klein is published under the **FLUX Kommunity License** (free,
commercial use included, under 5 M USD of yearly revenue) and both repos are
**gated** on Hugging Face. Once, with your HF account:

1. Open https://huggingface.co/black-forest-labs/flux-3-image-klein (and
   `flux-3-image-klein-base` if you want the undistilled checkpoint) and accept
   the licence.
2. Create a READ token at https://huggingface.co/settings/tokens and put it in
   `app/config.txt` as `"hf_token": "hf_..."` (copy `config-sample.txt` to
   `config.txt` first), or run `huggingface-cli login` in the venv.

Without that, the first generation stops on an access error that names this
page. The first run then downloads about 20 GB (transformer 11 GB, Qwen3-VL-4B
text encoder 8.9 GB, VAE), cached afterwards.

## Features (crispz-flux3)

txt2img · **multi-reference editing in the same pipeline** (references cited in
the prompt as `<ref_image_0>`, `<ref_image_1>`..., no second model, no extra
VRAM) · inpaint / outpaint / reframe · ESRGAN + refine upscale · single-file
FLUX.3 checkpoints (BFL, ComfyUI, diffusers layouts, fp8r / nvfp4, GGUF) + LoRA
switching · 277 styles · Describe in 9 styles / Improve prompt & Vision Mix
(Ollama) · Remove BG · Face Swap · CLI + the crispz family CLI protocol v1
(`czp`). See the app repo for full docs.

Measured on an RTX 5090, 1024x1024, 16 steps, bf16: **18.8 GB of VRAM for the
whole surface** (one model serves txt2img, edit, inpaint and img2img), txt2img
in **about 7 s**, an edit with one reference in 13.5 s, two references 23.4 s.

## Things to know before using it

- **Two checkpoints, one selector** (Models > Checkpoints > FLUX.3 checkpoint).
  *Distilled*, the default, is a 16-step flow map with no CFG: the guidance
  slider and the negative prompt do nothing on it. *Base* is the undistilled
  release: about 50 steps, a real CFG (3.5 advised), a working negative prompt,
  three times slower.
- **Precision** (next to it): bf16 (11 GB, every card), fp8r (6.3 GB, fast from
  RTX 40xx), nvfp4 (5.3 GB, RTX 50xx Blackwell + the `flashinfer` package). A
  16 GB card gets CPU offload automatically in bf16, or picks fp8r / nvfp4.
- **Edits follow a target description better than a verb.** Without BFL's prompt
  upsampler (planned for v0.2) "make it daytime" lightens the sky and keeps the
  rain; "the same scene in bright daylight under a clear blue sky, no rain"
  goes further. For an **inpaint, describe the whole scene**, not only the patch.
- **The edit-LoRA catalogue is empty**: no edit-task LoRA exists for FLUX.3 yet
  (a preset declared in `config.txt` under `edit_loras` works the day one does).
  The Sampler, Schedule and Text encoder menus are greyed out: FLUX.3 runs its own
  Euler schedule, and no replacement encoder fits its Qwen3-VL slot.

## Requirements

- [Pinokio](https://pinokio.computer) installed.
- An NVIDIA GPU is recommended (RTX 40xx / 50xx, cu128). CPU/AMD/Apple are also
  handled by the torch installer, but generation will be slow without CUDA.
- **24 GB of VRAM** runs bf16 whole; **16 GB** runs with CPU offload or a
  quantized build. The app measures the free VRAM at load time and streams the
  weights when they do not fit (`default_cpu_offload: auto`).

## Optional: Face Swap & Ollama

- **Face Swap**: the Python deps (`insightface` + the ONNX runtime matching your
  GPU) are installed by Install/Update automatically. The **inswapper model is
  NOT downloaded** (its weights are not redistributable): drop
  `inswapper_128.onnx` into `app/faceswap/`, or set `faceswap_model_path` /
  `faceswap_model_url` in the app's `config.txt`. Until then the tab reports
  `inswapper model not found`.
- **Describe / Improve / Vision Mix** need a local [Ollama](https://ollama.com)
  with a vision model. Ollama is detected when the page loads and the vision model
  you pick is remembered; if Ollama is off or fails, Describe falls back to the
  caption model instead of stopping on an error.
- **Caption model** (Inpaint / Outpaint Auto-describe and the Describe fallback):
  local BLIP, or one of your Ollama vision models (`ollama:<name>`). Pick a small
  one (3-8 GB): it runs right before the image model.

## Using the app programmatically

The app exposes the crispz family **CLI protocol v1** (JSON in, JSON out) through
`czp.bat` / `czp.sh` in `app/`. It routes to the running instance when there is
one and loads the pipeline locally otherwise.

```bash
# what this build can do
app/czp.bat caps

# generate one image
app/czp.bat gen --spec spec.json
```

`spec.json`:

```json
{
  "protocol": 1,
  "op": "gen",
  "prompt": "a comic book panel, a lighthouse in a storm, ink lines, flat colors",
  "width": 1024,
  "height": 1024,
  "steps": 16,
  "seed": 42,
  "out_dir": "out/"
}
```

Ops: `caps` · `gen` · `edit` (image + instruction, `refs` for character
consistency, up to 10, cited as `<ref_image_N>`) · `inpaint` (white area of a
mask) · `upscale` (`factor` 1 = pure img2img variation). On the distilled
checkpoint a spec carrying `negative` or `guidance` still succeeds, with a
`warnings` entry saying the field had no effect.

### curl (Gradio endpoint, app running)

```bash
curl -s -X POST http://127.0.0.1:7860/gradio_api/call/cli_gen \
  -H "Content-Type: application/json" \
  -d '{"data": ["{\"protocol\":1,\"op\":\"gen\",\"prompt\":\"a lighthouse in a storm\",\"steps\":16,\"seed\":42}"]}'
```

The reply carries an event id; `GET` the same path with `/<event_id>` appended to
read the JSON result.

## Notes

- **One port for the whole family.** crispz apps all serve on 7860 by design:
  the reply's `tool` field identifies who answered, not the port. Only run one
  crispz app at a time, or a `czp` call may reach a sibling.
- **Updates**: use Pinokio's **Update** (launcher + app + dependencies + torch).
  The app's own `boot_check.bat` also offers GitHub updates, but that prompt is
  meant for standalone installs.
- `app/`, `env/` and `logs/` are gitignored (created at install time).
- The app's `config.txt` is not in the repo. Without it the app reads
  `config-sample.txt`, which ships the FLUX.3 defaults (16 steps, guidance 1.0,
  offload `auto`). Copy it to `config.txt` to add your `hf_token` and customize.
