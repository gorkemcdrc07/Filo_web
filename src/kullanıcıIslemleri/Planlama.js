import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import './Planlama.css';

function Planlama() {
    const [veriler, setVeriler] = useState([]);

    useEffect(() => {
        veriGetir();
    }, []);

    const veriGetir = async () => {
        const { data, error } = await supabase
            .from('planlama')
            .select('*')
            .order('sefer_no', { ascending: false });

        if (!error) setVeriler(data || []);
    };

    return (
        <div className="planlama-sayfasi">
            <div className="planlama-wrapper">
                <table className="planlama-tablo">
                    <thead>
                        <tr>
                            <th>Sefer No</th>
                            <th>Sevk No</th>
                            <th>Tarih</th>
                            <th>Plaka</th>
                            <th>Ad Soyad</th>
                            <th>Telefon</th>
                            <th>TC</th>
                            <th>Varış Tarihi</th>
                            <th>Son Nokta</th>
                            <th>Fatura Müşterisi</th>
                            <th>Yükleme Noktası</th>
                            <th>Tahliye Noktası</th>
                            <th>Tahliye İl</th>
                            <th>Tonaj</th>
                            <th>Bir Önceki İş</th>
                        </tr>
                    </thead>
                    <tbody>
                        {veriler.length === 0 ? (
                            <tr><td colSpan="15">Kayıt bulunamadı.</td></tr>
                        ) : (
                            veriler.map((v, i) => (
                                <tr key={i}>
                                    <td>{v.sefer_no}</td>
                                    <td>{v.sevk_no}</td>
                                    <td>{v.tarih}</td>
                                    <td>{v.plaka}</td>
                                    <td>{v.ad_soyad}</td>
                                    <td>{v.telefon}</td>
                                    <td>{v.tc}</td>
                                    <td>{v.varis_tarihi}</td>
                                    <td>{v.son_nokta}</td>
                                    <td>{v.fatura_musterisi}</td>
                                    <td>{v.yukleme_noktasi}</td>
                                    <td>{v.tahliye_noktasi}</td>
                                    <td>{v.tahliye_il}</td>
                                    <td>{v.tonaj}</td>
                                    <td>{v.bir_onceki_is}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Planlama;
