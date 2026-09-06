(() => {
  const URL='https://script.google.com/macros/s/AKfycbzOZSCtyzCYmexoOiI2sFkZnbxh_zN2Zhhh9mxj_a85vYlvFM-w6SlOdvX3M5kGrdesqg/exec';
  const el=document.getElementById('expenseDashboard');
  if(!el) return;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rupees=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(n/100);
  let data, busy=false, updated='', failure='';
  const filters={festival:'',category:'',from:'',to:''};
  function render() {
    const detailsOpen = el.querySelector(".dashboard-details")?.open || false;
    el.innerHTML=`<div class="payment-toolbar"><h3>Live Expense Dashboard</h3><button id="expenseRefresh" type="button" ${busy?'disabled':''}>${busy?'Refreshing…':'Refresh expenses'}</button></div><p role="status">${esc(failure || (updated ? `Last successful refresh: ${updated} · Auto-refresh every 60 seconds` : 'Loading live expenses…'))}</p>`;
    el.querySelector('button').onclick=refresh;
    if(!data) return;
    el.insertAdjacentHTML('beforeend',`<div class="finance-summary">${[['Total Collection',data.collectionPaise,'collection','↙','Funds collected'],['Total Expenses',data.expensePaise,'spent','↗','Recorded expenditure'],['Remaining balance',data.balancePaise,'balance','₹',data.balancePaise<0?'Expenses exceed collection':'Available for upcoming expenses']].map(([label,n,kind,icon,hint])=>`<article class="expense-metric expense-metric-${kind}"><div class="expense-metric-heading"><small>${label}</small><span aria-hidden="true">${icon}</span></div><strong>${rupees(n)}</strong><span class="expense-metric-hint">${hint}</span></article>`).join('')}</div><p>Remaining balance = Total Collection − all recorded expenses. Negative amounts reduce expenditure. ${data.planned.length} planned items have no amount and are excluded. ${data.balancePaise<0?'Expenses exceed collection.':''}</p><div class="expense-filters">${['festival','category'].map(key=>`<label>${key==='festival'?'Festival':'Category'}<select data-filter="${key}"><option value="">All</option>${[...new Set(data.records.map(r=>r[key]))].sort().map(v=>`<option value="${esc(v)}" ${filters[key]===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`).join('')}<label>Paid from<input type="date" data-filter="from" value="${esc(filters.from)}"></label><label>Paid through<input type="date" data-filter="to" value="${esc(filters.to)}"></label><button id="expenseClear" type="button">Clear filters</button></div><div id="expenseResults"></div>`);
    el.querySelectorAll('[data-filter]').forEach(input=>input.onchange=()=>{filters[input.dataset.filter]=input.value;results();});
    el.querySelector('#expenseClear').onclick=()=>{Object.keys(filters).forEach(k=>filters[k]='');render();};
    if(data.planned.length) el.insertAdjacentHTML('beforeend',`<details><summary>Planned items without amounts (${data.planned.length})</summary><p>These items are not included in expenditure until an amount is entered.</p><ul>${data.planned.map(r=>`<li>${esc(r.festival)} · ${esc(r.category)} · ${esc(r.item)}</li>`).join('')}</ul></details>`);
    const details = document.createElement("details");
    details.className = "dashboard-details";
    details.open = detailsOpen;
    const summary = document.createElement("summary");
    summary.textContent = "Click here to see more details";
    details.append(summary);
    const summaryCards = el.querySelector(".finance-summary");
    while (summaryCards.nextElementSibling) details.append(summaryCards.nextElementSibling);
    el.append(details);
    results();
  }
  function results() {
    const target=el.querySelector('#expenseResults');
    if(filters.from && filters.to && filters.from>filters.to) {target.textContent='Start date must be on or before end date.';return;}
    const rows=data.records.filter(r=>(!filters.festival || r.festival===filters.festival) && (!filters.category || r.category===filters.category) && (!filters.from || r.date && r.date>=filters.from) && (!filters.to || r.date && r.date<=filters.to)).sort((a,b)=>b.date.localeCompare(a.date));
    const groups=key=>{const m=new Map();rows.forEach(r=>m.set(r[key],ExpenseModel.sum([m.get(r[key])||0,r.amountPaise])));return [...m].sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<li><span>${esc(k)}</span><strong>${rupees(n)}</strong></li>`).join('');};
    target.innerHTML=`<h3>Filtered expenditure: ${rupees(ExpenseModel.sum(rows.map(r=>r.amountPaise)))}</h3><p>${rows.length} records · Overall balance above includes every record. Undated records appear when no date filter is applied.</p><div class="payment-viz"><article class="payment-card"><h3>By festival</h3><ul class="expense-category-list">${groups('festival')}</ul></article><article class="payment-card"><h3>By category</h3><ul class="expense-category-list">${groups('category')}</ul></article></div><div class="payment-table-wrap"><table class="payment-table"><thead><tr><th>Festival</th><th>Expense category</th><th>Item</th><th>Amount</th><th>Paid On</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.festival)}</td><td>${esc(r.category)}</td><td>${esc(r.item)}</td><td>${rupees(r.amountPaise)}</td><td>${r.date ? r.date.split('-').reverse().join('/') : 'Not recorded'}</td></tr>`).join('')}</tbody></table>${rows.length?'':'<p>No expenses match these filters.</p>'}</div>`;
  }
  async function refresh() {
    if(busy) return;
    busy=true;render();
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),20000);
    try {
      const response=await fetch(`${URL}?action=expenses&_=${Date.now()}`,{cache:'no-store',signal:controller.signal});
      if(!response.ok) throw Error('Expense service failed');
      const next=ExpenseModel.parse(await response.json());
      data=next;updated=new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST';failure='';
    } catch(e) {console.error('Expense dashboard:', e); failure=data?'Refresh failed. Showing the last successful snapshot; figures may be outdated.':'Live expenses unavailable. No totals are shown until the sheet can be read and validated.'; failure += ' ' + (e.name === 'AbortError' ? 'The request timed out; try Refresh expenses.' : e instanceof TypeError ? 'The browser could not connect to the expense service.' : e.message);}
    finally {clearTimeout(timer);busy=false;render();}
  }
  refresh();setInterval(()=>{if(!document.hidden) refresh();},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) refresh();});
})();
