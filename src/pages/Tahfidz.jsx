import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { BookOpen, Save, CheckCircle, Trash2, Mic, AlertCircle } from 'lucide-react';

// === DATA AL-QURAN (DIGABUNG DISINI BIAR TIDAK ERROR IMPORT) ===
const quranData = {
  1: ["Al-Fatihah", "Al-Baqarah"],
  // ... (Juz 2-25 bisa ditambahkan nanti) ...
  26: ["Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Az-Zariyat"],
  27: ["At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid"],
  28: ["Al-Mujadilah", "Al-Hasyr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Tagabun", "At-Talaq", "At-Tahrim"],
  29: ["Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddassir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat"],
  30: [
    "An-Naba'", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", 
    "Al-Insyiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Gasyiyah", "Al-Fajr", 
    "Al-Balad", "Asy-Syams", "Al-Lail", "Ad-Duha", "Al-Insyirah", "At-Tin", 
    "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat", "Al-Qari'ah", 
    "At-Takasur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraisy", "Al-Ma'un", 
    "Al-Kautsar", "Al-Kafirun", "An-Nasr", "Al-Lahab", "Al-Ikhlas", "Al-Falaq", "An-Nas"
  ]
};
const juzList = [30, 29, 28, 27, 26, 1]; // Prioritas Juz Sekolah

const Tahfidz = () => {
  const [students, setStudents] = useState([]);
  const [history, setHistory] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedJuz, setSelectedJuz] = useState("30");
  const [selectedSurah, setSelectedSurah] = useState(quranData[30][0]); // Default An-Naba
  const [ayatStart, setAyatStart] = useState("");
  const [ayatEnd, setAyatEnd] = useState("");
  const [surahList, setSurahList] = useState(quranData[30]); 

  const tahfidzRef = collection(db, "tahfidz");

  // 1. Load Siswa & Riwayat (Filtered by Teacher)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Ambil Siswa
          const qSiswa = query(collection(db, "siswa"), where("teacherId", "==", user.uid));
          const sSnap = await getDocs(qSiswa);
          const sList = sSnap.docs.map(d => ({ ...d.data(), id: d.id }));
          // Urutkan Nama A-Z
          sList.sort((a, b) => a.name.localeCompare(b.name));
          setStudents(sList);

          // Ambil History Tahfidz
          // Note: Jika muncul Error Index di console, klik link-nya!
          const qTahfidz = query(tahfidzRef, where("teacherId", "==", user.uid), orderBy("createdAt", "desc"));
          const hSnap = await getDocs(qTahfidz);
          setHistory(hSnap.docs.map(d => ({ ...d.data(), id: d.id })));
        } catch (error) {
          console.error("Error load data:", error);
        }
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Logic Ganti Juz
  const handleJuzChange = (e) => {
    const juz = e.target.value;
    setSelectedJuz(juz);
    const newList = quranData[juz] || [];
    setSurahList(newList);
    setSelectedSurah(newList[0] || ""); 
  };

  // 3. Simpan Hafalan
  const handleSave = async (status) => {
    if (!selectedStudent) return alert("Pilih Nama Siswa dulu!");
    if (!ayatStart) return alert("Isi Ayat minimal ayat awal!");
    
    const user = auth.currentUser;
    const siswa = students.find(s => s.id === selectedStudent);

    try {
      await addDoc(tahfidzRef, {
        teacherId: user.uid,
        studentId: selectedStudent,
        studentName: siswa.name,
        juz: selectedJuz,
        surah: selectedSurah,
        ayatStart: ayatStart,
        ayatEnd: ayatEnd || ayatStart, 
        status: status, 
        date: new Date().toLocaleDateString('id-ID'),
        createdAt: serverTimestamp()
      });
      
      alert("Data Tahfidz Tersimpan!");
      // Reset Form Kecil
      setAyatStart(""); setAyatEnd(""); 
      
      // Refresh History Manual (Biar cepat tanpa fetch ulang)
      const newEntry = {
        id: "temp-" + Date.now(),
        studentName: siswa.name,
        surah: selectedSurah,
        ayatStart, ayatEnd: ayatEnd || ayatStart,
        status, juz: selectedJuz,
        date: new Date().toLocaleDateString('id-ID')
      };
      setHistory([newEntry, ...history]);

    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan (Cek koneksi/Index Firebase).");
    }
  };

  const handleDelete = async (id) => {
    if(confirm("Hapus data ini?")) {
      try {
        await deleteDoc(doc(db, "tahfidz", id));
        setHistory(prev => prev.filter(h => h.id !== id));
      } catch (e) { alert("Gagal hapus"); }
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <BookOpen className="text-green-600"/> Program Tahfidz
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* === FORM INPUT === */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 h-fit">
          <h2 className="font-bold text-green-800 mb-4 flex items-center gap-2">
            <Mic size={20}/> Setoran Baru
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500">Nama Siswa</label>
              {students.length === 0 && !loading ? (
                 <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                    <AlertCircle size={16} /> 
                    <span>Belum ada siswa. Tambahkan di menu <b>Siswa</b> dulu.</span>
                 </div>
              ) : (
                <select className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-green-500" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
                  <option value="">- Pilih Siswa -</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-500">Juz</label>
                <select className="w-full p-2 border rounded-lg bg-white text-center font-bold" value={selectedJuz} onChange={handleJuzChange}>
                  {juzList.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500">Nama Surat</label>
                <select className="w-full p-2 border rounded-lg bg-white" value={selectedSurah} onChange={(e) => setSelectedSurah(e.target.value)}>
                  {surahList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
               <div>
                 <label className="text-xs font-bold text-gray-500">Ayat Awal</label>
                 <input type="number" className="w-full p-2 border rounded-lg text-center" placeholder="1" value={ayatStart} onChange={(e) => setAyatStart(e.target.value)} />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500">Ayat Akhir</label>
                 <input type="number" className="w-full p-2 border rounded-lg text-center" placeholder="5" value={ayatEnd} onChange={(e) => setAyatEnd(e.target.value)} />
               </div>
            </div>

            <div className="flex gap-2 pt-2">
               <button onClick={() => handleSave('Proses')} className="flex-1 bg-teal-50 text-teal-700 py-2 rounded-xl font-bold hover:bg-teal-100 border border-teal-200">
                 Progres
               </button>
               <button onClick={() => handleSave('Khatam')} className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold hover:bg-green-700 shadow-lg flex items-center justify-center gap-1">
                 <CheckCircle size={16}/> Selesai
               </button>
            </div>
          </div>
        </div>

        {/* === RIWAYAT SETORAN === */}
        <div className="lg:col-span-2 space-y-3">
           <h2 className="font-bold text-gray-800">Riwayat Setoran</h2>
           {loading && <p className="text-gray-400">Memuat...</p>}
           {!loading && history.length === 0 && <p className="text-gray-400 italic">Belum ada data setoran.</p>}
           
           {history.map((item) => (
             <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group">
               <div>
                 <div className="flex items-center gap-2">
                   <span className="font-bold text-gray-800">{item.studentName}</span>
                   {item.status === 'Khatam' ? (
                     <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={10}/> KHATAM</span>
                   ) : (
                     <span className="bg-teal-50 text-teal-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Progres</span>
                   )}
                 </div>
                 <div className="text-sm mt-1">
                   <span className="font-medium text-green-700">QS. {item.surah}</span> 
                   <span className="text-gray-500"> (Ayat {item.ayatStart}-{item.ayatEnd})</span>
                 </div>
                 <p className="text-xs text-gray-400 mt-1">Juz {item.juz} • {item.date}</p>
               </div>
               
               <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                 <Trash2 size={18} />
               </button>
             </div>
           ))}
        </div>

      </div>
    </div>
  );
};

export default Tahfidz;