import { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { BookMarked, Clock, X, Maximize2, Download } from 'lucide-react';

const LegerNilai = () => {
  const [legerSiswa, setLegerSiswa] = useState([]);
  const [mataPelajaranList, setMataPelajaranList] = useState([]);
  const [loadingLeger, setLoadingLeger] = useState(false);
  const [showModal, setShowModal] = useState(false); // Mengontrol Pop-up

  const handleBukaLeger = async () => {
    const user = auth.currentUser;
    if (!user) return alert("Sesi Anda tidak valid.");
    
    setShowModal(true); // Buka modal duluan
    setLoadingLeger(true); // Tampilkan animasi loading di dalam modal

    try {
      const q = query(collection(db, "siswa"), where("teacherId", "==", user.uid));
      const snap = await getDocs(q);
      
      let listSiswa = [];
      let setMapel = new Set(); 

      snap.forEach(doc => {
        const data = doc.data();
        listSiswa.push({ id: doc.id, ...data });
        if (data.nilaiMapel) {
          Object.keys(data.nilaiMapel).forEach(mapel => setMapel.add(mapel));
        }
      });

      listSiswa.sort((a, b) => a.name.localeCompare(b.name));
      setLegerSiswa(listSiswa);
      setMataPelajaranList(Array.from(setMapel).sort()); 

    } catch (error) {
      console.error("Gagal menarik data leger:", error);
      alert("Gagal memuat Leger Nilai.");
    }
    setLoadingLeger(false);
  };

  return (
    <>
      {/* TOMBOL PEMICU DI DASHBOARD */}
      <div className="space-y-4 mt-8 pt-8 border-t border-gray-200 animate-fade-in">
        <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-3xl p-6 shadow-lg shadow-teal-200 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-10 opacity-10"><BookMarked size={120} /></div>
          
          <div className="relative z-10">
            <h2 className="text-xl font-black text-white flex items-center gap-2 mb-1">
              Leger Nilai Kelas
            </h2>
          </div>
          
          <button 
            onClick={handleBukaLeger}
            className="w-full md:w-auto relative z-10 bg-white text-teal-700 px-6 py-3 rounded-2xl font-black hover:bg-teal-50 shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Maximize2 size={18} /> Buka Tabel Leger
          </button>
        </div>
      </div>

      {/* ========================================= */}
      {/* POP-UP MODAL LAYAR PENUH (LEGER)          */}
      {/* ========================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 md:p-6 animate-fade-in">
          
          {/* KOTAK MODAL */}
          <div className="bg-white w-full h-[95vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative animate-slide-up border border-teal-100">
            
            {/* HEADER MODAL */}
            <div className="bg-teal-50 p-6 border-b border-teal-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-teal-900 flex items-center gap-2">
                  <BookMarked className="text-teal-600" /> Buku Leger Nilai
                </h2>
                <p className="text-sm text-teal-700 font-medium mt-1">Rekapitulasi nilai otomatis dari seluruh Guru Mata Pelajaran.</p>
              </div>
              
              <button 
                onClick={() => setShowModal(false)}
                className="p-3 bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl shadow-sm border border-gray-100 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* BODY MODAL (TABEL) */}
            <div className="flex-1 overflow-auto bg-gray-50/50 p-6 relative">
              {loadingLeger ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-teal-600 space-y-4">
                  <Clock size={40} className="animate-spin opacity-50" />
                  <p className="font-bold animate-pulse text-lg">Menyinkronkan data dari brankas server...</p>
                </div>
              ) : legerSiswa.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 italic">
                  Belum ada data siswa atau nilai yang masuk di kelas ini.
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden inline-block min-w-full">
                  <table className="min-w-max w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600 text-xs uppercase font-black border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                        <th className="p-4 border-r text-center w-12 bg-gray-100 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">No</th>
                        <th className="p-4 border-r w-64 bg-gray-100 sticky left-[48px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Siswa</th>
                        
                        {mataPelajaranList.length === 0 ? (
                           <th className="p-4 text-center text-gray-400 font-normal italic">Belum ada nilai terinput</th>
                        ) : (
                           mataPelajaranList.map(mapel => (
                             <th key={mapel} className="p-4 border-r text-center w-28 hover:bg-gray-200 transition-colors cursor-default" title={mapel}>
                                <div className="truncate max-w-[100px] mx-auto">{mapel}</div>
                             </th>
                           ))
                        )}
                        <th className="p-4 text-center w-32 bg-teal-600 text-white shadow-md">Total Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {legerSiswa.map((siswa, index) => {
                        let totalNilai = 0;
                        if (siswa.nilaiMapel) {
                           mataPelajaranList.forEach(mapel => {
                             if (siswa.nilaiMapel[mapel]?.NilaiAkhir) totalNilai += Number(siswa.nilaiMapel[mapel].NilaiAkhir);
                           });
                        }
                        return (
                          <tr key={siswa.id} className="border-b border-gray-100 hover:bg-teal-50/30 group transition-colors">
                            <td className="p-4 text-center text-xs text-gray-500 border-r bg-white group-hover:bg-teal-50/30 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{index + 1}</td>
                            <td className="p-4 border-r font-bold text-gray-800 text-sm bg-white group-hover:bg-teal-50/30 sticky left-[48px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                               <div className="truncate w-60">{siswa.name}</div>
                               <div className="text-[10px] font-mono text-gray-400 font-normal mt-1">Kode: {siswa.nisn || '-'}</div>
                            </td>
                            {mataPelajaranList.map(mapel => {
                               const nilai = siswa.nilaiMapel?.[mapel]?.NilaiAkhir || '-';
                               return <td key={mapel} className={`p-4 border-r text-center font-bold ${nilai === '-' ? 'text-gray-300' : 'text-gray-700'}`}>{nilai}</td>
                            })}
                            <td className="p-4 text-center font-black text-teal-700 bg-teal-50/50">{totalNilai > 0 ? totalNilai : '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* FOOTER MODAL */}
            <div className="bg-white p-4 border-t border-gray-100 flex justify-between items-center shrink-0">
               <p className="text-[11px] text-gray-400 italic">
                 * Kolom <strong>No</strong> dan <strong>Nama Siswa</strong> dikunci (Freeze) agar tetap terlihat saat Anda menggeser tabel ke kanan.
               </p>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
};

export default LegerNilai;