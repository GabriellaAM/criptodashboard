"use client";

import React, { memo, useCallback } from "react";
import WidgetRenderer from "./WidgetRenderer";

/**
 * Professional Widget Card Component
 * 
 * Enterprise-grade widget card with proper error boundaries,
 * accessibility, and modern design patterns.
 * 
 * @param {Object} props Component props
 * @param {Object} props.widget Widget configuration object
 * @param {Object} props.w Legacy widget prop (for backward compatibility)
 * @param {boolean} props.editMode Whether edit mode is active
 * @param {Function} props.onEdit Edit callback
 * @param {Function} props.onDel Delete callback
 * @param {Function} props.onDup Duplicate callback
 * @param {boolean} props.isDraggable Whether widget is draggable
 */
const WidgetCard = memo(({ 
  widget, 
  w, 
  editMode = false, 
  onEdit, 
  onDel, 
  onDup,
  isDraggable = false 
}) => {
  // Normalize widget prop for backward compatibility
  const widgetData = widget || w;
  
  // Early return for invalid widget data
  if (!widgetData || typeof widgetData !== 'object') {
    return (
      <div className="widget-card widget-card--error" role="alert">
        <div className="widget-card__error-content">
          <svg className="widget-card__error-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span className="widget-card__error-text">Invalid widget configuration</span>
        </div>
      </div>
    );
  }

  // Memoized event handlers for better performance
  const handleEdit = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    onEdit?.();
  }, [onEdit, widgetData.id]);

  const handleDelete = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    onDel?.();
  }, [onDel]);

  const handleDuplicate = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    onDup?.();
  }, [onDup]);

  // Dynamic CSS classes based on state
  const cardClasses = [
    'widget-card',
    editMode && 'widget-card--edit-mode',
    isDraggable && 'widget-card--draggable',
    widgetData.type && `widget-card--${widgetData.type}`
  ].filter(Boolean).join(' ');

  return (
    <article 
      className={cardClasses}
      data-widget-id={widgetData.id}
      data-widget-type={widgetData.type}
      role="region"
      aria-label={widgetData.title || `${widgetData.type} widget`}
    >
      {/* Widget Header with Title and Drag Handle */}
      <header className="widget-card__header">
        {/* Drag Handle - Only this area allows dragging */}
        {editMode && (
          <div className="widget-card__drag-handle" title="Drag to move widget">
            <svg viewBox="0 0 24 24" fill="currentColor" className="widget-card__drag-icon">
              <path d="M7 19v-2h2v2H7zm4-6v-2h2v2h-2zm0-6V5h2v2h-2zm0 12v-2h2v2h-2zm4-6v-2h2v2h-2zm0-6V5h2v2h-2zm0 12v-2h2v2h-2z"/>
            </svg>
          </div>
        )}
        
        {widgetData.title && (
          <h3 className="widget-card__title" title={widgetData.title}>
            {widgetData.title}
          </h3>
        )}
      </header>

      {/* Edit Mode Action Buttons */}
      {editMode && (
        <div className="widget-card__actions react-grid-no-drag" role="toolbar" aria-label="Widget actions">
          <button
            type="button"
            className="widget-card__action widget-card__action--edit react-grid-no-drag"
            onClick={handleEdit}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Edit widget"
            title="Edit widget"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>

          <button
            type="button"
            className="widget-card__action widget-card__action--duplicate react-grid-no-drag"
            onClick={handleDuplicate}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Duplicate widget"
            title="Duplicate widget"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>

          <button
            type="button"
            className="widget-card__action widget-card__action--delete react-grid-no-drag"
            onClick={handleDelete}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Delete widget"
            title="Delete widget"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Widget Content */}
      <main className="widget-card__content">
        <WidgetRenderer widget={widgetData} />
      </main>

      {/* Loading State Overlay */}
      {widgetData.loading && (
        <div className="widget-card__loading" aria-hidden="true">
          <div className="widget-card__spinner"></div>
        </div>
      )}
    </article>
  );
});

WidgetCard.displayName = 'WidgetCard';

// Comparação otimizada para memo
const arePropsEqual = (prevProps, nextProps) => {
  // Comparar props básicas primeiro
  if (prevProps.editMode !== nextProps.editMode) return false;
  if (prevProps.isDraggable !== nextProps.isDraggable) return false;
  
  // Comparar widget data
  const prevWidget = prevProps.widget || prevProps.w;
  const nextWidget = nextProps.widget || nextProps.w;
  
  if (!prevWidget || !nextWidget) return false;
  
  // Comparação rápida de propriedades essenciais
  if (prevWidget.id !== nextWidget.id) return false;
  if (prevWidget.type !== nextWidget.type) return false;
  if (prevWidget.title !== nextWidget.title) return false;
  
  // Comparar config apenas se necessário
  const prevConfig = prevWidget.config || {};
  const nextConfig = nextWidget.config || {};
  
  // Verificar propriedades específicas que realmente importam
  const configKeys = ['url', 'data', 'xField', 'yFields', 'chartType', 'text', 'size', 'alignment', 'color'];
  
  for (const key of configKeys) {
    if (prevConfig[key] !== nextConfig[key]) {
      return false;
    }
  }
  
  return true;
};

export default memo(WidgetCard, arePropsEqual);