import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Save, Calendar, FileText, Calculator } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { JournalEntryLine } from '../../types/business';

interface JournalEntryFormProps {
  entryId?: string;
  onClose: () => void;
}

const JournalEntryForm: React.FC<JournalEntryFormProps> = ({ entryId, onClose }) => {
  const { accounts, getJournalEntry, addJournalEntry, updateJournalEntry } = useBusinessStore();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    memo: ''
  });
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { accountId: '', debit: 0, credit: 0, description: '' },
    { accountId: '', debit: 0, credit: 0, description: '' }
  ]);
  const [errors, setErrors] = useState<string[]>([]);

  const isEditing = !!entryId;

  useEffect(() => {
    if (isEditing && entryId) {
      const entry = getJournalEntry(entryId);
      if (entry) {
        setFormData({
          date: new Date(entry.date).toISOString().split('T')[0],
          reference: entry.reference,
          description: entry.description,
          memo: entry.memo || ''
        });
        setLines(entry.lines);
      }
    }
  }, [entryId, isEditing, getJournalEntry]);

  const addLine = () => {
    setLines([...lines, { accountId: '', debit: 0, credit: 0, description: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof JournalEntryLine, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Auto-calculate the other field when one is entered
    if (field === 'debit' && value > 0) {
      newLines[index].credit = 0;
    } else if (field === 'credit' && value > 0) {
      newLines[index].debit = 0;
    }
    
    setLines(newLines);
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    // Check if at least 2 lines have accounts
    const linesWithAccounts = lines.filter(line => line.accountId);
    if (linesWithAccounts.length < 2) {
      newErrors.push('At least 2 account lines are required');
    }

    // Check if debits equal credits
    const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      newErrors.push(`Debits (${totalDebits.toFixed(2)}) must equal Credits (${totalCredits.toFixed(2)})`);
    }

    // Check if each line has either debit or credit
    lines.forEach((line, index) => {
      if (line.accountId && line.debit === 0 && line.credit === 0) {
        newErrors.push(`Line ${index + 1} must have either a debit or credit amount`);
      }
    });

    if (!formData.reference.trim()) {
      newErrors.push('Reference number is required');
    }

    if (!formData.description.trim()) {
      newErrors.push('Description is required');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const generateReference = () => {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `JE${year}${month}${day}${random}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const entryData = {
      date: new Date(formData.date),
      reference: formData.reference,
      description: formData.description,
      memo: formData.memo,
      lines: lines.filter(line => line.accountId)
    };

    if (isEditing && entryId) {
      updateJournalEntry(entryId, entryData);
    } else {
      addJournalEntry(entryData);
    }

    onClose();
  };

  const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Journal Entry' : 'New Journal Entry'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="JE20241201001"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, reference: generateReference() })}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Auto
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Purchase of office supplies"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Memo (Optional)
            </label>
            <textarea
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              placeholder="Additional notes or details..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Journal Entry Lines */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Journal Entry Lines</h3>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Line</span>
              </button>
            </div>

            <div className="space-y-4">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-center p-4 bg-gray-50 rounded-lg">
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account
                    </label>
                    <select
                      value={line.accountId}
                      onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts
                        .filter(account => account.isActive)
                        .sort((a, b) => a.code.localeCompare(b.code))
                        .map(account => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Debit
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.debit || ''}
                      onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credit
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.credit || ''}
                      onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Line description"
                    />
                  </div>

                  <div className="col-span-1">
                    {lines.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="mt-6 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Calculator className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-blue-900">Totals</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Total Debits:</span>
                <span className={`ml-2 text-lg font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  ₱{totalDebits.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Total Credits:</span>
                <span className={`ml-2 text-lg font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  ₱{totalCredits.toFixed(2)}
                </span>
              </div>
            </div>
            {isBalanced && totalDebits > 0 && (
              <div className="mt-2 text-sm text-green-600 font-medium">
                ✓ Entry is balanced
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{isEditing ? 'Update Entry' : 'Save Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JournalEntryForm; 