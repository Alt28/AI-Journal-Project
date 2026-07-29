export const deleteAudioFile = async (uri?: string) => {
  if (!uri || uri.startsWith('blob:')) return;
  try {
    const { File } = await import('expo-file-system');
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The entry can still be removed if the operating system already cleared the file.
  }
};
