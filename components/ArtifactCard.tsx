import React from 'react';
import { Gem } from 'lucide-react';

interface ArtifactCardProps {
  onOpen: () => void;
}

const ArtifactCard: React.FC<ArtifactCardProps> = ({ onOpen }) => {
  return (
    <div 
      onClick={onOpen}
      className={`
        relative group cursor-pointer 
        w-20 h-24 sm:w-24 sm:h-28
        bg-gradient-to-b from-yellow-700 to-yellow-900 
        rounded-xl shadow-xl border-2 sm:border-4 border-yellow-500
        flex flex-col items-center justify-center
        transform transition-all active:scale-95
        hover:scale-105
        overflow-hidden
      `}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 bg-white/10 skew-x-12 translate-x-[-150%] group-hover:animate-[shine_1s_infinite]"></div>

      {/* Card Content */}
      <div className="text-3xl sm:text-4xl mb-1 sm:mb-2 drop-shadow-lg text-yellow-200">
        <Gem size={32} className="sm:w-10 sm:h-10" />
      </div>
      
      <div className="font-bold text-yellow-100 text-[10px] sm:text-xs uppercase tracking-wider">유물</div>
      
      {/* Decorative */}
      <div className="absolute -bottom-2 bg-black/40 w-full h-4"></div>
    </div>
  );
};

export default ArtifactCard;