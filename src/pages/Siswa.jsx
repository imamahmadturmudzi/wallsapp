import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { Search, Plus, Trash2, Edit, X, Save, User, Phone, MapPin, Briefcase, ArrowDownAZ, RefreshCw, Key } from 'lucide-react';

const Siswa = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSorting, setIsSorting] = useState(false);
  
  // State Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "", name: "", nis: "", gender: "Laki-laki", birthPlace: "", birthDate: "",
    religion: "Islam", fatherName: "", motherName: "", fatherJob: "", motherJob: "",
    parentPhone: "", parentAddress: "", childOrder: "", familyStatus: "Kandung",
    guardianName: "", guardianJob: "", guardianAddress: "",
    ekskul1: "", ekskul2: "", ekskul3: ""
  });

  const siswaRef = collection(db, "siswa");

  // === 1. READ (AMBIL DATA & URUTKAN A-Z) ===
  const getStudents = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      try {
        const q = query(siswaRef, where("teacherId", "==", user.uid));
        const data = await getDocs(q);
        
        let list = data.docs.map((doc) => {
           const realData = doc.data();
           delete realData.id; 
           return { id: doc.id, ...realData };
        });

        // SORTIR A-Z MANUAL
        list.sort((a, b) => a.name.localeCompare(b.name));
        
        setStudents(list);
      } catch (error) { console.error(error); }
    }
    setLoading(false);
  };

  useEffect(() => { 
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) getStudents();
    });
    return () => unsubscribe();
  }, []);

  // === 2. MAGIC BUTTON: URUTKAN & GENERATE KODE ===
  const handleSortAndGenerate = async () => {
    if (!confirm(`Yakin ingin mereset No. Absen & Kode Login untuk ${students.length} siswa sesuai abjad?`)) return;
    
    setIsSorting(true);
    try {
      const sortedList = [...students].sort((a, b) => a.name.localeCompare(b.name));
      const currentYear = new Date().getFullYear(); 

      const promises = sortedList.map(async (student, index) => {
        const noAbsen = index + 1;
        const loginCode = `${currentYear}${noAbsen.toString().padStart(2, '0')}`;
        
        const docRef = doc(db, "siswa", student.id);
        await updateDoc(docRef, {
          noAbsen: noAbsen,
          loginCode: loginCode
        });
      });

      await Promise.all(promises);
      alert("Berhasil! Semua siswa sudah diurutkan dan punya Kode Login baru.");
      getStudents(); 
    } catch (error) {
      console.error(error);
      alert("Gagal memproses.");
    }
    setIsSorting(false);
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({
      id: "", name: "", nis: "", gender: "Laki-laki", birthPlace: "", birthDate: "",
      religion: "Islam", fatherName: "", motherName: "", fatherJob: "", motherJob: "",
      parentPhone: "", parentAddress: "", childOrder: "", familyStatus: "Kandung",
      guardianName: "", guardianJob: "", guardianAddress: "",
      ekskul1: "", ekskul2: "", ekskul3: ""
    });
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setIsEditMode(true);
    setFormData({
      id: student.id,
      name: student.name || "",
      nis: student.nis || "",
      gender: student.gender || "Laki-laki",
      birthPlace: student.birthPlace || "", birthDate: student.birthDate || "",
      religion: student.religion || "Islam",
      fatherName: student.fatherName || "", motherName: student.motherName || "",
      fatherJob: student.fatherJob || "", motherJob: student.motherJob || "",
      parentPhone: student.parentPhone || "", parentAddress: student.parentAddress || "",
      childOrder: student.childOrder || "", familyStatus: student.familyStatus || "Kandung",
      guardianName: student.guardianName || "", guardianJob: student.guardianJob || "",
      guardianAddress: student.guardianAddress || "",
      ekskul1: student.ekskul1 || "", ekskul2: student.ekskul2 || "", ekskul3: student.ekskul3 || ""
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const cleanData = { ...formData };
      delete cleanData.id; 

      if (isEditMode) {
        const docRef = doc(db, "siswa", formData.id);
        await updateDoc(docRef, cleanData);
        alert("Data diperbarui!");
      } else {
        if (!formData.name.trim()) return alert("Nama wajib diisi!");
        const user = auth.currentUser;
        const teacherClassCode = localStorage.getItem('teacherClassCode') || "UMUM"; 
        
        await addDoc(siswaRef, {
          ...cleanData,
          teacherId: user.uid,
          classCode: teacherClassCode,
          status: "Aktif",
          loginCode: "-", 
          noAbsen: 0,     
          createdAt: new Date().toISOString()
        });
        alert(`Siswa ditambahkan! Klik tombol 'Urutkan' untuk generate No Absen.`);
      }
      setIsModalOpen(false);
      getStudents(); 
    } catch (error) { alert("Gagal simpan."); }
  };

  const handleDelete = async (id, nama) => {
    if (confirm(`Hapus siswa "${nama}"?`)) {
      await deleteDoc(doc(db, "siswa", id));
      getStudents();
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header & Tools */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-800">Data Siswa</h1><p className="text-gray-500 text-sm">Total: {students.length} Siswa</p></div>
        
        <div className="flex gap-2 flex-wrap">
          {/* TOMBOL MAGIC */}
          <button 
            onClick={handleSortAndGenerate} 
            disabled={isSorting}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl hover:bg-orange-600 shadow-lg text-sm font-bold disabled:opacity-50"
          >
            {isSorting ? <RefreshCw className="animate-spin" size={18}/> : <ArrowDownAZ size={18}/>} 
            <span className="hidden md:inline">Urutkan & Reset Kode</span>
          </button>

          <div className="relative flex-1 md:w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/><input type="text" placeholder="Cari..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)}/></div>
          <button onClick={openAddModal} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-200"><Plus size={20}/><span className="hidden md:inline">Baru</span></button>
        </div>
      </div>

      {/* Grid Data */}
      {loading ? <p className="text-center text-gray-500">Memuat...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.length === 0 && !loading && <div className="col-span-full text-center py-10 bg-gray-50 rounded-xl border border-dashed text-gray-400">Belum ada siswa.</div>}
          
          {filteredStudents.map((student) => (
            <div key={student.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-lg border border-teal-200">
                  {student.noAbsen > 0 ? student.noAbsen : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 truncate">{student.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                     <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-mono font-bold border border-orange-200">
                        <Key size={10} /> {student.loginCode || "Klik Urutkan"}
                     </div>
                  </div>
                </div>
              </div>
              <hr className="my-3 border-gray-50" />
              <div className="flex gap-2">
                <button onClick={() => openEditModal(student)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100"><Edit size={14}/> Edit</button>
                <button onClick={() => handleDelete(student.id, student.name)} className="flex items-center justify-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === MODAL FORM LENGKAP === */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-scale-up my-8">
            
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="text-xl font-bold text-gray-800">{isEditMode ? "Edit Biodata" : "Tambah Siswa Baru"}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-red-500" /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              
              {/* Data Pribadi */}
              <div>
                <h4 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User size={16} /> Data Pribadi
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500">Nama Lengkap</label>
                    <input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="Nama Siswa" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Jenis Kelamin</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border rounded-lg bg-white">
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Agama</label>
                    <select name="religion" value={formData.religion} onChange={handleChange} className="w-full p-2 border rounded-lg bg-white">
                      <option value="Islam">Islam</option>
                      <option value="Kristen">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Konghucu">Konghucu</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Tempat Lahir</label>
                    <input name="birthPlace" value={formData.birthPlace} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Tanggal Lahir</label>
                    <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Anak Ke-</label>
                    <input type="number" name="childOrder" value={formData.childOrder} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Status Keluarga</label>
                    <select name="familyStatus" value={formData.familyStatus} onChange={handleChange} className="w-full p-2 border rounded-lg bg-white">
                      <option value="Kandung">Anak Kandung</option>
                      <option value="Angkat">Anak Angkat</option>
                      <option value="Tiri">Anak Tiri</option>
                    </select>
                  </div>
                </div>
              </div>

              <hr />

              {/* Data Orang Tua */}
              <div>
                <h4 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User size={16} /> Data Orang Tua
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500">Nama Ayah</label>
                    <input name="fatherName" value={formData.fatherName} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Pekerjaan Ayah</label>
                    <input name="fatherJob" value={formData.fatherJob} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Nama Ibu</label>
                    <input name="motherName" value={formData.motherName} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Pekerjaan Ibu</label>
                    <input name="motherJob" value={formData.motherJob} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500">Nomor Telepon Ortu (WA)</label>
                    <input type="number" name="parentPhone" value={formData.parentPhone} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="08xxxxxxxxxx" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500">Alamat Orang Tua</label>
                    <textarea name="parentAddress" value={formData.parentAddress} onChange={handleChange} rows="2" className="w-full p-2 border rounded-lg"></textarea>
                  </div>
                </div>
              </div>

              <hr />

              {/* Data Wali */}
              <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Briefcase size={16}/> Data Wali (Opsional)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-80 hover:opacity-100 transition-opacity">
                  <div>
                    <label className="text-xs font-bold text-gray-500">Nama Wali</label>
                    <input name="guardianName" value={formData.guardianName} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Pekerjaan Wali</label>
                    <input name="guardianJob" value={formData.guardianJob} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500">Alamat Wali</label>
                    <textarea name="guardianAddress" value={formData.guardianAddress} onChange={handleChange} rows="2" className="w-full p-2 border rounded-lg"></textarea>
                  </div>
                </div>
              </div>

              <hr />

              {/* Ekstrakurikuler */}
              <div>
                <h4 className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                   🏆 Keikutsertaan Ekskul
                </h4>
                <div className="space-y-3 bg-purple-50 p-4 rounded-xl border border-purple-100">
                   <p className="text-xs text-gray-400 mb-2">Masukkan nama kegiatan. Nilai diinput di menu <b>Leger Nilai</b>.</p>
                   <div>
                      <label className="text-xs font-bold text-gray-500">Pilihan Ekskul 1</label>
                      <input name="ekskul1" value={formData.ekskul1} onChange={handleChange} className="w-full p-2 border rounded-lg bg-white" placeholder="Contoh: Pramuka" />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-gray-500">Pilihan Ekskul 2</label>
                      <input name="ekskul2" value={formData.ekskul2} onChange={handleChange} className="w-full p-2 border rounded-lg bg-white" placeholder="Contoh: Futsal" />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-gray-500">Pilihan Ekskul 3</label>
                      <input name="ekskul3" value={formData.ekskul3} onChange={handleChange} className="w-full p-2 border rounded-lg bg-white" placeholder="Contoh: Seni Tari" />
                   </div>
                </div>
              </div>

            </form>
            <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
               <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium">Batal</button>
               <button onClick={handleSave} className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 flex items-center gap-2">
                 <Save size={18} /> Simpan Data
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Siswa;