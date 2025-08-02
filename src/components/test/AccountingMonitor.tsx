import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calculator,
  Scale,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import type { JournalEntry, Account } from '../../types/business';

interface AccountBalance {
  accountId: string;
  accountName: string;
  accountCode: string;
  accountType: string;
  balance: number;
  previousBalance: number;
  change: number;
}

interface AccountingMonitorProps {
  highlightChanges?: boolean;
  compact?: boolean;
}

const AccountingMonitor: React.FC<AccountingMonitorProps> = ({ 
  highlightChanges = true, 
  compact = false 
}) => {
  const { journalEntries, accounts } = useBusinessStore();
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [previousJournalCount, setPreviousJournalCount] = useState(0);

  // Calculate account balances
  const calculateAccountBalances = () => {
    const balances: { [accountId: string]: number } = {};
    const previousBalances: { [accountId: string]: number } = {};

    // Initialize with zero balances
    accounts.forEach(account => {
      balances[account.id] = 0;
      previousBalances[account.id] = 0;
    });

    // Calculate balances from journal entries
    journalEntries.forEach((entry, index) => {
      entry.lines.forEach(line => {
        const account = accounts.find(a => a.id === line.accountId);
        if (account) {
          // For assets, debits increase balance; for liabilities/equity, credits increase
          const isDebitAccount = ['Asset', 'Expense'].includes(account.type);
          const balanceChange = isDebitAccount 
            ? (line.debit - line.credit)
            : (line.credit - line.debit);
          
          balances[account.id] += balanceChange;
          
          // Calculate previous balance (exclude latest entries for comparison)
          if (index < previousJournalCount) {
            previousBalances[account.id] += balanceChange;
          }
        }
      });
    });

    // Create balance objects
    const balanceArray: AccountBalance[] = accounts.map(account => ({
      accountId: account.id,
      accountName: account.name,
      accountCode: account.code,
      accountType: account.type,
      balance: balances[account.id] || 0,
      previousBalance: previousBalances[account.id] || 0,
      change: (balances[account.id] || 0) - (previousBalances[account.id] || 0)
    }));

    return balanceArray.filter(b => b.balance !== 0 || b.change !== 0);
  };

  // Monitor journal entries changes
  useEffect(() => {
    if (journalEntries.length > previousJournalCount) {
      const newEntries = journalEntries.slice(previousJournalCount);
      setRecentEntries(prev => [...newEntries, ...prev].slice(0, 10));
    }
    
    setAccountBalances(calculateAccountBalances());
    setPreviousJournalCount(journalEntries.length);
  }, [journalEntries, accounts]);

  const validateDoubleEntry = (entry: JournalEntry) => {
    const totalDebits = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = entry.lines.reduce((sum, line) => sum + line.credit, 0);
    return Math.abs(totalDebits - totalCredits) < 0.01;
  };

  const getTotalAssets = () => {
    return accountBalances
      .filter(b => b.accountType === 'Asset')
      .reduce((total, b) => total + b.balance, 0);
  };

  const getTotalLiabilities = () => {
    return accountBalances
      .filter(b => b.accountType === 'Liability')
      .reduce((total, b) => total + b.balance, 0);
  };

  const getTotalEquity = () => {
    return accountBalances
      .filter(b => b.accountType === 'Equity')
      .reduce((total, b) => total + b.balance, 0);
  };

  const getBalanceSheetEquation = () => {
    const assets = getTotalAssets();
    const liabilities = getTotalLiabilities();
    const equity = getTotalEquity();
    const isBalanced = Math.abs(assets - (liabilities + equity)) < 0.01;
    
    return { assets, liabilities, equity, isBalanced };
  };

  if (compact) {
    const equation = getBalanceSheetEquation();
    
    return (
      <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-green-500" />
            Accounting Status
          </h3>
          <div className="flex items-center space-x-2">
            {equation.isBalanced ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className={`text-xs ${equation.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
              {equation.isBalanced ? 'Balanced' : 'Unbalanced'}
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">Assets</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              ₱{equation.assets.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">Liabilities</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              ₱{equation.liabilities.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">Equity</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              ₱{equation.equity.toLocaleString()}
            </span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-gray-800 dark:text-gray-200">Journal Entries</span>
              <span className="text-gray-900 dark:text-gray-100">
                {journalEntries.length}
              </span>
            </div>
          </div>
        </div>

        {recentEntries.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Recent Entries
            </h4>
            <div className="space-y-1 max-h-24 overflow-auto">
              {recentEntries.slice(0, 3).map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-2 rounded text-xs ${
                    highlightChanges && index === 0 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                      : 'bg-gray-50 dark:bg-dark-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {validateDoubleEntry(entry) ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-gray-900 dark:text-gray-100 truncate max-w-20">
                      {entry.reference}
                    </span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">
                    ₱{entry.lines.reduce((sum, line) => sum + line.debit, 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const equation = getBalanceSheetEquation();

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
      <div className="p-4 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-green-500" />
            Accounting Monitor
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {equation.isBalanced ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span className={`text-sm ${equation.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                Balance Sheet {equation.isBalanced ? 'Balanced' : 'Unbalanced'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Balance Sheet Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Assets</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  ₱{equation.assets.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-red-600 dark:text-red-400">Total Liabilities</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-300">
                  ₱{equation.liabilities.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">Total Equity</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  ₱{equation.equity.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Accounting Equation */}
        <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-center space-x-4 text-lg">
            <span className="font-semibold text-blue-600">
              ₱{equation.assets.toLocaleString()}
            </span>
            <Scale className="h-5 w-5 text-gray-400" />
            <span className="font-semibold text-red-600">
              ₱{equation.liabilities.toLocaleString()}
            </span>
            <span className="text-gray-400">+</span>
            <span className="font-semibold text-green-600">
              ₱{equation.equity.toLocaleString()}
            </span>
            {equation.isBalanced ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-500" />
            )}
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
            Assets = Liabilities + Equity
          </p>
        </div>

        {/* Account Balances */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
            Account Balances
          </h3>
          <div className="max-h-64 overflow-auto">
            <div className="grid gap-2">
              {accountBalances.slice(0, 10).map(balance => (
                <div
                  key={balance.accountId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    balance.change !== 0 && highlightChanges
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-dark-700'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {balance.accountCode} - {balance.accountName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {balance.accountType}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      ₱{balance.balance.toLocaleString()}
                    </p>
                    {balance.change !== 0 && (
                      <p className={`text-sm ${balance.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {balance.change > 0 ? '+' : ''}₱{balance.change.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Journal Entries */}
        {recentEntries.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              Recent Journal Entries
            </h3>
            <div className="max-h-48 overflow-auto">
              <div className="space-y-3">
                {recentEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border ${
                      highlightChanges && index === 0 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                        : 'bg-gray-50 dark:bg-dark-700 border-gray-200 dark:border-dark-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {validateDoubleEntry(entry) ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {entry.reference}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {entry.description}
                    </p>
                    <div className="text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">Debits</p>
                          {entry.lines.filter(line => line.debit > 0).map((line, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400 truncate">
                                {line.accountName}
                              </span>
                              <span className="text-gray-900 dark:text-gray-100">
                                ₱{line.debit.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">Credits</p>
                          {entry.lines.filter(line => line.credit > 0).map((line, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400 truncate">
                                {line.accountName}
                              </span>
                              <span className="text-gray-900 dark:text-gray-100">
                                ₱{line.credit.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountingMonitor;