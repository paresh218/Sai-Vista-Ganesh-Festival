(() => {
  const rows = document.getElementById('marathonScheduleRows');
  for (const [time, ...details] of SaiVistaMarathon.schedule) {
    const row = rows.insertRow();
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = time;
    row.append(heading);
    for (const value of details) row.insertCell().textContent = value;
  }

  const config = window.SaiVistaMarathonConfig;
  const status = document.getElementById('marathonCountStatus');
  async function refreshCounts() {
    try {
      const response = await fetch(config.endpoint, {cache: 'no-store', signal: AbortSignal.timeout(15000)});
      const {ok, service, counts} = await response.json();
      if (!response.ok || ok !== true || service !== 'sai-vista-marathon-2026-manual-v1' ||
          !counts || !['3K', '5K'].every(key => Number.isSafeInteger(counts[key]) && counts[key] >= 0)) {
        throw Error('Participant counts unavailable');
      }
      document.querySelectorAll('[data-marathon-count]').forEach(node => {
        node.textContent = String(counts[node.dataset.marathonCount]);
      });
      status.textContent = 'Includes entries awaiting payment verification.';
    } catch {
      status.textContent = 'Participant counts are temporarily unavailable.';
    }
  }
  refreshCounts();
})();
