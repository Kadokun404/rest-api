import { SITE } from "./site";

/** Contoh kode curl / JavaScript / Python untuk satu endpoint. */
export function buildSnippets(ep) {
  const method = (ep.method && ep.method[0]) || "GET";
  const params = ep.params || {};
  const keys = Object.keys(params);
  const fileKey = keys.find((k) => params[k].type === "file");
  const dataKeys = keys.filter((k) => params[k].type !== "file");
  const url = SITE.url + ep.endpoint;
  const ex = {};
  dataKeys.forEach((k) => {
    const x = params[k].example;
    ex[k] = x !== undefined && x !== null ? x : "";
  });
  const qs = dataKeys.length ? "?" + dataKeys.map((k) => `${k}=${encodeURIComponent(ex[k])}`).join("&") : "";
  const keyHeader = ep.premium ? " \\\n  -H 'x-api-key: KEY_KAMU'" : "";

  let curl;
  if (method === "GET") curl = `curl '${url}${qs}'${keyHeader}`;
  else if (fileKey) curl = `curl -X ${method} '${url}' \\\n  -F '${fileKey}=@/path/to/file'${keyHeader}`;
  else curl = `curl -X ${method} '${url}'${keyHeader} \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(ex)}'`;

  let javascript;
  if (method === "GET") {
    javascript = `const res = await fetch('${url}${qs}'${ep.premium ? ", {\n  headers: { 'x-api-key': 'KEY_KAMU' },\n}" : ""});\nconst data = await res.json();\nconsole.log(data);`;
  } else if (fileKey) {
    javascript = `const form = new FormData();\nform.append('${fileKey}', fileInput.files[0]);\n\nconst res = await fetch('${url}', {\n  method: '${method}',${ep.premium ? "\n  headers: { 'x-api-key': 'KEY_KAMU' }," : ""}\n  body: form,\n});\nconst data = await res.json();\nconsole.log(data);`;
  } else {
    javascript = `const res = await fetch('${url}', {\n  method: '${method}',\n  headers: {\n    'Content-Type': 'application/json'${ep.premium ? ",\n    'x-api-key': 'KEY_KAMU'" : ""},\n  },\n  body: JSON.stringify(${JSON.stringify(ex, null, 2)}),\n});\nconst data = await res.json();\nconsole.log(data);`;
  }

  const pyHeaders = ep.premium ? ", headers={'x-api-key': 'KEY_KAMU'}" : "";
  let python;
  if (method === "GET") python = `import requests\n\nres = requests.get('${url}', params=${dataKeys.length ? JSON.stringify(ex) : "{}"}${pyHeaders})\nprint(res.json())`;
  else if (fileKey) python = `import requests\n\nfiles = {'${fileKey}': open('/path/to/file', 'rb')}\nres = requests.post('${url}', files=files${pyHeaders})\nprint(res.json())`;
  else python = `import requests\n\nres = requests.${method.toLowerCase()}('${url}', json=${JSON.stringify(ex)}${pyHeaders})\nprint(res.json())`;

  return { curl, javascript, python };
}

export const UPLOAD_SNIPPETS = {
  curl: `curl -X POST ${SITE.url}/upload \\\n  -F 'file=@/path/to/file'`,
  javascript: `const form = new FormData();\nform.append('file', fileInput.files[0]);\n\nconst res = await fetch('${SITE.url}/upload', {\n  method: 'POST',\n  body: form,\n});\nconst data = await res.json();\nconsole.log(data.result.url);`,
  python: `import requests\n\nfiles = {'file': open('/path/to/file', 'rb')}\nres = requests.post('${SITE.url}/upload', files=files)\nprint(res.json()['result']['url'])`
};
