import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, EncodingType, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { AppSettings, JournalEntry, PersistedJournal } from './types';

const BACKUP_VERSION = 2;
const ITERATIONS = 120_000;

interface BackupPhoto {
  data: string;
  extension: string;
}

interface BackupContent {
  version: number;
  exportedAt: string;
  entries: JournalEntry[];
  recordings: Record<string, string>;
  photos?: Record<string, BackupPhoto[]>;
}

interface EncryptedBackup {
  format: 'daybook-encrypted-backup';
  version: number;
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  authentication: string;
}

const bytesToWordArray = (bytes: Uint8Array) => {
  const words: number[] = [];
  for (let index = 0; index < bytes.length; index += 1) {
    words[index >>> 2] =
      (words[index >>> 2] ?? 0) | (bytes[index]! << (24 - (index % 4) * 8));
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
};

const deriveKeys = (
  password: string,
  salt: CryptoJS.lib.WordArray,
  iterations: number,
) => {
  const material = CryptoJS.PBKDF2(password, salt, {
    keySize: 512 / 32,
    iterations,
    hasher: CryptoJS.algo.SHA256,
  });
  return {
    encryptionKey: CryptoJS.lib.WordArray.create(material.words.slice(0, 8), 32),
    authenticationKey: CryptoJS.lib.WordArray.create(
      material.words.slice(8, 16),
      32,
    ),
  };
};

const encryptContent = async (content: BackupContent, password: string) => {
  const salt = bytesToWordArray(await Crypto.getRandomBytesAsync(16));
  const iv = bytesToWordArray(await Crypto.getRandomBytesAsync(16));
  const keys = deriveKeys(password, salt, ITERATIONS);
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(content), keys.encryptionKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  const authenticatedValue = [
    salt.toString(CryptoJS.enc.Base64),
    iv.toString(CryptoJS.enc.Base64),
    ciphertext,
  ].join('.');
  return JSON.stringify({
    format: 'daybook-encrypted-backup',
    version: BACKUP_VERSION,
    iterations: ITERATIONS,
    salt: salt.toString(CryptoJS.enc.Base64),
    iv: iv.toString(CryptoJS.enc.Base64),
    ciphertext,
    authentication: CryptoJS.HmacSHA256(
      authenticatedValue,
      keys.authenticationKey,
    ).toString(CryptoJS.enc.Base64),
  } satisfies EncryptedBackup);
};

const decryptContent = (raw: string, password: string): BackupContent => {
  const envelope = JSON.parse(raw) as EncryptedBackup;
  if (
    envelope.format !== 'daybook-encrypted-backup' ||
    ![1, BACKUP_VERSION].includes(envelope.version)
  ) {
    throw new Error('This is not a supported Daybook backup.');
  }
  const salt = CryptoJS.enc.Base64.parse(envelope.salt);
  const iv = CryptoJS.enc.Base64.parse(envelope.iv);
  const keys = deriveKeys(password, salt, envelope.iterations);
  const authenticatedValue = [
    envelope.salt,
    envelope.iv,
    envelope.ciphertext,
  ].join('.');
  const expected = CryptoJS.HmacSHA256(
    authenticatedValue,
    keys.authenticationKey,
  ).toString(CryptoJS.enc.Base64);
  if (expected !== envelope.authentication) {
    throw new Error('Wrong password or damaged backup file.');
  }
  const decrypted = CryptoJS.AES.decrypt(
    {
      ciphertext: CryptoJS.enc.Base64.parse(envelope.ciphertext),
    } as CryptoJS.lib.CipherParams,
    keys.encryptionKey,
    { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
  );
  const text = decrypted.toString(CryptoJS.enc.Utf8);
  if (!text) throw new Error('Wrong password or damaged backup file.');
  const content = JSON.parse(text) as BackupContent;
  if (![1, BACKUP_VERSION].includes(content.version) || !Array.isArray(content.entries)) {
    throw new Error('This backup format is not supported.');
  }
  return content;
};

export const exportEncryptedBackup = async (
  entries: JournalEntry[],
  password: string,
) => {
  const recordings: Record<string, string> = {};
  const photos: Record<string, BackupPhoto[]> = {};
  for (const entry of entries) {
    if (entry.audioUri) {
      try {
        const audio = new File(entry.audioUri);
        if (audio.exists) recordings[entry.id] = await audio.base64();
      } catch {
        // A missing recording should not prevent the remaining journal backup.
      }
    }
    const entryPhotos: BackupPhoto[] = [];
    for (const uri of entry.imageUris) {
      try {
        const photo = new File(uri);
        if (!photo.exists) continue;
        entryPhotos.push({
          data: await photo.base64(),
          extension: photo.extension || '.jpg',
        });
      } catch {
        // A missing photo should not prevent the remaining journal backup.
      }
    }
    if (entryPhotos.length) photos[entry.id] = entryPhotos;
  }
  const raw = await encryptContent(
    {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      entries,
      recordings,
      photos,
    },
    password,
  );
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `Daybook-${stamp}.daybook`);
  file.create({ overwrite: true, intermediates: true });
  file.write(raw);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Save encrypted Daybook backup',
    mimeType: 'application/octet-stream',
    UTI: 'public.data',
  });
};

export const importEncryptedBackup = async (
  password: string,
  currentSettings: AppSettings,
): Promise<PersistedJournal | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const selected = result.assets[0];
  if (!selected) return null;
  const raw = await new File(selected.uri).text();
  const content = decryptContent(raw, password);
  const recordingsDirectory = new Directory(Paths.document, 'daybook-recordings');
  recordingsDirectory.create({ idempotent: true, intermediates: true });
  const photosDirectory = new Directory(Paths.document, 'daybook-images');
  photosDirectory.create({ idempotent: true, intermediates: true });
  const entries: JournalEntry[] = [];
  for (const entry of content.entries) {
    const encoded = content.recordings[entry.id];
    let audioUri: string | undefined;
    if (!encoded) {
      audioUri = undefined;
    } else {
      const extension = entry.audioUri?.match(/\.[a-z0-9]+$/i)?.[0] ?? '.m4a';
      const audio = new File(recordingsDirectory, `${entry.id}${extension}`);
      audio.create({ overwrite: true, intermediates: true });
      audio.write(encoded, { encoding: EncodingType.Base64 });
      audioUri = audio.uri;
    }
    const imageUris: string[] = [];
    const entryPhotos = content.photos?.[entry.id] ?? [];
    entryPhotos.forEach((photo, index) => {
      const extension = /^\.[a-z0-9]+$/i.test(photo.extension)
        ? photo.extension
        : '.jpg';
      const image = new File(
        photosDirectory,
        `${entry.id}-${index}${extension}`,
      );
      image.create({ overwrite: true, intermediates: true });
      image.write(photo.data, { encoding: EncodingType.Base64 });
      imageUris.push(image.uri);
    });
    entries.push({
      ...entry,
      audioUri,
      audioDuration: audioUri ? entry.audioDuration : undefined,
      imageUris,
    });
  }
  return { entries, settings: currentSettings };
};
