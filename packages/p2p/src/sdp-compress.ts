/** Compress SDP string → base64(gzip(utf8(sdp))) for QR code transport. */
export async function compressSDP(sdp: string): Promise<string> {
  const bytes = new TextEncoder().encode(sdp);
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  void writer.write(bytes);
  void writer.close();

  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];

  for (;;) {
    const result = await reader.read();
    if (result.done) break;
    chunks.push(result.value);
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return btoa(String.fromCharCode(...combined));
}

export async function decompressSDP(compressed: string): Promise<string> {
  const binaryString = atob(compressed);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  void writer.write(bytes);
  void writer.close();

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];

  for (;;) {
    const result = await reader.read();
    if (result.done) break;
    chunks.push(result.value);
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(combined);
}
