import { SITE, APIKEY_STORAGE } from "./site";
import { storage } from "./storage";

/** Contoh kode curl / JavaScript / Python untuk satu endpoint (mendukung input user real-time & API Key wajib). */
export function buildSnippets(ep, userValues, userFiles, userMethod, userApiKey) {
  const method = userMethod || (ep.method && ep.method[0]) || "GET";
  const params = ep.params || {};
  const keys = Object.keys(params);
  const fileKey = keys.find((k) => params[k].type === "file") || (userFiles && Object.keys(userFiles)[0]);
  const dataKeys = keys.filter((k) => params[k].type !== "file");
  
  const baseUrl = (typeof window !== "undefined" && window.location.origin) ? window.location.origin : (SITE.url || "https://kadokunn.com");
  const url = baseUrl + ep.endpoint;

  const currentValues = userValues || {};
  const ex = {};
  dataKeys.forEach((k) => {
    const val = currentValues[k] !== undefined ? currentValues[k] : params[k]?.example;
    ex[k] = val !== undefined && val !== null ? val : "";
  });

  const queryPairs = [];
  dataKeys.forEach((k) => {
    const v = ex[k];
    if (v !== "" && v !== undefined) {
      queryPairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  });
  const qs = queryPairs.length ? "?" + queryPairs.join("&") : "";

  // API Key wajib disertakan di semua endpoint
  const apiKey = (userApiKey && userApiKey.trim()) || (typeof window !== "undefined" ? storage.get(APIKEY_STORAGE) : "") || "KEY_KAMU";
  const keyHeader = ` \\\n  -H 'x-api-key: ${apiKey}'`;

  let curl;
  if (method === "GET") {
    curl = `curl '${url}${qs}'${keyHeader}`;
  } else if (fileKey) {
    const fileName = (userFiles && userFiles[fileKey]?.name) ? userFiles[fileKey].name : "photo.jpg";
    curl = `curl -X ${method} '${url}' \\\n  -F '${fileKey}=@${fileName}'${keyHeader}`;
  } else {
    curl = `curl -X ${method} '${url}'${keyHeader} \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(ex)}'`;
  }

  let javascript;
  if (method === "GET") {
    javascript = `const res = await fetch('${url}${qs}', {\n  headers: { 'x-api-key': '${apiKey}' },\n});\nconst data = await res.json();\nconsole.log(data);`;
  } else if (fileKey) {
    javascript = `const form = new FormData();\nform.append('${fileKey}', fileInput.files[0]);\n\nconst res = await fetch('${url}', {\n  method: '${method}',\n  headers: { 'x-api-key': '${apiKey}' },\n  body: form,\n});\nconst data = await res.json();\nconsole.log(data);`;
  } else {
    javascript = `const res = await fetch('${url}', {\n  method: '${method}',\n  headers: {\n    'Content-Type': 'application/json',\n    'x-api-key': '${apiKey}',\n  },\n  body: JSON.stringify(${JSON.stringify(ex, null, 2)}),\n});\nconst data = await res.json();\nconsole.log(data);`;
  }

  const pyHeaders = `, headers={'x-api-key': '${apiKey}'}`;
  let python;
  if (method === "GET") {
    python = `import requests\n\nres = requests.get('${url}', params=${dataKeys.length ? JSON.stringify(ex) : "{}"}${pyHeaders})\nprint(res.json())`;
  } else if (fileKey) {
    python = `import requests\n\nfiles = {'${fileKey}': open('photo.jpg', 'rb')}\nres = requests.post('${url}', files=files${pyHeaders})\nprint(res.json())`;
  } else {
    python = `import requests\n\nres = requests.${method.toLowerCase()}('${url}', json=${JSON.stringify(ex)}${pyHeaders})\nprint(res.json())`;
  }

  return { curl, javascript, python };
}

export const UPLOAD_SNIPPETS = {
  curl: `curl -X POST ${SITE.url}/upload \\\n  -F 'file=@/path/to/file'`,
  javascript: `const form = new FormData();\nform.append('file', fileInput.files[0]);\n\nconst res = await fetch('${SITE.url}/upload', {\n  method: 'POST',\n  body: form,\n});\nconst data = await res.json();\nconsole.log(data.result.url);`,
  python: `import requests\n\nfiles = {'file': open('/path/to/file', 'rb')}\nres = requests.post('${SITE.url}/upload', files=files)\nprint(res.json()['result']['url'])`
};
