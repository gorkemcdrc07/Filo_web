import React, { useEffect, useState } from 'react';
import './IzinGirisi.css';
import { supabase } from '../supabaseClient';

const BOS_FORM = {
    plaka_treyler: '',
    surucu_adi: '',
    surucu_telefon: '',
    surucu_tc: '',
    izin_turu: '',
    baslangic_tarihi: '',
    bitis_tarihi: '',
    gun_sayisi: '',
    aciklama: '',
};

const getMevcutKullanici = () => localStorage.getItem('kullanici') || 'Bilinmeyen Kullanıcı';

const hesaplaGunSayisi = (baslangicStr, bitisStr) => {
    const d1 = new Date(baslangicStr);
    const d2 = new Date(bitisStr);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const fark = (d2 - d1) / (1000 * 60 * 60 * 24);
    return fark >= 0 ? fark + 1 : 0;
};

function IzinGirisi() {
    const [form, setForm] = useState(BOS_FORM);
    const [izinler, setIzinler] = useState([]);
    const [plakaListesi, setPlakaListesi] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);

    useEffect(() => {
        verileriGetir();
        plakalariGetir();
    }, []);

    const verileriGetir = async () => {
        setYukleniyor(true);
        const { data, error } = await supabase.from('izinler').select('*').order('id', { ascending: false });
        if (!error) setIzinler(data || []);
        setYukleniyor(false);
    };

    const plakalariGetir = async () => {
        const { data, error } = await supabase.from('plakalar').select('*');
        if (!error && data) {
            setPlakaListesi(data);
        }
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
        e.preventDefault();
        const kullanici = getMevcutKullanici();
        const { izin_turu, gun_sayisi, aciklama, baslangic_tarihi, bitis_tarihi, plaka_treyler } = form;

        if (izin_turu === 'İzin') {
            if (gun_sayisi > 3 && (!aciklama || aciklama.trim() === '')) {
                alert("3 günden fazla 'İzin' verdiniz. Açıklama zorunludur.");
                return;
            }
        }

        if (izin_turu === 'Bakım İzni') {
            if (gun_sayisi > 1) {
                alert("Bakım izni en fazla 1 gün olabilir.");
                return;
            }
            if (!aciklama || aciklama.trim() === '') {
                alert("Bakım izni için açıklama zorunludur.");
                return;
            }
        }

        const basTarih = new Date(baslangic_tarihi);
        const ayBasi = new Date(basTarih.getFullYear(), basTarih.getMonth(), 1).toISOString().split('T')[0];
        const aySonu = new Date(basTarih.getFullYear(), basTarih.getMonth() + 1, 0).toISOString().split('T')[0];

        const { data, error: sorguHatasi } = await supabase
            .from('izinler')
            .select('gun_sayisi')
            .eq('plaka_treyler', plaka_treyler)
            .eq('izin_turu', izin_turu)
            .gte('baslangic_tarihi', ayBasi)
            .lte('bitis_tarihi', aySonu);

        if (sorguHatasi) {
            alert("İzin sınırı kontrolü yapılırken hata oluştu.");
            return;
        }

        const toplamGun = data.reduce((sum, item) => sum + (item.gun_sayisi || 0), 0);
        const yeniToplam = toplamGun + gun_sayisi;

        if (izin_turu === 'İzin' && yeniToplam > 3) {
            alert(`Bu araca bu ay toplam ${yeniToplam} gün İzin verilmiş olacak. En fazla 3 gün verilebilir.`);
            return;
        }

        if (izin_turu === 'Bakım İzni' && yeniToplam > 1) {
            alert(`Bu araca bu ay toplam ${yeniToplam} gün Bakım İzni verilmiş olacak. En fazla 1 gün verilebilir.`);
            return;
        }

        const { error } = await supabase.from('izinler').insert([{
            ...form,
            ekleyen_kullanici: kullanici,
            eklenme_tarihi: new Date().toISOString()
        }]);

        if (!error) {
            setForm(BOS_FORM);
            verileriGetir();
        }
    };

    const handleSil = async (id) => {
        const onay = window.confirm("Bu kaydı silmek istediğinizden emin misiniz?");
        if (!onay) return;

        // 1. Silinecek izin kaydını al
        const { data: izinKaydi, error: izinGetirHata } = await supabase
            .from('izinler')
            .select('*')
            .eq('id', id)
            .single();

        if (izinGetirHata || !izinKaydi) {
            alert("Silinecek izin kaydı alınamadı.");
            return;
        }

        const plakaTreyler = izinKaydi.plaka_treyler;

        // 2. Kaydı sil
        const { error: silmeHatasi } = await supabase.from('izinler').delete().eq('id', id);
        if (silmeHatasi) {
            alert("Silme işlemi sırasında hata oluştu.");
            console.error(silmeHatasi);
            return;
        }

        // 3. Plaka bilgilerini güncelle
        const [plaka, treyler] = plakaTreyler.split(' - ');
        const cikisTarihi = new Date().toISOString(); // çıkartıldığı an

        const { error: guncelleHata } = await supabase
            .from('plakalar')
            .update({
                statu: 'İZİNDEN ÇIKTI',
                izin_baslangic_tarihi: null,
                izin_bitis_tarihi: null,
                izinden_cikisi: cikisTarihi // ← burada değiştirildi
            })
            .eq('plaka', plaka)
            .eq('treyler', treyler);


        if (guncelleHata) {
            alert("Plaka bilgisi güncellenemedi.");
            console.error(guncelleHata);
        }

        verileriGetir(); // tabloyu yenile
    };



    return (
        <div className="izin-container">
            <form onSubmit={handleSubmit} className="izin-form">
                <h2>İzin Girişi</h2>

                <label>Plaka - Treyler Seçimi</label>
                <select name="plaka_treyler" value={form.plaka_treyler} onChange={handlePlakaSecimi} required>
                    <option value="">Plaka - Treyler Seçin</option>
                    {plakaListesi.map((p, idx) => (
                        <option key={idx} value={`${p.plaka} - ${p.treyler}`}>
                            {p.plaka} - {p.treyler}
                        </option>
                    ))}
                </select>

                <label>Sürücü Adı</label>
                <input value={form.surucu_adi} readOnly placeholder="Sürücü Adı" />

                <label>Sürücü Telefon</label>
                <input value={form.surucu_telefon} readOnly placeholder="Sürücü Telefon" />

                <label>Sürücü TC</label>
                <input value={form.surucu_tc} readOnly placeholder="Sürücü TC" />

                <label>İzin Türü</label>
                <select name="izin_turu" value={form.izin_turu} onChange={handleChange} required>
                    <option value="">İzin Türü Seçin</option>
                    <option value="İzin">İzin</option>
                    <option value="Bakım İzni">Bakım İzni</option>
                    <option value="Mazeret İzni">Mazeret İzni</option>
                </select>

                <label>Başlangıç Tarihi</label>
                <input type="date" name="baslangic_tarihi" value={form.baslangic_tarihi} onChange={handleChange} required />

                <label>Bitiş Tarihi</label>
                <input type="date" name="bitis_tarihi" value={form.bitis_tarihi} onChange={handleChange} required />

                <label>Toplam Gün</label>
                <input value={form.gun_sayisi || ''} readOnly placeholder="İzin Gün Sayısı" />

                <label>Açıklama</label>
                <textarea name="aciklama" value={form.aciklama} onChange={handleChange} placeholder="Açıklama (isteğe bağlı)" />

                <button type="submit">Kaydet</button>
            </form>

            <div className="izin-table-wrapper">
                <h3>Mevcut İzinler</h3>
                {yukleniyor ? <p>Yükleniyor...</p> : (
                    <table className="izin-tablo">
                        <thead>
                            <tr>
                                <th>Plaka - Treyler</th>
                                <th>Sürücü</th>
                                <th>İzin Türü</th>
                                <th>Başlangıç</th>
                                <th>Bitiş</th>
                                <th>Gün</th>
                                <th>Açıklama</th>
                                <th>Ekleyen</th>
                                <th>Tarih</th>
                                <th>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {izinler.length === 0 ? (
                                <tr><td colSpan="10">Henüz kayıtlı izin yok.</td></tr>
                            ) : (
                                izinler.map((i) => (
                                    <tr key={i.id}>
                                        <td>{i.plaka_treyler}</td>
                                        <td>{i.surucu_adi}</td>
                                        <td>{i.izin_turu}</td>
                                        <td>{i.baslangic_tarihi}</td>
                                        <td>{i.bitis_tarihi}</td>
                                        <td>{i.gun_sayisi}</td>
                                        <td>{i.aciklama}</td>
                                        <td>{i.ekleyen_kullanici}</td>
                                        <td>{new Date(i.eklenme_tarihi).toLocaleDateString()}</td>
                                        <td>
                                            <button onClick={() => handleSil(i.id)}>Sil</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default IzinGirisi;
