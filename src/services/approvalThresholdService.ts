import { UserRole } from '../types/auth';
import { PurchaseOrder } from '../types/business';
import { ApprovalThreshold, ApprovalCondition } from '../types/purchaseOrderConfig';
import { purchaseOrderWorkflowConfigService } from './purchaseOrderWorkflowConfigService';

export interface ApprovalDecision {
  approved: boolean;
  approver: {
    userId: string;
    name: string;
    role: UserRole;
    email: string;
  };
  timestamp: Date;
  reason?: string;
  comments?: string;
  escalated: boolean;
}

export interface ApprovalRequest {
  id: string;
  purchaseOrderId: string;
  threshold: ApprovalThreshold;
  requiredApprovals: number;
  receivedApprovals: ApprovalDecision[];
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
  escalatedAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

export interface ApprovalEscalation {
  requestId: string;
  level: number;
  escalatedAt: Date;
  escalatedTo: UserRole[];
  reason: 'timeout' | 'manual' | 'business_rule';
  previousApprovers: string[];
}

export class ApprovalThresholdService {
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private approvalListeners: Set<(request: ApprovalRequest) => void> = new Set();

  constructor() {
    this.loadApprovalRequests();
  }

  /**
   * Create approval request for a purchase order
   */
  async createApprovalRequest(
    purchaseOrder: PurchaseOrder,
    initiator: { userId: string; name: string; role: UserRole }
  ): Promise<ApprovalRequest | null> {
    const threshold = purchaseOrderWorkflowConfigService.getApprovalThreshold(
      purchaseOrder.total,
      this.extractConditionValues(purchaseOrder)
    );

    if (!threshold) {
      // No approval threshold found - might be auto-approved or requires manual review
      return null;
    }

    const request: ApprovalRequest = {
      id: this.generateRequestId(),
      purchaseOrderId: purchaseOrder.id,
      threshold,
      requiredApprovals: threshold.requiredApprovers,
      receivedApprovals: [],
      status: 'pending',
      createdAt: new Date(),
      priority: threshold.priority,
      metadata: {
        initiator: initiator.userId,
        initiatorName: initiator.name,
        totalAmount: purchaseOrder.total,
        supplierName: purchaseOrder.supplierName,
        itemCount: purchaseOrder.items.length
      }
    };

    // Set expiration time if escalation is configured
    if (threshold.escalationTimeHours && threshold.escalationTimeHours > 0) {
      const expirationTime = new Date(request.createdAt);
      expirationTime.setHours(expirationTime.getHours() + threshold.escalationTimeHours);
      
      // Adjust for weekends and holidays if configured
      if (threshold.skipWeekends || threshold.skipHolidays) {
        request.expiresAt = this.adjustForBusinessDays(
          expirationTime,
          threshold.skipWeekends,
          threshold.skipHolidays
        );
      } else {
        request.expiresAt = expirationTime;
      }
    }

    this.approvalRequests.set(request.id, request);
    this.saveApprovalRequests();
    this.notifyApprovalListeners(request);

    return request;
  }

  /**
   * Submit approval decision
   */
  async submitApproval(
    requestId: string,
    decision: {
      approved: boolean;
      approver: {
        userId: string;
        name: string;
        role: UserRole;
        email: string;
      };
      reason?: string;
      comments?: string;
    }
  ): Promise<{ success: boolean; message: string; finalStatus?: string }> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      return { success: false, message: 'Approval request not found' };
    }

    if (request.status !== 'pending') {
      return { 
        success: false, 
        message: `Cannot approve request with status: ${request.status}` 
      };
    }

    // Check if approver has required role
    if (!request.threshold.requiredRoles.includes(decision.approver.role)) {
      return { 
        success: false, 
        message: 'Approver does not have required role for this threshold' 
      };
    }

    // Check if approver has already approved
    const existingApproval = request.receivedApprovals.find(
      approval => approval.approver.userId === decision.approver.userId
    );

    if (existingApproval) {
      return { 
        success: false, 
        message: 'Approver has already provided a decision for this request' 
      };
    }

    // Add the approval decision
    const approvalDecision: ApprovalDecision = {
      ...decision,
      timestamp: new Date(),
      escalated: false
    };

    request.receivedApprovals.push(approvalDecision);

    // Check if request is rejected
    if (!decision.approved) {
      request.status = 'rejected';
      this.saveApprovalRequests();
      this.notifyApprovalListeners(request);
      
      return { 
        success: true, 
        message: 'Purchase order rejected',
        finalStatus: 'rejected'
      };
    }

    // Check if we have enough approvals
    const approvedCount = request.receivedApprovals.filter(a => a.approved).length;
    
    if (approvedCount >= request.requiredApprovals) {
      request.status = 'approved';
      this.saveApprovalRequests();
      this.notifyApprovalListeners(request);
      
      return { 
        success: true, 
        message: 'Purchase order fully approved',
        finalStatus: 'approved'
      };
    }

    // Still need more approvals
    this.saveApprovalRequests();
    this.notifyApprovalListeners(request);

    const remainingApprovals = request.requiredApprovals - approvedCount;
    return { 
      success: true, 
      message: `Approval recorded. ${remainingApprovals} more approval(s) required.`
    };
  }

  /**
   * Get approval request by ID
   */
  getApprovalRequest(requestId: string): ApprovalRequest | null {
    return this.approvalRequests.get(requestId) || null;
  }

  /**
   * Get approval requests for a purchase order
   */
  getApprovalRequestsForPO(purchaseOrderId: string): ApprovalRequest[] {
    return Array.from(this.approvalRequests.values())
      .filter(request => request.purchaseOrderId === purchaseOrderId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get pending approval requests for a user role
   */
  getPendingApprovalsByRole(role: UserRole): ApprovalRequest[] {
    return Array.from(this.approvalRequests.values())
      .filter(request => 
        request.status === 'pending' &&
        request.threshold.requiredRoles.includes(role)
      )
      .sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority));
  }

  /**
   * Get overdue approval requests
   */
  getOverdueApprovals(): ApprovalRequest[] {
    const now = new Date();
    
    return Array.from(this.approvalRequests.values())
      .filter(request => 
        request.status === 'pending' &&
        request.expiresAt &&
        request.expiresAt < now
      )
      .sort((a, b) => (a.expiresAt?.getTime() || 0) - (b.expiresAt?.getTime() || 0));
  }

  /**
   * Process escalations for overdue approvals
   */
  async processEscalations(): Promise<ApprovalEscalation[]> {
    const overdueRequests = this.getOverdueApprovals();
    const escalations: ApprovalEscalation[] = [];

    for (const request of overdueRequests) {
      const escalation = await this.escalateApprovalRequest(request);
      if (escalation) {
        escalations.push(escalation);
      }
    }

    return escalations;
  }

  /**
   * Escalate an approval request
   */
  private async escalateApprovalRequest(request: ApprovalRequest): Promise<ApprovalEscalation | null> {
    const config = purchaseOrderWorkflowConfigService.getConfig();
    const escalationSettings = config.emailNotifications.escalationSettings;

    if (!escalationSettings.enabled) {
      return null;
    }

    // Find next escalation level
    const currentLevel = (request.escalatedAt ? 1 : 0) + 1;
    const escalationLevel = escalationSettings.levels.find(level => level.level === currentLevel);

    if (!escalationLevel) {
      // No more escalation levels - mark as expired
      request.status = 'expired';
      this.saveApprovalRequests();
      this.notifyApprovalListeners(request);
      return null;
    }

    // Create escalation
    const escalation: ApprovalEscalation = {
      requestId: request.id,
      level: currentLevel,
      escalatedAt: new Date(),
      escalatedTo: escalationLevel.recipients
        .filter(r => r.type === 'role')
        .map(r => r.value as UserRole),
      reason: 'timeout',
      previousApprovers: request.receivedApprovals.map(a => a.approver.userId)
    };

    // Update request
    request.status = 'escalated';
    request.escalatedAt = escalation.escalatedAt;
    request.priority = escalationLevel.priority;

    // Set new expiration time
    if (escalationLevel.afterHours > 0) {
      const newExpiration = new Date(escalation.escalatedAt);
      newExpiration.setHours(newExpiration.getHours() + escalationLevel.afterHours);
      request.expiresAt = newExpiration;
    }

    this.saveApprovalRequests();
    this.notifyApprovalListeners(request);

    return escalation;
  }

  /**
   * Get approval statistics
   */
  getApprovalStatistics(): {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    escalatedRequests: number;
    expiredRequests: number;
    averageApprovalTimeHours: number;
    approvalsByPriority: Record<string, number>;
    approvalsByThreshold: Record<string, number>;
  } {
    const requests = Array.from(this.approvalRequests.values());
    
    const approvedRequests = requests.filter(r => r.status === 'approved');
    const totalApprovalTime = approvedRequests.reduce((sum, request) => {
      if (request.receivedApprovals.length > 0) {
        const lastApproval = request.receivedApprovals[request.receivedApprovals.length - 1];
        return sum + (lastApproval.timestamp.getTime() - request.createdAt.getTime());
      }
      return sum;
    }, 0);

    const averageApprovalTimeHours = approvedRequests.length > 0 
      ? totalApprovalTime / (approvedRequests.length * 1000 * 60 * 60)
      : 0;

    const approvalsByPriority = requests.reduce((acc, request) => {
      acc[request.priority] = (acc[request.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const approvalsByThreshold = requests.reduce((acc, request) => {
      acc[request.threshold.name] = (acc[request.threshold.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRequests: requests.length,
      pendingRequests: requests.filter(r => r.status === 'pending').length,
      approvedRequests: requests.filter(r => r.status === 'approved').length,
      rejectedRequests: requests.filter(r => r.status === 'rejected').length,
      escalatedRequests: requests.filter(r => r.status === 'escalated').length,
      expiredRequests: requests.filter(r => r.status === 'expired').length,
      averageApprovalTimeHours,
      approvalsByPriority,
      approvalsByThreshold
    };
  }

  /**
   * Subscribe to approval request changes
   */
  subscribeToApprovals(callback: (request: ApprovalRequest) => void): () => void {
    this.approvalListeners.add(callback);
    return () => this.approvalListeners.delete(callback);
  }

  /**
   * Bulk approve requests (for authorized users)
   */
  async bulkApprove(
    requestIds: string[],
    approver: {
      userId: string;
      name: string;
      role: UserRole;
      email: string;
    },
    reason?: string
  ): Promise<{ successful: string[]; failed: { id: string; error: string }[] }> {
    const successful: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const requestId of requestIds) {
      try {
        const result = await this.submitApproval(requestId, {
          approved: true,
          approver,
          reason,
          comments: 'Bulk approval'
        });

        if (result.success) {
          successful.push(requestId);
        } else {
          failed.push({ id: requestId, error: result.message });
        }
      } catch (error) {
        failed.push({ 
          id: requestId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Clean up old completed requests
   */
  cleanupOldRequests(olderThanDays: number = 90): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const initialSize = this.approvalRequests.size;
    
    for (const [id, request] of this.approvalRequests.entries()) {
      if (
        ['approved', 'rejected', 'expired'].includes(request.status) &&
        request.createdAt < cutoffDate
      ) {
        this.approvalRequests.delete(id);
      }
    }

    const removedCount = initialSize - this.approvalRequests.size;
    if (removedCount > 0) {
      this.saveApprovalRequests();
    }

    return removedCount;
  }

  /**
   * Extract condition values from purchase order
   */
  private extractConditionValues(purchaseOrder: PurchaseOrder): Record<string, any> {
    return {
      supplierCategory: purchaseOrder.supplierCategory || '',
      productCategory: purchaseOrder.items[0]?.category || '',
      department: purchaseOrder.department || '',
      paymentTerms: purchaseOrder.paymentTerms || '',
      currency: purchaseOrder.currency || 'PHP'
    };
  }

  /**
   * Adjust date for business days (skip weekends and holidays)
   */
  private adjustForBusinessDays(date: Date, skipWeekends: boolean, skipHolidays: boolean): Date {
    let adjustedDate = new Date(date);

    if (skipWeekends) {
      // If it falls on weekend, move to next Monday
      const dayOfWeek = adjustedDate.getDay();
      if (dayOfWeek === 0) { // Sunday
        adjustedDate.setDate(adjustedDate.getDate() + 1);
      } else if (dayOfWeek === 6) { // Saturday
        adjustedDate.setDate(adjustedDate.getDate() + 2);
      }
    }

    // TODO: Add holiday checking logic here if needed
    // This would require a holidays configuration or service

    return adjustedDate;
  }

  /**
   * Get priority weight for sorting
   */
  private getPriorityWeight(priority: string): number {
    const weights = { urgent: 1, high: 2, medium: 3, low: 4 };
    return weights[priority as keyof typeof weights] || 5;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load approval requests from localStorage
   */
  private loadApprovalRequests(): void {
    try {
      const stored = localStorage.getItem('fbms-approval-requests');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [id, request] of Object.entries(data)) {
          // Convert date strings back to Date objects
          const typedRequest = request as any;
          typedRequest.createdAt = new Date(typedRequest.createdAt);
          if (typedRequest.expiresAt) {
            typedRequest.expiresAt = new Date(typedRequest.expiresAt);
          }
          if (typedRequest.escalatedAt) {
            typedRequest.escalatedAt = new Date(typedRequest.escalatedAt);
          }
          typedRequest.receivedApprovals.forEach((approval: any) => {
            approval.timestamp = new Date(approval.timestamp);
          });
          
          this.approvalRequests.set(id, typedRequest as ApprovalRequest);
        }
      }
    } catch (error) {
      console.error('Failed to load approval requests:', error);
    }
  }

  /**
   * Save approval requests to localStorage
   */
  private saveApprovalRequests(): void {
    try {
      const data = Object.fromEntries(this.approvalRequests);
      localStorage.setItem('fbms-approval-requests', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save approval requests:', error);
    }
  }

  /**
   * Notify approval listeners
   */
  private notifyApprovalListeners(request: ApprovalRequest): void {
    this.approvalListeners.forEach(listener => {
      try {
        listener(request);
      } catch (error) {
        console.error('Error in approval listener:', error);
      }
    });
  }
}

// Export singleton instance
export const approvalThresholdService = new ApprovalThresholdService();
export default approvalThresholdService;