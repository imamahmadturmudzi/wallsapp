import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { BarChart3, Save, Star, Award, BookOpen, Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const Nilai = () => {
  const [activeTab, setActiveTab] = useState('akademik');
  const [students, setStudents] = useState([]);
  const [mapelList, setMapelList] = useState([]);
  const [ekskulList, setEkskulList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedMapel, setSelectedMapel] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("UH1");
  
  // STATE BARU: Mengadopsi Sistem "Bucket" (1 Siswa = 1 Objek Besar)
  const [scores, setScores] = useState({});

  const fetchData = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      try {
        // 1. Ambil Data Siswa
        const qSiswa = query(collection(db, "siswa"), where("teacherId", "==", user.uid));
        const siswaSnap = await getDocs(qSiswa);
        let listSiswa = siswaSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        listSiswa.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(listSiswa);

        // 2. Ambil Master Mapel
        const qMapel = query(collection(db, "mapel"), where("teacherId", "==", user.uid));
        const mapelSnap = await getDocs(qMapel);
        let listM = mapelSnap.docs.map(d => d.data().namaMapel);
        listM.sort((a, b) => a.localeCompare(b));
        setMapelList(listM);
        if (listM.length > 0) setSelectedMapel(listM[0]);

        // 3. Ambil Master Ekskul
        const qEkskul = query(collection(db, "ekskul"), where("teacherId", "==", user.uid));
        const ekskulSnap = await getDocs(qEkskul);
        let listE = ekskulSnap.docs.map(d => d.data().namaEkskul);
        setEkskulList(listE);

        // 4. AMBIL DATA NILAI (HANYA 1 KALI REQUEST UNTUK SEMUA TAB!)
        const qNilai = query(collection(db, "academic_records"), where("teacherId", "==", user.uid));
        const nilaiSnap = await getDocs(qNilai);
        
        let bucketScores = {};
        nilaiSnap.forEach(d => {
          bucketScores[d.id] = d.data(); 
        });
        setScores(bucketScores);

      } catch (error) { console.error(error); }
    }
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => { if (user) fetchData(); });
    return () => unsubscribe();
  }, []);

  const handleAkademikChange = (studentId, field, value) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        akademik: {
          ...(prev[studentId]?.akademik || {}),
          [selectedMapel]: {
            ...(prev[studentId]?.akademik?.[selectedMapel] || {}),
            [selectedKategori]: {
              ...(prev[studentId]?.akademik?.[selectedMapel]?.[selectedKategori] || {}),
              [field]: value
            }
          }
        }
      }
    }));
  };

  const handleNonAkademikChange = (studentId, field, value) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        non_akademik: {
          ...(prev[studentId]?.non_akademik || {}),
          [field]: value
        }
      }
    }));
  };

  const handleSaveAll = async () => {
    try {
      const user = auth.currentUser;
      const promises = Object.keys(scores).map(async (studentId) => {
        const studentData = students.find(s => s.id === studentId);
        if (!studentData) return;

        const docRef = doc(db, "academic_records", studentId);
        await setDoc(docRef, {
          ...scores[studentId],
          studentId: studentId,
          studentName: studentData.name,
          teacherId: user.uid,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });

      await Promise.all(promises);
      alert("Seluruh nilai kelas berhasil disimpan dalam Bucket!");
    } catch (error) { alert("Gagal menyimpan nilai."); }
    
    // BACKUP KE GUDANG 200GB (GOOGLE SHEETS)
    try {
      const dataBackup = students.map(s => ({
        namaSiswa: s.name,
        kelas: "Kelas Anda", 
        rekapNilai: JSON.stringify(scores[s.id] || {}) 
      }));

      const GAS_URL = "https://script.google.com/macros/s/AKfycbzVmdNypkWXp7V4phMMYIjrvTuOmgkSSBJvDKg_WQGap5CNnpBJQSpgyMETYyljAtjLqw/exec";
      
      await fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "text/plain" }, 
        body: JSON.stringify(dataBackup)
      });
      console.log("Backup diam-diam ke 200GB sukses!");
      alert("Nilai berhasil disimpan di Rapor dan diarsip ke Gudang Sekolah!");
    } catch (error) {
      console.error("Gagal menyimpan:", error);
      alert("Terjadi kesalahan saat menyimpan data ke arsip.");
    }
  };

  const handleExportExcel = () => {
    if (students.length === 0) return alert("Belum ada data siswa untuk diexport!");

    const dataToExport = students.map((s, index) => {
      const studentData = scores[s.id] || {};
      const akademik = studentData.akademik || {};
      const nonAkademik = studentData.non_akademik || {};

      let row = {
        "No": index + 1,
        "Nama Siswa": s.name,
      };

      mapelList.forEach(mapel => {
        ['UH1', 'UH2', 'PTS', 'PAS'].forEach(kat => {
          row[`${mapel} - ${kat}`] = akademik[mapel]?.[kat]?.angka || "-";
        });
      });

      row["Sikap Spiritual"] = nonAkademik.sikapSpiritual || "-";
      row["Sikap Sosial"] = nonAkademik.sikapSosial || "-";
      row["Ekstrakurikuler"] = nonAkademik.ekskulTerpilih || "-";
      row["Nilai Ekskul"] = nonAkademik.nilaiEkskul || "-";

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Nilai Kelas");

    XLSX.writeFile(workbook, "Rekap_Nilai_WalasApp.xlsx");
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in font-sans text-gray-800">
      
      {/* HEADER FLAT & CLEAN */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
             <BarChart3 size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold text-gray-800">Penilaian Siswa</h1>
             <p className="text-sm text-gray-500 mt-1">Sistem rekapitulasi nilai terpusat dengan auto-backup.</p>
           </div>
        </div>
        
        {/* Kelompok Tombol Aksi */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
          <button onClick={handleExportExcel} className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <Download size={16} /> Unduh Excel
          </button>
          <button onClick={handleSaveAll} className="w-full sm:w-auto bg-gray-800 text-white px-5 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors">
            <Save size={16} /> Simpan Seluruh Nilai
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER: TAB, FILTER & TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
        
        {/* TABS MINIMALIS */}
        <div className="flex gap-2 p-4 border-b border-gray-100 bg-white overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('akademik')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'akademik' ? 'bg-gray-100 text-gray-800 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <BookOpen size={14} /> Nilai Akademik
          </button>
          <button onClick={() => setActiveTab('non-akademik')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'non-akademik' ? 'bg-gray-100 text-gray-800 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <Star size={14} /> Sikap & Ekskul
          </button>
        </div>

        {/* TOOLBAR FILTER */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 items-end">
          {activeTab === 'akademik' && (
            <>
              <div className="w-full md:w-56">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Mata Pelajaran</label>
                <select value={selectedMapel} onChange={(e) => setSelectedMapel(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800 transition-all">
                  {mapelList.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="w-full md:w-48">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Kategori Ujian</label>
                <select value={selectedKategori} onChange={(e) => setSelectedKategori(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800 transition-all">
                  <option value="UH1">Ulangan Harian 1</option>
                  <option value="UH2">Ulangan Harian 2</option>
                  <option value="PTS">UTS / PTS</option>
                  <option value="PAS">UAS / PAS</option>
                </select>
              </div>
            </>
          )}
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Cari nama siswa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800 transition-all placeholder-gray-400" />
          </div>
        </div>

        {/* AREA TABEL */}
        {loading ? (
          <div className="p-10 text-center text-gray-400 font-medium animate-pulse">Memuat data nilai...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm italic">Siswa tidak ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              {activeTab === 'akademik' ? (
                <>
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-100 tracking-wider">
                    <tr>
                      <th className="p-4 w-12 text-center">No</th>
                      <th className="p-4 min-w-[200px]">Nama Siswa</th>
                      <th className="p-4 text-center w-36">Nilai Angka</th>
                      <th className="p-4 min-w-[300px]">Catatan / Pesan Guru</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, idx) => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-center text-gray-400 font-medium">{idx + 1}</td>
                        <td className="p-4 font-semibold text-gray-800 text-base">{s.name}</td>
                        <td className="p-4">
                          <input type="number" 
                            value={scores[s.id]?.akademik?.[selectedMapel]?.[selectedKategori]?.angka || ""} 
                            onChange={(e) => handleAkademikChange(s.id, 'angka', e.target.value)} 
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-center font-semibold text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all placeholder-gray-300" placeholder="0" />
                        </td>
                        <td className="p-4">
                          <input type="text" 
                            value={scores[s.id]?.akademik?.[selectedMapel]?.[selectedKategori]?.catatan || ""} 
                            onChange={(e) => handleAkademikChange(s.id, 'catatan', e.target.value)} 
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all placeholder-gray-300" placeholder="Opsional: Tulis catatan..." />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              ) : (
                <>
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-100 tracking-wider">
                    <tr>
                      <th className="p-4 w-12 text-center">No</th>
                      <th className="p-4 min-w-[200px]">Nama Siswa</th>
                      <th className="p-4 text-center min-w-[160px]">Sikap Spiritual</th>
                      <th className="p-4 text-center min-w-[160px]">Sikap Sosial</th>
                      <th className="p-4 min-w-[200px]">Ekstrakurikuler</th>
                      <th className="p-4 text-center w-28">Nilai Ekskul</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, idx) => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-center text-gray-400 font-medium">{idx + 1}</td>
                        <td className="p-4 font-semibold text-gray-800 text-base">{s.name}</td>
                        <td className="p-4">
                          <select value={scores[s.id]?.non_akademik?.sikapSpiritual || ""} onChange={(e) => handleNonAkademikChange(s.id, 'sikapSpiritual', e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all">
                            <option value="">-- Pilih --</option>
                            <option value="Sangat Baik">Sangat Baik</option>
                            <option value="Baik">Baik</option>
                            <option value="Cukup">Cukup</option>
                            <option value="Perlu Bimbingan">Perlu Bimbingan</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <select value={scores[s.id]?.non_akademik?.sikapSosial || ""} onChange={(e) => handleNonAkademikChange(s.id, 'sikapSosial', e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all">
                            <option value="">-- Pilih --</option>
                            <option value="Sangat Baik">Sangat Baik</option>
                            <option value="Baik">Baik</option>
                            <option value="Cukup">Cukup</option>
                            <option value="Perlu Bimbingan">Perlu Bimbingan</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <select value={scores[s.id]?.non_akademik?.ekskulTerpilih || ""} onChange={(e) => handleNonAkademikChange(s.id, 'ekskulTerpilih', e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all">
                            <option value="">-- Pilih Ekskul --</option>
                            {ekskulList.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                          </select>
                        </td>
                        <td className="p-4 text-center">
                          <select value={scores[s.id]?.non_akademik?.nilaiEkskul || ""} onChange={(e) => handleNonAkademikChange(s.id, 'nilaiEkskul', e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-800 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all text-center">
                            <option value="">-</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Nilai;