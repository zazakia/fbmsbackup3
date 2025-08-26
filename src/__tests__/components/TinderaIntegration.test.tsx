import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MainMenuButtons from '../../components/dashboard/MainMenuButtons';
import TinderaStyleHeader from '../../components/dashboard/TinderaStyleHeader';

// Mock the useNavigation hook
vi.mock('../../contexts/NavigationContext', () => ({
  useNavigation: vi.fn(() => ({
    onModuleChange: vi.fn(),
    activeModule: 'dashboard'
  }))
}));

describe('MainMenuButtons Component', () => {
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all main menu buttons correctly', () => {
    render(<MainMenuButtons onNavigate={mockOnNavigate} />);

    // Check if header is present
    expect(screen.getByText('Quick Access Menu')).toBeInTheDocument();
    expect(screen.getByText('Access all business modules with one click')).toBeInTheDocument();

    // Check for some key buttons
    expect(screen.getByText('Sales & POS')).toBeInTheDocument();
    expect(screen.getByText('Tindera POS')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('displays 16 menu buttons in total', () => {
    render(<MainMenuButtons onNavigate={mockOnNavigate} />);

    // Count all buttons (excluding the header and stats)
    const menuButtons = screen.getAllByRole('button');
    expect(menuButtons).toHaveLength(16);
  });

  it('calls onNavigate when a button is clicked', () => {
    render(<MainMenuButtons onNavigate={mockOnNavigate} />);

    const posButton = screen.getByText('Tindera POS').closest('button');
    fireEvent.click(posButton!);

    expect(mockOnNavigate).toHaveBeenCalledWith('tindera-pos');
  });

  it('renders sales & POS button correctly', () => {
    render(<MainMenuButtons onNavigate={mockOnNavigate} />);

    const salesButton = screen.getByText('Sales & POS').closest('button');
    fireEvent.click(salesButton!);

    expect(mockOnNavigate).toHaveBeenCalledWith('sales');
  });

  it('renders inventory button correctly', () => {
    render(<MainMenuButtons onNavigate={mockOnNavigate} />);

    const inventoryButton = screen.getByText('Inventory').closest('button');
    fireEvent.click(inventoryButton!);

    expect(mockOnNavigate).toHaveBeenCalledWith('inventory');
  });

  it('renders customers button correctly', () => {
    render(<MainMenuButtons onNavigate={mockOnNavigate} />);

    const customersButton = screen.getByText('Customers').closest('button');
    fireEvent.click(customersButton!);

    expect(mockOnNavigate).toHaveBeenCalledWith('customers');
  });

  it('displays quick stats at the bottom', () => {
    render(<MainMenuButtons onNavigate={mockOnNavigate} />);

    // Check for stats
    expect(screen.getByText('₱156.7K')).toBeInTheDocument();
    expect(screen.getByText("Today's Sales")).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('89%')).toBeInTheDocument();
    expect(screen.getByText('Satisfaction')).toBeInTheDocument();
  });

  it('applies gradient styling to Tindera POS button', () => {
    render(<MainMenuButtons onNavigate={mockOnNavigate} />);

    const tinderaPosButton = screen.getByText('Tindera POS').closest('button');
    expect(tinderaPosButton).toHaveClass('bg-gradient-to-r', 'from-pink-500', 'to-purple-600');
  });

  it('applies purple styling to regular buttons', () => {
    render(<MainMenuButtons onNavigate={mockOnNavigate} />);

    const salesButton = screen.getByText('Sales & POS').closest('button');
    expect(salesButton).toHaveClass('bg-purple-100', 'text-purple-600');
  });

  it('has responsive grid layout', () => {
    render(<MainMenuButtons onNavigate={mockOnNavigate} />);

    const gridContainer = document.querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4');
  });
});

describe('TinderaStyleHeader Component', () => {
  it('renders with default props', () => {
    render(<TinderaStyleHeader />);

    expect(screen.getByText('FBMS Business')).toBeInTheDocument();
    expect(screen.getByText('Business Owner')).toBeInTheDocument();
    expect(screen.getByText('₱156,789.00')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('renders with custom props', () => {
    render(
      <TinderaStyleHeader
        userName="John Doe"
        balance="₱250,000.00"
        businessName="Custom Business"
      />
    );

    expect(screen.getByText('Custom Business')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('₱250,000.00')).toBeInTheDocument();
  });

  it('displays balance card with proper styling', () => {
    render(<TinderaStyleHeader />);

    const balanceCard = document.querySelector('.bg-gradient-to-r.from-purple-600.to-purple-700');
    expect(balanceCard).toBeInTheDocument();
    expect(balanceCard).toHaveClass('rounded-xl', 'p-6', 'text-white', 'shadow-lg');
  });

  it('shows Your Balance label', () => {
    render(<TinderaStyleHeader />);

    expect(screen.getByText('Your Balance')).toBeInTheDocument();
  });

  it('displays Philippine flag and business features button', () => {
    render(<TinderaStyleHeader />);

    expect(screen.getByText('🇵🇭 Activate Business Features')).toBeInTheDocument();
  });

  it('renders business logo with gradient background', () => {
    render(<TinderaStyleHeader />);

    const logo = document.querySelector('.bg-gradient-to-r.from-purple-500.to-pink-500');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveClass('w-10', 'h-10', 'rounded-lg');
  });

  it('displays Eye icon for balance visibility', () => {
    render(<TinderaStyleHeader />);

    // Check for the Eye icon (via screen reader text or role)
    const eyeIcon = document.querySelector('svg');
    expect(eyeIcon).toBeInTheDocument();
  });

  it('has responsive design elements', () => {
    render(<TinderaStyleHeader />);

    const headerCard = document.querySelector('.bg-white.rounded-xl');
    expect(headerCard).toBeInTheDocument();
    expect(headerCard).toHaveClass('shadow-sm', 'border');
  });

  it('shows Powered by FBMS text', () => {
    render(<TinderaStyleHeader />);

    expect(screen.getByText('Powered by FBMS')).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  it('both components work together without conflicts', () => {
    const mockOnNavigate = vi.fn();
    
    render(
      <div>
        <TinderaStyleHeader />
        <MainMenuButtons onNavigate={mockOnNavigate} />
      </div>
    );

    // Both components should render
    expect(screen.getByText('FBMS Business')).toBeInTheDocument();
    expect(screen.getByText('Quick Access Menu')).toBeInTheDocument();

    // Navigation should work
    const posButton = screen.getByText('Tindera POS').closest('button');
    fireEvent.click(posButton!);
    expect(mockOnNavigate).toHaveBeenCalledWith('tindera-pos');
  });

  it('maintains consistent purple theme across components', () => {
    const mockOnNavigate = vi.fn();
    
    render(
      <div>
        <TinderaStyleHeader />
        <MainMenuButtons onNavigate={mockOnNavigate} />
      </div>
    );

    // Check for purple theme consistency
    const purpleElements = document.querySelectorAll('[class*="purple"]');
    expect(purpleElements.length).toBeGreaterThan(5);
  });
});