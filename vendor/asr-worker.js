// Whisper in un processo separato: la pagina resta fluida mentre il modello lavora.
let pipe = null, loading = null;
const files = {};
async function load() {
  if (pipe) return pipe;
  if (loading) return loading;
  loading = (async () => {
    const T = await import('./transformers.min.js');
    T.env.allowLocalModels = false;
    T.env.useBrowserCache = true;
    T.env.backends.onnx.wasm.wasmPaths = new URL('./', self.location.href).href;
    T.env.backends.onnx.wasm.numThreads = 1;
    pipe = await T.pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
      progress_callback: p => {
        if (p && p.file && p.total) {
          files[p.file] = { l: p.loaded || 0, t: p.total };
          let l = 0, t = 0;
          for (const f in files) { l += files[f].l; t += files[f].t; }
          self.postMessage({ type: 'progress', pct: t ? Math.round(100 * l / t) : 0 });
        }
      },
    });
    return pipe;
  })();
  loading.catch(() => { loading = null; });
  return loading;
}
self.onmessage = async e => {
  const m = e.data;
  try {
    if (m.type === 'load') { await load(); self.postMessage({ type: 'ready' }); }
    else if (m.type === 'run') {
      const a = await load();
      const out = await a(m.pcm, { language: m.lang, task: 'transcribe' });
      self.postMessage({ type: 'result', id: m.id, text: ((out && out.text) || '').trim() });
    }
  } catch (err) {
    self.postMessage({ type: 'error', id: m.id, message: (err && err.message) || String(err) });
  }
};
