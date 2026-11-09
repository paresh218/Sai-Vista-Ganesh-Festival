# Marathon family entry update - 9 November 2026

R1: Remove the payment-reference input. Screenshot and payment declaration remain required. Legacy UTRs and existing registrations stay intact; cached forms may still submit a valid UTR. Committee verification is required before confirmation.
R2: Remove age eligibility limits. Reject invalid dates and dates after event day.
R3: Require explicit parent accompaniment for ages 12 and under, in addition to existing under-18 consent. Save the confirmation in appended column AB; preserve all existing approval, BIB and email column positions.

Validation: 24 marathon checks, 205 site checks and 27 player checks passed. Added cases for age 12 boundary, younger children, missing accompaniment, invalid future DOB, older adults, screenshot-only registration and retries. No real registrations, payment or confirmation emails were created for testing. Browser and deployment verification are recorded in the chat. Rollback: prior Git commit and Apps Script version 5; retain appended data column on rollback and preserve existing records.
