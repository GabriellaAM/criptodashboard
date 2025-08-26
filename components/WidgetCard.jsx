"use client";

import React, { useRef, useState, useCallback, useEffect, memo } from "react";
import WidgetRenderer from "./WidgetRenderer";

function WidgetCard({ 
  w, editMode, onEdit, onDup, onDel, onMoveUp, onMoveDown, onResize
}) {
  // Dimensões em pixels - totalmente livres
  const currentWidth = Number(w.width) || 400; // Largura padrão 400px
  const currentHeight = Number(w.height) || 360; // Altura padrão 360px
  
  
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const cardRef = useRef(null);
  const startDimensionsRef = useRef({ width: currentWidth, height: currentHeight });

  // Atualizar dimensões iniciais quando props mudam
  useEffect(() => {
    startDimensionsRef.current = { width: currentWidth, height: currentHeight };
  }, [currentWidth, currentHeight]);

  // Calcular quantas colunas o widget deve ocupar (baseado no grid de 12 colunas)
  const getGridColumns = (width) => {
    if (width <= 300) return 3;   // 25% da tela (3/12 colunas)
    if (width <= 400) return 4;   // 33% da tela (4/12 colunas)  
    if (width <= 500) return 5;   // 42% da tela (5/12 colunas)
    if (width <= 600) return 6;   // 50% da tela (6/12 colunas)
    if (width <= 700) return 7;   // 58% da tela (7/12 colunas)
    if (width <= 800) return 8;   // 67% da tela (8/12 colunas)
    if (width <= 900) return 9;   // 75% da tela (9/12 colunas)
    if (width <= 1000) return 10; // 83% da tela (10/12 colunas)
    if (width <= 1100) return 11; // 92% da tela (11/12 colunas)
    return 12; // 100% da tela (12/12 colunas)
  };
  const gridCols = getGridColumns(currentWidth);

  // Estilos para CSS Grid com spanning
  const styles = { 
    width: `${currentWidth}px`,
    minWidth: '300px',
    maxWidth: '100%',
    position: 'relative',
    transition: isResizing ? 'none' : 'all 0.2s ease',
    overflow: 'visible',
    zIndex: isResizing ? 5 : 1,
    gridColumn: `span ${gridCols}`, // Widget pode ocupar múltiplas colunas
    justifySelf: 'start',
    alignSelf: 'start'
  };

  // Resize handler simplificado - aplica mudanças diretamente
  const handleResize = useCallback((e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔵 Iniciando resize:', direction, 'Widget:', w.id);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = startDimensionsRef.current.width;
    const startHeight = startDimensionsRef.current.height;
    
    console.log('📐 Tamanho inicial:', startWidth, 'x', startHeight);
    
    setIsResizing(true);
    setResizeDirection(direction);

    // Controle do cursor
    document.body.style.cursor = 
      direction === 'horizontal' ? 'ew-resize' : 
      direction === 'vertical' ? 'ns-resize' : 
      'nwse-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction === 'horizontal' || direction === 'both') {
        newWidth = Math.max(startWidth + deltaX, 200); // Mínimo 200px
      }

      if (direction === 'vertical' || direction === 'both') {
        newHeight = Math.max(startHeight + deltaY, 150); // Mínimo 150px  
      }

      // Aplicar mudanças imediatamente ao pai
      const updates = {
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      };
      
      console.log('📏 Aplicando resize:', updates);
      onResize?.(w.id, updates);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Restaurar cursor
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      setIsResizing(false);
      setResizeDirection(null);
      
      console.log('🎯 Resize finalizado para widget:', w.id);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [w.id, onResize]);

  // Removido todo o sistema de drag and drop

  return (
    <div
      ref={cardRef}
      style={styles}
      className={`
        bg-white dark:bg-neutral-800 
        border border-neutral-200 dark:border-neutral-700 
        rounded-xl p-4 shadow-sm
        ${isResizing ? 'ring-2 ring-blue-500/50 shadow-blue-500/20 shadow-lg' : ''}
        relative transition-all duration-200
        hover:shadow-md group
      `}
    >
      
      {/* Removido indicador de drop zone */}

      {/* Handles de resize - apenas direções que funcionam bem com CSS Grid */}
      {editMode && (
        <>
          {/* Handle horizontal (direita) - redimensionar largura */}
          <div 
            className={`absolute -right-1 top-8 bottom-8 w-4 cursor-ew-resize transition-all duration-200 rounded-r-xl flex items-center justify-center z-10 ${
              isResizing ? 'opacity-100 bg-blue-500/30' : 'opacity-0 hover:opacity-100 group-hover:opacity-100 bg-transparent hover:bg-blue-500/20'
            }`}
            onMouseDown={(e) => handleResize(e, 'horizontal')}
            title="Redimensionar largura"
          >
            <div className="w-1 h-8 bg-blue-500 rounded-full opacity-70"></div>
          </div>

          {/* Handle vertical (baixo) - redimensionar altura */}
          <div 
            className={`absolute left-8 right-8 -bottom-1 h-4 cursor-ns-resize transition-all duration-200 rounded-b-xl flex items-center justify-center z-10 ${
              isResizing ? 'opacity-100 bg-blue-500/30' : 'opacity-0 hover:opacity-100 group-hover:opacity-100 bg-transparent hover:bg-blue-500/20'
            }`}
            onMouseDown={(e) => handleResize(e, 'vertical')}
            title="Redimensionar altura"
          >
            <div className="w-8 h-1 bg-blue-500 rounded-full opacity-70"></div>
          </div>
          
          {/* Handle diagonal (canto inferior direito) - redimensionar ambos */}
          <div 
            className={`absolute -right-1 -bottom-1 w-6 h-6 cursor-nwse-resize transition-all duration-200 rounded-br-xl flex items-center justify-center z-10 ${
              isResizing ? 'opacity-100 bg-blue-500/50' : 'opacity-0 hover:opacity-100 group-hover:opacity-100 bg-transparent hover:bg-blue-500/30'
            }`}
            onMouseDown={(e) => handleResize(e, 'both')}
            title="Redimensionar largura e altura"
          >
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          </div>
        </>
      )}

      {/* Header com título e controles */}
      <div className="flex items-start gap-2 mb-3">
        <h3 className="text-base sm:text-lg font-semibold flex-1 truncate">
          {w.title || "Widget"}
        </h3>
        
        {editMode && (
          <div className="flex items-center gap-1 text-sm shrink-0">
            <button 
              className="btn-sm hover:scale-110 transition-transform" 
              title="Mover para esquerda" 
              onClick={onMoveUp}
            >
              ←
            </button>
            <button 
              className="btn-sm hover:scale-110 transition-transform" 
              title="Mover para direita" 
              onClick={onMoveDown}
            >
              →
            </button>
            <button 
              className="btn-sm hover:scale-110 transition-transform" 
              title="Duplicar" 
              onClick={onDup}
            >
              ⎘
            </button>
            <button 
              className="btn-sm hover:scale-110 transition-transform" 
              title="Editar" 
              onClick={onEdit}
            >
              ✏️
            </button>
            <button 
              className="btn-sm hover:scale-110 transition-transform text-red-600" 
              title="Excluir" 
              onClick={onDel}
            >
              🗑️
            </button>
          </div>
        )}
        
      </div>

      {/* Conteúdo do widget - com altura fixa */}
      <div 
        style={{ 
          height: currentHeight + "px",
          width: '100%',
          transition: isResizing ? 'none' : 'height 0.2s ease'
        }} 
        className="rounded-lg overflow-hidden border relative bg-neutral-50 dark:bg-neutral-900 border-neutral-200/60 dark:border-neutral-700 transition-colors duration-200"
      >
        <WidgetRenderer w={w} />
        
        {/* Overlay durante resize */}
        {isResizing && (
          <div className="absolute inset-0 bg-blue-500/5 border-2 border-blue-500/60 rounded-lg flex items-center justify-center backdrop-blur-sm" style={{ zIndex: 10 }}>
            <div className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg shadow-xl font-medium">
              <div className="flex items-center gap-2">
                <span>📏</span>
                <span>{currentWidth}×{currentHeight}px</span>
                {resizeDirection && (
                  <span className="text-xs opacity-75">
                    ({resizeDirection === 'horizontal' ? '↔️' : resizeDirection === 'vertical' ? '↕️' : '↗️'})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Removido overlay de drag */}
      </div>

      {/* Info do widget */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs opacity-60">
        <span className="flex items-center gap-1">
          📊 <span className="font-medium">{w.type}</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          📐 {currentWidth}×{currentHeight}px
        </span>
        
        
        {editMode && !isResizing && (
          <>
            <span>•</span>
            <span className="text-blue-600 text-xs">
              ✏️ Modo edição
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// Memoizar o WidgetCard para evitar re-renderizações desnecessárias
export default memo(WidgetCard, (prevProps, nextProps) => {
  // Só re-renderizar se props importantes mudaram
  return (
    prevProps.w.id === nextProps.w.id &&
    prevProps.w.width === nextProps.w.width &&
    prevProps.w.height === nextProps.w.height &&
    prevProps.w.type === nextProps.w.type &&
    prevProps.w.title === nextProps.w.title &&
    prevProps.editMode === nextProps.editMode &&
    JSON.stringify(prevProps.w.config) === JSON.stringify(nextProps.w.config)
  );
});