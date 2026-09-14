import React from 'react';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
  iconOn?: React.ReactNode;
  iconOff?: React.ReactNode;
  activeColor?: 'orange' | 'blue' | 'emerald' | 'purple';
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  description,
  iconOn,
  iconOff,
  activeColor = 'orange',
  className = '',
}) => {
  const sizeConfig = {
    sm: {
      track: 'w-9 h-5',
      thumb: 'w-4 h-4',
      translate: 'translate-x-4',
      translateOff: 'translate-x-0.5',
      iconSize: 'text-[9px]',
    },
    md: {
      track: 'w-12 h-6.5',
      thumb: 'w-5 h-5',
      translate: 'translate-x-6',
      translateOff: 'translate-x-0.5',
      iconSize: 'text-[11px]',
    },
    lg: {
      track: 'w-14 h-8',
      thumb: 'w-6.5 h-6.5',
      translate: 'translate-x-6.5',
      translateOff: 'translate-x-0.5',
      iconSize: 'text-[13px]',
    },
  }[size];

  const colorConfig = {
    orange: {
      trackOn: 'bg-gradient-to-r from-orange-500 to-amber-500 shadow-[0_0_14px_rgba(249,115,22,0.45)] border-orange-400/50',
      thumbOn: 'text-orange-600',
    },
    blue: {
      trackOn: 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_0_14px_rgba(37,99,235,0.45)] border-blue-400/50',
      thumbOn: 'text-blue-600',
    },
    emerald: {
      trackOn: 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_14px_rgba(16,185,129,0.45)] border-emerald-400/50',
      thumbOn: 'text-emerald-600',
    },
    purple: {
      trackOn: 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-[0_0_14px_rgba(147,51,234,0.45)] border-purple-400/50',
      thumbOn: 'text-purple-600',
    },
  }[activeColor];

  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div
      onClick={handleToggle}
      className={`inline-flex items-center gap-3 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'
      } ${className}`}
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleToggle();
        }
      }}
    >
      {/* Switch Track */}
      <div
        className={`relative inline-flex items-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] p-0.5 flex-shrink-0 ${
          sizeConfig.track
        } ${
          checked
            ? colorConfig.trackOn
            : 'bg-slate-200 dark:bg-[#1a1d2b] border border-slate-300/80 dark:border-[#2a2f40] hover:bg-slate-300/80 dark:hover:bg-[#222738]'
        }`}
      >
        {/* Animated Sliding Thumb with spring physics */}
        <div
          className={`flex items-center justify-center rounded-full bg-white dark:bg-[#0c0d12] shadow-md transform transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active:scale-95 ${
            sizeConfig.thumb
          } ${checked ? sizeConfig.translate : sizeConfig.translateOff}`}
        >
          {checked ? (
            iconOn ? (
              <span className={`transition-transform duration-300 rotate-0 scale-100 ${colorConfig.thumbOn} ${sizeConfig.iconSize}`}>
                {iconOn}
              </span>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 dark:bg-orange-400 animate-pulse" />
            )
          ) : iconOff ? (
            <span className={`transition-transform duration-300 rotate-0 scale-100 text-slate-400 dark:text-slate-500 ${sizeConfig.iconSize}`}>
              {iconOff}
            </span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
          )}
        </div>
      </div>

      {/* Optional Label and Description */}
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
