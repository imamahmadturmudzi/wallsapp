import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore'; 
import { Settings, Plus, Trash2, Book, CheckCircle, School, User, Save, Loader2, Key, RefreshCw } from 'lucide-react';

const Pengaturan = () => {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [syncing, setSyncing] = useState(false); // State untuk loading sync
  const [userUID, setUserUID] = useState(null);

  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState("");

  const [profile, setProfile] = useState({
    name: "", schoolName: "", className: "", classCode: "" 
  });
  
  const [oldClassCode, setOldClassCode] = useState(""); 

  // 1. AMBIL DATA
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserUID(user.uid);
        
        // Load Mapel
        const configRef = doc(db, "settings", user.uid);
        const configSnap = await getDoc(configRef);
        if (configSnap.exists() && configSnap.data().subjects) setSubjects(configSnap.data().subjects);
        else setSubjects(["Matematika", "B. Indonesia", "IPA", "IPS", "PAI"]);

        // Load Profil
        const teacherRef = doc(db, "teachers", user.uid);
        const teacherSnap = await getDoc(teacherRef);
        if (teacherSnap.exists()) {
           const data = teacherSnap.data();
           setProfile({
             name: data.name || "",
             schoolName: data.schoolName || "",
             className: data.className || "",
             classCode: data.classCode || "" 
           });
           setOldClassCode(data.classCode || ""); 
        }
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. LOGIKA MAPEL
  const saveMapelToFirebase = async (u) => { if (userUID) await setDoc(doc(db, "settings", userUID), { subjects: u }, { merge: true }); };
  const handleAddMapel = () => { if (!newSubject.trim() || subjects.includes(newSubject.trim())) return; const u = [...subjects, newSubject.trim()]; setSubjects(u); saveMapelToFirebase(u); setNewSubject(""); };
  const handleDeleteMapel = (i) => { if (confirm("Hapus?")) { const u = subjects.filter((_, idx) => idx !== i); setSubjects(u); saveMapelToFirebase(u); } };

  // 3. LOGIKA SIMPAN PROFIL
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.classCode.trim()) return alert("Kode Kelas wajib diisi!");

    setSavingProfile(true);
    try {
      const newClassCode = profile.classCode.toUpperCase().replace(/\s/g, ''); 

      // Cek Unik jika berubah
      if (newClassCode !== oldClassCode) {
         const q = query(collection(db, "teachers"), where("classCode", "==", newClassCode));
         const snapshot = await getDocs(q);
         if (!snapshot.empty) {
            setSavingProfile(false);
            return alert("Kode Kelas sudah dipakai guru lain!");
         }
      }

      const teacherRef = doc(db, "teachers", userUID);
      await updateDoc(teacherRef, {
        name: profile.name,
        schoolName: profile.schoolName,
        className: profile.className,
        classCode: newClassCode
      });

      localStorage.setItem('teacherClassCode', newClassCode);
      setProfile(prev => ({ ...prev, classCode: newClassCode }));
      setOldClassCode(newClassCode); 

      alert("Profil berhasil diperbarui!");
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan.");
    }
    setSavingProfile(false);
  };

  // === 4. FITUR BARU: PAKSA SINKRONISASI KODE KELAS ===
  const handleForceSync = async () => {
    if (!confirm("Fitur ini akan memaksa SEMUA data siswa Anda untuk menggunakan Kode Kelas yang tertera di atas. Lanjutkan?")) return;
    
    setSyncing(true);
    try {
        const currentClassCode = profile.classCode;
        if (!currentClassCode) return alert("Kode kelas masih kosong!");

        // Ambil semua siswa milik guru ini
        const qSiswa = query(collection(db, "siswa"), where("teacherId", "==", userUID));
        const siswaSnapshot = await getDocs(qSiswa);

        if (siswaSnapshot.empty) {
            setSyncing(false);
            return alert("Tidak ada siswa yang ditemukan untuk disinkronkan.");
        }

        // Update Massal (Batch)
        const batch = writeBatch(db);
        let count = 0;
        siswaSnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { classCode: currentClassCode });
            count++;
        });
        await batch.commit();

        alert(`SUKSES! ${count} Siswa berhasil disinkronkan ke kode: ${currentClassCode}`);

    } catch (error) {
        console.error(error);
        alert("Gagal sinkronisasi.");
    }
    setSyncing(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-gray-800 text-white rounded-xl shadow-lg"><Settings size={24} /></div>
        <div><h1 className="text-2xl font-bold text-gray-800">Pengaturan</h1><p className="text-gray-500 text-sm">Kelola identitas kelas.</p></div>
      </div>

      {/* KARTU IDENTITAS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-4"><School className="text-blue-600"/> Identitas Sekolah</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase">Nama Guru</label><input className="w-full p-2 border rounded-xl" value={profile.name} onChange={(e)=>setProfile({...profile, name: e.target.value})}/></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Nama Sekolah</label><input className="w-full p-2 border rounded-xl" value={profile.schoolName} onChange={(e)=>setProfile({...profile, schoolName: e.target.value})}/></div>
              <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Nama Kelas</label><input className="w-full p-2 border rounded-xl" value={profile.className} onChange={(e)=>setProfile({...profile, className: e.target.value})}/></div>
              <div><label className="text-xs font-bold text-blue-600 uppercase flex items-center gap-1"><Key size={12}/> Kode Unik (Login Ortu)</label><input className="w-full p-3 border-2 border-blue-100 bg-blue-50 text-blue-800 font-bold rounded-xl uppercase" value={profile.classCode} onChange={(e)=>setProfile({...profile, classCode: e.target.value})}/></div>
           </div>
           
           <div className="flex justify-between pt-4 border-t mt-4">
              {/* TOMBOL SINKRONISASI (BARU) */}
              <button type="button" onClick={handleForceSync} disabled={syncing} className="text-orange-600 text-sm font-bold flex items-center gap-2 hover:bg-orange-50 px-4 py-2 rounded-lg transition-colors">
                 {syncing ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>} Sinkronisasi Siswa
              </button>

              <button disabled={savingProfile} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2">
                 {savingProfile ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Simpan
              </button>
           </div>
        </form>
      </div>

      {/* KARTU MAPEL */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-4"><Book className="text-blue-600"/> Daftar Mapel</h2>
        <div className="flex gap-2 mb-6"><input placeholder="Mapel Baru..." className="flex-1 p-3 bg-gray-50 border rounded-xl" value={newSubject} onChange={(e)=>setNewSubject(e.target.value)} onKeyPress={(e)=>e.key==='Enter'&&handleAddMapel()}/><button onClick={handleAddMapel} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold"><Plus/></button></div>
        {loading?<p>Memuat...</p>:<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{subjects.map((sub,i)=><div key={i} className="flex justify-between p-3 bg-gray-50 border rounded-xl"><span className="font-medium flex gap-2"><CheckCircle size={16} className="text-green-500"/>{sub}</span><button onClick={()=>handleDeleteMapel(i)} className="text-gray-300 hover:text-red-500"><Trash2 size={18}/></button></div>)}</div>}
      </div>
    </div>
  );
};
export default Pengaturan;