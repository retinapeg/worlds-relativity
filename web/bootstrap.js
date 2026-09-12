// Classic bootstrap can show a recovery message even if an ES module fails to load.
window.showDemoError = (reason) => {
  const box = document.getElementById('error');
  box.hidden = false;
  box.textContent = `Demo stopped: ${reason}. Recovery: ./scripts/build.sh && ./run_demo.sh, then reload. For the frozen demo: ./run_demo.sh --known-good.`;
  document.getElementById('loading').hidden = true;
  document.getElementById('status').textContent = 'ERROR — SEE RECOVERY COMMAND';
  document.querySelectorAll('button, input').forEach((element) => { element.disabled = true; });
};
window.addEventListener('error', (event) => window.showDemoError(event.message || 'asset load failed'));
window.addEventListener('unhandledrejection', (event) => window.showDemoError(event.reason?.message || event.reason));
import('./app.js').catch((error) => window.showDemoError(error.message));
