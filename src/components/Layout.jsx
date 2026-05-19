import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, BookOpen, GraduationCap, 
  ClipboardList, BookMarked, Settings, LogOut, Calendar, Edit3,
  Database, Shield, BookOpenCheck, UserCheck, Book, Star, School
} from 'lucide-react';
import { auth, db } from '../firebase'; 
import { signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const Layout = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('wali_kelas'); 
  const [appLogo, setAppLogo] = useState("");

  // MESIN SAAS V3.0: Menarik Role dan Logo berdasarkan schoolId
  useEffect(() => {
    const fetchUserDataAndSchool = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const docRef = doc(db, "teachers", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUserRole(userData.role || 'wali_kelas'); 

          if (userData.schoolId) {
            const unsubSchool = onSnapshot(doc(db, "schools", userData.schoolId), (schoolSnap) => {
              if (schoolSnap.exists() && schoolSnap.data().logoUrl) {
                setAppLogo(schoolSnap.data().logoUrl);
              }
            });
            return () => unsubSchool(); 
          }
        }
      } catch (error) {
        console.error("Gagal mengambil data SaaS:", error);
      }
    };
    
    fetchUserDataAndSchool();
  }, []);

  const getMenus = () => {
    const menuAdmin = [
      { to: "/", icon: <LayoutDashboard size={20} />, label: "Beranda" },
      { to: "/master-sekolah", icon: <Shield size={20} />, label: "Data Sekolah" },
      { to: "/master-kelas", icon: <Users size={20} />, label: "Kelola Kelas" },
      { to: "/master-jadwal", icon: <Calendar size={20} />, label: "Kelola Jadwal" },
      { to: "/master-data", icon: <Database size={20} />, label: "Master Data" },
      { to: "/master-user", icon: <Settings size={20} />, label: "Kelola Akses" }
    ];

    const menuWali = [
      { to: "/", icon: <LayoutDashboard size={20} />, label: "Beranda" },
      { to: "/siswa", icon: <Users size={20} />, label: "Siswa" },
      { to: "/laporan-absensi", icon: <UserCheck size={20} />, label: "Absensi" },
      { to: "/jurnal", icon: <BookOpen size={20} />, label: "Jurnal" },
      { to: "/tahfidz", icon: <Book size={20} />, label: "Tahfidz" },
      { to: "/jadwal", icon: <Calendar size={20} />, label: "Jadwal" },
      { to: "/pengaturan", icon: <Settings size={20} />, label: "Pengaturan" }
    ];

    const menuGuruMapel = [
      { to: "/", icon: <LayoutDashboard size={20} />, label: "Beranda" },
      { to: "/jadwal", icon: <Calendar size={20} />, label: "Jadwal" },
      { to: "/tugas-mapel", icon: <ClipboardList size={20} />, label: "Tugas Siswa" },
      { to: "/nilai-mapel", icon: <BookOpenCheck size={20} />, label: "Input Nilai" },
      { to: "/pengaturan", icon: <Settings size={20} />, label: "Pengaturan" }
    ];

    const menuGanda = [
      { to: "/", icon: <LayoutDashboard size={20} />, label: "Beranda" },
      { to: "/siswa", icon: <Users size={20} />, label: "Siswa" },
      { to: "/jadwal", icon: <Calendar size={20} />, label: "Jadwal" },
      { to: "/tugas-mapel", icon: <ClipboardList size={20} />, label: "Tugas Siswa" },
      { to: "/nilai-mapel", icon: <BookOpenCheck size={20} />, label: "Input Nilai" },
      { to: "/jurnal", icon: <BookOpen size={20} />, label: "Jurnal" },
      { to: "/tahfidz", icon: <Book size={20} />, label: "Tahfidz" },
      { to: "/laporan-absensi", icon: <UserCheck size={20} />, label: "Absensi" },
      { to: "/pengaturan", icon: <Settings size={20} />, label: "Pengaturan" }
    ];

    if (userRole === 'admin') return menuAdmin;
    if (userRole === 'guru_mapel') return menuGuruMapel;
    if (userRole === 'ganda') return menuGanda;
    return menuWali; 
  };

  const menus = getMenus();

  const handleLogout = async () => {
    if(confirm("Keluar dari aplikasi?")) {
      await signOut(auth);
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-800">
      
      {/* === HEADER KHUSUS MOBILE (Muncul di HP saja) === */}
      <header className="md:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          {appLogo ? (
            <img src={appLogo} alt="Logo Instansi" className="w-8 h-8 object-contain rounded" />
          ) : (
            <div className="w-8 h-8 bg-teal-50 text-teal-600 rounded flex items-center justify-center">
              <School size={18} />
            </div>
          )}
          <span className="text-lg font-bold tracking-tight text-gray-800">
            {appLogo ? "Sistem" : "WalasApp"}
          </span>
        </div>
        <button 
          onClick={handleLogout} 
          className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
          title="Keluar"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* === SIDEBAR (Khusus Desktop) === */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 h-screen sticky top-0 z-10">
        <div className="h-20 flex items-center px-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            {appLogo ? (
              <img src={appLogo} alt="Logo Instansi" className="w-9 h-9 object-contain rounded" />
            ) : (
              <div className="w-9 h-9 bg-teal-50 text-teal-600 rounded flex items-center justify-center">
                <School size={20} />
              </div>
            )}
            <span className="text-xl font-bold tracking-tight text-gray-800">
              {appLogo ? "Sistem" : "WalasApp"}
            </span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menus.map((menu) => (
            <NavLink
              key={menu.to}
              to={menu.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                  isActive 
                  ? "bg-teal-50 text-teal-700 font-bold" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium"
                }`
              }
            >
              {menu.icon}
              <span>{menu.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 mt-auto">
           <button 
             onClick={handleLogout} 
             className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg w-full font-medium transition-colors text-sm"
           >
             <LogOut size={18} /> Keluar
           </button>
        </div>
      </aside>

      {/* === KONTEN UTAMA === */}
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto h-[calc(100vh-4rem)] md:h-screen">
        <Outlet /> 
      </main>

      {/* === BOTTOM BAR (MOBILE - SCROLLABLE) === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-safe">
        <div className="flex overflow-x-auto w-full px-2 py-1.5 gap-1 scrollbar-hide snap-x">
          {menus.map((menu) => (
            <NavLink
              key={menu.to}
              to={menu.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-shrink-0 w-16 py-2 rounded-lg transition-all snap-center ${
                  isActive 
                  ? "text-teal-600 font-bold" 
                  : "text-gray-400 hover:text-gray-600 font-medium"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-full mb-1 ${isActive ? 'bg-teal-50' : 'bg-transparent'}`}>
                    {menu.icon}
                  </div>
                  <span className="text-[9px] line-clamp-1 tracking-wide">{menu.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

    </div>
  );
};

export default Layout;