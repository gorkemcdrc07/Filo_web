import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AracYonetimi.css';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const BOS_FORM = {
    plaka: '',
    treyler: '',
    surucu_adi: '',
    surucu_telefon: '',
    surucu_tc: '',
};

const getMevcutKullanici = () => localStorage.getItem('kullanici') || 'Bilinmeyen Kullanıcı';

const tespitEtDegisenAlanlar = (eski, yeni) => {
    const farklar = [];
    for (const key in yeni) {
        if (eski[key] !== yeni[key]) farklar.push(key);
    }
    return farklar.join(', ');
};

function turkiyeSaatISOString() {
    const turkiyeSaati = new Date(Date.now() + 3 * 60 * 60 * 1000);
    return turkiyeSaati.toISOString();
}

function AracYonetimi() {
    const [araclar, setAraclar] = useState([]);
    const [tumAraclar, setTumAraclar] = useState([]);
    const [modalAcik, setModalAcik] = useState(false);
    const [form, setForm] = useState(BOS_FORM);
    const [editId, setEditId] = useState(null);
    const [filtre, setFiltre] = useState('aktif');
    const [silModalAcik, setSilModalAcik] = useState(false);
    const [seciliAracId, setSeciliAracId] = useState(null);
    const [silmeSebebi, setSilmeSebebi] = useState('');
    const [silinmeTarihi, setSilinmeTarihi] = useState('');
    const [bilgiModalAcik, setBilgiModalAcik] = useState(false);
    const [bilgiArac, setBilgiArac] = useState(null);
    const [izinBilgisi, setIzinBilgisi] = useState(null);
    const [kesintiBilgisi, setKesintiBilgisi] = useState(null);



    const navigate = useNavigate();

    useEffect(() => {
        const kullanici = localStorage.getItem('kullanici');
        if (!kullanici) navigate('/login');
    }, [navigate]);

    useEffect(() => { verileriGetir(); }, []);

    useEffect(() => {
        let filtrelenmis = tumAraclar;
        if (filtre === 'aktif') {
            filtrelenmis = tumAraclar.filter(a => a.statu !== 'ÇIKARILDI');
        } else if (filtre === 'pasif') {
            filtrelenmis = tumAraclar.filter(a => a.statu === 'ÇIKARILDI');
        }
        setAraclar(filtrelenmis);
    }, [filtre, tumAraclar]);

    const verileriGetir = async () => {
        const { data, error } = await supabase.from('plakalar').select('*').order('id');
        if (!error && data) {
            const bugun = new Date();
            const guncelData = data.map(arac => {
                if (arac.kesinti_bitis_tarihi) {
                    const bitis = new Date(arac.kesinti_bitis_tarihi);
                    if (bitis < bugun) {
                        const farkGun = Math.floor((bugun - bitis) / (1000 * 60 * 60 * 24));
                        return {
                            ...arac,
                            statu: `${farkGun} gün kesintiden yeni çıktı`
                        };
                    }
                }
                return arac;
            });
            setTumAraclar(guncelData);
        }
    };

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        const kullanici = getMevcutKullanici();
        if (editId) {
            const mevcut = tumAraclar.find((a) => a.id === editId);
            const guncellenenAlanlar = tespitEtDegisenAlanlar(mevcut, form);
            const guncellemeTarihi = turkiyeSaatISOString();
            const { error } = await supabase.from('plakalar').update({
                ...form,
                guncelleyen_kullanici: kullanici,
                guncellenen_alanlar: guncellenenAlanlar,
                guncelleme_tarihi: guncellemeTarihi
            }).eq('id', editId);
            if (!error) { temizleVeKapat(); verileriGetir(); }
        } else {
            const { error } = await supabase.from('plakalar').insert([{
                ...form,
                statu: 'Aktif',
                ekleyen_kullanici: kullanici,
                eklenme_tarihi: turkiyeSaatISOString()  // ✅ EKLENEN TARİHİ BURADA GÖNDERİYORUZ
            }]);
            if (!error) { temizleVeKapat(); verileriGetir(); }
        }
    };

    const handleSilIstegi = (id) => {
        setSeciliAracId(id);
        setSilmeSebebi('');
        setSilinmeTarihi(turkiyeSaatISOString().slice(0, 16));
        setSilModalAcik(true);
    };

    const handleSilOnayla = async () => {
        if (!silmeSebebi.trim() || !silinmeTarihi) return;
        const kullanici = getMevcutKullanici();
        const { error } = await supabase.from('plakalar').update({
            statu: 'ÇIKARILDI',
            silme_sebebi: silmeSebebi,
            silinme_tarihi: silinmeTarihi,
            silen_kullanici: kullanici
        }).eq('id', seciliAracId);
        if (!error) {
            setSilModalAcik(false);
            setSeciliAracId(null);
            verileriGetir();
        }
    };

    const handleDuzenle = (arac) => {
        setForm({
            plaka: arac.plaka,
            treyler: arac.treyler,
            surucu_adi: arac.surucu_adi,
            surucu_telefon: arac.surucu_telefon,
            surucu_tc: arac.surucu_tc,
        });
        setEditId(arac.id);
        setModalAcik(true);
    };

    const handleYeniEkle = () => {
        setForm(BOS_FORM);
        setEditId(null);
        setModalAcik(true);
    };

    const temizleVeKapat = () => {
        setForm(BOS_FORM);
        setEditId(null);
        setModalAcik(false);
    };

    const excelAktar = () => {
        if (araclar.length === 0) {
            alert('Aktarılacak araç bulunamadı.');
            return;
        }

        const dataToExport = araclar.map(({ plaka, treyler, surucu_adi, surucu_telefon, surucu_tc, statu }) => ({
            Plaka: plaka,
            Treyler: treyler,
            'Sürücü Adı': surucu_adi,
            Telefon: surucu_telefon,
            TC: surucu_tc,
            Statü: statu
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Araçlar');

        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const dosyaAdi = `arac_listesi_${filtre}.xlsx`;
        saveAs(blob, dosyaAdi);
    };
    const handleBilgiAc = async (arac) => {
        const plakaTreyler = `${arac.plaka} - ${arac.treyler}`;

        // İzin bilgisi
        const { data: izinData, error: izinError } = await supabase
            .from('izinler')
            .select('*')
            .eq('plaka_treyler', plakaTreyler)
            .order('id', { ascending: false })
            .limit(1);

        if (!izinError && izinData.length > 0) {
            setIzinBilgisi(izinData[0]);
        } else {
            setIzinBilgisi(null);
        }

        // Kesinti bilgisi
        const { data: kesintiData, error: kesintiError } = await supabase
            .from('kesintiler')
            .select('*')
            .eq('plaka_treyler', plakaTreyler)
            .order('id', { ascending: false })
            .limit(1);

        if (!kesintiError && kesintiData.length > 0) {
            setKesintiBilgisi(kesintiData[0]);

            // ⬇️ Kesinti bitiş tarihi geçmişse gösterimi güncelle
            const bitis = new Date(kesintiData[0].bitis_tarihi);
            const bugun = new Date();
            if (bitis < bugun) {
                const farkGun = Math.floor((bugun - bitis) / (1000 * 60 * 60 * 24));
                arac.statu = `${farkGun} gün kesintiden çıktı`;
            }
        } else {
            setKesintiBilgisi(null);
        }

        setBilgiArac(arac); // ⬅️ Bu en sona alındı
        setBilgiModalAcik(true);
    };



    const aktifSayisi = tumAraclar.filter((a) => a.statu !== 'ÇIKARILDI').length;
    const pasifSayisi = tumAraclar.filter((a) => a.statu === 'ÇIKARILDI').length;

    return (
        <div className="arac-yonetim-container">
            <h2>Araç Yönetimi</h2>

            <div className="istatistikler">
                <div className="istatistik-kutu aktif"><strong>AKTİF ARAÇLAR:</strong> {aktifSayisi}</div>
                <div className="istatistik-kutu pasif"><strong>ÇIKARILAN ARAÇLAR:</strong> {pasifSayisi}</div>
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <select
                    value={filtre}
                    onChange={(e) => setFiltre(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #ccc',
                        fontSize: '15px'
                    }}
                >
                    <option value="aktif">Aktif Araçlar</option>
                    <option value="pasif">Çıkarılan Araçlar</option>
                    <option value="tum">Tüm Araçlar</option>
                </select>

                <button className="ekle-btn" onClick={handleYeniEkle}>+ Yeni Araç Ekle</button>
                <button className="ekle-btn" style={{ backgroundColor: '#28a745' }} onClick={excelAktar}>Excel'e Aktar</button>
            </div>

            {modalAcik && (
                <div className="modal">
                    <div className="modal-icerik">
                        <h3>{editId ? 'Araç Bilgilerini Güncelle' : 'Yeni Araç Bilgisi'}</h3>
                        <form onSubmit={handleSubmit} className="form">
                            <input name="plaka" value={form.plaka} onChange={handleChange} placeholder="Plaka" required />
                            <input name="treyler" value={form.treyler} onChange={handleChange} placeholder="Treyler" />
                            <input name="surucu_adi" value={form.surucu_adi} onChange={handleChange} placeholder="Sürücü Adı" />
                            <input name="surucu_telefon" value={form.surucu_telefon} onChange={handleChange} placeholder="Telefon" />
                            <input name="surucu_tc" value={form.surucu_tc} onChange={handleChange} placeholder="TC" />
                            <div className="modal-btnlar">
                                <button type="submit">{editId ? 'Güncelle' : 'Kaydet'}</button>
                                <button type="button" onClick={temizleVeKapat}>İptal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {silModalAcik && (
                <div className="modal">
                    <div className="modal-icerik">
                        <h3>Araç Silme Bilgisi</h3>
                        <textarea placeholder="Silme sebebini girin..." value={silmeSebebi} onChange={(e) => setSilmeSebebi(e.target.value)} rows={3} required />
                        <input type="datetime-local" value={silinmeTarihi} onChange={(e) => setSilinmeTarihi(e.target.value)} required />
                        <div className="modal-btnlar">
                            <button onClick={handleSilOnayla}>Onayla</button>
                            <button onClick={() => setSilModalAcik(false)}>İptal</button>
                        </div>
                    </div>
                </div>
            )}

            {bilgiModalAcik && bilgiArac && (
                <div className="modal">
                    <div className="modal-icerik">
                        <h3>İşlem Bilgisi</h3>
                        <p><strong>Statü:</strong> {bilgiArac.statu}</p>

                        {bilgiArac.izin_baslangic_tarihi && (
                            <p><strong>İzin Başlangıç:</strong> {new Date(bilgiArac.izin_baslangic_tarihi).toLocaleDateString()}</p>
                        )}
                        {bilgiArac.izin_bitis_tarihi && (
                            <p><strong>İzin Bitiş:</strong> {new Date(bilgiArac.izin_bitis_tarihi).toLocaleDateString()}</p>
                        )}

                        {bilgiArac.kesinti_baslangic_tarihi && (
                            <p><strong>Kesinti Başlangıç:</strong> {new Date(bilgiArac.kesinti_baslangic_tarihi).toLocaleDateString()}</p>
                        )}
                        {bilgiArac.kesinti_bitis_tarihi && (
                            <p><strong>Kesinti Bitiş:</strong> {new Date(bilgiArac.kesinti_bitis_tarihi).toLocaleDateString()}</p>
                        )}

                        {bilgiArac.eklenme_tarihi && (
                            <>
                                <p><strong>Eklenme Tarihi:</strong> {new Date(bilgiArac.eklenme_tarihi).toLocaleString()}</p>
                                <p><strong>Araç Kaydını Ekleyen:</strong> {bilgiArac.ekleyen_kullanici || '-'}</p>
                            </>
                        )}

                        {bilgiArac.izinden_cikisi && (
                            <p><strong>İzinden Çıkış:</strong> {new Date(bilgiArac.izinden_cikisi).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}</p>
                        )}

                        {bilgiArac.statu === 'ÇIKARILDI' && (
                            <>
                                <p><strong>Silen:</strong> {bilgiArac.silen_kullanici || '-'}</p>
                                <p><strong>Tarih:</strong> {bilgiArac.silinme_tarihi ? new Date(bilgiArac.silinme_tarihi).toLocaleString() : '-'}</p>
                                <p><strong>Silme Sebebi:</strong> {bilgiArac.silme_sebebi || '-'}</p>
                            </>
                        )}

                        {bilgiArac.guncelleme_tarihi && (
                            <>
                                <p><strong>Güncelleyen:</strong> {bilgiArac.guncelleyen_kullanici || '-'}</p>
                                <p><strong>Güncelleme Tarihi:</strong> {new Date(bilgiArac.guncelleme_tarihi).toLocaleString()}</p>
                                <p><strong>Değiştirilen Alanlar:</strong> {bilgiArac.guncellenen_alanlar || '-'}</p>
                            </>
                        )}

                        {izinBilgisi && (
                            <>
                                <hr />
                                <h4>İzin Bilgisi</h4>
                                <p><strong>İzin Türü:</strong> {izinBilgisi.izin_turu}</p>
                                <p><strong>Başlangıç:</strong> {izinBilgisi.baslangic_tarihi}</p>
                                <p><strong>Bitiş:</strong> {izinBilgisi.bitis_tarihi}</p>
                                <p><strong>Gün Sayısı:</strong> {izinBilgisi.gun_sayisi}</p>
                                <p><strong>Ekleyen:</strong> {izinBilgisi.ekleyen_kullanici}</p>
                                <p><strong>Açıklama:</strong> {izinBilgisi.aciklama || '-'}</p>
                            </>
                        )}

                        {kesintiBilgisi && (
                            <>
                                <hr />
                                <h4>Kesinti Bilgisi</h4>
                                <p><strong>Kesinti Türü:</strong> {kesintiBilgisi.kesinti_turu}</p>
                                <p><strong>Başlangıç:</strong> {kesintiBilgisi.baslangic_tarihi}</p>
                                <p><strong>Bitiş:</strong> {kesintiBilgisi.bitis_tarihi}</p>
                                <p><strong>Gün Sayısı:</strong> {kesintiBilgisi.gun_sayisi}</p>
                                <p><strong>Ekleyen:</strong> {kesintiBilgisi.ekleyen_kullanici}</p>
                                <p><strong>Açıklama:</strong> {kesintiBilgisi.aciklama || '-'}</p>
                            </>
                        )}

                        <div className="modal-btnlar">
                            <button onClick={() => setBilgiModalAcik(false)}>Kapat</button>
                        </div>
                    </div>
                </div>
            )}

            <table className="arac-tablo">
                <thead>
                    <tr>
                        <th>Plaka</th>
                        <th>Treyler</th>
                        <th>Sürücü Adı</th>
                        <th>Telefon</th>
                        <th>TC</th>
                        <th>Statü</th>
                        <th>İşlem</th>
                    </tr>
                </thead>
                <tbody>
                    {araclar.length === 0 ? (
                        <tr><td colSpan="7">Kayıtlı araç yok</td></tr>
                    ) : (
                        araclar.map((arac) => (
                            <tr key={arac.id}>
                                <td>{arac.plaka}</td>
                                <td>{arac.treyler}</td>
                                <td>{arac.surucu_adi}</td>
                                <td>{arac.surucu_telefon}</td>
                                <td>{arac.surucu_tc}</td>
                                <td>{arac.statu || '-'}</td>
                                <td>
                                    <button style={{ backgroundColor: '#17a2b8', color: 'white' }} onClick={() => { setBilgiArac(arac); setBilgiModalAcik(true); }}>Bilgi</button>
                                    <button style={{ backgroundColor: '#007bff', color: 'white' }} onClick={() => handleDuzenle(arac)}>Düzenle</button>
                                    {arac.statu !== 'ÇIKARILDI' && (
                                        <button onClick={() => handleSilIstegi(arac.id)}>Sil</button>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default AracYonetimi;
