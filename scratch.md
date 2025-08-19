## 2 Markdown → Google Slides playground (no LLM yet)


### 2-C Port core of `md2gslides`

Create `src/lib/md2gslides.ts` with a single exported async `markdownToBatch(markdown: string, templateLayout: 'TITLE_AND_BODY' = 'TITLE_AND_BODY'): SlidesRequest[]`.
Fork only the parsing logic (`marked.parse`) and slide-request generation from the original `md2gslides`; remove Node dependencies (`fs`, `yargs`, `chalk`, `googleapis`). Return an array of REST-compatible request objects.

### 2-D Generate deck

On ‘Generate Slides’ click:  
1. If `templateID` is non-empty, `POST https://slides.googleapis.com/v1/presentations/{templateID}:copy` with `{name:'Generated deck'}` to get a new `presentationId`; else `POST https://slides.googleapis.com/v1/presentations` with `{title:'Generated deck'}`.  
2. `POST https://slides.googleapis.com/v1/presentations/{presentationId}:batchUpdate` with the requests from `markdownToBatch`.  
3. Open the deck in a new tab: `https://docs.google.com/presentation/d/${presentationId}/edit`.  
Show a toast on success.

### 2-E Minimal UX polish

Add a status bar at the bottom: ‘Google: signed in as <email>’ or ‘Google: not connected’.  
Use the shadcn/ui `Dialog` and `Transition` for modals, and Toastify for toasts.

---

## 3 LLM integration

### 3-A Key manager modal

Create `KeyManagerModal.tsx` with provider dropdown (`Gemini`, `Anthropic`, `OpenAI`), password input, ‘Remember on this device’ checkbox.  
Save to `localStorage` or `sessionStorage` as `${PROVIDER}_API_KEY`.  
In `App.tsx`, add a key icon that toggles this modal.

### 3-B LLM adapter

Create `src/lib/llmAdapters.ts`.  
Export `callLLM({markdown, instructions}): Promise<string>`.  
Implementation:  
• If `ANTHROPIC_API_KEY` exists → POST to `https://api.anthropic.com/v1/messages`.  
• Else if `GEMINI_API_KEY` exists → POST to `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`.  
• Else error.  
Prompt contract: Return Markdown with one `#` per slide.

### 3-C Prompt builder

Add `buildPrompt(markdown: string, instructions: string): string` that puts instructions first, then a delimiter `---DOCUMENT START---` then the Markdown.  
Use it inside `callLLM`.

### 3-D End-to-end hook-up

When a PDF has been converted and previewed, show a textarea ‘Teacher instructions’.  
On ‘Generate Slides’ click (now in Preview tab) run:  
1. `mdOut = await callLLM({markdown, instructions})`  
2. Pass `mdOut` to existing `markdownToBatch` flow.  
Re-use the same template ID + token logic.

### 3-E Token & cost meter

Inside `callLLM`, before POSTing, estimate prompt tokens + max completion (`tiktoken`).  
Display ‘Estimated cost: $X.XX’ under the Generate button (use published per-token prices hard-coded).  
If cost > $0.50, show a confirmation modal.

---

## 4 Post-MVP niceties (optional later)

1. **Image placeholders** (`![unsplash:keyword]` to Unsplash search).  
2. **Chunk & summarise** documents that exceed 15 k tokens.  
3. **Multi-provider slide templates** (dropdown with canned IDs).  
4. **Service-Worker cache** of `markdown ↔ deckID` to prevent re-runs.

---

### Pyodide-specific Vite tweaks (if you hit build errors)

Install `vite-plugin-wasm` and `vite-plugin-top-level-await`; add to `vite.config.ts` plugins.  
In `tsconfig`, set `moduleResolution:'bundler'`.  
Add `define: { 'process.env': {} }` to silence Node polyfills.