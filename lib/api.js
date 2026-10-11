// Semua request memakai URL relatif (same-origin) ke backend Express.
export async function getJSON(path, opts) {
  try {
    const r = await fetch(path, opts);
    const data = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err };
  }
}

export function postJSON(path, body) {
  return getJSON(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}
