"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Papa from "papaparse";
import WidgetCard from "./WidgetCard";
import WidgetEditorModal from "./WidgetEditorModal";
import { safeJsonParse } from "./utils";
import { saveDashboards, loadDashboards, subscribeToChanges, getLastUpdateInfo, getDashboard, getDashboardBySlug, saveDashboardData, listOwnedDashboards, listMemberDashboards } from "../lib/dashboard-persistence";
import UserMenu from "./UserMenu";
import ShareModal from "./ShareModal";

const LS_KEY = "econ-crypto-dashboard-v1";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

const defaultDash = (name = "Main") => ({ id: uid(), name, widgets: [] });

// safeJsonParse vem de ./utils

function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function chartConfigFromCSV(raw, opts = {}) {
  const out = Papa.parse((raw || "").trim(), { header: true, dynamicTyping: true, skipEmptyLines: true });
  const rows = out.data || [];
  const fields = out.meta?.fields || [];
  return {
    sourceType: "paste",
    raw,
    url: "",
    format: "csv",
    data: rows,
    xField: opts.xField || fields[0] || "",
    yFields: opts.yFields || fields.slice(1),
    chartType: opts.chartType || "line",
    stacked: !!opts.stacked,
    showLegend: true,
    showGrid: true,
  };
}

function tableConfigFromCSV(raw, opts = {}) {
  const out = Papa.parse((raw || "").trim(), { header: true, dynamicTyping: true, skipEmptyLines: true });
  const rows = out.data || [];
  return {
    sourceType: "paste",
    raw,
    url: "",
    format: "csv",
    data: rows,
    maxRows: opts.maxRows ?? 500,
    stickyHeader: opts.stickyHeader ?? true,
  };
}

function createPresetDashboards() {
  const tvBTC = "https://s.tradingview.com/widgetembed/?symbol=BINANCE%3ABTCUSDT&interval=60&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&theme=light&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1";
  const tvDXY = "https://s.tradingview.com/widgetembed/?symbol=TVC%3ADXY&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&theme=light&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1";

  const cryptoCSV = `date,btc,eth\n2025-08-01,62000,3200\n2025-08-02,62500,3220\n2025-08-03,61800,3185\n2025-08-04,63000,3250\n2025-08-05,64000,3305`;
  const macroCSV = `date,cpi_yoy,unemployment_rate\n2025-03,3.5,3.9\n2025-04,3.4,3.9\n2025-05,3.3,4.0\n2025-06,3.2,4.0\n2025-07,3.1,4.0`;
  const tableCSV = `rank,name,symbol,price,mcap_usd\n1,Bitcoin,BTC,64000,1260000000000\n2,Ethereum,ETH,3300,396000000000\n3,BNB,BNB,600,92000000000\n4,Solana,SOL,140,65000000000\n5,USDT,USDT,1,118000000000`;

  const dashCripto = {
    id: uid(),
    name: "Cripto",
    widgets: [
      { id: uid(), type: "iframe", title: "BTC/USDT — Grande", width: 500, height: 400, config: { url: tvBTC, allowFull: true, border: true } },
      { id: uid(), type: "iframe", title: "DXY — Pequeno", width: 250, height: 200, config: { url: tvDXY, allowFull: true, border: true } },
      { id: uid(), type: "chart", title: "Gráfico — Médio", width: 350, height: 250, config: chartConfigFromCSV(cryptoCSV) },
      { id: uid(), type: "table", title: "Tabela — Largo", width: 600, height: 180, config: tableConfigFromCSV(tableCSV) },
    ],
  };

  const dashMacro = {
    id: uid(),
    name: "Macro",
    widgets: [
      { id: uid(), type: "chart", title: "Inflação (YoY) x Desemprego (amostra)", width: 500, height: 350, config: chartConfigFromCSV(macroCSV) },
    ],
  };

  return [defaultDash(), dashCripto, dashMacro];
}

export default function DashboardBuilderApp() {
  const initialDashRef = useRef(null);
  if (!initialDashRef.current) initialDashRef.current = [];
  const [dashboards, setDashboards] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [editMode, setEditMode] = useState(true);
  const [dark, setDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWidget, setEditingWidget] = useState(null);
  const [renameState, setRenameState] = useState({ open: false, id: null, name: "" });
  const [deleteState, setDeleteState] = useState({ open: false, id: null });
  const [titleEditState, setTitleEditState] = useState({ open: false, id: null, text: "", size: "medium" });
  const [draggingId, setDraggingId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [lastUpdateInfo, setLastUpdateInfo] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const lastUpdateAtRef = useRef(null);
  const activeIdRef = useRef(activeId);
  const initializedRef = useRef(false);
  const [currentDashMeta, setCurrentDashMeta] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [canAddWidgets, setCanAddWidgets] = useState(false);
  
  // Container ref para cálculos de posição
  const containerRef = useRef(null);

  const dashboardsEqual = (a, b) => {
    try {
      if (a === b) return true;
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i]?.id !== b[i]?.id) return false;
        const aw = a[i]?.widgets || [];
        const bw = b[i]?.widgets || [];
        if (aw.length !== bw.length) return false;
      }
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // On mount, load persisted settings (dashboards, theme, help visibility)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadFromSupabase = async () => {
      try {
        // Tentar carregar usando a nova estrutura (múltiplos dashboards)
        const [owned, shared] = await Promise.all([
          listOwnedDashboards(),
          listMemberDashboards()
        ]);
        
        // Se tiver dashboards na nova estrutura, criar dashboards locais baseados no primeiro owned
        if (owned && owned.length > 0) {
          const firstDashboard = owned[0];
          const dashboardData = await getDashboard(firstDashboard.id);
          
          if (dashboardData && Array.isArray(dashboardData.data)) {
            setDashboards(dashboardData.data);
            setActiveId(dashboardData.data[0]?.id || null);
            setCurrentDashMeta({ 
              id: dashboardData.id, 
              name: dashboardData.name, 
              is_public: dashboardData.is_public, 
              public_slug: dashboardData.public_slug 
            });
            lastUpdateAtRef.current = dashboardData.updated_at || null;
            console.log('Dashboard carregado da nova estrutura do Supabase');
            initializedRef.current = true;
            setIsBooting(false);
            return;
          }
        }

        // Fallback para estrutura antiga
        const data = await loadDashboards()
        if (data && Array.isArray(data) && data.length > 0) {
          setDashboards(data)
          setActiveId((prev) => (data.some((d) => d.id === prev) ? prev : (data[0]?.id || null)))
          console.log('Dashboards carregados do Supabase (estrutura legacy)')

          const updateInfo = await getLastUpdateInfo()
          setLastUpdateInfo(updateInfo)
          lastUpdateAtRef.current = updateInfo?.updated_at || null
        } else {
          // Se não há dashboards no servidor, tentar localStorage
          const fromLS = safeJsonParse(localStorage.getItem(LS_KEY));
          if (Array.isArray(fromLS) && fromLS.length) {
            setDashboards(fromLS);
            setActiveId(fromLS[0]?.id || null);
            console.log('Dashboards carregados do localStorage');
          } else {
            // Se não tem nada, criar dashboards padrão
            const presetDashboards = createPresetDashboards();
            setDashboards(presetDashboards);
            setActiveId(presetDashboards[0]?.id || null);
            console.log('Dashboards padrão criados');
          }
        }
        initializedRef.current = true;
        setIsBooting(false);
      } catch (error) {
        console.error('Erro ao carregar do Supabase:', error)
        const fromLS = safeJsonParse(localStorage.getItem(LS_KEY));
        if (Array.isArray(fromLS) && fromLS.length) {
          setDashboards(fromLS);
          setActiveId(fromLS[0]?.id || null);
        } else {
          const presetDashboards = createPresetDashboards();
          setDashboards(presetDashboards);
          setActiveId(presetDashboards[0]?.id || null);
        }
        setIsBooting(false);
      }
    }

    const url = new URL(window.location.href);
    const byId = url.searchParams.get('d');
    const bySlug = url.searchParams.get('p');
    if (byId || bySlug) {
      (async () => {
        try {
          const remote = bySlug ? await getDashboardBySlug(bySlug) : await getDashboard(byId);
          if (remote && Array.isArray(remote.data)) {
            setDashboards(remote.data);
            setActiveId(remote.data[0]?.id || null);
            setCurrentDashMeta({ id: remote.id, name: remote.name, is_public: remote.is_public, public_slug: remote.public_slug });
            lastUpdateAtRef.current = remote.updated_at || null;
            initializedRef.current = true;
            setIsBooting(false);
          } else {
            await loadFromSupabase();
          }
        } catch (e) {
          await loadFromSupabase();
        }
      })();
    } else {
      loadFromSupabase();
    }

    const subscription = currentDashMeta?.id ? null : subscribeToChanges((newDashboards) => {
      if (newDashboards && Array.isArray(newDashboards)) {
        setDashboards((prev) => (dashboardsEqual(prev, newDashboards) ? prev : newDashboards));
        const current = activeIdRef.current;
        if (!newDashboards.some((d) => d.id === (current ?? activeId))) {
          setActiveId(newDashboards[0]?.id || null);
        }
        console.log('Dashboard atualizado via realtime (compartilhado)')
        const nowIso = new Date().toISOString();
        lastUpdateAtRef.current = nowIso;
        setLastUpdateInfo({ updated_at: nowIso });
        setSaveStatus("Atualizado por outro usuário!")
        setTimeout(() => setSaveStatus(""), 3000)
      }
    })

    try {
      setShowHelp(localStorage.getItem('dash-show-help') !== '0');
    } catch { }

    return () => {
      subscription?.unsubscribe?.()
    }
  }, []);

  // Polling de atualização (fallback quando Realtime não estiver habilitado)
  useEffect(() => {
    if (currentDashMeta?.id) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const info = await getLastUpdateInfo();
        if (cancelled) return;
        if (info?.updated_at && info.updated_at !== lastUpdateAtRef.current && initializedRef.current) {
          const data = await loadDashboards();
          if (cancelled) return;
          if (data && Array.isArray(data)) {
            setDashboards((prev) => (dashboardsEqual(prev, data) ? prev : data));
            const current = activeIdRef.current;
            if (!data.some((d) => d.id === (current ?? activeId))) {
              setActiveId(data[0]?.id || null);
            }
            setSaveStatus("Atualizado do servidor");
            setTimeout(() => setSaveStatus(""), 2000);
          }
          lastUpdateAtRef.current = info.updated_at;
          setLastUpdateInfo(info);
        }
      } catch { }
    }, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_KEY, JSON.stringify(dashboards));

      if (dashboards.length > 0) {
        if (currentDashMeta?.id) {
          saveDashboardData(currentDashMeta.id, dashboards).then(({ error }) => {
            if (error) {
              console.log('Erro ao salvar no Supabase (dashboard), usando localStorage')
              setIsOnline(false)
            } else {
              setIsOnline(true)
              const nowIso = new Date().toISOString();
              lastUpdateAtRef.current = nowIso;
              setLastUpdateInfo({ updated_at: nowIso });
              setSaveStatus("Sincronizado!")
              setTimeout(() => setSaveStatus(""), 2000)
            }
          })
        } else {
          saveDashboards(dashboards).then(({ error }) => {
            if (error) {
              console.log('Erro ao salvar no Supabase, usando localStorage')
              setIsOnline(false)
            } else {
              console.log('Salvo no Supabase com sucesso')
              setIsOnline(true)
              const nowIso = new Date().toISOString();
              lastUpdateAtRef.current = nowIso;
              setLastUpdateInfo({ updated_at: nowIso });
              setSaveStatus("Sincronizado!")
              setTimeout(() => setSaveStatus(""), 2000)
            }
          })
        }
      }
    }
  }, [dashboards]);

  useEffect(() => {
    setCanAddWidgets(Array.isArray(dashboards) && dashboards.length > 0);
  }, [dashboards]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem("dash-dark-mode", dark ? "1" : "0");
      } catch { }
      const root = document.documentElement;
      if (dark) root.classList.add("dark");
      else root.classList.remove("dark");
    }
  }, [dark]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const anyModalOpen = showAddModal || renameState.open || deleteState.open;
    const body = document.body;
    if (anyModalOpen) body.classList.add('no-scroll');
    else body.classList.remove('no-scroll');
    return () => body.classList.remove('no-scroll');
  }, [showAddModal, renameState.open, deleteState.open]);

  const activeDash = Array.isArray(dashboards) && dashboards.length
    ? (dashboards.find((d) => d && d.id === activeId) || dashboards[0])
    : null;

  useEffect(() => {
    if (!activeId && Array.isArray(dashboards) && dashboards.length) {
      setActiveId(dashboards[0]?.id || null);
    }
  }, [dashboards, activeId]);

  const addDashboard = () => {
    const base = "Dashboard";
    const existing = new Set(dashboards.map((d) => d.name));
    let i = dashboards.length + 1;
    let name = `${base} ${i}`;
    while (existing.has(name)) {
      i += 1;
      name = `${base} ${i}`;
    }
    const d = { id: uid(), name, widgets: [] };
    setDashboards((prev) => [...prev, d]);
    setActiveId(d.id);
    setCanAddWidgets(true);
  };

  const openRename = (id) => {
    const d = dashboards.find((x) => x.id === id);
    if (!d) return;
    setRenameState({ open: true, id, name: d.name });
  };

  const applyRename = () => {
    const { id, name } = renameState;
    if (!id) return setRenameState({ open: false, id: null, name: "" });
    const newName = (name || "").trim();
    if (!newName) return;
    setDashboards((prev) => prev.map((d) => (d.id === id ? { ...d, name: newName } : d)));
    setRenameState({ open: false, id: null, name: "" });
  };

  const openDelete = (id) => setDeleteState({ open: true, id });

  const applyDelete = () => {
    const { id } = deleteState;
    if (!id) return setDeleteState({ open: false, id: null });
    setDashboards((prev) => {
      const filtered = prev.filter((d) => d.id !== id);
      const nextActive = (filtered.find((x) => x.id === activeId) ? activeId : (filtered[0]?.id || null));
      setActiveId(nextActive);
      return filtered;
    });
    setDeleteState({ open: false, id: null });
  };

  const setWidgets = (widgets) => {
    if (!activeDash?.id) {
      console.error('❌ setWidgets: activeDash.id é nulo');
      return;
    }
    
    console.log('📝 setWidgets: atualizando', widgets.length, 'widgets no dashboard', activeDash.id);
    
    setDashboards((prev) => {
      const newDashboards = prev.map((d) => (d.id === activeDash.id ? { ...d, widgets } : d));
      console.log('📝 setWidgets: dashboards atualizados');
      return newDashboards;
    });
  };

  const openAddModal = () => {
    setEditingWidget({
      id: uid(),
      type: "text", // Widget de texto
      title: "Nova nota",
      width: 600, 
      height: 200,
      config: { text: "Sua nota aqui...", size: "medium", alignment: "left", color: "default" },
      _isNew: true,
    });
    setShowAddModal(true);
  };

  const addTitle = () => {
    if (!activeDash) return;
    
    const titleWidget = {
      id: uid(),
      type: "section-title", // Novo tipo específico para títulos estilo Notion
      title: "Título da seção",
      text: "Nova seção",
      size: "large", // large, medium, small
      isTitle: true // Flag para identificar que é um título especial
    };
    
    setWidgets([...(activeDash.widgets || []), titleWidget]);
  };

  const editSectionTitle = (id) => {
    const widget = (activeDash.widgets || []).find(w => w.id === id);
    if (!widget) return;
    
    setTitleEditState({
      open: true,
      id: id,
      text: widget.text || "",
      size: widget.size || "medium"
    });
  };

  const saveTitleEdit = () => {
    const { id, text, size } = titleEditState;
    if (!id) return;
    
    setWidgets((activeDash.widgets || []).map(w => 
      w.id === id ? { ...w, text: text.trim() || "Título vazio", size } : w
    ));
    
    setTitleEditState({ open: false, id: null, text: "", size: "medium" });
  };

  const saveWidget = (w) => {
    console.log('💾 saveWidget chamado:', { id: w.id, title: w.title, type: w.type, _isNew: w._isNew });
    console.log('💾 saveWidget config recebido:', w.config);
    console.log('💾 saveWidget config.images:', w.config?.images?.length || 0);
    
    if (w._isNew) {
      const nw = { ...w };
      delete nw._isNew;
      console.log('➕ Adicionando novo widget:', nw.id, 'tipo:', nw.type);
      console.log('➕ Novo widget config:', nw.config);
      console.log('➕ Novo widget config.images:', nw.config?.images?.length || 0);
      setWidgets([...(activeDash.widgets || []), nw]);
    } else {
      console.log('✏️ Editando widget existente:', w.id);
      setWidgets((activeDash.widgets || []).map((x) => (x.id === w.id ? w : x)));
    }
    setShowAddModal(false);
    setEditingWidget(null);
  };

  const editWidget = (id) => {
    const w = (activeDash.widgets || []).find((x) => x.id === id);
    if (w) {
      setEditingWidget({ ...w });
      setShowAddModal(true);
    }
  };

  const duplicateWidget = (id) => {
    if (!activeDash) return; // Proteção contra activeDash nulo
    const w = (activeDash.widgets || []).find((x) => x.id === id);
    if (!w) return;
    
    const copy = { 
      ...w, 
      id: uid(), 
      title: w.title + " (cópia)"
    };
    setWidgets([...(activeDash.widgets || []), copy]);
  };

  const deleteWidget = (id) => {
    if (!activeDash) {
      console.error('❌ deleteWidget: activeDash é nulo');
      return;
    }
    
    console.log('🗑️ Deletando widget ID:', id);
    console.log('🗑️ Widgets antes:', activeDash.widgets?.map(w => ({ id: w.id, title: w.title, type: w.type })));
    
    const widgetsBefore = activeDash.widgets || [];
    const widgetToDelete = widgetsBefore.find(w => w.id === id);
    const widgetsAfter = widgetsBefore.filter((x) => x.id !== id);
    
    console.log('🗑️ Widget sendo deletado:', widgetToDelete);
    console.log('🗑️ Widgets restantes:', widgetsAfter.map(w => ({ id: w.id, title: w.title, type: w.type })));
    
    setWidgets(widgetsAfter);
    
    if (editingWidget && editingWidget.id === id) {
      setShowAddModal(false);
      setEditingWidget(null);
    }
  };

  const moveWidget = (id, direction) => {
    if (!activeDash) return; // Proteção contra activeDash nulo
    const widgets = [...(activeDash.widgets || [])];
    const currentIndex = widgets.findIndex((x) => x.id === id);
    if (currentIndex < 0) return;
    
    let newIndex = currentIndex;
    
    switch(direction) {
      case 'up':
      case 'left': 
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'down':
      case 'right': 
        newIndex = Math.min(widgets.length - 1, currentIndex + 1);
        break;
    }
    
    if (newIndex === currentIndex) return;
    
    // Trocar posições
    [widgets[currentIndex], widgets[newIndex]] = [widgets[newIndex], widgets[currentIndex]];
    
    setWidgets(widgets);
    console.log(`➡️ Widget ${id} movido ${direction} (posição ${currentIndex} → ${newIndex})`);
  };

  // Função de resize MELHORADA - aplicar mudanças imediatamente
  const resizeWidget = (id, updates) => {
    console.log('🎯 DashboardApp recebeu resize:', id, updates);
    
    setDashboards((prevDashboards) => {
      return prevDashboards.map((dashboard) => {
        if (dashboard.id === activeDash?.id) {
          return {
            ...dashboard,
            widgets: dashboard.widgets.map((widget) => {
              if (widget.id === id) {
                const updatedWidget = { ...widget, ...updates };
                console.log('✅ Widget atualizado:', updatedWidget);
                return updatedWidget;
              }
              return widget;
            })
          };
        }
        return dashboard;
      });
    });
  };

  const exportJSON = () => {
    try {
      const payload = JSON.stringify(dashboards, null, 2);
      download("dashboards.json", payload);
    } catch (e) {
      const payload = JSON.stringify(dashboards);
      const url = "data:application/json;charset=utf-8," + encodeURIComponent(payload);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dashboards.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const importJSON = async (file) => {
    const text = await file.text();
    const data = safeJsonParse(text);
    if (!Array.isArray(data)) {
      alert("Arquivo inválido: esperado um array de dashboards");
      return;
    }
    setDashboards(data);
    setActiveId(data[0]?.id || null);
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      {isBooting ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-sm opacity-70">Carregando…</div>
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-10 border-b bg-neutral-50/80 dark:bg-neutral-900/80 backdrop-blur border-neutral-200 dark:border-neutral-800">
            <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold">Crypto & Macro Dashboard</h1>
              <span className="opacity-60 text-sm">— construa o seu workspace de gráficos</span>
              {saveStatus && (
                <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                  {saveStatus}
                </span>
              )}
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="opacity-60">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <a href="/dashboards" className="btn">Dashboards</a>
                {currentDashMeta?.id && (
                  <button className="btn" onClick={() => setShareOpen(true)}>Compartilhar</button>
                )}
                <UserMenu />
                <button className="btn" onClick={() => setDark((v) => !v)} title="Alternar tema">
                  {dark ? "🌙" : "☀️"}
                </button>
                <button className={`btn ${editMode ? "btn-primary" : ""}`} onClick={() => setEditMode((v) => !v)} title={editMode ? "Modo edição ON" : "Editar"}>
                  ✏️
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 pt-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {(dashboards || []).map((d) => (
                <button
                  key={d.id}
                  className={`btn ${d.id === activeId ? "btn-primary" : ""}`}
                  onClick={() => setActiveId(d.id)}
                >
                  {d.name}
                </button>
              ))}
              <button className="btn" onClick={addDashboard}>➕ Nova página</button>
              <div className="ml-auto flex items-center gap-2">
                {activeDash && (
                  <>
                    <button className="btn" onClick={() => openRename(activeDash.id)}>Renomear</button>
                    <button className="btn" onClick={() => openDelete(activeDash.id)}>Excluir</button>
                  </>
                )}
                <button className="btn" onClick={exportJSON}>Exportar</button>
                <label className="btn cursor-pointer">
                  Importar
                  <input hidden type="file" accept="application/json" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importJSON(file);
                  }} />
                </label>
              </div>
            </div>

            {editMode && (currentDashMeta?.id || canAddWidgets) && dashboards.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <button className="btn btn-primary" onClick={openAddModal}>➕ Adicionar widget</button>
                <button className="btn" onClick={addTitle}>📋 Adicionar título</button>
              </div>
            )}

            {Array.isArray(dashboards) && dashboards.length === 0 && (
              <div className="my-10 text-center opacity-70 text-sm">
                Nenhuma página ainda — use "Nova página" acima para começar.
              </div>
            )}

            {/* CONTAINER EM GRID CUSTOMIZÁVEL */}
            <div 
              ref={containerRef}
              className="widgets-container pb-8"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)', // 12 colunas base como antes
                gap: '16px',
                width: '100%',
                alignItems: 'start'
              }}
            >
              {(activeDash?.widgets || []).map((w) => {
                // Renderizar títulos de seção de forma especial (sem card)
                if (w.type === "section-title") {
                  return (
                    <SectionTitle
                      key={w.id}
                      widget={w}
                      editMode={editMode}
                      onEdit={() => editSectionTitle(w.id)}
                      onDelete={() => deleteWidget(w.id)}
                      onMoveUp={() => moveWidget(w.id, "up")}
                      onMoveDown={() => moveWidget(w.id, "down")}
                    />
                  );
                }
                
                // Renderizar widgets normais com card
                return (
                  <WidgetCard
                    key={w.id}
                    w={w}
                    editMode={editMode}
                    onEdit={() => editWidget(w.id)}
                    onDup={() => duplicateWidget(w.id)}
                    onDel={() => deleteWidget(w.id)}
                    onMoveUp={() => moveWidget(w.id, "up")}
                    onMoveDown={() => moveWidget(w.id, "down")}
                    onResize={resizeWidget}
                  />
                );
              })}
              
              {/* Mensagem quando não há widgets */}
              {(activeDash?.widgets || []).length === 0 && (
                <div 
                  className="col-span-full flex items-center justify-center min-h-[60vh] opacity-50"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-4">📊</div>
                    <div className="text-lg mb-2">Nenhum widget ainda</div>
                    {editMode && <div className="text-sm opacity-75">Use "Adicionar widget" para começar</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {showAddModal && (
        <WidgetEditorModal
          initial={editingWidget}
          onClose={() => { setShowAddModal(false); setEditingWidget(null); }}
          onSave={saveWidget}
        />
      )}

      {renameState.open && (
        <div className="modal" onClick={() => setRenameState({ open: false, id: null, name: "" })}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Renomear dashboard</div>
            <input
              className="w-full rounded-xl border px-3 py-2 bg-transparent"
              value={renameState.name}
              onChange={(e) => setRenameState((s) => ({ ...s, name: e.target.value }))}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn" onClick={() => setRenameState({ open: false, id: null, name: "" })}>Cancelar</button>
              <button className="btn btn-primary" onClick={applyRename}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {deleteState.open && (
        <div className="modal" onClick={() => setDeleteState({ open: false, id: null })}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Excluir dashboard</div>
            <div className="opacity-80 text-sm">Tem certeza que deseja excluir este dashboard? Esta ação não pode ser desfeita.</div>
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn" onClick={() => setDeleteState({ open: false, id: null })}>Cancelar</button>
              <button className="btn btn-primary" onClick={applyDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {titleEditState.open && (
        <div className="modal" onClick={() => setTitleEditState({ open: false, id: null, text: "", size: "medium" })}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-4">Editar título</div>
            
            <div className="mb-3">
              <label className="block text-sm mb-1">Texto do título</label>
              <input
                className="w-full rounded-xl border px-3 py-2 bg-transparent"
                placeholder="Digite o texto do título..."
                value={titleEditState.text}
                onChange={(e) => setTitleEditState(prev => ({ ...prev, text: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-1">Tamanho</label>
              <select
                className="w-full rounded-xl border px-3 py-2 bg-transparent"
                value={titleEditState.size}
                onChange={(e) => setTitleEditState(prev => ({ ...prev, size: e.target.value }))}
              >
                <option value="small">Pequeno</option>
                <option value="medium">Médio</option>
                <option value="large">Grande</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setTitleEditState({ open: false, id: null, text: "", size: "medium" })}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={saveTitleEdit}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {!isBooting && shareOpen && currentDashMeta?.id && (
        <ShareModal
          dashboardId={currentDashMeta.id}
          isPublic={currentDashMeta.is_public}
          publicSlug={currentDashMeta.public_slug}
          onClose={() => setShareOpen(false)}
          onChanged={async () => {
            const meta = await getDashboard(currentDashMeta.id);
            if (meta) setCurrentDashMeta({ id: meta.id, name: meta.name, is_public: meta.is_public, public_slug: meta.public_slug });
          }}
        />
      )}
      
      {/* CSS removidos - não são mais necessários */}
    </div>
  );
}

// Componente para títulos de seção estilo Notion (sem card)
function SectionTitle({ widget, editMode, onEdit, onDelete, onMoveUp, onMoveDown }) {
  const getSizeClass = (size) => {
    switch (size) {
      case 'small': return 'text-lg font-semibold';
      case 'medium': return 'text-xl font-bold'; 
      case 'large': return 'text-2xl font-bold';
      default: return 'text-2xl font-bold';
    }
  };

  return (
    <div className="col-span-full flex items-center group py-2">
      <h2 className={`${getSizeClass(widget.size)} text-gray-900 dark:text-gray-100 leading-tight flex-1 ${editMode ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''}`}
          onClick={editMode ? onEdit : undefined}
          title={editMode ? "Clique para editar" : undefined}>
        {widget.text || 'Título da seção'}
      </h2>
      {editMode && (
        <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button className="btn-sm hover:scale-110 transition-transform" onClick={onMoveUp} title="Mover para esquerda">←</button>
          <button className="btn-sm hover:scale-110 transition-transform" onClick={onMoveDown} title="Mover para direita">→</button>
          <button className="btn-sm hover:bg-red-100 dark:hover:bg-red-900 text-red-600" onClick={onDelete} title="Excluir título">🗑️</button>
        </div>
      )}
    </div>
  );
}