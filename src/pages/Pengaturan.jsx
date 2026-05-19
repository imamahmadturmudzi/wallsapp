import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore'; 
import { sendPasswordResetEmail } from 'firebase/auth';
import { User, Mail, School, Key, Save, ShieldAlert, BadgeCheck, Image as ImageIcon, Upload } from 'lucide-react';

const Pengaturan = () => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: '',
    className: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // STATE KHUSUS UNTUK DATA ADMIN (LIVE)
  const [schoolMetadata, setSchoolMetadata] = useState({ namaSekolah: 'Memuat...', logoUrl: '' });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const fetchProfileAndSchoolHybrid = async () => {
      try {
        // 1. Tarik profil pribadi guru
        const docRef = doc(db, "teachers", user.uid);
        const snap = await getDoc(docRef);
        let currentTeacherData = {};
        
        if (snap.exists()) {
          currentTeacherData = snap.data();
          setProfile(currentTeacherData);
        } else {
          setProfile(prev => ({ ...prev, email: user.email }));
        }

        // 2. SINKRONISASI LIVE (HIBRIDA)
        if (currentTeacherData.schoolId) {
          // Jalur untuk Sekolah Baru (SaaS Multi-School)
          const schoolRef = doc(db, "schools", currentTeacherData.schoolId);
          const unsubscribeNew = onSnapshot(schoolRef, (docSnap) => {
            if (docSnap.exists()) {
              setSchoolMetadata({
                namaSekolah: docSnap.data().namaSekolah || "Nama Sekolah Belum Diatur",
                logoUrl: docSnap.data().logoUrl || ""
              });
            }
          });
          return () => unsubscribeNew();
        } else {
          // Jalur Fallback Aman untuk MTsN 10 Kuningan (Data Lama Anda)
          const oldSchoolRef = doc(db, "metadata", "school_info");
          const unsubscribeOld = onSnapshot(oldSchoolRef, (docSnap) => {
            if (docSnap.exists()) {
              setSchoolMetadata({
                namaSekolah: docSnap.data().namaSekolah || docSnap.data().name || "MTsN 10 Kuningan",
                logoUrl: docSnap.data().logoUrl || ""
              });
            }
          });
          return () => unsubscribeOld();
        }

      } catch (error) {
        console.error("Gagal menarik data profil hibrida:", error);
      }
    };

    fetchProfileAndSchoolHybrid();
  }, []);

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      return alert("Ukuran gambar terlalu besar! Maksimal 500 KB.");
    }

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        const schoolRef = doc(db, "metadata", "school_info");
        // Kita gunakan merge: true agar field namaSekolah tidak tertimpa/hilang
        await setDoc(schoolRef, { logoUrl: base64String }, { merge: true });
        alert("Logo instansi berhasil diperbarui! Sidebar akan otomatis menyesuaikan.");
      } catch (error) {
        console.error(error);
        alert("Gagal menyimpan logo.");
      }
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file); 
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      const userRef = doc(db, "teachers", user.uid);
      await updateDoc(userRef, { name: profile.name });
      alert("Nama profil berhasil diperbarui!");
    } catch (error) {
      alert("Gagal memperbarui nama.");
    }
    setIsSaving(false);
  };

  const handleResetPassword = async () => {
    if(confirm("Kirim tautan reset password ke email Anda? Anda akan diminta login ulang nanti.")) {
      try {
        await sendPasswordResetEmail(auth, profile.email);
        alert("Tautan reset password berhasil dikirim. Silakan cek email Anda.");
      } catch (error) {
        alert("Gagal mengirim email reset.");
      }
    }
  };

  const getRoleText = (role) => {
    switch(role) {
      case 'admin': return 'Administrator Pusat';
      case 'wali_kelas': return 'Wali Kelas';
      case 'guru_mapel': return 'Guru Mata Pelajaran';
      case 'ganda': return 'Akses Ganda (Wali & Mapel)';
      default: return 'Pendidik';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in font-sans text-gray-800">
      
      {/* HEADER FLAT & CLEAN */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
          <User size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Pengaturan Sistem & Akun</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola informasi profil dan identitas aplikasi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KOLOM KIRI: INFO STATUS & BRANDING */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-5">
            <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
               <BadgeCheck className="text-gray-400" size={16}/> Status Kredensial
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 ml-0.5">Hak Akses Sistem</p>
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-semibold text-gray-800">
                  {getRoleText(profile.role)}
                </div>
              </div>
              
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 ml-0.5">Institusi Naungan</p>
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <School size={16} className="text-gray-400" /> 
                  {/* MEMANGGIL NAMA SEKOLAH DARI STATE LIVE */}
                  {schoolMetadata.namaSekolah}
                </div>
              </div>

              {(profile.role === 'wali_kelas' || profile.role === 'ganda') && (
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 ml-0.5">Mengampu Kelas</p>
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-semibold text-gray-800">
                    {profile.className || 'Belum Ditugaskan'}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 flex gap-2.5 items-start">
               <ShieldAlert size={16} className="text-gray-500 shrink-0 mt-0.5" />
               <p className="text-[11px] text-gray-500 font-medium leading-relaxed">Data Institusi, Kelas, dan Hak Akses dikendalikan dan disinkronkan langsung dari server pusat.</p>
            </div>
          </div>

          {/* === PANEL BRANDING SEKOLAH (MUNCUL HANYA UNTUK ADMIN) === */}
          {profile.role === 'admin' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
              <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
                 <ImageIcon className="text-gray-400" size={16}/> Logo Instansi
              </h2>
              
              <div className="flex flex-col items-center gap-4 pt-2">
                <div className="w-28 h-28 bg-gray-50 rounded-2xl border border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                  {/* MEMANGGIL LOGO DARI STATE LIVE */}
                  {schoolMetadata.logoUrl ? (
                    <img src={schoolMetadata.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon size={32} className="text-gray-300" />
                  )}
                  
                  {/* Hover Overlay */}
                  <label className="absolute inset-0 bg-gray-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all backdrop-blur-sm">
                    <Upload size={18} className="text-white mb-1.5"/>
                    <span className="text-[10px] text-white font-bold tracking-widest">UBAH LOGO</span>
                    <input type="file" accept="image/png, image/jpeg" onChange={handleUploadLogo} className="hidden" />
                  </label>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-medium">Format disarankan: <strong className="text-gray-800">PNG Transparan</strong>.</p>
                  <p className="text-[10px] text-gray-400 mt-1">(Rasio 1:1, Maksimal 500 KB)</p>
                  {isUploadingLogo && <p className="text-[11px] text-gray-800 font-bold mt-3 animate-pulse">Menulis data ke server...</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KOLOM KANAN: FORM EDIT PROFIL */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleUpdateName} className="bg-white p-6 rounded-2xl border border-gray-200 space-y-5">
            <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
               <User className="text-gray-400" size={16}/> Profil Identitas
            </h2>
            
            <div className="space-y-5 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Email Terdaftar</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  <input 
                    type="email" 
                    value={profile.email} 
                    disabled 
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Nama Lengkap & Gelar</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    value={profile.name} 
                    onChange={e => setProfile({...profile, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-sm font-semibold text-gray-800 transition-all placeholder-gray-300"
                    placeholder="Masukkan nama beserta gelar..."
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full sm:w-auto bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                <Save size={16} /> {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>

          {/* PANEL GANTI PASSWORD */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
             <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
               <Key className="text-gray-400" size={16}/> Keamanan Kredensial
            </h2>
            <p className="text-sm text-gray-500 pt-1">Untuk menjaga integritas keamanan, perubahan kata sandi dilakukan secara eksternal melalui tautan otorisasi yang dikirimkan ke email Anda.</p>
            <div className="pt-2">
              <button 
                onClick={handleResetPassword}
                type="button"
                className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                Kirim Tautan Reset Sandi
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Pengaturan;