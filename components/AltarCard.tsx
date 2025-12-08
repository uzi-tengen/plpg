import React from 'react';
import { Scroll } from 'lucide-react';

interface AltarCardProps {
  onOpen: () => void;
}

const AltarCard: React.FC<AltarCardProps> = ({ onOpen }) => {
  return (
    <div 
      onClick={onOpen}
      className={`
        relative group cursor-pointer 
        w-20 h-24 sm:w-24 sm:h-28
        bg-gradient-to-b from-red-900 to-black 
        rounded-xl shadow-xl border-2 sm:border-4 border-red-500
        flex flex-col items-center justify-center
        transform transition-all active:scale-95
        hover:scale-105
        overflow-hidden
      `}
    >
      {/* Mystical Effect */}
      <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>

      {/* Card Content */}
      <div className="text-3xl sm:text-4xl mb-1 sm:mb-2 drop-shadow-lg text-red-200 z-10 group-hover:-translate-y-1 transition-transform">
        <Scroll size={32} className="sm:w-10 sm:h-10" />
      </div>
      
      <div className="font-bold text-red-100 text-[10px] sm:text-xs uppercase tracking-wider z-10">제단</div>
      
      {/* Decorative */}
      <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-red-600 blur-xl opacity-50"></div>
    </div>
  );
};

export default AltarCard;