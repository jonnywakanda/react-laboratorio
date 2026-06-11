import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

import Reparaciones from "./components/Reparaciones";
import Inventario from "./components/Inventario";
import Historial from "./components/Historial";
import Caja from "./components/Caja";
import Dashboard from "./components/Dashboard";
import Clientes from "./components/Clientes";
import Login from "./components/Login";

const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  dashboard:    "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  reparaciones: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a1 1 0 000-1.4l-1.6-1.6a1 1 0 00-1.4 0l-3 3z M20 14l-6.4 6.4a2 2 0 01-1.4.6H8l-4 4 M3.8 11.8L10 5.6",
  clientes:     "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  inventario:   "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16",
  historial:    "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  caja:         "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  logout:       "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
  sun:          "M12 3v1m0 16v1M4.22 4.22l.7.7m12.02 12.02l.7.7M1 12h2m18 0h2M4.22 19.78l.7-.7M18.36 5.64l.7-.7M12 6a6 6 0 000 12A6 6 0 0012 6z",
  moon:         "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  menu:         "M3 12h18M3 6h18M3 18h18",
  close:        "M18 6L6 18M6 6l12 12",
  up:           "M18 15l-6-6-6 6",
};

const MENU = [
  {
    grupo: "OPERACIONES",
    items: [
      { id: "dashboard",    label: "Dashboard",    icon: "dashboard" },
      { id: "reparaciones", label: "Reparaciones", icon: "reparaciones" },
    ],
  },
  {
    grupo: "CLIENTES",
    items: [
      { id: "clientes", label: "Clientes", icon: "clientes" },
    ],
  },
  {
    grupo: "GESTIÓN",
    items: [
      { id: "inventario", label: "Inventario",  icon: "inventario" },
      { id: "historial",  label: "Historial",   icon: "historial" },
      { id: "caja",       label: "Caja Diaria", icon: "caja" },
    ],
  },
];

export default function App() {
  const [usuario,      setUsuario]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [modulo,       setModulo]       = useState("dashboard");
  const [darkMode,     setDarkMode]     = useState(true);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [mostrarBoton, setMostrarBoton] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user); setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) setDarkMode(JSON.parse(saved));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const onScroll = () => setMostrarBoton(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cerrarSesion = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-400 text-sm tracking-widest uppercase">Cargando</span>
      </div>
    </div>
  );

  if (!usuario) return <Login setUsuario={setUsuario} />;

  const moduloActivo = MENU.flatMap(g => g.items).find(i => i.id === modulo);

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${darkMode ? "bg-[#0f1117] text-white" : "bg-[#f4f5f7] text-[#1a1a2e]"}`}>

      {/* SIDEBAR */}
      <aside className={`
        flex flex-col transition-all duration-300 sticky top-0 h-screen z-30
        ${sidebarOpen ? "w-64" : "w-[70px]"}
        ${darkMode ? "bg-[#161b27] border-r border-white/5" : "bg-white border-r border-zinc-200 shadow-sm"}
      `}>

        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/5">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <span className="text-black font-black text-xs">LA</span>
              </div>
              <div>
                <p className="font-bold text-sm leading-none">Lab Android</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Sistema Técnico</p>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors ml-auto">
            <Icon d={sidebarOpen ? ICONS.close : ICONS.menu} size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {MENU.map(({ grupo, items }) => (
            <div key={grupo}>
              {sidebarOpen && (
                <p className="text-[10px] font-bold tracking-widest text-zinc-500 px-2 mb-2">{grupo}</p>
              )}
              <div className="space-y-1">
                {items.map(({ id, label, icon }) => {
                  const activo = modulo === id;
                  return (
                    <button key={id} onClick={() => setModulo(id)} title={!sidebarOpen ? label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative
                        ${activo
                          ? "bg-emerald-500/15 text-emerald-400"
                          : darkMode
                            ? "text-zinc-400 hover:bg-white/5 hover:text-white"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"}`}
                    >
                      {activo && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full" />}
                      <span className={`flex-shrink-0 ${activo ? "text-emerald-400" : ""}`}>
                        <Icon d={ICONS[icon]} size={17} />
                      </span>
                      {sidebarOpen && <span className="truncate">{label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={`p-3 border-t ${darkMode ? "border-white/5" : "border-zinc-200"}`}>
          {sidebarOpen && (
            <div className={`rounded-xl p-3 mb-2 ${darkMode ? "bg-white/5" : "bg-zinc-50"}`}>
              <p className="text-[10px] text-zinc-500 truncate">{usuario.email}</p>
            </div>
          )}
          <div className={`flex ${sidebarOpen ? "gap-2" : "flex-col gap-2"}`}>
            <button onClick={() => setDarkMode(!darkMode)} title={darkMode ? "Modo claro" : "Modo oscuro"}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all
                ${sidebarOpen ? "flex-1" : "w-full"}
                ${darkMode ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20" : "bg-zinc-900/5 text-zinc-600 hover:bg-zinc-200"}`}>
              <Icon d={darkMode ? ICONS.sun : ICONS.moon} size={15} />
              {sidebarOpen && (darkMode ? "Claro" : "Oscuro")}
            </button>
            <button onClick={cerrarSesion} title="Cerrar sesión"
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all
                ${sidebarOpen ? "flex-1" : "w-full"}
                bg-red-500/10 text-red-400 hover:bg-red-500/20`}>
              <Icon d={ICONS.logout} size={15} />
              {sidebarOpen && "Salir"}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className={`sticky top-0 z-20 flex items-center justify-between px-6 py-3.5 border-b
          ${darkMode ? "bg-[#0f1117]/80 border-white/5 backdrop-blur-md" : "bg-white/80 border-zinc-200 backdrop-blur-md shadow-sm"}`}>
          <div>
            <h1 className="text-base font-semibold">{moduloActivo?.label ?? "Dashboard"}</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-emerald-400 text-xs font-bold">{usuario.email?.[0]?.toUpperCase()}</span>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-auto">
          {modulo === "dashboard"    && <Dashboard />}
          {modulo === "reparaciones" && <Reparaciones />}
          {modulo === "clientes"     && <Clientes />}
          {modulo === "inventario"   && <Inventario />}
          {modulo === "historial"    && <Historial />}
          {modulo === "caja"         && <Caja />}
        </main>
      </div>

      {/* Botón subir */}
      {mostrarBoton && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50">
          <Icon d={ICONS.up} size={16} />
        </button>
      )}
    </div>
  );
}
