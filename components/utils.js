export function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

export function detectFormat(text) {
  const t = (text || "").trim();
  if (!t) return "empty";
  if (t.startsWith("[") || t.startsWith("{")) return "json";
  return "csv";
}

export function getByPath(obj, path) {
  if (!path) return undefined;
  const parts = String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    const m = p.match(/^(\w+)(\[(\d+)\])?$/);
    if (m) {
      const key = m[1];
      cur = cur[key];
      if (m[3] != null) {
        const idx = Number(m[3]);
        if (!Array.isArray(cur)) return undefined;
        cur = cur[idx];
      }
    } else {
      cur = cur[p];
    }
  }
  return cur;
}

// Helpers para Google Sheets
export function normalizeSheetsUrl(url) {
  // Aceita URL padrão de planilha e tenta converter para export CSV
  try {
    const u = new URL(url);
    if (u.hostname.includes('docs.google.com') && u.pathname.includes('/spreadsheets/')) {
      // Se contiver /export?format=csv mantém; caso contrário, tenta converter
      if (!u.pathname.endsWith('/export')) {
        // Converte /edit ... para /export
        u.pathname = u.pathname.replace(/\/edit.*$/, '/export');
      }
      if (!u.searchParams.get('format')) u.searchParams.set('format', 'csv');
      return u.toString();
    }
  } catch {}
  return url;
}

// Parse de XLSX
export async function parseXlsxToRows(arrayBuffer) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(ws, { defval: null });
  return Array.isArray(json) ? json : [];
}

export async function fetchAndParseData(url, preferredFormat = 'auto') {
  const normalizedUrl = normalizeSheetsUrl(url);
  const res = await fetch(normalizedUrl, { cache: 'no-store' });
  const contentType = res.headers.get('content-type') || '';
  const isXlsx = /application\/(vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|vnd\.ms-excel)/i.test(contentType) || /\.xlsx($|\?)/i.test(normalizedUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (isXlsx) {
    const buf = await res.arrayBuffer();
    const rows = await parseXlsxToRows(buf);
    return { rows, format: 'xlsx', raw: null };
  }
  const txt = await res.text();
  const fmt = preferredFormat === 'auto' ? detectFormat(txt) : preferredFormat;
  if (fmt === 'json') {
    const parsed = safeJsonParse(txt) || [];
    const rows = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.data) ? parsed.data : []);
    return { rows, format: 'json', raw: txt };
  }
  // CSV
  const Papa = (await import('papaparse')).default;
  const out = Papa.parse((txt || '').trim(), { header: true, dynamicTyping: true, skipEmptyLines: true });
  return { rows: out.data || [], format: 'csv', raw: txt };
}

export async function parseFileToRows(file) {
  const lower = (file?.name || '').toLowerCase();
  if (!file) return { rows: [], format: 'empty', raw: '' };
  if (lower.endsWith('.xlsx')) {
    const buf = await file.arrayBuffer();
    const rows = await parseXlsxToRows(buf);
    return { rows, format: 'xlsx', raw: null };
  }
  const txt = await file.text();
  if (lower.endsWith('.json')) {
    const parsed = safeJsonParse(txt) || [];
    const rows = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.data) ? parsed.data : []);
    return { rows, format: 'json', raw: txt };
  }
  // default: csv
  const Papa = (await import('papaparse')).default;
  const out = Papa.parse((txt || '').trim(), { header: true, dynamicTyping: true, skipEmptyLines: true });
  return { rows: out.data || [], format: 'csv', raw: txt };
}


