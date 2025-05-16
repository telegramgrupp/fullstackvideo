import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Coins, Check, Star, Zap, Crown, Sparkles } from 'lucide-react';
import { CoinPackage } from '../types';

const coinPackages: CoinPackage[] = [
  { 
    id: 1, 
    name: 'Starter', 
    coins: 50, 
    price: 4.99, 
    discountPercentage: null,
    features: ['10 dakika ekstra eşleşme', 'Temel filtreler']
  },
  { 
    id: 2, 
    name: 'Popular', 
    coins: 150, 
    price: 9.99, 
    discountPercentage: 20,
    features: ['30 dakika ekstra eşleşme', 'Gelişmiş filtreler', 'Öncelikli eşleşme']
  },
  { 
    id: 3, 
    name: 'Pro', 
    coins: 500, 
    price: 24.99, 
    discountPercentage: 30,
    features: ['2 saat ekstra eşleşme', 'Tüm filtreler', 'VIP destek', 'Özel rozetler']
  },
  { 
    id: 4, 
    name: 'Ultimate', 
    coins: 1200, 
    price: 49.99, 
    discountPercentage: 40,
    features: ['Sınırsız eşleşme', 'Tüm özellikler', 'Premium destek', 'Özel efektler']
  }
];

const packageIcons = {
  Starter: <Star className="text-yellow-400" />,
  Popular: <Zap className="text-purple-400" />,
  Pro: <Crown className="text-orange-400" />,
  Ultimate: <Sparkles className="text-blue-400" />
};

interface CoinPackagesProps {
  onClose: () => void;
}

const CoinPackages: React.FC<CoinPackagesProps> = ({ onClose }) => {
  const { user, addCoins } = useAuth();
  
  const handlePurchase = async (pack: CoinPackage) => {
    if (!user) return;
    
    try {
      await addCoins(pack.coins);
      onClose();
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-sm">
      <div className="min-h-screen w-full flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-300 rounded-xl w-full max-w-2xl overflow-hidden my-auto"
        >
          <div className="sticky top-0 z-10 bg-dark-300 p-5 border-b border-dark-200">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Coins size={20} className="text-yellow-400" />
              Get More Coins
            </h2>
          </div>
          
          <div className="p-5">
            <p className="text-gray-300 mb-6">
              Purchase coins to continue matching with people, unlock filters, and more!
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {coinPackages.map((pack, index) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative bg-dark-200 rounded-lg p-4 border border-dark-100 hover:border-primary-500 transition-colors cursor-pointer overflow-hidden"
                  onClick={() => handlePurchase(pack)}
                >
                  {/* Shine effect */}
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{ repeat: Infinity, duration: 3, delay: index * 0.2 }}
                    className="absolute inset-0 z-0 transform -skew-x-12 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                  />
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {packageIcons[pack.name as keyof typeof packageIcons]}
                          <h3 className="text-white font-semibold">{pack.name}</h3>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Coins size={16} className="text-yellow-400" />
                          <span className="text-yellow-400 font-medium">{pack.coins} coins</span>
                        </div>
                      </div>
                      
                      {pack.discountPercentage && (
                        <div className="bg-accent-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                          {pack.discountPercentage}% OFF
                        </div>
                      )}
                    </div>
                    
                    <ul className="space-y-1 mb-4">
                      {pack.features.map((feature, i) => (
                        <li key={i} className="text-sm text-gray-400 flex items-center gap-2">
                          <Check size={12} className="text-primary-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    <div className="flex items-baseline justify-between mb-4">
                      <div className="text-lg font-bold text-white">
                        ${pack.price.toFixed(2)}
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        ${(pack.price / pack.coins).toFixed(3)} per coin
                      </div>
                    </div>
                    
                    <button className="w-full py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors flex items-center justify-center gap-2">
                      <Check size={16} />
                      <span>Select</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="sticky bottom-0 bg-dark-300 pt-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-dark-100 text-white hover:bg-dark-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CoinPackages;