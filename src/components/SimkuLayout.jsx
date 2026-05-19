import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Wallet, Users, FileText, LogOut, ShieldCheck, ArrowLeft } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const SimkuLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar dari konsol SIM-KU?')) {
      await signOut(auth);
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard Kas', path: '/simku', icon: <LayoutDashboard size={18} /> },
    { name: 'Buku Kas Umum', path: '/simku/bku', icon: <Wallet size={18} /> },
    { name: 'Iuran Siswa', path: '/simku/iuran', icon: <Users size={18} /> },
    { name: 'Laporan Audit', path: '/simku/laporan', icon: <FileText size={18} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden selection:bg-gray-200">
      
      {/* SIDEBAR EKSKLUSIF SIM-KU */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all z-20">
        
        {/* Header Sidebar */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 tracking-tight">Console SIM-KU</h1>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Finance Dept.</p>
            </div>
          </div>
        </div>

        {/* Menu Navigasi */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2 mt-2">Menu Utama</p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/simku' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  isActive 
                  ? 'bg-gray-100 text-gray-900 font-bold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <span className={isActive ? 'text-gray-900' : 'text-gray-400'}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar (Logout) */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} /> Akhiri Sesi
          </button>
        </div>
      </aside>

      {/* AREA KONTEN DINAMIS (Halaman akan dirender di sini) */}
      <main className="flex-1 overflow-y-auto relative bg-gray-50/50">
        <Outlet />
      </main>

    </div>
  );
};

export default SimkuLayout;