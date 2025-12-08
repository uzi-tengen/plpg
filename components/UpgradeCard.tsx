import React from 'react';
import { Hammer, ArrowUpCircle } from 'lucide-react';

interface UpgradeCardProps {
  onOpen: () => void;
  hasUpgradable: boolean;
}

const UpgradeCard: React.FC<UpgradeCardProps> = ({ onOpen, hasUpgradable }) => {
  return (
    <div 
      onClick={onOpen}
      className={`
        relative group cursor-pointer 
        w-20 h-24 sm:w-24 sm:h-28
        bg-gradient-to-b from-purple-600 to-purple-800 
        rounded-xl shadow-xl border-2 sm:border-4 border-purple-400
        flex flex-col items-center justify-center
        transform transition-all active:scale-95
        hover:scale-105
      `}
    >
      {/* Card Content */}
      <div className="text-3xl sm:text-4xl mb-1 sm:mb-2 drop-shadow-lg text-white group-hover:rotate-12 transition-transform">
        <Hammer size={32} className="sm:w-10 sm:h-10" />
      </div>
      
      <div className="font-bold text-white text-[10px] sm:text-xs uppercase tracking-wider">연구소</div>
      
      {/* Decorative */}
      <div className="absolute -bottom-2 sm:-bottom-3 bg-purple-900 text-white font-extrabold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border-2 border-purple-300 shadow-md flex items-center gap-1 text-[10px] sm:text-xs scale-90 sm:scale-100">
        강화하기
      </div>

      {/* Indicator */}
      {hasUpgradable && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
          <ArrowUpCircle size={14} className="sm:w-4 sm:h-4" />
        </div>
      )}
    </div>
  );
};

export default UpgradeCard;