import React from 'react';
import { useThemeStore } from '../store/themeStore';

const ThemeTest: React.FC = () => {
  const { theme } = useThemeStore();

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Theme Test - Current: {theme}
      </h2>
      
      {/* Test Primary Colors */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Primary Colors</h3>
        <div className="flex space-x-2">
          <div className="bg-primary-600 text-white p-3 rounded-lg">
            Primary 600
          </div>
          <div className="bg-primary-500 text-white p-3 rounded-lg">
            Primary 500
          </div>
          <div className="bg-primary-50 text-primary-700 p-3 rounded-lg border">
            Primary 50
          </div>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Buttons</h3>
        <div className="flex space-x-2">
          <button className="btn-primary">
            Primary Button
          </button>
          <button className="btn-secondary">
            Secondary Button
          </button>
        </div>
      </div>

      {/* Test Cards */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Cards</h3>
        <div className="card p-4">
          <p className="text-gray-700 dark:text-gray-200">This is a test card</p>
        </div>
      </div>

      {/* Test CSS Variables */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">CSS Variables Test</h3>
        <div 
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text))'
          }}
        >
          <p>Background: var(--color-surface)</p>
          <p>Border: var(--color-border)</p>
          <p>Text: var(--color-text)</p>
          <div 
            className="mt-2 p-2 rounded"
            style={{
              backgroundColor: 'rgb(var(--color-primary))',
              color: 'white'
            }}
          >
            Primary: var(--color-primary)
          </div>
          <div 
            className="mt-2 p-2 rounded"
            style={{
              backgroundColor: 'rgb(var(--color-accent))',
              color: 'white'
            }}
          >
            Accent: var(--color-accent)
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeTest;
