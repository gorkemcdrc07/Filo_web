import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Sayfalar
import Login from './Login';
import Anasayfa from './Anasayfa';

// Kullanıcı İşlemleri
import ReelAtananSeferler from './kullanıcıIslemleri/ReelAtananSeferler';
import Siparisler from './kullanıcıIslemleri/Siparisler';
import Tamamlananlar from './Tamamlananlar';
import PlakaOnerisi from './kullanıcıIslemleri/PlakaOnerisi';
import Planlama from './kullanıcıIslemleri/Planlama'; // 👈 YENİ

// Araç Durumları
import AracYonetimi from './aracDurum/AracYonetimi';
import IzinGirisi from './aracDurum/IzinGirisi';
import KesintiGirisi from './aracDurum/KesintiGirisi';

function App() {
    return (
        <Router>
            <Routes>
                {/* Giriş */}
                <Route path="/" element={<Login />} />

                {/* Ana Sayfa */}
                <Route path="/anasayfa" element={<Anasayfa />} />

                {/* Kullanıcı İşlemleri */}
                <Route path="/planlama" element={<Planlama />} /> {/* 👈 PLANLAMA ROUTE */}
                <Route path="/plaka-onerisi" element={<PlakaOnerisi />} />
                <Route path="/seferler" element={<ReelAtananSeferler />} />
                <Route path="/siparisler" element={<Siparisler />} />
                <Route path="/tamamlanan-seferler" element={<Tamamlananlar />} />

                {/* Araç Durumları */}
                <Route path="/arac/yonetim" element={<AracYonetimi />} />
                <Route path="/arac/izin-girisi" element={<IzinGirisi />} />
                <Route path="/arac/kesinti-girisi" element={<KesintiGirisi />} />

                {/* Bilinmeyen rota */}
                <Route path="*" element={<Navigate to="/anasayfa" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
