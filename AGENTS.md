# AGENTS.md

Read `README.md` first for the user-facing overview, slide-markdown syntax, and the main development commands.

## Repository Guidance

- `src/App.tsx` owns the main application flow for file upload, markdown editing, and slide generation.
- `src/worker/pdfWorker.ts` handles PDF-to-markdown work in the worker; keep heavy processing out of the main thread.
- `src/services/googleAuth.ts` and `src/services/slidesService.ts` own Google authentication and Slides interactions.
- The markdown-to-slides engine lives in `src/md2gslides/`; changes there can have broad rendering effects, so verify them carefully.
- `VITE_GOOGLE_CLIENT_ID` is required for live Google API flows.
