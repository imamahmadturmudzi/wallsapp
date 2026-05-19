import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Users, Trash2, Edit3, X, MapPin, Users2, Star, Info, GraduationCap, Search, Printer } from 'lucide-react';

const Siswa = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState(null);
  
  // State untuk Modal Edit Biodata
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (user) {
        // 1. Ambil Profil Wali Kelas
        const profRef = doc(db, "teachers", user.uid);
        const profSnap = await getDoc(profRef);
        if (profSnap.exists()) setTeacherProfile(profSnap.data());

        // 2. Ambil Daftar Siswa
        const q = query(collection(db, "siswa"), where("teacherId", "==", user.uid));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStudents(list.sort((a, b) => a.name.localeCompare(b.name)));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Membuka Modal Edit
  const handleEditClick = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name || '',
      nisn: student.nisn || '',
      gender: student.gender || 'L',
      tempatLahir: student.tempatLahir || '',
      tanggalLahir: student.tanggalLahir || '',
      namaAyah: student.namaAyah || '',
      namaIbu: student.namaIbu || '',
      alamat: student.alamat || '',
      ekskul: student.ekskul || '',
      ekskulNilai: student.ekskulNilai || 'A',
    });
  };

  // Simpan Perubahan Biodata
  const handleSaveBiodata = async () => {
    setIsSaving(true);
    try {
      const studentRef = doc(db, "siswa", editingStudent.id);
      await updateDoc(studentRef, formData);
      
      // Update State Lokal
      setStudents(students.map(s => s.id === editingStudent.id ? { ...s, ...formData } : s));
      alert("Biodata siswa berhasil diperbarui!");
      setEditingStudent(null);
    } catch (error) {
      alert("Gagal menyimpan biodata.");
    }
    setIsSaving(false);
  };

  const handleDeleteSiswa = async (id, name) => {
    if (confirm(`Hapus ${name} dari daftar kelas? Data nilai juga akan hilang.`)) {
      await deleteDoc(doc(db, "siswa", id));
      setStudents(students.filter(s => s.id !== id));
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans text-gray-800">
      
      {/* HEADER FLAT & CLEAN */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
             <Users size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold text-gray-800">Buku Induk Kelas {teacherProfile?.className}</h1>
             <p className="text-sm text-gray-500 mt-1">Kelola informasi fundamental dan profil siswa.</p>
           </div>
        </div>
        <div className="px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-bold text-sm flex items-center gap-2">
           <Users2 size={16} className="text-gray-400"/> Total: {students.length} Siswa
        </div>
      </div>

      {/* TABEL SISWA MINIMALIS */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                <th className="p-4 pl-6">Nama Siswa & NISN</th>
                <th className="p-4">Identitas Dasar</th>
                <th className="p-4">Ekstrakurikuler</th>
                <th className="p-4 text-right pr-6">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="p-10 text-center text-gray-400 font-medium animate-pulse">Memuat Buku Induk...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan="4" className="p-10 text-center text-gray-400 italic">Belum ada siswa di kelas ini.</td></tr>
              ) : students.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="font-bold text-gray-800 text-base">{s.name}</div>
                    <div className="text-[11px] font-mono text-gray-500 mt-0.5">NISN: {s.nisn || '-'}</div>
                  </td>
                  <td className="p-4 space-y-1.5">
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400"/> {s.tempatLahir || '???'}, {s.tanggalLahir || '???'}
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                      <Users2 size={14} className="text-gray-400"/> Wali: {s.namaAyah || '-'}
                    </div>
                  </td>
                  <td className="p-4">
                    {s.ekskul ? (
                      <div className="flex items-center gap-2">
                        <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-[11px] font-bold border border-gray-200">
                          {s.ekskul}
                        </span>
                        <span className="font-bold text-gray-500 text-xs">({s.ekskulNilai})</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">Belum Terdaftar</span>
                    )}
                  </td>
                  <td className="p-4 text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEditClick(s)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Lengkapi Biodata">
                        <Edit3 size={18} />
                      </button>
                      <button onClick={() => handleDeleteSiswa(s.id, s.name)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus Siswa">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-right pr-6">
                    <button 
                        onClick={() => window.open(`/cetak-evaluasi/${s.id}`, '_blank')} 
                        className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-900 flex items-center gap-1.5 ml-auto shadow-sm transition-colors"
                    >
                        <Printer size={14} /> Cetak Evaluasi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT BIODATA (Dokumen Style) */}
      {editingStudent && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-zoom-in max-h-[90vh] flex flex-col border border-gray-100">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 text-gray-600 rounded-lg border border-gray-100">
                   <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-base">Biodata Peserta Didik</h3>
                  <p className="text-xs text-gray-500">Lengkapi data untuk keperluan cetak rapor</p>
                </div>
              </div>
              <button onClick={() => setEditingStudent(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Body Modal (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-8 bg-gray-50/30">
              
              {/* SEKSI 1 */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 border-b border-gray-200 pb-2">
                  <Info size={14} className="text-gray-400"/> Identitas Pribadi
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Nama Lengkap</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">NISN</label>
                    <input type="text" value={formData.nisn} onChange={e => setFormData({...formData, nisn: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-mono text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Tempat Lahir</label>
                    <input type="text" value={formData.tempatLahir} onChange={e => setFormData({...formData, tempatLahir: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Tanggal Lahir</label>
                    <input type="date" value={formData.tanggalLahir} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800" />
                  </div>
                </div>
              </div>

              {/* SEKSI 2 */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 border-b border-gray-200 pb-2">
                  <Users2 size={14} className="text-gray-400"/> Keluarga & Domisili
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Nama Ayah</label>
                    <input type="text" value={formData.namaAyah} onChange={e => setFormData({...formData, namaAyah: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Nama Ibu</label>
                    <input type="text" value={formData.namaIbu} onChange={e => setFormData({...formData, namaIbu: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Alamat Lengkap Siswa</label>
                    <textarea value={formData.alamat} onChange={e => setFormData({...formData, alamat: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm h-20 text-gray-800 resize-none" placeholder="Jalan, RT/RW, Desa, Kecamatan..."></textarea>
                  </div>
                </div>
              </div>

              {/* SEKSI 3 */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 border-b border-gray-200 pb-2">
                  <Star size={14} className="text-gray-400"/> Ekstrakurikuler
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Nama Ekskul</label>
                    <input type="text" placeholder="Contoh: Pramuka" value={formData.ekskul} onChange={e => setFormData({...formData, ekskul: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Predikat</label>
                    <select value={formData.ekskulNilai} onChange={e => setFormData({...formData, ekskulNilai: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800">
                      <option value="A">A (Sangat Baik)</option>
                      <option value="B">B (Baik)</option>
                      <option value="C">C (Cukup)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 sticky bottom-0">
               <button onClick={() => setEditingStudent(null)} className="px-5 py-2.5 rounded-lg font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all text-sm">
                 Batal
               </button>
               <button onClick={handleSaveBiodata} disabled={isSaving} className="px-5 py-2.5 rounded-lg font-medium text-white bg-gray-800 hover:bg-gray-900 transition-all text-sm disabled:opacity-50">
                 {isSaving ? "Menyimpan..." : "Simpan Dokumen"}
               </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Siswa;