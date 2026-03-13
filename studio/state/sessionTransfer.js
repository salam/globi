export const STORAGE_KEY = 'globi-studio-scene';

export function writeScene(scene) {
  const json = JSON.stringify(scene);
  sessionStorage.setItem(STORAGE_KEY, json);
}

export function readScene() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  return JSON.parse(raw);
}
