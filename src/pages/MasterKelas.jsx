import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { School, Users, Plus, Download, Upload, Trash2, ChevronRight, Target, Edit2, Save, X } from 'lucide-react';

const MasterKelas = () => {
  const [kelasList, setKelasList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  
  // State Tambah Kelas
  const [showAddKelas, setShowAddKelas] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [kelasBaru, setKelasBaru] = useState({ teacherId: '', className: '', kkm: 75 }); // Tambah Default KKM

  // State Edit KKM
  const [isEditingKkm, setIsEditingKkm] = useState(false);
  const [editKkmValue, setEditKkmValue] = useState(75);

  const [newSiswa, setNewSiswa] = useState({ name: '', nisn: '', gender: 'L', loginCode: '' });
  const [bulkData, setBulkData] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const fetchInitData = async () => {
      const snapGuru = await getDocs(collection(db, "teachers"));
      setAvailableTeachers(snapGuru.docs.map(d => ({ id: d.id, ...d.data() })));

      const qKelas = query(collection(db, "teachers"), where("role", "in", ["wali_kelas", "ganda"]));
      const snapKelas = await getDocs(qKelas);
      const list = snapKelas.docs.map(d => ({ id: d.id, ...d.data() })).filter(k => k.className);
      list.sort((a, b) => a.className.localeCompare(b.className));
      setKelasList(list);
    };
    fetchInitData();
  }, []);

  // FUNGSI BUAT KELAS BARU (Dengan KKM)
  const handleCreateKelas = async () => {
    if(!kelasBaru.teacherId || !kelasBaru.className) return alert("Lengkapi data kelas!");
  
    try {
      const teacherRef = doc(db, "teachers", kelasBaru.teacherId);
      await updateDoc(teacherRef, {
        role: 'wali_kelas', 
        className: kelasBaru.className,
        classCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        kkm: Number(kelasBaru.kkm) // Simpan KKM spesifik
      });
      alert(`Kelas ${kelasBaru.className} berhasil dibuat dengan KKM ${kelasBaru.kkm}!`);
      window.location.reload(); 
    } catch (e) {
      alert("Gagal membuat kelas.");
    }
  };

  // FUNGSI UPDATE KKM KELAS YANG SUDAH ADA
  const handleUpdateKkm = async () => {
    try {
      const teacherRef = doc(db, "teachers", selectedKelas.id);
      await updateDoc(teacherRef, { kkm: Number(editKkmValue) });
      
      // Update state lokal
      setSelectedKelas(prev => ({...prev, kkm: Number(editKkmValue)}));
      setKelasList(kelasList.map(k => k.id === selectedKelas.id ? {...k, kkm: Number(editKkmValue)} : k));
      setIsEditingKkm(false);
      alert("KKM Kelas berhasil diperbarui!");
    } catch (error) {
      alert("Gagal memperbarui KKM.");
    }
  };

  const handlePilihKelas = async (kelas) => {
    setSelectedKelas(kelas);
    setEditKkmValue(kelas.kkm || 75); // Set form edit KKM
    setIsEditingKkm(false);
    setLoadingSiswa(true);
    try {
      const q = query(collection(db, "siswa"), where("teacherId", "==", kelas.id));
      const snap = await getDocs(q);
      const listSiswa = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      listSiswa.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(listSiswa);
    } catch (e) {
      console.error("Gagal memuat siswa");
    }
    setLoadingSiswa(false);
  };

  const handleAddSiswa = async (e) => {
    e.preventDefault();
    if (!selectedKelas) return;
    try {
      const payload = {
        ...newSiswa,
        teacherId: selectedKelas.id,
        classCode: selectedKelas.classCode || selectedKelas.className, 
        createdAt: new Date().getTime()
      };
      const docRef = await addDoc(collection(db, "siswa"), payload);
      setStudents([...students, { id: docRef.id, ...payload }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSiswa({ name: '', nisn: '', gender: 'L', loginCode: '' });
    } catch (error) {
      alert("Gagal menambahkan siswa.");
    }
  };

  const handleImportBulk = async () => {
    if (!selectedKelas || !bulkData.trim()) return;
    setIsImporting(true);
    try {
      const rows = bulkData.split('\n');
      let successCount = 0;
      for (let row of rows) {
        const cols = row.split(/\t|,/);
        if (cols.length >= 2) { 
          const nama = cols[0].trim();
          const nisn = cols[1].trim();
          const gender = cols[2] ? cols[2].trim().toUpperCase() : 'L'; 
          const pin = cols[3] ? cols[3].trim() : Math.floor(100000 + Math.random() * 900000).toString();

          if (nama) {
            const payload = {
              name: nama, nisn: nisn, gender: (gender === 'P' ? 'P' : 'L'), loginCode: pin,
              teacherId: selectedKelas.id,
              classCode: selectedKelas.classCode || selectedKelas.className,
              createdAt: new Date().getTime()
            };
            await addDoc(collection(db, "siswa"), payload);
            successCount++;
          }
        }
      }
      alert(`${successCount} Siswa berhasil di-import ke kelas ${selectedKelas.className}!`);
      setBulkData('');
      handlePilihKelas(selectedKelas); 
    } catch (e) {
      alert("Terjadi kesalahan saat import data.");
    }
    setIsImporting(false);
  };

  const handleExportCSV = () => {
    if (students.length === 0) return alert("Tidak ada data siswa untuk diexport");
    let csvContent = "data:text/csv;charset=utf-8,Nama,NISN,Gender,PIN Rapor\n";
    students.forEach(s => { csvContent += `${s.name},${s.nisn},${s.gender},${s.loginCode}\n`; });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Siswa_${selectedKelas.className}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id) => {
    if(confirm("Hapus siswa ini dari database sekolah?")) {
      await deleteDoc(doc(db, "siswa", id));
      setStudents(students.filter(s => s.id !== id));
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-6 animate-fade-in">
      
      {/* PANEL KIRI */}
      <div className="w-full md:w-1/3 space-y-4">
        <button 
          onClick={() => setShowAddKelas(!showAddKelas)}
          className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-100 hover:bg-teal-700 transition-colors"
        >
          <Plus size={18} /> {showAddKelas ? "Tutup Form Kelas" : "Buat Kelas Baru"}
        </button>

        {showAddKelas && (
          <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 space-y-3 shadow-inner animate-slide-down">
            <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">Setup Kelas Baru</h3>
            <select 
              className="w-full p-2.5 border border-teal-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
              onChange={e => setKelasBaru({...kelasBaru, teacherId: e.target.value})}
            >
              <option value="">Pilih Guru Pengampu...</option>
              {availableTeachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} {t.className ? `(Sudah ada kelas)` : ''}</option>
              ))}
            </select>
            <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="Nama Kelas (Misal: 7A)" 
                 className="w-full p-2.5 border border-teal-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                 onChange={e => setKelasBaru({...kelasBaru, className: e.target.value.toUpperCase()})}
               />
               <input 
                 type="number" 
                 placeholder="KKM" 
                 value={kelasBaru.kkm}
                 onChange={e => setKelasBaru({...kelasBaru, kkm: e.target.value})}
                 className="w-24 p-2.5 border border-teal-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 text-center font-bold"
                 title="Standar KKM Kelas"
               />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleCreateKelas} className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-teal-700">Konfirmasi</button>
            </div>
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4 border-b pb-3">
            <School className="text-teal-600" size={20} /> Kelas Terdaftar
          </h2>
          <div className="space-y-2">
            {kelasList.map(kelas => (
              <button
                key={kelas.id}
                onClick={() => handlePilihKelas(kelas)}
                className={`w-full flex justify-between items-center p-3 rounded-xl transition-all border ${
                  selectedKelas?.id === kelas.id 
                  ? 'bg-teal-50 border-teal-200 text-teal-800 font-bold shadow-sm' 
                  : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-teal-100 hover:bg-white'
                }`}
              >
                <div className="text-left">
                  <div className="text-sm font-bold">Kelas {kelas.className} <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded ml-1 border border-orange-200">KKM: {kelas.kkm || 75}</span></div>
                  <div className="text-[10px] font-normal opacity-70">Wali: {kelas.name}</div>
                </div>
                <ChevronRight size={16} className={selectedKelas?.id === kelas.id ? 'text-teal-600' : 'text-gray-300'} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PANEL KANAN */}
      <div className="w-full md:w-2/3 space-y-6">
        {!selectedKelas ? (
          <div className="bg-white/50 border border-dashed border-gray-300 rounded-2xl h-full flex flex-col items-center justify-center p-12 text-gray-400 min-h-[400px]">
             <Users size={48} className="opacity-20 mb-4" />
             <p className="font-bold">Pilih kelas di panel kiri</p>
          </div>
        ) : (
          <>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                 <h2 className="font-bold text-xl text-gray-800">Siswa Kelas {selectedKelas.className}</h2>
                 
                 {/* KONTROL KKM KELAS OLEH ADMIN */}
                 <div className="flex items-center gap-2 mt-2">
                   <Target size={14} className="text-orange-500" />
                   <span className="text-xs text-gray-500 font-bold">Standar KKM:</span>
                   {isEditingKkm ? (
                     <div className="flex items-center gap-1">
                       <input type="number" value={editKkmValue} onChange={e=>setEditKkmValue(e.target.value)} className="w-16 p-1 border border-orange-300 rounded text-xs font-bold text-center outline-none" />
                       <button onClick={handleUpdateKkm} className="bg-green-100 text-green-700 p-1 rounded hover:bg-green-200"><Save size={14}/></button>
                       <button onClick={() => setIsEditingKkm(false)} className="bg-gray-100 text-gray-500 p-1 rounded hover:bg-gray-200"><X size={14}/></button>
                     </div>
                   ) : (
                     <div className="flex items-center gap-2">
                       <span className="text-sm font-black text-orange-600">{selectedKelas.kkm || 75}</span>
                       <button onClick={() => setIsEditingKkm(true)} className="text-gray-400 hover:text-orange-500"><Edit2 size={12}/></button>
                     </div>
                   )}
                 </div>

              </div>
              <button onClick={handleExportCSV} className="text-xs font-bold bg-green-50 text-green-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-100 border border-green-200 transition-colors w-full sm:w-auto justify-center">
                <Download size={14} /> Export CSV
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                 <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><Upload size={14}/> Import Cepat dari Excel (Copy-Paste)</p>
                 <textarea value={bulkData} onChange={(e) => setBulkData(e.target.value)} placeholder="Format Bebas (Tab/Koma): Nama | NISN | L/P | PIN Rapor" className="w-full h-24 p-3 text-xs font-mono border border-gray-300 rounded-lg outline-none focus:border-teal-500 bg-white" />
                 <button onClick={handleImportBulk} disabled={isImporting || !bulkData.trim()} className="mt-2 w-full bg-teal-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">Proses Import Data</button>
              </div>

              <form onSubmit={handleAddSiswa} className="flex gap-2 items-end bg-teal-50/30 p-3 rounded-xl border border-teal-100 mb-6">
                 <div className="flex-1"><input type="text" placeholder="Nama Siswa" value={newSiswa.name} onChange={e=>setNewSiswa({...newSiswa, name:e.target.value})} className="w-full p-2 text-xs border border-teal-200 rounded outline-none focus:ring-1 focus:ring-teal-500 bg-white" required/></div>
                 <div className="w-24"><input type="text" placeholder="NISN" value={newSiswa.nisn} onChange={e=>setNewSiswa({...newSiswa, nisn:e.target.value})} className="w-full p-2 text-xs border border-teal-200 rounded outline-none bg-white"/></div>
                 <div className="w-16"><select value={newSiswa.gender} onChange={e=>setNewSiswa({...newSiswa, gender:e.target.value})} className="w-full p-2 text-xs border border-teal-200 rounded outline-none bg-white"><option value="L">L</option><option value="P">P</option></select></div>
                 <div className="w-24"><input type="text" placeholder="PIN" value={newSiswa.loginCode} onChange={e=>setNewSiswa({...newSiswa, loginCode:e.target.value})} className="w-full p-2 text-xs border border-teal-200 rounded outline-none bg-white" required/></div>
                 <button type="submit" className="bg-teal-600 text-white p-2 rounded hover:bg-teal-700 transition-colors"><Plus size={16}/></button>
              </form>

              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                    <tr><th className="p-3 pl-4">Nama Lengkap</th><th className="p-3">NISN</th><th className="p-3">PIN</th><th className="p-3 text-center">Hapus</th></tr>
                  </thead>
                  <tbody>
                    {loadingSiswa ? (
                      <tr><td colSpan="4" className="p-4 text-center text-sm text-gray-400">Memuat data...</td></tr>
                    ) : students.length === 0 ? (
                      <tr><td colSpan="4" className="p-8 text-center text-sm text-gray-400 italic">Belum ada siswa di kelas ini.</td></tr>
                    ) : students.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 text-sm hover:bg-gray-50 transition-colors">
                        <td className="p-3 pl-4 font-bold text-gray-700">{s.name} <span className="text-[10px] text-gray-400 ml-1">({s.gender})</span></td>
                        <td className="p-3 text-gray-500">{s.nisn || '-'}</td>
                        <td className="p-3 font-mono text-teal-600 font-bold">{s.loginCode}</td>
                        <td className="p-3 text-center"><button onClick={() => handleDelete(s.id)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MasterKelas;