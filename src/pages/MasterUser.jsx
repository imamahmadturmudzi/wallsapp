import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
// TAMBAHAN: Import RefreshCw untuk tombol reset kode acak
import { Users, Edit, Trash2, Save, X, Briefcase, Mail, School, Plus, Key, Copy, CheckCircle2, RefreshCw } from 'lucide-react';

const MasterUser = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // State untuk Tambah Guru & Auto-Sync Data Sekolah
  const [showAddGuru, setShowAddGuru] = useState(false);
  const [adminSchoolData, setAdminSchoolData] = useState({ namaSekolah: "Sekolah Belum Diatur", logoUrl: "" });
  const [copiedCode, setCopiedCode] = useState(null);

  // Fungsi pembuat Kode Akses Otomatis (6 Karakter)
  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const [newGuru, setNewGuru] = useState({ 
    name: '', 
    email: '', 
    role: 'wali_kelas', 
    accessCode: generateCode() 
  });

  // 1. AMBIL SEMUA DATA GURU & SINKRONISASI DATA SEKOLAH
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "teachers"));
      const userList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      userList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setUsers(userList);
    } catch (error) {
      console.error("Gagal mengambil data pengguna:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const initData = async () => {
      const schoolSnap = await getDoc(doc(db, "metadata", "school_info"));
      if (schoolSnap.exists()) {
        const data = schoolSnap.data();
        setAdminSchoolData({
          namaSekolah: data.namaSekolah || "Sekolah Belum Diatur",
          logoUrl: data.logoUrl || "" 
        });
      }
      fetchUsers();
    };
    initData();
  }, []);

  // 2. FUNGSI UNTUK MULAI MENGEDIT (Termasuk Kode Akses)
  const handleEditClick = (user) => {
    setEditingId(user.id);
    setEditForm({
      role: user.role || 'wali_kelas',
      className: user.className || '',
      accessCode: user.accessCode || '' // Tarik kode akses lama ke form edit
    });
  };

  // 3. FUNGSI SIMPAN PERUBAHAN
  const handleSave = async (id) => {
    setIsSaving(true);
    try {
      const userRef = doc(db, "teachers", id);
      await updateDoc(userRef, editForm);
      alert("Profil dan Akses pengguna berhasil diperbarui!");
      setEditingId(null);
      fetchUsers(); 
    } catch (error) {
      alert("Gagal menyimpan perubahan.");
    }
    setIsSaving(false);
  };

  // 4. FUNGSI HAPUS PENGGUNA
  const handleDelete = async (id, name) => {
    if(confirm(`Apakah Anda yakin ingin menghapus profil ${name}? Ini akan memblokir aksesnya secara permanen.`)) {
      try {
        await deleteDoc(doc(db, "teachers", id));
        fetchUsers();
      } catch (error) {
        alert("Gagal menghapus pengguna.");
      }
    }
  };

  // 5. FUNGSI TAMBAH GURU BARU
  const handleAddGuru = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const teacherId = newGuru.email.replace(/\./g, '_'); 
      const payload = {
        ...newGuru,
        schoolName: adminSchoolData.namaSekolah, 
        schoolLogo: adminSchoolData.logoUrl,     
        createdAt: new Date().getTime()
      };

      await setDoc(doc(db, "teachers", teacherId), payload);
      alert("Guru berhasil didaftarkan dan Kode Akses telah dibuat!");
      setShowAddGuru(false);
      setNewGuru({ name: '', email: '', role: 'wali_kelas', accessCode: generateCode() }); 
      fetchUsers();
    } catch (error) {
      alert("Gagal mendaftarkan guru.");
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
      case 'admin': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-purple-200">👑 Admin</span>;
      case 'wali_kelas': return <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-teal-200">Wali Kelas</span>;
      case 'guru_mapel': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-blue-200">Guru Mapel</span>;
      case 'ganda': return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-orange-200">Akses Ganda</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">Tidak Diketahui</span>;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-teal-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal-100 text-teal-700 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Manajemen Akses Pegawai</h1>
            <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
              <School size={14} className="text-teal-600"/> {adminSchoolData.namaSekolah}
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddGuru(!showAddGuru)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-md w-full md:w-auto justify-center"
        >
          {showAddGuru ? <X size={18} /> : <Plus size={18} />} 
          {showAddGuru ? "Tutup Panel" : "Daftarkan Pendidik"}
        </button>
      </div>

      {/* MODAL / FORM TAMBAH GURU */}
      {showAddGuru && (
        <div className="bg-teal-50 p-6 rounded-2xl border border-teal-200 animate-slide-down shadow-inner">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-teal-800 font-bold flex items-center gap-2">
               <Briefcase size={18} /> Formulir Pendaftaran Pendidik Resmi
            </h2>
            <div className="bg-white px-3 py-1 rounded-lg border border-teal-200 text-xs font-bold text-teal-700 flex items-center gap-2">
               <Key size={14}/> Kode Akses: <span className="text-lg font-mono tracking-widest">{newGuru.accessCode}</span>
            </div>
          </div>
          
          <form onSubmit={handleAddGuru} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              type="text" 
              placeholder="Nama Lengkap (Contoh: Budi Santoso, S.Pd)" 
              value={newGuru.name}
              onChange={e => setNewGuru({...newGuru, name: e.target.value})} 
              className="p-3 rounded-xl border border-teal-100 outline-none focus:ring-2 focus:ring-teal-500 bg-white" 
              required 
            />
            <input 
              type="email" 
              placeholder="Email Aktif Pendidik" 
              value={newGuru.email}
              onChange={e => setNewGuru({...newGuru, email: e.target.value})} 
              className="p-3 rounded-xl border border-teal-100 outline-none focus:ring-2 focus:ring-teal-500 bg-white" 
              required 
            />
            <div className="flex gap-2">
              <select 
                value={newGuru.role}
                onChange={e => setNewGuru({...newGuru, role: e.target.value})}
                className="flex-1 p-3 rounded-xl border border-teal-100 outline-none font-bold text-teal-800 focus:ring-2 focus:ring-teal-500 bg-white" 
              >
                <option value="wali_kelas">Wali Kelas</option>
                <option value="guru_mapel">Guru Mapel</option>
                <option value="ganda">Akses Ganda</option>
                <option value="admin">Super Admin</option>
              </select>
              <button 
                type="submit" 
                disabled={isSaving}
                className="bg-teal-600 text-white px-6 rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-md"
              >
                {isSaving ? "Menyimpan..." : "Daftarkan"}
              </button>
            </div>
          </form>
          <p className="text-xs text-teal-600 mt-4 italic">*Guru akan secara otomatis dimasukkan ke dalam institusi <strong>{adminSchoolData.namaSekolah}</strong>.</p>
        </div>
      )}

      {/* TABEL PENGGUNA */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b tracking-wider">
                <th className="p-4">Identitas Pendidik</th>
                <th className="p-4">Kredensial & Kontak</th>
                <th className="p-4 text-center">Hak Akses</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center p-8 text-gray-400 font-medium">Sinkronisasi data pendidik...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="4" className="text-center p-8 text-gray-400 font-medium">Belum ada pendidik yang terdaftar.</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-teal-50/30 transition-colors">
                  
                  {/* KOLOM 1: NAMA & KELAS */}
                  <td className="p-4">
                    <div className="font-bold text-gray-800">{user.name}</div>
                    {editingId === user.id && (editForm.role === 'wali_kelas' || editForm.role === 'ganda') && (
                      <div className="mt-2">
                        <input 
                          type="text" 
                          placeholder="Nama Kelas (Cth: 7A)"
                          value={editForm.className}
                          onChange={(e) => setEditForm({...editForm, className: e.target.value})}
                          className="w-full p-2 text-xs border border-teal-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    )}
                    {editingId !== user.id && user.className && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        Mengampu Kelas: <span className="font-bold text-teal-600">{user.className}</span>
                      </div>
                    )}
                  </td>

                  {/* KOLOM 2: KREDENSIAL (EMAIL & KODE AKSES) */}
                  <td className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                      <Mail size={12} className="text-gray-400" /> {user.email}
                    </div>
                    
                    {/* AREA KODE AKSES (BISA DIEDIT JIKA MODE EDIT AKTIF) */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Kode Akses:</span>
                      
                      {editingId === user.id ? (
                        <div className="flex items-center gap-1">
                          <input 
                            type="text" 
                            value={editForm.accessCode}
                            onChange={(e) => setEditForm({...editForm, accessCode: e.target.value.toUpperCase()})}
                            className="w-24 p-1 text-xs border border-teal-400 rounded outline-none font-mono font-bold text-teal-700 bg-teal-50"
                            placeholder="KODE"
                            maxLength={8}
                          />
                          <button 
                            onClick={() => setEditForm({...editForm, accessCode: generateCode()})}
                            className="bg-gray-100 hover:bg-teal-100 p-1.5 rounded text-gray-500 hover:text-teal-600 transition-colors"
                            title="Buat Kode Acak Baru"
                          >
                            <RefreshCw size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-2 py-1 rounded text-xs font-mono font-bold text-teal-700">
                          {user.accessCode || 'LAMA (Manual)'}
                          {user.accessCode && (
                            <button 
                              onClick={() => copyToClipboard(user.accessCode)}
                              className="text-gray-400 hover:text-teal-600 transition-colors ml-1"
                              title="Salin Kode Akses"
                            >
                              {copiedCode === user.accessCode ? <CheckCircle2 size={12} className="text-green-500"/> : <Copy size={12}/>}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* KOLOM 3: ROLE */}
                  <td className="p-4 text-center">
                    {editingId === user.id ? (
                      <select 
                        value={editForm.role}
                        onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                        className="p-2 text-xs border border-teal-200 rounded-lg outline-none font-bold bg-white"
                      >
                        <option value="wali_kelas">Wali Kelas</option>
                        <option value="guru_mapel">Guru Mapel</option>
                        <option value="ganda">Akses Ganda</option>
                        <option value="admin">Super Admin</option>
                      </select>
                    ) : (
                      getRoleBadge(user.role)
                    )}
                  </td>

                  {/* KOLOM 4: AKSI */}
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      {editingId === user.id ? (
                        <>
                          <button onClick={() => handleSave(user.id)} disabled={isSaving} className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors shadow-sm" title="Simpan">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors" title="Batal">
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEditClick(user)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Edit Akses">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDelete(user.id, user.name)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Hapus Permanen">
                            <Trash2 size={16} />
                          </button>
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