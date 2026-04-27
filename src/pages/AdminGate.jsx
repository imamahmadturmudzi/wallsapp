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
        throw new Error("Akses Ditolak. Anda bukan Super Admin.");
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
        throw new Error("Kunci Rahasia Developer tidak valid!");
      }

      // 2. Buat Akun Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. Suntikkan Status Super Admin Langsung ke Database
      await setDoc(doc(db, "teachers", user.uid), {
        name: "Super Admin Pusat",
        email: email,
        role: "admin",
        schoolName: "Pusat Sistem",
        createdAt: new Date().getTime()
      });

      alert("Akun Super Admin berhasil diciptakan! Selamat datang, Commander.");
      navigate('/');
    } catch (err) {
      setError(err.message || "Gagal membuat akun Admin.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 selection:bg-teal-500 selection:text-white">
      <div className="bg-gray-800 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-gray-700">
        
        {/* HEADER */}
        <div className="p-8 text-center text-white bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700">
          <div className="w-16 h-16 bg-teal-500/10 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-sm mb-4 border border-teal-500/20 shadow-inner">
             <ShieldAlert size={32} className="text-teal-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Admin Gate</h1>
          <p className="text-teal-400/80 font-mono text-xs mt-2 uppercase tracking-widest">
            Restricted Access Area
          </p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm font-bold mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"></span> {error}
            </div>
          )}

          {/* MODE 1: LOGIN ADMIN */}
          {mode === 'login' && (
            <form onSubmit={handleAdminLogin} className="space-y-4 animate-slide-up">
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-gray-500" size={20} />
                <input type="email" placeholder="Email Admin" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl outline-none focus:border-teal-500 text-white transition-all" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-gray-500" size={20} />
                <input type="password" placeholder="Password Admin" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl outline-none focus:border-teal-500 text-white transition-all" required />
              </div>
              <button disabled={loading} className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl hover:bg-teal-500 transition-all flex justify-center items-center gap-2 mt-4 shadow-[0_0_20px_rgba(13,148,136,0.3)]">
                {loading ? "Verifikasi..." : "Otorisasi Masuk"} <ShieldCheck size={18} />
              </button>
            </form>
          )}

          {/* MODE 2: SETUP FIRST ADMIN (GOD MODE) */}
          {mode === 'setup' && (
            <form onSubmit={handleAdminSetup} className="space-y-4 animate-slide-up">
              <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-xl mb-4">
                <p className="text-xs text-orange-400 font-medium">Warning: Halaman ini hanya untuk menginisialisasi sistem pertama kali.</p>
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-gray-500" size={20} />
                <input type="email" placeholder="Buat Email Admin" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl outline-none focus:border-orange-500 text-white" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-gray-500" size={20} />
                <input type="password" placeholder="Buat Password Kuat" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl outline-none focus:border-orange-500 text-white" required />
              </div>
              <div className="relative">
                <Key className="absolute left-4 top-3.5 text-orange-500" size={20} />
                <input type="password" placeholder="Developer Secret Key" value={secretKey} onChange={e=>setSecretKey(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-orange-500/50 rounded-xl outline-none focus:border-orange-500 text-orange-400 font-mono tracking-widest" required />
              </div>
              <button disabled={loading} className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-xl hover:bg-orange-500 transition-all flex justify-center items-center gap-2 mt-4 shadow-[0_0_20px_rgba(234,88,12,0.3)]">
                {loading ? "Menciptakan..." : "Inisialisasi Sistem"} <ArrowRight size={18} />
              </button>
            </form>
          )}

        </div>

        {/* FOOTER RAHSIA (Double Click untuk memunculkan mode SETUP) */}
        <div className="p-4 bg-gray-900 border-t border-gray-800 text-center">
          <button 
            onDoubleClick={() => setMode(mode === 'login' ? 'setup' : 'login')}
            className="text-[10px] text-gray-600 font-mono uppercase tracking-widest hover:text-gray-400 transition-colors cursor-default"
            title="Double Click for System Initialization"
          >
            WalasApp Core v4.0.0
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminGate;