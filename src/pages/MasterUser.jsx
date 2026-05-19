import { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; // Pastikan auth di-import
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, query, where } from 'firebase/firestore'; // Tambahkan query & where
import { Users, Edit, Trash2, Save, X, Briefcase, Mail, School, Plus, Key, Copy, CheckCircle2, RefreshCw, CreditCard } from 'lucide-react';

const MasterUser = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  const [showAddGuru, setShowAddGuru] = useState(false);
  const [adminSchoolData, setAdminSchoolData] = useState({ namaSekolah: "Sekolah Belum Diatur", logoUrl: "" });
  const [copiedCode, setCopiedCode] = useState(null);
  const [mySchoolId, setMySchoolId] = useState(""); // State baru untuk menyimpan ID Sekolah

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const [newGuru, setNewGuru] = useState({ 
    name: '', 
    email: '', 
    nip: '', 
    role: 'wali_kelas', 
    accessCode: generateCode() 
  });

  // FUNGSI TARIK DATA (DIFILTER BERDASARKAN ID SEKOLAH)
  const fetchUsers = async (schoolId) => {
    setLoading(true);
    try {
      // GEMBOK SAAS: Hanya ambil guru dengan schoolId yang sama
      const q = query(collection(db, "teachers"), where("schoolId", "==", schoolId));
      const snap = await getDocs(q);
      const userList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      userList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setUsers(userList);
    } catch (error) {
      console.error("Gagal mengambil data pengguna:", error);
    }
    setLoading(false);
  };

  // INISIALISASI HALAMAN SAAS
  useEffect(() => {
    const initDataSaaS = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1. Tarik profil Admin untuk melihat dia berasal dari sekolah mana
        const adminRef = doc(db, "teachers", user.uid);
        const adminSnap = await getDoc(adminRef);
        
        if (adminSnap.exists() && adminSnap.data().schoolId) {
          const currentSchoolId = adminSnap.data().schoolId;
          setMySchoolId(currentSchoolId);

          // 2. Tarik nama sekolah untuk header
          const schoolSnap = await getDoc(doc(db, "schools", currentSchoolId));
          if (schoolSnap.exists()) {
            setAdminSchoolData({
              namaSekolah: schoolSnap.data().namaSekolah || "Sekolah Belum Diatur",
              logoUrl: schoolSnap.data().logoUrl || "" 
            });
          }

          // 3. Tarik daftar guru/staf
          fetchUsers(currentSchoolId);
        }
      } catch (error) {
        console.error("Gagal inisialisasi Master User SaaS:", error);
      }
    };

    initDataSaaS();
  }, []);

  const handleEditClick = (user) => {
    setEditingId(user.id);
    setEditForm({
      role: user.role || 'wali_kelas',
      className: user.className || '',
      accessCode: user.accessCode || '',
      nip: user.nip || '' 
    });
  };

  const handleSave = async (id) => {
    setIsSaving(true);
    try {
      const userRef = doc(db, "teachers", id);
      await updateDoc(userRef, editForm);
      alert("Profil dan Akses pengguna berhasil diperbarui!");
      setEditingId(null);
      fetchUsers(mySchoolId); // Refresh data menggunakan ID sekolah
    } catch (error) {
      alert("Gagal menyimpan perubahan.");
    }
    setIsSaving(false);
  };

  const handleDelete = async (id, name) => {
    if(confirm(`Apakah Anda yakin ingin menghapus profil ${name}? Ini akan memblokir aksesnya secara permanen.`)) {
      try {
        await deleteDoc(doc(db, "teachers", id));
        fetchUsers(mySchoolId); // Refresh data menggunakan ID sekolah
      } catch (error) {
        alert("Gagal menghapus pengguna.");
      }
    }
  };

  const handleAddGuru = async (e) => {
    e.preventDefault();
    if (!mySchoolId) return alert("Akses Ditolak: ID Sekolah Anda tidak ditemukan.");
    
    setIsSaving(true);
    try {
      const teacherId = newGuru.email.replace(/\./g, '_'); 
      const payload = {
        ...newGuru,
        schoolId: mySchoolId, // STEMPEL SAAS WAJIB!
        schoolName: adminSchoolData.namaSekolah, // Cadangan untuk UI jika dibutuhkan
        createdAt: new Date().getTime()
      };

      await setDoc(doc(db, "teachers", teacherId), payload);
      alert("Pendidik berhasil didaftarkan!");
      setShowAddGuru(false);
      setNewGuru({ name: '', email: '', nip: '', role: 'wali_kelas', accessCode: generateCode() }); 
      fetchUsers(mySchoolId); // Refresh data menggunakan ID sekolah
    } catch (error) {
      alert("Gagal mendaftarkan pendidik.");
    }
    setIsSaving(false);
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getRoleBadge = (role) => {
    switch(role) {
      case 'admin': return <span className="bg-gray-800 text-white px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border border-gray-900">Admin Pusat</span>;
      case 'wali_kelas': return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border border-gray-200">Wali Kelas</span>;
      case 'guru_mapel': return <span className="bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border border-slate-200">Guru Mapel</span>;
      case 'ganda': return <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border border-indigo-200">Akses Ganda</span>;
      default: return <span className="bg-gray-50 text-gray-400 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border border-gray-100">Tanpa Akses</span>;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans text-gray-800">
      
      {/* HEADER FLAT & CLEAN */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Manajemen Kepegawaian</h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <School size={14} className="text-gray-400"/> {adminSchoolData.namaSekolah}
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddGuru(!showAddGuru)}
          className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors w-full md:w-auto justify-center text-sm"
        >
          {showAddGuru ? <X size={16} /> : <Plus size={16} />} 
          {showAddGuru ? "Tutup Formulir" : "Daftarkan Staf Baru"}
        </button>
      </div>

      {/* MODAL / FORM TAMBAH GURU */}
      {showAddGuru && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 animate-slide-down">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
               <Briefcase size={16} className="text-gray-400" /> Formulir Registrasi Pegawai
            </h2>
            <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 flex items-center gap-2">
               <Key size={14} className="text-gray-400"/> Akses Kredensial: <span className="text-sm font-mono tracking-widest text-gray-900">{newGuru.accessCode}</span>
            </div>
          </div>
          
          <form onSubmit={handleAddGuru} className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="col-span-1 md:col-span-2">
               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Nama Lengkap & Gelar</label>
               <input type="text" placeholder="Cth: Budi Santoso, S.Pd" value={newGuru.name} onChange={e => setNewGuru({...newGuru, name: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800" required />
            </div>
            <div className="col-span-1 md:col-span-2">
               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">NIP / NIK Pegawai</label>
               <input type="text" placeholder="Cth: 198001012005011001" value={newGuru.nip} onChange={e => setNewGuru({...newGuru, nip: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-mono text-gray-800" />
            </div>
            
            <div className="col-span-1 md:col-span-2">
               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Alamat Email Akses</label>
               <input type="email" placeholder="guru@sekolah.com" value={newGuru.email} onChange={e => setNewGuru({...newGuru, email: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm text-gray-800" required />
            </div>
            
            <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                 <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-0.5">Hak Akses Sistem</label>
                 <select value={newGuru.role} onChange={e => setNewGuru({...newGuru, role: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 text-sm font-semibold text-gray-800" >
                   <option value="wali_kelas">Wali Kelas</option>
                   <option value="guru_mapel">Guru Mata Pelajaran</option>
                   <option value="ganda">Akses Ganda (Wali & Mapel)</option>
                   <option value="admin">Administrator Pusat</option>
                 </select>
              </div>
              <button type="submit" disabled={isSaving} className="w-full sm:w-auto bg-gray-800 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors text-sm shrink-0 h-[42px] flex items-center justify-center">
                {isSaving ? "Menyimpan..." : "Daftarkan Ke Sistem"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABEL PENGGUNA */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold border-b border-gray-100 tracking-wider">
                <th className="p-4 pl-6">Identitas Staf</th>
                <th className="p-4">Kredensial Autentikasi</th>
                <th className="p-4 text-center">Tingkat Akses</th>
                <th className="p-4 text-center pr-6">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center p-10 text-gray-400 font-medium animate-pulse">Menyelaraskan data kepegawaian...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="4" className="text-center p-10 text-gray-400 text-sm italic">Belum ada staf yang diregistrasi pada sistem.</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                  
                  {/* NAMA & NIP */}
                  <td className="p-4 pl-6">
                    <div className="font-bold text-gray-800 text-sm mb-1.5">{user.name}</div>
                    
                    {/* EDIT MODE NIP */}
                    {editingId === user.id ? (
                       <div className="space-y-2">
                         <div className="flex items-center gap-2">
                           <CreditCard size={14} className="text-gray-400 shrink-0"/>
                           <input type="text" placeholder="Ubah NIP" value={editForm.nip} onChange={(e) => setEditForm({...editForm, nip: e.target.value})} className="w-full max-w-[200px] p-1.5 text-xs bg-white border border-gray-300 rounded outline-none focus:border-gray-500 font-mono" />
                         </div>
                         {(editForm.role === 'wali_kelas' || editForm.role === 'ganda') && (
                           <div className="flex items-center gap-2">
                             <School size={14} className="text-gray-400 shrink-0"/>
                             <input type="text" placeholder="Nama Kelas (Cth: 7A)" value={editForm.className} onChange={(e) => setEditForm({...editForm, className: e.target.value})} className="w-full max-w-[200px] p-1.5 text-xs bg-white border border-gray-300 rounded outline-none focus:border-gray-500" />
                           </div>
                         )}
                       </div>
                    ) : (
                       <div className="space-y-1">
                          <div className="text-[11px] font-mono text-gray-500 flex items-center gap-1.5">
                            <CreditCard size={12} className="text-gray-400"/> {user.nip || <span className="italic text-gray-300 font-sans">NIP/NIK Kosong</span>}
                          </div>
                          {user.className && (
                            <div className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md w-fit flex items-center gap-1 border border-gray-200">
                              <School size={10}/> Wali Kelas {user.className}
                            </div>
                          )}
                       </div>
                    )}
                  </td>

                  {/* KREDENSIAL */}
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
                      <Mail size={14} className="text-gray-400" /> {user.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">PIN Login:</span>
                      {editingId === user.id ? (
                        <div className="flex items-center gap-1.5">
                          <input type="text" value={editForm.accessCode} onChange={(e) => setEditForm({...editForm, accessCode: e.target.value.toUpperCase()})} className="w-20 p-1 text-xs border border-gray-300 rounded outline-none font-mono font-bold text-gray-800 bg-white text-center focus:border-gray-500" maxLength={8} />
                          <button onClick={() => setEditForm({...editForm, accessCode: generateCode()})} className="bg-gray-50 hover:bg-gray-100 border border-gray-200 p-1 rounded text-gray-500 hover:text-gray-800 transition-colors" title="Buat PIN Acak"><RefreshCw size={12} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md text-[11px] font-mono font-bold text-gray-700">
                          {user.accessCode || 'LAMA'}
                          {user.accessCode && (
                            <button onClick={() => copyToClipboard(user.accessCode)} className="text-gray-400 hover:text-gray-800 transition-colors ml-1 border-l border-gray-200 pl-1.5" title="Salin Kode Akses">
                              {copiedCode === user.accessCode ? <CheckCircle2 size={12} className="text-green-500"/> : <Copy size={12}/>}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* ROLE */}
                  <td className="p-4 text-center">
                    {editingId === user.id ? (
                      <select value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})} className="p-1.5 text-xs border border-gray-300 rounded-lg outline-none font-semibold text-gray-700 bg-white w-full max-w-[130px] focus:border-gray-500">
                        <option value="wali_kelas">Wali Kelas</option>
                        <option value="guru_mapel">Guru Mapel</option>
                        <option value="ganda">Akses Ganda</option>
                        <option value="admin">Super Admin</option>
                      </select>
                    ) : (
                      getRoleBadge(user.role)
                    )}
                  </td>

                  {/* AKSI */}
                  <td className="p-4 pr-6">
                    <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId === user.id ? (
                        <>
                          <button onClick={() => handleSave(user.id)} disabled={isSaving} className="p-1.5 bg-gray-800 text-white hover:bg-black rounded-lg transition-colors" title="Simpan Perubahan"><Save size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="Batalkan"><X size={14} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEditClick(user)} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors" title="Ubah Konfigurasi"><Edit size={14} /></button>
                          <button onClick={() => handleDelete(user.id, user.name)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cabut Akses (Hapus)"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MasterUser;