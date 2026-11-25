(() => {
  const form = document.getElementById('marathonPublicLookup');
  const input = document.getElementById('marathonPublicQuery');
  const status = document.getElementById('marathonPublicStatus');
  const results = document.getElementById('marathonPublicResults');
  const button = form.querySelector('button');
  let request;
  function clearResults() {
    results.replaceChildren();
    results.hidden = true;
  }
  input.addEventListener('input', () => {
    request?.abort();
    request = undefined;
    clearResults();
    status.textContent = '';
    button.disabled = false;
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    request?.abort();
    clearResults();
    const query = input.value.trim();
    const mobile = query.replace(/[\s()-]/g, '').replace(/^(?:\+91|91|0)(?=[6-9]\d{9}$)/, '');
    if (!/^\d{4}$/.test(query) && !/^[6-9]\d{9}$/.test(mobile)) {
      status.textContent = 'Enter a four-digit BIB or a registered ten-digit mobile number.';
      return;
    }
    const current = request = new AbortController();
    button.disabled = true;
    status.textContent = 'Searching confirmed entries…';
    const timeout = setTimeout(() => current.abort(), 15000);
    try {
      const response = await fetch(window.SaiVistaMarathonConfig.endpoint, {
        method: 'POST',
        cache: 'no-store',
        body: new URLSearchParams({payload: JSON.stringify({action: 'marathon-public-lookup', query})}),
        signal: current.signal
      });
      const data = await response.json();
      if (current.signal.aborted || request !== current) return;
      if (!response.ok || data.ok !== true || !Array.isArray(data.entries)) throw Error('Lookup unavailable');
      for (const {bib, race} of data.entries) {
        const item = document.createElement('li');
        item.textContent = 'BIB ' + bib + ' · ' + race + ' · Confirmed';
        results.append(item);
      }
      results.hidden = !data.entries.length;
      status.textContent = data.entries.length ? '' : 'No confirmed entries found for that number.';
    } catch {
      if (request === current) status.textContent = 'Entry lookup is temporarily unavailable. Please try again.';
    } finally {
      clearTimeout(timeout);
      if (request === current) button.disabled = false;
    }
  });
})();

