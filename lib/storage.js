export const storage = {
  get(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, value); } catch {}
  },
  remove(key) {
    try { window.localStorage.removeItem(key); } catch {}
  }
};
