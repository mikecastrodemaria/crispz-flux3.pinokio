module.exports = {
  daemon: true,
  run: [
    {
      method: "shell.run",
      params: {
        venv: "env",
        // Force UTF-8 stdout/stderr so tqdm download progress bars don't crash
        // on Windows consoles using the legacy cp1252 codec (UnicodeEncodeError).
        // No offload override here: the app's default_cpu_offload is 'auto', which
        // measures the free VRAM at load time (FLUX.3 bf16 wants about 19 GB + 4 GB of
        // headroom, fp8r 14.4, nvfp4 13.5) and streams the weights when they do not fit.
        env: {
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8"
        },
        path: "app",
        message: [
          "python app.py"
        ],
        on: [{
          // Capture the local Gradio URL (e.g. http://127.0.0.1:7860)
          "event": "/(http:\\/\\/[0-9.:]+)/",
          "done": true
        }]
      }
    },
    {
      // Expose the captured URL to pinokio.js (Open Web UI menu item)
      method: "local.set",
      params: {
        url: "{{input.event[1]}}"
      }
    }
  ]
}
