// Responsive utilities for mobile optimization

export const breakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const;

// Responsive grid classes
export const responsiveGrid = {
  singleColumn: 'grid grid-cols-1',
  twoColumn: 'grid grid-cols-1 md:grid-cols-2',
  threeColumn: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  fourColumn: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  autoFit: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
} as const;

// Responsive spacing classes
export const spacing = {
  mobile: {
    padding: 'p-4',
    margin: 'm-4',
    gap: 'gap-4'
  },
  tablet: {
    padding: 'md:p-6',
    margin: 'md:m-6',
    gap: 'md:gap-6'
  },
  desktop: {
    padding: 'lg:p-8',
    margin: 'lg:m-8',
    gap: 'lg:gap-8'
  }
} as const;

// Responsive text sizes
export const textSizes = {
  heading: {
    h1: 'text-2xl md:text-3xl lg:text-4xl',
    h2: 'text-xl md:text-2xl lg:text-3xl',
    h3: 'text-lg md:text-xl lg:text-2xl',
    h4: 'text-base md:text-lg lg:text-xl'
  },
  body: {
    large: 'text-base md:text-lg',
    normal: 'text-sm md:text-base',
    small: 'text-xs md:text-sm'
  }
} as const;

// Mobile-first responsive classes
export const mobileFirst = {
  hidden: {
    mobile: 'hidden sm:block',
    tablet: 'hidden md:block',
    desktop: 'hidden lg:block'
  },
  visible: {
    mobileOnly: 'block sm:hidden',
    tabletOnly: 'hidden sm:block md:hidden',
    desktopOnly: 'hidden lg:block'
  }
} as const;

// Touch-friendly button sizes
export const touchTarget = {
  small: 'min-h-[44px] min-w-[44px] p-2',
  medium: 'min-h-[48px] min-w-[48px] p-3',
  large: 'min-h-[56px] min-w-[56px] p-4'
} as const;

// Responsive container classes
export const containers = {
  full: 'w-full',
  constrained: 'w-full max-w-7xl mx-auto',
  narrow: 'w-full max-w-4xl mx-auto',
  wide: 'w-full max-w-6xl mx-auto'
} as const;

// Mobile navigation patterns
export const navigation = {
  mobile: {
    header: 'h-16 px-4 flex items-center justify-between',
    sidebar: 'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300',
    overlay: 'fixed inset-0 bg-black bg-opacity-50 z-40'
  },
  desktop: {
    header: 'h-16 lg:h-20 px-6 lg:px-8',
    sidebar: 'hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64'
  }
} as const;

// Form field responsive classes
export const formFields = {
  input: 'w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  textarea: 'w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none',
  select: 'w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  button: {
    primary: 'w-full sm:w-auto px-4 py-2 md:px-6 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors',
    secondary: 'w-full sm:w-auto px-4 py-2 md:px-6 md:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
  }
} as const;

// Card responsive classes
export const cards = {
  base: 'bg-white rounded-lg shadow-sm border border-gray-200',
  mobile: 'p-4 m-4',
  tablet: 'md:p-6 md:m-6',
  desktop: 'lg:p-8 lg:m-8',
  hover: 'hover:shadow-md transition-shadow duration-200'
} as const;

// Table responsive patterns
export const tables = {
  container: 'overflow-x-auto -mx-4 sm:mx-0',
  table: 'min-w-full divide-y divide-gray-200',
  header: 'bg-gray-50',
  headerCell: 'px-3 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
  bodyCell: 'px-3 py-4 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-900',
  mobileStack: 'block md:table-row border-b border-gray-200 md:border-none'
} as const;

// Utility function to combine responsive classes
export const combineResponsiveClasses = (...classes: string[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Check if device is mobile
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

// Check if device supports touch
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Get appropriate spacing based on screen size
export const getResponsiveSpacing = (size: 'small' | 'medium' | 'large' = 'medium'): string => {
  const spacingMap = {
    small: 'p-2 md:p-3 lg:p-4',
    medium: 'p-4 md:p-6 lg:p-8',
    large: 'p-6 md:p-8 lg:p-12'
  };
  
  return spacingMap[size];
};

// Get responsive grid columns based on item count
export const getResponsiveGrid = (itemCount: number): string => {
  if (itemCount === 1) return responsiveGrid.singleColumn;
  if (itemCount === 2) return responsiveGrid.twoColumn;
  if (itemCount === 3) return responsiveGrid.threeColumn;
  if (itemCount <= 4) return responsiveGrid.fourColumn;
  return responsiveGrid.autoFit;
};