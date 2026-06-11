import { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login({ setUsuario }) {
  const [correo,   setCorreo]   = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const iniciarSesion = async () => {
    if (!correo || !password) { setError("Completa todos los campos"); return; }
    try {
      setLoading(true); setError("");
      const res = await signInWithEmailAndPassword(auth, correo, password);
      setUsuario(res.user);
    } catch (e) {
      console.error(e);
      setError("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") iniciarSesion(); };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6 relative overflow-hidden">

      {/* Efectos de fondo */}
      <div className="absolute w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl top-[-150px] left-[-150px] pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl bottom-[-100px] right-[-100px] pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 mb-5">
            <span className="text-emerald-400 font-black text-lg">LA</span>
          </div>
          <h1 className="text-2xl font-bold">Lab Android</h1>
          <p className="text-zinc-500 text-sm mt-1">Sistema Técnico Profesional</p>
        </div>

        {/* Form */}
        <div className="bg-[#161b27] border border-white/5 rounded-2xl p-7 shadow-2xl">

          <h2 className="font-semibold text-sm mb-6">Iniciar sesión</h2>

          <div className="space-y-4">

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                onKeyDown={handleKey}
                placeholder="admin@gmail.com"
                className="w-full bg-[#0f1117] border border-white/5 focus:border-emerald-500/50 px-4 py-2.5 rounded-xl outline-none transition-all text-sm text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKey}
                placeholder="••••••••"
                className="w-full bg-[#0f1117] border border-white/5 focus:border-emerald-500/50 px-4 py-2.5 rounded-xl outline-none transition-all text-sm text-white placeholder:text-zinc-600"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              onClick={iniciarSesion}
              disabled={loading}
              className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-black font-semibold py-2.5 rounded-xl text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Ingresando...
                </span>
              ) : "Entrar al sistema"}
            </button>

          </div>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Laboratorio Android © 2026
        </p>
      </div>
    </div>
  );
}
