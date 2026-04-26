import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, getDoc, doc } from 'firebase/firestore';
import { Send, Users, BookOpen, CheckCircle, School } from 'lucide-react';

const InputNilaiMapel = () => {
  const [sekolahAktif, setSekolahAktif] = useState('');
  const [daftarKelas, setDaftarKelas] = useState([]);
  const [selectedWaliId, setSelectedWaliId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedMapel, setSelectedMapel] = useState('');
  const [scores, setScores] = useState({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // 1. DETEKSI OTOMATIS JARINGAN SEKOLAH SAAT HALAMAN DIBUKA
  useEffect(() => {
    const initSchoolNetwork = async () => {
      setIsLoadingData(true);
      try {
        const user = auth.currentUser;
        if (!user) return;

        // a. Cek profil guru yang sedang login
        const userRef = doc(db, "teachers", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const schoolCode = userSnap.data().schoolName || '';
          setSekolahAktif(schoolCode);

          if (schoolCode) {
            // b. Cari semua kelas (Wali Kelas) yang ada di sekolah yang sama
            const q = query(collection(db, "teachers"), where("schoolName", "==", schoolCode));
            const guruSnap = await getDocs(q);
            
            const kelasDitemukan = [];
            guruSnap.forEach((d) => {
              const dataGuru = d.data();
              // Hanya ambil guru yang memiliki nama kelas (bertindak sebagai Wali Kelas)
              if (dataGuru.className) {
                kelasDitemukan.push({
                  idWali: d.id,
                  namaKelas: dataGuru.className,
                  namaWali: dataGuru.name
                });
              }
            });

            // Urutkan kelas berdasarkan abjad (misal 7A, 7B)
            kelasDitemukan.sort((a, b) => a.namaKelas.localeCompare(b.namaKelas));
            setDaftarKelas(kelasDitemukan);
          }
        }
      } catch (error) {
        console.error("Gagal memuat jaringan sekolah:", error);
      }
      setIsLoadingData(false);
    };

    initSchoolNetwork();
  }, []);

  // 2. FUNGSI SAAT KELAS DIPILIH DARI DROPDOWN
  const handlePilihKelas = async (idWali) => {
    setSelectedWaliId(idWali);
    setStudents([]);
    setScores({});
    
    if (!idWali) return;

    try {
      // Ambil daftar siswa yang bernaung di bawah Wali Kelas tersebut
      const q = query(collection(db, "siswa"), where("teacherId", "==", idWali));
      const snap = await getDocs(q);
      const listSiswa = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Urutkan nama siswa sesuai abjad
      setStudents(listSiswa.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      alert("Gagal mengambil data siswa di kelas ini.");
    }
  };

  // 3. FUNGSI UPDATE NILAI LOKAL DI TABEL
  const handleScoreChange = (studentId, category, value) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [category]: value
      }
    }));
  };

  // 4. FUNGSI KIRIM KE RUANG KARANTINA
  const handleSubmitToWaliKelas = async () => {
    if (!selectedMapel.trim()) return alert("Mohon isi Nama Mata Pelajaran terlebih dahulu!");
    if (Object.keys(scores).length === 0) return alert("Belum ada nilai yang diisi!");

    setIsSending(true);
    try {
      const user = auth.currentUser;
      const userName = user.displayName || "Guru Mapel";

      // Payload untuk "Ruang Tunggu" / Staging Area
      await addDoc(collection(db, "draft_nilai"), {
        senderId: user.uid,
        senderName: userName,
        receiverId: selectedWaliId,
        mapel: selectedMapel.trim(),
        dataNilai: scores,
        status: "pending", // Menunggu disetujui wali kelas
        timestamp: new Date().getTime(),
        createdAt: new Date().toLocaleString("id-ID")
      });

      alert("Laporan Nilai berhasil dikirim ke Wali Kelas!");
      // Reset form setelah sukses
      setScores({});
      setSelectedMapel('');
      setSelectedWaliId('');
      setStudents([]);
    } catch (e) {
      alert("Terjadi kesalahan saat mengirim nilai.");
    }
    setIsSending(false);
  };

  if (isLoadingData) {
    return <div className="p-8 text-center text-gray-500 font-bold animate-pulse">Menghubungkan ke Jaringan Sekolah...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      
      {/* HEADER & PILIH KELAS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-teal-100">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
          <div className="p-3 bg-teal-100 text-teal-700 rounded-xl">
            <School size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Jaringan Penilaian Terpadu</h1>
            <p className="text-sm text-gray-500 font-medium">Terhubung dengan: <span className="text-teal-600 font-bold uppercase">{sekolahAktif || 'Belum Diatur'}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-gray-500 ml-1 block mb-2 uppercase">Pilih Kelas Tujuan</label>
            <select 
              value={selectedWaliId}
              onChange={(e) => handlePilihKelas(e.target.value)}
              className="w-full p-3 border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-teal-50 text-teal-900 font-bold cursor-pointer outline-none"
            >
              <option value="">-- Pilih Kelas yang Anda Ajar --</option>
              {daftarKelas.map(kelas => (
                <option key={kelas.idWali} value={kelas.idWali}>
                  Kelas {kelas.namaKelas} (Wali: {kelas.namaWali})
                </option>
              ))}
            </select>
          </div>
          
          {students.length > 0 && (
             <div>
               <label className="text-xs font-bold text-gray-500 ml-1 block mb-2 uppercase">Nama Mata Pelajaran</label>
               <input 
                 type="text" 
                 placeholder="Contoh: IPA Terpadu" 
                 value={selectedMapel}
                 onChange={(e) => setSelectedMapel(e.target.value)}
                 className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
               />
             </div>
          )}
        </div>
      </div>

      {/* AREA INPUT NILAI */}
      {students.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in">
          <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-teal-300" />
              <span className="font-bold text-sm">Input Nilai Siswa</span>
            </div>
            <span className="text-xs font-bold bg-gray-700 px-3 py-1 rounded-full">{students.length} Siswa</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase font-bold border-b">
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4 text-center">Tugas / UH</th>
                  <th className="p-4 text-center">PTS</th>
                  <th className="p-4 text-center">PAS</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, index) => (
                  <tr key={s.id} className="border-b hover:bg-teal-50 transition-colors">
                    <td className="p-4 font-semibold text-gray-700">
                      <span className="text-gray-400 mr-3 text-xs">{index + 1}.</span>{s.name}
                    </td>
                    {['UH', 'PTS', 'PAS'].map(kat => (
                      <td key={kat} className="p-2">
                        <input 
                          type="number"
                          placeholder="0-100"
                          className="w-20 mx-auto block p-2 border border-gray-200 rounded-lg text-center font-semibold text-gray-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                          onChange={(e) => handleScoreChange(s.id, kat, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <CheckCircle size={16} className="text-teal-600" />
              Nilai akan masuk ke ruang verifikasi Wali Kelas.
            </div>
            <button 
              onClick={handleSubmitToWaliKelas}
              disabled={isSending}
              className="w-full md:w-auto bg-teal-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-teal-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Send size={18} /> {isSending ? "Mengirim Data..." : "Kirim Laporan Nilai"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InputNilaiMapel;