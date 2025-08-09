import React from 'react';
import { AlertCircle } from 'lucide-react';
import { formatSalesDate, formatDatePST } from '../../utils/formatters';

interface SafeDateDisplayProps {
  date: Date | string | null | undefined;
  format?: 'short' | 'long' | 'time' | 'relative';
  timezone?: 'local' | 'pst';
  showErrorIcon?: boolean;
  className?: string;
  fallbackText?: string;
}

const SafeDateDisplay: React.FC<SafeDateDisplayProps> = ({
  date,
  format = 'short',
  timezone = 'local',
  showErrorIcon = false,
  className = '',
  fallbackText = 'Date unavailable'
}) => {
  const formattedDate = timezone === 'pst' 
    ? formatDatePST(date, format === 'relative' ? 'short' : format)
    : formatSalesDate(date, format);
  
  const isInvalid = formattedDate.includes('unavailable') || 
                   formattedDate.includes('error') || 
                   formattedDate === 'Invalid Date';

  if (isInvalid) {
    return (
      <div className={`flex items-center space-x-1 text-red-500 ${className}`}>
        {showErrorIcon && <AlertCircle className="h-3 w-3" />}
        <span className="text-xs">{fallbackText}</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {formattedDate}
    </div>
  );
};

// Specialized components for different contexts
export const TableDateDisplay: React.FC<{ date: Date | string | null; showTime?: boolean }> = ({ 
  date, 
  showTime = false 
}) => (
  <div>
    <SafeDateDisplay 
      date={date} 
      format="short" 
      className="text-sm text-gray-900 dark:text-gray-100" 
    />
    {showTime && (
      <SafeDateDisplay 
        date={date} 
        format="time" 
        className="text-xs text-gray-500 dark:text-gray-400" 
      />
    )}
  </div>
);

export const DetailDateDisplay: React.FC<{ date: Date | string | null }> = ({ date }) => (
  <SafeDateDisplay 
    date={date} 
    format="long" 
    timezone="pst"
    showErrorIcon={true}
    className="text-sm text-gray-700 dark:text-gray-300" 
  />
);

export const RelativeDateDisplay: React.FC<{ date: Date | string | null }> = ({ date }) => (
  <SafeDateDisplay 
    date={date} 
    format="relative" 
    className="text-xs text-gray-500 dark:text-gray-400" 
  />
);

export const ExportDateDisplay: React.FC<{ date: Date | string | null }> = ({ date }) => {
  const formattedDate = formatSalesDate(date, 'short');
  const isInvalid = formattedDate.includes('unavailable') || 
                   formattedDate.includes('error') || 
                   formattedDate === 'Invalid Date';
  
  return isInvalid ? 'N/A' : formattedDate;
};

export default SafeDateDisplay;