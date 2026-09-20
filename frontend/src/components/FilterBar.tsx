import React from 'react';

interface FilterBarProps {
  selectedState: string;
  setSelectedState: (state: string) => void;
  selectedCity?: string;
  setSelectedCity?: (city: string) => void;
  cities?: string[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  pollutants?: string[];
  selectedPollutant?: string;
  setSelectedPollutant?: (pollutant: string) => void;
  onRefresh?: () => void;
}

const states = [
  'All India',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedState,
  setSelectedState,
  selectedCity,
  setSelectedCity,
  cities,
  selectedDate,
  setSelectedDate,
  pollutants,
  selectedPollutant,
  setSelectedPollutant,
  onRefresh,
}) => {
  return (
    <div className="glass-card p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between mb-6 shadow-xs border border-slate-200/90">
      <div className="flex flex-wrap gap-4 items-center">
        {/* State Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-heading">
            Region / State
          </label>
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              if (setSelectedCity) setSelectedCity('');
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer"
          >
            {states.map((st) => (
              <option key={st} value={st === 'All India' ? '' : st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* City Filter */}
        {setSelectedCity && cities && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-heading">
              City
            </label>
            <select
              value={selectedCity || ''}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer"
            >
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Filter */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-heading">
              Observation Date
            </label>
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="text-[9px] font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
              title="Set to today's real-time feed"
            >
              <span>⚡</span> Live Today
            </button>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              const val = e.target.value;
              if (val && !isNaN(Date.parse(val))) {
                setSelectedDate(val);
              }
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer font-mono"
          />
        </div>

        {/* Pollutant Filter */}
        {pollutants && selectedPollutant && setSelectedPollutant && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-heading">
              Target Pollutant
            </label>
            <select
              value={selectedPollutant}
              onChange={(e) => setSelectedPollutant(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer"
            >
              {pollutants.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl px-3.5 py-2 flex items-center gap-2 border border-slate-200 transition duration-150 cursor-pointer shadow-2xs hover:border-slate-300"
        >
          <span>🔄</span>
          <span>Refresh Data</span>
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
