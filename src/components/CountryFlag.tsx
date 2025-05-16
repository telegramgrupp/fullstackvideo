import React from 'react';
import { countries } from 'countries-list';

interface CountryFlagProps {
  countryCode: string;
  size?: number;
}

interface CountryData {
  [key: string]: {
    name: string;
    emoji: string;
  };
}

const CountryFlag: React.FC<CountryFlagProps> = ({ countryCode, size = 24 }) => {
  const countriesTyped = countries as CountryData;
  
  const country = countriesTyped[countryCode.toUpperCase()];
  
  if (!country) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-1.5 bg-dark-200/80 backdrop-blur-sm px-2 py-1 rounded">
      <span style={{ fontSize: `${size * 0.75}px` }}>{country.emoji}</span>
      <span className="text-white text-sm font-medium">{country.name}</span>
    </div>
  );
};

export default CountryFlag;