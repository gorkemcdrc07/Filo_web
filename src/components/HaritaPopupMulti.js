import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import truckIconUrl from '../images/truck-icon.png';
import packageIconUrl from '../images/package.png';

const truckIcon = new L.Icon({
    iconUrl: truckIconUrl,
    iconSize: [32, 37],
    iconAnchor: [16, 37],
    popupAnchor: [0, -37],
});

const packageIcon = new L.Icon({
    iconUrl: packageIconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
});

// Haritayı belirtilen koordinata yaklaştırır
function MapFlyTo({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 12, { duration: 1.5 });
        }
    }, [position, map]);
    return null;
}

function HaritaPopupMulti({ open, onClose, araclar, yuklemeNoktasi, enYakinAraclar, onAracSec }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredAraclar, setFilteredAraclar] = useState(araclar);
    const [focusPosition, setFocusPosition] = useState(null);

    useEffect(() => {
        const filtered = araclar.filter(a =>
            a.plate.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredAraclar(filtered);
        if (filtered.length === 1) {
            setFocusPosition([filtered[0].latitude, filtered[0].longitude]);
        } else if (!searchTerm) {
            setFocusPosition(null);
        }
    }, [searchTerm, araclar]);

    // Plakaya tıklandığında haritayı o aracın konumuna yakınlaştır
    const handleAracSec = (plate) => {
        const arac = araclar.find(a => a.plate === plate);
        if (arac) {
            setFocusPosition([arac.latitude, arac.longitude]);
        }
        if (onAracSec) {
            onAracSec(plate);
        }
    };

    if (!open) return null;

    const center = yuklemeNoktasi
        ? [yuklemeNoktasi.latitude, yuklemeNoktasi.longitude]
        : [39.0, 35.0];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: 20,
        }}>
            <div style={{
                position: 'relative',
                width: '95%',
                maxWidth: 2100,
                height: '90%',
                backgroundColor: 'white',
                borderRadius: 12,
                display: 'flex',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 15, right: 15,
                        zIndex: 1001, fontSize: 28, background: 'none', border: 'none',
                        cursor: 'pointer', color: '#555',
                        transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#000'}
                    onMouseLeave={e => e.currentTarget.style.color = '#555'}
                    aria-label="Close map"
                >
                    &times;
                </button>

                <MapContainer center={center} zoom={7} style={{ flex: 1 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapFlyTo position={focusPosition} />
                    {araclar.map(arac => (
                        <Marker
                            key={arac.plate}
                            position={[arac.latitude, arac.longitude]}
                            icon={truckIcon}
                        >
                            <Popup>
                                <strong>{arac.plate}</strong><br />
                                {arac.city || ''} - {arac.town || ''}<br />
                                Mesafe: {arac.distance ?? '-'} km<br />
                                Tahmini varış: {arac.durationMinutes ?? '-'} dk
                            </Popup>
                        </Marker>
                    ))}
                    {yuklemeNoktasi && (
                        <Marker
                            position={[yuklemeNoktasi.latitude, yuklemeNoktasi.longitude]}
                            icon={packageIcon}
                        >
                            <Popup>
                                <strong>Yükleme Noktası</strong><br />
                                {yuklemeNoktasi.name}
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>

                <aside style={{
                    width: 350,
                    backgroundColor: '#f9f9f9',
                    borderLeft: '1px solid #ddd',
                    padding: '20px',
                    overflowY: 'auto',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <h3 style={{
                        margin: '0 0 12px 0',
                        fontWeight: '600',
                        fontSize: '1.4rem',
                        color: '#333',
                        borderBottom: '2px solid #007bff',
                        paddingBottom: 8,
                        userSelect: 'none',
                    }}>
                        En Yakın 5 Araç
                    </h3>
                    {enYakinAraclar.length === 0 ? (
                        <p style={{ color: '#777', fontStyle: 'italic', marginBottom: 20 }}>
                            Yakın araç bulunamadı.
                        </p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {enYakinAraclar.map(arac => (
                                <li
                                    key={arac.plate}
                                    onClick={() => handleAracSec(arac.plate)}
                                    style={{
                                        backgroundColor: '#fff',
                                        marginBottom: 12,
                                        padding: '10px 15px',
                                        borderRadius: 8,
                                        boxShadow: '0 1px 5px rgba(0,0,0,0.1)',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.3s, box-shadow 0.3s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.backgroundColor = '#e6f0ff';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,123,255,0.3)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.backgroundColor = '#fff';
                                        e.currentTarget.style.boxShadow = '0 1px 5px rgba(0,0,0,0.1)';
                                    }}
                                >
                                    <strong style={{ fontSize: '1.1rem', color: '#007bff', marginBottom: 6 }}>
                                        {arac.plate}
                                    </strong>
                                    <span style={{ fontSize: '0.9rem', color: '#555' }}>
                                        Mesafe: <b>{arac.distance} km</b>
                                    </span>
                                    <span style={{ fontSize: '0.9rem', color: '#555' }}>
                                        Tahmini varış: <b>{arac.durationMinutes} dk</b>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <h3 style={{
                        margin: '30px 0 12px 0',
                        fontWeight: '600',
                        fontSize: '1.4rem',
                        color: '#333',
                        borderBottom: '2px solid #28a745',
                        paddingBottom: 8,
                        userSelect: 'none',
                    }}>
                        Tüm Araçlar
                    </h3>

                    <input
                        type="text"
                        placeholder="Plaka ara..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            marginBottom: 15,
                            padding: '8px 12px',
                            fontSize: '1rem',
                            borderRadius: 6,
                            border: '1px solid #ccc',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = '#28a745'}
                        onBlur={e => e.target.style.borderColor = '#ccc'}
                    />

                    {filteredAraclar.length === 0 ? (
                        <p style={{ color: '#777', fontStyle: 'italic' }}>Araç bulunamadı.</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                            {filteredAraclar.map(arac => (
                                <li
                                    key={arac.plate}
                                    onClick={() => handleAracSec(arac.plate)}
                                    style={{
                                        backgroundColor: '#fff',
                                        marginBottom: 12,
                                        padding: '10px 15px',
                                        borderRadius: 8,
                                        boxShadow: '0 1px 5px rgba(0,0,0,0.1)',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.3s, box-shadow 0.3s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.backgroundColor = '#d4edda';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(40,167,69,0.3)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.backgroundColor = '#fff';
                                        e.currentTarget.style.boxShadow = '0 1px 5px rgba(0,0,0,0.1)';
                                    }}
                                >
                                    <strong style={{ fontSize: '1.1rem', color: '#28a745', marginBottom: 6 }}>
                                        {arac.plate}
                                    </strong>
                                    <span style={{ fontSize: '0.9rem', color: '#555' }}>
                                        Mesafe: <b>{arac.distance ?? '-'} km</b>
                                    </span>
                                    <span style={{ fontSize: '0.9rem', color: '#555' }}>
                                        Tahmini varış: <b>{arac.durationMinutes ?? '-'} dk</b>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>
            </div>
        </div>
    );
}

export default HaritaPopupMulti;
