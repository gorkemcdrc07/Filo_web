import React from 'react';
import Navbar from './Navbar';

function Tamamlananlar() {
    return (
        <>
            <Navbar />
            <div style={{ padding: '30px' }}>
                <h2>Tamamlananlar</h2>
                <p>Tamamlanan sipariþ ve iþlemler burada listelenecek.</p>
            </div>
        </>
    );
}

export default Tamamlananlar;
