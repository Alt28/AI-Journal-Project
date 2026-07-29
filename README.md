# Daybook for Android

Daybook is an Android-only, offline-first private journal built with React
Native and Expo. The native Gradle project is included in `android/` so it can
be opened and run directly in Android Studio.

## CRUD behavior

- **Create:** Use the center `+` button or a screen's Add Entry action.
- **Read:** Tap any journal card to open its clean, read-only detail screen.
- **Update:** From the detail screen, tap Edit Entry and save the changes.
- **Delete:** From the detail screen, tap Delete and confirm the warning.

The app also includes up to five private photos per entry, local voice
recordings, mood and tag organization, favorites, search, calendar retrieval,
reminders, system/light/dark themes, recoverable drafts, encrypted backups, and
an optional device-authentication lock.

There is intentionally no AI, RAG, cloud sync, analytics, account, or ad
integration in this version.

## Open in Android Studio

1. Install Node.js, Android Studio, Android SDK, and Java 17.
2. From the project root, install JavaScript dependencies:

   ```bash
   npm install
   ```

3. Whenever `app.json` or native dependencies change, synchronize the checked-in
   Android project by running:

   ```bash
   npm run prebuild:android
   ```

4. Open Android Studio.
5. Choose **Open** and select the `android` folder inside this project.
6. Allow Gradle Sync to finish.
7. Select an emulator or connected Android phone.
8. Click Android Studio's green Run button.

For development from the terminal, start Metro in one terminal:

```bash
npm start
```

Then build and install the Android app from another terminal:

```bash
npm run android
```

## App and AI teamwork

Your app work stays independent from your friend's AI work. Share these two
files with your teammate:

- `src/integrations/aiContract.ts`
- `docs/AI_HANDOFF.md`

The contract contains TypeScript interfaces only; it does not add AI to this
app. `src/journalRepository.ts` is the registration point for a future index
adapter. The handoff guide explains ownership, RAG synchronization with CRUD,
and privacy boundaries.

## Validation

```bash
npm run typecheck
npx expo-doctor
npm run bundle:android
```

Journal metadata is saved in a local SQLite database. Existing AsyncStorage
data is migrated automatically once. Voice recordings and optimized photo
copies use the app's document directory so they remain local and are not
treated as temporary cache files.
