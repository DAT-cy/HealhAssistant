import { appendFile } from './formFile';

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({ bytes: jest.fn().mockResolvedValue(new Uint8Array([1, 2, uri.length])) })),
}));

describe('appendFile (điện thoại)', () => {
  it('gắn phần file có name, type và bytes() thay vì {uri} để fetch của Expo gửi được', async () => {
    const append = jest.fn();
    await appendFile({ append } as unknown as FormData, 'file', { uri: 'file:///tmp/a.pdf', name: 'a.pdf', type: 'application/pdf' });
    const [field, part] = append.mock.calls[0];
    expect(field).toBe('file');
    expect(part).toMatchObject({ name: 'a.pdf', type: 'application/pdf' });
    expect(part).not.toHaveProperty('uri');
    await expect(part.bytes()).resolves.toBeInstanceOf(Uint8Array);
  });
});
