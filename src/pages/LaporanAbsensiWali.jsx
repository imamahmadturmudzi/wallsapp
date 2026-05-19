import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Calendar, UserCheck, AlertCircle, ShieldCheck, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LaporanAbsensiWali = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapelCount, setMapelCount] = useState(0); // Menghitung berapa mapel yang sudah laporan
  
  const today = new Date().toLocaleDateString('en-CA'); 
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    const fetchAggregatedData = async () => {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1. Ambil daftar siswa di kelas Wali Kelas ini
        const qSiswa = query(collection(db, "siswa"), where("teacherId", "==", user.uid));
        const snapSiswa = await getDocs(qSiswa);
        const listSiswa = snapSiswa.docs.map(d => ({ 
          id: d.id, 
          name: d.data().name || d.data().nama, 
          nisn: d.data().nisn 
        }));
        listSiswa.sort((a, b) => a.name.localeCompare(b.name));

        // 2. Siapkan wadah agregasi
        const aggregated = {};
        listSiswa.forEach(s => {
          aggregated[s.id] = { ...s, statuses: [], details: [] };
        });

        // 3. Tarik seluruh laporan presensi Guru Mapel HARI INI untuk KELAS INI
        const qMapel = query(
          collection(db, "presensi_mapel"), 
          where("classId", "==", user.uid),
          where("date", "==", selectedDate)
        );
        const snapMapel = await getDocs(qMapel);
        
        setMapelCount(snapMapel.size); // Berapa guru yang sudah absen hari ini?

        // 4. Masukkan data tiap mapel ke wadah siswa
        snapMapel.forEach(doc => {
          const data = doc.data();
          const mapelName = data.mapel;
          
          Object.keys(data.records).forEach(sId => {
            if (aggregated[sId]) {
              const statusMapel = data.records[sId];
              aggregated[sId].statuses.push(statusMapel);
              // Menyimpan riwayat (Contoh: "Matematika: H")
              aggregated[sId].details.push(`${mapelName}: ${statusMapel}`);
            }
          });
        });

        // 5. EKSEKUSI LOGIKA PRIORITAS (Hierarki Keputusan Akhir)
        const finalData = Object.values(aggregated).map(student => {
          let finalStatus = '?'; // Jika belum ada guru yang absen
          
          if (student.statuses.length > 0) {
            if (student.statuses.includes('A')) finalStatus = 'A';       // Prioritas 1: Alpa/Bolos
            else if (student.statuses.includes('D')) finalStatus = 'D';  // Prioritas 2: Dispensasi
            else if (student.statuses.includes('S')) finalStatus = 'S';  // Prioritas 3: Sakit
            else if (student.statuses.includes('I')) finalStatus = 'I';  // Prioritas 3: Izin
            else finalStatus = 'H';                                      // Prioritas 4: Hadir (Jika semua H)
          }

          return { ...student, finalStatus };
        });

        setStudents(finalData);
      } catch (error) {
        console.error("Gagal menarik laporan agregasi:", error);
      }
      setLoading(false);
    };

    fetchAggregatedData();
  }, [selectedDate]);

  // Kalkulasi Rekap Harian (Berdasarkan Status Final)
  const rekap = { H: 0, S: 0, I: 0, A: 0, D: 0, '?': 0 };
  students.forEach(s => {
    if (rekap[s.finalStatus] !== undefined) rekap[s.finalStatus]++;
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in font-sans text-gray-800">
      
      {/* HEADER & DATE PICKER */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center border border-teal-100 shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Monitor Kehadiran Harian</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Laporan terpusat dari <span className="font-bold text-teal-600">{mapelCount} Mata Pelajaran</span> hari ini.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-44">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" size={16} />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-teal-50 border border-teal-100 text-teal-800 rounded-lg outline-none font-bold text-sm cursor-pointer"
            />
          </div>
          <button 
            onClick={() => alert("Fitur cetak harian sedang disiapkan menuju CetakAbsensi.jsx!")}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm w-full md:w-auto justify-center"
          >
            <Printer size={14} className="text-gray-500" /> Cetak Harian
          </button>
        </div>
      </div>

      {/* REKAP KESIMPULAN */}
      <div className="grid grid-cols-5 gap-2 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Hadir</p>
          <p className="text-2xl font-bold text-green-600">{rekap.H}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sakit</p>
          <p className="text-2xl font-bold text-blue-600">{rekap.S}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Izin</p>
          <p className="text-2xl font-bold text-orange-600">{rekap.I}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dispens</p>
          <p className="text-2xl font-bold text-purple-600">{rekap.D}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Alpa</p>
          <p className="text-2xl font-bold text-red-600">{rekap.A}</p>
        </div>
      </div>

      {/* TABEL AGREGASI (TIDAK BISA DIKLIK, HANYA MONITORING) */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                <th className="p-4 pl-6 w-16 text-center">No</th>
                <th className="p-4">Nama Siswa</th>
                <th className="p-4 text-center w-36">Kesimpulan Final</th>
                <th className="p-4">Riwayat Per Mapel (Hari Ini)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="p-10 text-center text-gray-400 font-medium animate-pulse">Mensinkronisasi data guru mapel...</td></tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
                    <AlertCircle size={16}/> Tidak ada data siswa ditemukan.
                  </td>
                </tr>
              ) : students.map((s, index) => {
                
                // Menentukan warna badge kesimpulan
                let badgeColor = "bg-gray-100 text-gray-500 border-gray-200";
                let label = "Belum Ada Data";
                
                if (s.finalStatus === 'H') { badgeColor = "bg-green-50 text-green-700 border-green-200"; label = "Hadir Penuh"; }
                if (s.finalStatus === 'S') { badgeColor = "bg-blue-50 text-blue-700 border-blue-200"; label = "Sakit"; }
                if (s.finalStatus === 'I') { badgeColor = "bg-orange-50 text-orange-700 border-orange-200"; label = "Izin"; }
                if (s.finalStatus === 'D') { badgeColor = "bg-purple-50 text-purple-700 border-purple-200"; label = "Dispensasi"; }
                if (s.finalStatus === 'A') { badgeColor = "bg-red-50 text-red-700 border-red-200"; label = "Alpa / Bolos"; }

                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6 text-center text-xs text-gray-400 font-medium">{index + 1}</td>
                    <td className="p-4">
                      <div className="font-bold text-gray-800 text-sm uppercase">{s.name}</div>
                      <div className="text-[11px] font-mono text-gray-500 mt-0.5">NISN: {s.nisn || '-'}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${badgeColor} inline-block w-full shadow-sm`}>
                        {label}
                      </span>
                    </td>
                    <td className="p-4">
                      {s.details.length === 0 ? (
                        <span className="text-[11px] text-gray-400 italic">Guru mapel belum mengabsen.</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {s.details.map((detail, i) => (
                            <span key={i} className="text-[10px] font-bold bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded shadow-sm">
                              {detail}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default LaporanAbsensiWali;