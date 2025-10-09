import React from 'react';

const Header: React.FC = () => {
    // Define a text shadow style for better readability
    const textShadowStyle = {textShadow: '0 2px 4px rgba(0, 0, 0, 0.6)'};

    return (<header className="relative h-48">
            <div className="absolute inset-0 bg-cover bg-center"
                 style={{backgroundImage: "url('https://picsum.photos/1200/400?image=1060')"}}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/30"></div>
            <div className="relative h-full flex items-center justify-center text-white px-0 sm:px-0"
                 style="user-select: auto;"><img alt="Gold One Logo" className="h-20" src="/banghieu.png"
                                                 style="user-select: auto;"/>
            </div>
        </header>);
};

export default Header;