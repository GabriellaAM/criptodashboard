"use client";

import React, { useEffect, useRef, useState, useMemo, memo, useCallback } from "react";
import { fetchAndParseData } from "./utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ChartWidget = memo(({ config }) => {
  const [data, setData] = useState(config?.data || []);
  const refreshMs = Math.max(0, Number(config?.refreshSeconds || 0)) * 1000;
  const url = config?.url;

  // Memoizar dados para evitar recálculos desnecessários
  const memoizedData = useMemo(() => {
    return Array.isArray(config?.data) ? config.data : [];
  }, [config?.data]);

  useEffect(() => {
    setData(memoizedData);
  }, [memoizedData]);

  // Memoizar função de fetch para evitar recriação
  const fetchData = useCallback(async () => {
    try {
      const { rows } = await fetchAndParseData(url, config?.format);
      setData(Array.isArray(rows) ? rows : []);
    } catch (e) {
      // silencioso
    }
  }, [url, config?.format]);

  useEffect(() => {
    let timer;
    if (config?.sourceType === 'url' && url && refreshMs > 0) {
      fetchData();
      timer = setInterval(fetchData, refreshMs);
    }
    return () => timer && clearInterval(timer);
  }, [url, refreshMs, config?.sourceType, fetchData]);

  // Memoizar cálculos de chaves para evitar recálculos
  const { xKey, yKeys, hasData } = useMemo(() => {
    const xKey = config?.xField || (data[0] ? Object.keys(data[0])[0] : "");
    const yKeys = (config?.yFields || []).length ? config.yFields : (data[0] ? Object.keys(data[0]).filter((k) => k !== xKey) : []);
    const hasData = Array.isArray(data) && data.length && xKey && yKeys.length;
    
    return { xKey, yKeys, hasData };
  }, [data, config?.xField, config?.yFields]);

  // Memoizar componente do gráfico
  const ChartTag = useMemo(() => {
    return config.chartType === "bar" ? BarChart : config.chartType === "area" ? AreaChart : LineChart;
  }, [config.chartType]);

  // Memoizar elementos do gráfico
  const chartElements = useMemo(() => {
    if (!hasData) return null;

    return yKeys.map((k) => {
      if (config.chartType === "bar") {
        return <Bar key={k} dataKey={k} stackId={config.stacked ? "a" : undefined} fillOpacity={0.9} />;
      }
      if (config.chartType === "area") {
        return <Area key={k} dataKey={k} stackId={config.stacked ? "a" : undefined} type="monotone" fillOpacity={0.25} />;
      }
      return <Line key={k} dataKey={k} type="monotone" dot={false} strokeWidth={2} />;
    });
  }, [yKeys, config.chartType, config.stacked, hasData]);

  if (!hasData) {
    return (
      <div className="w-full h-full grid place-items-center text-sm opacity-70 p-6 text-center">
        <div>
          Configure o gráfico selecionando <b>campo X</b> e pelo menos um <b>campo Y</b>.
          <div className="mt-2">
            Dica: entre no modo edição e clique em <b>Editar</b> para configurar.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minWidth: '600px', minHeight: '400px', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartTag data={data} margin={{ top: 16, right: 20, bottom: 4, left: 10 }}>
          {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} minTickGap={12} />
          <YAxis />
          <Tooltip />
          {config.showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {chartElements}
        </ChartTag>
      </ResponsiveContainer>
    </div>
  );
});

ChartWidget.displayName = 'ChartWidget';

export default ChartWidget;
