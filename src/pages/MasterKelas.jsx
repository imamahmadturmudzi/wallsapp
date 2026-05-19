import { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; // PASTIKAN AUTH DI-IMPORT
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, writeBatch, getDoc } from 'firebase/firestore'; 
import { School, Users, Plus, Download, Upload, Trash2, ChevronRight, Target, Edit2, Save, X, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx'; 

const MasterKelas = () => {
  const [kelasList, setKelasList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [mySchoolId, setMySchoolId] = useState(""); // STATE BARU: Penyimpan ID Sekolah
  
  // State Tambah Kelas
  const [showAddKelas, setShowAddKelas] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [kelasBaru, setKelasBaru] = useState({ teacherId: '', className: '', kkm: 75 });

  // State Edit KKM
  const [isEditingKkm, setIsEditingKkm] = useState(false);
  const [editKkmValue, setEditKkmValue] = useState(75);

  const [newSiswa, setNewSiswa] = useState({ name: '', nisn: '', gender: 'L', loginCode: '' });
  const [isImporting, setIsImporting] = useState(false); 

  // INISIALISASI SAAS: Tarik Guru & Kelas KHUSUS untuk sekolah ini saja
  useEffect(() => {
    const fetchInitDataSaaS = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1. Tarik profil Admin untuk cek ID Sekolahnya
        const adminRef = doc(db, "teachers", user.uid);
        const adminSnap = await getDoc(adminRef);
        
        if (adminSnap.exists() && adminSnap.data().schoolId) {
          const currentSchoolId = adminSnap.data().schoolId;
          setMySchoolId(currentSchoolId);

          // 2. Tarik Daftar Guru HANYA di sekolah ini
          const qGuru = query(collection(db, "teachers"), where("schoolId", "==", currentSchoolId));
          const snapGuru = await getDocs(qGuru);
          const allTeachers = snapGuru.docs.map(d => ({ id: d.id, ...d.data() }));
          setAvailableTeachers(allTeachers);

          // 3. Filter Guru yang menjabat sebagai Wali Kelas untuk Rombel
          const list = allTeachers.filter(k => (k.role === 'wali_kelas' || k.role === 'ganda') && k.className);
          list.sort((a, b) => a.className.localeCompare(b.className));
          setKelasList(list);
        }
      } catch (error) {
        console.error("Gagal inisialisasi Master Kelas SaaS:", error);
      }
    };
    fetchInitDataSaaS();
  }, []);

  const handleCreateKelas = async () => {
    if(!kelasBaru.teacherId || !kelasBaru.className) return alert("Lengkapi data kelas!");
  
    try {
      const teacherRef = doc(db, "teachers", kelasBaru.teacherId);
      await updateDoc(teacherRef, {
        role: 'wali_kelas', 
        className: kelasBaru.className,
        classCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        kkm: Number(kelasBaru.kkm)
      });
      alert(`Kelas ${kelasBaru.className} berhasil dibuat!`);
      window.location.reload(); 
    } catch (e) {
      alert("Gagal membuat kelas.");
    }
  };

  const handleUpdateKkm = async () => {
    try {
      const teacherRef = doc(db, "teachers", selectedKelas.id);
      await updateDoc(teacherRef, { kkm: Number(editKkmValue) });
      
      setSelectedKelas(prev => ({...prev, kkm: Number(editKkmValue)}));
      setKelasList(kelasList.map(k => k.id === selectedKelas.id ? {...k, kkm: Number(editKkmValue)} : k));
      setIsEditingKkm(false);
      alert("Standar KKM berhasil diperbarui!");
    } catch (error) {
      alert("Gagal memperbarui KKM.");
    }
  };

  const handlePilihKelas = async (kelas) => {
    setSelectedKelas(kelas);
    setEditKkmValue(kelas.kkm || 75);
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

  // TAMBAH SISWA MANUAL (DENGAN STEMPEL SAAS)
  const handleAddSiswa = async (e) => {
    e.preventDefault();
    if (!selectedKelas || !mySchoolId) return;
    try {
      const payload = {
        ...newSiswa,
        teacherId: selectedKelas.id,
        classCode: selectedKelas.classCode || selectedKelas.className, 
        schoolId: mySchoolId, // STEMPEL SAAS WAJIB!
        createdAt: new Date().getTime()
      };
      const docRef = await addDoc(collection(db, "siswa"), payload);
      setStudents([...students, { id: docRef.id, ...payload }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSiswa({ name: '', nisn: '', gender: 'L', loginCode: '' });
    } catch (error) {
      alert("Gagal menambahkan siswa.");
    }
  };

  // FUNGSI HAPUS SISWA YANG TERTINGGAL
  const handleDeleteSiswa = async (siswaId) => {
    if(confirm("Yakin ingin menghapus siswa ini dari buku induk?")) {
      try {
        await deleteDoc(doc(db, "siswa", siswaId));
        setStudents(students.filter(s => s.id !== siswaId));
      } catch (error) {
        alert("Gagal menghapus siswa.");
      }
    }
  };

  // ==========================================
  // FITUR EXCEL (DOWNLOAD TEMPLATE & UPLOAD)
  // ==========================================
  const handleDownloadTemplate = () => {
    if (!selectedKelas) return;
    const templateData = [
      { Nama: "Fulan bin Fulan", KodeSiswa: "2401", Gender: "L", PIN_Rapor: "123456" },
      { Nama: "Fulanah binti Fulan", KodeSiswa: "2402", Gender: "P", PIN_Rapor: "654321" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar_Siswa");
    XLSX.writeFile(wb, `Template_Siswa_Kelas_${selectedKelas.className}.xlsx`);
  };

  // IMPORT EXCEL (DENGAN STEMPEL SAAS BATCH)
  const handleImportExcelFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedKelas || !mySchoolId) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const bstr = event.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const dataRaw = XLSX.utils.sheet_to_json(ws);

      if (dataRaw.length === 0) return alert("File Excel kosong.");

      const isConfirm = confirm(`Siap mengimpor ${dataRaw.length} siswa ke kelas ${selectedKelas.className}?`);
      if (!isConfirm) return;

      setIsImporting(true);
      try {
        const batch = writeBatch(db);
        let count = 0;

        dataRaw.forEach((mhs) => {
          const nama = mhs.Nama || mhs.nama || "";
          if (!nama) return; 

          const docRef = doc(collection(db, "siswa"));
          batch.set(docRef, {
            name: nama,
            nisn: String(mhs.KodeSiswa || mhs.kodesiswa || ""),
            gender: (mhs.Gender || mhs.gender || "L").toUpperCase() === 'P' ? 'P' : 'L',
            loginCode: String(mhs.PIN_Rapor || mhs.pin_rapor || Math.floor(100000 + Math.random() * 900000)),
            teacherId: selectedKelas.id, 
            classCode: selectedKelas.classCode || selectedKelas.className,
            schoolId: mySchoolId, // STEMPEL SAAS WAJIB!
            createdAt: new Date().getTime()
          });
          count++;
        });

        await batch.commit();
        alert(`${count} Siswa berhasil di-import ke kelas ${selectedKelas.className}!`);
        handlePilihKelas(selectedKelas); 
      } catch (error) {
        console.error(error);
        alert("Gagal impor data. Pastikan format Excel Anda benar.");
      }
      setIsImporting(false);
      e.target.value = null; 
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in font-sans text-gray-800">
      
      {/* HEADER FLAT & CLEAN */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
             <School size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold text-gray-800">Manajemen Data Induk</h1>
             <p className="text-sm text-gray-500 mt-1">Kelola rombongan belajar dan data pokok siswa sekolah.</p>
           </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* PANEL KIRI: DAFTAR KELAS & FORM */}
        <div className="w-full xl:w-80 shrink-0 space-y-4">
          <button 
            onClick={() => setShowAddKelas(!showAddKelas)}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-black transition-colors text-sm"
          >
            <Plus size={16} /> {showAddKelas ? "Tutup Form Kelas Baru" : "Buka Kelas Baru"}
          </button>

          {showAddKelas && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 animate-slide-down">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Setup Rombel Baru</h3>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Guru Pengampu / Wali</label>
                <select 
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800"
                  onChange={e => setKelasBaru({...kelasBaru, teacherId: e.target.value})}
                >
                  <option value="">-- Pilih Guru --</option>
                  {availableTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} {t.className ? `(Telah Memiliki Kelas)` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                 <div className="flex-1">
                   <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Nama Kelas</label>
                   <input 
                     type="text" 
                     placeholder="Cth: 7A" 
                     className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800"
                     onChange={e => setKelasBaru({...kelasBaru, className: e.target.value.toUpperCase()})}
                   />
                 </div>
                 <div className="w-20">
                   <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">KKM</label>
                   <input 
                     type="number" 
                     placeholder="75" 
                     value={kelasBaru.kkm}
                     onChange={e => setKelasBaru({...kelasBaru, kkm: e.target.value})}
                     className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-bold text-center text-gray-800"
                   />
                 </div>
              </div>
              <button onClick={handleCreateKelas} className="w-full bg-gray-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors mt-2">
                Simpan Konfigurasi
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-6">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
               <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                 <School className="text-gray-400" size={16} /> Daftar Rombel
               </h2>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {kelasList.map(kelas => (
                <button
                  key={kelas.id}
                  onClick={() => handlePilihKelas(kelas)}
                  className={`w-full text-left px-5 py-4 border-b border-gray-50 transition-colors flex justify-between items-center group ${
                    selectedKelas?.id === kelas.id ? 'bg-gray-50 border-l-4 border-l-gray-800' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm ${selectedKelas?.id === kelas.id ? 'font-bold text-gray-800' : 'font-semibold text-gray-700'}`}>
                        Kelas {kelas.className}
                      </span>
                      <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 font-bold uppercase tracking-wider">
                        KKM: {kelas.kkm || 75}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium">Wali: {kelas.name}</div>
                  </div>
                  <ChevronRight size={16} className={`${selectedKelas?.id === kelas.id ? 'text-gray-800' : 'text-gray-300 group-hover:text-gray-400'}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PANEL KANAN: DATA SISWA & EDITOR */}
        <div className="flex-1 space-y-6">
          {!selectedKelas ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400 flex flex-col items-center justify-center min-h-[400px]">
               <Users size={40} className="mb-3 opacity-20" />
               <p className="font-bold text-gray-500">Pilih kelas di panel kiri</p>
               <p className="text-sm mt-1">Untuk mengelola buku induk siswa.</p>
            </div>
          ) : (
            <>
              {/* HEADER KELAS TERPILIH & KKM */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                   <h2 className="text-lg font-bold text-gray-800">Buku Induk Kelas {selectedKelas.className}</h2>
                   <div className="flex items-center gap-2 mt-1.5">
                     <Target size={14} className="text-gray-400" />
                     <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Ambang Batas KKM:</span>
                     {isEditingKkm ? (
                       <div className="flex items-center gap-1.5 ml-1">
                         <input type="number" value={editKkmValue} onChange={e=>setEditKkmValue(e.target.value)} className="w-16 p-1 bg-white border border-gray-300 rounded text-xs font-bold text-center outline-none focus:border-gray-500" />
                         <button onClick={handleUpdateKkm} className="text-gray-500 hover:text-green-600 bg-gray-50 hover:bg-green-50 p-1.5 rounded transition-colors"><Save size={14}/></button>
                         <button onClick={() => setIsEditingKkm(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded transition-colors"><X size={14}/></button>
                       </div>
                     ) : (
                       <div className="flex items-center gap-2 ml-1">
                         <span className="text-sm font-black text-gray-800">{selectedKelas.kkm || 75}</span>
                         <button onClick={() => setIsEditingKkm(true)} className="text-gray-400 hover:text-gray-600 transition-colors"><Edit2 size={12}/></button>
                       </div>
                     )}
                   </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                
                {/* TOOLBAR EXCEL */}
                <div className="bg-gray-50 border-b border-gray-100 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div>
                     <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <FileSpreadsheet size={16} className="text-gray-500"/> Integrasi Excel
                     </p>
                     <p className="text-[11px] text-gray-500 mt-1">Gunakan template untuk mengimpor data masal.</p>
                   </div>
                   <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                     <button onClick={handleDownloadTemplate} className="flex-1 md:flex-none bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg font-medium text-xs hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                       <Download size={14}/> Unduh Template
                     </button>
                     <label className={`flex-1 md:flex-none bg-gray-800 text-white px-4 py-2.5 rounded-lg font-medium text-xs cursor-pointer hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                       <Upload size={14} className={isImporting ? 'animate-bounce' : ''}/>
                       {isImporting ? 'Memproses Data...' : 'Unggah File (Import)'}
                       <input type="file" accept=".xlsx, .xls" onChange={handleImportExcelFile} className="hidden" />
                     </label>
                   </div>
                </div>

                {/* FORM TAMBAH SATUAN */}
                <div className="p-5 border-b border-gray-100">
                  <form onSubmit={handleAddSiswa} className="flex flex-col sm:flex-row gap-3 items-end">
                     <div className="flex-1 w-full">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Nama Lengkap</label>
                        <input type="text" placeholder="Masukkan Nama Siswa" value={newSiswa.name} onChange={e=>setNewSiswa({...newSiswa, name:e.target.value})} className="w-full p-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400" required/>
                     </div>
                     <div className="w-full sm:w-32">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Kode/NISN</label>
                        <input type="text" placeholder="Opsional" value={newSiswa.nisn} onChange={e=>setNewSiswa({...newSiswa, nisn:e.target.value})} className="w-full p-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"/>
                     </div>
                     <div className="w-full sm:w-24">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Gender</label>
                        <select value={newSiswa.gender} onChange={e=>setNewSiswa({...newSiswa, gender:e.target.value})} className="w-full p-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400">
                           <option value="L">L</option>
                           <option value="P">P</option>
                        </select>
                     </div>
                     <div className="w-full sm:w-32">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">PIN Login</label>
                        <input type="text" placeholder="Sandi Rapor" value={newSiswa.loginCode} onChange={e=>setNewSiswa({...newSiswa, loginCode:e.target.value})} className="w-full p-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400" required/>
                     </div>
                     <button type="submit" className="w-full sm:w-auto bg-gray-100 text-gray-600 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-200 hover:text-gray-800 transition-colors flex items-center justify-center shrink-0">
                        <Plus size={18}/>
                     </button>
                  </form>
                </div>

                {/* TABEL DATA INDUK */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="p-4 pl-5">Nama Lengkap Siswa</th>
                        <th className="p-4">Kode/NISN</th>
                        <th className="p-4">PIN Autentikasi</th>
                        <th className="p-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingSiswa ? (
                        <tr><td colSpan="4" className="p-10 text-center text-sm font-medium text-gray-400 animate-pulse">Menyelaraskan data induk...</td></tr>
                      ) : students.length === 0 ? (
                        <tr><td colSpan="4" className="p-10 text-center text-sm text-gray-400 italic">Buku induk kosong. Tambahkan siswa pertama.</td></tr>
                      ) : students.map(s => (
                        <tr key={s.id} className="border-b border-gray-50 text-sm hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 pl-5 font-semibold text-gray-800">
                             {s.name} <span className="text-[10px] text-gray-400 ml-1.5 font-medium">({s.gender})</span>
                          </td>
                          <td className="p-4 text-gray-500 font-mono text-xs">{s.nisn || '-'}</td>
                          <td className="p-4 font-mono text-gray-800 font-bold tracking-widest bg-gray-50/50">{s.loginCode}</td>
                          <td className="p-4 text-center">
                             {/* TOMBOL HAPUS SISWA */}
                             <button onClick={() => handleDeleteSiswa(s.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Hapus Siswa">
                                <Trash2 size={16}/>
                             </button>
                          </td>
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
    </div>
  );
};

export default MasterKelas;