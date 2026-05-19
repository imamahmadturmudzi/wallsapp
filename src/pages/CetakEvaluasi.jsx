import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import KopSurat from '../components/KopSurat';

const CetakEvaluasi = () => {
  const { id } = useParams();
  const [siswa, setSiswa] = useState(null);

  useEffect(() => {
    const fetchSiswa = async () => {
      try {
        const docRef = doc(db, "siswa", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSiswa(snap.data());
          setTimeout(() => { window.print(); }, 1500);
        } else {
          alert("Data siswa tidak ditemukan.");
        }
      } catch (error) {
        console.error("Gagal menarik data cetak:", error);
      }
    };
    fetchSiswa();
  }, [id]);

  if (!siswa) return <div className="min-h-screen flex items-center justify-center font-mono text-gray-500">Menyiapkan Dokumen Cetak...</div>;

  return (
    <div className="bg-white text-black min-h-screen p-8 max-w-4xl mx-auto font-serif print:p-0">
      
      <KopSurat title="Laporan Evaluasi Akademik Siswa" />

      {/* BIODATA SISWA */}
      <table className="mb-8 text-sm w-full">
        <tbody>
          <tr>
            <td className="w-40 font-sans pb-1.5">Nama Lengkap</td><td className="pb-1.5 font-sans">: {siswa.name}</td>
            <td className="w-40 font-sans pb-1.5 text-right pr-4">Kelas</td><td className="pb-1.5 w-32 font-sans">: {siswa.className || '-'}</td>
          </tr>
          <tr>
            <td className="font-sans pb-1.5">NISN / NIS</td><td className="pb-1.5 font-sans">: {siswa.nisn || '-'}</td>
            <td className="font-sans pb-1.5 text-right pr-4">Semester</td><td className="pb-1.5 font-sans">: Genap</td>
          </tr>
          <tr><td className="ffont-sans pb-1.5">Tempat, Tgl Lahir</td><td colSpan="3" className="pb-1.5">: {siswa.tempatLahir || '-'}, {siswa.tanggalLahir || '-'}</td></tr>
        </tbody>
      </table>

      {/* AREA KONTEN PENILAIAN */}
      <h3 className="font-sans mb-3 border-b-[1.5px] border-black pb-1 text-sm uppercase">A. Capaian Akademik & Ekstrakurikuler</h3>
      <table className="w-full text-sm border-collapse border border-black mb-12">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-left w-12 text-center font-sans">No</th>
            <th className="border border-black p-2 text-left font-sans">Aspek Evaluasi</th>
            <th className="border border-black p-2 text-center w-32 font-sans">Nilai / Predikat</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-2 text-center font-sans">1</td>
            <td className="border border-black p-2 font-sans">Ekstrakurikuler ({siswa.ekskul || 'Belum Ada'})</td>
            <td className="border border-black p-2 text-center font-sans">{siswa.ekskulNilai || '-'}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 h-24 font-sans"></td>
            <td className="border border-black p-2 h-24 text-gray-400 align-top italic text-center font-sans">(Tabel nilai mata pelajaran dirender di sini)</td>
            <td className="border border-black p-2 h-24 font-sans"></td>
          </tr>
        </tbody>
      </table>

      {/* TANDA TANGAN */}
      <div className="flex justify-between items-end px-10 text-sm">
        <div className="text-center">
          <p className="mb-20 font-sans">Mengetahui,<br/>Kepala Madrasah,</p>
          <p className="font-sans border-b border-black inline-block px-2">( NAMA KEPALA MADRASAH )</p>
          <p className="mt-1 font-sans">NIP. .................................</p>
        </div>
        <div className="text-center">
          <p className="mb-1 font-sans">Kuningan, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
          <p className="mb-20 font-sans">Wali Kelas,</p>
          <p className="font-sans border-b border-black inline-block px-2">( {siswa.teacherName || 'NAMA WALI KELAS'} )</p>
          <p className="mt-1 font-sans">NIP. .................................</p>
        </div>
      </div>

      <style>{`@media print { @page { margin: 15mm; size: A4 portrait; } body { background: white; } .no-print { display: none !important; } }`}</style>
    </div>
  );
};

export default CetakEvaluasi;