import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function Historial() {
  const [movimientos, setMovimientos] = useState([]);
  const [busqueda,    setBusqueda]    = useState("");

  const cargarMovimientos = async () => {
    const snap = await getDocs(collection(db, "movimientos"));
    setMovimientos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { cargarMovimientos(); }, []);

  const movimientosFiltrados = movimientos.filter(m =>
    m.producto?.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.tecnico?.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.equipo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const entradas = movimientos.filter(m => m.tipo === "entrada").length;
  const salidas  = movimientos.filter(m => ["salida","SALIDA"].includes(m.tipo)).length;

  const stats = [
    { label: "Total",    val: movimientos.length, color: "text-blue-400",    dot: "bg-blue-500" },
    { label: "Entradas", val: entradas,            color: "text-emerald-400", dot: "bg-emerald-500" },
    { label: "Salidas",  val: salidas,             color: "text-red-400",     dot: "bg-red-500" },
  ];

  const esSalida = (tipo) => ["salida","SALIDA"].includes(tipo);

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Historial</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Movimientos del inventario</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-5">
            <div className={`w-2 h-2 rounded-full ${s.dot} mb-3`} />
            <p className="text-zinc-500 text-xs">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* BUSCADOR */}
      <div className="relative mb-5">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar producto, cliente, técnico..."
          className="w-full bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 px-4 py-2.5 rounded-xl text-sm outline-none pl-9" />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
      </div>

      {/* TABLA */}
      <div className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-zinc-100 dark:border-white/5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <span className="col-span-3">Producto</span>
          <span className="col-span-2">Cliente</span>
          <span className="col-span-2">Técnico</span>
          <span className="col-span-2">Equipo</span>
          <span className="col-span-1 text-center">Cant.</span>
          <span className="col-span-2 text-center">Tipo</span>
        </div>

        {movimientosFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center text-zinc-500 text-sm">No hay movimientos registrados</div>
        )}

        {movimientosFiltrados.map((m, i) => (
          <div key={m.id}
            className={`grid grid-cols-12 px-5 py-4 items-center text-sm transition-colors
              ${i % 2 === 0 ? "" : "bg-zinc-50 dark:bg-white/[0.02]"}
              hover:bg-zinc-100 dark:hover:bg-white/5`}
          >
            <span className="col-span-3 font-medium truncate">{m.producto || "—"}</span>
            <span className="col-span-2 text-zinc-500 text-xs truncate">{m.cliente || "—"}</span>
            <span className="col-span-2 text-zinc-500 text-xs truncate">{m.tecnico || "—"}</span>
            <span className="col-span-2 text-zinc-500 text-xs truncate">{m.equipo  || "—"}</span>
            <span className="col-span-1 text-center text-zinc-400">{m.cantidad || 0}</span>
            <span className="col-span-2 text-center">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium
                ${esSalida(m.tipo)
                  ? "bg-red-500/15 text-red-400 border border-red-500/20"
                  : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"}`}>
                {esSalida(m.tipo) ? "Salida" : "Entrada"}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
