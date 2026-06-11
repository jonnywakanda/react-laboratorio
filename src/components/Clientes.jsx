import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc,
} from "firebase/firestore";

export default function Clientes() {
  // FORM
  const [nombre,     setNombre]     = useState("");
  const [telefono,   setTelefono]   = useState("");
  const [dni,        setDni]        = useState("");
  const [formAbierto,setFormAbierto]= useState(false);
  const [editandoId, setEditandoId] = useState(null);

  // DATOS
  const [clientes,     setClientes]     = useState([]);
  const [reparaciones, setReparaciones] = useState([]);
  const [busqueda,     setBusqueda]     = useState("");
  const [clienteVisto, setClienteVisto] = useState(null); // perfil abierto

  const cargarClientes = async () => {
    const snap = await getDocs(collection(db, "clientes"));
    setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const cargarReparaciones = async () => {
    const snap = await getDocs(collection(db, "reparaciones"));
    setReparaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { cargarClientes(); cargarReparaciones(); }, []);

  // GUARDAR
  const guardarCliente = async () => {
    if (!nombre || !telefono) { alert("Nombre y teléfono son obligatorios"); return; }
    try {
      if (editandoId) {
        await updateDoc(doc(db, "clientes", editandoId), { nombre, telefono, dni });
        setEditandoId(null);
      } else {
        await addDoc(collection(db, "clientes"), {
          nombre, telefono, dni, fecha: new Date(),
        });
      }
      setNombre(""); setTelefono(""); setDni("");
      setFormAbierto(false);
      cargarClientes();
    } catch (e) { console.error(e); alert("Error"); }
  };

  // ELIMINAR
  const eliminarCliente = async (id) => {
    if (!confirm("¿Eliminar cliente?")) return;
    await deleteDoc(doc(db, "clientes", id));
    if (clienteVisto?.id === id) setClienteVisto(null);
    cargarClientes();
  };

  // EDITAR
  const editarCliente = (c) => {
    setNombre(c.nombre); setTelefono(c.telefono); setDni(c.dni || "");
    setEditandoId(c.id); setFormAbierto(true); setClienteVisto(null);
  };

  // REPARACIONES DEL CLIENTE
  const repsDeCliente = (tel) =>
    reparaciones.filter(r =>
      r.telefono?.replace(/\s/g, "") === tel?.replace(/\s/g, "")
    );

  const totalGastado = (tel) =>
    repsDeCliente(tel).reduce((t, r) => t + Number(r.costo || 0), 0);

  const ultimaRep = (tel) => {
    const reps = repsDeCliente(tel);
    if (!reps.length) return null;
    return reps.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0))[0];
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "—";
    const d = fecha.toDate ? fecha.toDate() : fecha.seconds ? new Date(fecha.seconds * 1000) : new Date(fecha);
    return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
  };

  // FILTRO
  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda) ||
    c.dni?.includes(busqueda)
  );

  // STATS
  const totalClientes  = clientes.length;
  const clientesActivos = clientes.filter(c => repsDeCliente(c.telefono).length > 0).length;
  const totalReps      = reparaciones.length;

  const ESTADO_STYLES = {
    Recibido:      "bg-blue-500/15 text-blue-400",
    Diagnosticando:"bg-yellow-500/15 text-yellow-400",
    Reparando:     "bg-orange-500/15 text-orange-400",
    Listo:         "bg-emerald-500/15 text-emerald-400",
    Entregado:     "bg-zinc-500/15 text-zinc-400",
  };

  // ── PERFIL ───────────────────────────────────────────────────────────────
  if (clienteVisto) {
    const reps = repsDeCliente(clienteVisto.telefono);
    const gastado = totalGastado(clienteVisto.telefono);
    const entregados = reps.filter(r => r.estado === "Entregado").length;
    const pendientes = reps.filter(r => r.estado !== "Entregado").length;

    return (
      <div className="p-6 max-w-5xl mx-auto">

        {/* HEADER PERFIL */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setClienteVisto(null)}
            className="p-2 rounded-xl bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 text-zinc-400 hover:text-white transition-all"
          >
            ← 
          </button>
          <div>
            <h1 className="text-2xl font-bold">{clienteVisto.nombre}</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Perfil del cliente</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => editarCliente(clienteVisto)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all">
              Editar
            </button>
            <button onClick={() => eliminarCliente(clienteVisto.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
              Eliminar
            </button>
          </div>
        </div>

        {/* INFO CLIENTE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4 font-medium">Datos del cliente</p>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Nombre</span>
                <span className="font-medium text-sm">{clienteVisto.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Teléfono</span>
                <span className="font-medium text-sm">{clienteVisto.telefono}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">DNI</span>
                <span className="font-medium text-sm">{clienteVisto.dni || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Registrado</span>
                <span className="font-medium text-sm">{formatFecha(clienteVisto.fecha)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Reparaciones",  val: reps.length,      color: "text-blue-400",    dot: "bg-blue-500" },
              { label: "Total gastado", val: `S/ ${gastado}`,  color: "text-emerald-400", dot: "bg-emerald-500" },
              { label: "Entregados",    val: entregados,        color: "text-zinc-400",    dot: "bg-zinc-500" },
              { label: "En proceso",    val: pendientes,        color: "text-yellow-400",  dot: "bg-yellow-500" },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-4">
                <div className={`w-2 h-2 rounded-full ${s.dot} mb-2`} />
                <p className="text-zinc-500 text-xs">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* HISTORIAL REPARACIONES */}
        <div className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/5">
            <h2 className="font-semibold text-sm">Historial de reparaciones</h2>
          </div>

          {reps.length === 0 && (
            <div className="px-5 py-10 text-center text-zinc-500 text-sm">
              Este cliente no tiene reparaciones registradas
            </div>
          )}

          <div className="divide-y divide-zinc-100 dark:divide-white/5">
            {[...reps].sort((a,b) => (b.fecha?.seconds||0)-(a.fecha?.seconds||0)).map(r => (
              <div key={r.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{r.equipo}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_STYLES[r.estado] || "bg-zinc-500/15 text-zinc-400"}`}>
                      {r.estado}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">{r.falla} · Técnico: {r.tecnico}</p>
                  <p className="text-xs text-zinc-600">{formatFecha(r.fecha)}</p>
                </div>
                <div className="flex gap-4 text-sm shrink-0">
                  <div className="text-center">
                    <p className="text-zinc-500 text-xs">Total</p>
                    <p className="font-bold text-emerald-400">S/ {r.costo}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-zinc-500 text-xs">Saldo</p>
                    <p className="font-bold text-red-400">S/ {r.saldo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── LISTA CLIENTES ───────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Registro y seguimiento de clientes</p>
        </div>
        <button
          onClick={() => { setFormAbierto(!formAbierto); setEditandoId(null); }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
        >
          <span className="text-lg leading-none">+</span>
          Nuevo cliente
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Clientes registrados", val: totalClientes,   color: "text-blue-400",    dot: "bg-blue-500" },
          { label: "Con reparaciones",     val: clientesActivos, color: "text-emerald-400", dot: "bg-emerald-500" },
          { label: "Total reparaciones",   val: totalReps,       color: "text-yellow-400",  dot: "bg-yellow-500" },
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
          <h2 className="font-semibold mb-5 text-xs text-zinc-400 uppercase tracking-wider">
            {editandoId ? "Editar cliente" : "Nuevo cliente"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Nombre completo" value={nombre}   onChange={setNombre}   placeholder="Juan Pérez" />
            <Field label="Teléfono"        value={telefono} onChange={setTelefono} placeholder="987654321" />
            <Field label="DNI (opcional)"  value={dni}      onChange={setDni}      placeholder="12345678" />
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={guardarCliente}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">
              {editandoId ? "Actualizar" : "Guardar cliente"}
            </button>
            <button onClick={() => { setFormAbierto(false); setEditandoId(null); }}
              className="bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* BUSCADOR */}
      <div className="relative mb-5">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, teléfono o DNI..."
          className="w-full bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 px-4 py-2.5 rounded-xl text-sm outline-none pl-9" />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
      </div>

      {/* TABLA */}
      <div className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-zinc-100 dark:border-white/5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <span className="col-span-3">Cliente</span>
          <span className="col-span-2">Teléfono</span>
          <span className="col-span-2">DNI</span>
          <span className="col-span-1 text-center">Reps.</span>
          <span className="col-span-2 text-center">Total gastado</span>
          <span className="col-span-2 text-right">Acciones</span>
        </div>

        {clientesFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center text-zinc-500 text-sm">No hay clientes registrados</div>
        )}

        {clientesFiltrados.map((c, i) => {
          const reps  = repsDeCliente(c.telefono);
          const gasto = totalGastado(c.telefono);
          const ultima = ultimaRep(c.telefono);

          return (
            <div key={c.id}
              className={`grid grid-cols-12 px-5 py-4 items-center text-sm transition-colors cursor-pointer
                ${i % 2 === 0 ? "" : "bg-zinc-50 dark:bg-white/[0.02]"}
                hover:bg-zinc-100 dark:hover:bg-white/5`}
              onClick={() => setClienteVisto(c)}
            >
              <div className="col-span-3">
                <p className="font-medium">{c.nombre}</p>
                {ultima && (
                  <p className="text-xs text-zinc-500 mt-0.5">Último: {formatFecha(ultima.fecha)}</p>
                )}
              </div>
              <span className="col-span-2 text-zinc-400 text-xs">{c.telefono}</span>
              <span className="col-span-2 text-zinc-500 text-xs">{c.dni || "—"}</span>
              <span className="col-span-1 text-center">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400">
                  {reps.length}
                </span>
              </span>
              <span className="col-span-2 text-center font-bold text-emerald-400 text-sm">
                {gasto > 0 ? `S/ ${gasto}` : "—"}
              </span>
              <div className="col-span-2 flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                <button onClick={() => editarCliente(c)}
                  className="p-1.5 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 transition-all text-xs">
                  ✏️
                </button>
                <button onClick={() => eliminarCliente(c.id)}
                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all text-xs">
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>
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
