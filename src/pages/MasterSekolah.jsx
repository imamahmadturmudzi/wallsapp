import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { School, Save, ShieldCheck, UserCheck, CreditCard, Image as ImageIcon, Upload } from 'lucide-react';

const MasterSekolah = () => {
  const [schoolData, setSchoolData] = useState({
    namaSekolah: '',
    logoUrl: '',
    kepalaSekolah: '',
    nipKepalaSekolah: '',
    tahunAjaran: '2025/2026',
    semester: 'Genap'
  });
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [mySchoolId, setMySchoolId] = useState("");
  const [kodeJoinSekolah, setKodeJoinSekolah] = useState("");

  useEffect(() => {
    const fetchSchoolData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1. Cek Admin ini punya ID Sekolah apa?
        const teacherRef = doc(db, "teachers", user.uid);
        const teacherSnap = await getDoc(teacherRef);
        
        if (teacherSnap.exists() && teacherSnap.data().schoolId) {
          const currentSchoolId = teacherSnap.data().schoolId;
          setMySchoolId(currentSchoolId);

          // 2. Tarik data dari kamar sekolah tersebut
          const schoolRef = doc(db, "schools", currentSchoolId);
          const schoolSnap = await getDoc(schoolRef);
          
          if (schoolSnap.exists()) {
            const data = schoolSnap.data();
            
            // 3. Masukkan data ke dalam object schoolData Anda
            setSchoolData(prevState => ({
              ...prevState,
              namaSekolah: data.namaSekolah || "",
              logoUrl: data.logoUrl || "",
              kepalaSekolah: data.kepalaSekolah || "",
              nipKepalaSekolah: data.nipKepalaSekolah || "",
              tahunAjaran: data.tahunAjaran || prevState.tahunAjaran,
              semester: data.semester || prevState.semester
            }));
            setKodeJoinSekolah(data.kodeVerifikasiGuru || "-");
          }
        }
      } catch (error) {
        console.error("Gagal menarik data sekolah:", error);
      } finally {
        setIsFetching(false); // Matikan loading state saat selesai
      }
    };

    fetchSchoolData();
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
        const docRef = doc(db, "metadata", "school_info");
        setSchoolData(prev => ({ ...prev, logoUrl: base64String }));
        await setDoc(docRef, { logoUrl: base64String }, { merge: true });
        alert("Logo instansi berhasil diperbarui!");
      } catch (error) {
        console.error(error);
        alert("Gagal menyimpan logo.");
      }
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file); 
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!mySchoolId) throw new Error("Akses Ditolak: ID Sekolah tidak ditemukan.");

      // Tembak seluruh isi object schoolData sekaligus ke Firestore
      await setDoc(doc(db, "schools", mySchoolId), {
        ...schoolData,
        updatedAt: new Date().getTime()
      }, { merge: true });

      alert("Data lingkungan sekolah berhasil diperbarui!");
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data.");
    }
    setLoading(false);
  };

  if (isFetching) {
    return <div className="p-10 text-center text-gray-400 font-medium animate-pulse mt-10">Membaca data institusi dari server...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 animate-fade-in font-sans text-gray-800">
      
      {/* HEADER FLAT & CLEAN */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
          <School size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Master Data Sekolah</h1>
          <p className="text-sm text-gray-500 mt-1">Pengaturan identitas pusat dan pimpinan institusi.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          
          {/* IDENTITAS SEKOLAH & LOGO */}
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
               <ShieldCheck className="text-gray-400" size={16}/> Identitas Institusi & Branding
            </h2>
            
            <div className="flex flex-col md:flex-row gap-8">
              
              {/* KOTAK UPLOAD LOGO */}
              <div className="w-full md:w-1/3 flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300 gap-4">
                <div className="w-28 h-28 bg-white rounded-2xl border border-gray-200 flex items-center justify-center overflow-hidden relative group shadow-sm">
                  {schoolData.logoUrl ? (
                    <img src={schoolData.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
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
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Lambang Sekolah</p>
                  {isUploadingLogo ? (
                     <p className="text-[11px] text-gray-800 font-bold animate-pulse">Menulis ke server...</p>
                  ) : (
                     <p className="text-[10px] text-gray-400 px-4 leading-relaxed">Format PNG Transparan<br/>Maksimal ukuran 500 KB</p>
                  )}
                </div>
              </div>

              {/* FORM DATA SEKOLAH */}
              <div className="w-full md:w-2/3 space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Nama Resmi Sekolah</label>
                  <input 
                    type="text" 
                    value={schoolData.namaSekolah} 
                    onChange={e => setSchoolData({...schoolData, namaSekolah: e.target.value})}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-sm font-bold text-gray-800 transition-all placeholder-gray-300"
                    placeholder="Contoh: SMP Negeri 1 Nusantara"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Tahun Ajaran</label>
                    <input 
                      type="text" 
                      value={schoolData.tahunAjaran} 
                      onChange={e => setSchoolData({...schoolData, tahunAjaran: e.target.value})}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-sm font-semibold text-gray-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Semester</label>
                    <select 
                      value={schoolData.semester} 
                      onChange={e => setSchoolData({...schoolData, semester: e.target.value})}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-sm font-semibold text-gray-800 transition-all"
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* IDENTITAS PIMPINAN */}
          <div className="space-y-5 pt-4">
            <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
               <UserCheck className="text-gray-400" size={16}/> Pimpinan Institusi (Otorisasi Rapor)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50/50 p-5 rounded-xl border border-gray-100">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Nama Kepala Sekolah</label>
                <input 
                  type="text" 
                  value={schoolData.kepalaSekolah} 
                  onChange={e => setSchoolData({...schoolData, kepalaSekolah: e.target.value})}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-sm font-semibold text-gray-800 transition-all placeholder-gray-300"
                  placeholder="Budi Santoso, S.Pd., M.Pd."
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">NIP Kepala Sekolah</label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-3 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    value={schoolData.nipKepalaSekolah} 
                    onChange={e => setSchoolData({...schoolData, nipKepalaSekolah: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-sm font-mono text-gray-800 tracking-wider transition-all placeholder-gray-300"
                    placeholder="19800101 200501 1 001"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
        
        <div className="px-6 md:px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full md:w-auto bg-gray-800 text-white px-8 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            <Save size={16} /> {loading ? "Menyimpan Konfigurasi..." : "Simpan Pengaturan"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MasterSekolah;