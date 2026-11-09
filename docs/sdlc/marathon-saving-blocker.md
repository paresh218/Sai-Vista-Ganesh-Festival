# Marathon saving blocker - 9 November 2026

The entry form now shows a full-screen modal while reading/uploading the receipt and awaiting the registration response. It reuses existing validation-screen styles and reduced-motion support. Escape cannot dismiss it, duplicate submits remain blocked, and it closes on success, rejection or network failure. Successful completion moves focus to confirmation; failed saves retain the details and original retry reference. No backend or payment-verification behavior changes.

Regression coverage uses delayed responses for success/failure, checks the blocker before upload completes, prevents Escape and duplicate submissions, and verifies cleanup/focus. No live test entry or email is created.
