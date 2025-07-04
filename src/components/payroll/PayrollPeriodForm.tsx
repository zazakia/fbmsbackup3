import React, { useState, useEffect } from 'react';
import { PayrollPeriod } from '../../api/payrollPeriods';

interface PayrollPeriodFormProps {
  period?: PayrollPeriod;
  onSave: (period: Omit<PayrollPeriod, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const PayrollPeriodForm: React.FC<PayrollPeriodFormProps> = ({ period, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    month: 1,
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    status: 'Open' as const
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Month names for display
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Initialize form when editing
  useEffect(() => {
    if (period) {
      setFormData({
        month: period.month,
        year: period.year,
        startDate: period.startDate.toISOString().split('T')[0],
        endDate: period.endDate.toISOString().split('T')[0],
        status: period.status
      });
    }
  }, [period]);

  // Auto-calculate dates when month/year changes
  useEffect(() => {
    if (formData.month && formData.year) {
      const startDate = new Date(formData.year, formData.month - 1, 1);
      const endDate = new Date(formData.year, formData.month, 0);
      
      setFormData(prev => ({
        ...prev,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.month, formData.year]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'month' || name === 'year' ? parseInt(value) : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.month || formData.month < 1 || formData.month > 12) {
      newErrors.month = 'Please select a valid month';
    }

    if (!formData.year || formData.year < 2020 || formData.year > 2030) {
      newErrors.year = 'Please enter a valid year (2020-2030)';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave({
        month: formData.month,
        year: formData.year,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        status: formData.status
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {period ? 'Edit Payroll Period' : 'Create Payroll Period'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month *
              </label>
              <select
                name="month"
                value={formData.month}
                onChange={handleChange}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.month ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                {months.map((month, index) => (
                  <option key={index + 1} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
              {errors.month && <p className="text-red-500 text-xs mt-1">{errors.month}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year *
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                min="2020"
                max="2030"
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.year ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.status ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="Open">Open</option>
              <option value="Processing">Processing</option>
              <option value="Finalized">Finalized</option>
              <option value="Closed">Closed</option>
            </select>
            {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Period Summary</h4>
            <p className="text-sm text-blue-700">
              <strong>Period:</strong> {months[formData.month - 1]} {formData.year}
            </p>
            {formData.startDate && formData.endDate && (
              <p className="text-sm text-blue-700">
                <strong>Duration:</strong> {new Date(formData.startDate).toLocaleDateString()} - {new Date(formData.endDate).toLocaleDateString()}
              </p>
            )}
            <p className="text-sm text-blue-700">
              <strong>Status:</strong> {formData.status}
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              {period ? 'Update Period' : 'Create Period'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayrollPeriodForm;