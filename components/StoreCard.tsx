import React from 'react';

interface StoreCardProps {
  cost: number;
  onBuy: () => void;
  canAfford: boolean;
  unitCount: number;
}

const StoreCard: React.FC<StoreCardProps> = ({ cost, onBuy, canAfford, unitCount }) => {
  return (
    <div 
      onClick={() => onBuy()}
      className={`
        relative group cursor-pointer 
        w-20 h-24 sm:w-24 sm:h-28
        bg-gradient-to-b from-blue-600 to-blue-800 
        rounded-xl shadow-xl border-2 sm:border-4 border-blue-400
        flex flex-col items-center justify-center
        transform transition-all active:scale-95
        hover:scale-105
      `}
    >
      {/* Card Content */}
      <div className="text-3xl sm:text-4xl mb-1 sm:mb-2 drop-shadow-lg group-hover:animate-bounce">📦</div>
      
      <div className="font-bold text-white text-[10px] sm:text-xs uppercase tracking-wider">상점</div>
      
      {/* Price Tag (Base) */}
      <div className="absolute -bottom-2 sm:-bottom-3 bg-yellow-500 text-black font-extrabold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border-2 border-white shadow-md flex items-center gap-1 scale-90 sm:scale-100">
        <span className="text-[10px] sm:text-xs">🪙</span>
        <span className="text-xs sm:text-sm">{cost}</span>
      </div>

      {/* Unit Count Badge */}
      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center border-2 border-white">
        {unitCount}
      </div>
    </div>
  );
};

export default StoreCard;