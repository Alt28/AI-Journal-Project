import { Directory, File, Paths } from 'expo-file-system';
import {
  ImageManipulator,
  SaveFormat,
} from 'expo-image-manipulator';
import { createVideoPlayer } from 'expo-video';

import { createId } from './utils';

export const MAX_VIDEO_DURATION_MS = 5 * 60_000;
export const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024;

const videoDirectory = () => {
  const directory = new Directory(Paths.document, 'daybook-videos');
  directory.create({ idempotent: true, intermediates: true });
  return directory;
};

const thumbnailDirectory = () => {
  const directory = new Directory(
    Paths.document,
    'daybook-video-thumbnails',
  );
  directory.create({ idempotent: true, intermediates: true });
  return directory;
};

const videoExtension = ({
  fileName,
  mimeType,
  uri,
}: {
  fileName?: string | null;
  mimeType?: string | null;
  uri: string;
}) => {
  const namedExtension = fileName?.match(/\.(mp4|m4v|mov|webm|3gp)$/i)?.[0];
  if (namedExtension) return namedExtension.toLowerCase();

  const uriExtension = uri.match(/\.(mp4|m4v|mov|webm|3gp)(?:[?#]|$)/i)?.[1];
  if (uriExtension) return `.${uriExtension.toLowerCase()}`;

  if (mimeType === 'video/quicktime') return '.mov';
  if (mimeType === 'video/webm') return '.webm';
  if (mimeType === 'video/3gpp') return '.3gp';
  return '.mp4';
};

export const keepJournalVideo = async ({
  uri,
  fileName,
  mimeType,
}: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}) => {
  const source = new File(uri);
  const destination = new File(
    videoDirectory(),
    `${createId()}${videoExtension({ fileName, mimeType, uri })}`,
  );
  await source.copy(destination);
  const sizeBytes = destination.size;
  if (sizeBytes > MAX_VIDEO_SIZE_BYTES) {
    destination.delete();
    throw new Error('VIDEO_TOO_LARGE');
  }
  return {
    uri: destination.uri,
    sizeBytes,
    thumbnailUri: await createJournalVideoThumbnail(destination.uri),
  };
};

export const getJournalVideoSize = (uri?: string) => {
  if (!uri) return undefined;
  try {
    const video = new File(uri);
    return video.exists && video.size > 0 ? video.size : undefined;
  } catch {
    return undefined;
  }
};

export const createJournalVideoThumbnail = async (uri: string) => {
  const player = createVideoPlayer(uri);
  let thumbnail:
    | Awaited<ReturnType<typeof player.generateThumbnailsAsync>>[number]
    | undefined;
  let context: ReturnType<typeof ImageManipulator.manipulate> | undefined;
  let rendered: Awaited<ReturnType<NonNullable<typeof context>['renderAsync']>>
    | undefined;
  try {
    [thumbnail] = await player.generateThumbnailsAsync(1, {
      maxWidth: 960,
      maxHeight: 540,
    });
    if (!thumbnail) return undefined;
    context = ImageManipulator.manipulate(thumbnail);
    rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      compress: 0.82,
      format: SaveFormat.JPEG,
    });
    const destination = new File(
      thumbnailDirectory(),
      `${createId()}.jpg`,
    );
    await new File(saved.uri).copy(destination);
    return destination.uri;
  } catch {
    return undefined;
  } finally {
    rendered?.release();
    context?.release();
    thumbnail?.release();
    player.release();
  }
};

const deleteLocalFile = async (uri?: string) => {
  if (!uri || uri.startsWith('blob:')) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Missing media should never prevent an entry from being updated.
  }
};

export const deleteVideoFile = deleteLocalFile;
export const deleteVideoThumbnailFile = deleteLocalFile;
