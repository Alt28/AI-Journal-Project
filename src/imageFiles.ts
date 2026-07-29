import { Directory, File, Paths } from 'expo-file-system';
import {
  manipulateAsync,
  SaveFormat,
} from 'expo-image-manipulator';

import { createId } from './utils';

export const MAX_ENTRY_IMAGES = 5;
const MAX_IMAGE_EDGE = 1800;

const imageDirectory = () => {
  const directory = new Directory(Paths.document, 'daybook-images');
  directory.create({ idempotent: true, intermediates: true });
  return directory;
};

export const keepJournalImage = async ({
  uri,
  width,
  height,
}: {
  uri: string;
  width: number;
  height: number;
}) => {
  const longestEdge = Math.max(width, height);
  const actions =
    longestEdge > MAX_IMAGE_EDGE
      ? [
          width >= height
            ? { resize: { width: MAX_IMAGE_EDGE } }
            : { resize: { height: MAX_IMAGE_EDGE } },
        ]
      : [];
  const optimized = await manipulateAsync(uri, actions, {
    compress: 0.82,
    format: SaveFormat.JPEG,
  });
  const source = new File(optimized.uri);
  const destination = new File(imageDirectory(), `${createId()}.jpg`);
  await source.copy(destination);
  try {
    if (source.exists) source.delete();
  } catch {
    // The system can clear the temporary optimized copy later.
  }
  return destination.uri;
};

export const deleteImageFile = async (uri?: string) => {
  if (!uri || uri.startsWith('blob:')) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Missing media should never prevent the journal entry from being updated.
  }
};

export const deleteImageFiles = async (uris: string[] = []) => {
  await Promise.all(uris.map((uri) => deleteImageFile(uri)));
};
