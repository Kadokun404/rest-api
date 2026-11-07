"use client";
import { useState } from "react";
import { CopyIcon, CheckIcon } from "./Icons";

const SNIPPETS = [
  {
    id: "curl",
    label: "cURL",
    title: "bash",
    code: `curl -X GET "https://kadokunn.com/api/info/ping" \\
  -H "Accept: application/json"`
  },
  {
    id: "js",
    label: "JavaScript",
    title: "javascript",
    code: `const response = await fetch("https://kadokunn.com/api/info/ping", {
  headers: { "Accept": "application/json" }
});
const data = await response.json();
console.log(data);`
  },
  {
    id: "python",
    label: "Python",
    title: "python",
    code: `import requests

res = requests.get(
    "https://kadokunn.com/api/info/ping",
    headers={"Accept": "application/json"}
)
print(res.json())`
  },
  {
    id: "baileys",
    label: "WhatsApp Bot",
    title: "baileys",
    code: `// Panggil REST API langsung dari bot WhatsApp (Baileys)
const res = await fetch("https://kadokunn.com/api/info/runtime");
const { result } = await res.json();
await sock.sendMessage(jid, { text: \`Bot Aktif: \${result.runtime}\` });`
  }
];

export default function CodePlayground() {
  const [activeTab, setActiveTab] = useState("curl");
  const [copied, setCopied] = useState(false);

  const activeSnippet = SNIPPETS.find((s) => s.id === activeTab) || SNIPPETS[0];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(activeSnippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div className="code-playground-wrap">
      <div className="code-playground-tabs">
        {SNIPPETS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`playground-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-dot" />
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          className="playground-copy-btn"
          onClick={handleCopy}
          aria-label="Salin kode"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? "Tersalin" : "Salin"}</span>
        </button>
      </div>
      <div className="code-playground-window">
        <pre className="code-playground-pre">
          <code>{activeSnippet.code}</code>
        </pre>
      </div>
    </div>
  );
}
