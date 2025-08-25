"use client";

import React, { useEffect, useState } from "react";
import { fetchAndParseData, getByPath } from "./utils";

function KPIWidget({ config }) {
  const [value, setValue] = useState(config?.value || "—");
  const refreshMs = Math.max(0, Number(config?.refreshSeconds || 0)) * 1000;
  const url = config?.url;

  useEffect(() => {
    setValue(config?.value || "—");
  }, [config?.value]);

  useEffect(() => {
    let timer;
    if (config?.sourceType === 'url' && url && refreshMs > 0) {
      const tick = async () => {
        try {
          const { rows, format, raw } = await fetchAndParseData(url, config?.format);
          if (config?.format === 'json' || format === 'json') {
            // Se fornecer jsonPath, usar sobre o objeto
            const parsed = raw ? JSON.parse(raw) : rows;
            const v = getByPath(parsed, config?.jsonPath || '') ?? '—';
            setValue(v);
          } else {
            const firstRow = Array.isArray(rows) && rows[0] ? rows[0] : null;
            if (firstRow) {
              const keys = Object.keys(firstRow);
              if (keys.length) setValue(firstRow[keys[0]] ?? "—");
            }
          }
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

  // Modo código (executa expressão JS/async que retorna o valor)
  useEffect(() => {
    let timer;
    const runCode = async () => {
      try {
        // sandbox simples
        /* eslint no-new-func: 0 */
        const fn = new Function(config?.code || 'return 0');
        const result = fn();
        const out = result && typeof result.then === 'function' ? await result : result;
        if (out !== undefined) setValue(out);
      } catch {}
    };
    if (config?.sourceType === 'code') {
      runCode();
      if (refreshMs > 0) timer = setInterval(runCode, refreshMs);
    }
    return () => timer && clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.sourceType, config?.code, refreshMs]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-sm uppercase tracking-wide opacity-70">{config.label || "Indicador"}</div>
        <div className="text-4xl font-bold mt-1">{value}</div>
        {config.note ? <div className="text-xs opacity-70 mt-1">{config.note}</div> : null}
      </div>
    </div>
  );
}

export default KPIWidget;
