# Marathon registration and participant editing cutoff — 11 November 2026

Owner changed the fixed closing time to 14 November 2026 at 17:00 IST. Registration still closes earlier when 200 total submitted entries are reached. Participant editing closes at the fixed 17:00 deadline; existing entries remain privately viewable. Committee payment verification and confirmation-email processing remain operational.

The shared model, browser links and registration controls, public notices, calendar and future invitation text use the 5 PM cutoff. The private grid removes Edit and active edit fields at the deadline, including already-open tabs and stale Save handlers. The server rejects participant edits both before and after acquiring the script lock, before either editable column is written. Registration already rechecks its deadline inside the lock. Client clocks never authorize server writes.

Tests cover acceptance before 17:00, rejection at 17:00, viewing after cutoff, an edit crossing the deadline while waiting for the lock, an already-open edit becoming read-only, and a stale Save sending no request. Production dates are not moved or participant data changed for verification.
