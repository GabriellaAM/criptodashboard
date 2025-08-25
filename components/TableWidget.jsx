"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchAndParseData } from "./utils";

function formatCell(v) {
  if (v == null) return "";
  if (typeof v === "number") return Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function TableWidget({ config }) {
  const [liveRows, setLiveRows] = useState(Array.isArray(config?.data) ? config.data : []);
  const rows = (liveRows || []).slice(0, config?.maxRows || 500);
  const refreshMs = Math.max(0, Number(config?.refreshSeconds || 0)) * 1000;
  const url = config?.url;

  useEffect(() => {
    setLiveRows(Array.isArray(config?.data) ? config.data : []);
  }, [config?.data]);

  useEffect(() => {
    let timer;
    if (config?.sourceType === 'url' && url && refreshMs > 0) {
      const tick = async () => {
        try {
          const { rows } = await fetchAndParseData(url, config?.format);
          setLiveRows(Array.isArray(rows) ? rows : []);
        } catch (e) {
          // silencioso
        }
      };
      tick();
      timer = setInterval(tick, refreshMs);
    }
    return () => timer && clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, refreshMs, config?.sourceType, config?.format]);
  const allCols = rows.length ? Object.keys(rows[0]) : [];
  const order = (config?.columnsOrder && config.columnsOrder.length) ? config.columnsOrder : allCols;
  const hidden = new Set(config?.columnsHidden || []);
  const cols = order.filter((c) => !hidden.has(c));
  const [sort, setSort] = useState({ key: null, dir: "asc" });

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (va === vb) return 0;
      if (va === undefined) return 1;
      if (vb === undefined) return -1;
      if (typeof va === "number" && typeof vb === "number") return sort.dir === "asc" ? va - vb : vb - va;
      return sort.dir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [rows, sort]);

  if (!rows.length) return <div className="w-full h-full grid place-items-center text-sm opacity-70 p-6 text-center"><div>Cole dados CSV/JSON ou carregue via URL para exibir a tabela.<div className="mt-2">Dica: entre no modo edição e clique em <b>Editar</b> para configurar.</div></div></div>;

  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className={`${config.stickyHeader ? "sticky top-0" : ""} bg-neutral-100 dark:bg-neutral-800`}>
          <tr>
            {cols.map((c) => (
              <th key={c} className="text-left font-semibold p-2 border-b border-neutral-200 dark:border-neutral-700">
                <button
                  className="inline-flex items-center gap-1"
                  onClick={() => setSort((s) => ({ key: c, dir: s.key === c && s.dir === "asc" ? "desc" : "asc" }))}
                  title="Ordenar"
                >
                  {c}
                  {sort.key === c ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i} className="odd:bg-neutral-50/60 dark:odd:bg-neutral-900/50">
              {cols.map((c) => (
                <td key={c} className="p-2 border-b border-neutral-200/60 dark:border-neutral-800/60 align-top">
                  {formatCell(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableWidget;
