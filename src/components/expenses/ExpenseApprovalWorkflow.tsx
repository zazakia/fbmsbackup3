import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  FileText,
  Eye,
  MessageSquare,
  Send,
  ArrowRight,
  Filter,
  Search,
  Download,
  Bell
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useToastStore } from '../../store/toastStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Expense, User as UserType } from '../../types/business';

interface ApprovalWorkflow {
  id: string;
  expenseId: string;
  currentStep: number;
  totalSteps: number;
  steps: ApprovalStep[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

interface ApprovalStep {
  id: string;
  stepNumber: number;
  approverRole: 'manager' | 'admin' | 'accountant';
  approverId?: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  comments?: string;
  approvedAt?: Date;
  requiredAmount?: number; // Minimum amount that requires this approval level
}

interface ExpenseWithWorkflow extends Expense {
  workflow?: ApprovalWorkflow;
  submittedBy: string;
  submittedByName: string;
}

const ExpenseApprovalWorkflow: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseWithWorkflow[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithWorkflow | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComments, setApprovalComments] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const { user } = useSupabaseAuthStore();
  const { addToast } = useToastStore();

  useEffect(() => {
    loadExpensesWithWorkflow();
  }, [filterStatus]);

  const loadExpensesWithWorkflow = () => {
    // Mock data for demonstration
    const mockExpenses: ExpenseWithWorkflow[] = [
      {
        id: 'exp-1',
        description: 'Office Supplies - Printer Paper and Ink',
        amount: 5500,
        category: 'Office Supplies',
        date: new Date('2024-01-15'),
        vendor: 'Office Depot Philippines',
        status: 'pending',
        receiptUrl: '/receipts/exp-1.pdf',
        submittedBy: 'emp-1',
        submittedByName: 'Juan Dela Cruz',
        createdAt: new Date('2024-01-15'),
        workflow: {
          id: 'wf-1',
          expenseId: 'exp-1',
          currentStep: 1,
          totalSteps: 2,
          status: 'pending',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
          steps: [
            {
              id: 'step-1',
              stepNumber: 1,
              approverRole: 'manager',
              status: 'pending',
              requiredAmount: 1000
            },
            {
              id: 'step-2',
              stepNumber: 2,
              approverRole: 'admin',
              status: 'pending',
              requiredAmount: 5000
            }
          ]
        }
      },
      {
        id: 'exp-2',
        description: 'Business Lunch with Client',
        amount: 2800,
        category: 'Meals & Entertainment',
        date: new Date('2024-01-14'),
        vendor: 'The Peninsula Manila',
        status: 'approved',
        receiptUrl: '/receipts/exp-2.pdf',
        submittedBy: 'emp-2',
        submittedByName: 'Maria Santos',
        createdAt: new Date('2024-01-14'),
        workflow: {
          id: 'wf-2',
          expenseId: 'exp-2',
          currentStep: 2,
          totalSteps: 2,
          status: 'approved',
          createdAt: new Date('2024-01-14'),
          updatedAt: new Date('2024-01-14'),
          steps: [
            {
              id: 'step-1',
              stepNumber: 1,
              approverRole: 'manager',
              approverId: 'mgr-1',
              approverName: 'Manager One',
              status: 'approved',
              comments: 'Approved - Valid business expense',
              approvedAt: new Date('2024-01-14'),
              requiredAmount: 1000
            },
            {
              id: 'step-2',
              stepNumber: 2,
              approverRole: 'admin',
              approverId: 'admin-1',
              approverName: 'Admin User',
              status: 'approved',
              comments: 'Final approval granted',
              approvedAt: new Date('2024-01-14'),
              requiredAmount: 2500
            }
          ]
        }
      },
      {
        id: 'exp-3',
        description: 'Software License Renewal - Microsoft Office',
        amount: 15000,
        category: 'Software & Licenses',
        date: new Date('2024-01-13'),
        vendor: 'Microsoft Philippines',
        status: 'rejected',
        receiptUrl: '/receipts/exp-3.pdf',
        submittedBy: 'emp-3',
        submittedByName: 'Jose Garcia',
        createdAt: new Date('2024-01-13'),
        workflow: {
          id: 'wf-3',
          expenseId: 'exp-3',
          currentStep: 1,
          totalSteps: 2,
          status: 'rejected',
          createdAt: new Date('2024-01-13'),
          updatedAt: new Date('2024-01-13'),
          steps: [
            {
              id: 'step-1',
              stepNumber: 1,
              approverRole: 'manager',
              approverId: 'mgr-1',
              approverName: 'Manager One',
              status: 'rejected',
              comments: 'Please provide more details about the license requirements and compare with alternatives',
              approvedAt: new Date('2024-01-13'),
              requiredAmount: 1000
            },
            {
              id: 'step-2',
              stepNumber: 2,
              approverRole: 'admin',
              status: 'pending',
              requiredAmount: 10000
            }
          ]
        }
      }
    ];

    const filtered = mockExpenses.filter(expense => {
      const matchesStatus = filterStatus === 'all' || expense.workflow?.status === filterStatus;
      const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           expense.submittedByName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });

    setExpenses(filtered);
  };

  const canApprove = (expense: ExpenseWithWorkflow): boolean => {
    if (!user || !expense.workflow) return false;
    
    const currentStep = expense.workflow.steps[expense.workflow.currentStep - 1];
    if (!currentStep || currentStep.status !== 'pending') return false;

    // Check if user has the required role for current step
    return user.role === currentStep.approverRole;
  };

  const handleApprovalAction = async (expense: ExpenseWithWorkflow, action: 'approve' | 'reject', comments: string) => {
    if (!expense.workflow) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedExpense = { ...expense };
      const currentStep = updatedExpense.workflow!.steps[updatedExpense.workflow!.currentStep - 1];
      
      // Update current step
      currentStep.status = action === 'approve' ? 'approved' : 'rejected';
      currentStep.approverId = user?.id;
      currentStep.approverName = `${user?.firstName} ${user?.lastName}`;
      currentStep.comments = comments;
      currentStep.approvedAt = new Date();

      if (action === 'approve') {
        // Move to next step or complete workflow
        if (updatedExpense.workflow!.currentStep < updatedExpense.workflow!.totalSteps) {
          updatedExpense.workflow!.currentStep += 1;
          updatedExpense.workflow!.status = 'pending';
        } else {
          updatedExpense.workflow!.status = 'approved';
          updatedExpense.status = 'approved';
        }
      } else {
        // Reject the entire workflow
        updatedExpense.workflow!.status = 'rejected';
        updatedExpense.status = 'rejected';
      }

      updatedExpense.workflow!.updatedAt = new Date();

      // Update the expenses list
      setExpenses(prev => prev.map(exp => exp.id === expense.id ? updatedExpense : exp));

      addToast({
        type: 'success',
        title: `Expense ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `Expense "${expense.description}" has been ${action}d`
      });

      setShowApprovalModal(false);
      setSelectedExpense(null);
      setApprovalComments('');

    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to process approval'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const pendingCount = expenses.filter(e => e.workflow?.status === 'pending').length;
  const approvedCount = expenses.filter(e => e.workflow?.status === 'approved').length;
  const rejectedCount = expenses.filter(e => e.workflow?.status === 'rejected').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Expense Approval Workflow</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Review and approve expense submissions</p>
        </div>
        <div className="flex items-center space-x-2">
          {pendingCount > 0 && (
            <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
              <Bell className="h-4 w-4" />
              <span>{pendingCount} pending</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Expense Submissions</h2>
          
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No expenses found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div key={expense.id} className="border border-gray-200 dark:border-dark-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(expense.workflow?.status || 'pending')}
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{expense.description}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(expense.workflow?.status || 'pending')}`}>
                          {expense.workflow?.status || 'pending'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatCurrency(expense.amount)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{expense.submittedByName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(expense.date)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FileText className="h-4 w-4" />
                          <span>{expense.category}</span>
                        </div>
                      </div>

                      {/* Workflow Progress */}
                      {expense.workflow && (
                        <div className="mt-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Step {expense.workflow.currentStep} of {expense.workflow.totalSteps}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {expense.workflow.steps.map((step, index) => (
                              <React.Fragment key={step.id}>
                                <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                                  step.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  step.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  step.status === 'pending' && index === expense.workflow.currentStep - 1 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {getStatusIcon(step.status)}
                                  <span className="capitalize">{step.approverRole}</span>
                                </div>
                                {index < expense.workflow.steps.length - 1 && (
                                  <ArrowRight className="h-3 w-3 text-gray-400" />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedExpense(expense);
                          setShowApprovalModal(true);
                        }}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {canApprove(expense) && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedExpense(expense);
                              setApprovalAction('approve');
                              setShowApprovalModal(true);
                            }}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedExpense(expense);
                              setApprovalAction('reject');
                              setShowApprovalModal(true);
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {approvalAction === 'approve' ? 'Approve' : 'Reject'} Expense
                </h2>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Expense Details */}
              <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{selectedExpense.description}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                    <span className="ml-2 font-medium">{formatCurrency(selectedExpense.amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="ml-2">{selectedExpense.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Submitted by:</span>
                    <span className="ml-2">{selectedExpense.submittedByName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="ml-2">{formatDate(selectedExpense.date)}</span>
                  </div>
                  {selectedExpense.vendor && (
                    <div className="col-span-2">
                      <span className="text-gray-600 dark:text-gray-400">Vendor:</span>
                      <span className="ml-2">{selectedExpense.vendor}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Comments {approvalAction === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder={approvalAction === 'approve' ? 'Optional comments...' : 'Please provide reason for rejection...'}
                  rows={4}
                  className="w-full border border-gray-300 dark:border-dark-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApprovalAction(selectedExpense, approvalAction, approvalComments)}
                  disabled={loading || (approvalAction === 'reject' && !approvalComments.trim())}
                  className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${
                    approvalAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {approvalAction === 'approve' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      <span>{approvalAction === 'approve' ? 'Approve' : 'Reject'} Expense</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseApprovalWorkflow;