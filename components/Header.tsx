import React from "react";
import ConfettiBackground from "./ConfettiBackground";

const Header: React.FC = () => {
    return (
        <header className="relative h-48 overflow-hidden">
            {/* Confetti thay cho banghieu1.png */}
            <ConfettiBackground
                className="absolute inset-0 z-0 pointer-events-none"
                density={120}
                palette={["#FFD700", "#E6B800", "#FF8C00", "#00BFFF", "#ADFF2F"]} // màu GoldOne
            />

            {/* Gradient phủ lên confetti để chữ/logo rõ hơn */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/30 z-[1]" />

            {/* Nội dung header */}
            <div className="relative z-[2] h-full flex items-center justify-center text-white">
                <img src="/banghieu.png" alt="Gold One Logo" className="h-18 flex-shrink-0" />
            </div>
        </header>
    );
};

export default Header;
