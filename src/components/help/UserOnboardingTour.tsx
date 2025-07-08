import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  ArrowRight,
  Target,
  MousePointer,
  Eye,
  Lightbulb,
  Zap
} from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'scroll';
  category: 'basics' | 'pos' | 'inventory' | 'reports' | 'admin';
}

interface UserOnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  autoStart?: boolean;
}

const UserOnboardingTour: React.FC<UserOnboardingTourProps> = ({
  isOpen,
  onClose,
  autoStart = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoStart);
  const [selectedTour, setSelectedTour] = useState<string>('basics');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const tours = {
    basics: {
      title: 'Getting Started',
      description: 'Learn the basics of FBMS',
      icon: <Play className="h-5 w-5" />,
      color: 'blue',
      steps: [
        {
          id: 'dashboard',
          title: 'Welcome to FBMS',
          description: 'This is your main dashboard where you can see business overview and quick actions.',
          target: '.dashboard-container',
          position: 'bottom' as const,
          category: 'basics' as const
        },
        {
          id: 'navigation',
          title: 'Navigation Menu',
          description: 'Use the side menu to access different modules like POS, Inventory, and Reports.',
          target: '.sidebar-menu',
          position: 'right' as const,
          category: 'basics' as const
        },
        {
          id: 'user-profile',
          title: 'User Profile',
          description: 'Click here to manage your account settings and logout.',
          target: '.user-profile',
          position: 'bottom' as const,
          category: 'basics' as const
        },
        {
          id: 'notifications',
          title: 'Notifications',
          description: 'Stay updated with important alerts and system notifications.',
          target: '.notifications-bell',
          position: 'bottom' as const,
          category: 'basics' as const
        }
      ]
    },
    pos: {
      title: 'Point of Sale',
      description: 'Master the POS system',
      icon: <Target className="h-5 w-5" />,
      color: 'green',
      steps: [
        {
          id: 'pos-products',
          title: 'Product Selection',
          description: 'Browse and select products to add to the cart.',
          target: '.pos-products',
          position: 'left' as const,
          category: 'pos' as const
        },
        {
          id: 'pos-cart',
          title: 'Shopping Cart',
          description: 'Review selected items, quantities, and total amount.',
          target: '.pos-cart',
          position: 'left' as const,
          category: 'pos' as const
        },
        {
          id: 'pos-payment',
          title: 'Payment Options',
          description: 'Choose payment method and process the transaction.',
          target: '.pos-payment',
          position: 'top' as const,
          category: 'pos' as const
        },
        {
          id: 'pos-receipt',
          title: 'Receipt Generation',
          description: 'Print or email receipts to customers.',
          target: '.pos-receipt',
          position: 'top' as const,
          category: 'pos' as const
        }
      ]
    },
    inventory: {
      title: 'Inventory Management',
      description: 'Manage your stock efficiently',
      icon: <MousePointer className="h-5 w-5" />,
      color: 'purple',
      steps: [
        {
          id: 'inventory-list',
          title: 'Product List',
          description: 'View all your products with current stock levels.',
          target: '.inventory-list',
          position: 'top' as const,
          category: 'inventory' as const
        },
        {
          id: 'inventory-add',
          title: 'Add New Product',
          description: 'Click here to add new products to your inventory.',
          target: '.inventory-add-btn',
          position: 'bottom' as const,
          action: 'click' as const,
          category: 'inventory' as const
        },
        {
          id: 'inventory-alerts',
          title: 'Stock Alerts',
          description: 'Get notified when products are running low.',
          target: '.inventory-alerts',
          position: 'right' as const,
          category: 'inventory' as const
        }
      ]
    },
    reports: {
      title: 'Reports & Analytics',
      description: 'Generate insights and reports',
      icon: <Eye className="h-5 w-5" />,
      color: 'orange',
      steps: [
        {
          id: 'reports-dashboard',
          title: 'Reports Dashboard',
          description: 'Access various reports and analytics tools.',
          target: '.reports-dashboard',
          position: 'top' as const,
          category: 'reports' as const
        },
        {
          id: 'reports-sales',
          title: 'Sales Reports',
          description: 'Analyze sales performance and trends.',
          target: '.reports-sales',
          position: 'right' as const,
          category: 'reports' as const
        },
        {
          id: 'reports-bir',
          title: 'BIR Forms',
          description: 'Generate tax compliance reports for BIR.',
          target: '.reports-bir',
          position: 'left' as const,
          category: 'reports' as const
        }
      ]
    },
    admin: {
      title: 'Admin Features',
      description: 'Administrative functions',
      icon: <Zap className="h-5 w-5" />,
      color: 'red',
      steps: [
        {
          id: 'admin-users',
          title: 'User Management',
          description: 'Add and manage user accounts with different roles.',
          target: '.admin-users',
          position: 'right' as const,
          category: 'admin' as const
        },
        {
          id: 'admin-settings',
          title: 'System Settings',
          description: 'Configure business settings and preferences.',
          target: '.admin-settings',
          position: 'left' as const,
          category: 'admin' as const
        },
        {
          id: 'admin-backup',
          title: 'Data Backup',
          description: 'Backup and restore your business data.',
          target: '.admin-backup',
          position: 'top' as const,
          category: 'admin' as const
        }
      ]
    }
  };

  useEffect(() => {
    if (isPlaying && autoStart) {
      const interval = setInterval(() => {
        nextStep();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentStep, autoStart]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowRight':
          nextStep();
          break;
        case 'ArrowLeft':
          prevStep();
          break;
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentStep]);

  const getCurrentTour = () => tours[selectedTour as keyof typeof tours];
  const currentTourSteps = getCurrentTour().steps;
  const currentStepData = currentTourSteps[currentStep];

  const nextStep = () => {
    if (currentStep < currentTourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      markStepCompleted(currentStepData.id);
    } else {
      setIsPlaying(false);
      markStepCompleted(currentStepData.id);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const resetTour = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setCompletedSteps(new Set());
  };

  const markStepCompleted = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  const selectTour = (tourId: string) => {
    setSelectedTour(tourId);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const getTourProgress = () => {
    const completed = currentTourSteps.filter(step => completedSteps.has(step.id)).length;
    return Math.round((completed / currentTourSteps.length) * 100);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Tour Container */}
      <div className="fixed inset-4 bg-white rounded-lg shadow-xl z-50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Interactive Tour</h2>
              <p className="text-sm text-gray-600">Learn FBMS step by step</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tour Selection */}
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3">Choose a Tour</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(tours).map(([key, tour]) => (
              <button
                key={key}
                onClick={() => selectTour(key)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedTour === key
                    ? `border-${tour.color}-500 bg-${tour.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`text-${tour.color}-600`}>{tour.icon}</span>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">{tour.title}</h4>
                    <p className="text-sm text-gray-600">{tour.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tour Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Progress */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{getCurrentTour().title}</h4>
                <span className="text-sm text-gray-600">
                  {getTourProgress()}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`bg-${getCurrentTour().color}-500 h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${getTourProgress()}%` }}
                />
              </div>
            </div>

            {/* Current Step */}
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-${getCurrentTour().color}-100`}>
                    <span className={`text-sm font-semibold text-${getCurrentTour().color}-600`}>
                      {currentStep + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{currentStepData.title}</h3>
                    <p className="text-sm text-gray-600">
                      Step {currentStep + 1} of {currentTourSteps.length}
                    </p>
                  </div>
                </div>
                {completedSteps.has(currentStepData.id) && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
              <p className="text-gray-700 mb-4">{currentStepData.description}</p>
              
              {/* Step Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="flex items-center space-x-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={currentStep === currentTourSteps.length - 1}
                    className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={togglePlayPause}
                    className="p-2 text-gray-600 hover:text-gray-800"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={resetTour}
                    className="p-2 text-gray-600 hover:text-gray-800"
                    title="Reset Tour"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* All Steps Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Tour Steps</h4>
              <div className="space-y-2">
                {currentTourSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      index === currentStep
                        ? 'bg-white border-2 border-blue-500'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    onClick={() => setCurrentStep(index)}
                  >
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                      completedSteps.has(step.id)
                        ? 'bg-green-500 text-white'
                        : index === currentStep
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {completedSteps.has(step.id) ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`text-sm ${
                      index === currentStep ? 'font-semibold text-gray-900' : 'text-gray-700'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Use arrow keys to navigate • Space to pause/play</span>
            <span>Press ESC to close</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserOnboardingTour;