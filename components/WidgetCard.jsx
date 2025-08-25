"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import WidgetRenderer from "./WidgetRenderer";

function WidgetCard({ 
  w, editMode, onEdit, onDup, onDel, onMoveUp, onMoveDown, 
  draggable, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, onResize, draggingId 
}) {
  // Dimensões em pixels - totalmente livres
  const currentWidth = Number(w.width) || 400; // Largura padrão 400px
  const currentHeight = Number(w.height) || 360; // Altura padrão 360px
  
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [isDropHover, setIsDropHover] = useState(false);
  const [dropPosition, setDropPosition] = useState(null); // 'before' | 'after' | null
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
    zIndex: isResizing ? 5 : (isDragging ? 4 : (isDropHover ? 3 : 1))
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

  // HANDLERS DE DROP MELHORADOS com detecção de posição
  const handleDragOverWrapper = (e) => {
    if (!editMode || !draggingId || draggingId === w.id) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Calcular posição do drop baseada no mouse
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const centerY = rect.height / 2;
      
      const position = mouseY < centerY ? 'before' : 'after';
      setDropPosition(position);
    }
    
    setIsDropHover(true);
  };

  const handleDragLeaveWrapper = (e) => {
    if (!cardRef.current?.contains(e.relatedTarget)) {
      setIsDropHover(false);
      setDropPosition(null);
    }
  };

  const handleDropWrapper = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropHover(false);
    setDropPosition(null);
    onDrop?.(e);
  };

  // Classes CSS dinâmicas
  const getDropClasses = () => {
    if (!isDropHover) return '';
    
    const baseClasses = 'ring-2 transition-all duration-200';
    
    if (dropPosition === 'before') {
      return `${baseClasses} ring-blue-500/70 shadow-[0_-4px_20px_rgba(59,130,246,0.3)]`;
    } else if (dropPosition === 'after') {
      return `${baseClasses} ring-green-500/70 shadow-[0_4px_20px_rgba(34,197,94,0.3)]`;
    }
    
    return `${baseClasses} ring-purple-500/70`;
  };

  return (
    <div
      ref={cardRef}
      data-widget-id={w.id} // Para identificação no container
      style={styles}
      className={`
        bg-white dark:bg-neutral-800 
        border border-neutral-200 dark:border-neutral-700 
        rounded-xl p-4 shadow-sm
        ${isDragging ? 'opacity-50 scale-95 rotate-2' : ''}
        ${isResizing ? 'ring-2 ring-blue-500/50 shadow-blue-500/20 shadow-lg' : ''}
        ${getDropClasses()}
        relative transition-all duration-200
        hover:shadow-md
      `}
      draggable={!isResizing && editMode && !!draggable}
      onDragStart={handleDragStartWrapper}
      onDragOver={handleDragOverWrapper}
      onDragLeave={handleDragLeaveWrapper}
      onDragEnter={handleDragOverWrapper} // Adicionar também dragEnter
      onDrop={handleDropWrapper}
      onDragEnd={onDragEnd}
    >
      
      {/* INDICADORES DE DROP ZONE MELHORADOS */}
      {isDropHover && editMode && (
        <>
          {/* Indicador superior - inserir antes */}
          {dropPosition === 'before' && (
            <>
              <div className="absolute -top-2 left-2 right-2 h-1 bg-blue-500 rounded-full shadow-lg z-30" />
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded shadow-lg font-medium whitespace-nowrap z-30">
                ⬆️ Inserir antes
              </div>
            </>
          )}
          
          {/* Indicador inferior - inserir depois */}
          {dropPosition === 'after' && (
            <>
              <div className="absolute -bottom-2 left-2 right-2 h-1 bg-green-500 rounded-full shadow-lg z-30" />
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-3 py-1 rounded shadow-lg font-medium whitespace-nowrap z-30">
                ⬇️ Inserir depois
              </div>
            </>
          )}
          
          {/* Overlay geral */}
          <div className={`absolute inset-0 pointer-events-none z-20 rounded-xl ${
            dropPosition === 'before' ? 'bg-blue-500/10' : 'bg-green-500/10'
          }`} />
        </>
      )}

      {/* Handles de resize - visíveis no modo edição */}
      {editMode && !isDragging && !isDropHover && (
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
        
        {editMode && !isDragging && !isDropHover && (
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
        
        {/* Badge de status durante interações */}
        {(isDragging || isDropHover || isResizing) && (
          <div className="shrink-0">
            {isDragging && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                🔄 Movendo
              </span>
            )}
            {isDropHover && !isDragging && (
              <span className={`text-white text-xs px-2 py-1 rounded-full font-medium ${
                dropPosition === 'before' ? 'bg-blue-500' : 'bg-green-500'
              }`}>
                🎯 Drop Zone
              </span>
            )}
            {isResizing && (
              <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                📏 Resize
              </span>
            )}
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
        className={`
          rounded-lg overflow-hidden border relative
          ${isDragging ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-neutral-50 dark:bg-neutral-900'}
          ${isDropHover ? 'border-blue-300 dark:border-blue-600' : 'border-neutral-200/60 dark:border-neutral-700'}
          transition-colors duration-200
        `}
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
        
        {/* Overlay durante drag */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center" style={{ zIndex: 10 }}>
            <div className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg shadow-xl font-medium">
              🔄 Arrastando...
            </div>
          </div>
        )}
      </div>

      {/* Info do widget - EXPANDIDA */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs opacity-60">
        <span className="flex items-center gap-1">
          📊 Tipo: <span className="font-medium">{w.type}</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          📐 {currentWidth}×{currentHeight}px
        </span>
        
        {isResizing && (
          <>
            <span>•</span>
            <span className="text-purple-600 font-medium flex items-center gap-1">
              📏 Redimensionando {resizeDirection}...
            </span>
          </>
        )}
        
        {isDragging && (
          <>
            <span>•</span>
            <span className="text-blue-600 font-medium flex items-center gap-1">
              🔄 Movendo...
            </span>
          </>
        )}
        
        {isDropHover && (
          <>
            <span>•</span>
            <span className={`font-medium flex items-center gap-1 ${
              dropPosition === 'before' ? 'text-blue-600' : 'text-green-600'
            }`}>
              🎯 Drop: {dropPosition === 'before' ? 'antes' : 'depois'}
            </span>
          </>
        )}
        
        {editMode && !isDragging && !isDropHover && !isResizing && (
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

export default WidgetCard;