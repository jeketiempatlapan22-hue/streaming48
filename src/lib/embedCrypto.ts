// XOR-based encryption for embed IDs (YouTube, etc.)
// Key must match the one in VideoPlayer's decryptUrl
const _k = [82, 84, 52, 56, 120, 75, 57, 109, 81, 50, 118, 76, 55, 110, 80, 52];

export function encryptEmbedId(plain: string): string {
  if (plain.startsWith("enc:")) return plain; // already encrypted
  const bytes = new TextEncoder().encode(plain);
  const result = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[i] = bytes[i] ^ _k[i % _k.length];
  }
  return "enc:" + btoa(String.fromCharCode(...result));
}

export function decryptEmbedId(encoded: string): string {
  if (!encoded.startsWith("enc:")) return encoded;
  const b64 = encoded.slice(4);
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const result = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[i] = bytes[i] ^ _k[i % _k.length];
  }
  return new TextDecoder().decode(result);
}
