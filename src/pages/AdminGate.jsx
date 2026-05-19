import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ShieldAlert, Mail, Lock, Key, ArrowRight, ShieldCheck } from 'lucide-react';

const AdminGate = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' atau 'setup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');

  // KUNCI RAHASIA DEVELOPER (Hanya Anda yang tahu ini)
  const DEVELOPER_KEY = "WALAS-SIMS-2026"; 

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // 1. Coba Login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Verifikasi apakah dia benar-benar Admin
      const docRef = doc(db, "teachers", userCredential.user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().role === 'admin') {
        navigate('/'); // Masuk ke Dashboard
      } else {
        // Jika ternyata dia guru biasa yang nyasar ke link admin
        auth.signOut();
        throw new Error("Akses Ditolak. Anda bukan Administrator Sistem.");
      }
    } catch (err) {
      setError(err.message || "Kredensial salah atau Anda tidak memiliki akses Admin.");
    }
    setLoading(false);
  };

  const handleAdminSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // 1. Cek Kunci Developer
      if (secretKey !== DEVELOPER_KEY) {
        throw new Error("Kunci Rahasia Sistem tidak valid!");
      }

      // 2. Buat Akun Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. Suntikkan Status Super Admin Langsung ke Database
      await setDoc(doc(db, "teachers", user.uid), {
        name: "Administrator Pusat",
        email: email,
        role: "admin",
        schoolName: "Pusat Sistem",
        createdAt: new Date().getTime()
      });

      alert("Identitas Administrator berhasil diinisialisasi! Selamat datang, Commander.");
      navigate('/');
    } catch (err) {
      setError(err.message || "Gagal melakukan inisialisasi Admin.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-800 selection:bg-gray-200 selection:text-gray-900">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-200 animate-zoom-in">
        
        {/* HEADER */}
        <div className="px-8 pt-10 pb-6 text-center border-b border-gray-100">
          <div className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-xl mx-auto flex items-center justify-center mb-5">
             <ShieldAlert size={28} className="text-gray-800" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admin Gate</h1>
          <p className="text-gray-400 font-mono text-[10px] mt-2 uppercase tracking-widest font-semibold">
            Restricted System Access
          </p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-xs font-semibold mb-6 flex items-start gap-2.5">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" /> 
              <span>{error}</span>
            </div>
          )}

          {/* MODE 1: LOGIN ADMIN */}
          {mode === 'login' && (
            <form onSubmit={handleAdminLogin} className="space-y-5 animate-slide-up">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Email Administrator</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  <input type="email" placeholder="admin@sekolah.com" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-sm font-medium transition-all text-gray-800 placeholder-gray-300" required />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  <input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-sm font-medium transition-all text-gray-800 placeholder-gray-300" required />
                </div>
              </div>

              <div className="pt-2">
                <button disabled={loading} className="w-full bg-gray-900 text-white font-medium text-sm py-3 rounded-lg hover:bg-black transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                  {loading ? "Memverifikasi..." : "Otorisasi Masuk"} <ShieldCheck size={16} />
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: SETUP FIRST ADMIN (GOD MODE) */}
          {mode === 'setup' && (
            <form onSubmit={handleAdminSetup} className="space-y-5 animate-slide-up">
              <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg mb-2 flex gap-2">
                <ShieldAlert size={16} className="text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-orange-700 font-medium leading-relaxed">
                  <strong>Inisialisasi Sistem:</strong> Form ini hanya digunakan untuk menciptakan akun Administrator utama pertama kali.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Email Akses Baru</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  <input type="email" placeholder="Buat Email Admin" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 text-sm font-medium text-gray-800" required />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Kunci Sandi Baru</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  <input type="password" placeholder="Buat Password Kuat" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 text-sm font-medium text-gray-800" required />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Developer Secret Key</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  <input type="password" placeholder="Token Rahasia" value={secretKey} onChange={e=>setSecretKey(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-sm font-mono tracking-widest text-gray-800" required />
                </div>
              </div>

              <div className="pt-2">
                <button disabled={loading} className="w-full bg-gray-800 text-white font-medium text-sm py-3 rounded-lg hover:bg-gray-900 transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                  {loading ? "Menulis Konfigurasi..." : "Inisialisasi Sistem"} <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

        </div>

        {/* FOOTER RAHASIA (Double Click untuk memunculkan mode SETUP) */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
          <button 
            onDoubleClick={() => setMode(mode === 'login' ? 'setup' : 'login')}
            className="text-[10px] text-gray-400 font-mono uppercase tracking-widest hover:text-gray-600 transition-colors cursor-default select-none"
            title="Sistem Inti WalasApp"
          >
            System Core v2.0
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminGate;