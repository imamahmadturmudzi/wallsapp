import { Outlet, NavLink, useNavigate } from 'react-router-dom';
// PASTIKAN 'Calendar' ADA DI SINI 👇
import { 
  LayoutDashboard, Users, BookOpen, GraduationCap, 
  ClipboardList, BookMarked, Settings, LogOut, Calendar 
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const Layout = () => {
  const navigate = useNavigate();

  // Daftar Menu Lengkap
  const menus = [
    { to: "/", icon: <LayoutDashboard size={22} />, label: "Beranda" },
    { to: "/jadwal", icon: <Calendar size={22} />, label: "Jadwal" }, // <--- POSISI DI SINI
    { to: "/absensi", icon: <ClipboardList size={22} />, label: "Absen" },
    { to: "/siswa", icon: <Users size={22} />, label: "Siswa" },
    { to: "/akademik", icon: <GraduationCap size={22} />, label: "Nilai" },
    { to: "/jurnal", icon: <BookOpen size={22} />, label: "Jurnal" },
    { to: "/tugas", icon: <BookMarked size={22} />, label: "Tugas" },
    { to: "/tahfidz", icon: <BookOpen size={22} />, label: "Tahfidz" },
    { to: "/pengaturan", icon: <Settings size={22} />, label: "Atur" },
  ];

  const handleLogout = async () => {
    if(confirm("Keluar dari aplikasi?")) {
      await signOut(auth);
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* === SIDEBAR (DESKTOP) === */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r h-screen sticky top-0">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-teal-600 flex items-center gap-2">
            <BookOpen className="fill-teal-600" /> WaliKelas
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menus.map((menu) => (
            <NavLink
              key={menu.to}
              to={menu.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive ? "bg-teal-50 text-teal-600 font-semibold" : "text-gray-500 hover:bg-gray-50"
                }`
              }
            >
              {menu.icon}
              <span>{menu.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t mt-auto">
           <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl w-full font-medium transition-colors">
             <LogOut size={20} /> Keluar
           </button>
        </div>
      </aside>

      {/* === KONTEN UTAMA === */}
      <main className="flex-1 pb-24 md:pb-0 overflow-y-auto h-screen">
        <Outlet /> 
      </main>

      {/* === BOTTOM BAR (MOBILE - SCROLLABLE) === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {/* Container Scroll */}
        <div className="flex overflow-x-auto w-full px-2 py-2 gap-2 scrollbar-hide">
          
          {menus.map((menu) => (
            <NavLink
              key={menu.to}
              to={menu.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-shrink-0 w-[4.5rem] py-2 rounded-xl transition-all ${
                  isActive ? "text-teal-600 bg-teal-50 font-bold" : "text-gray-400 hover:bg-gray-50"
                }`
              }
            >
              {menu.icon}
              <span className="text-[10px] mt-1">{menu.label}</span>
            </NavLink>
          ))}

          {/* Tombol Logout */}
          <button 
            onClick={handleLogout}
            className="flex flex-col items-center justify-center flex-shrink-0 w-[4.5rem] py-2 rounded-xl text-red-400 hover:bg-red-50 transition-all"
          >
            <LogOut size={22} />
            <span className="text-[10px] mt-1 font-medium">Keluar</span>
          </button>

        </div>
      </nav>

    </div>
  );
};

export default Layout;