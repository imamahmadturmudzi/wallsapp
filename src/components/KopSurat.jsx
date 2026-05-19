const KopSurat = ({ title = "JUDUL LAPORAN" }) => {
  return (
    <div className="w-full font-sans text-black">
      {/* HEADER KOP SURAT */}
      <div className="flex items-center justify-between border-b-[3px] border-black pb-3 mb-0.5">
        
        {/* Logo Kiri (Kemenag) */}
        <div className="w-28 h-24 flex items-center justify-center shrink-0">
          <img 
            src="/logo-kemenag.png" 
            alt="Logo Kemenag" 
            className="max-h-full object-contain grayscale-[15%]" 
          />
        </div>
        
        {/* Teks Tengah */}
        <div className="text-center flex-1 px-4 leading-tight">
          <h1 className="text-xl font-black uppercase tracking-widest mt-1.5 font-sans">Kementerian Agama Republik Indonesia</h1>
          <h2 className="text-[15px] font-bold uppercase tracking-wide font-sans">Kantor Kementerian Agama Kabupaten Kuningan</h2>
          <h2 className="text-[15px] font-bold uppercase tracking-wide font-sans">Madrasah Tsanawiyah Negeri 10 Kuningan</h2>
          <p className="text-[12px] mt-1.5 font-sans">Jl. Raya Desa Sangkanurip No. 4 Kec. Cigandamekar Kab. Kuningan</p>
          <p className="text-[12px] mt-0.5 font-sans">NPSN 20278735 - NSM 121132080010 - Kode Pos 45556</p>
          <p className="text-[12px] mt-0.5 font-sans">Website: mtsn10kuningan.sch.id | Email: mtsn10sangkanurip@gmail.com</p>
        </div>

        {/* Spasi Kanan (Bisa diisi logo madrasah di kemudian hari) */}
        <div className="w-20 h-24 shrink-0"></div>
      </div>
      
      {/* Garis Bawah Tipis (Garis Ganda Khas Surat Resmi) */}
      <div className="border-b-[1px] border-black mb-6 w-full"></div>
      
      {/* JUDUL LAPORAN */}
      <div className="text-center mb-6">
         <h3 className="text-base font-bold uppercase underline tracking-widest underline-offset-4 font-sans">{title}</h3>
      </div>
    </div>
  );
};

export default KopSurat;