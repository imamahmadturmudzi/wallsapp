import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import KopSurat from '../components/KopSurat';

const CetakAbsensi = () => {
  const [searchParams] = useSearchParams();
  const tipe = searchParams.get('tipe') || 'bulanan';
  const bulan = searchParams.get('bulan') || '';
  const semester = searchParams.get('semester') || '';
  const tahunAjaran = searchParams.get('tahunAjaran') || '';
  const tahun = searchParams.get('tahun') || '';

  const [students, setStudents] = useState([]);
  const [teacher, setTeacher] = useState({ name: 'Memuat...', className: 'Memuat...' });
  const [loading, setLoading] = useState(true);

  const generateTeksPeriode = () => {
    if (tipe === 'bulanan' && bulan) {
      const date = new Date(bulan + '-01');
      return `Bulan ${date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
    }
    if (tipe === 'semester') return `Semester ${semester} (TA. ${tahunAjaran})`;
    if (tipe === 'tahunan') return `Tahun ${tahun}`;
    return 'Bulan Berjalan';
  };

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const docSnap = await getDoc(doc(db, "teachers", user.uid));
        if (docSnap.exists()) setTeacher(docSnap.data());

        const qSiswa = query(collection(db, "siswa"), where("teacherId", "==", user.uid));
        const siswaSnap = await getDocs(qSiswa);
        let studentList = siswaSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.data().nama, h: 0, s: 0, i: 0, a: 0 }));

        // ========================================================
        // 🚨 AREA KRUSIAL: MENGAMBIL DATA DARI KOLEKSI "presensi"
        // ========================================================
        const qAbsen = query(collection(db, "presensi"), where("classId", "==", user.uid));
        const absenSnap = await getDocs(qAbsen);
        
        absenSnap.forEach(doc => {
          const dataAbsen = doc.data(); // isinya: { date: '2025-05-17', records: { studentId: 'H' } }
          
          let masukFilter = false;
          if (tipe === 'bulanan' && dataAbsen.date && dataAbsen.date.startsWith(bulan)) masukFilter = true;
          if (tipe === 'tahunan' && dataAbsen.date && dataAbsen.date.startsWith(tahun)) masukFilter = true;
          if (tipe === 'semester') masukFilter = true; 
          
          // Jika tanggalnya masuk filter, kita ekstrak data 'records'-nya
          if (masukFilter && dataAbsen.records) {
            Object.keys(dataAbsen.records).forEach(studentId => {
              const studentIndex = studentList.findIndex(s => s.id === studentId);
              if (studentIndex !== -1) {
                const status = dataAbsen.records[studentId].toUpperCase(); // Pastikan huruf besar
                if (status === 'H') studentList[studentIndex].h += 1;
                if (status === 'S') studentList[studentIndex].s += 1;
                if (status === 'I') studentList[studentIndex].i += 1;
                if (status === 'A') studentList[studentIndex].a += 1;
              }
            });
          }
        });
        // ========================================================

        studentList.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(studentList);
        setLoading(false);

        setTimeout(() => { window.print(); }, 2000);
      } catch (error) {
        console.error("Gagal menarik data rekap:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [tipe, bulan, semester, tahun, tahunAjaran]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-mono text-gray-500">Merekapitulasi Data Absensi...</div>;

  return (
    <div className="bg-white text-black min-h-screen p-8 max-w-4xl mx-auto font-serif print:p-0">
      <KopSurat title="Rekapitulasi Kehadiran Peserta Didik" />
      <table className="mb-6 text-sm w-full">
        <tbody>
          <tr>
            <td className="w-32 font-sans pb-1">Tahun Ajaran</td><td className="pb-1 font-sans">: {tipe === 'semester' ? tahunAjaran : '2025/2026'}</td>
            <td className="w-32 font-sans pb-1 text-right pr-4">Fase / Kelas</td><td className="pb-1 w-48 font-sans">: D / {teacher.className || '-'}</td>
          </tr>
          <tr>
            <td className="font-sans pb-1">Periode Cetak</td><td className="pb-1 font-sans">: {generateTeksPeriode()}</td>
            <td className="font-sans pb-1 text-right pr-4">Wali Kelas</td><td className="pb-1 font-sans">: {teacher.name || '-'}</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full text-sm border-collapse border border-black mb-12">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black p-2 w-10 text-center font-sans" rowSpan="2">No</th>
            <th className="border border-black p-2 text-left font-sans" rowSpan="2">Nama Lengkap Siswa</th>
            <th className="border border-black p-2 text-center font-sans" colSpan="4">Rekapitulasi</th>
            <th className="border border-black p-2 text-center w-24 font-sans" rowSpan="2">Persentase</th>
          </tr>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 w-10 text-center font-sans">H</th>
            <th className="border border-black p-2 w-10 text-center font-sans">S</th>
            <th className="border border-black p-2 w-10 text-center font-sans">I</th>
            <th className="border border-black p-2 w-10 text-center font-sans">A</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => {
            const total = s.h + s.s + s.i + s.a;
            const persentase = total > 0 ? ((s.h / total) * 100).toFixed(0) + '%' : '-';
            return (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="border border-black p-2 text-center font-sans">{i + 1}</td>
                <td className="border border-black p-2 uppercase font-sans">{s.name}</td>
                <td className="border border-black p-2 text-center font-sans">{s.h > 0 ? s.h : ''}</td>
                <td className="border border-black p-2 text-center font-sans">{s.s > 0 ? s.s : ''}</td>
                <td className="border border-black p-2 text-center font-sans">{s.i > 0 ? s.i : ''}</td>
                <td className="border border-black p-2 text-center text-red-600 font-sans">{s.a > 0 ? s.a : ''}</td>
                <td className="border border-black p-2 text-center font-sans">{persentase}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div className="flex justify-end items-end px-10 text-sm mt-10">
        <div className="text-center">
          <p className="mb-1 font-sans">Kuningan, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
          <p className="mb-20 font-sans">Guru / Wali Kelas,</p>
          <p className="font-sans border-b border-black inline-block px-2 uppercase">( {teacher.name || 'NAMA WALI KELAS'} )</p>
          <p className="mt-1 font-sans">NIP. .................................</p>
        </div>
      </div>
      <style>{`@media print { @page { margin: 15mm; size: A4 portrait; } body { background: white; } .no-print { display: none !important; } }`}</style>
    </div>
  );
};
export default CetakAbsensi;