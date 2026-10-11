export const fmtRp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
export const fmtNum = (n) => Number(n || 0).toLocaleString("id-ID");
export const methodClass = (m) => "m-" + String(m).toLowerCase();
export const cx = (...parts) => parts.filter(Boolean).join(" ");
