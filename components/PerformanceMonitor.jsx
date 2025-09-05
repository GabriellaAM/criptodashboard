"use client";

import { useEffect, useRef } from 'react';

/**
 * Performance Monitor Component
 * 
 * Monitora performance do dashboard e identifica gargalos
 * em tempo real para debugging e otimização.
 */
export default function PerformanceMonitor({ enabled = false }) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(0);
  const performanceDataRef = useRef({
    renders: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
    dragEvents: 0,
    resizeEvents: 0
  });

  useEffect(() => {
    if (!enabled) return;

    // Monitorar re-renderizações
    renderCountRef.current++;
    const now = performance.now();
    const renderTime = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;

    // Atualizar estatísticas
    const data = performanceDataRef.current;
    data.renders++;
    data.averageRenderTime = (data.averageRenderTime * (data.renders - 1) + renderTime) / data.renders;
    data.maxRenderTime = Math.max(data.maxRenderTime, renderTime);
    data.minRenderTime = Math.min(data.minRenderTime, renderTime);

    // Log de performance se render time for muito alto
    if (renderTime > 16) { // Mais de 16ms (60fps)
      console.warn(`🐌 Slow render detected: ${renderTime.toFixed(2)}ms`);
    }

    // Log de estatísticas a cada 10 renders
    if (data.renders % 10 === 0) {
      console.log('📊 Performance Stats:', {
        renders: data.renders,
        avgRenderTime: data.averageRenderTime.toFixed(2) + 'ms',
        maxRenderTime: data.maxRenderTime.toFixed(2) + 'ms',
        minRenderTime: data.minRenderTime.toFixed(2) + 'ms',
        dragEvents: data.dragEvents,
        resizeEvents: data.resizeEvents
      });
    }
  });

  // Monitorar eventos de drag
  useEffect(() => {
    if (!enabled) return;

    const handleDragStart = () => {
      performanceDataRef.current.dragEvents++;
      console.log('🎯 Drag started');
    };

    const handleDragStop = () => {
      console.log('🎯 Drag stopped');
    };

    const handleResizeStart = () => {
      performanceDataRef.current.resizeEvents++;
      console.log('📏 Resize started');
    };

    const handleResizeStop = () => {
      console.log('📏 Resize stopped');
    };

    // Adicionar listeners globais
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragStop);
    document.addEventListener('resizestart', handleResizeStart);
    document.addEventListener('resizeend', handleResizeStop);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragStop);
      document.removeEventListener('resizestart', handleResizeStart);
      document.removeEventListener('resizeend', handleResizeStop);
    };
  }, [enabled]);

  // Monitorar memory usage
  useEffect(() => {
    if (!enabled) return;

    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = performance.memory;
        const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
        const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);
        
        if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
          console.warn(`⚠️ High memory usage: ${usedMB}MB / ${totalMB}MB`);
        }
      }
    };

    const interval = setInterval(checkMemory, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [enabled]);

  // Monitorar FPS
  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 0;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        
        if (fps < 30) {
          console.warn(`🐌 Low FPS detected: ${fps}fps`);
        }
      }
      
      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }, [enabled]);

  // Não renderiza nada visualmente
  return null;
}

/**
 * Hook para usar o monitor de performance
 */
export function usePerformanceMonitor(enabled = false) {
  const performanceDataRef = useRef({
    renders: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
    dragEvents: 0,
    resizeEvents: 0
  });

  const logPerformance = (event, data = {}) => {
    if (!enabled) return;
    
    console.log(`📊 Performance Event: ${event}`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  };

  const measureRenderTime = (componentName) => {
    if (!enabled) return () => {};

    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 16) {
        console.warn(`🐌 Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  };

  return {
    logPerformance,
    measureRenderTime,
    performanceData: performanceDataRef.current
  };
}
