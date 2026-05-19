import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { BookOpen, Plus, Trash2, Search, History, ChevronDown, ChevronUp, X, Star, BookMarked } from 'lucide-react';

// === DATABASE MINI AL-QUR'AN ===
const QURAN_DATA = {
  "Juz 30": [
    { name: "An-Naba'", ayat: 40 }, { name: "An-Nazi'at", ayat: 46 }, { name: "'Abasa", ayat: 42 }, 
    { name: "At-Takwir", ayat: 29 }, { name: "Al-Infitar", ayat: 19 }, { name: "Al-Mutaffifin", ayat: 36 }, 
    { name: "Al-Inshiqaq", ayat: 25 }, { name: "Al-Buruj", ayat: 22 }, { name: "At-Tariq", ayat: 17 }, 
    { name: "Al-A'la", ayat: 19 }, { name: "Al-Ghashiyah", ayat: 26 }, { name: "Al-Fajr", ayat: 30 }, 
    { name: "Al-Balad", ayat: 20 }, { name: "Ash-Shams", ayat: 15 }, { name: "Al-Lail", ayat: 21 }, 
    { name: "Ad-Duha", ayat: 11 }, { name: "Al-Insyirah", ayat: 8 }, { name: "At-Tin", ayat: 8 }, 
    { name: "Al-'Alaq", ayat: 19 }, { name: "Al-Qadr", ayat: 5 }, { name: "Al-Bayyinah", ayat: 8 }, 
    { name: "Az-Zalzalah", ayat: 8 }, { name: "Al-'Adiyat", ayat: 11 }, { name: "Al-Qari'ah", ayat: 11 }, 
    { name: "At-Takatsur", ayat: 8 }, { name: "Al-'Asr", ayat: 3 }, { name: "Al-Humazah", ayat: 9 }, 
    { name: "Al-Fil", ayat: 5 }, { name: "Quraisy", ayat: 4 }, { name: "Al-Ma'un", ayat: 7 }, 
    { name: "Al-Kautsar", ayat: 3 }, { name: "Al-Kafirun", ayat: 6 }, { name: "An-Nasr", ayat: 3 }, 
    { name: "Al-Lahab", ayat: 5 }, { name: "Al-Ikhlas", ayat: 4 }, { name: "Al-Falaq", ayat: 5 }, { name: "An-Nas", ayat: 6 }
  ],
  "Juz 29": [
    { name: "Al-Mulk", ayat: 30 }, { name: "Al-Qalam", ayat: 52 }, { name: "Al-Haqqah", ayat: 52 }, 
    { name: "Al-Ma'arij", ayat: 44 }, { name: "Nuh", ayat: 28 }, { name: "Al-Jinn", ayat: 28 }, 
    { name: "Al-Muzzammil", ayat: 20 }, { name: "Al-Muddassir", ayat: 56 }, { name: "Al-Qiyamah", ayat: 40 }, 
    { name: "Al-Insan", ayat: 31 }, { name: "Al-Mursalat", ayat: 50 }
  ],
  "Juz 28": [
    { name: "Al-Mujadilah", ayat: 22 }, { name: "Al-Hasyr", ayat: 24 }, { name: "Al-Mumtahanah", ayat: 13 }, 
    { name: "As-Saff", ayat: 14 }, { name: "Al-Jumu'ah", ayat: 11 }, { name: "Al-Munafiqun", ayat: 11 }, 
    { name: "At-Tagabun", ayat: 18 }, { name: "At-Talaq", ayat: 12 }, { name: "At-Tahrim", ayat: 12 }
  ],
  "Juz 1 - 27 (Surat Lainnya)": [
    { name: "Al-Fatihah", ayat: 7 }, { name: "Al-Baqarah", ayat: 286 }, { name: "Ali 'Imran", ayat: 200 }, 
    { name: "An-Nisa'", ayat: 176 }, { name: "Al-Ma'idah", ayat: 120 }, { name: "Al-An'am", ayat: 165 }, 
    { name: "Al-A'raf", ayat: 206 }, { name: "Al-Anfal", ayat: 75 }, { name: "At-Taubah", ayat: 129 }, 
    { name: "Yunus", ayat: 109 }, { name: "Hud", ayat: 123 }, { name: "Yusuf", ayat: 111 }, 
    { name: "Ar-Ra'd", ayat: 43 }, { name: "Ibrahim", ayat: 52 }, { name: "Al-Hijr", ayat: 99 }, 
    { name: "An-Nahl", ayat: 128 }, { name: "Al-Isra'", ayat: 111 }, { name: "Al-Kahf", ayat: 110 }, 
    { name: "Maryam", ayat: 98 }, { name: "Taha", ayat: 135 }, { name: "Al-Anbiya'", ayat: 112 }, 
    { name: "Al-Hajj", ayat: 78 }, { name: "Al-Mu'minun", ayat: 118 }, { name: "An-Nur", ayat: 64 }, 
    { name: "Al-Furqan", ayat: 77 }, { name: "Asy-Syu'ara'", ayat: 227 }, { name: "An-Naml", ayat: 93 }, 
    { name: "Al-Qasas", ayat: 88 }, { name: "Al-'Ankabut", ayat: 69 }, { name: "Ar-Rum", ayat: 60 }, 
    { name: "Luqman", ayat: 34 }, { name: "As-Sajdah", ayat: 30 }, { name: "Al-Ahzab", ayat: 73 }, 
    { name: "Saba'", ayat: 54 }, { name: "Fatir", ayat: 45 }, { name: "Yasin", ayat: 83 }, 
    { name: "As-Saffat", ayat: 182 }, { name: "Sad", ayat: 88 }, { name: "Az-Zumar", ayat: 75 }, 
    { name: "Gafir", ayat: 85 }, { name: "Fussilat", ayat: 54 }, { name: "Asy-Syura", ayat: 53 }, 
    { name: "Az-Zukhruf", ayat: 89 }, { name: "Ad-Dukhan", ayat: 59 }, { name: "Al-Jasiyah", ayat: 37 }, 
    { name: "Al-Ahqaf", ayat: 35 }, { name: "Muhammad", ayat: 38 }, { name: "Al-Fath", ayat: 29 }, 
    { name: "Al-Hujurat", ayat: 18 }, { name: "Qaf", ayat: 45 }, { name: "Az-Zariyat", ayat: 60 }, 
    { name: "At-Tur", ayat: 49 }, { name: "An-Najm", ayat: 62 }, { name: "Al-Qamar", ayat: 55 }, 
    { name: "Ar-Rahman", ayat: 78 }, { name: "Al-Waqi'ah", ayat: 96 }, { name: "Al-Hadid", ayat: 29 }
  ]
};

const Tahfidz = () => {
  const [students, setStudents] = useState([]);
  const [tahfidzData, setTahfidzData] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedStudents, setExpandedStudents] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    studentId: '', studentName: '', juz: 'Juz 30', surah: '', ayat: '', predikat: 'Lancar', maxAyat: 0
  });

  const tahfidzRef = collection(db, "tahfidz");
  const siswaRef = collection(db, "siswa");

  const fetchData = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      try {
        const qSiswa = query(siswaRef, where("teacherId", "==", user.uid));
        const siswaSnap = await getDocs(qSiswa);
        let listSiswa = siswaSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
        listSiswa.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(listSiswa);

        const qTahfidz = query(tahfidzRef, where("teacherId", "==", user.uid), orderBy("createdAt", "desc"));
        const tahfidzSnap = await getDocs(qTahfidz);
        
        let groupedData = {};
        tahfidzSnap.forEach(d => {
          const data = d.data();
          if (!groupedData[data.studentId]) groupedData[data.studentId] = [];
          groupedData[data.studentId].push({ id: d.id, ...data });
        });
        
        setTahfidzData(groupedData);
      } catch (error) { console.error("Error:", error); }
    }
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => { if (user) fetchData(); });
    return () => unsubscribe();
  }, []);

  const handleStudentSelect = (e) => {
    const selectedId = e.target.value;
    const selectedStudent = students.find(s => s.id === selectedId);
    setFormData({ ...formData, studentId: selectedId, studentName: selectedStudent ? selectedStudent.name : '' });
  };

  const handleJuzChange = (e) => {
    setFormData({ ...formData, juz: e.target.value, surah: '', ayat: '', maxAyat: 0 });
  };

  const handleSurahChange = (e) => {
    const selectedSurahName = e.target.value;
    const surahDetail = QURAN_DATA[formData.juz].find(s => s.name === selectedSurahName);
    setFormData({ 
      ...formData, 
      surah: selectedSurahName, 
      maxAyat: surahDetail ? surahDetail.ayat : 0,
      ayat: '' 
    });
  };

  const handleSetorFull = () => {
    if (formData.maxAyat > 0) {
      setFormData({ ...formData, ayat: `1 - ${formData.maxAyat}` });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.studentId) return alert("Pilih siswa terlebih dahulu!");
    if (!formData.surah) return alert("Pilih Surah terlebih dahulu!");

    setIsSaving(true);
    try {
      const user = auth.currentUser;
      const now = new Date();
      const displayDate = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      const dataToSave = {
        studentId: formData.studentId,
        studentName: formData.studentName,
        juz: formData.juz,
        surah: formData.surah,
        ayat: formData.ayat || `1 - ${formData.maxAyat}`, 
        predikat: formData.predikat,
        teacherId: user.uid,
        displayDate: displayDate,
        createdAt: now.getTime()
      };

      await addDoc(tahfidzRef, dataToSave);
      setIsModalOpen(false);
      setFormData({ studentId: '', studentName: '', juz: 'Juz 30', surah: '', ayat: '', predikat: 'Lancar', maxAyat: 0 });
      fetchData();
    } catch (error) { alert("Gagal menyimpan setoran hafalan."); }
    setIsSaving(false);
  };

  const handleDelete = async (id, surah) => {
    if (confirm(`Hapus riwayat setoran Surah ${surah}?`)) {
      try { await deleteDoc(doc(db, "tahfidz", id)); fetchData(); } 
      catch (error) { alert("Gagal menghapus riwayat."); }
    }
  };

  const toggleExpand = (studentId) => setExpandedStudents(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in font-sans text-gray-800">
      
      {/* HEADER FLAT & CLEAN */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
             <BookOpen size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold text-gray-800">Tahfidz & Hafalan</h1>
             <p className="text-sm text-gray-500 mt-1">Catat progres hafalan surah siswa secara berkala.</p>
           </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-gray-800 text-white px-5 py-2.5 rounded-lg hover:bg-gray-900 font-medium transition-colors text-sm">
          <Plus size={18} /> Tambah Setoran
        </button>
      </div>

      {/* FILTER PENCARIAN MINIMALIS */}
      <div className="bg-white p-2 rounded-xl border border-gray-200 flex items-center shadow-sm">
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-3 text-gray-400" size={18} />
          <input type="text" placeholder="Cari nama siswa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border-none bg-transparent outline-none focus:ring-0 text-sm font-medium text-gray-700 placeholder-gray-400" />
        </div>
      </div>

      {/* KONTEN DATA PER SISWA */}
      {loading ? <p className="text-center py-10 text-gray-400 font-medium animate-pulse">Memuat data hafalan...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStudents.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400 text-sm">
              Siswa tidak ditemukan.
            </div>
          ) : (
            filteredStudents.map((student) => {
              const records = tahfidzData[student.id] || [];
              const isExpanded = expandedStudents[student.id];
              const displayedRecords = isExpanded ? records : records.slice(0, 3);
              const hiddenCount = records.length - 3;

              return (
                <div key={student.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col h-full">
                  {/* Card Header */}
                  <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-base">{student.name}</h3>
                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-gray-200">
                      <History size={12} className="text-gray-400"/> {records.length} Setoran
                    </div>
                  </div>

                  {/* List Setoran */}
                  <div className="flex-1 flex flex-col bg-white">
                    {records.length === 0 ? (
                      <div className="flex items-center justify-center p-8">
                         <p className="text-xs text-gray-400 italic">Belum ada riwayat setoran.</p>
                      </div>
                    ) : (
                      displayedRecords.map((record) => (
                        <div key={record.id} className="p-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <BookMarked size={12} className="text-gray-400"/>
                                <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{record.juz}</span>
                              </div>
                              <h4 className="font-bold text-gray-800 text-sm">{record.surah}</h4>
                              <p className="text-[11px] text-gray-500 font-mono mt-0.5">Ayat: {record.ayat}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded border
                              ${record.predikat === 'Lancar' ? 'bg-green-50 text-green-700 border-green-200' : 
                                record.predikat === 'Kurang Lancar' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                                'bg-red-50 text-red-700 border-red-200'}`}>
                              {record.predikat}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-[10px] text-gray-400 font-medium">{record.displayDate}</span>
                            <button onClick={() => handleDelete(record.id, record.surah)} className="text-gray-300 hover:text-red-500 transition-colors p-1" title="Hapus Riwayat">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Toggle Button */}
                  {hiddenCount > 0 && (
                    <div className="bg-gray-50 border-t border-gray-100">
                      <button onClick={() => toggleExpand(student.id)} className="w-full py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                        {isExpanded ? <><ChevronUp size={14} /> Sembunyikan</> : <><ChevronDown size={14} /> Tampilkan {hiddenCount} riwayat lain</>}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL TAMBAH SETORAN (Dokumen Style) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-zoom-in border border-gray-100 flex flex-col">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 rounded-t-2xl">
              <h3 className="text-base font-bold text-gray-800">Buku Setoran Tahfidz</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                 <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto bg-gray-50/30">
              
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Pilih Siswa</label>
                <select value={formData.studentId} onChange={handleStudentSelect} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800" required>
                  <option value="">-- Daftar Siswa --</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Kategori Juz</label>
                  <select value={formData.juz} onChange={handleJuzChange} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800">
                    {Object.keys(QURAN_DATA).map(juz => <option key={juz} value={juz}>{juz}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Pilih Surah</label>
                  <select value={formData.surah} onChange={handleSurahChange} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800" required>
                    <option value="">-- Surah --</option>
                    {QURAN_DATA[formData.juz].map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase ml-0.5">Ayat Disetor</label>
                  {formData.maxAyat > 0 && (
                     <span className="text-[9px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                       Max: {formData.maxAyat} Ayat
                     </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={formData.ayat} onChange={(e) => setFormData({...formData, ayat: e.target.value})} className="flex-1 p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800 font-mono" placeholder={`Misal: 1-5 (Kosongkan jika Full)`} />
                  <button type="button" onClick={handleSetorFull} disabled={!formData.surah} className="bg-white text-gray-700 px-4 rounded-lg font-bold text-xs hover:bg-gray-50 transition-colors disabled:opacity-50 border border-gray-200">
                    Setor Full
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-0.5">Predikat Kelancaran</label>
                <div className="flex gap-2">
                  {['Lancar', 'Kurang Lancar', 'Mengulang'].map(status => (
                    <label key={status} className={`flex-1 flex flex-col items-center justify-center py-2.5 px-1 rounded-lg border cursor-pointer transition-all text-center
                      ${formData.predikat === status 
                        ? (status === 'Lancar' ? 'border-green-500 bg-green-50 text-green-700' : status === 'Kurang Lancar' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-red-500 bg-red-50 text-red-700') 
                        : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'}`}>
                      <input type="radio" name="predikat" value={status} checked={formData.predikat === status} onChange={(e) => setFormData({...formData, predikat: e.target.value})} className="hidden" />
                      <Star size={14} className="mb-1" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button type="submit" disabled={isSaving} className="w-full py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm">
                  {isSaving ? 'Menyimpan...' : 'Simpan Catatan Tahfidz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tahfidz;