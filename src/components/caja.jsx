import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import jsPDF from "jspdf";

// ── Utilidades de fecha ──────────────────────────────────────────────────────
const toDate = (fecha) => {
  if (!fecha) return null;
  if (fecha.toDate) return fecha.toDate();
  if (fecha.seconds) return new Date(fecha.seconds * 1000);
  return new Date(fecha);
};

const esHoy = (fecha) => {
  const d = toDate(fecha);
  if (!d) return false;
  const hoy = new Date();
  return d.getDate() === hoy.getDate() &&
    d.getMonth() === hoy.getMonth() &&
    d.getFullYear() === hoy.getFullYear();
};

const estaEnSemana = (fecha) => {
  const d = toDate(fecha);
  if (!d) return false;
  const hoy = new Date();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
  lunes.setHours(0, 0, 0, 0);
  return d >= lunes;
};

const estaEnMes = (fecha) => {
  const d = toDate(fecha);
  if (!d) return false;
  const hoy = new Date();
  return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
};

const formatFecha = (fecha) => {
  const d = toDate(fecha);
  if (!d) return "—";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const calcBalance = (movs) => {
  const ingresos = movs.filter(m => m.tipo === "Ingreso").reduce((t, m) => t + Number(m.monto || 0), 0);
  const gastos   = movs.filter(m => m.tipo === "Gasto").reduce((t, m) => t + Number(m.monto || 0), 0);
  return { ingresos, gastos, balance: ingresos - gastos };
};

export default function Caja() {
  const [detalle,     setDetalle]     = useState("");
  const [monto,       setMonto]       = useState("");
  const [tipo,        setTipo]        = useState("Ingreso");
  const [movimientos, setMovimientos] = useState([]);
  const [cierres,     setCierres]     = useState([]);
  const [busqueda,    setBusqueda]    = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [tab,         setTab]         = useState("movimientos"); // movimientos | cierre | historial
  const [periodoTab,  setPeriodoTab]  = useState("dia"); // dia | semana | mes

  const cargarMovimientos = async () => {
    const snap = await getDocs(collection(db, "caja"));
    setMovimientos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const cargarCierres = async () => {
    const snap = await getDocs(collection(db, "cierres_caja"));
    const datos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    datos.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0));
    setCierres(datos);
  };

  useEffect(() => { cargarMovimientos(); cargarCierres(); }, []);

  // GUARDAR MOVIMIENTO
  const guardarMovimiento = async () => {
    if (!detalle || !monto) { alert("Completa todos los campos"); return; }
    try {
      await addDoc(collection(db, "caja"), {
        detalle, monto: Number(monto), tipo, fecha: new Date(),
      });
      setDetalle(""); setMonto(""); setTipo("Ingreso"); setFormAbierto(false);
      cargarMovimientos();
    } catch (e) { console.error(e); }
  };

  // CIERRE DE CAJA
  const realizarCierre = async () => {
    if (!confirm("¿Confirmar cierre de caja del día?")) return;
    const movsHoy = movimientos.filter(m => esHoy(m.fecha));
    const { ingresos, gastos, balance } = calcBalance(movsHoy);
    try {
      await addDoc(collection(db, "cierres_caja"), {
        fecha: new Date(),
        ingresos, gastos, balance,
        totalMovimientos: movsHoy.length,
      });
      alert("Cierre de caja guardado correctamente");
      cargarCierres();
    } catch (e) { console.error(e); alert("Error al guardar cierre"); }
  };

  // PDF CIERRE
  const exportarPDF = (periodo, movsPerido) => {
    const { ingresos, gastos, balance } = calcBalance(movsPerido);
    const pdf = new jsPDF();
    const now  = new Date();

    pdf.setFontSize(18);
    pdf.text("LABORATORIO ANDROID", 20, 20);
    pdf.setFontSize(11);
    pdf.text(`Cierre de Caja — ${periodo.toUpperCase()}`, 20, 30);
    pdf.text(`Generado: ${now.toLocaleDateString("es-PE")} ${now.toLocaleTimeString("es-PE")}`, 20, 38);

    pdf.setDrawColor(200);
    pdf.line(20, 44, 190, 44);

    pdf.setFontSize(12);
    pdf.text(`Total movimientos: ${movsPerido.length}`, 20, 54);
    pdf.text(`Ingresos:  S/ ${ingresos}`, 20, 64);
    pdf.text(`Gastos:    S/ ${gastos}`, 20, 74);
    pdf.text(`Balance:   S/ ${balance}`, 20, 84);

    pdf.line(20, 90, 190, 90);
    pdf.setFontSize(10);
    pdf.text("Detalle de movimientos:", 20, 98);

    let y = 106;
    movsPerido.forEach((m) => {
      if (y > 270) { pdf.addPage(); y = 20; }
      const fecha = formatFecha(m.fecha);
      pdf.text(`${m.tipo === "Ingreso" ? "+" : "-"} S/ ${m.monto}  ${m.detalle}  (${fecha})`, 20, y);
      y += 7;
    });

    pdf.save(`cierre-${periodo}-${now.toISOString().split("T")[0]}.pdf`);
  };

  // FILTROS
  const movsFiltrados = movimientos.filter(m =>
    m.detalle?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const movsHoy    = movimientos.filter(m => esHoy(m.fecha));
  const movsSemana = movimientos.filter(m => estaEnSemana(m.fecha));
  const movsMes    = movimientos.filter(m => estaEnMes(m.fecha));

  const movsActivos = periodoTab === "dia" ? movsHoy : periodoTab === "semana" ? movsSemana : movsMes;
  const { ingresos: ingA, gastos: gasA, balance: balA } = calcBalance(movsActivos);

  // Stats globales
  const { ingresos, gastos, balance } = calcBalance(movimientos);

  const now = new Date();
  const hora = now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  const fechaHoy = now.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* HEADER */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Caja Diaria</h1>
          <p className="text-zinc-500 text-sm mt-0.5 capitalize">{fechaHoy} · {hora}</p>
        </div>
        <button
          onClick={() => setFormAbierto(!formAbierto)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
        >
          <span className="text-lg leading-none">+</span>
          Nuevo movimiento
        </button>
      </div>

      {/* STATS GLOBALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Ingresos totales", val: `S/ ${ingresos}`, color: "text-emerald-400", dot: "bg-emerald-500" },
          { label: "Gastos totales",   val: `S/ ${gastos}`,   color: "text-red-400",     dot: "bg-red-500" },
          { label: "Balance total",    val: `S/ ${balance}`,  color: balance >= 0 ? "text-blue-400" : "text-red-400", dot: "bg-blue-500" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-5">
            <div className={`w-2 h-2 rounded-full ${s.dot} mb-3`} />
            <p className="text-zinc-500 text-xs">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* FORMULARIO */}
      {formAbierto && (
        <div className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold mb-5 text-xs text-zinc-400 uppercase tracking-wider">Nuevo movimiento</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Field label="Detalle" value={detalle} onChange={setDetalle} placeholder="Pago de cliente / Compra repuesto" />
            </div>
            <Field label="Monto (S/)" value={monto} onChange={setMonto} placeholder="150" />
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-[#0f1117] border border-zinc-200 dark:border-white/5 px-3 py-2.5 rounded-xl text-sm outline-none">
                <option>Ingreso</option>
                <option>Gasto</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={guardarMovimiento}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">
              Guardar
            </button>
            <button onClick={() => setFormAbierto(false)}
              className="bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-1 bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-xl p-1 mb-6 w-fit">
        {[
          { id: "movimientos", label: "Movimientos" },
          { id: "cierre",      label: "Cierre de caja" },
          { id: "historial",   label: "Historial cierres" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.id
                ? "bg-emerald-500 text-black"
                : "text-zinc-500 hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: MOVIMIENTOS ─────────────────────────────────────────── */}
      {tab === "movimientos" && (
        <>
          <div className="relative mb-5">
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar movimiento..."
              className="w-full bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 px-4 py-2.5 rounded-xl text-sm outline-none pl-9" />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>

          <div className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-zinc-100 dark:border-white/5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <span className="col-span-5">Detalle</span>
              <span className="col-span-3">Fecha</span>
              <span className="col-span-2 text-center">Tipo</span>
              <span className="col-span-2 text-right">Monto</span>
            </div>

            {movsFiltrados.length === 0 && (
              <div className="px-5 py-10 text-center text-zinc-500 text-sm">No hay movimientos registrados</div>
            )}

            {[...movsFiltrados].reverse().map((m, i) => (
              <div key={m.id}
                className={`grid grid-cols-12 px-5 py-3.5 items-center text-sm transition-colors
                  ${i % 2 === 0 ? "" : "bg-zinc-50 dark:bg-white/[0.02]"}
                  hover:bg-zinc-100 dark:hover:bg-white/5`}>
                <span className="col-span-5 font-medium truncate">{m.detalle}</span>
                <span className="col-span-3 text-zinc-500 text-xs">{formatFecha(m.fecha)}</span>
                <span className="col-span-2 text-center">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${m.tipo === "Ingreso"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/15 text-red-400 border border-red-500/20"}`}>
                    {m.tipo}
                  </span>
                </span>
                <span className={`col-span-2 text-right font-bold
                  ${m.tipo === "Ingreso" ? "text-emerald-400" : "text-red-400"}`}>
                  {m.tipo === "Ingreso" ? "+" : "-"}S/ {m.monto}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── TAB: CIERRE DE CAJA ──────────────────────────────────────── */}
      {tab === "cierre" && (
        <div className="space-y-5">

          {/* Sub-tabs período */}
          <div className="flex gap-1 bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-xl p-1 w-fit">
            {[
              { id: "dia",    label: "Hoy" },
              { id: "semana", label: "Esta semana" },
              { id: "mes",    label: "Este mes" },
            ].map(t => (
              <button key={t.id} onClick={() => setPeriodoTab(t.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${periodoTab === t.id
                    ? "bg-[#0f1117] text-white dark:bg-white/10"
                    : "text-zinc-500 hover:text-white"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Resumen del período */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "Ingresos", val: `S/ ${ingA}`, color: "text-emerald-400", dot: "bg-emerald-500" },
              { label: "Gastos",   val: `S/ ${gasA}`, color: "text-red-400",     dot: "bg-red-500" },
              { label: "Balance",  val: `S/ ${balA}`, color: balA >= 0 ? "text-blue-400" : "text-red-400", dot: "bg-blue-500" },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-5">
                <div className={`w-2 h-2 rounded-full ${s.dot} mb-3`} />
                <p className="text-zinc-500 text-xs">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.val}</p>
                <p className="text-zinc-600 text-xs mt-1">{movsActivos.length} movimientos</p>
              </div>
            ))}
          </div>

          {/* Movimientos del período */}
          <div className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-zinc-100 dark:border-white/5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <span className="col-span-5">Detalle</span>
              <span className="col-span-3">Fecha</span>
              <span className="col-span-2 text-center">Tipo</span>
              <span className="col-span-2 text-right">Monto</span>
            </div>
            {movsActivos.length === 0 && (
              <div className="px-5 py-10 text-center text-zinc-500 text-sm">
                No hay movimientos en este período
              </div>
            )}
            {[...movsActivos].reverse().map((m, i) => (
              <div key={m.id}
                className={`grid grid-cols-12 px-5 py-3.5 items-center text-sm
                  ${i % 2 === 0 ? "" : "bg-zinc-50 dark:bg-white/[0.02]"}`}>
                <span className="col-span-5 font-medium truncate">{m.detalle}</span>
                <span className="col-span-3 text-zinc-500 text-xs">{formatFecha(m.fecha)}</span>
                <span className="col-span-2 text-center">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${m.tipo === "Ingreso"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/15 text-red-400 border border-red-500/20"}`}>
                    {m.tipo}
                  </span>
                </span>
                <span className={`col-span-2 text-right font-bold
                  ${m.tipo === "Ingreso" ? "text-emerald-400" : "text-red-400"}`}>
                  {m.tipo === "Ingreso" ? "+" : "-"}S/ {m.monto}
                </span>
              </div>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap gap-3">
            {periodoTab === "dia" && (
              <button onClick={realizarCierre}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2.5 rounded-xl text-sm transition-all">
                ✓ Realizar cierre del día
              </button>
            )}
            <button
              onClick={() => exportarPDF(
                periodoTab === "dia" ? "dia" : periodoTab === "semana" ? "semana" : "mes",
                movsActivos
              )}
              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all border border-blue-500/20">
              ↓ Exportar PDF
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: HISTORIAL CIERRES ───────────────────────────────────── */}
      {tab === "historial" && (
        <div className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 border-b border-zinc-100 dark:border-white/5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            <span className="col-span-4">Fecha de cierre</span>
            <span className="col-span-2 text-center">Movimientos</span>
            <span className="col-span-2 text-center">Ingresos</span>
            <span className="col-span-2 text-center">Gastos</span>
            <span className="col-span-2 text-right">Balance</span>
          </div>

          {cierres.length === 0 && (
            <div className="px-5 py-10 text-center text-zinc-500 text-sm">No hay cierres registrados</div>
          )}

          {cierres.map((c, i) => (
            <div key={c.id}
              className={`grid grid-cols-12 px-5 py-4 items-center text-sm
                ${i % 2 === 0 ? "" : "bg-zinc-50 dark:bg-white/[0.02]"}`}>
              <span className="col-span-4 font-medium text-xs">{formatFecha(c.fecha)}</span>
              <span className="col-span-2 text-center text-zinc-400">{c.totalMovimientos}</span>
              <span className="col-span-2 text-center text-emerald-400 font-medium">S/ {c.ingresos}</span>
              <span className="col-span-2 text-center text-red-400 font-medium">S/ {c.gastos}</span>
              <span className={`col-span-2 text-right font-bold
                ${c.balance >= 0 ? "text-blue-400" : "text-red-400"}`}>
                S/ {c.balance}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-zinc-100 dark:bg-[#0f1117] border border-zinc-200 dark:border-white/5 px-3 py-2.5 rounded-xl text-sm outline-none focus:border-emerald-500/50 transition-all" />
    </div>
  );
}
