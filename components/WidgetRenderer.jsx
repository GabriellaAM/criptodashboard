"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ChartWidget from "./ChartWidget";
import TableWidget from "./TableWidget";
import KPIWidget from "./KPIWidget";

// Função para detectar se é URL do TradingView e ajustar tema
function getTradingViewUrl(url, isDarkMode) {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    const isTradingView = urlObj.hostname.includes('tradingview.com') || 
                         urlObj.hostname.includes('s.tradingview.com');
    
    if (!isTradingView) return url;
    
    // Se já tem parâmetro theme, atualizar
    if (urlObj.searchParams.has('theme')) {
      urlObj.searchParams.set('theme', isDarkMode ? 'dark' : 'light');
    } else {
      // Se não tem, adicionar
      urlObj.searchParams.set('theme', isDarkMode ? 'dark' : 'light');
    }
    
    return urlObj.toString();
  } catch (e) {
    // Se não conseguir fazer parse da URL, retorna original
    return url;
  }
}

// Debounce function para evitar múltiplas execuções
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function WidgetRenderer({ w }) {
  // Estado para controlar o tema
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Inicializar com o tema atual
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  
  // Função para verificar tema com debounce
  const checkTheme = useCallback(
    debounce(() => {
      const currentDarkMode = document.documentElement.classList.contains('dark');
      // Só atualizar se realmente mudou
      setIsDarkMode(prevDarkMode => {
        if (prevDarkMode !== currentDarkMode) {
          return currentDarkMode;
        }
        return prevDarkMode;
      });
    }, 100), // Debounce de 100ms
    []
  );
  
  // Monitorar mudanças no tema de forma mais eficiente
  useEffect(() => {
    // Verificar tema inicial
    checkTheme();
    
    // Observar mudanças na classe do documento
    const observer = new MutationObserver((mutations) => {
      // Verificar se alguma mutação realmente afetou a classe 'dark'
      const hasThemeChange = mutations.some(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          const oldClasses = mutation.oldValue ? mutation.oldValue.split(' ') : [];
          const newClasses = Array.from(target.classList);
          
          // Verificar se especificamente a classe 'dark' mudou
          const oldHasDark = oldClasses.includes('dark');
          const newHasDark = newClasses.includes('dark');
          
          return oldHasDark !== newHasDark;
        }
        return false;
      });
      
      if (hasThemeChange) {
        checkTheme();
      }
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true // Necessário para comparar valores antigos
    });
    
    return () => observer.disconnect();
  }, [checkTheme]);
  
  // Memorizar a URL do iframe para evitar recálculos desnecessários
  const memoizedIframeUrl = useMemo(() => {
    return getTradingViewUrl(w.config?.url || "", isDarkMode);
  }, [w.config?.url, isDarkMode]);
  
  // Memorizar o estilo da borda
  const memoizedBorderStyle = useMemo(() => {
    if (!w.config?.border) return "none";
    return isDarkMode ? 
      "1px solid rgba(255,255,255,0.1)" : 
      "1px solid rgba(0,0,0,0.08)";
  }, [w.config?.border, isDarkMode]);
  
  switch (w.type) {
    case "iframe":
      return (
        <iframe
          key={`${w.id}-${isDarkMode ? 'dark' : 'light'}`}
          src={memoizedIframeUrl}
          className="w-full h-full"
          style={{ border: memoizedBorderStyle }}
          allowFullScreen={!!w.config?.allowFull}
        />
      );
    case "embed":
      return (
        <div
          className="w-full h-full overflow-auto"
          dangerouslySetInnerHTML={{ 
            __html: w.config?.html || 
            "<div style='padding:16px;opacity:.6'>Cole aqui o snippet de embed do provedor…</div>" 
          }}
        />
      );
    case "chart":
      return <ChartWidget config={w.config} />;
    case "table":
      return <TableWidget config={w.config} />;
    case "kpi":
      return <KPIWidget config={w.config} />;
    default:
      return <div className="p-4 opacity-60">Tipo desconhecido.</div>;
  }
}

export default WidgetRenderer;