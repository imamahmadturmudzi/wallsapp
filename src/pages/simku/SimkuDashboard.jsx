import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, FileText, ArrowRight, Activity } from 'lucide-react';

const SimkuDashboard = () => {
  const [loading, setLoading] = useState(true);
  
  // Dummy data awal sebelum kita sambungkan ke Firebase 'bku_transaksi'
  const [keuangan, setKeuangan] = useState({
    saldoBOS: 24500000,
    saldoKomite: 8500000,
    pemasukanBulanIni: 32000000,
    pengeluaranBulanIni: 7500000
  });

  const [recentTransactions, setRecentTransactions] = useState([
    { id: 'TX-001', tanggal: '2026-05-15', keterangan: 'Pembelian Kertas HVS & Tinta Printer', kategori: 'Operasional TU', tipe: 'keluar', nominal: 450000, sumber: 'BOS' },
    { id: 'TX-002', tanggal: '2026-05-14', keterangan: 'Pencairan Dana BOS Tahap 2', kategori: 'Penerimaan Pusat', tipe: 'masuk', nominal: 32000000, sumber: 'BOS' },
    { id: 'TX-003', tanggal: '2026-05-12', keterangan: 'Pembayaran Pemeliharaan AC Ruang Guru', kategori: 'Perawatan Gedung', tipe: 'keluar', nominal: 1200000, sumber: 'Komite' },
    { id: 'TX-004', tanggal: '2026-05-10', keterangan: 'Pembelian Konsumsi Rapat RKAS', kategori: 'Konsumsi Rapat', tipe: 'keluar', nominal: 350000, sumber: 'BOS' },
  ]);

  useEffect(() => {
    // Simulasi loading data dari Firebase
    setTimeout(() => setLoading(false), 800);
  }, []);

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans text-gray-800">
      
      {/* HEADER DASHBOARD */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard Keuangan</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Ringkasan Buku Kas Umum & Arus Dana Madrasah</p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors">
            <FileText size={16} /> Laporan
          </button>
          <button className="flex-1 md:flex-none bg-gray-900 text-white hover:bg-black px-5 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-md">
            <Plus size={16} /> Catat Transaksi
          </button>
        </div>
      </div>

      {/* METRIK KARTU KEUANGAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Saldo */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500"><Wallet size={120}/></div>
          <div className="relative z-10">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Total Saldo Tersedia</p>
            <h2 className="text-3xl font-black text-gray-900">{formatRupiah(keuangan.saldoBOS + keuangan.saldoKomite)}</h2>
            <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Kas BOS</p>
                  <p className="text-sm font-bold text-gray-700">{formatRupiah(keuangan.saldoBOS)}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Kas Komite</p>
                  <p className="text-sm font-bold text-gray-700">{formatRupiah(keuangan.saldoKomite)}</p>
               </div>
            </div>
          </div>
        </div>

        {/* Pemasukan Bulan Ini */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pemasukan (Mei)</p>
            <div className="p-1.5 bg-green-50 text-green-600 rounded-md"><TrendingUp size={16}/></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{formatRupiah(keuangan.pemasukanBulanIni)}</h2>
          <p className="text-xs text-green-600 font-medium mt-3 flex items-center gap-1 bg-green-50/50 w-fit px-2 py-1 rounded-md border border-green-100">
            + Rp 32.000.000 (BOS Tahap 2)
          </p>
        </div>

        {/* Pengeluaran Bulan Ini */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pengeluaran (Mei)</p>
            <div className="p-1.5 bg-red-50 text-red-600 rounded-md"><TrendingDown size={16}/></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{formatRupiah(keuangan.pengeluaranBulanIni)}</h2>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
             <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '25%' }}></div>
          </div>
          <p className="text-[10px] text-gray-500 font-medium mt-2">25% dari estimasi anggaran bulanan</p>
        </div>
      </div>

      {/* TABEL RIWAYAT TRANSAKSI TERAKHIR */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-800">Riwayat Mutasi Terakhir</h2>
          <button className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors">
            Lihat Semua <ArrowRight size={14} />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-white text-gray-400 text-[10px] uppercase font-bold tracking-wider border-b border-gray-100">
                <th className="p-4 pl-6">ID / Tanggal</th>
                <th className="p-4">Keterangan Transaksi</th>
                <th className="p-4">Kategori & Sumber</th>
                <th className="p-4 text-right pr-6">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center p-10 text-gray-400 text-sm animate-pulse font-medium">Memuat buku kas...</td></tr>
              ) : recentTransactions.map((trx, idx) => (
                <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="font-mono text-xs font-bold text-gray-800">{trx.id}</div>
                    <div className="text-[11px] text-gray-500 font-medium mt-0.5">{trx.tanggal}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-semibold text-gray-800">{trx.keterangan}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1.5">
                       <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-bold w-fit border border-gray-200">{trx.kategori}</span>
                       <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Wallet size={10}/> {trx.sumber}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right pr-6">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${trx.tipe === 'masuk' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-white text-gray-800'}`}>
                      {trx.tipe === 'masuk' ? '+' : '-'} {formatRupiah(trx.nominal)}
                    </span>
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

export default SimkuDashboard;