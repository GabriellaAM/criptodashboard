"use client";

import React, { useRef, useState, useCallback } from "react";
import WidgetRenderer from "./WidgetRenderer";

function WidgetCard({ w, editMode, onEdit, onDup, onDel, onMoveUp, onMoveDown, draggable, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, onResize }) {
	const baseSpan = Math.min(Math.max(Number(w.span) || 12, 1), 12);
	const [isResizing, setIsResizing] = useState(false);
	const [resizePreview, setResizePreview] = useState(null);
	const cardRef = useRef(null);
	const rafRef = useRef(null);
	const initialSizes = useRef({ width: 0, height: 0, span: 0 });
	const currentPreview = useRef(null);

	// Usar largura em pixels se disponível, senão usar sistema de colunas
	const hasCustomWidth = w.width && Number(w.width) > 0;
	const currentWidth = hasCustomWidth ? Number(w.width) : null;
	
	const styles = { 
		// Se tem largura customizada, usa pixels; senão usa grid
		...(hasCustomWidth ? 
			{ width: currentWidth + 'px', minWidth: '200px' } : 
			{ gridColumn: `span ${baseSpan} / span ${baseSpan}` }
		),
		position: 'relative',
		// Transição suave quando não está redimensionando
		transition: isResizing ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
	};

	const updatePreview = useCallback((width, height, span) => {
		const previewData = { width, height, span };
		currentPreview.current = previewData;
		
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
		}
		
		rafRef.current = requestAnimationFrame(() => {
			setResizePreview(previewData);
		});
	}, []);

	const handleResize = useCallback((e, direction) => {
		e.preventDefault();
		e.stopPropagation();
		
		const rect = cardRef.current?.getBoundingClientRect();
		if (!rect) return;

		const startX = e.clientX;
		const startY = e.clientY;
		const startWidth = hasCustomWidth ? currentWidth : rect.width;
		const startHeight = Number(w.height) || 360;
		const startSpan = baseSpan;
		
		// Calcular largura aproximada de uma coluna (para referência do span)
		const containerWidth = cardRef.current?.parentElement?.getBoundingClientRect()?.width || 1200;
		const colWidth = containerWidth / 12;
		
		initialSizes.current = { width: startWidth, height: startHeight, span: startSpan };
		
		setIsResizing(true);
		setResizePreview({ width: startWidth, height: startHeight, span: startSpan });

		// Melhor controle do cursor
		const originalCursor = document.body.style.cursor;
		const originalUserSelect = document.body.style.userSelect;
		const originalPointerEvents = document.body.style.pointerEvents;
		
		document.body.style.userSelect = 'none';
		document.body.style.pointerEvents = 'none';
		document.body.style.cursor = direction === 'vertical' ? 'ns-resize' : 
									 direction === 'horizontal' ? 'ew-resize' : 'nwse-resize';

		const handleMouseMove = (moveEvent) => {
			const deltaX = moveEvent.clientX - startX;
			const deltaY = moveEvent.clientY - startY;
			
			let newWidth = startWidth;
			let newHeight = startHeight;
			let newSpan = startSpan;

			if (direction === 'horizontal' || direction === 'both') {
				// Redimensionamento horizontal em pixels - muito mais livre
				newWidth = Math.max(startWidth + deltaX, 100); // Mínimo de 100px
				// Calcular span baseado na nova largura (apenas para referência)
				newSpan = Math.max(Math.round(newWidth / colWidth), 1);
				newSpan = Math.min(newSpan, 12); // Manter dentro do grid
			}

			if (direction === 'vertical' || direction === 'both') {
				// Redimensionamento vertical totalmente livre
				newHeight = Math.max(startHeight + deltaY, 50); // Mínimo de 50px
			}

			updatePreview(newWidth, newHeight, newSpan);
		};

		const handleMouseUp = () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			
			// Restaurar estilos originais
			document.body.style.cursor = originalCursor;
			document.body.style.userSelect = originalUserSelect;
			document.body.style.pointerEvents = originalPointerEvents;
			
			setIsResizing(false);
			
			// Usar a ref ao invés do estado, pois o estado pode estar desatualizado por re-renders
			const finalPreview = currentPreview.current;
			
			if (finalPreview && onResize) {
				const updates = {};
				
				// Sempre salvar largura em pixels agora
				if (Math.abs(finalPreview.width - initialSizes.current.width) >= 5) {
					updates.width = Math.round(finalPreview.width);
				}
				
				// Manter span para compatibilidade, mas agora baseado na largura em pixels
				if (Math.abs(finalPreview.span - initialSizes.current.span) >= 1) {
					updates.span = finalPreview.span;
				}
				
				if (Math.abs(finalPreview.height - initialSizes.current.height) >= 5) {
					updates.height = Math.round(finalPreview.height);
				}
				
				if (Object.keys(updates).length > 0) {
					onResize(w.id, updates);
				}
			}
			
			// Limpar ref e preview
			currentPreview.current = null;
			setTimeout(() => {
				setResizePreview(null);
			}, 200);
		};

		document.addEventListener('mousemove', handleMouseMove, { passive: false });
		document.addEventListener('mouseup', handleMouseUp, { passive: false });
	}, [w.id, w.height, w.width, hasCustomWidth, currentWidth, baseSpan, onResize, updatePreview]);

	// Limpar RAF no unmount
	React.useEffect(() => {
		return () => {
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, []);

	const currentHeight = resizePreview?.height ?? (Number(w.height) || 360);
	const displayWidth = resizePreview?.width ?? (hasCustomWidth ? currentWidth : null);

	return (
		<div
			ref={cardRef}
			style={{
				...styles,
				// Aplicar largura do preview se estiver redimensionando
				...(isResizing && displayWidth ? { width: displayWidth + 'px' } : {}),
			}}
			className={`card ${isDragging ? 'opacity-60' : ''} ${isResizing ? 'relative' : ''}`} // Removido z-50, mantido apenas relative
			draggable={!!draggable}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDragEnter={onDragOver}
			onDrop={onDrop}
			onDragEnd={onDragEnd}
		>
			{/* Handles de resize mais responsivos */}
			{editMode && (
				<>
					{/* Handle horizontal - mais largo para melhor UX */}
					<div 
						className="absolute -right-1 top-0 bottom-0 w-3 cursor-ew-resize opacity-0 hover:opacity-100 hover:bg-blue-500/20 transition-all duration-200" 
						onMouseDown={(e) => handleResize(e, 'horizontal')}
						style={{ zIndex: 10 }}
					/>
					
					{/* Handle vertical - mais alto para melhor UX */}
					<div 
						className="absolute left-0 right-0 -bottom-1 h-3 cursor-ns-resize opacity-0 hover:opacity-100 hover:bg-blue-500/20 transition-all duration-200" 
						onMouseDown={(e) => handleResize(e, 'vertical')}
						style={{ zIndex: 10 }}
					/>
					
					{/* Handle diagonal - maior e mais visível */}
					<div 
						className="absolute -right-1 -bottom-1 w-4 h-4 cursor-nwse-resize opacity-0 hover:opacity-100 hover:bg-blue-500/40 transition-all duration-200 rounded-tl-md" 
						onMouseDown={(e) => handleResize(e, 'both')}
						style={{ zIndex: 11 }}
					/>
					
					{/* Indicador visual permanente no canto */}
					<div className="absolute right-1 bottom-1 w-2 h-2 opacity-30">
						<div className="w-full h-full bg-gray-400 dark:bg-gray-600 rounded-full"></div>
					</div>
				</>
			)}

			<div className="flex items-start gap-2 mb-3">
				<h3 className="text-base sm:text-lg font-semibold flex-1">{w.title || "Widget"}</h3>
				{editMode && (
					<div className="flex items-center gap-1 text-sm">
						<button className="btn hover:scale-110 transition-transform" title="Mover para cima" onClick={onMoveUp}>↑</button>
						<button className="btn hover:scale-110 transition-transform" title="Mover para baixo" onClick={onMoveDown}>↓</button>
						<button className="btn hover:scale-110 transition-transform" title="Duplicar" onClick={onDup}>⎘</button>
						<button className="btn hover:scale-110 transition-transform" title="Editar" onClick={onEdit}>✏️</button>
						<button className="btn hover:scale-110 transition-transform" title="Excluir" onClick={onDel}>🗑️</button>
					</div>
				)}
			</div>

			<div 
				style={{ 
					height: currentHeight + "px",
					// Transição suave da altura
					transition: isResizing ? 'none' : 'height 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
				}} 
				className="rounded-xl overflow-hidden bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-700 relative"
			>
				<WidgetRenderer w={w} />
				
				{/* Preview overlay melhorado - com z-index menor */}
				{isResizing && resizePreview && (
					<div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}> {/* z-index muito menor */}
						{/* Overlay semi-transparente */}
						<div className="absolute inset-0 bg-blue-500/5"></div>
						
						{/* Bordas do preview */}
						<div className="absolute inset-0 border-2 border-blue-500/60 rounded-xl animate-pulse"></div>
						
						{/* Indicador de tamanho */}
						<div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg">
							{Math.round(resizePreview.width)}×{Math.round(resizePreview.height)}px
						</div>
					</div>
				)}
			</div>

			<div className="mt-3 flex flex-wrap items-center gap-2 text-xs opacity-60">
				<span>Tipo: {w.type}</span>
				<span>•</span>
				{hasCustomWidth ? (
					<>
						<span>Largura: {Math.round(displayWidth || currentWidth)}px</span>
						<span>•</span>
						<span>Altura: {Math.round(currentHeight)}px</span>
					</>
				) : (
					<>
						<span>Colunas: {resizePreview?.span ?? baseSpan}/12</span>
						<span>•</span>
						<span>Altura: {Math.round(currentHeight)}px</span>
					</>
				)}
				{isResizing && (
					<>
						<span>•</span>
						<span className="text-blue-600 font-medium">Redimensionando...</span>
					</>
				)}
			</div>
		</div>
	);
}

export default WidgetCard;