import { useEffect, useState } from "react";
import { db, storage } from "../firebase";
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import jsPDF from "jspdf";

const ESTADO_STYLES = {
  Recibido:      "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  Diagnosticando:"bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  Reparando:     "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  Listo:         "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  Entregado:     "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20",
};

export default function Reparaciones() {
  const [cliente,      setCliente]      = useState("");
  const [telefono,     setTelefono]     = useState("");
  const [equipo,       setEquipo]       = useState("");
  const [falla,        setFalla]        = useState("");
  const [costo,        setCosto]        = useState("");
  const [adelanto,     setAdelanto]     = useState("");
  const [tecnico,      setTecnico]      = useState("");
  const [tipoRepuesto, setTipoRepuesto] = useState("inventario");
  const [repuesto,     setRepuesto]     = useState("");
  const [costoExterno, setCostoExterno] = useState("");
  const [imagen,       setImagen]       = useState(null);

  // Guardamos el repuesto ORIGINAL al editar para poder devolver stock
  const [repuestoOriginal, setRepuestoOriginal] = useState("");

  const [reparaciones, setReparaciones] = useState([]);
  const [productos,    setProductos]    = useState([]);
  const [busqueda,     setBusqueda]     = useState("");
  const [editandoId,   setEditandoId]   = useState(null);
  const [formAbierto,  setFormAbierto]  = useState(false);

  const cargarProductos = async () => {
    const snap = await getDocs(collection(db, "inventario"));
    setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const cargarReparaciones = async () => {
    const snap = await getDocs(collection(db, "reparaciones"));
    setReparaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { cargarReparaciones(); cargarProductos(); }, []);

  // ── GUARDAR / EDITAR ─────────────────────────────────────────────────────
  const guardarReparacion = async () => {
    if (!cliente || !telefono || !equipo || !falla || !costo) {
      alert("Completa todos los campos"); return;
    }

    try {
      let imagenURL = "";

      if (imagen) {
        const imagenRef = ref(storage, `reparaciones/${Date.now()}-${imagen.name}`);
        await uploadBytes(imagenRef, imagen);
        imagenURL = await getDownloadURL(imagenRef);
      }

      // ── MODO EDICIÓN ────────────────────────────────────────────────────
      if (editandoId) {

        // 1. Calcular costoRepuesto y gananciaReal según el nuevo repuesto
        let costoRepuestoFinal = 0;
        let gananciaRealFinal  = Number(costo);

        if (tipoRepuesto === "inventario" && repuesto) {
          const prod = productos.find(p => p.nombre === repuesto);
          if (prod) {
            costoRepuestoFinal = Number(prod.precio || 0);
            gananciaRealFinal  = Number(costo) - costoRepuestoFinal;
          }
        } else if (tipoRepuesto === "externo" && costoExterno) {
          costoRepuestoFinal = Number(costoExterno);
          gananciaRealFinal  = Number(costo) - costoRepuestoFinal;
        }

        // 2. Manejar cambio de repuesto en inventario
        const repuestoChanged = repuesto !== repuestoOriginal;

        if (repuestoChanged) {
          // Devolver stock del repuesto anterior (si era de inventario)
          if (repuestoOriginal) {
            const prodAnterior = productos.find(p => p.nombre === repuestoOriginal);
            if (prodAnterior) {
              await updateDoc(doc(db, "inventario", prodAnterior.id), {
                stock: Number(prodAnterior.stock) + 1,
              });
              await addDoc(collection(db, "movimientos"), {
                producto: prodAnterior.nombre, tipo: "entrada", cantidad: 1,
                detalle: `Devolución por edición de reparación de ${cliente}`, fecha: new Date(),
              });
            }
          }

          // Descontar stock del nuevo repuesto (si es de inventario)
          if (tipoRepuesto === "inventario" && repuesto) {
            const prodNuevo = productos.find(p => p.nombre === repuesto);
            if (prodNuevo) {
              const nuevoStock = Number(prodNuevo.stock) - 1;
              if (nuevoStock < 0) { alert("No hay stock disponible para el nuevo repuesto"); return; }
              await updateDoc(doc(db, "inventario", prodNuevo.id), { stock: nuevoStock });
              await addDoc(collection(db, "movimientos"), {
                producto: prodNuevo.nombre, tipo: "SALIDA", cantidad: 1,
                tecnico, cliente, equipo,
                detalle: `Usado en reparación de ${cliente} (edición)`, fecha: new Date(),
              });
            }
          }
        }

        // 3. Actualizar la reparación con todos los datos recalculados
        await updateDoc(doc(db, "reparaciones", editandoId), {
          cliente, telefono, equipo, falla, costo, adelanto,
          saldo:            Number(costo) - Number(adelanto),
          tecnico,          tipoRepuesto, repuesto, costoExterno,
          costoRepuesto:    costoRepuestoFinal,
          gananciaReal:     gananciaRealFinal,
          ganancia:         gananciaRealFinal,
          ...(imagenURL && { imagen: imagenURL }),
        });

        setEditandoId(null);
        setRepuestoOriginal("");

      // ── MODO CREAR ──────────────────────────────────────────────────────
      } else {
        const nuevaRep = await addDoc(collection(db, "reparaciones"), {
          cliente, telefono, equipo, falla, costo, adelanto,
          saldo:         Number(costo) - Number(adelanto),
          ganancia:      Number(costo) - Number(costoExterno || 0),
          costoRepuesto: 0,
          gananciaReal:  Number(costo),
          tecnico,       tipoRepuesto, repuesto, costoExterno,
          imagen:        imagenURL,
          estado:        "Recibido",
          cajaRegistrada: false,
          fecha:         new Date(),
        });

        // Descontar stock si usa repuesto de inventario
        if (tipoRepuesto === "inventario" && repuesto) {
          const prod = productos.find(p => p.nombre === repuesto);
          if (prod) {
            const nuevoStock = Number(prod.stock) - 1;
            if (nuevoStock < 0) { alert("No hay stock disponible"); return; }
            await updateDoc(doc(db, "inventario", prod.id), { stock: nuevoStock });
            await addDoc(collection(db, "movimientos"), {
              producto: prod.nombre, tipo: "SALIDA", cantidad: 1,
              tecnico, cliente, equipo,
              detalle: `Usado en reparación de ${cliente}`, fecha: new Date(),
            });
            await updateDoc(doc(db, "reparaciones", nuevaRep.id), {
              costoRepuesto: Number(prod.precio),
              gananciaReal:  Number(costo) - Number(prod.precio),
              ganancia:      Number(costo) - Number(prod.precio),
            });
          }
        }
      }

      // Limpiar
      setCliente(""); setTelefono(""); setEquipo(""); setFalla("");
      setCosto(""); setAdelanto(""); setTecnico(""); setImagen(null);
      setRepuesto(""); setCostoExterno(""); setTipoRepuesto("inventario");
      setFormAbierto(false);
      cargarReparaciones();
      cargarProductos(); // recargar para ver stock actualizado
    } catch (e) { console.error(e); alert("Error al guardar"); }
  };

  // ── CAMBIAR ESTADO (anti-duplicado caja) ─────────────────────────────────
  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const rep = reparaciones.find(r => r.id === id);
      if (!rep || rep.estado === nuevoEstado) return;

      await updateDoc(doc(db, "reparaciones", id), { estado: nuevoEstado });

      if (nuevoEstado === "Entregado" && !rep.cajaRegistrada) {
        await addDoc(collection(db, "caja"), {
          detalle: `Pago reparación de ${rep.cliente} (${rep.equipo})`,
          monto: Number(rep.saldo || 0), tipo: "Ingreso", fecha: new Date(),
        });
        await updateDoc(doc(db, "reparaciones", id), { cajaRegistrada: true });
      }

      cargarReparaciones();
    } catch (e) { console.error(e); }
  };

  // ── ELIMINAR ─────────────────────────────────────────────────────────────
  const eliminarReparacion = async (id) => {
    if (!confirm("¿Eliminar reparación?")) return;

    // Devolver stock si tenía repuesto de inventario
    const rep = reparaciones.find(r => r.id === id);
    if (rep?.tipoRepuesto === "inventario" && rep?.repuesto) {
      const prod = productos.find(p => p.nombre === rep.repuesto);
      if (prod) {
        await updateDoc(doc(db, "inventario", prod.id), {
          stock: Number(prod.stock) + 1,
        });
        await addDoc(collection(db, "movimientos"), {
          producto: prod.nombre, tipo: "entrada", cantidad: 1,
          detalle: `Devolución por eliminación de reparación de ${rep.cliente}`, fecha: new Date(),
        });
      }
    }

    await deleteDoc(doc(db, "reparaciones", id));
    cargarReparaciones();
    cargarProductos();
  };

  // ── EDITAR (carga datos + guarda repuesto original) ──────────────────────
  const editarReparacion = (rep) => {
    setCliente(rep.cliente);       setTelefono(rep.telefono);
    setEquipo(rep.equipo);         setFalla(rep.falla);
    setCosto(rep.costo || "");     setAdelanto(rep.adelanto || "");
    setTecnico(rep.tecnico || ""); setTipoRepuesto(rep.tipoRepuesto || "inventario");
    setRepuesto(rep.repuesto || ""); setCostoExterno(rep.costoExterno || "");
    // Guardar repuesto original para comparar al guardar
    setRepuestoOriginal(rep.tipoRepuesto === "inventario" ? (rep.repuesto || "") : "");
    setEditandoId(rep.id);
    setFormAbierto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── PDF PROFESIONAL ──────────────────────────────────────────────────────
  const generarPDF = (rep) => {
    const pdf = new jsPDF();
    const now = new Date();

    pdf.setFillColor(22, 27, 39);
    pdf.rect(0, 0, 210, 40, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20); pdf.setFont("helvetica", "bold");
    pdf.text("LABORATORIO ANDROID", 20, 18);
    pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
    pdf.setTextColor(160, 160, 160);
    pdf.text("Sistema Técnico Profesional", 20, 26);
    pdf.text(`Generado: ${now.toLocaleDateString("es-PE")} ${now.toLocaleTimeString("es-PE")}`, 20, 33);

    pdf.setDrawColor(16, 185, 129);
    pdf.setLineWidth(1);
    pdf.line(0, 40, 210, 40);

    pdf.setTextColor(16, 185, 129);
    pdf.setFontSize(11); pdf.setFont("helvetica", "bold");
    pdf.text("ORDEN DE SERVICIO", 130, 55);
    pdf.setFontSize(9); pdf.setTextColor(100, 100, 100);
    pdf.text(`ID: ${rep.id?.slice(0, 8).toUpperCase()}`, 130, 63);

    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(10); pdf.setFont("helvetica", "bold");
    pdf.text("DATOS DEL CLIENTE", 20, 55);
    pdf.setDrawColor(200, 200, 200); pdf.line(20, 57, 100, 57);

    const clienteData = [
      ["Cliente:",  rep.cliente],
      ["Teléfono:", rep.telefono],
      ["Equipo:",   rep.equipo],
      ["Falla:",    rep.falla],
      ["Técnico:",  rep.tecnico || "—"],
    ];
    clienteData.forEach(([label, val], i) => {
      pdf.setFont("helvetica", "normal"); pdf.setTextColor(120, 120, 120);
      pdf.text(label, 20, 67 + i * 9);
      pdf.setFont("helvetica", "bold"); pdf.setTextColor(30, 30, 30);
      pdf.text(String(val || "—"), 55, 67 + i * 9);
    });

    pdf.setFillColor(245, 245, 245);
    pdf.roundedRect(20, 120, 170, 55, 3, 3, "F");
    pdf.setTextColor(30, 30, 30); pdf.setFontSize(10); pdf.setFont("helvetica", "bold");
    pdf.text("RESUMEN DE PAGO", 30, 132);

    const pagos = [
      ["Costo total:", `S/ ${rep.costo}`,         false],
      ["Adelanto:",    `S/ ${rep.adelanto || 0}`,  false],
      ["Saldo:",       `S/ ${rep.saldo || 0}`,     true],
    ];
    pagos.forEach(([label, val, rojo], i) => {
      pdf.setFont("helvetica", "normal"); pdf.setTextColor(100, 100, 100);
      pdf.text(label, 30, 142 + i * 9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(rojo ? 220 : 30, rojo ? 50 : 30, 50);
      pdf.text(val, 120, 142 + i * 9);
    });

    pdf.setFillColor(16, 185, 129);
    pdf.roundedRect(20, 182, 65, 12, 3, 3, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(9); pdf.setFont("helvetica", "bold");
    pdf.text(`Estado: ${rep.estado}`, 25, 190);

    pdf.setTextColor(100, 100, 100); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
    pdf.text("* Garantía de 30 días sobre la reparación realizada.", 20, 208);
    pdf.text("* No nos hacemos responsables por daños previos no reportados.", 20, 215);

    pdf.setFillColor(22, 27, 39); pdf.rect(0, 275, 210, 22, "F");
    pdf.setTextColor(160, 160, 160); pdf.setFontSize(8);
    pdf.text("Laboratorio Android — Sistema Técnico Profesional", 20, 285);
    pdf.text("Gracias por su preferencia", 155, 285);

    pdf.save(`OS-${rep.id?.slice(0,8).toUpperCase()}-${rep.cliente}.pdf`);
  };

  // ── WHATSAPP ─────────────────────────────────────────────────────────────
  const enviarWhatsApp = (rep) => {
    const msg = `Hola ${rep.cliente} 👋\n\nTu equipo: *${rep.equipo}*\nEstado: *${rep.estado}*\nSaldo pendiente: *S/ ${rep.saldo}*\n\n_Laboratorio Android_ 🔧`;
    window.open(`https://wa.me/51${rep.telefono}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // ── FILTRO + MÉTRICAS ────────────────────────────────────────────────────
  const reparacionesFiltradas = reparaciones.filter(r =>
    r.cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.equipo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.telefono?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const stats = [
    { label: "Total",      val: reparaciones.length,                                            color: "text-blue-400",    dot: "bg-blue-500" },
    { label: "Reparando",  val: reparaciones.filter(r => r.estado === "Reparando").length,      color: "text-orange-400",  dot: "bg-orange-500" },
    { label: "Listos",     val: reparaciones.filter(r => r.estado === "Listo").length,          color: "text-emerald-400", dot: "bg-emerald-500" },
    { label: "Entregados", val: reparaciones.filter(r => r.estado === "Entregado").length,      color: "text-zinc-400",    dot: "bg-zinc-500" },
    { label: "Facturado",  val: `S/ ${reparaciones.reduce((t,r) => t+Number(r.costo||0),0)}`,  color: "text-emerald-400", dot: "bg-emerald-400" },
    { label: "Pendiente",  val: `S/ ${reparaciones.reduce((t,r) => t+Number(r.saldo||0),0)}`,  color: "text-yellow-400",  dot: "bg-yellow-500" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Reparaciones</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Gestión de órdenes de servicio</p>
        </div>
        <button onClick={() => { setFormAbierto(!formAbierto); setEditandoId(null); setRepuestoOriginal(""); }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2.5 rounded-xl transition-all text-sm">
          <span className="text-lg leading-none">+</span>
          Nueva reparación
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-4">
            <div className={`w-2 h-2 rounded-full ${s.dot} mb-3`} />
            <p className="text-zinc-500 text-xs">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {formAbierto && (
        <div className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold mb-5 text-sm text-zinc-400 uppercase tracking-wider">
            {editandoId ? "Editar reparación" : "Nueva reparación"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Cliente"       value={cliente}   onChange={setCliente}   placeholder="Nombre del cliente" />
            <Field label="Teléfono"      value={telefono}  onChange={setTelefono}  placeholder="987654321" />
            <Field label="Equipo"        value={equipo}    onChange={setEquipo}    placeholder="iPhone 13" />
            <Field label="Falla"         value={falla}     onChange={setFalla}     placeholder="Pantalla rota" />
            <Field label="Costo (S/)"    value={costo}     onChange={setCosto}     placeholder="200" />
            <Field label="Adelanto (S/)" value={adelanto}  onChange={setAdelanto}  placeholder="50" />
            <Field label="Técnico"       value={tecnico}   onChange={setTecnico}   placeholder="Nombre del técnico" />
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Tipo de repuesto</label>
              <select value={tipoRepuesto} onChange={e => setTipoRepuesto(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-[#0f1117] border border-zinc-200 dark:border-white/5 px-3 py-2.5 rounded-xl text-sm outline-none transition-all">
                <option value="inventario">Inventario</option>
                <option value="externo">Compra externa</option>
              </select>
            </div>
            {tipoRepuesto === "inventario" && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Repuesto usado</label>
                <select value={repuesto} onChange={e => setRepuesto(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-[#0f1117] border border-zinc-200 dark:border-white/5 px-3 py-2.5 rounded-xl text-sm outline-none transition-all">
                  <option value="">Sin repuesto</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.nombre}>{p.nombre} — Stock: {p.stock}</option>
                  ))}
                </select>
              </div>
            )}
            {tipoRepuesto === "externo" && (
              <Field label="Costo externo (S/)" value={costoExterno} onChange={setCostoExterno} placeholder="80" />
            )}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Imagen del equipo</label>
              <input type="file" onChange={e => setImagen(e.target.files[0])}
                className="w-full bg-zinc-100 dark:bg-[#0f1117] border border-zinc-200 dark:border-white/5 px-3 py-2.5 rounded-xl text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={guardarReparacion}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">
              {editandoId ? "Actualizar" : "Guardar reparación"}
            </button>
            <button onClick={() => { setFormAbierto(false); setEditandoId(null); setRepuestoOriginal(""); }}
              className="bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="relative mb-5">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, equipo o teléfono..."
          className="w-full bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 px-4 py-2.5 rounded-xl text-sm outline-none pl-9" />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
      </div>

      <div className="space-y-3">
        {reparacionesFiltradas.length === 0 && (
          <div className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-10 text-center">
            <p className="text-zinc-500 text-sm">No hay reparaciones registradas</p>
          </div>
        )}

        {reparacionesFiltradas.map(rep => (
          <div key={rep.id} className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-5 transition-all">
            {rep.imagen && (
              <img src={rep.imagen} alt="Equipo" className="w-full h-48 object-cover rounded-xl mb-4" />
            )}

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{rep.cliente}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${ESTADO_STYLES[rep.estado] || ESTADO_STYLES.Recibido}`}>
                    {rep.estado}
                  </span>
                  {rep.cajaRegistrada && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Cobrado
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400">{rep.equipo} · {rep.falla}</p>
                <p className="text-xs text-zinc-500">Técnico: {rep.tecnico}</p>
                {rep.repuesto && <p className="text-xs text-zinc-500">Repuesto: {rep.repuesto}</p>}
                {rep.tipoRepuesto === "externo" && (
                  <p className="text-xs text-zinc-500">Compra externa: S/ {rep.costoExterno}</p>
                )}
              </div>

              <div className="flex gap-4 text-sm shrink-0">
                {[
                  { label: "Total",    val: `S/ ${rep.costo}`,    color: "text-emerald-400" },
                  { label: "Adelanto", val: `S/ ${rep.adelanto}`, color: "text-yellow-400" },
                  { label: "Saldo",    val: `S/ ${rep.saldo}`,    color: "text-red-400" },
                  { label: "Ganancia", val: `S/ ${rep.gananciaReal || rep.ganancia || rep.costo}`, color: "text-blue-400" },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-zinc-500 text-xs">{m.label}</p>
                    <p className={`font-bold ${m.color}`}>{m.val}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-white/5 flex flex-wrap gap-2">
              {["Diagnosticando","Reparando","Listo","Entregado"].map(estado => (
                <button key={estado} onClick={() => cambiarEstado(rep.id, estado)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${rep.estado === estado
                      ? (ESTADO_STYLES[estado] || "bg-zinc-500/15 text-zinc-400")
                      : "bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10"}`}>
                  {estado}
                </button>
              ))}
              <div className="flex gap-2 ml-auto flex-wrap">
                <button onClick={() => editarReparacion(rep)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all">
                  Editar
                </button>
                <button onClick={() => generarPDF(rep)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all">
                  PDF
                </button>
                <button onClick={() => enviarWhatsApp(rep)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                  WhatsApp
                </button>
                <button onClick={() => eliminarReparacion(rep.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-zinc-100 dark:bg-[#0f1117] border border-zinc-200 dark:border-white/5 px-3 py-2.5 rounded-xl text-sm outline-none transition-all focus:border-emerald-500/50" />
    </div>
  );
}
