"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import WidgetRenderer from "./WidgetRenderer";

function WidgetCard({ 
  w, editMode, onEdit, onDup, onDel, onMoveUp, onMoveDown, 
  draggable, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, onResize 
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

  // Estilos com dimensões fixas - sem conflitos de estado
  const styles = { 
    width: currentWidth + 'px',
    height: 'auto', // Altura automática baseada no conteúdo + altura do widget
    minWidth: '200px',
    minHeight: '200px',
    maxWidth: 'none', // Sem limitação máxima
    maxHeight: 'none', // Sem limitação máxima
    position: 'relative',
    flexShrink: 0, // Não encolher
    flexGrow: 0,   // Não crescer automaticamente
    // Transição suave apenas quando não está arrastando ou redimensionando
    transition: (isDragging || isResizing) ? 'none' : 'all 0.2s ease',
    // Garantir que o widget não seja comprimido
    overflow: 'visible',
    // Z-index baixo para não sobrepor header
    zIndex: isResizing ? 5 : (isDragging ? 4 : 1)
  };

  // Resize handler simplificado - aplica mudanças diretamente
  const handleResize = useCallback((e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = startDimensionsRef.current.width;
    const startHeight = startDimensionsRef.current.height;
    
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

  const handleDragStartWrapper = (e) => {
    if (isResizing || !editMode) {
      e.preventDefault();
      return false;
    }
    onDragStart?.(e);
  };

  return (
    <div
      ref={cardRef}
      style={styles}
      className={`
        bg-white dark:bg-neutral-800 
        border border-neutral-200 dark:border-neutral-700 
        rounded-xl p-4 shadow-sm
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isResizing ? 'ring-2 ring-blue-500/50' : ''}
        relative
      `}
      draggable={!isResizing && editMode && !!draggable}
      onDragStart={handleDragStartWrapper}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Handles de resize - visíveis no modo edição */}
      {editMode && !isDragging && (
        <>
          {/* Handle horizontal (direita) */}
          <div 
            className="absolute -right-1 top-8 bottom-8 w-3 cursor-ew-resize opacity-0 hover:opacity-100 hover:bg-blue-500/20 transition-opacity rounded-r-xl flex items-center justify-center z-10"
            onMouseDown={(e) => handleResize(e, 'horizontal')}
            title="Redimensionar largura"
          >
            <div className="w-1 h-8 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
          </div>
          
          {/* Handle vertical (baixo) */}
          <div 
            className="absolute left-8 right-8 -bottom-1 h-3 cursor-ns-resize opacity-0 hover:opacity-100 hover:bg-blue-500/20 transition-opacity rounded-b-xl flex items-center justify-center z-10"
            onMouseDown={(e) => handleResize(e, 'vertical')}
            title="Redimensionar altura"
          >
            <div className="w-8 h-1 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
          </div>
          
          {/* Handle diagonal (canto) */}
          <div 
            className="absolute -right-1 -bottom-1 w-5 h-5 cursor-nwse-resize opacity-0 hover:opacity-100 hover:bg-blue-500/30 transition-opacity rounded-tl-lg rounded-br-xl flex items-center justify-center z-10"
            onMouseDown={(e) => handleResize(e, 'both')}
            title="Redimensionar ambos"
          >
            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
          </div>
        </>
      )}

      {/* Header com título e controles */}
      <div className="flex items-start gap-2 mb-3">
        <h3 className="text-base sm:text-lg font-semibold flex-1 truncate">
          {w.title || "Widget"}
        </h3>
        
        {editMode && !isDragging && (
          <div className="flex items-center gap-1 text-sm shrink-0">
            <button 
              className="btn-sm hover:scale-110 transition-transform" 
              title="Mover para cima" 
              onClick={onMoveUp}
            >
              ↑
            </button>
            <button 
              className="btn-sm hover:scale-110 transition-transform" 
              title="Mover para baixo" 
              onClick={onMoveDown}
            >
              ↓
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
        className="rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-700 relative"
      >
        <WidgetRenderer w={w} />
        
        {/* Overlay durante resize */}
        {isResizing && (
          <div className="absolute inset-0 bg-blue-500/5 border-2 border-blue-500/60 rounded-lg flex items-center justify-center" style={{ zIndex: 10 }}>
            <div className="bg-blue-600 text-white text-xs px-3 py-2 rounded shadow-lg font-medium">
              {currentWidth}×{currentHeight}px
              {resizeDirection && (
                <span className="ml-1 opacity-75">
                  ({resizeDirection === 'horizontal' ? '↔️' : resizeDirection === 'vertical' ? '↕️' : '↗️'})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info do widget */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs opacity-60">
        <span>Tipo: {w.type}</span>
        <span>•</span>
        <span>Largura: {currentWidth}px</span>
        <span>•</span>
        <span>Altura: {currentHeight}px</span>
        
        {isResizing && (
          <>
            <span>•</span>
            <span className="text-blue-600 font-medium">Redimensionando {resizeDirection}...</span>
          </>
        )}
        
        {isDragging && (
          <>
            <span>•</span>
            <span className="text-blue-600 font-medium">Movendo...</span>
          </>
        )}
      </div>
    </div>
  );
}

export default WidgetCard;