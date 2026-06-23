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
    <div className="glass-card p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* State Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Region / State</label>
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              if (setSelectedCity) setSelectedCity('');
            }}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-purple-500"
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
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">City</label>
            <select
              value={selectedCity || ''}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-purple-500"
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
          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Observation Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              const val = e.target.value;
              if (val && !isNaN(Date.parse(val))) {
                setSelectedDate(val);
              }
            }}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-purple-500"
          />
        </div>

        {/* Pollutant Filter */}
        {pollutants && selectedPollutant && setSelectedPollutant && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Target Pollutant</label>
            <select
              value={selectedPollutant}
              onChange={(e) => setSelectedPollutant(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-purple-500"
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
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl px-4 py-2 flex items-center gap-2 border border-slate-700 transition duration-150"
        >
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
};
export default FilterBar;
