
(function () {
  async function sha256(text) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function renderResults(container, results) {
    if (!container) return;
    if (!results.length) { container.classList.remove('active'); container.innerHTML = ''; return; }
    container.innerHTML = results.slice(0, 12).map(item => `
      <a href="${item.href}">
        <span class="result-title">${item.title}</span>
        <span class="result-meta">${item.section} · Added ${item.added_date}</span>
      </a>`).join('');
    container.classList.add('active');
  }
  function createMatcher(index) {
    return function (query) {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return index.filter(item => (`${item.title} ${item.section} ${item.content}`).toLowerCase().includes(q));
    };
  }
  async function loadIndex(path) { const res = await fetch(path); return res.json(); }
  async function initLanding(opts) {
    const form = document.getElementById('gate-form');
    const input = document.getElementById('gate-password');
    const error = document.getElementById('gate-error');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const digest = await sha256(input.value);
      if (digest === opts.gateHash) {
        sessionStorage.setItem('im-notes-ok', '1');
        location.href = opts.destination;
      } else {
        error?.classList.remove('hidden');
      }
    });
  }
  async function initSite(opts) {
    const ok = sessionStorage.getItem('im-notes-ok');
    if (!ok) {
      location.href = (location.pathname.replace(/[^/]+$/, '') || './') + 'index.html';
      return;
    }
    const index = await loadIndex(opts.searchIndexPath);
    const match = createMatcher(index);
    const inputs = [...document.querySelectorAll('.js-site-search')];
    const resultBoxes = [...document.querySelectorAll('.js-search-results')];
    function updateAll(value) {
      const results = match(value);
      inputs.forEach(input => { if (input.value !== value) input.value = value; });
      resultBoxes.forEach(box => renderResults(box, results));
    }
    inputs.forEach(input => {
      input.addEventListener('input', () => updateAll(input.value));
      input.addEventListener('keydown', (event) => { if (event.key === 'Escape') updateAll(''); });
    });
  }
  window.IM_NOTES = { initLanding, initSite };
})();
