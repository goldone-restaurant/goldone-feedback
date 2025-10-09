import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="relative h-48">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/1200/400?image=835')" }}></div>
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className="relative h-full flex flex-col items-center justify-center text-white text-center px-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Goldone</h1>
        <p className="mt-2 text-lg font-medium text-stone-200">Nhà Hàng Hải Sản</p>
      </div>
    </header>
  );
};

export default Header;