/* Shared by the browser and Apps Script; amounts are integer paise. */
(function (root) {
  const norm = v => String(v ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  function money(v) {
    const s = String(v ?? '').trim().replace(/^₹\s*/, '');
    if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(s)) throw Error('Invalid or missing amount');
    const clean = s.replace(/,/g, '');
    const parts = clean.replace('-', '').split('.');
    const n = (Number(parts[0]) * 100 + Number((parts[1] || '').padEnd(2, '0'))) * (clean.startsWith('-') ? -1 : 1);
    if (!Number.isSafeInteger(n)) throw Error('Amount exceeds safe precision');
    return n;
  }
  function sum(values) {
    return values.reduce((a,b) => { const n=a+b; if (!Number.isSafeInteger(n)) throw Error('Total exceeds safe precision'); return n; },0);
  }
  function date(v, year) {
    const s=String(v ?? '').trim();
    if (!s) return '';
    let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/), y,mo,d;
    if(m) [,y,mo,d]=m;
    else { m=s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/); if(!m) throw Error('Unrecognized Paid On date'); [,d,mo,y]=m; y=y || year; }
    const dt=new Date(Date.UTC(+y,+mo-1,+d));
    if(dt.getUTCFullYear()!==+y || dt.getUTCMonth()!==+mo-1 || dt.getUTCDate()!==+d) throw Error('Invalid Paid On date');
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  function parse(payload) {
    if(!payload || payload.ok!==true || !Array.isArray(payload.sheets)) throw Error(payload?.error || 'Expense source is unavailable');
    const headers=['festival','expense','item','amount','paid on'];
    const tables=[], collections=[];
    for(const sheet of payload.sheets) {
      sheet.rows.forEach((row,r) => {
        const cells=row.map(norm);
        if(headers.every(h=>cells.includes(h))) {
          if(headers.some(h=>cells.filter(c=>c===h).length!==1)) throw Error('Duplicate expense headers');
          tables.push({sheet,r,cols:headers.map(h=>cells.indexOf(h))});
        }
        cells.forEach((c,i)=> { if(c==='total collection') collections.push(row[i+1]); });
      });
    }
    if(tables.length!==1) throw Error('Expected exactly one expense table');
    const collection=payload.collection ?? (collections.length===1 ? collections[0] : undefined);
    const collectionPaise=money(collection);
    const {sheet,r,cols}=tables[0], records=[], planned=[];
    let festival='', category='';
    for(let i=r+1;i<sheet.rows.length;i++) {
      const [f,c,item,amount,paid]=cols.map(j=>sheet.rows[i][j] ?? '');
      if(!norm(f) && !norm(c) && ['total expenses','total collection'].includes(norm(item))) break;
      if([f,c,item,amount,paid].every(v=>norm(v)==='')) {festival=''; category=''; continue;}
      try {
        if(norm(f) && norm(f)!==norm(festival)) {festival=String(f).trim(); category='';}
        if(norm(c)) category=String(c).trim();
        if(!norm(item) && !norm(amount) && !norm(paid)) continue;
        if(norm(item) && !norm(amount) && !norm(paid)) {
          if(!festival) throw Error('Missing festival');
          planned.push({festival,category:category || 'Uncategorised',item:String(item).trim()});
          continue;
        }
        if(!norm(item) || !festival) throw Error('Missing item or festival');
        records.push({festival,category:category || 'Uncategorised',item:String(item).trim(),amountPaise:money(amount),date:date(paid,payload.defaultYear),row:i+1});
      } catch(e) {throw Error(`Expense row ${i+1}: ${e.message}`);}
    }
    const expensePaise=sum(records.map(r=>r.amountPaise));
    return {records,planned,collectionPaise,expensePaise,balancePaise:sum([collectionPaise,-expensePaise])};
  }
  root.ExpenseModel={parse,money,sum,date};
  if(typeof module!=='undefined') module.exports=root.ExpenseModel;
})(typeof window!=='undefined' ? window : globalThis);
