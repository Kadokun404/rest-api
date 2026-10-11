import { ChevronIcon } from "./Icons";
import { methodClass } from "@/lib/format";

export function MethodBadges({ methods }) {
  return (
    <span className="ep-methods">
      {(methods || ["GET"]).map((m) => (<span key={m} className={`badge ${methodClass(m)}`}>{m}</span>))}
    </span>
  );
}

export default function EndpointRow({ ep, open, onToggle }) {
  return (
    <button type="button" className="ep-row" onClick={onToggle} aria-expanded={open}>
      <MethodBadges methods={ep.method} />
      <span className="ep-main">
        <span className="ep-path">{ep.endpoint}</span>
        <span className="ep-desc">{ep.description || ep.name || ""}</span>
      </span>
      {ep.premium && <span className="badge badge-premium">Premium</span>}
      <ChevronIcon className="ep-chev" />
    </button>
  );
}
