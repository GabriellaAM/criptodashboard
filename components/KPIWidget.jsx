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
    <div className="w-full h-full flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-4 right-4 w-16 h-16 border border-current rounded-full" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border border-current rounded-full" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 border border-current rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      </div>
      
      <div className="text-center space-y-4 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 letter-spacing-wide">
            {config.label || "Indicador"}
          </div>
          <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse animation-delay-500" />
        </div>
        
        <div className="relative">
          <div className="text-6xl font-black bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-600 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400 bg-clip-text text-transparent tabular-nums leading-none">
            {value}
          </div>
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 rounded-2xl blur-xl -z-10 opacity-50" />
        </div>
        
        {config.note && (
          <div className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed font-medium">
            {config.note}
          </div>
        )}
      </div>
    </div>
  );
}

export default KPIWidget;
