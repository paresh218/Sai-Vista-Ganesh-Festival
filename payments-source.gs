const PAYMENT_SPREADSHEET_ID =
  "1DAoIQq4SbnnS0z6-inkCJKkpne0AUn1I8FpVR4FuhYo";

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;

  if (action !== "payments") {
    return json({ status: "ok" });
  }

  return json({status:'error',message:'Only verified residents can view restricted data.'});
}
function doPost(e) {
  try {
    financeResidentRequest(e);
    return json({
      status: "success",
      payments: getPaymentRows()
    });
  } catch (error) {
    console.error(error);
    return json({
      status: "error",
      message: "Payment data could not be loaded."
    });
  }
}

function getPaymentRows() {
  const spreadsheet = SpreadsheetApp.openById(PAYMENT_SPREADSHEET_ID);

  // Finds the tab that contains these exact header names.
  const sheet = spreadsheet.getSheets().find(item => {
    const headers = item
      .getRange(1, 1, 1, Math.max(item.getLastColumn(), 1))
      .getDisplayValues()[0]
      .map(value => String(value).toLowerCase().replace(/[^a-z]/g, ""));

    return ["wing", "flatnumber", "paid", "amount"]
      .every(header => headers.includes(header));
  });

  if (!sheet) {
    throw new Error(
      "No tab found with Wing, Flat Number, Paid, and Amount headers."
    );
  }

  const values = sheet.getDataRange().getDisplayValues();

  const headers = values[0].map(value =>
    String(value).toLowerCase().replace(/[^a-z]/g, "")
  );

  const column = header => headers.indexOf(header);

  return values.slice(1)
    .map(row => ({
      wing: row[column("wing")],
      flat: row[column("flatnumber")],
      paid: row[column("paid")],
      amount: row[column("amount")]
    }))
    .filter(row => row.wing && row.flat);
}

function json(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
