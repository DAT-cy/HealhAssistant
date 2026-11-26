import { File as ExpoFile } from 'expo-file-system';
import { Platform } from 'react-native';

export interface PickedFile { uri: string; name: string; type?: string | null; file?: Blob | null }

/**
 * Gắn file vào FormData cho mọi nền tảng.
 * - Web: gửi Blob/File thật.
 * - Điện thoại: `fetch` của Expo (SDK 52+) không nhận kiểu cũ `{ uri, name, type }`
 *   ("Unsupported FormDataPart implementation"), nên đọc byte qua expo-file-system.
 */
export async function appendFile(form: FormData, field: string, picked: PickedFile): Promise<void> {
  const type = picked.type || 'application/octet-stream';
  if (Platform.OS === 'web') {
    const blob = picked.file ?? await (await fetch(picked.uri)).blob();
    form.append(field, blob, picked.name);
    return;
  }
  const part = { name: picked.name, type, bytes: () => new ExpoFile(picked.uri).bytes() };
  form.append(field, part as unknown as Blob);
}
