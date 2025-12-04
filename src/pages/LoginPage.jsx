import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'; 
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore'; 
import { User, Lock, GraduationCap, ArrowRight, Loader2, School, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('guru'); 
  const [isRegistering, setIsRegistering] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  
  // State Input Guru
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); 
  const [classCode, setClassCode] = useState(""); 
  const [schoolName, setSchoolName] = useState(""); 
  const [className, setClassName] = useState("");   

  // State Input Ortu (LoginCode menggantikan NIS)
  const [loginCode, setLoginCode] = useState(""); 
  const [inputClassCode, setInputClassCode] = useState(""); 

  // FUNGSI CEK KODE UNIK
  const checkClassCodeUnique = async (code) => {
    const q = query(collection(db, "teachers"), where("classCode", "==", code));
    const snapshot = await getDocs(q);
    return snapshot.empty; // True jika kosong (aman), False jika ada yang punya
  };

  // === LOGIKA REGISTER GURU ===
  const handleRegisterGuru = async (e) => {
    e.preventDefault();
    if (!classCode.trim() || !schoolName.trim() || !className.trim()) return alert("Semua data wajib diisi!");
    
    setLoading(true);
    try {
      const fixedClassCode = classCode.trim().toUpperCase().replace(/\s/g, '');

      // 1. Cek Apakah Kode Sudah Dipakai?
      const isUnique = await checkClassCodeUnique(fixedClassCode);
      if (!isUnique) {
        setLoading(false);
        return alert("MAAF! Kode Kelas ini sudah dipakai guru lain. Cari kode lain.");
      }

      // 2. Lanjut Daftar
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "teachers", user.uid), {
        email: user.email,
        name: fullName,
        schoolName: schoolName,
        className: className,
        classCode: fixedClassCode,
        createdAt: new Date().toISOString()
      });

      localStorage.setItem('teacherClassCode', fixedClassCode);
      alert("Pendaftaran Berhasil!");
      navigate("/"); 
    } catch (error) {
      alert("Gagal Daftar: " + error.message);
    }
    setLoading(false);
  };

  // === LOGIKA LOGIN GURU ===
  const handleLoginGuru = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const docRef = doc(db, "teachers", userCredential.user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        localStorage.setItem('teacherClassCode', docSnap.data().classCode);
      }
      navigate("/"); 
    } catch (error) {
      alert("Login Gagal! Cek email & password.");
    }
    setLoading(false);
  };

  // === LOGIKA LOGIN ORTU (UPDATE: LOGIN CODE) ===
  const handleLoginOrtu = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const q = query(
        collection(db, "siswa"), 
        // Cari berdasarkan Kode Unik Siswa (Tahun+Absen)
        where("loginCode", "==", loginCode.trim()), 
        where("classCode", "==", inputClassCode.trim().toUpperCase())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        alert("Gagal Masuk! Periksa Kode Kelas dan Kode Login Siswa.");
      } else {
        const studentId = snapshot.docs[0].id;
        navigate(`/rapor/${studentId}`);
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan sistem.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 to-teal-700 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-teal-50 p-6 text-center border-b border-teal-100">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-200"><School className="text-white" size={32} /></div>
          <h1 className="text-xl font-bold text-gray-800">Sistem Informasi Kelas</h1>
          <p className="text-sm text-gray-500">Platform Wali Kelas Digital</p>
        </div>

        <div className="flex p-2 bg-gray-50 m-4 rounded-xl border border-gray-200">
          <button onClick={() => setActiveTab('guru')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'guru' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><User size={18} /> Guru</button>
          <button onClick={() => setActiveTab('ortu')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'ortu' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><GraduationCap size={18} /> Orang Tua</button>
        </div>

        <div className="p-6 pt-2">
          {/* FORM GURU */}
          {activeTab === 'guru' && (
            <div className="animate-fade-in">
              <form onSubmit={isRegistering ? handleRegisterGuru : handleLoginGuru} className="space-y-4">
                {isRegistering && (
                  <>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Nama Lengkap</label><input type="text" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Nama Sekolah</label><input type="text" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Nama Kelas</label><input type="text" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" value={className} onChange={(e) => setClassName(e.target.value)} required /></div>
                    </div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Buat Kode Kelas (Unik)</label><input type="text" className="w-full p-2 bg-teal-50 text-teal-800 font-bold rounded-lg border border-teal-200 outline-none uppercase" value={classCode} onChange={(e) => setClassCode(e.target.value)} required /><p className="text-[10px] text-gray-400 mt-1">*Harus beda dengan guru lain</p></div>
                  </>
                )}
                <div><label className="text-xs font-bold text-gray-500 uppercase">Email</label><input type="email" className="w-full p-3 bg-gray-50 rounded-xl border outline-none" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div className="relative"><input type={showPassword ? "text" : "password"} className="w-full p-3 bg-gray-50 rounded-xl border outline-none pr-10" value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
                <button disabled={loading} className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 shadow-lg">{loading ? <Loader2 className="animate-spin" /> : (isRegistering ? "Daftar Sekarang" : "Masuk Dashboard")}</button>
              </form>
              <div className="mt-4 text-center"><button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-teal-600 font-medium hover:underline">{isRegistering ? "Sudah punya akun? Login" : "Belum punya akun? Daftar Guru Baru"}</button></div>
            </div>
          )}

          {/* FORM ORTU (UPDATE LABEL) */}
          {activeTab === 'ortu' && (
            <form onSubmit={handleLoginOrtu} className="space-y-4 animate-fade-in">
              <div className="text-center py-2 bg-orange-50 rounded-xl border border-orange-100 p-4">
                <p className="text-xs font-bold text-orange-800 uppercase mb-2">Langkah 1: Kode Kelas</p>
                <input type="text" className="w-full p-2 bg-white border border-orange-200 rounded-lg text-center font-bold uppercase" placeholder="KODE KELAS" value={inputClassCode} onChange={(e) => setInputClassCode(e.target.value)} required />
              </div>
              <div className="text-center py-2">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Langkah 2: Kode Login Siswa</p>
                {/* UPDATE LABEL */}
                <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-xl font-bold tracking-widest" placeholder="Contoh: 202501" value={loginCode} onChange={(e) => setLoginCode(e.target.value)} required />
                <p className="text-[10px] text-gray-400 mt-2">Format: Tahun + No. Absen (Misal Absen 1 = 202501)</p>
              </div>
              <button disabled={loading} className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 shadow-lg">{loading ? <Loader2 className="animate-spin" /> : <>Cek Rapor <ArrowRight size={18} /></>}</button>
            </form>
          )}
        </div>
      </div>
      <p className="fixed bottom-4 text-teal-200 text-xs">© 2025 WaliKelas App v2.1</p>
    </div>
  );
};
export default LoginPage;