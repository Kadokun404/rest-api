// Pewarnaan JSON tanpa dangerouslySetInnerHTML.
const TOKEN = /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;

export default function JsonView({ value }) {
  const json = JSON.stringify(value, null, 2);
  const out = [];
  let last = 0;
  let m;
  let i = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(json))) {
    if (m.index > last) out.push(json.slice(last, m.index));
    const tok = m[0];
    let cls = "j-num";
    if (tok.startsWith('"')) cls = m[2] ? "j-key" : "j-str";
    else if (tok === "true" || tok === "false") cls = "j-bool";
    else if (tok === "null") cls = "j-null";
    out.push(<span key={i++} className={cls}>{tok}</span>);
    last = m.index + tok.length;
  }
  if (last < json.length) out.push(json.slice(last));
  return <>{out}</>;
}
