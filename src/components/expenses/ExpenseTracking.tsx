import React, { useState } from 'react';
import { Plus, Search, Filter, DollarSign, Receipt, AlertTriangle, TrendingDown, Calendar } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import ExpenseCategories from './ExpenseCategories';

const ExpenseTracking: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'categories'>('expenses');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const { expenses, expenseCategories } = useBusinessStore();

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesDate = dateFilter === 'all' || 
                       (dateFilter === 'this-month' && new Date(expense.date).getMonth() === new Date().getMonth()) ||
                       (dateFilter === 'this-week' && {
                         const weekAgo = new Date();
                         weekAgo.setDate(weekAgo.getDate() - 7);
                         return new Date(expense.date) >= weekAgo;
                       });
    return matchesSearch && matchesCategory && matchesDate;
  });

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const thisMonthExpenses = expenses.filter(expense => {
    const thisMonth = new Date().getMonth();
    const expenseMonth = new Date(expense.date).getMonth();
    return thisMonth === expenseMonth;
  }).reduce((sum, expense) => sum + expense.amount, 0);

  const pendingExpenses = expenses.filter(expense => expense.status === 'pending').length;
  const approvedExpenses = expenses.filter(expense => expense.status === 'approved').length;

  const handleEditExpense = (expenseId: string) => {
    setEditingExpense(expenseId);
    setShowExpenseForm(true);
  };

  const handleCloseExpenseForm = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Tracking</h1>
          <p className="text-gray-600 mt-1">Manage business expenses and track spending</p>
        </div>
        <button
          onClick={() => setShowExpenseForm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">₱{totalExpenses.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-orange-600">₱{thisMonthExpenses.toLocaleString()}</p>
            </div>
            <Calendar className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingExpenses}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{approvedExpenses}</p>
            </div>
            <Receipt className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'expenses'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Categories
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {expenseCategories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                </select>
              </div>

              {/* Expense List */}
              <ExpenseList 
                expenses={filteredExpenses} 
                onEdit={handleEditExpense}
              />
            </div>
          )}

          {activeTab === 'categories' && (
            <ExpenseCategories />
          )}
        </div>
      </div>

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <ExpenseForm
          expenseId={editingExpense}
          onClose={handleCloseExpenseForm}
        />
      )}
    </div>
  );
};

export default ExpenseTracking; 