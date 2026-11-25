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
    if (!/^\d{4}$/.test(query)) {
      status.textContent = 'Enter a four-digit BIB number.';
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
      if (data.entries.length) {
        const table = document.createElement('table');
        table.className = 'marathon-entries-table';
        const columns = [['Participant', 'name'], ['Distance', 'race'], ['BIB number', 'bib'],
          ['Name on the BIB', 'bibName'], ['T-shirt size', 'shirt']];
        const header = table.createTHead().insertRow();
        for (const [label] of columns) {
          const cell = document.createElement('th');
          cell.scope = 'col';
          cell.textContent = label;
          header.append(cell);
        }
        const body = table.createTBody();
        for (const entry of data.entries) {
          const row = body.insertRow();
          for (const [label, field] of columns) {
            const cell = row.insertCell();
            cell.dataset.label = label;
            cell.textContent = entry[field] || 'Unavailable';
          }
        }
        results.append(table);
      }
      results.hidden = !data.entries.length;
      status.textContent = data.entries.length ? '' : 'No confirmed entry found for that BIB.';
    } catch {
      if (request === current) status.textContent = 'Entry lookup is temporarily unavailable. Please try again.';
    } finally {
      clearTimeout(timeout);
      if (request === current) button.disabled = false;
    }
  });
})();

