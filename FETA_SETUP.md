# Feta registration deployment

1. Open the Apps Script project that owns deployment `AKfycbwTWhqD-d-T9uyaVPCFWIwmV_msu7725uGJwUIPSCa97PmyghcDe52JHPAexp6JcfNH`.
2. Paste `feta-registration.gs` into that project. If it already contains `doGet` or `doPost`, merge the handlers or replace them only if this project is dedicated to Feta registration.
3. Under Project Settings → Script properties, add `SPREADSHEET_ID` with the ID from the destination spreadsheet URL (between `/d/` and `/edit`). The deployment ID is not a spreadsheet ID.
4. Enable the V8 runtime. Deploy → Manage deployments → Edit the existing web app → New version. Execute as yourself and allow access to Anyone. Authorize spreadsheet access. Keep the existing deployment URL.
5. Visit the web app URL: it should return JSON identifying `Sai Vista Feta registration`. This health check does not expose resident details.
6. Publish the updated website files and assets using your existing GitHub Pages workflow.
7. Before the deadline, submit an authorized test registration from the website. Verify one row in `Feta Registrations`, confirmation, and the WhatsApp link recipient. Remove the test row manually afterward. Test the form on a phone with a UPI app.

The script creates a separate `Feta Registrations` tab. Each registration represents one feta at ₹70. Both browser and server enforce 11 September 2026, 5 PM Asia/Kolkata. Server validation rejects invalid names, Indian mobile numbers, flats, wings, and payment selections. A script lock and request ID prevent duplicate rows when retrying the same submission after a network failure. Payment status is self-declared, not payment-provider confirmation.

Like the existing Aarti flow, successful registration provides a prefilled WhatsApp message to Kantilal Mahajan (+91 94039 42777). The resident must open WhatsApp and press Send. This is not an automatic WhatsApp API integration.

The supplied QR was decoded locally as `upi://pay?pa=kotak227037@ybl&pn=Mr%20SAURABH%20RAVINDRA%20SARODE1&mc=0000&mode=02&purpose=00`. The pay link preserves these values and adds ₹70, INR, and a Feta payment note. The original QR has no fixed amount; residents enter ₹70 when scanning.

The existing Kurta deadline remains 8 September 2026. The requested 23 September card now contains a Kurta registration announcement, explicitly showing the earlier deadline; it does not change the deadline to 23 September.

Image: `assets/orange-marathi-feta.png`, created using the built-in imagegen tool. Prompt: “Use case: product-mockup. Create a photorealistic catalog image of one traditional Marathi orange saffron pheta (feta), neatly tied with an elegant upright fan crest and trailing fabric, on a warm ivory background. Rich woven fabric folds, soft studio light, centered complete turban, square composition, no people, no text, no logos. For a Ganesh festival registration website.”

The live Apps Script deployment has not been changed by this code update. Its current response could not be verified from this environment.
