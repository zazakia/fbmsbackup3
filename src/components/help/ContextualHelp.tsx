import React, { useState } from 'react';
import { HelpCircle, X, Info, Lightbulb, AlertCircle, CheckCircle } from 'lucide-react';

interface ContextualHelpProps {
  content: string;
  title?: string;
  type?: 'info' | 'tip' | 'warning' | 'success';
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click';
  className?: string;
}

const ContextualHelp: React.FC<ContextualHelpProps> = ({
  content,
  title,
  type = 'info',
  placement = 'top',
  trigger = 'hover',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const getIcon = () => {
    switch (type) {
      case 'tip':
        return <Lightbulb className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'tip':
        return {
          trigger: 'text-yellow-600 hover:text-yellow-800',
          tooltip: 'bg-yellow-50 border-yellow-200 text-yellow-900',
          arrow: 'border-yellow-200'
        };
      case 'warning':
        return {
          trigger: 'text-orange-600 hover:text-orange-800',
          tooltip: 'bg-orange-50 border-orange-200 text-orange-900',
          arrow: 'border-orange-200'
        };
      case 'success':
        return {
          trigger: 'text-green-600 hover:text-green-800',
          tooltip: 'bg-green-50 border-green-200 text-green-900',
          arrow: 'border-green-200'
        };
      default:
        return {
          trigger: 'text-blue-600 hover:text-blue-800',
          tooltip: 'bg-blue-50 border-blue-200 text-blue-900',
          arrow: 'border-blue-200'
        };
    }
  };

  const getPlacementClasses = () => {
    switch (placement) {
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default: // top
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    const colors = getColorClasses();
    switch (placement) {
      case 'bottom':
        return `absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 bg-white border-t border-l ${colors.arrow}`;
      case 'left':
        return `absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 rotate-45 bg-white border-t border-r ${colors.arrow}`;
      case 'right':
        return `absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 rotate-45 bg-white border-b border-l ${colors.arrow}`;
      default: // top
        return `absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 bg-white border-b border-r ${colors.arrow}`;
    }
  };

  const colors = getColorClasses();

  const handleTrigger = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        className={`${colors.trigger} transition-colors cursor-help`}
        onClick={handleTrigger}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        aria-label={title || "Help information"}
      >
        {getIcon()}
      </button>
      
      {isVisible && (
        <div className={`absolute z-50 w-64 ${getPlacementClasses()}`}>
          <div className={`relative px-3 py-2 rounded-lg border shadow-lg ${colors.tooltip}`}>
            <div className={getArrowClasses()} />
            
            {trigger === 'click' && (
              <button
                onClick={() => setIsVisible(false)}
                className="absolute top-1 right-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            
            {title && (
              <h4 className="font-semibold text-sm mb-1 pr-4">
                {title}
              </h4>
            )}
            
            <p className="text-xs leading-relaxed">
              {content}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextualHelp;