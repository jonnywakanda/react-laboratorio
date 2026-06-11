import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
} from "recharts";

export default function Dashboard() {
  const [reparaciones, setReparaciones] = useState([]);
  const [inventario,   setInventario]   = useState([]);
  const [caja,         setCaja]         = useState([]);

  const cargarDatos = async () => {
    try {
      const [repSnap, invSnap, cajaSnap] = await Promise.all([
        getDocs(collection(db, "reparaciones")),
        getDocs(collection(db, "inventario")),
        getDocs(collection(db, "caja")),
      ]);
      setReparaciones(repSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setInventario(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCaja(cajaSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { cargarDatos(); }, []);

  const ingresos  = caja.filter(m => m.tipo === "Ingreso").reduce((t, m) => t + Number(m.monto || 0), 0);
  const gastos    = caja.filter(m => m.tipo === "Gasto").reduce((t, m) => t + Number(m.monto || 0), 0);
  const ganancias = ingresos - gastos;
  const pendientes   = reparaciones.filter(r => r.estado !== "Entregado").length;
  const entregados   = reparaciones.filter(r => r.estado === "Entregado").length;
  const stockBajo    = inventario.filter(i => Number(i.stock) <= 3).length;
  const reparando    = reparaciones.filter(r => r.estado === "Reparando").length;
  const listos       = reparaciones.filter(r => r.estado === "Listo").length;

  const stats = [
    { label: "Ingresos",          val: `S/ ${ingresos}`,  color: "text-emerald-400", dot: "bg-emerald-500", sub: "Total cobrado" },
    { label: "Gastos",            val: `S/ ${gastos}`,    color: "text-red-400",     dot: "bg-red-500",     sub: "Total gastado" },
    { label: "Ganancia neta",     val: `S/ ${ganancias}`, color: ganancias >= 0 ? "text-blue-400" : "text-red-400", dot: "bg-blue-500", sub: "Ingresos − gastos" },
    { label: "En proceso",        val: pendientes,         color: "text-yellow-400",  dot: "bg-yellow-500",  sub: "Sin entregar" },
    { label: "Entregados",        val: entregados,         color: "text-zinc-400",    dot: "bg-zinc-500",    sub: "Completados" },
    { label: "Stock bajo",        val: stockBajo,          color: "text-orange-400",  dot: "bg-orange-500",  sub: "≤ 3 unidades" },
  ];

  const chartData = [
    { nombre: "Ingresos", valor: ingresos },
    { nombre: "Gastos",   valor: gastos },
    { nombre: "Ganancia", valor: ganancias },
  ];

  // Últimas 5 reparaciones
  const recientes = [...reparaciones]
    .sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0))
    .slice(0, 5);

  const ESTADO_STYLES = {
    Recibido:      "bg-blue-500/15 text-blue-400",
    Diagnosticando:"bg-yellow-500/15 text-yellow-400",
    Reparando:     "bg-orange-500/15 text-orange-400",
    Listo:         "bg-emerald-500/15 text-emerald-400",
    Entregado:     "bg-zinc-500/15 text-zinc-400",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Visión General</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          Resumen operacional de {new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-4">
            <div className={`w-2 h-2 rounded-full ${s.dot} mb-3`} />
            <p className="text-zinc-500 text-xs">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.val}</p>
            <p className="text-zinc-600 dark:text-zinc-600 text-[10px] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* GRÁFICA */}
        <div className="xl:col-span-2 bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-5">
          <h2 className="font-semibold mb-1 text-sm">Rendimiento financiero</h2>
          <p className="text-zinc-500 text-xs mb-5">Vista general de caja</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="nombre" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#161b27", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "#a1a1aa" }}
                  itemStyle={{ color: "#10b981" }}
                />
                <Area type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2} fill="url(#colorValor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ESTADO RÁPIDO */}
        <div className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-5">
          <h2 className="font-semibold mb-1 text-sm">Estado actual</h2>
          <p className="text-zinc-500 text-xs mb-5">Equipos en taller</p>
          <div className="space-y-3">
            {[
              { label: "Reparando", val: reparando,  color: "bg-orange-500" },
              { label: "Listo",     val: listos,     color: "bg-emerald-500" },
              { label: "Pendientes",val: pendientes, color: "bg-yellow-500" },
              { label: "Stock bajo",val: stockBajo,  color: "bg-red-500" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-sm text-zinc-400">{item.label}</span>
                </div>
                <span className="font-bold text-sm">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECIENTES */}
      {recientes.length > 0 && (
        <div className="mt-5 bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/5">
            <h2 className="font-semibold text-sm">Reparaciones recientes</h2>
          </div>
          <div className="grid grid-cols-12 px-5 py-3 border-b border-zinc-100 dark:border-white/5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            <span className="col-span-4">Cliente</span>
            <span className="col-span-3">Equipo</span>
            <span className="col-span-2 text-center">Estado</span>
            <span className="col-span-3 text-right">Total</span>
          </div>
          {recientes.map((r, i) => (
            <div key={r.id}
              className={`grid grid-cols-12 px-5 py-3.5 items-center text-sm
                ${i % 2 === 0 ? "" : "bg-zinc-50 dark:bg-white/[0.02]"}`}
            >
              <span className="col-span-4 font-medium">{r.cliente}</span>
              <span className="col-span-3 text-zinc-500 text-xs">{r.equipo}</span>
              <span className="col-span-2 text-center">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${ESTADO_STYLES[r.estado] || "bg-zinc-500/15 text-zinc-400"}`}>
                  {r.estado}
                </span>
              </span>
              <span className="col-span-3 text-right font-medium text-emerald-400">S/ {r.costo}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
