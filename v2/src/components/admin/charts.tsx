"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatClp } from "@/data/packs";

const COLORS = [
  "#36f073",
  "#f7c64b",
  "#0e7a32",
  "#d8c28a",
  "#b87817",
  "#5ec8ff",
];

const tooltipStyle = {
  background: "#07160b",
  border: "1px solid rgba(247,198,75,0.25)",
  borderRadius: 8,
  color: "#fff5d4",
  fontSize: 12,
};

export function RevenueOrdersChart({
  data,
}: {
  data: Array<{ label: string; revenue: number; orders: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#d8c28a", fontSize: 11 }} />
        <YAxis
          yAxisId="clp"
          tick={{ fill: "#d8c28a", fontSize: 11 }}
          tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
        />
        <YAxis
          yAxisId="orders"
          orientation="right"
          tick={{ fill: "#d8c28a", fontSize: 11 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => {
            const n = Number(value) || 0;
            if (name === "revenue" || name === "Dinero cobrado") {
              return [formatClp(n), "Dinero cobrado"];
            }
            return [n, "Cantidad de compras"];
          }}
        />
        <Legend />
        <Bar
          yAxisId="orders"
          dataKey="orders"
          name="Cantidad de compras"
          fill="#0e7a32"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
        <Line
          yAxisId="clp"
          type="monotone"
          dataKey="revenue"
          name="Dinero cobrado"
          stroke="#f7c64b"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function CumulativeRevenueChart({
  data,
  breakEven,
  goalLabel = "Meta del premio",
}: {
  data: Array<{ label: string; cumulative: number }>;
  breakEven: number;
  goalLabel?: string;
}) {
  const withGoal = data.map((d) => ({ ...d, breakEven }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={withGoal}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#d8c28a", fontSize: 11 }} />
        <YAxis
          tick={{ fill: "#d8c28a", fontSize: 11 }}
          tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [
            formatClp(Number(value) || 0),
            name === "cumulative" ? "Dinero juntado" : goalLabel,
          ]}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          name="Dinero juntado"
          stroke="#36f073"
          fill="rgba(54,240,115,0.2)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="breakEven"
          name={goalLabel}
          stroke="#f7c64b"
          fill="transparent"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CumulativeTicketsChart({
  data,
  ticketGoal,
  minTicketGoal,
  goalLabel = "Meta del ciclo",
  minGoalLabel = "Meta mínima",
}: {
  data: Array<{ label: string; cumulative: number }>;
  ticketGoal: number;
  minTicketGoal?: number;
  goalLabel?: string;
  minGoalLabel?: string;
}) {
  const withGoal = data.map((d) => ({
    ...d,
    ticketGoal,
    ...(minTicketGoal != null && minTicketGoal > 0
      ? { minTicketGoal }
      : {}),
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={withGoal}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#d8c28a", fontSize: 11 }} />
        <YAxis tick={{ fill: "#d8c28a", fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => {
            const n = Number(value) || 0;
            if (name === "cumulative") return [n, "Tickets vendidos"];
            if (name === "minTicketGoal" || name === minGoalLabel) {
              return [n, minGoalLabel];
            }
            return [n, goalLabel];
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          name="Tickets vendidos"
          stroke="#36f073"
          fill="rgba(54,240,115,0.2)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="ticketGoal"
          name={goalLabel}
          stroke="#f7c64b"
          fill="transparent"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
        {minTicketGoal != null && minTicketGoal > 0 ? (
          <Area
            type="monotone"
            dataKey="minTicketGoal"
            name={minGoalLabel}
            stroke="#7eb6ff"
            fill="transparent"
            strokeWidth={2}
            strokeDasharray="2 4"
          />
        ) : null}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({
  data,
  dataKey,
  nameKey = "name",
  color = "#36f073",
  valueIsMoney = false,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  nameKey?: string;
  color?: string;
  valueIsMoney?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#d8c28a", fontSize: 11 }}
          tickFormatter={(v) =>
            valueIsMoney ? `$${Math.round(Number(v) / 1000)}k` : String(v)
          }
        />
        <YAxis
          type="category"
          dataKey={nameKey}
          width={110}
          tick={{ fill: "#fff5d4", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) =>
            valueIsMoney
              ? formatClp(Number(value) || 0)
              : String(Number(value) || 0)
          }
        />
        <Bar dataKey={dataKey} fill={color} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  dataKey = "revenue",
  nameKey = "name",
}: {
  data: Array<Record<string, string | number>>;
  dataKey?: string;
  nameKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [
            formatClp(Number(value) || 0),
            String(name),
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function FunnelBars({
  data,
}: {
  data: Array<{ stage: string; value: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="stage" tick={{ fill: "#d8c28a", fontSize: 11 }} />
        <YAxis tick={{ fill: "#d8c28a", fontSize: 11 }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar
          dataKey="value"
          name="Personas / pedidos"
          fill="#f7c64b"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
