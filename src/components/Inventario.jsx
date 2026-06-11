import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs, deleteDoc, updateDoc, doc,
} from "firebase/firestore";

export default function Inventario() {
  const [nombre,    setNombre]    = useState("");
  const [stock,     setStock]     = useState("");
  const [precio,    setPrecio]    = useState("");
  const [proveedor, setProveedor] = useState("");
  const [productos, setProductos] = useState([]);
  const [busqueda,  setBusqueda]  = useState("");
  const [editandoId,setEditandoId]= useState(null);
  const [formAbierto,setFormAbierto]=useState(false);

  const cargarProductos = async () => {
    const snap = await getDocs(collection(db, "inventario"));
    setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { cargarProductos(); }, []);

  const guardarProducto = async () => {
    if (!nombre || !stock || !precio || !proveedor) {
      alert("Completa todos los campos"); return;
    }
    try {
      if (editandoId) {
        await updateDoc(doc(db, "inventario", editandoId), {
          nombre, stock: Number(stock), precio: Number(precio), proveedor,
        });
        setEditandoId(null);
      } else {
        await addDoc(collection(db, "inventario"), {
          nombre, stock: Number(stock), precio: Number(precio), proveedor, fecha: new Date(),
        });
      }
      setNombre(""); setStock(""); setPrecio(""); setProveedor("");
      setFormAbierto(false);
      cargarProductos();
    } catch (e) { console.error(e); alert("Error"); }
  };

  const eliminarProducto = async (id) => {
    if (!confirm("¿Eliminar producto?")) return;
    await deleteDoc(doc(db, "inventario", id));
    cargarProductos();
  };

  const editarProducto = (p) => {
    setNombre(p.nombre); setStock(p.stock); setPrecio(p.precio); setProveedor(p.proveedor);
    setEditandoId(p.id); setFormAbierto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalProductos   = productos.length;
  const stockBajo        = productos.filter(p => Number(p.stock) <= 3).length;
  const valorInventario  = productos.reduce((t, p) => t + Number(p.stock) * Number(p.precio), 0);

  const stats = [
    { label: "Productos",       val: totalProductos,        color: "text-blue-400",    dot: "bg-blue-500" },
    { label: "Stock bajo",      val: stockBajo,             color: "text-red-400",     dot: "bg-red-500" },
    { label: "Valor inventario",val: `S/ ${valorInventario}`,color:"text-emerald-400", dot: "bg-emerald-500" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Gestión de repuestos y productos</p>
        </div>
        <button
          onClick={() => { setFormAbierto(!formAbierto); setEditandoId(null); }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
        >
          <span className="text-lg leading-none">+</span>
          Nuevo producto
        </button>
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

      {/* ALERTA */}
      {stockBajo > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium mb-6 flex items-center gap-2">
          <span>⚠️</span>
          {stockBajo} producto{stockBajo > 1 ? "s" : ""} con stock bajo (≤ 3 unidades)
        </div>
      )}

      {/* FORMULARIO */}
      {formAbierto && (
        <div className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold mb-5 text-xs text-zinc-400 uppercase tracking-wider">
            {editandoId ? "Editar producto" : "Nuevo producto"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre"    value={nombre}    onChange={setNombre}    placeholder="Pantalla iPhone 11" />
            <Field label="Proveedor" value={proveedor} onChange={setProveedor} placeholder="Importadora Lima" />
            <Field label="Stock"     value={stock}     onChange={setStock}     placeholder="10" />
            <Field label="Precio (S/)" value={precio}  onChange={setPrecio}    placeholder="120" />
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={guardarProducto}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">
              {editandoId ? "Actualizar" : "Guardar producto"}
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
        <input
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 px-4 py-2.5 rounded-xl text-sm outline-none pl-9"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
      </div>

      {/* TABLA */}
      <div className="bg-white dark:bg-[#161b27] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-zinc-100 dark:border-white/5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <span className="col-span-4">Producto</span>
          <span className="col-span-3">Proveedor</span>
          <span className="col-span-2 text-center">Stock</span>
          <span className="col-span-2 text-center">Precio</span>
          <span className="col-span-1" />
        </div>

        {productosFiltrados.length === 0 && (
          <div className="px-5 py-10 text-center text-zinc-500 text-sm">No hay productos registrados</div>
        )}

        {productosFiltrados.map((p, i) => (
          <div key={p.id}
            className={`grid grid-cols-12 px-5 py-4 items-center text-sm transition-colors
              ${i % 2 === 0 ? "" : "bg-zinc-50 dark:bg-white/[0.02]"}
              hover:bg-zinc-100 dark:hover:bg-white/5`}
          >
            <span className="col-span-4 font-medium">{p.nombre}</span>
            <span className="col-span-3 text-zinc-500 text-xs">{p.proveedor}</span>
            <span className="col-span-2 text-center">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium
                ${Number(p.stock) <= 3
                  ? "bg-red-500/15 text-red-400 border border-red-500/20"
                  : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"}`}>
                {p.stock}
              </span>
            </span>
            <span className="col-span-2 text-center font-medium">S/ {p.precio}</span>
            <div className="col-span-1 flex gap-1 justify-end">
              <button onClick={() => editarProducto(p)}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 transition-all text-xs">
                ✏️
              </button>
              <button onClick={() => eliminarProducto(p.id)}
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all text-xs">
                🗑️
              </button>
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
        className="w-full bg-zinc-100 dark:bg-[#0f1117] border border-zinc-200 dark:border-white/5 px-3 py-2.5 rounded-xl text-sm outline-none focus:border-emerald-500/50 transition-all" />
    </div>
  );
}
