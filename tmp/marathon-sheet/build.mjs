import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const workbook=Workbook.create();
for(const activity of ['Running','Walking']){
 const sheet=workbook.worksheets.add(activity);
 sheet.getRange('A1:H1').values=[['Submitted at','Reference','Name','Wing & flat','Interested participants','Activity','Interest only','Payload']];
}
workbook.recalculate();
console.log((await workbook.inspect({kind:'sheet',include:'id,name',maxChars:1000})).ndjson);
await (await SpreadsheetFile.exportXlsx(workbook)).save('D:/Sai Vista Ganesh Festival/tmp/marathon-sheet/marathon-interest.xlsx');
