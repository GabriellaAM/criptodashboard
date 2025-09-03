"use client";

import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import { safeJsonParse, detectFormat, fetchAndParseData, parseFileToRows } from "./utils";

// safeJsonParse e detectFormat vêm de ./utils

function parseDataByFormat(raw, format) {
  const rows = [];
  const fmt = format === "auto" ? detectFormat(raw) : format;
  if (fmt === "json") {
    const parsed = safeJsonParse(raw) || [];
    if (Array.isArray(parsed)) {
      return { rows: parsed, fields: parsed.length ? Object.keys(parsed[0]) : [] };
    } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.data)) {
      const arr = parsed.data;
      return { rows: arr, fields: arr.length ? Object.keys(arr[0]) : [] };
    }
    return { rows: [], fields: [] };
  }
  if (fmt === "csv") {
    const out = Papa.parse((raw || "").trim(), { header: true, dynamicTyping: true, skipEmptyLines: true });
    return { rows: out.data || [], fields: out.meta?.fields || [] };
  }
  return { rows, fields: [] };
}

function normalizeConfig(type, cfg) {
  switch (type) {
    case "text":
      return { 
        text: cfg?.text || "", 
        size: cfg?.size || "large",
        alignment: cfg?.alignment || "left",
        color: cfg?.color || "default"
      };
    case "iframe":
      return { 
        url: cfg?.url || "", 
        allowFull: cfg?.allowFull ?? true, 
        border: cfg?.border ?? true,
        scroll: {
          horizontal: cfg?.scroll?.horizontal || "auto",
          vertical: cfg?.scroll?.vertical || "auto",
          showScrollbars: cfg?.scroll?.showScrollbars !== false,
          forceIframeScroll: cfg?.scroll?.forceIframeScroll === true
        }
      };
    case "embed":
      return { html: cfg?.html || "" };
    case "chart":
      return {
        sourceType: cfg?.sourceType || "paste",
        raw: cfg?.raw || "",
        url: cfg?.url || "",
        format: cfg?.format || "auto",
        refreshSeconds: cfg?.refreshSeconds ?? 0,
        fileName: cfg?.fileName || "",
        data: Array.isArray(cfg?.data) ? cfg.data : [],
        xField: cfg?.xField || "",
        yFields: Array.isArray(cfg?.yFields) ? cfg.yFields : [],
        chartType: cfg?.chartType || "line",
        stacked: cfg?.stacked ?? false,
        showLegend: cfg?.showLegend ?? true,
        showGrid: cfg?.showGrid ?? true,
      };
    case "table":
      return {
        sourceType: cfg?.sourceType || "paste",
        raw: cfg?.raw || "",
        url: cfg?.url || "",
        format: cfg?.format || "auto",
        refreshSeconds: cfg?.refreshSeconds ?? 0,
        fileName: cfg?.fileName || "",
        data: Array.isArray(cfg?.data) ? cfg.data : [],
        columnsOrder: Array.isArray(cfg?.columnsOrder) ? cfg.columnsOrder : (Array.isArray(cfg?.data) && cfg.data[0] ? Object.keys(cfg.data[0]) : []),
        columnsHidden: Array.isArray(cfg?.columnsHidden) ? cfg.columnsHidden : [],
        maxRows: cfg?.maxRows ?? 500,
        stickyHeader: cfg?.stickyHeader ?? true,
      };
    case "kpi":
      return {
        label: cfg?.label || "",
        value: cfg?.value || "",
        note: cfg?.note || "",
        sourceType: cfg?.sourceType || "paste", // paste | url | code
        url: cfg?.url || "",
        format: cfg?.format || "auto",
        refreshSeconds: cfg?.refreshSeconds ?? 0,
        jsonPath: cfg?.jsonPath || "", // quando JSON: path tipo data[0].price
        code: cfg?.code || "return 0;", // modo code: JS que retorna valor
      };
    default:
      return cfg || {};
  }
}

function MultiSelect({ options, values, onChange }) {
  return (
    <div className="rounded-xl border p-2 flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = values?.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            className={`px-2 py-1 rounded-lg text-xs border ${active ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : ""}`}
            onClick={() => {
              if (active) onChange(values.filter((v) => v !== opt));
              else onChange([...(values || []), opt]);
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function ChartEditorControls({ config, setConfig }) {
  const fields = React.useMemo(() => (config.data?.length ? Object.keys(config.data[0]) : []), [config.data]);

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 sm:col-span-4">
        <label className="block text-sm mb-1">Tipo de gráfico</label>
        <select
          className="w-full rounded-xl border px-3 py-2 bg-transparent"
          value={config.chartType}
          onChange={(e) => setConfig({ ...config, chartType: e.target.value })}
        >
          <option value="line">Line</option>
          <option value="area">Area</option>
          <option value="bar">Bar</option>
        </select>
      </div>
      <div className="col-span-12 sm:col-span-4">
        <label className="block text-sm mb-1">Campo X</label>
        <select
          className="w-full rounded-xl border px-3 py-2 bg-transparent"
          value={config.xField}
          onChange={(e) => setConfig({ ...config, xField: e.target.value })}
        >
          <option value="">Selecione…</option>
          {fields.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
      <div className="col-span-12 sm:col-span-4">
        <label className="block text-sm mb-1">Campos Y</label>
        <MultiSelect
          options={fields.filter((f) => f !== config.xField)}
          values={config.yFields}
          onChange={(vals) => setConfig({ ...config, yFields: vals })}
        />
      </div>

      <div className="col-span-12 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!config.stacked} onChange={(e) => setConfig({ ...config, stacked: e.target.checked })} /> Empilhar séries
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!config.showLegend} onChange={(e) => setConfig({ ...config, showLegend: e.target.checked })} /> Mostrar legenda
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!config.showGrid} onChange={(e) => setConfig({ ...config, showGrid: e.target.checked })} /> Mostrar grid
        </label>
      </div>
    </div>
  );
}

function TableEditorControls({ config, setConfig }) {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 sm:col-span-4">
        <label className="block text-sm mb-1">Máx. linhas</label>
        <input
          type="number"
          className="w-full rounded-xl border px-3 py-2 bg-transparent"
          value={config.maxRows}
          onChange={(e) => setConfig({ ...config, maxRows: Number(e.target.value) })}
          min={1}
        />
      </div>
      <div className="col-span-12 sm:col-span-4 flex items-center gap-2">
        <input id="stickyHeader" type="checkbox" checked={!!config.stickyHeader} onChange={(e) => setConfig({ ...config, stickyHeader: e.target.checked })} />
        <label htmlFor="stickyHeader" className="text-sm">Cabeçalho fixo</label>
      </div>
      <div className="col-span-12">
        <ColumnsManager config={config} setConfig={setConfig} />
      </div>
      <div className="col-span-12">
        <RowsQuickEditor config={config} setConfig={setConfig} />
      </div>
    </div>
  );
}

function TypeSpecificEditor({ type, config, setConfig }) {
  if (type === "text") {
    return (
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12">
          <label className="block text-sm mb-1">Texto</label>
          <textarea
            className="w-full rounded-xl border px-3 py-2 bg-transparent min-h-[100px]"
            placeholder="Digite seu texto ou nota..."
            value={config.text}
            onChange={(e) => setConfig({ ...config, text: e.target.value })}
          />
        </div>
        <div className="col-span-12 sm:col-span-4">
          <label className="block text-sm mb-1">Tamanho</label>
          <select
            className="w-full rounded-xl border px-3 py-2 bg-transparent"
            value={config.size}
            onChange={(e) => setConfig({ ...config, size: e.target.value })}
          >
            <option value="small">Pequeno (H3)</option>
            <option value="medium">Médio (H2)</option>
            <option value="large">Grande (H1)</option>
          </select>
        </div>
        <div className="col-span-12 sm:col-span-4">
          <label className="block text-sm mb-1">Alinhamento</label>
          <select
            className="w-full rounded-xl border px-3 py-2 bg-transparent"
            value={config.alignment}
            onChange={(e) => setConfig({ ...config, alignment: e.target.value })}
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
        </div>
        <div className="col-span-12 sm:col-span-4">
          <label className="block text-sm mb-1">Cor</label>
          <select
            className="w-full rounded-xl border px-3 py-2 bg-transparent"
            value={config.color}
            onChange={(e) => setConfig({ ...config, color: e.target.value })}
          >
            <option value="default">Padrão</option>
            <option value="primary">Azul</option>
            <option value="success">Verde</option>
            <option value="warning">Amarelo</option>
            <option value="danger">Vermelho</option>
            <option value="muted">Cinza</option>
          </select>
        </div>
      </div>
    );
  }

  if (type === "iframe") {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">URL</label>
          <input
            className="w-full rounded-xl border px-3 py-2 bg-transparent"
            placeholder="https://…"
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
          />
        </div>
        
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-6 flex items-center gap-2">
            <input id="allowFull" type="checkbox" checked={!!config.allowFull} onChange={(e) => setConfig({ ...config, allowFull: e.target.checked })} />
            <label htmlFor="allowFull" className="text-sm">Permitir tela cheia</label>
          </div>
          <div className="col-span-6 flex items-center gap-2">
            <input id="border" type="checkbox" checked={!!config.border} onChange={(e) => setConfig({ ...config, border: e.target.checked })} />
            <label htmlFor="border" className="text-sm">Mostrar borda</label>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Configurações de Scroll</h4>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 sm:col-span-6">
              <label className="block text-sm mb-1">Scroll Horizontal</label>
              <select
                className="w-full rounded-xl border px-3 py-2 bg-transparent"
                value={config.scroll?.horizontal || "auto"}
                onChange={(e) => setConfig({ 
                  ...config, 
                  scroll: { 
                    ...config.scroll, 
                    horizontal: e.target.value 
                  } 
                })}
              >
                <option value="auto">Automático</option>
                <option value="scroll">Sempre visível</option>
                <option value="hidden">Oculto</option>
              </select>
            </div>
            
            <div className="col-span-12 sm:col-span-6">
              <label className="block text-sm mb-1">Scroll Vertical</label>
              <select
                className="w-full rounded-xl border px-3 py-2 bg-transparent"
                value={config.scroll?.vertical || "auto"}
                onChange={(e) => setConfig({ 
                  ...config, 
                  scroll: { 
                    ...config.scroll, 
                    vertical: e.target.value 
                  } 
                })}
              >
                <option value="auto">Automático</option>
                <option value="scroll">Sempre visível</option>
                <option value="hidden">Oculto</option>
              </select>
            </div>
            
            <div className="col-span-12">
              <div className="flex items-center gap-2">
                <input 
                  id="showScrollbars" 
                  type="checkbox" 
                  checked={config.scroll?.showScrollbars !== false} 
                  onChange={(e) => setConfig({ 
                    ...config, 
                    scroll: { 
                      ...config.scroll, 
                      showScrollbars: e.target.checked 
                    } 
                  })} 
                />
                <label htmlFor="showScrollbars" className="text-sm">Mostrar barras de scroll</label>
              </div>
            </div>
            
            <div className="col-span-12">
              <div className="flex items-center gap-2">
                <input 
                  id="forceIframeScroll" 
                  type="checkbox" 
                  checked={config.scroll?.forceIframeScroll === true} 
                  onChange={(e) => setConfig({ 
                    ...config, 
                    scroll: { 
                      ...config.scroll, 
                      forceIframeScroll: e.target.checked 
                    } 
                  })} 
                />
                <label htmlFor="forceIframeScroll" className="text-sm">Forçar scroll no iframe (para gráficos do FRED)</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "embed") {
    return (
      <div>
        <label className="block text-sm mb-1">HTML do provedor</label>
        <textarea
          className="w-full min-h-[180px] rounded-xl border px-3 py-2 font-mono text-xs bg-transparent"
          placeholder="Cole aqui o snippet (iframe/script) fornecido pelo site"
          value={config.html}
          onChange={(e) => setConfig({ ...config, html: e.target.value })}
        />
      </div>
    );
  }

  if (type === "chart" || type === "table") {
    const isChart = type === "chart";
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-3">
            <label className="block text-sm mb-1">Fonte de dados</label>
            <select
              className="w-full rounded-xl border px-3 py-2 bg-transparent"
              value={config.sourceType}
                             onChange={(e) => {
                 const nextType = e.target.value;
                 if (nextType === "file") {
                   setConfig({ ...config, sourceType: nextType, url: "", raw: "", data: [], format: "auto", refreshSeconds: 0 });
                 } else if (nextType === "url") {
                   setConfig({ ...config, sourceType: nextType, raw: "", fileName: "", data: [], format: "auto" });
                 } else {
                   // paste
                   setConfig({ ...config, sourceType: nextType, url: "", fileName: "", data: [], format: "auto", refreshSeconds: 0 });
                 }
               }}
            >
              <option value="paste">Colar CSV/JSON</option>
              <option value="url">Carregar por URL</option>
              <option value="file">Selecionar arquivo</option>
            </select>
          </div>
          {config.sourceType === "url" && (
            <div className="col-span-12 sm:col-span-9">
              <label className="block text-sm mb-1">URL pública</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border px-3 py-2 bg-transparent"
                  placeholder="https://… (CSV, JSON ou XLSX)"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                />
                <button className="btn" onClick={async () => {
                  if (!config.url) return;
                  try {
                    const { rows, format, raw } = await fetchAndParseData(config.url, config.format);
                    setConfig({ ...config, raw: raw || '', data: rows, format });
                  } catch (e) {
                    alert("Falha ao buscar (CORS/URL): " + (e?.message || e));
                  }
                }}>Carregar</button>
              </div>
              <div className="mt-2 grid grid-cols-12 gap-3">
                <div className="col-span-6 sm:col-span-4">
                  <label className="block text-sm mb-1">Atualizar a cada (s)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-xl border px-3 py-2 bg-transparent"
                    value={config.refreshSeconds}
                    onChange={(e) => setConfig({ ...config, refreshSeconds: Math.max(0, Number(e.target.value || 0)) })}
                  />
                </div>
              </div>
            </div>
          )}
          {config.sourceType === "file" && (
            <div className="col-span-12 sm:col-span-9">
              <label className="block text-sm mb-1">Arquivo local</label>
              <div
                className="border rounded-xl p-3 flex flex-col gap-2 bg-neutral-50/40 dark:bg-neutral-900/40"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                onDrop={async (e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (!file) return;
                  try {
                    const { rows, format, raw } = await parseFileToRows(file);
                    const patch = { raw: raw || '', data: rows, format, fileName: file.name };
                    if (isChart && Array.isArray(rows) && rows.length) {
                      const inferred = inferFieldsForChart(rows);
                      patch.xField = inferred.xField;
                      patch.yFields = inferred.yFields;
                    }
                    setConfig({ ...config, ...patch });
                  } catch (err) {
                    alert('Falha ao ler arquivo: ' + (err?.message || err));
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <label className="btn cursor-pointer">
                    Selecionar arquivo
                    <input
                      key={config.fileName || 'empty'} // Força re-render quando fileName muda
                      hidden
                      type="file"
                      accept=".csv,.json,.xlsx,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const { rows, format, raw } = await parseFileToRows(file);
                          const patch = { raw: raw || '', data: rows, format, fileName: file.name };
                          if (isChart && Array.isArray(rows) && rows.length) {
                            const inferred = inferFieldsForChart(rows);
                            patch.xField = inferred.xField;
                            patch.yFields = inferred.yFields;
                          }
                          setConfig({ ...config, ...patch });
                        } catch (err) {
                          alert('Falha ao ler arquivo: ' + (err?.message || err));
                        }
                      }}
                    />
                  </label>
                  {config.fileName ? (
                    <div className="flex items-center gap-2 text-xs opacity-80">
                      <span>{config.fileName}</span>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          const isChart = type === "chart";
                          const patch = { 
                            fileName: '', 
                            raw: '', 
                            data: [], 
                            format: 'auto' 
                          };
                          // Se for gráfico, também limpar campos específicos
                          if (isChart) {
                            patch.xField = '';
                            patch.yFields = [];
                          }
                          setConfig({ ...config, ...patch });
                          
                          // Limpar o valor do input de arquivo
                          const fileInput = document.querySelector('input[type="file"]');
                          if (fileInput) {
                            fileInput.value = '';
                          }
                        }}
                      >Excluir arquivo</button>
                    </div>
                  ) : (
                    <div className="text-xs opacity-70">ou arraste e solte aqui</div>
                  )}
                </div>

                {Array.isArray(config.data) && config.data.length ? (
                  <div className="overflow-auto border rounded-lg mt-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          {Object.keys(config.data[0] || {}).slice(0, 8).map((c) => (
                            <th key={c} className="text-left p-2 border-b">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {config.data.slice(0, 5).map((r, i) => (
                          <tr key={i} className="odd:bg-neutral-50/60 dark:odd:bg-neutral-900/50">
                            {Object.keys(config.data[0] || {}).slice(0, 8).map((c) => (
                              <td key={c} className="p-2 border-b">{String(r[c] ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {config.sourceType !== "file" && (
          <div>
            <label className="block text-sm mb-1">Dados (CSV ou JSON)</label>
            <textarea
              className="w-full min-h-[160px] rounded-xl border px-3 py-2 font-mono text-xs bg-transparent"
              placeholder={isChart ? "date,valueA,valueB\n2024-01-01,10,5\n2024-01-02,12,6" : "[{\"date\":\"2024-01-01\",\"value\":10}]"}
              value={config.raw}
              onChange={(e) => setConfig({ ...config, raw: e.target.value })}
            />
            <div className="mt-2 flex items-center gap-2">
              <label className="text-sm">Formato:</label>
              <select
                className="rounded-xl border px-3 py-2 bg-transparent"
                value={config.format}
                onChange={(e) => setConfig({ ...config, format: e.target.value })}
              >
                <option value="auto">Auto</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
              <button className="btn" onClick={() => {
                const fmt = config.format === "auto" ? detectFormat(config.raw || "") : config.format;
                const parsed = parseDataByFormat(config.raw || "", fmt);
                setConfig({ ...config, data: parsed.rows, format: fmt });
              }}>Parse</button>
            </div>
          </div>
        )}

        {isChart ? (
          <ChartEditorControls config={config} setConfig={setConfig} />
        ) : (
          <TableEditorControls config={config} setConfig={setConfig} />
        )}
      </div>
    );
  }

  if (type === "kpi") {
    return (
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 sm:col-span-4">
          <label className="block text-sm mb-1">Rótulo</label>
          <input className="w-full rounded-xl border px-3 py-2 bg-transparent" value={config.label} onChange={(e) => setConfig({ ...config, label: e.target.value })} />
        </div>
        <div className="col-span-12 sm:col-span-4">
          <label className="block text-sm mb-1">Valor</label>
          <input className="w-full rounded-xl border px-3 py-2 bg-transparent" value={config.value} onChange={(e) => setConfig({ ...config, value: e.target.value })} />
        </div>
        <div className="col-span-12 sm:col-span-4">
          <label className="block text-sm mb-1">Nota (opcional)</label>
          <input className="w-full rounded-xl border px-3 py-2 bg-transparent" value={config.note} onChange={(e) => setConfig({ ...config, note: e.target.value })} />
        </div>

        <div className="col-span-12 grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-4">
            <label className="block text-sm mb-1">Fonte</label>
            <select
              className="w-full rounded-xl border px-3 py-2 bg-transparent"
              value={config.sourceType}
              onChange={(e) => {
                const nextType = e.target.value;
                if (nextType === 'url') {
                  setConfig({ ...config, sourceType: nextType, code: '', format: 'auto' });
                } else if (nextType === 'code') {
                  setConfig({ ...config, sourceType: nextType, url: '', jsonPath: '', format: 'auto', refreshSeconds: 0 });
                } else {
                  // paste (valor fixo)
                  setConfig({ ...config, sourceType: nextType, url: '', jsonPath: '', code: '', format: 'auto', refreshSeconds: 0 });
                }
              }}
            >
              <option value="paste">Valor fixo</option>
              <option value="url">URL (CSV/JSON/XLSX)</option>
              <option value="code">Código (JS)</option>
            </select>
          </div>

          {config.sourceType === 'url' && (
            <>
              <div className="col-span-12 sm:col-span-8">
                <label className="block text-sm mb-1">URL</label>
                <input className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="https://… (CSV/JSON/XLSX)" value={config.url} onChange={(e) => setConfig({ ...config, url: e.target.value })} />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm mb-1">Formato</label>
                <select className="w-full rounded-xl border px-3 py-2 bg-transparent" value={config.format} onChange={(e) => setConfig({ ...config, format: e.target.value })}>
                  <option value="auto">Auto</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm mb-1">Atualizar a cada (s)</label>
                <input type="number" min={0} className="w-full rounded-xl border px-3 py-2 bg-transparent" value={config.refreshSeconds} onChange={(e) => setConfig({ ...config, refreshSeconds: Math.max(0, Number(e.target.value || 0)) })} />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <label className="block text-sm mb-1">JSON Path (quando JSON)</label>
                <input className="w-full rounded-xl border px-3 py-2 bg-transparent" placeholder="ex.: data[0].price" value={config.jsonPath} onChange={(e) => setConfig({ ...config, jsonPath: e.target.value })} />
              </div>
            </>
          )}

          {config.sourceType === 'code' && (
            <div className="col-span-12">
              <label className="block text-sm mb-1">Código (retorne um valor; você pode usar fetch)</label>
              <textarea className="w-full min-h-[160px] rounded-xl border px-3 py-2 font-mono text-xs bg-transparent" value={config.code} onChange={(e) => setConfig({ ...config, code: e.target.value })} />
              <div className="text-xs opacity-70 mt-1">Exemplo: {`async function run(){ const r=await fetch('https://api.example.com'); const j=await r.json(); return j.value } run()`}</div>
            </div>
          )}
        </div>
      </div>
    );
  }


  return null;
}

function WidgetEditorModal({ initial, onClose, onSave }) {
  const [w, setW] = useState(() => ({ ...initial, config: normalizeConfig(initial?.type, initial?.config) }));

  useEffect(() => {
    if (!initial) return;
    setW({ ...initial, config: normalizeConfig(initial.type, initial.config) });
  }, [initial]);

  const update = (patch) => setW((p) => ({ ...p, ...patch }));

  const save = () => {
    if (!w.title?.trim()) return alert("Dê um título ao widget");
    if (w.type === "iframe" && !w.config?.url) return alert("Informe a URL do iframe");
    if (w.type === "text" && !w.config?.text?.trim()) return alert("Informe o texto da nota");

    let payload = { ...w };
         if (w.type === "chart" || w.type === "table") {
       const cfg = { ...w.config };
       if (cfg.sourceType === "file") {
         cfg.url = "";
         cfg.raw = "";
         cfg.format = "auto";
         cfg.refreshSeconds = 0;
       } else if (cfg.sourceType === "url") {
         cfg.raw = "";
         cfg.fileName = "";
         cfg.format = "auto";
       } else if (cfg.sourceType === "paste") {
         cfg.url = "";
         cfg.fileName = "";
         cfg.format = "auto";
         cfg.refreshSeconds = 0;
       }
       // Garantir que data seja limpo quando não há dados válidos
       if (!cfg.raw && !cfg.fileName && !cfg.url) {
         cfg.data = [];
       }
       payload = { ...w, config: cfg };
     }

    if (w.type === 'kpi') {
      const cfg = { ...w.config };
      if (cfg.sourceType === 'url') {
        cfg.code = '';
        cfg.format = 'auto';
      } else if (cfg.sourceType === 'code') {
        cfg.url = '';
        cfg.jsonPath = '';
        cfg.format = 'auto';
        cfg.refreshSeconds = 0;
      } else {
        // paste (valor fixo)
        cfg.url = '';
        cfg.jsonPath = '';
        cfg.code = '';
        cfg.format = 'auto';
        cfg.refreshSeconds = 0;
      }
      payload = { ...w, config: cfg };
    }

    onSave(payload);
  };

  return (
    <div className="modal modal-full" onClick={onClose}>
      <div className="modal-card w-full" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{w._isNew ? "Adicionar" : "Editar"} widget</h2>
          <div className="flex items-center gap-2 ml-auto">
            <button className="btn" onClick={onClose}>Fechar</button>
            <button className="btn btn-primary" onClick={save}>Salvar</button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-6">
            <label className="block text-sm mb-1">Título</label>
            <input
              className="w-full rounded-xl border px-3 py-2 bg-transparent"
              value={w.title}
              onChange={(e) => setW((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ex.: BTC — TradingView"
            />
          </div>
          <div className="col-span-6 sm:col-span-3">
            <label className="block text-sm mb-1">Largura (colunas)</label>
            <select
              className="w-full rounded-xl border px-3 py-2 bg-transparent"
              value={w.span}
              onChange={(e) => setW((p) => ({ ...p, span: Number(e.target.value) }))}
            >
              {[3, 4, 6, 8, 9, 12].map((n) => (
                <option key={n} value={n}>{n} / 12</option>
              ))}
            </select>
          </div>
          <div className="col-span-6 sm:col-span-3">
            <label className="block text-sm mb-1">Altura (px)</label>
            <input
              type="number"
              className="w-full rounded-xl border px-3 py-2 bg-transparent"
              value={w.height}
              onChange={(e) => setW((p) => ({ ...p, height: Number(e.target.value) }))}
              min={200}
            />
          </div>
          <div className="col-span-12 sm:col-span-6">
            <label className="block text-sm mb-1">Tipo</label>
            <select
              className="w-full rounded-xl border px-3 py-2 bg-transparent"
              value={w.type}
              onChange={(e) => setW((p) => ({ ...p, type: e.target.value, config: normalizeConfig(e.target.value, w.config) }))}
            >
              <option value="text">Texto/Nota</option>
              <option value="iframe">Iframe</option>
              <option value="embed">HTML Embed</option>
              <option value="chart">Chart (Recharts)</option>
              <option value="table">Table</option>
              <option value="kpi">KPI</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <TypeSpecificEditor type={w.type} config={w.config} setConfig={(cfg) => setW((p) => ({ ...p, config: cfg }))} />
        </div>
      </div>
    </div>
  );
}

export default WidgetEditorModal;

// Auxiliares para tabela
function getColumnsFromData(data){
  if (Array.isArray(data) && data[0]) return Object.keys(data[0]);
  return [];
}

function inferFieldsForChart(rows){
  const keys = rows[0] ? Object.keys(rows[0]) : [];
  const x = keys[0] || '';
  const ys = keys.filter((k)=>k !== x).slice(0, 5);
  return { xField: x, yFields: ys };
}

function ColumnsManager({ config, setConfig }){
  const cols = config.columnsOrder && config.columnsOrder.length ? config.columnsOrder : getColumnsFromData(config.data);
  const hidden = new Set(config.columnsHidden || []);
  const [newCol, setNewCol] = React.useState("");

  const move = (key, dir) => {
    const arr = [...cols];
    const i = arr.indexOf(key);
    if (i < 0) return;
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setConfig({ ...config, columnsOrder: arr });
  };

  const toggle = (key) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key); else next.add(key);
    setConfig({ ...config, columnsHidden: Array.from(next) });
  };

  const addColumn = () => {
    const name = (newCol || "").trim();
    if (!name) return;
    if (cols.includes(name)) return;
    const nextOrder = [...cols, name];
    const rows = Array.isArray(config.data) ? config.data : [];
    const nextRows = rows.map((r) => ({ ...r, [name]: "" }));
    setConfig({ ...config, columnsOrder: nextOrder, data: nextRows });
    setNewCol("");
  };

  if (!cols.length) return null;

  return (
    <div className="rounded-xl border p-3">
      <div className="text-sm font-medium mb-2 flex items-center gap-2">
        <span>Colunas</span>
        <div className="ml-auto flex items-center gap-2">
          <input
            className="rounded border px-2 py-1 text-xs bg-transparent"
            placeholder="Nome da coluna"
            value={newCol}
            onChange={(e)=>setNewCol(e.target.value)}
          />
          <button type="button" className="btn" onClick={addColumn}>+ Coluna</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {cols.map((c) => (
          <div key={c} className="flex items-center gap-2 border rounded-lg px-2 py-1 text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={!hidden.has(c)} onChange={() => toggle(c)} /> {c}
            </label>
            <div className="flex items-center gap-1">
              <button type="button" className="btn" onClick={() => move(c,'up')}>↑</button>
              <button type="button" className="btn" onClick={() => move(c,'down')}>↓</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RowsQuickEditor({ config, setConfig }){
  const rows = Array.isArray(config.data) ? config.data : [];
  const cols = (config.columnsOrder && config.columnsOrder.length ? config.columnsOrder : getColumnsFromData(rows)).filter((c)=>!(config.columnsHidden||[]).includes(c));
  const sample = rows.slice(0, 10);
  if (!cols.length || !sample.length) return null;

  const updateCell = (rowIdx, key, val) => {
    const next = rows.map((r, i) => i === rowIdx ? { ...r, [key]: val } : r);
    setConfig({ ...config, data: next });
  };

  const addRow = () => {
    const blank = {};
    cols.forEach((c)=>{ blank[c] = '' });
    setConfig({ ...config, data: [blank, ...rows] });
  };

  return (
    <div className="rounded-xl border p-3 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-sm font-medium">Editar primeiras linhas</div>
        <button type="button" className="btn" onClick={addRow}>+ Linha</button>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {cols.map((c)=>(<th key={c} className="text-left p-2 border-b">{c}</th>))}
            </tr>
          </thead>
          <tbody>
            {sample.map((r, ri)=>(
              <tr key={ri} className="odd:bg-neutral-50/60 dark:odd:bg-neutral-900/50">
                {cols.map((c)=>(
                  <td key={c} className="p-1 border-b">
                    <input className="w-full rounded border bg-transparent px-2 py-1" value={r[c] ?? ''} onChange={(e)=>updateCell(ri, c, e.target.value)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs opacity-70 mt-1">Edição aplicada apenas às primeiras 10 linhas como atalho rápido.</div>
    </div>
  );
}
