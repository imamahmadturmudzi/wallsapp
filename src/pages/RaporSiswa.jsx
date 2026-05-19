import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { User, BookOpen, MessageCircle, Award, LogOut, Loader2, Signal, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RaporSiswa = () => {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null); // Data resmi untuk Kop Surat Rapor
  const [nilaiData, setNilaiData] = useState(null);
  const [tahfidz, setTahfidz] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true; 

    const fetchRapor = async () => {
      const dataMentah = localStorage.getItem('ortu_studentData');
      const studentId = dataMentah ? JSON.parse(dataMentah).id : null;

      if (!studentId) {
        if (isMounted) setLoading(false);
        return; 
      }

      try {
        // 1. Ambil Data Sekolah (Untuk Kop Rapor)
        const schoolSnap = await getDoc(doc(db, "metadata", "school_info"));
        if (schoolSnap.exists() && isMounted) setSchoolInfo(schoolSnap.data());

        // 2. Ambil Data Siswa
        const siswaRef = doc(db, "siswa", studentId);
        const siswaSnap = await getDoc(siswaRef);

        if (siswaSnap.exists()) {
          const dataSiswa = { id: siswaSnap.id, ...siswaSnap.data() };
          if (!isMounted) return; 
          setStudent(dataSiswa);

          // 3. Ambil Data Wali Kelas
          if (dataSiswa.teacherId) {
            const teacherSnap = await getDoc(doc(db, "teachers", dataSiswa.teacherId));
            if (teacherSnap.exists() && isMounted) setTeacher(teacherSnap.data());
          }

          // 4. Ambil Nilai Akademik
          const recordSnap = await getDoc(doc(db, "academic_records", dataSiswa.id));
          if (recordSnap.exists() && isMounted) {
            setNilaiData(recordSnap.data());
          } else if (isMounted) {
            setNilaiData({});
          }

          // 5. Ambil Tahfidz
          const qTahfidz = query(collection(db, "tahfidz"), where("studentId", "==", dataSiswa.id));
          const tahfidzSnap = await getDocs(qTahfidz);
          const listTahfidz = tahfidzSnap.docs.map(d => d.data());
          listTahfidz.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          if (isMounted) setTahfidz(listTahfidz);
        }
      } catch (error) {
        console.error("Error memuat rapor:", error);
      }
      
      if (isMounted) setLoading(false);
    };

    fetchRapor();
    return () => { isMounted = false; };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('ortu_studentData');
    localStorage.removeItem('isOrtuLoggedin');
    window.location.href = '/login'; 
  };

  const handleHubungiGuru = () => {
    if (!teacher?.whatsapp) return alert("Wali kelas belum mengatur nomor WhatsApp.");
    const wa = teacher.whatsapp.toString().replace(/\D/g, '').replace(/^0/, '62');
    window.open(`https://wa.me/${wa}?text=Halo Pak/Bu ${teacher?.name || 'Guru'}, saya orang tua dari ${student?.name}.`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 print:hidden">
        <Loader2 className="animate-spin text-teal-600" size={40} />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50 print:hidden">
        <p className="text-gray-500 mb-6">Sesi Anda telah habis atau data tidak ditemukan.</p>
        <button onClick={() => navigate('/login')} className="bg-gray-800 text-white px-6 py-2.5 rounded-xl font-bold">
          Kembali ke Halaman Login
        </button>
      </div>
    );
  }

  return (
    <>
      {/* ========================================================
        STYLE KHUSUS KERTAS A4 SAAT DICETAK (CSS PRINT MEDIA) 
        ========================================================
      */}
      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 1.5cm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
          }
        `}
      </style>

      {/* ========================================================
        WAJAH 1: TAMPILAN LAYAR (UI V2.0 MINIMALIS UNTUK HP/PC)
        ========================================================
      */}
      <div className="min-h-screen bg-gray-50 pb-20 font-sans print:hidden">
        
        {/* Header Flat */}
        <div className="bg-white border-b border-gray-200 px-5 py-4 flex justify-between items-center sticky top-0 z-50">
           <div className="flex items-center gap-2">
             <Signal size={18} className="text-teal-600" />
             <h1 className="text-base font-bold text-gray-800 tracking-tight">Portal Akademik</h1>
           </div>
           <div className="flex gap-2">
             <button onClick={handleLogout} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
               <LogOut size={18}/>
             </button>
           </div>
        </div>

        <div className="max-w-3xl mx-auto p-4 space-y-4">
          
          {/* Kartu Profil Siswa */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col sm:flex-row justify-between gap-4 items-center">
            <div className="flex items-center gap-4 text-left w-full">
              <div className="w-14 h-14 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 border border-teal-100 shrink-0">
                <User size={28} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">{student?.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 font-medium">Kelas {teacher?.className || "-"}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500 font-medium">NISN: {student?.nisn || "-"}</span>
                </div>
              </div>
            </div>
            <button onClick={handleHubungiGuru} className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 transition-colors">
              <MessageCircle size={16} /> Hubungi Wali Kelas
            </button>
          </div>

          {/* Nilai Akademik */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
              <BookOpen size={18} className="text-gray-400" /> Nilai Akademik
            </h3>
            {!nilaiData?.akademik || Object.keys(nilaiData.akademik).length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">Belum ada nilai akademik.</div>
            ) : (
              <div className="space-y-3">
                {Object.keys(nilaiData.akademik).map((mapel) => (
                  <div key={mapel} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5 font-bold text-gray-700 text-xs border-b border-gray-100">{mapel}</div>
                    <div className="p-3 grid grid-cols-4 gap-2 bg-white">
                      {['UH1', 'UH2', 'PTS', 'PAS'].map((kat) => (
                        <div key={kat} className="text-center p-2 rounded-lg border border-gray-50">
                          <p className="text-[10px] text-gray-400 font-bold mb-1">{kat}</p>
                          <p className="text-base font-bold text-gray-800">{nilaiData.akademik[mapel][kat]?.angka || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sikap & Ekskul */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Sikap & Karakter</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                   <span className="text-xs text-gray-600 font-medium">Spiritual</span>
                   <span className="font-bold text-gray-800">{nilaiData?.non_akademik?.sikapSpiritual || "-"}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                   <span className="text-xs text-gray-600 font-medium">Sosial</span>
                   <span className="font-bold text-gray-800">{nilaiData?.non_akademik?.sikapSosial || "-"}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Ekstrakurikuler</h3>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                 <p className="font-bold text-gray-800 text-sm mb-1">{nilaiData?.non_akademik?.ekskulTerpilih || "Belum Terdaftar"}</p>
                 <span className="text-xs text-gray-500">Predikat: <strong className="text-teal-600">{nilaiData?.non_akademik?.nilaiEkskul || "-"}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
        WAJAH 2: TAMPILAN KERTAS A4 SAAT DICETAK (PRINT ONLY)
        ========================================================
      */}
      <div className="hidden print:block bg-white text-black w-full text-sm font-serif pb-10">
        
        {/* KOP SURAT */}
        <div className="flex items-center justify-center border-b-[3px] border-black pb-4 mb-6">
          {schoolInfo?.logoUrl && (
            <img src={schoolInfo.logoUrl} alt="Logo" className="w-24 h-24 object-contain mr-6" />
          )}
          <div className="text-center">
            <h1 className="text-2xl font-bold uppercase tracking-wide">{schoolInfo?.namaSekolah || "NAMA SEKOLAH BELUM DIATUR"}</h1>
            <p className="text-sm mt-1">Sistem Informasi Manajemen Sekolah Terpadu</p>
            <p className="text-xs italic mt-0.5">Dicetak melalui sistem WalasApp pada {new Date().toLocaleDateString('id-ID')}</p>
          </div>
        </div>

        <h2 className="text-center font-bold text-lg mb-6 uppercase underline">Laporan Hasil Belajar Peserta Didik</h2>

        {/* BIODATA */}
        <div className="flex justify-between mb-6 text-sm">
          <table className="w-1/2">
            <tbody>
              <tr><td className="py-1 w-32">Nama Peserta Didik</td><td className="py-1 w-4">:</td><td className="py-1 font-bold">{student?.name}</td></tr>
              <tr><td className="py-1">NISN / NIS</td><td className="py-1">:</td><td className="py-1">{student?.nisn || "-"}</td></tr>
            </tbody>
          </table>
          <table className="w-1/2">
            <tbody>
              <tr><td className="py-1 w-24">Kelas</td><td className="py-1 w-4">:</td><td className="py-1 font-bold">{teacher?.className || "-"}</td></tr>
              <tr><td className="py-1">Fase / Semester</td><td className="py-1">:</td><td className="py-1">D / {schoolInfo?.semester || "Genap"}</td></tr>
              <tr><td className="py-1">Tahun Ajaran</td><td className="py-1">:</td><td className="py-1">{schoolInfo?.tahunAjaran || "2025/2026"}</td></tr>
            </tbody>
          </table>
        </div>

        {/* TABEL NILAI AKADEMIK */}
        <h3 className="font-bold mb-2">A. Nilai Akademik</h3>
        <table className="w-full border-collapse border border-black text-sm mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 w-10 text-center">No</th>
              <th className="border border-black p-2 text-left">Mata Pelajaran</th>
              <th className="border border-black p-2 w-20 text-center">Rata-rata</th>
              <th className="border border-black p-2 w-20 text-center">Predikat</th>
            </tr>
          </thead>
          <tbody>
            {!nilaiData?.akademik || Object.keys(nilaiData.akademik).length === 0 ? (
              <tr><td colSpan="4" className="border border-black p-4 text-center italic">Data nilai belum tersedia.</td></tr>
            ) : (
              Object.keys(nilaiData.akademik).map((mapel, idx) => {
                // Hitung Rata-rata sederhana (PAS sebagai acuan utama, atau rata-rata semua)
                const uh1 = Number(nilaiData.akademik[mapel]?.UH1?.angka || 0);
                const uh2 = Number(nilaiData.akademik[mapel]?.UH2?.angka || 0);
                const pts = Number(nilaiData.akademik[mapel]?.PTS?.angka || 0);
                const pas = Number(nilaiData.akademik[mapel]?.PAS?.angka || 0);
                
                // Logika rata-rata simpel: jika ada PAS, pakai PAS, jika tidak, rata-rata yang ada
                const divisor = (uh1?1:0) + (uh2?1:0) + (pts?1:0) + (pas?1:0) || 1;
                const avg = Math.round((uh1 + uh2 + pts + pas) / divisor);
                
                let predikat = "D";
                if(avg >= 90) predikat = "A";
                else if(avg >= 80) predikat = "B";
                else if(avg >= 70) predikat = "C";

                return (
                  <tr key={mapel}>
                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                    <td className="border border-black p-2">{mapel}</td>
                    <td className="border border-black p-2 text-center font-bold">{avg > 0 ? avg : "-"}</td>
                    <td className="border border-black p-2 text-center font-bold">{avg > 0 ? predikat : "-"}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* TABEL NON AKADEMIK */}
        <h3 className="font-bold mb-2">B. Pengembangan Diri & Sikap</h3>
        <table className="w-full border-collapse border border-black text-sm mb-12">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left">Aspek Penilaian</th>
              <th className="border border-black p-2 text-left">Keterangan / Predikat</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2">Sikap Spiritual</td>
              <td className="border border-black p-2">{nilaiData?.non_akademik?.sikapSpiritual || "-"}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">Sikap Sosial</td>
              <td className="border border-black p-2">{nilaiData?.non_akademik?.sikapSosial || "-"}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">Ekstrakurikuler ({nilaiData?.non_akademik?.ekskulTerpilih || "-"})</td>
              <td className="border border-black p-2">{nilaiData?.non_akademik?.nilaiEkskul || "-"}</td>
            </tr>
          </tbody>
        </table>

        {/* TANDA TANGAN */}
        <div className="flex justify-between text-sm mt-10 text-center">
           <div className="w-1/3">
             <p>Mengetahui,</p>
             <p>Orang Tua/Wali</p>
             <div className="h-20"></div>
             <p className="font-bold underline">( ...................................... )</p>
           </div>
           
           <div className="w-1/3">
             <p>Kuningan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
             <p>Wali Kelas</p>
             <div className="h-20"></div>
             <p className="font-bold underline">{teacher?.name || "Nama Guru"}</p>
             {teacher?.nip && <p>NIP. {teacher.nip}</p>}
           </div>
        </div>
        
        {/* KEPALA SEKOLAH */}
        <div className="flex justify-center text-sm mt-8 text-center">
           <div className="w-1/2">
             <p>Mengetahui,</p>
             <p>Kepala Sekolah</p>
             <div className="h-20"></div>
             <p className="font-bold underline">{schoolInfo?.kepalaSekolah || "Nama Kepala Sekolah"}</p>
             <p>NIP. {schoolInfo?.nipKepalaSekolah || "-"}</p>
           </div>
        </div>

      </div>
    </>
  );
};

export default RaporSiswa;