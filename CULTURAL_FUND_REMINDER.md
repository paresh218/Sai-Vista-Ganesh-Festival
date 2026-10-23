# Cultural fund reminder

The reminder uses the same live contribution-sheet endpoint as the existing payment dashboard and Fun n Fair payment check. No new spreadsheet, paid service or payment database is required.

- Match the remembered resident flat against one unique wing/flat row.
- Only an explicit `No` triggers the reminder. `Yes`, missing/duplicate records, unexpected values and failed checks do not.
- Check on entry and refresh at most once per minute while the page is visible. Sheet corrections take effect on the next successful refresh.
- Every 30 seconds, show a native blocking dialog for five seconds. Residents can dismiss it sooner with the button or Escape.
- Skip reminders while another dialog/form is open or the page is hidden. Restore keyboard focus when closing.
- Keep status in page memory only. Never store the payment response in local storage or the service-worker cache.
- Flat selection is self-reported; it is not proof of identity or a payment-enforcement system.

The lightweight local SVG is an original, friendly piggy-bank meme. It does not include resident names, flat numbers or payment details.

Run `node --test cultural-fund-reminder.test.cjs`, `npm test` and `npm run test:player` before publishing. Browser timing checks use a clearly labelled local simulated unpaid record; no real payment records are changed.
