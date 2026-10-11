import { ChevronIcon } from "./Icons";
import { MethodBadges } from "./EndpointRow";

// Baris endpoint tanpa tombol (dipakai di dalam <Link>).
export default function EndpointRowStatic({ ep }) {
  return (
    <span className="ep-row" style={{ cursor: "pointer" }}>
      <MethodBadges methods={ep.method} />
      <span className="ep-main">
        <span className="ep-path">{ep.endpoint}</span>
        <span className="ep-desc">{ep.description || ep.name || ""}</span>
      </span>
      {ep.premium && <span className="badge badge-premium">Premium</span>}
      <ChevronIcon className="ep-chev" />
    </span>
  );
}
