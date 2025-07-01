import React from 'react';
import Modal from 'react-modal';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

Modal.setAppElement('#root');

const HaritaPopup = ({ open, onClose, konum }) => {
    const customIcon = new L.Icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
    });

    const lat = konum?.[0];
    const lng = konum?.[1];

    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return null;
    }

    return (
        <Modal
            isOpen={open}
            onRequestClose={onClose}
            contentLabel="Harita"
            style={{
                content: {
                    inset: '10%',
                    padding: 0,
                    borderRadius: '8px',
                    overflow: 'hidden'
                }
            }}
        >
            <MapContainer center={[lat, lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />
                <Marker position={[lat, lng]} icon={customIcon} />
            </MapContainer>
        </Modal>
    );
};

export default HaritaPopup;
