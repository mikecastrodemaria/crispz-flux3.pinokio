module.exports = {
  requires: {
    bundle: "ai"
  },
  run: [
    // Clone crispz-flux3 into the local app/ folder
    {
      method: "shell.run",
      params: {
        message: [
          "git clone https://github.com/mikecastrodemaria/crispz-flux3 app"
        ]
      }
    },
    // Install crispz-flux3 dependencies (core + extras) in a dedicated venv.
    // Python 3.11: diffusers 0.42.1 (the first release with FLUX.3) and Pillow 13 are
    // not published for 3.10, which is Pinokio's default interpreter. requirements.txt
    // pins diffusers==0.42.1 (PyPI) and transformers 5.x, and carries gguf + hf_xet.
    {
      method: "shell.run",
      params: {
        venv: "env",
        venv_python: "3.11",
        // UTF-8 env: packages built from source read UTF-8 files in their
        // setup; the legacy cp1252 codec on Windows fails the build.
        env: {
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8"
        },
        path: "app",
        message: [
          "uv pip install -r requirements.txt",
          "uv pip install -r requirements-extra.txt"
        ]
      }
    },
    // Pillow 13, installed apart and without dependencies: gradio 5.50 declares
    // pillow<12, but the Pillow CVEs are only fixed in 13.0 and the app runs on it
    // (install.bat does the same). Resolving both together would refuse.
    {
      method: "shell.run",
      params: {
        venv: "env",
        path: "app",
        message: [
          "uv pip install --no-deps pillow==13.0.0"
        ]
      }
    },
    // Face Swap tab dependencies (requirements-faceswap.txt).
    // insightface depends on the CPU 'onnxruntime', which shares its files with
    // 'onnxruntime-gpu': whichever is installed last wins. Installing both in one
    // resolution silently leaves the CPU build on top (no CUDAExecutionProvider),
    // so the runtime matching this machine is force-reinstalled last.
    // onnxruntime-gpu has no macOS/ROCm wheels -> plain onnxruntime elsewhere.
    {
      method: "shell.run",
      params: {
        venv: "env",
        env: {
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8"
        },
        path: "app",
        message: [
          "uv pip install \"insightface>=0.7\"",
          "uv pip install --force-reinstall --no-deps {{gpu === 'nvidia' ? 'onnxruntime-gpu' : 'onnxruntime'}}"
        ]
      }
    },
    // Install PyTorch (CUDA cu128 on NVIDIA / ROCm / MPS / CPU) cross-platform
    {
      method: "script.start",
      params: {
        uri: "torch.js",
        params: {
          venv: "env",
          path: "app"
        }
      }
    },
    // Verify the installed diffusers really exposes the FLUX.3 modular blocks
    // (FLUX.3 has no pipeline class: diffusers serves it as a block chain, present
    // from 0.42.1). Without them the app imports fine and only fails at the first
    // render, which is a confusing place to discover a dependency problem.
    {
      method: "shell.run",
      params: {
        venv: "env",
        path: "app",
        message: [
          "python -c \"from diffusers.modular_pipelines import Flux3DistilledAutoBlocks, Flux3AutoBlocks; print('FLUX.3 modular blocks OK')\""
        ]
      }
    },
    // Deduplicate the venv to save disk space
    {
      method: "fs.link",
      params: {
        venv: "app/env"
      }
    },
    {
      method: "notify",
      params: {
        html: "crispz-flux3 installed. Before the first render: accept the FLUX.3 licence on huggingface.co/black-forest-labs/flux-3-image-klein and put a READ token in app/config.txt (hf_token). Then click <b>Start</b>."
      }
    }
  ]
}
