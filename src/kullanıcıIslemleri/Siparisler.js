import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import Select from 'react-select';
import HaritaPopupMulti from '../components/HaritaPopupMulti';
import './Siparisler.css';
import { supabase } from '../supabaseClient';

function Siparisler() {
    const [veriler, setVeriler] = useState([]);
    const [yükleniyor, setYükleniyor] = useState(true);
    const [detayGoster, setDetayGoster] = useState(null);
    const [formVeri, setFormVeri] = useState({});
    const [plakaVerileri, setPlakaVerileri] = useState([]);

    // Harita popup durumu ve seçilen aracın konumu için state
    const [haritaPopupAcik, setHaritaPopupAcik] = useState(false);
    const [seciliAracKonum, setSeciliAracKonum] = useState(null); // {latitude, longitude, plaka, konumStr}
    const [mobilizAraclar, setMobilizAraclar] = useState([]); // Tüm araç konumları
    const [yuklemeNoktalari, setYuklemeNoktalari] = useState([]);
    const [seciliYuklemeNoktasi, setSeciliYuklemeNoktasi] = useState(null);
    const [enYakinAraclar, setEnYakinAraclar] = useState([]); // En yakın 5 araç



    const formatDate = (tarih) => {
        if (!tarih) return '-';
        const [yil, ay, gun] = tarih.split('T')[0].split('-');
        return `${gun}.${ay}.${yil}`;
    };

    useEffect(() => {
        const fetchPlakalar = async () => {
            const { data, error } = await supabase
                .from('plakalar')
                .select('plaka, treyler, statu');

            if (error) console.error('Supabase Hatası:', error);
            else setPlakaVerileri(data || []);
        };

        fetchPlakalar();
    }, []);

    // gruplar'ı useMemo ile tanımla
    const gruplar = useMemo(() => {
        return veriler.reduce((acc, item) => {
            const key = item.TMSVehicleRequestDocumentNo || 'Bilinmiyor';
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});
    }, [veriler]);

    // gruplar değiştikçe yükleme noktalarını güncelle
    useEffect(() => {
        const noktalar = [];

        Object.values(gruplar).forEach(grup => {
            grup.forEach(item => {
                if (item.PickupLatitude && item.PickupLongitude) {
                    noktalar.push({
                        latitude: Number(item.PickupLatitude),
                        longitude: Number(item.PickupLongitude),
                        name: `${item.PickupCityName || ''} - ${item.PickupCountyName || ''}`
                    });
                }
            });
        });

        setYuklemeNoktalari(noktalar);
    }, [gruplar]);

    useEffect(() => {
        const fetchData = async () => {
            setYükleniyor(true);
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 7);

            try {
                const response = await axios.post(
                    '/api/tmsorders/getall',
                    {
                        startDate: start.toISOString().split('.')[0],
                        endDate: end.toISOString().split('.')[0],
                        userId: 1,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer 49223653afa4b7e22c3659762c835dcdef9725a401e928fd46f697be8ea2597273bf4479cf9d0f7e5b8b03907c2a0b4d58625692c3e30629ac01fc477774de75`
                        }
                    }
                );

                const filtreli = (response.data.Data || []).filter(item => item.OrderStatu === 90);
                setVeriler(filtreli);
            } catch (error) {
                console.error('Veri çekilirken hata oluştu:', error);
            } finally {
                setYükleniyor(false);
            }
        };

        fetchData();
    }, []);

    const birlestir = (arr, field) => {
        const uniq = [...new Set(arr.map(i => i[field] || '-'))];
        return uniq.join('; ');
    };

    const handlePlakaDegis = (pozisyonNo, secilenSecenek) => {
        setFormVeri(prev => ({
            ...prev,
            [pozisyonNo]: { ...prev[pozisyonNo], plaka: secilenSecenek?.value || '' }
        }));
    };

    const handleVarisDegis = (pozisyonNo, deger) => {
        setFormVeri(prev => ({
            ...prev,
            [pozisyonNo]: { ...prev[pozisyonNo], varis: deger }
        }));
    };

    const plakaOner = (pozisyonNo) => {
        if (plakaVerileri.length === 0) return;
        const random = plakaVerileri[Math.floor(Math.random() * plakaVerileri.length)];
        handlePlakaDegis(pozisyonNo, { value: random.plaka });
    };

    const geocode = async (city, county) => {
        const addressOptions = [
            `${city} ${county}, Turkey`,
            `${city}, Turkey`,
            `${county}, ${city}, Turkey`
        ];

        for (const addressRaw of addressOptions) {
            const address = encodeURIComponent(addressRaw);
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${address}`;
            try {
                const res = await fetch(url);
                const data = await res.json();
                if (data && data.length > 0) {
                    return {
                        latitude: parseFloat(data[0].lat),
                        longitude: parseFloat(data[0].lon),
                        name: `${city} - ${county}`
                    };
                }
            } catch (e) {
                console.error('Geocoding hatası:', e);
            }
        }
        return null;
    };

    function haversineDistance(lat1, lon1, lat2, lon2) {
        const toRad = (x) => (x * Math.PI) / 180;

        const R = 6371; // Dünya yarıçapı km
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // km cinsinden mesafe
    }


    const handleMobilizKonumGetir = async (pozisyonNo) => {
        try {
            const response = await axios.get('https://ng.mobiliz.com.tr/su7/api/integrations/activity/last', {
                headers: {
                    'Content-Type': 'application/json',
                    'Mobiliz-Token': 'dcbf43bb4015717c6d77420be787f6275e48840622519f2a149ba564099d4538'
                }
            });

            let araclar = response.data.result || [];

            const grup = gruplar[pozisyonNo];
            if (grup && grup.length > 0) {
                const firstItem = grup[0];
                if (firstItem.PickupCityName && firstItem.PickupCountyName) {
                    const yuklemeNoktasi = await geocode(firstItem.PickupCityName, firstItem.PickupCountyName);
                    if (yuklemeNoktasi) {
                        setSeciliYuklemeNoktasi(yuklemeNoktasi);

                        // Mesafe ve tahmini süre hesapla
                        araclar = araclar.map(arac => {
                            const distance = haversineDistance(
                                yuklemeNoktasi.latitude, yuklemeNoktasi.longitude,
                                arac.latitude, arac.longitude
                            );

                            const averageSpeed = 65; // km/saat

                            const durationMinutes = Math.round((distance / averageSpeed) * 60);

                            return {
                                ...arac,
                                distance: parseFloat(distance.toFixed(2)),
                                durationMinutes,
                            };
                        });

                        // En yakın 5 aracı al
                        const sortedAraclar = [...araclar].sort((a, b) => a.distance - b.distance);
                        setEnYakinAraclar(sortedAraclar.slice(0, 5));
                    }
                }
            }

            setMobilizAraclar(araclar); // **Tüm araçlar haritada**
            setHaritaPopupAcik(true);
        } catch (err) {
            console.error('Mobiliz API hatası:', err);
            alert('Mobiliz API çağrısında hata oluştu.');
        }
    };



    const kapatHaritaPopup = () => {
        setHaritaPopupAcik(false);
        setSeciliAracKonum(null);
        setYuklemeNoktalari([]);  // Harita temizlensin
    };



    if (yükleniyor) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            <h2 className="title">FİLO ARAÇ PLANLAMADA OLAN SİPARİŞLER</h2>
            <div className="table-wrapper">
                <table className="sefer-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Plaka</th>
                            <th>Plaka Öner</th>
                            <th>Tahmini Varış</th>
                            <th>Firma</th>
                            <th>Proje</th>
                            <th>Hizmet Tipi</th>
                            <th>İstenilen Araç Tipi</th>
                            <th>Sipariş Numarası</th>
                            <th>Sipariş Tarihi</th>
                            <th>Yükleme Tarihi</th>
                            <th>Teslim Tarihi</th>
                            <th>Yükleme Noktası</th>
                            <th>Yükleme İli</th>
                            <th>Yükleme İlçesi</th>
                            <th>Teslim Noktası</th>
                            <th>Teslim İli</th>
                            <th>Teslim İlçesi</th>
                            <th>Pozisyon No</th>
                            <th>Toplam KG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(gruplar).map(([key, grup], index) => {
                            const { plaka = '', varis = '' } = formVeri[key] || {};
                            const detayAcikMi = detayGoster === key;

                            // Dropdown için başlık ve seçenekler
                            const secenekler = [
                                {
                                    label: 'Plaka - Treyler - Statü',
                                    value: '__header__',
                                    isDisabled: true,
                                },
                                ...plakaVerileri.map(p => ({
                                    value: p.plaka,
                                    plaka: p.plaka,
                                    treyler: p.treyler || '-',
                                    statu: p.statu || '-',
                                })),
                            ];

                            return (
                                <React.Fragment key={index}>
                                    <tr className={detayAcikMi ? 'aktif sefer-row' : ''}>
                                        <td>
                                            <button
                                                onClick={() => setDetayGoster(detayAcikMi ? null : key)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    fontSize: '18px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {detayAcikMi ? '–' : '+'}
                                            </button>
                                        </td>
                                        <td>
                                            <Select
                                                options={secenekler}
                                                value={secenekler.find(opt => opt.value === plaka)}
                                                onChange={option => handlePlakaDegis(key, option)}
                                                placeholder="Plaka seçiniz..."
                                                isClearable
                                                formatOptionLabel={option => {
                                                    if (option.value === '__header__') {
                                                        return (
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    fontWeight: 'bold',
                                                                    borderBottom: '1px solid #ccc',
                                                                    paddingBottom: 4,
                                                                    marginBottom: 4,
                                                                    fontSize: 13,
                                                                    width: '100%',
                                                                }}
                                                            >
                                                                <div style={{ width: '33%' }}>Plaka</div>
                                                                <div style={{ width: '33%', textAlign: 'center' }}>Treyler</div>
                                                                <div style={{ width: '33%', textAlign: 'right' }}>Statü</div>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                fontSize: 13,
                                                                padding: '4px 8px',
                                                                width: '100%',
                                                            }}
                                                        >
                                                            <div style={{ width: '33%' }}>{option.plaka}</div>
                                                            <div style={{ width: '33%', textAlign: 'center' }}>{option.treyler}</div>
                                                            <div style={{ width: '33%', textAlign: 'right' }}>{option.statu}</div>
                                                        </div>
                                                    );
                                                }}
                                                styles={{
                                                    control: provided => ({
                                                        ...provided,
                                                        minHeight: '40px',
                                                        fontSize: '15px',
                                                        width: '450px',
                                                        borderRadius: '6px',
                                                        borderColor: '#ccc',
                                                        boxShadow: 'none',
                                                        '&:hover': {
                                                            borderColor: '#888',
                                                        },
                                                    }),
                                                    menu: provided => ({
                                                        ...provided,
                                                        zIndex: 9999,
                                                        width: '450px',
                                                        borderRadius: '6px',
                                                    }),
                                                    option: (provided, state) => ({
                                                        ...provided,
                                                        padding: 10,
                                                        fontSize: '14px',
                                                        backgroundColor: state.isFocused ? '#f0f0f0' : 'white',
                                                        color: '#333',
                                                        cursor: 'pointer',
                                                    }),
                                                    placeholder: provided => ({
                                                        ...provided,
                                                        fontSize: '15px',
                                                        color: '#999',
                                                    }),
                                                    singleValue: provided => ({
                                                        ...provided,
                                                        fontSize: '15px',
                                                    }),
                                                }}
                                            />
                                        </td>
                                        <td>
                                            <button className="konum-btn" onClick={() => handleMobilizKonumGetir(key)}>Plaka Öner</button>
                                        </td>
                                        <td>
                                            <input
                                                type="datetime-local"
                                                value={varis}
                                                onChange={e => handleVarisDegis(key, e.target.value)}
                                            />
                                        </td>
                                        <td>{birlestir(grup, 'CurrentAccountTitle')}</td>
                                        <td>{birlestir(grup, 'ProjectName')}</td>
                                        <td>{birlestir(grup, 'ServiceName')}</td>
                                        <td>{birlestir(grup, 'VehicleTypeName')}</td>
                                        <td>{birlestir(grup, 'DocumentNo')}</td>
                                        <td>{birlestir(grup, 'OrderDate').split('; ').map(formatDate).join('; ')}</td>
                                        <td>{birlestir(grup, 'PickupDate').split('; ').map(formatDate).join('; ')}</td>
                                        <td>{birlestir(grup, 'DeliveryDate').split('; ').map(formatDate).join('; ')}</td>
                                        <td>{birlestir(grup, 'PickupAddressCode')}</td>
                                        <td>{birlestir(grup, 'PickupCityName')}</td>
                                        <td>{birlestir(grup, 'PickupCountyName')}</td>
                                        <td>{birlestir(grup, 'DeliveryAddressCode')}</td>
                                        <td>{grup[grup.length - 1].DeliveryCityName || '-'}</td>
                                        <td>{grup[grup.length - 1].DeliveryCountyName || '-'}</td>
                                        <td>{key}</td>
                                        <td>{birlestir(grup, 'TotalWeight')} KG</td>
                                    </tr>
                                    {detayAcikMi && (
                                        <tr className="detay-row">
                                            <td colSpan="20">
                                                <div className="detay-icerik">
                                                    <div className="detay-baslik">Detaylı Lokasyon Bilgileri</div>
                                                    <table className="detay-inner-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Firma</th>
                                                                <th>Yükleme Noktası</th>
                                                                <th>Yükleme İli</th>
                                                                <th>Yükleme İlçesi</th>
                                                                <th>Teslim Noktası</th>
                                                                <th>Teslim İli</th>
                                                                <th>Teslim İlçesi</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {grup.map((item, i) => (
                                                                <tr key={i}>
                                                                    <td>{item.CurrentAccountTitle || '-'}</td>
                                                                    <td>{item.PickupAddressCode || '-'}</td>
                                                                    <td>{item.PickupCityName || '-'}</td>
                                                                    <td>{item.PickupCountyName || '-'}</td>
                                                                    <td>{item.DeliveryAddressCode || '-'}</td>
                                                                    <td>{item.DeliveryCityName || '-'}</td>
                                                                    <td>{item.DeliveryCountyName || '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <HaritaPopupMulti
                open={haritaPopupAcik}
                onClose={kapatHaritaPopup}
                araclar={mobilizAraclar}           // Haritada tüm araçlar gösterilecek
                yuklemeNoktasi={seciliYuklemeNoktasi}
                enYakinAraclar={enYakinAraclar}    // Sağdaki liste için en yakın 5 araç
                onAracSec={(plaka) => {
                    setFormVeri(prev => ({
                        ...prev,
                        [detayGoster]: { ...(prev[detayGoster] || {}), plaka }
                    }));
                    // Popup kapanmasın, sadece plaka seçilsin
                    // setHaritaPopupAcik(false);
                    // setSeciliAracKonum(null);
                    // setSeciliYuklemeNoktasi(null);
                }}
            />




        </div>
    );
}

export default Siparisler;
