"use client";

import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
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
  
  // Função para verificar tema com debounce maior
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
    }, 300), // Debounce maior - 300ms
    []
  );
  
  // Monitorar mudanças no tema de forma menos agressiva
  useEffect(() => {
    // Só verificar tema inicial
    checkTheme();
    
    // Observar mudanças apenas quando necessário
    const observer = new MutationObserver((mutations) => {
      // Só verificar se houve mudança real na classe 'dark'
      const hasThemeChange = mutations.some(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          const oldClasses = mutation.oldValue ? mutation.oldValue.split(' ') : [];
          const newClasses = Array.from(target.classList);
          
          const oldHasDark = oldClasses.includes('dark');
          const newHasDark = newClasses.includes('dark');
          
          return oldHasDark !== newHasDark;
        }
        return false;
      });
      
      // Só chamar checkTheme se realmente mudou
      if (hasThemeChange) {
        checkTheme();
      }
    });
    
    // Observar apenas mudanças na classe, com throttle
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true
    });
    
    return () => observer.disconnect();
  }, []); // Sem dependência de checkTheme para evitar re-criação
  
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
    case "text":
      const getSizeClass = (size) => {
        switch(size) {
          case 'small': return 'text-lg font-semibold';
          case 'medium': return 'text-xl font-bold';
          case 'large': return 'text-2xl font-bold';
          default: return 'text-2xl font-bold';
        }
      };
      
      const getAlignmentClass = (alignment) => {
        switch(alignment) {
          case 'left': return 'text-left';
          case 'center': return 'text-center';
          case 'right': return 'text-right';
          default: return 'text-left';
        }
      };
      
      const getColorClass = (color) => {
        switch(color) {
          case 'primary': return 'text-blue-600 dark:text-blue-400';
          case 'success': return 'text-green-600 dark:text-green-400';
          case 'warning': return 'text-yellow-600 dark:text-yellow-400';
          case 'danger': return 'text-red-600 dark:text-red-400';
          case 'muted': return 'text-gray-500 dark:text-gray-400';
          default: return 'text-gray-900 dark:text-gray-100';
        }
      };
      
      return (
        <div className="w-full h-full flex items-start p-4">
          <div className={`
            ${getSizeClass(w.config?.size)} 
            ${getAlignmentClass(w.config?.alignment)} 
            ${getColorClass(w.config?.color)}
            w-full leading-relaxed whitespace-pre-wrap
          `}>
            {w.config?.text || 'Texto da nota'}
          </div>
        </div>
      );
    case "iframe":
      return <AutoResizeIframe w={w} memoizedIframeUrl={memoizedIframeUrl} memoizedBorderStyle={memoizedBorderStyle} />;
    case "embed":
      return <AutoResizeEmbed w={w} />;
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

// Componente que força redimensionamento de iframe
function AutoResizeIframe({ w, memoizedIframeUrl, memoizedBorderStyle }) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const iframe = iframeRef.current;
    if (!container || !iframe) return;

    const forceResize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        iframe.style.width = `${rect.width}px`;
        iframe.style.height = `${rect.height}px`;
        console.log(`🔄 Iframe ${w.id}: redimensionado para ${rect.width}x${rect.height}`);
      }
    };

    const resizeObserver = new ResizeObserver(forceResize);
    resizeObserver.observe(container);
    
    // Resize inicial
    setTimeout(forceResize, 100);

    return () => resizeObserver.disconnect();
  }, [w.id]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <iframe
        ref={iframeRef}
        key={w.id}
        src={memoizedIframeUrl}
        style={{ 
          border: memoizedBorderStyle,
          display: 'block'
        }}
        allowFullScreen={!!w.config?.allowFull}
      />
    </div>
  );
}

// Componente que força redimensionamento de HTML embed
function AutoResizeEmbed({ w }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const forceResize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Forçar todos os iframes dentro do embed
        const iframes = container.querySelectorAll('iframe, object, embed');
        iframes.forEach(iframe => {
          iframe.style.width = `${rect.width}px`;
          iframe.style.height = `${rect.height}px`;
        });
        console.log(`🔄 Embed ${w.id}: redimensionado para ${rect.width}x${rect.height}, ${iframes.length} elementos`);
      }
    };

    const resizeObserver = new ResizeObserver(forceResize);
    resizeObserver.observe(container);
    
    // Resize inicial após carregar HTML
    setTimeout(forceResize, 200);

    return () => resizeObserver.disconnect();
  }, [w.id, w.config?.html]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      dangerouslySetInnerHTML={{ 
        __html: w.config?.html || "<div style='padding:16px;opacity:.6'>Cole aqui o snippet de embed do provedor…</div>"
      }}
    />
  );
}

// Memoizar o WidgetRenderer para evitar re-renderizações desnecessárias
export default memo(WidgetRenderer, (prevProps, nextProps) => {
  // Só re-renderizar se o widget realmente mudou
  return (
    prevProps.w.id === nextProps.w.id &&
    prevProps.w.type === nextProps.w.type &&
    JSON.stringify(prevProps.w.config) === JSON.stringify(nextProps.w.config)
  );
});