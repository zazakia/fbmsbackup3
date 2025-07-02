import { supabase } from '../utils/supabase';
import { Account, JournalEntry, JournalEntryLine, AccountType } from '../types/business';

// CHART OF ACCOUNTS CRUD OPERATIONS

// CREATE account
export async function createAccount(account: Omit<Account, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('accounts')
    .insert([{
      code: account.code,
      name: account.name,
      type: account.type,
      description: account.description,
      is_active: account.isActive
    }])
    .select(`
      id,
      code,
      name,
      type,
      description,
      is_active,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        code: data.code,
        name: data.name,
        type: data.type,
        description: data.description,
        isActive: data.is_active,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// READ ALL accounts
export async function getAccounts() {
  const { data, error } = await supabase
    .from('accounts')
    .select(`
      id,
      code,
      name,
      type,
      description,
      is_active,
      created_at
    `)
    .order('code', { ascending: true });

  if (data) {
    const transformedData = data.map(account => ({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      description: account.description,
      isActive: account.is_active,
      createdAt: new Date(account.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ ONE account
export async function getAccount(id: string) {
  const { data, error } = await supabase
    .from('accounts')
    .select(`
      id,
      code,
      name,
      type,
      description,
      is_active,
      created_at
    `)
    .eq('id', id)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        code: data.code,
        name: data.name,
        type: data.type,
        description: data.description,
        isActive: data.is_active,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE account
export async function updateAccount(id: string, updates: Partial<Omit<Account, 'id' | 'createdAt'>>) {
  const updateData: Partial<{ code: string; name: string; type: AccountType; description: string; is_active: boolean }> = {};
  
  if (updates.code) updateData.code = updates.code;
  if (updates.name) updateData.name = updates.name;
  if (updates.type) updateData.type = updates.type;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('accounts')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      code,
      name,
      type,
      description,
      is_active,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        code: data.code,
        name: data.name,
        type: data.type,
        description: data.description,
        isActive: data.is_active,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// DELETE account
export async function deleteAccount(id: string) {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Get accounts by type
export async function getAccountsByType(type: AccountType) {
  const { data, error } = await supabase
    .from('accounts')
    .select(`
      id,
      code,
      name,
      type,
      description,
      is_active,
      created_at
    `)
    .eq('type', type)
    .eq('is_active', true)
    .order('code', { ascending: true });

  if (data) {
    const transformedData = data.map(account => ({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      description: account.description,
      isActive: account.is_active,
      createdAt: new Date(account.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Get active accounts
export async function getActiveAccounts() {
  const { data, error } = await supabase
    .from('accounts')
    .select(`
      id,
      code,
      name,
      type,
      description,
      is_active,
      created_at
    `)
    .eq('is_active', true)
    .order('code', { ascending: true });

  if (data) {
    const transformedData = data.map(account => ({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      description: account.description,
      isActive: account.is_active,
      createdAt: new Date(account.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// JOURNAL ENTRY CRUD OPERATIONS

// CREATE journal entry
export async function createJournalEntry(journalEntry: Omit<JournalEntry, 'id' | 'createdAt'>) {
  // Validate that debits equal credits
  const totalDebits = journalEntry.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredits = journalEntry.lines.reduce((sum, line) => sum + line.credit, 0);
  
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return { 
      data: null, 
      error: new Error('Journal entry is not balanced. Debits must equal credits.') 
    };
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .insert([{
      date: journalEntry.date.toISOString(),
      reference: journalEntry.reference,
      description: journalEntry.description,
      lines: journalEntry.lines,
      created_by: journalEntry.createdBy
    }])
    .select(`
      id,
      date,
      reference,
      description,
      lines,
      created_by,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        date: new Date(data.date),
        reference: data.reference,
        description: data.description,
        lines: data.lines,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// READ ALL journal entries
export async function getJournalEntries(limit?: number, offset?: number) {
  let query = supabase
    .from('journal_entries')
    .select(`
      id,
      date,
      reference,
      description,
      lines,
      created_by,
      created_at
    `)
    .order('date', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }
  if (offset) {
    query = query.range(offset, offset + (limit || 50) - 1);
  }

  const { data, error } = await query;

  if (data) {
    const transformedData = data.map(entry => ({
      id: entry.id,
      date: new Date(entry.date),
      reference: entry.reference,
      description: entry.description,
      lines: entry.lines,
      createdBy: entry.created_by,
      createdAt: new Date(entry.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ ONE journal entry
export async function getJournalEntry(id: string) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select(`
      id,
      date,
      reference,
      description,
      lines,
      created_by,
      created_at
    `)
    .eq('id', id)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        date: new Date(data.date),
        reference: data.reference,
        description: data.description,
        lines: data.lines,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE journal entry
export async function updateJournalEntry(id: string, updates: Partial<Omit<JournalEntry, 'id' | 'createdAt'>>) {
  const updateData: Partial<{ date: string; reference: string; description: string; lines: JournalEntryLine[] }> = {};
  
  if (updates.date) updateData.date = updates.date.toISOString();
  if (updates.reference !== undefined) updateData.reference = updates.reference;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.lines) {
    // Validate that debits equal credits
    const totalDebits = updates.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = updates.lines.reduce((sum, line) => sum + line.credit, 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return { 
        data: null, 
        error: new Error('Journal entry is not balanced. Debits must equal credits.') 
      };
    }
    
    updateData.lines = updates.lines;
  }
  if (updates.createdBy) updateData.created_by = updates.createdBy;

  const { data, error } = await supabase
    .from('journal_entries')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      date,
      reference,
      description,
      lines,
      created_by,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        date: new Date(data.date),
        reference: data.reference,
        description: data.description,
        lines: data.lines,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// DELETE journal entry
export async function deleteJournalEntry(id: string) {
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Get journal entries by date range
export async function getJournalEntriesByDateRange(startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select(`
      id,
      date,
      reference,
      description,
      lines,
      created_by,
      created_at
    `)
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString())
    .order('date', { ascending: false });

  if (data) {
    const transformedData = data.map(entry => ({
      id: entry.id,
      date: new Date(entry.date),
      reference: entry.reference,
      description: entry.description,
      lines: entry.lines,
      createdBy: entry.created_by,
      createdAt: new Date(entry.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Get journal entries by account
export async function getJournalEntriesByAccount(accountId: string) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select(`
      id,
      date,
      reference,
      description,
      lines,
      created_by,
      created_at
    `)
    .order('date', { ascending: false });

  if (data) {
    // Filter entries that contain the specified account
    const filteredData = data.filter(entry => 
      entry.lines.some((line: JournalEntryLine) => line.accountId === accountId)
    );

    const transformedData = filteredData.map(entry => ({
      id: entry.id,
      date: new Date(entry.date),
      reference: entry.reference,
      description: entry.description,
      lines: entry.lines,
      createdBy: entry.created_by,
      createdAt: new Date(entry.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Calculate account balance
export async function getAccountBalance(accountId: string, asOfDate?: Date) {
  let query = supabase
    .from('journal_entries')
    .select('lines, date');

  if (asOfDate) {
    query = query.lte('date', asOfDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error };
  }

  let balance = 0;
  
  if (data) {
    data.forEach(entry => {
      entry.lines.forEach((line: JournalEntryLine) => {
        if (line.accountId === accountId) {
          balance += (line.debit - line.credit);
        }
      });
    });
  }

  return { data: balance, error: null };
}

// Get trial balance
export async function getTrialBalance(asOfDate?: Date) {
  const { data: accounts, error: accountsError } = await getActiveAccounts();
  if (accountsError || !accounts) {
    return { data: null, error: accountsError };
  }

  const trialBalance = [];

  for (const account of accounts) {
    const { data: balance, error: balanceError } = await getAccountBalance(account.id, asOfDate);
    if (balanceError) {
      return { data: null, error: balanceError };
    }

    const debitBalance = balance && balance > 0 ? balance : 0;
    const creditBalance = balance && balance < 0 ? Math.abs(balance) : 0;

    trialBalance.push({
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      debitBalance,
      creditBalance
    });
  }

  const totalDebits = trialBalance.reduce((sum, item) => sum + item.debitBalance, 0);
  const totalCredits = trialBalance.reduce((sum, item) => sum + item.creditBalance, 0);

  return {
    data: {
      accounts: trialBalance,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      asOfDate: asOfDate || new Date()
    },
    error: null
  };
}

// Get general ledger for an account
export async function getGeneralLedger(accountId: string, startDate?: Date, endDate?: Date) {
  let query = supabase
    .from('journal_entries')
    .select(`
      id,
      date,
      reference,
      description,
      lines,
      created_by,
      created_at
    `)
    .order('date', { ascending: true });

  if (startDate) {
    query = query.gte('date', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('date', endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error };
  }

  const ledgerEntries = [];
  let runningBalance = 0;

  if (data) {
    data.forEach(entry => {
      const relevantLines = entry.lines.filter((line: JournalEntryLine) => line.accountId === accountId);
      
      relevantLines.forEach((line: JournalEntryLine) => {
        const debit = line.debit || 0;
        const credit = line.credit || 0;
        runningBalance += (debit - credit);

        ledgerEntries.push({
          entryId: entry.id,
          date: new Date(entry.date),
          reference: entry.reference,
          description: entry.description || line.description,
          debit,
          credit,
          balance: runningBalance
        });
      });
    });
  }

  return { data: ledgerEntries, error: null };
}

// Generate income statement
export async function getIncomeStatement(startDate: Date, endDate: Date) {
  const { data: accounts, error: accountsError } = await getActiveAccounts();
  if (accountsError || !accounts) {
    return { data: null, error: accountsError };
  }

  const incomeAccounts = accounts.filter(account => account.type === 'Income');
  const expenseAccounts = accounts.filter(account => account.type === 'Expense');

  const income = [];
  const expenses = [];

  // Get income totals
  for (const account of incomeAccounts) {
    const { data: entries } = await getJournalEntriesByAccount(account.id);
    if (entries) {
      const filteredEntries = entries.filter(entry => 
        entry.date >= startDate && entry.date <= endDate
      );
      
      let total = 0;
      filteredEntries.forEach(entry => {
        entry.lines.forEach(line => {
          if (line.accountId === account.id) {
            total += (line.credit - line.debit); // Income is typically credited
          }
        });
      });

      income.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        amount: total
      });
    }
  }

  // Get expense totals
  for (const account of expenseAccounts) {
    const { data: entries } = await getJournalEntriesByAccount(account.id);
    if (entries) {
      const filteredEntries = entries.filter(entry => 
        entry.date >= startDate && entry.date <= endDate
      );
      
      let total = 0;
      filteredEntries.forEach(entry => {
        entry.lines.forEach(line => {
          if (line.accountId === account.id) {
            total += (line.debit - line.credit); // Expenses are typically debited
          }
        });
      });

      expenses.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        amount: total
      });
    }
  }

  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  return {
    data: {
      period: { startDate, endDate },
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netIncome
    },
    error: null
  };
}

// Generate balance sheet
export async function getBalanceSheet(asOfDate: Date) {
  const { data: accounts, error: accountsError } = await getActiveAccounts();
  if (accountsError || !accounts) {
    return { data: null, error: accountsError };
  }

  const assets = [];
  const liabilities = [];
  const equity = [];

  for (const account of accounts) {
    const { data: balance } = await getAccountBalance(account.id, asOfDate);
    
    if (balance !== null && balance !== 0) {
      const accountData = {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        amount: Math.abs(balance)
      };

      switch (account.type) {
        case 'Asset':
          assets.push(accountData);
          break;
        case 'Liability':
          liabilities.push(accountData);
          break;
        case 'Equity':
          equity.push(accountData);
          break;
      }
    }
  }

  const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, item) => sum + item.amount, 0);
  const totalEquity = equity.reduce((sum, item) => sum + item.amount, 0);

  return {
    data: {
      asOfDate,
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
    },
    error: null
  };
}