# App and AI teammate handoff

The Android app and the future AI feature should remain separate modules.
Daybook's journal storage is always the source of truth. An AI/RAG index is only
a derived copy that can be deleted and rebuilt.

## Ownership

### App developer

Own these areas:

- Android screens and navigation
- Create, read, update, and delete behavior
- SQLite journal metadata and one-time legacy migration
- Local voice-recording files
- Local photo-attachment files
- Permissions, reminders, themes, and validation
- User confirmation before journal data is provided to an AI feature

### AI developer

Own these areas:

- The on-device model or remote AI service adapter
- Embeddings and vector index
- Retrieval and prompt construction
- Model loading, cancellation, errors, and performance
- Returning source entry IDs with every journal-based answer

The AI module must implement the types in
`src/integrations/aiContract.ts`, then register its indexing methods through
`registerJournalIndexAdapter` in `src/journalRepository.ts`. It should not
import SQLite or write journal entries directly.

## Shared data flow

```text
Daybook CRUD storage (source of truth)
             |
             | explicit copies keyed by journal entry ID
             v
AI/RAG index (derived and rebuildable)
             |
             v
Answer text + source entry IDs
             |
             v
Future AI screen
```

Map journal entries into `AIJournalDocument` objects only when the user enables
the future AI feature. Do not send audio files or photos automatically. If
voice transcription or image understanding is later added, require a separate
user-facing permission and privacy explanation.

## Keeping RAG synchronized with CRUD

- Create: send an `upsert` change with the new entry.
- Update: send an `upsert` change with the same stable entry ID.
- Delete: send a `remove` change with the deleted entry ID.
- Erase all: send a `clear` change.
- Recovery: call `rebuildIndex` using the current journal entries.

AI synchronization failure must never block or roll back a journal save. The
user's entry is more important than the derived index.

## Recommended team workflow

1. Keep the current app working and validated without AI.
2. Put AI work in its own branch and module, for example `src/ai/`.
3. Agree on `aiContract.ts` before either developer changes integration code.
4. Test the AI adapter with fake journal documents first.
5. Add one future AI screen behind an explicit opt-in setting.
6. Integrate CRUD synchronization only after the AI adapter passes its own
   indexing and deletion tests.
7. Test that the journal still creates, reads, updates, and deletes entries when
   the model is unavailable.

## Privacy decision

If the model runs with `llama.cpp` on the Android device, journal text can stay
local. If the team later chooses a remote API, never place a secret API key in
the Android application. Use a controlled backend and obtain clear user consent
before uploading journal content.
