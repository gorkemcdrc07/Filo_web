import React, { useEffect, useState } from 'react';
import './IzinGirisi.css';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';





const BOS_FORM = {
    plaka_treyler: '',
    surucu_adi: '',
    surucu_telefon: '',
    surucu_tc: '',
    izin_turu: '',
    baslangic_tarihi: '',
    bitis_tarihi: '',
    gun_sayisi: '',
    is_basi_tarihi: '',
    yukleme_tarihi: '',
    aciklama: '',
};

const getMevcutKullanici = () => localStorage.getItem('kullanici') || 'Bilinmeyen Kullanıcı';

const hesaplaGunSayisi = (baslangicStr, bitisStr) => {
    const d1 = new Date(baslangicStr);
    const d2 = new Date(bitisStr);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const fark = (d2 - d1) / (1000 * 60 * 60 * 24);
    return fark > 0 ? fark : 0; // BAŞLANGIÇ HARİÇ
};

function IzinGirisi() {
    const [form, setForm] = useState(BOS_FORM);
    const [izinler, setIzinler] = useState([]);
    const [plakaListesi, setPlakaListesi] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [duzenlemeId, setDuzenlemeId] = useState(null);
    const [duzenlemePaneliAcik, setDuzenlemePaneliAcik] = useState(false);
    const [kesintiVar, setKesintiVar] = useState(false);
    const [kesintiBilgisi, setKesintiBilgisi] = useState({ neden: '', tur: '' });
    const [formSubmitBekliyor, setFormSubmitBekliyor] = useState(false);
    const navigate = useNavigate(); // ⬅️ EKLE






    useEffect(() => {
        verileriGetir();
        plakalariGetir();
    }, []);
    useEffect(() => {
        if (formSubmitBekliyor) {
            setFormSubmitBekliyor(false);
            handleSubmit(new Event('submit')); // sahte submit olayı
        }
    }, [formSubmitBekliyor]);


    const verileriGetir = async () => {
        setYukleniyor(true);
        const { data, error } = await supabase.from('izinler').select('*').order('id', { ascending: false });
        if (!error) setIzinler(data || []);
        setYukleniyor(false);
    };

    const plakalariGetir = async () => {
        const { data, error } = await supabase.from('plakalar').select('*');
        if (!error && data) setPlakaListesi(data);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let yeniForm = { ...form, [name]: value };

        if (name === 'baslangic_tarihi' || name === 'bitis_tarihi') {
            const { baslangic_tarihi, bitis_tarihi } = {
                ...yeniForm,
                [name]: value
            };

            if (baslangic_tarihi && bitis_tarihi) {
                const farkGun = hesaplaGunSayisi(baslangic_tarihi, bitis_tarihi);
                yeniForm.gun_sayisi = farkGun > 0 ? farkGun : 0;

                const bitisTarihObj = new Date(bitis_tarihi);
                bitisTarihObj.setDate(bitisTarihObj.getDate() + 1);
                const isBasiStr = bitisTarihObj.toISOString().split('T')[0];
                yeniForm.is_basi_tarihi = isBasiStr;
            }
        }

        setForm(yeniForm);
    };

    const handlePlakaSecimi = (e) => {
        const secim = e.target.value;
        const secilen = plakaListesi.find(p => `${p.plaka} - ${p.treyler}` === secim);
        if (secilen) {
            setForm(prev => ({
                ...prev,
                plaka_treyler: secim,
                surucu_adi: secilen.surucu_adi,
                surucu_telefon: secilen.surucu_telefon,
                surucu_tc: secilen.surucu_tc
            }));
        }
    };

    const handleSubmit = async (e) => {
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }

        const kullanici = getMevcutKullanici();
        const { izin_turu, gun_sayisi, aciklama, baslangic_tarihi, bitis_tarihi, plaka_treyler } = form;

        // 🔍 Kesinti kontrolü
        const yukleme = form.yukleme_tarihi ? new Date(form.yukleme_tarihi) : null;
        const isBasi = form.is_basi_tarihi ? new Date(form.is_basi_tarihi) : null;

        if (yukleme && isBasi) {
            const farkGun = Math.ceil((yukleme - isBasi) / (1000 * 60 * 60 * 24));
            if (farkGun > 0 && !formSubmitBekliyor) {
                setKesintiVar(true);
                return;
            }
        }

        // ⚠️ Kurallar
        if (izin_turu === 'İzin' && gun_sayisi > 3 && !aciklama.trim()) {
            alert("3 günden fazla izin için açıklama zorunludur.");
            return;
        }

        if (izin_turu === 'Bakım İzni') {
            if (gun_sayisi > 1) {
                alert("Bakım izni en fazla 1 gün olabilir.");
                return;
            }
            if (!aciklama.trim()) {
                alert("Bakım izni için açıklama zorunludur.");
                return;
            }
        }

        // 🔍 Aynı ay için izin toplamı kontrolü
        const basTarih = new Date(baslangic_tarihi);
        const ayBasi = new Date(basTarih.getFullYear(), basTarih.getMonth(), 1).toISOString().split('T')[0];
        const aySonu = new Date(basTarih.getFullYear(), basTarih.getMonth() + 1, 0).toISOString().split('T')[0];

        const { data, error: sorguHatasi } = await supabase
            .from('izinler')
            .select('gun_sayisi, id')
            .eq('plaka_treyler', plaka_treyler)
            .eq('izin_turu', izin_turu)
            .gte('baslangic_tarihi', ayBasi)
            .lte('bitis_tarihi', aySonu);

        if (sorguHatasi) {
            alert("İzin sınırı kontrolü sırasında hata oluştu.");
            return;
        }

        const toplamGun = data
            .filter(item => item.id !== duzenlemeId)
            .reduce((sum, item) => sum + (item.gun_sayisi || 0), 0);

        const yeniToplam = toplamGun + Number(gun_sayisi);

        if ((izin_turu === 'İzin' && yeniToplam > 3) || (izin_turu === 'Bakım İzni' && yeniToplam > 1)) {
            alert(`Bu ay bu araç için toplam izin süresi aşıldı: ${yeniToplam} gün`);
            return;
        }

        // ✅ Kayıt nesnesi
        const temizForm = {
            ...form,
            gun_sayisi: Number(form.gun_sayisi) || 0,
            is_basi_tarihi: form.is_basi_tarihi || null,
            yukleme_tarihi: form.yukleme_tarihi || null,
            ekleyen_kullanici: kullanici,
            eklenme_tarihi: new Date().toISOString(),
        };

        // 💾 Supabase insert/update
        let result;
        if (duzenlemeId) {
            result = await supabase.from('izinler').update(temizForm).eq('id', duzenlemeId);
        } else {
            result = await supabase.from('izinler').insert([temizForm]);
        }

        const { error } = result;

        if (!error) {
            // 🔄 Kesinti varsa ayrı tabloya yaz (hem yeni hem düzenleme)
            if (kesintiBilgisi.neden && kesintiBilgisi.tur && isBasi && yukleme) {
                const kesintiGunSayisi = Math.max(0, Math.ceil((yukleme - isBasi) / (1000 * 60 * 60 * 24)));

                // Önce eski varsa sil
                await supabase
                    .from('kesintiler')
                    .delete()
                    .eq('plaka_treyler', form.plaka_treyler)
                    .eq('baslangic_tarihi', form.is_basi_tarihi)
                    .eq('bitis_tarihi', form.yukleme_tarihi);

                // Sonra yeni kaydı yaz
                await supabase.from('kesintiler').insert([{
                    plaka_treyler: form.plaka_treyler,
                    kesinti_turu: kesintiBilgisi.tur,
                    neden: kesintiBilgisi.neden, // 🔁 BURASI neden sütununa
                    baslangic_tarihi: form.is_basi_tarihi,
                    bitis_tarihi: form.yukleme_tarihi,
                    gun_sayisi: kesintiGunSayisi,
                    aciklama: form.aciklama, // 🔁 BURASI açıklama sütununa
                    ekleyen_kullanici: kullanici,
                    eklenme_tarihi: new Date().toISOString()
                }]);
            }

            setForm(BOS_FORM);
            setDuzenlemeId(null);
            setKesintiBilgisi({ neden: '', tur: '' });
            setKesintiVar(false);
            setDuzenlemePaneliAcik(false);
            verileriGetir();
        } else {
            console.error("Veritabanı hatası:", JSON.stringify(error, null, 2));
            alert("Kayıt sırasında hata oluştu.");
        }
    };




    const handleSil = async (id) => {
        if (!window.confirm("Silmek istediğinize emin misiniz?")) return;

        const { data: izinKaydi } = await supabase.from('izinler').select('*').eq('id', id).single();
        if (!izinKaydi) return alert("Silinecek kayıt bulunamadı.");

        const [plaka, treyler] = izinKaydi.plaka_treyler.split(' - ');
        const { error: silHata } = await supabase.from('izinler').delete().eq('id', id);

        if (silHata) return alert("Silme sırasında hata oluştu.");

        await supabase
            .from('plakalar')
            .update({
                statu: 'İZİNDEN ÇIKTI',
                izin_baslangic_tarihi: null,
                izin_bitis_tarihi: null,
                izinden_cikisi: new Date().toISOString()
            })
            .eq('plaka', plaka)
            .eq('treyler', treyler);

        verileriGetir();
    };
    const handleDuzenle = (izin) => {
        setForm({
            ...izin,
            gun_sayisi: Number(izin.gun_sayisi) || 0,
            is_basi_tarihi: izin.is_basi_tarihi || '',
            yukleme_tarihi: izin.yukleme_tarihi || '',
        });
        setDuzenlemeId(izin.id);
        setDuzenlemePaneliAcik(true); // paneli aç
    };

    const exportToExcel = () => {
        const worksheetData = izinler.map(i => ({
            "PLAKA": i.plaka_treyler,
            "SÜRÜCÜ": i.surucu_adi,
            "İZİN TÜRÜ": i.izin_turu,
            "BAŞLANGIÇ": i.baslangic_tarihi ? new Date(i.baslangic_tarihi).toLocaleDateString("tr-TR") : "-",
            "BİTİŞ": i.bitis_tarihi ? new Date(i.bitis_tarihi).toLocaleDateString("tr-TR") : "-",
            "İŞ BAŞI TARİHİ": i.is_basi_tarihi ? new Date(i.is_basi_tarihi).toLocaleDateString("tr-TR") : "-",
            "YÜKLEME TARİHİ": i.yukleme_tarihi ? new Date(i.yukleme_tarihi).toLocaleDateString("tr-TR") : "-",
            "TOPLAM GÜN": i.gun_sayisi,
            "AÇIKLAMA": i.aciklama,
            "İZİN VEREN": i.ekleyen_kullanici,
            "İZİN VERİLEN TARİH": i.eklenme_tarihi ? new Date(i.eklenme_tarihi).toLocaleDateString("tr-TR") : "-"
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Izinler");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, "izin_kayitlari.xlsx");
    };



    return (

        <>
            <div className="geri-buton-kapsayici">
                <button onClick={() => navigate(-1)} className="geri-buton">← Geri</button>
            </div>



        <div className="izin-container">
            <form onSubmit={handleSubmit} className="izin-form">
                <h2>İzin Girişi</h2>

                <label>Plaka - Treyler</label>
                <select name="plaka_treyler" value={form.plaka_treyler} onChange={handlePlakaSecimi} required>
                    <option value="">Seçin</option>
                    {plakaListesi.map((p, idx) => (
                        <option key={idx} value={`${p.plaka} - ${p.treyler}`}>{p.plaka} - {p.treyler}</option>
                    ))}
                </select>

                <label>Sürücü Adı</label>
                <input value={form.surucu_adi} readOnly />
                <label>Sürücü Telefon</label>
                <input value={form.surucu_telefon} readOnly />
                <label>Sürücü TC</label>
                <input value={form.surucu_tc} readOnly />

                <label>İzin Türü</label>
                <select name="izin_turu" value={form.izin_turu} onChange={handleChange} required>
                    <option value="">Seçin</option>
                    <option value="İzin">İzin</option>
                    <option value="Bakım İzni">Bakım İzni</option>
                    <option value="Mazeret İzni">Mazeret İzni</option>
                </select>

                <label>Başlangıç</label>
                <input type="date" name="baslangic_tarihi" value={form.baslangic_tarihi} onChange={handleChange} required />
                <label>Bitiş</label>
                <input type="date" name="bitis_tarihi" value={form.bitis_tarihi} onChange={handleChange} required />
                <label>İş Başı</label>
                <input type="date" name="is_basi_tarihi" value={form.is_basi_tarihi} onChange={handleChange} />
                <label>Yükleme</label>
                <input type="date" name="yukleme_tarihi" value={form.yukleme_tarihi} onChange={handleChange} />
                <label>Gün Sayısı</label>
                <input value={form.gun_sayisi || ''} readOnly />
                <label>Açıklama</label>
                <textarea name="aciklama" value={form.aciklama} onChange={handleChange} />
                <button type="submit">Kaydet</button>
            </form>

            <div className="izin-table-wrapper">
                    <h3>Mevcut İzinler</h3>
                    <div style={{ textAlign: "right", marginBottom: "10px" }}>
                        <button onClick={exportToExcel} style={{
                            backgroundColor: "#198754",
                            color: "white",
                            padding: "6px 12px",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontWeight: "bold"
                        }}>
                            Excel'e Aktar
                        </button>
                    </div>

                {yukleniyor ? <p>Yükleniyor...</p> : (
                    <table className="izin-tablo">
                        <thead>
                            <tr>
                                <th>PLAKA</th>
                                <th>SÜRÜCÜ</th>
                                <th>İZİN TÜRÜ</th>
                                <th>BAŞLANGIÇ</th>
                                <th>BİTİŞ</th>
                                <th>İŞ BAŞI TARİHİ</th>
                                <th>YÜKLEME TARİHİ</th>
                                <th>TOPLAM GÜN</th>
                                <th>AÇIKLAMA</th>
                                <th>İZİN VEREN</th>
                                <th>İZİN VERİLEN TARİH</th>
                                <th>İŞLEMLER</th>
                            </tr>
                        </thead>
                        <tbody>
                            {izinler.length === 0 && (
                                <tr>
                                    <td colSpan="12">Kayıt yok</td>
                                </tr>
                            )}

                            {izinler.length > 0 &&
                                izinler.map((i) => {
                                    const eksikAlanlar = [];
                                    if (!i.yukleme_tarihi) eksikAlanlar.push("Yükleme Tarihi");
                                    if (!i.is_basi_tarihi) eksikAlanlar.push("İş Başı Tarihi");

                                    const tooltipText = eksikAlanlar.join(", ");
                                    const eksikClass = eksikAlanlar.length > 0 ? "eksik-yukleme" : "";

                                    return (
                                        <tr key={i.id} className={`izin-satiri ${eksikClass}`}>
                                            <td className="tooltip-cell">
                                                {i.plaka_treyler}
                                                {eksikAlanlar.length > 0 && (
                                                    <div className="tooltip-text">Eksik: {tooltipText}</div>
                                                )}
                                            </td>
                                            <td>{i.surucu_adi}</td>
                                            <td>{i.izin_turu}</td>
                                            <td>{i.baslangic_tarihi ? new Date(i.baslangic_tarihi).toLocaleDateString("tr-TR") : "-"}</td>
                                            <td>{i.bitis_tarihi ? new Date(i.bitis_tarihi).toLocaleDateString("tr-TR") : "-"}</td>
                                            <td>{i.is_basi_tarihi ? new Date(i.is_basi_tarihi).toLocaleDateString("tr-TR") : "-"}</td>
                                            <td>{i.yukleme_tarihi ? new Date(i.yukleme_tarihi).toLocaleDateString("tr-TR") : "-"}</td>
                                            <td>{i.gun_sayisi}</td>
                                            <td>{i.aciklama}</td>
                                            <td>{i.ekleyen_kullanici}</td>
                                            <td>{new Date(i.eklenme_tarihi).toLocaleDateString("tr-TR")}</td>
                                            <td>
                                                <button onClick={() => handleSil(i.id)}>Sil</button>
                                                <button onClick={() => handleDuzenle(i)}>Düzenle</button>
                                            </td>
                                        </tr>

                                    );
                                })}
                        </tbody>

                    </table>
                )}
            </div>
            {duzenlemePaneliAcik && (
                <div className="modal-overlay" onClick={() => setDuzenlemePaneliAcik(false)}>
                    <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-baslik">Kaydı Düzenle</h2>

                        <div className="modal-grid">
                            <div className="form-group">
                                <label>İzin Türü</label>
                                <select name="izin_turu" value={form.izin_turu} onChange={handleChange}>
                                    <option value="İzin">İzin</option>
                                    <option value="Bakım İzni">Bakım İzni</option>
                                    <option value="Mazeret İzni">Mazeret İzni</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Başlangıç Tarihi</label>
                                <input type="date" name="baslangic_tarihi" value={form.baslangic_tarihi} onChange={handleChange} />
                            </div>

                            <div className="form-group">
                                <label>Bitiş Tarihi</label>
                                <input type="date" name="bitis_tarihi" value={form.bitis_tarihi} onChange={handleChange} />
                            </div>

                            <div className="form-group">
                                <label>İş Başı Tarihi</label>
                                <input type="date" name="is_basi_tarihi" value={form.is_basi_tarihi} onChange={handleChange} />
                            </div>

                            <div className="form-group">
                                <label>Yükleme Tarihi</label>
                                <input type="date" name="yukleme_tarihi" value={form.yukleme_tarihi} onChange={handleChange} />
                            </div>

                            <div className="form-group full-width">
                                <label>Açıklama</label>
                                <textarea name="aciklama" value={form.aciklama} onChange={handleChange} rows="3" />
                            </div>
                        </div>

                        <div className="panel-butons">
                            <button type="button" onClick={handleSubmit}>Kaydet</button>
                            <button className="kapat-btn" onClick={() => setDuzenlemePaneliAcik(false)}>Vazgeç</button>
                        </div>
                    </div>
                </div>
            )}
            {kesintiVar && (
                <div className="modal-overlay" onClick={() => setKesintiVar(false)}>
                    <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-baslik">Kesinti Tespiti</h2>

                        <div className="modal-grid">
                            <div className="form-group">
                                <label>Kesinti Nedeni</label>
                                <select
                                    value={kesintiBilgisi.neden}
                                    onChange={(e) =>
                                        setKesintiBilgisi((prev) => ({ ...prev, neden: e.target.value }))
                                    }
                                >
                                    <option value="">Seçin</option>
                                    <option value="Tedarikçi Kaynaklı">Tedarikçi Kaynaklı</option>
                                    <option value="Odak Kaynaklı">Odak Kaynaklı</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Kesinti Türü</label>
                                <select
                                    value={kesintiBilgisi.tur}
                                    onChange={(e) =>
                                        setKesintiBilgisi((prev) => ({ ...prev, tur: e.target.value }))
                                    }
                                >
                                    <option value="">Seçin</option>
                                    <option value="Bakım">Bakım</option>
                                    <option value="Servis">Servis</option>
                                    <option value="Arıza">Arıza</option>
                                    <option value="Kaza">Kaza</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Plaka - Treyler</label>
                                <input value={form.plaka_treyler} readOnly />
                            </div>

                            <div className="form-group">
                                <label>Başlangıç Tarihi</label>
                                <input value={form.is_basi_tarihi || ''} readOnly />
                            </div>

                            <div className="form-group">
                                <label>Bitiş Tarihi</label>
                                <input value={form.yukleme_tarihi || ''} readOnly />
                            </div>
                        </div>

                        <div className="panel-butons">
                            <button
                                type="button"
                                disabled={!kesintiBilgisi.neden || !kesintiBilgisi.tur}
                                onClick={() => {
                                    setKesintiVar(false); // modal kapanır
                                    setFormSubmitBekliyor(true); // yeniden submit çalıştırılır
                                }}
                            >
                                Devam Et
                            </button>

                            <button
                                className="kapat-btn"
                                type="button"
                                onClick={() => {
                                    setKesintiVar(false);
                                    setKesintiBilgisi({ neden: '', tur: '' });
                                }}
                            >
                                Vazgeç
                            </button>
                        </div>
                    </div>
                </div>
            )}



            </div>
        </>

    );
}

export default IzinGirisi;
