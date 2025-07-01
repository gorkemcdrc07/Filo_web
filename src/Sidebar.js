import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
    const [acik, setAcik] = useState(true);
    const [kullaniciMenuAcik, setKullaniciMenuAcik] = useState(true);
    const [raporMenuAcik, setRaporMenuAcik] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [aracMenuAcik, setAracMenuAcik] = useState(false);



const kullaniciAltMenuler = [
    { ad: 'Plaka Önerisi', yol: '/plaka-onerisi', ikon: '📋' },
    { ad: 'Siparişler', yol: '/siparisler', ikon: '🧾' },
    { ad: 'Reel Atanan Sefer Bilgileri', yol: '/seferler', ikon: '🚛' },
    { ad: 'Atama Yapan Kullanıcılar', yol: '/atama-kullanicilar', ikon: '🧑‍💼' },
    { ad: 'Tamamlanan Seferler', yol: '/tamamlanan-seferler', ikon: '✅' },
];


    const aracAltMenuler = [
        { ad: 'Araç Yönetimi', yol: '/arac/yonetim', ikon: '🚗' },
        { ad: 'İzin Girişi', yol: '/arac/izin-girisi', ikon: '📅' },
        { ad: 'Kesinti Girişi', yol: '/arac/kesinti-girisi', ikon: '✂️' },
    ];


    const raporAltMenuler = [
        { ad: 'Kullanıcı KPI', yol: '/raporlar/kullanici-kpi', ikon: '📈' },
        { ad: 'Proje & Lokasyon Bazlı Raporlar', yol: '/raporlar/lokasyon-rapor', ikon: '🗺️' },
        { ad: 'Yüklemede Bekleme', yol: '/raporlar/yuklemede-bekleme', ikon: '⏳' },
        { ad: 'Teslimde Bekleme', yol: '/raporlar/teslimde-bekleme', ikon: '🕓' },
        { ad: 'Yüklemede Gecikme', yol: '/raporlar/yuklemede-gecikme', ikon: '🕐' },
        { ad: 'Teslimde Gecikme', yol: '/raporlar/teslimde-gecikme', ikon: '🕔' },
        { ad: 'Sefer Süreleri', yol: '/raporlar/sefer-sureleri', ikon: '🚚' },
        { ad: 'Plaka Bazlı Raporlar', yol: '/raporlar/plaka-bazli', ikon: '🚛' },
    ];

    return (
        <div className={`sidebar ${acik ? 'acik' : 'kapali'}`}>
            <div className="sidebar-header">
                {acik && <span className="logo">FTSWeb</span>}
                <button className="toggle-btn" onClick={() => setAcik(!acik)}>
                    {acik ? '←' : '☰'}
                </button>
            </div>

            <div className="sidebar-menu">
                {/* Kullanıcı İşlemleri */}
                <div className="sidebar-category" onClick={() => setKullaniciMenuAcik(!kullaniciMenuAcik)}>
                    <span className="ikon">👥</span>
                    {acik && <span>KULLANICI İŞLEMLERİ</span>}
                    {acik && <span className="arrow">{kullaniciMenuAcik ? '▾' : '▸'}</span>}
                </div>
                <div className={`sidebar-submenu ${kullaniciMenuAcik ? 'acik' : 'kapali'}`} style={{ maxHeight: kullaniciMenuAcik ? `${kullaniciAltMenuler.length * 48}px` : '0' }}>
                    {kullaniciAltMenuler.map((m, i) => (
                        <div key={i} className={`sidebar-item ${location.pathname === m.yol ? 'aktif' : ''}`} onClick={() => navigate(m.yol)}>
                            <span className="ikon">{m.ikon}</span>
                            {acik && <span>{m.ad}</span>}
                        </div>
                    ))}
                </div>

                {/* Araç Durumu */}
                <div className="sidebar-category" onClick={() => setAracMenuAcik(!aracMenuAcik)}>
                    <span className="ikon">🚗</span>
                    {acik && <span>ARAÇ DURUMLARI</span>}
                    {acik && <span className="arrow">{aracMenuAcik ? '▾' : '▸'}</span>}
                </div>
                <div
                    className={`sidebar-submenu ${aracMenuAcik ? 'acik' : 'kapali'}`}
                    style={{ maxHeight: aracMenuAcik ? `${aracAltMenuler.length * 48}px` : '0' }}
                >
                    {aracAltMenuler.map((m, i) => (
                        <div
                            key={i}
                            className={`sidebar-item ${location.pathname === m.yol ? 'aktif' : ''}`}
                            onClick={() => navigate(m.yol)}
                        >
                            <span className="ikon">{m.ikon}</span>
                            {acik && <span>{m.ad}</span>}
                        </div>
                    ))}
                </div>

                {/* Raporlar */}
                <div className="sidebar-category" onClick={() => setRaporMenuAcik(!raporMenuAcik)}>
                    <span className="ikon">📑</span>
                    {acik && <span>RAPORLAR</span>}
                    {acik && <span className="arrow">{raporMenuAcik ? '▾' : '▸'}</span>}
                </div>
                <div className={`sidebar-submenu ${raporMenuAcik ? 'acik' : 'kapali'}`} style={{ maxHeight: raporMenuAcik ? `${raporAltMenuler.length * 48}px` : '0' }}>
                    {raporAltMenuler.map((m, i) => (
                        <div key={i} className={`sidebar-item ${location.pathname === m.yol ? 'aktif' : ''}`} onClick={() => navigate(m.yol)}>
                            <span className="ikon">{m.ikon}</span>
                            {acik && <span>{m.ad}</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Sidebar;
