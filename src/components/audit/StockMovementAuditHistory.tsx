/**
 * Stock Movement Audit History Component
 * 
 * Displays comprehensive audit trail for inventory movements including
 * stock changes, reasons, references, and detailed tracking information.
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  Truck,
  RefreshCw,
  User,
  Calendar,
  Hash,
  FileText,
  Eye,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { StockMovement, Product } from '../../types/business';
import { getStockMovementHistoryWithAudit } from '../../api/stockMovementAuditAPI';
import { formatDate, formatCurrency } from '../../utils/formatters';

interface StockMovementAuditHistoryProps {
  productId: string;
  product?: Product;
  className?: string;
  limit?: number;
  showFilters?: boolean;
}

interface MovementWithAudit extends StockMovement {
  auditDetails?: {
    auditId: string;
    performedBy: string;
    performedByName?: string;
    batchNumber?: string;
    expiryDate?: Date;
    location?: string;
    unitCost?: number;
    totalCost?: number;
  } | null;
}

interface FilterState {
  type?: string;
  startDate?: string;
  endDate?: string;
  performedBy?: string;
  referenceType?: string;
}

export const StockMovementAuditHistory: React.FC<StockMovementAuditHistoryProps> = ({
  productId,
  product,
  className = '',
  limit = 50,
  showFilters = true
}) => {
  const [movements, setMovements] = useState<MovementWithAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [auditSummary, setAuditSummary] = useState<{
    totalMovements: number;
    auditedMovements: number;
    auditCoverage: string;
  } | null>(null);

  useEffect(() => {
    fetchMovementHistory();
  }, [productId, filters]);

  const fetchMovementHistory = async () => {
    try {
      setLoading(true);
      const result = await getStockMovementHistoryWithAudit(productId, {
        ...filters,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        limit
      });
      
      if (result.error) {
        setError(result.error.message || 'Failed to load movement history');
      } else {
        setMovements(result.data || []);
        setAuditSummary(result.auditSummary || null);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (movementId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(movementId)) {
      newExpanded.delete(movementId);
    } else {
      newExpanded.add(movementId);
    }
    setExpandedEntries(newExpanded);
  };

  const getMovementIcon = (movement: MovementWithAudit) => {
    const change = (movement as any).change || 0;
    const type = movement.type;

    if (change > 0) {
      switch (type) {
        case 'stock_in':
          return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
        case 'return':
          return <RotateCcw className="h-4 w-4 text-blue-600" />;
        default:
          return <TrendingUp className="h-4 w-4 text-green-600" />;
      }
    } else if (change < 0) {
      switch (type) {
        case 'stock_out':
          return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
        case 'transfer':
          return <Truck className="h-4 w-4 text-blue-600" />;
        default:
          return <TrendingDown className="h-4 w-4 text-red-600" />;
      }
    } else {
      return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementColor = (movement: MovementWithAudit) => {
    const change = (movement as any).change || 0;
    if (change > 0) return 'bg-green-50 text-green-800';
    if (change < 0) return 'bg-red-50 text-red-800';
    return 'bg-gray-50 text-gray-800';
  };

  const formatMovementType = (movement: MovementWithAudit) => {
    const change = (movement as any).change || 0;
    const type = movement.type;
    const absChange = Math.abs(change);

    if (change > 0) {
      switch (type) {
        case 'stock_in':
          return `Stock In (+${absChange})`;
        case 'return':
          return `Return (+${absChange})`;
        case 'adjustment':
          return `Adjustment (+${absChange})`;
        default:
          return `Increase (+${absChange})`;
      }
    } else if (change < 0) {
      switch (type) {
        case 'stock_out':
          return `Stock Out (-${absChange})`;
        case 'transfer':
          return `Transfer Out (-${absChange})`;
        case 'adjustment':
          return `Adjustment (-${absChange})`;
        default:
          return `Decrease (-${absChange})`;
      }
    } else {
      return 'No Change (0)';
    }
  };

  const applyFilters = () => {
    fetchMovementHistory();
    setShowFilterPanel(false);
  };

  const resetFilters = () => {
    setFilters({});
    setShowFilterPanel(false);
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-20 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <Package className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800 text-sm">Failed to load movement history: {error}</p>
        </div>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No stock movements found</p>
        {Object.keys(filters).length > 0 && (
          <button
            onClick={resetFilters}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Stock Movement History
            {product && (
              <span className="ml-2 text-sm text-gray-500">
                for {product.name}
              </span>
            )}
          </h3>
          
          <div className="flex items-center space-x-2">
            {showFilters && (
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md"
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </button>
            )}
            <button
              onClick={fetchMovementHistory}
              className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-700 border border-gray-300 rounded-md"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>

        {auditSummary && (
          <div className="mt-2 flex items-center text-sm text-gray-600">
            <span>
              {auditSummary.totalMovements} movements, {auditSummary.auditedMovements} audited 
              ({auditSummary.auditCoverage} coverage)
            </span>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value || undefined }))}
                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Types</option>
                <option value="stock_in">Stock In</option>
                <option value="stock_out">Stock Out</option>
                <option value="adjustment">Adjustment</option>
                <option value="transfer">Transfer</option>
                <option value="return">Return</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value || undefined }))}
                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value || undefined }))}
                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div className="flex items-end space-x-2">
              <button
                onClick={applyFilters}
                className="px-4 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Apply
              </button>
              <button
                onClick={resetFilters}
                className="px-4 py-1 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {movements.map((movement) => {
          const isExpanded = expandedEntries.has(movement.id);
          const hasAuditDetails = movement.auditDetails;
          const change = (movement as any).change || 0;

          return (
            <div key={movement.id} className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {getMovementIcon(movement)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMovementColor(movement)}`}>
                        {formatMovementType(movement)}
                      </span>
                      
                      <div className="text-sm text-gray-600">
                        Stock: {(movement as any).beforeQuantity || 0} → {(movement as any).afterQuantity || 0}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      {hasAuditDetails && (
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {hasAuditDetails.performedByName || hasAuditDetails.performedBy}
                        </div>
                      )}
                      <span>•</span>
                      <span>{formatDate(movement.createdAt)}</span>
                      {(hasAuditDetails || movement.notes) && (
                        <button
                          onClick={() => toggleExpanded(movement.id)}
                          className="ml-2 p-1 rounded hover:bg-gray-100"
                        >
                          {isExpanded ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {movement.reason}
                    </div>
                    
                    {movement.referenceId && (
                      <div className="flex items-center">
                        <Hash className="h-4 w-4 mr-1" />
                        {movement.referenceNumber || movement.referenceId}
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700 mb-2">Movement Details</p>
                          <div className="space-y-1 text-gray-600">
                            <div>Type: {movement.type}</div>
                            <div>Quantity Change: {change}</div>
                            <div>Before: {(movement as any).beforeQuantity || 0}</div>
                            <div>After: {(movement as any).afterQuantity || 0}</div>
                            {movement.notes && <div>Notes: {movement.notes}</div>}
                          </div>
                        </div>

                        {hasAuditDetails && (
                          <div>
                            <p className="font-medium text-gray-700 mb-2">Audit Details</p>
                            <div className="space-y-1 text-gray-600">
                              <div>Performed By: {hasAuditDetails.performedByName || hasAuditDetails.performedBy}</div>
                              {hasAuditDetails.unitCost && (
                                <div>Unit Cost: {formatCurrency(hasAuditDetails.unitCost)}</div>
                              )}
                              {hasAuditDetails.totalCost && (
                                <div>Total Value: {formatCurrency(hasAuditDetails.totalCost)}</div>
                              )}
                              {hasAuditDetails.batchNumber && (
                                <div>Batch: {hasAuditDetails.batchNumber}</div>
                              )}
                              {hasAuditDetails.location && (
                                <div>Location: {hasAuditDetails.location}</div>
                              )}
                              {hasAuditDetails.expiryDate && (
                                <div>Expiry: {formatDate(hasAuditDetails.expiryDate)}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            Showing {movements.length} movement{movements.length === 1 ? '' : 's'}
            {limit && movements.length === limit && ' (limited)'}
          </span>
          
          {auditSummary && (
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                {auditSummary.auditCoverage} audited
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};