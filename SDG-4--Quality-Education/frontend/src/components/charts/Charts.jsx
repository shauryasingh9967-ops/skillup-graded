import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const AXIS = { stroke: '#98a2b3', fontSize: 12, tickLine: false, axisLine: false };
const GRID = <CartesianGrid stroke="#eef0f3" vertical={false} />;
const TIP = { contentStyle: { borderRadius: 8, border: '1px solid #e4e7ec', boxShadow: '0 8px 24px rgba(16,24,40,.12)', fontSize: 12.5 } };

export const STATUS_COLORS = { PRESENT: '#12a072', LATE: '#e0930b', ABSENT: '#d9432b', LEAVE: '#8792a5' };

// Percentage over time (attendance trend, score trend)
export function TrendChart({ data, xKey = 'label', yKey = 'value', name = 'Value', height = 260, area = true }) {
  const Chart = area ? AreaChart : LineChart;
  return (
    <div style={{ width: '100%', height }} role="img" aria-label={`${name} over time`}>
      <ResponsiveContainer>
        <Chart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f4e79" stopOpacity={0.18} /><stop offset="100%" stopColor="#1f4e79" stopOpacity={0} />
            </linearGradient>
          </defs>
          {GRID}
          <XAxis dataKey={xKey} {...AXIS} interval="preserveStartEnd" minTickGap={24} />
          <YAxis domain={[0, 100]} unit="%" {...AXIS} />
          <Tooltip {...TIP} formatter={(v) => [`${v}%`, name]} />
          {area
            ? <Area type="monotone" dataKey={yKey} stroke="#1f4e79" strokeWidth={2.5} fill="url(#trendFill)" dot={{ r: 3, fill: '#1f4e79' }} connectNulls />
            : <Line type="monotone" dataKey={yKey} stroke="#1f4e79" strokeWidth={2.5} dot={{ r: 3, fill: '#1f4e79' }} connectNulls />}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

// Horizontal bars for category comparisons (batches, subjects)
export function BarsChart({ data, nameKey = 'name', valueKey = 'value', unit = '', max, height = 260, color = '#1f4e79' }) {
  return (
    <div style={{ width: '100%', height }} role="img" aria-label="Bar chart">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="#eef0f3" horizontal={false} />
          <XAxis type="number" domain={max ? [0, max] : [0, 'auto']} unit={unit} allowDecimals={false} {...AXIS} />
          <YAxis type="category" dataKey={nameKey} width={130} {...AXIS} tick={{ fontSize: 12, fill: '#475467' }} />
          <Tooltip {...TIP} cursor={{ fill: '#f5f6f8' }} formatter={(v) => [`${v}${unit}`, '']} />
          <Bar dataKey={valueKey} fill={color} radius={[0, 5, 5, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ColumnsChart({ data, xKey, series, height = 240 }) {
  return (
    <div style={{ width: '100%', height }} role="img" aria-label="Column chart">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          {GRID}
          <XAxis dataKey={xKey} {...AXIS} />
          <YAxis domain={[0, 100]} unit="%" {...AXIS} />
          <Tooltip {...TIP} cursor={{ fill: '#f5f6f8' }} formatter={(v) => [`${v}%`, '']} />
          {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[5, 5, 0, 0]} maxBarSize={36} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, height = 220, centerLabel, centerValue }) {
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <div style={{ position: 'relative', width: '100%', height }} role="img" aria-label="Distribution chart">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={total ? 2 : 0} stroke="none">
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip {...TIP} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center' }}>
        <div><div style={{ fontSize: 24, fontWeight: 700 }} className="num">{centerValue}</div><div className="muted" style={{ fontSize: 12 }}>{centerLabel}</div></div>
      </div>
    </div>
  );
}

export function Legend({ items }) {
  return <div className="legend">{items.map((i) => <span key={i.name}><i style={{ background: i.color }} />{i.name}{i.value != null ? ` · ${i.value}` : ''}</span>)}</div>;
}
