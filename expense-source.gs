// Add this to the spreadsheet-bound Apps Script project and deploy a NEW VERSION.
// This endpoint exposes only the five expense fields and Total Collection.
const EXPENSE_YEAR = 2026; // Used only for text dates that omit the year.
function doGet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('Bind this script to the accounts spreadsheet.');
    const wanted = ['festival', 'expense', 'item', 'amount', 'paid on'];
    const norm = v => String(v).trim().replace(/\s+/g, ' ').toLowerCase();
    const sheets = []; const totals = [];
    ss.getSheets().forEach(sheet => {
      const range = sheet.getDataRange();
      const rows = range.getDisplayValues();
      const values = range.getValues();
      rows.forEach((row, r) => {
        row.forEach((cell, c) => { if (norm(cell) === 'total collection') totals.push(row[c+1]); });
        const labels = row.map(norm);
        if (!wanted.every(h => labels.includes(h))) return;
        if (wanted.some(h => labels.filter(v => v === h).length !== 1)) throw new Error('Duplicate expense headers');
        const cols = wanted.map(h => labels.indexOf(h));
        const output = [wanted];
        for (let i=r+1; i<rows.length; i++) {
          output.push(cols.map((c,j) => {
            const value=values[i][c];
            if(j===3 && typeof value==='number') return value;
            if(j===4 && value instanceof Date) return Utilities.formatDate(value,ss.getSpreadsheetTimeZone(),'yyyy-MM-dd');
            return rows[i][c];
          }));
        }
        sheets.push({rows:output});
      });
    });
    const named = ss.getRangeByName('DashboardTotalCollection');
    if (named && (named.getNumRows()!==1 || named.getNumColumns()!==1)) throw new Error('DashboardTotalCollection must be one cell');
    if (!named && totals.length!==1) throw new Error('Cannot uniquely identify Total Collection');
    const collection = named ? named.getValue() : totals[0];
    return expenseJson({ok:true,defaultYear:EXPENSE_YEAR,collection,sheets});
  } catch(e) {return expenseJson({ok:false,error:e.message});}
}
function expenseJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
