# Backend

Task S03 uses Firestore NoSQL document contracts, Security Rules, indexes and emulator tests in firestore/. S04 adds Firebase Authentication and membership flows. The earlier PostgreSQL/Supabase plan is superseded by the user's NoSQL requirement.

Use synthetic data until tenant isolation is tested. Service account credentials belong only on a trusted server and must never enter frontend bundles. Firebase public app configuration is not an authorization mechanism; tested Firestore rules and verified memberships are mandatory. Admin SDK operations bypass rules and need their own checks. No Firebase cloud project or billable service has been enabled.
