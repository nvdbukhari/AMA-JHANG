# AmC Web — Latest Fix

Includes both:
- `html/` — plain HTML + CSS + JavaScript + Firestore
- `react/` — React/Vite shell using the same application engine

Latest fixes:
- Invoice modal no longer closes when clicking empty/backdrop space. It closes only with the X or an explicit Cancel/close action.
- Agreement now has a customer photo option.
- Customer photos are stored locally in the browser using IndexedDB only. Photo bytes are NOT uploaded to Firestore.
- Editing an agreement loads its locally stored photo when available.
- Existing Firestore agreement photo field is removed so photos remain local.
- All previous Firestore, invoice, agreement, purchase, collection, reports and in-app tracking functionality remains.

Run HTML with VS Code Live Server (recommended).
Run React with `npm install` then `npm run dev`.
