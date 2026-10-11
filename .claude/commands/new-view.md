---
description: "Add a read-only branded report from an existing database view."
---

# New view

Read the user's question, existing views.json and the relevant migration. Start from current records, not a mockup. Add a read-only database view in the next migration when needed, then add a section to views.json with a SELECT query and a plain title. Do not concatenate untrusted input into query text.

Run npm test and npm run migrate, then npm run view. Open the generated HTML and check the title, numbers, empty state and phone width. Use brand.json for business name, logo and colours. Report the file path and the data date. No forms, writes, servers or hosted front end. Never publish the report.
