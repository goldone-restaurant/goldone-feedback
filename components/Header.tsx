import React from 'react';
import GoldOneLogo from './icons/GoldOneLogo';

const Header: React.FC = () => {
  // Define a text shadow style for better readability
  const textShadowStyle = { textShadow: '0 2px 4px rgba(0, 0, 0, 0.6)' };

  return (
    <header className="relative h-48">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/1200/400?image=1060')" }}></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/30"></div>
      <div className="relative h-full flex items-center justify-start text-white px-4 sm:px-6">
        <GoldOneLogo className="w-14 h-14 text-yellow-400 flex-shrink-0" />
        <div className="ml-4">
            <h1 className="text-3xl font-extrabold tracking-tight" style={textShadowStyle}>Gold One</h1>
            <p className="mt-1 text-md font-medium text-stone-200" style={textShadowStyle}>Nhà Hàng Sang Trọng</p>
        </div>
      </div>
    </header>
  );
};

export default Header;