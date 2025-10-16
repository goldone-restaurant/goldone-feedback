import React from "react";
import ConfettiBackground from "./ConfettiBackground";
import AquariumBackground from "@/components/AquariumBackground.tsx";

const Header: React.FC = () => {
    return (
        <header className="relative h-48 overflow-hidden">
            {/* Confetti thay cho banghieu1.png */}
            <AquariumBackground className="absolute inset-0" bubbles dim />

            {/* Gradient phủ lên confetti để chữ/logo rõ hơn */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/30 z-[1]" />

            {/* Nội dung header */}
            <div className="relative z-[2] h-full flex items-center justify-center text-white">
                <img src="/banghieu.png" alt="Gold One Logo" className="flex-shrink-0" style={{height: '6rem'}} />
            </div>
        </header>
    );
};

export default Header;
