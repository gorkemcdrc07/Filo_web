import React from "react";
import "./Navbar.css";
import { useNavigate } from "react-router-dom";

function Navbar() {
    const kullanici = localStorage.getItem("kullanici");
    const rol = localStorage.getItem("rol");
    const navigate = useNavigate();

    const cikisYap = () => {
        localStorage.clear();
        navigate("/");
    };

    return (
        <div className="navbar">
            {/* Sol taraf boş bırakıldı */}
            <div></div>
            <div className="navbar-user">
                👤 {kullanici?.toUpperCase()} ({rol?.toUpperCase()})
                <button className="logout-btn" onClick={cikisYap}>
                    🚪 Çıkış
                </button>
            </div>
        </div>
    );
}

export default Navbar;
