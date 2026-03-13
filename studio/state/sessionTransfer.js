export const STORAGE_KEY = 'globi-studio-scene';

export async function writeScene(scene) {
  const json = JSON.stringify(scene);
  try {
    if (json.length > 4 * 1024 * 1024 && typeof CompressionStream !== 'undefined') {
      const encoder = new TextEncoder();
      const buf = await new Response(
        new Blob([encoder.encode(json)]).stream().pipeThrough(new CompressionStream('gzip'))
      ).arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      sessionStorage.setItem(STORAGE_KEY, 'gzip:' + b64);
    } else {
      sessionStorage.setItem(STORAGE_KEY, json);
    }
  } catch (err) {
    console.error('Failed to write scene to sessionStorage:', err.message);
  }
}

export async function readScene() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  if (raw.startsWith('gzip:')) {
    const b64 = raw.slice(5);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ds = new DecompressionStream('gzip');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    const text = await new Response(stream).text();
    return JSON.parse(text);
  }
  return JSON.parse(raw);
}
