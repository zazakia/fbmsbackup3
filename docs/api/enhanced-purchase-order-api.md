# Enhanced Purchase Order API Documentation

## Overview

The Enhanced Purchase Order API provides comprehensive functionality for managing purchase orders with improved workflow capabilities, including status transitions, partial receiving, and approval processes. This API supports the complete purchase order lifecycle from creation to closure with full audit trail tracking.

## Base URL

All API endpoints are relative to the base application URL.

## Authentication

All endpoints require authentication. Include the user's authentication token in the request headers:

```
Authorization: Bearer <token>
```

## Error Handling

All endpoints return a consistent error format:

```json
{
  "data": null,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

---

## Status Transition Management

### Get Valid Status Transitions

Get the list of valid status transitions for a purchase order.

**Endpoint:** `GET /api/purchase-orders/{id}/valid-transitions`

**Parameters:**
- `id` (string, required) - Purchase order ID

**Response:**
```json
{
  "data": {
    "isValid": true,
    "canTransition": true,
    "validTransitions": ["pending_approval", "cancelled"]
  },
  "error": null
}
```

**Example Request:**
```javascript
const response = await getValidStatusTransitions('po-123');
```

### Execute Status Transition

Execute a status transition for a purchase order.

**Endpoint:** `POST /api/purchase-orders/{id}/transitions`

**Request Body:**
```json
{
  "purchaseOrderId": "po-123",
  "fromStatus": "draft",
  "toStatus": "pending_approval",
  "reason": "Ready for approval",
  "performedBy": "user-456"
}
```

**Response:**
```json
{
  "data": {
    "id": "po-123",
    "poNumber": "PO-2024-001",
    "status": "pending_approval",
    "supplierName": "Acme Supplies",
    "total": 1500.00,
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

**Example Request:**
```javascript
const result = await executeStatusTransition({
  purchaseOrderId: 'po-123',
  fromStatus: 'draft',
  toStatus: 'pending_approval',
  reason: 'Submitted for manager review'
});
```

### Get Purchase Orders by Enhanced Status

Retrieve purchase orders filtered by enhanced status.

**Endpoint:** `GET /api/purchase-orders/by-status/{status}`

**Parameters:**
- `status` (string, required) - Enhanced status: `draft`, `pending_approval`, `approved`, `sent_to_supplier`, `partially_received`, `fully_received`, `cancelled`, `closed`

**Query Parameters:**
- `limit` (number, optional) - Maximum number of results (default: 50)
- `offset` (number, optional) - Offset for pagination (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "po-123",
      "poNumber": "PO-2024-001",
      "supplierName": "Acme Supplies",
      "status": "pending_approval",
      "total": 1500.00,
      "createdAt": "2024-01-15T09:00:00Z",
      "expectedDate": "2024-01-22T00:00:00Z"
    }
  ],
  "error": null
}
```

### Get Purchase Order Status History

Retrieve the complete status history for a purchase order.

**Endpoint:** `GET /api/purchase-orders/{id}/status-history`

**Response:**
```json
{
  "data": [
    {
      "id": "transition-1",
      "fromStatus": "draft",
      "toStatus": "pending_approval",
      "timestamp": "2024-01-15T10:30:00Z",
      "performedBy": "user-456",
      "reason": "Submitted for approval",
      "metadata": {
        "transitionType": "status_change"
      }
    }
  ],
  "error": null
}
```

---

## Receiving API Endpoints

### Validate Partial Receipt

Validate partial receipt data before processing.

**Endpoint:** `POST /api/purchase-orders/{id}/validate-receipt`

**Request Body:**
```json
{
  "purchaseOrderId": "po-123",
  "items": [
    {
      "productId": "prod-456",
      "productName": "Widget A",
      "sku": "WID-001",
      "orderedQuantity": 100,
      "receivedQuantity": 75,
      "condition": "good",
      "batchNumber": "BATCH-2024-001",
      "notes": "Good condition"
    }
  ],
  "receivedBy": "warehouse-user-789",
  "receivedDate": "2024-01-20T14:30:00Z",
  "notes": "Partial shipment received"
}
```

**Response:**
```json
{
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": [
      "Receiving less than full quantity for Widget A"
    ]
  },
  "error": null
}
```

### Process Partial Receipt

Process a partial receipt for a purchase order.

**Endpoint:** `POST /api/purchase-orders/{id}/receive`

**Request Body:**
```json
{
  "purchaseOrderId": "po-123",
  "items": [
    {
      "productId": "prod-456",
      "productName": "Widget A",
      "sku": "WID-001",
      "orderedQuantity": 100,
      "receivedQuantity": 75,
      "condition": "good",
      "batchNumber": "BATCH-2024-001",
      "expiryDate": "2025-01-20T00:00:00Z"
    }
  ],
  "receivedBy": "warehouse-user-789",
  "receivedDate": "2024-01-20T14:30:00Z",
  "notes": "Partial shipment - remaining 25 units expected next week",
  "attachments": ["receipt-photo-1.jpg", "packing-slip.pdf"]
}
```

**Response:**
```json
{
  "data": {
    "id": "po-123",
    "poNumber": "PO-2024-001",
    "status": "partially_received",
    "items": [
      {
        "productId": "prod-456",
        "productName": "Widget A",
        "quantity": 100,
        "receivedQuantity": 75,
        "remainingQuantity": 25
      }
    ],
    "updatedAt": "2024-01-20T14:30:00Z"
  },
  "error": null
}
```

**Example Request:**
```javascript
const result = await processPartialReceipt({
  purchaseOrderId: 'po-123',
  items: [{
    productId: 'prod-456',
    productName: 'Widget A',
    sku: 'WID-001',
    orderedQuantity: 100,
    receivedQuantity: 75,
    condition: 'good'
  }],
  receivedBy: 'warehouse-staff',
  notes: 'First partial shipment'
});
```

### Get Receiving History

Get the complete receiving history for a purchase order.

**Endpoint:** `GET /api/purchase-orders/{id}/receiving-history`

**Response:**
```json
{
  "data": [
    {
      "id": "receipt-1",
      "receivedDate": "2024-01-20T14:30:00Z",
      "receivedBy": "Warehouse Staff",
      "items": [
        {
          "productId": "prod-456",
          "productName": "Widget A",
          "receivedQuantity": 75,
          "condition": "good"
        }
      ],
      "notes": "Partial shipment received",
      "attachments": ["receipt-photo-1.jpg"]
    }
  ],
  "error": null
}
```

### Get Pending Receipts

Get purchase orders awaiting receipt.

**Endpoint:** `GET /api/purchase-orders/pending-receipts`

**Query Parameters:**
- `limit` (number, optional) - Maximum results (default: 50)
- `offset` (number, optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "po-123",
      "poNumber": "PO-2024-001",
      "supplierName": "Acme Supplies",
      "status": "sent_to_supplier",
      "total": 1500.00,
      "expectedDate": "2024-01-22T00:00:00Z",
      "daysPastDue": 0
    }
  ],
  "error": null
}
```

### Get Overdue Purchase Orders

Get purchase orders that are past their expected delivery date.

**Endpoint:** `GET /api/purchase-orders/overdue`

**Response:**
```json
{
  "data": [
    {
      "id": "po-124",
      "poNumber": "PO-2024-002",
      "supplierName": "Beta Corp",
      "status": "sent_to_supplier",
      "total": 2500.00,
      "expectedDate": "2024-01-15T00:00:00Z",
      "daysPastDue": 5,
      "urgencyLevel": "high"
    }
  ],
  "error": null
}
```

---

## Approval API Endpoints

### Validate Approval Permissions

Check if a user can approve a specific purchase order.

**Endpoint:** `POST /api/purchase-orders/{id}/validate-approval`

**Request Body:**
```json
{
  "purchaseOrderId": "po-123",
  "userId": "user-456",
  "userRole": "manager",
  "maxApprovalAmount": 50000
}
```

**Response:**
```json
{
  "data": {
    "canApprove": true,
    "errors": [],
    "warnings": [
      "High-value purchase order: 25000. Please review carefully."
    ],
    "requiredLevel": 2,
    "userLevel": 2
  },
  "error": null
}
```

### Approve/Reject Purchase Order

Process approval or rejection of a purchase order.

**Endpoint:** `POST /api/purchase-orders/{id}/approve`

**Request Body:**
```json
{
  "purchaseOrderId": "po-123",
  "action": "approve",
  "reason": "Budget approved, supplier verified, delivery timeline acceptable",
  "approvedBy": "manager-789",
  "approvalLevel": 2,
  "maxApprovalAmount": 50000
}
```

**Response:**
```json
{
  "data": {
    "id": "po-123",
    "poNumber": "PO-2024-001",
    "status": "approved",
    "approvedBy": "manager-789",
    "approvedAt": "2024-01-16T09:15:00Z",
    "total": 25000.00
  },
  "error": null
}
```

**Example Rejection:**
```javascript
const result = await approvePurchaseOrder({
  purchaseOrderId: 'po-123',
  action: 'reject',
  reason: 'Budget constraints - exceeds quarterly allocation',
  approvedBy: 'manager-789'
});
```

### Bulk Approval

Process multiple purchase orders in a single operation.

**Endpoint:** `POST /api/purchase-orders/bulk-approve`

**Request Body:**
```json
{
  "purchaseOrderIds": ["po-123", "po-124", "po-125"],
  "action": "approve",
  "reason": "Monthly batch approval - all requirements met",
  "approvedBy": "manager-789"
}
```

**Response:**
```json
{
  "data": {
    "successful": ["po-123", "po-124"],
    "failed": [
      {
        "id": "po-125",
        "error": "Exceeds approval limit for user"
      }
    ]
  },
  "error": null
}
```

### Get Pending Approvals

Get purchase orders awaiting approval.

**Endpoint:** `GET /api/purchase-orders/pending-approvals`

**Query Parameters:**
- `limit` (number, optional) - Maximum results (default: 50)
- `offset` (number, optional) - Pagination offset (default: 0)
- `minAmount` (number, optional) - Minimum order amount filter
- `maxAmount` (number, optional) - Maximum order amount filter

**Response:**
```json
{
  "data": [
    {
      "id": "po-126",
      "poNumber": "PO-2024-003",
      "supplierName": "Gamma Industries",
      "status": "pending_approval",
      "total": 15000.00,
      "createdBy": "purchaser-456",
      "createdAt": "2024-01-16T08:00:00Z",
      "requiredApprovalLevel": 2,
      "priority": "normal"
    }
  ],
  "error": null
}
```

### Get Approval History

Get the complete approval history for a purchase order.

**Endpoint:** `GET /api/purchase-orders/{id}/approval-history`

**Response:**
```json
{
  "data": [
    {
      "id": "approval-1",
      "action": "approved",
      "performedBy": "manager-789",
      "performedByName": "John Smith",
      "timestamp": "2024-01-16T09:15:00Z",
      "reason": "Budget approved, supplier verified",
      "metadata": {
        "approvalLevel": 2,
        "originalStatus": "pending_approval",
        "newStatus": "approved"
      }
    }
  ],
  "error": null
}
```

### Get Approval Workflow Configuration

Get the current approval workflow configuration.

**Endpoint:** `GET /api/purchase-orders/approval-config`

**Response:**
```json
{
  "data": {
    "approvalLevels": [
      {
        "level": 1,
        "name": "Standard Approval",
        "minAmount": 0,
        "maxAmount": 10000,
        "requiredRoles": ["supervisor", "purchaser", "manager"]
      },
      {
        "level": 2,
        "name": "Manager Approval",
        "minAmount": 10001,
        "maxAmount": 50000,
        "requiredRoles": ["manager", "finance_manager"]
      },
      {
        "level": 3,
        "name": "Senior Approval",
        "minAmount": 50001,
        "maxAmount": null,
        "requiredRoles": ["admin", "owner"]
      }
    ],
    "escalationRules": [
      {
        "condition": "approval_timeout",
        "action": "escalate_to_next_level",
        "timeoutHours": 24
      }
    ]
  },
  "error": null
}
```

---

## Data Models

### Enhanced Purchase Order Status

```typescript
type EnhancedPurchaseOrderStatus = 
  | 'draft'              // Being created/edited
  | 'pending_approval'   // Awaiting approval
  | 'approved'           // Approved for ordering
  | 'sent_to_supplier'   // Sent to supplier
  | 'partially_received' // Some items received
  | 'fully_received'     // All items received
  | 'cancelled'          // Cancelled order
  | 'closed';            // Completed and closed
```

### Status Transition Rules

```javascript
const validTransitions = {
  'draft': ['pending_approval', 'cancelled'],
  'pending_approval': ['approved', 'draft', 'cancelled'],
  'approved': ['sent_to_supplier', 'partially_received', 'fully_received', 'cancelled'],
  'sent_to_supplier': ['partially_received', 'fully_received', 'cancelled'],
  'partially_received': ['fully_received', 'cancelled'],
  'fully_received': ['closed'],
  'cancelled': [],
  'closed': []
};
```

### Partial Receipt Item

```typescript
interface PartialReceiptItem {
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: number;
  receivedQuantity: number;
  condition: 'good' | 'damaged' | 'expired';
  batchNumber?: string;
  expiryDate?: Date;
  notes?: string;
}
```

### Approval Request

```typescript
interface ApprovalRequest {
  purchaseOrderId: string;
  action: 'approve' | 'reject';
  reason: string;
  approvedBy: string;
  approvalLevel?: number;
  maxApprovalAmount?: number;
}
```

---

## Usage Examples

### Complete Workflow Example

```javascript
// 1. Create purchase order
const createResult = await createPurchaseOrder({
  poNumber: 'PO-2024-001',
  supplierId: 'supplier-123',
  supplierName: 'Acme Supplies',
  items: [
    {
      productId: 'prod-456',
      productName: 'Widget A',
      sku: 'WID-001',
      quantity: 100,
      cost: 15.00,
      total: 1500.00
    }
  ],
  subtotal: 1500.00,
  tax: 180.00,
  total: 1680.00
});

// 2. Submit for approval
await executeStatusTransition({
  purchaseOrderId: createResult.data.id,
  fromStatus: 'draft',
  toStatus: 'pending_approval',
  reason: 'Ready for manager review'
});

// 3. Approve purchase order
await approvePurchaseOrder({
  purchaseOrderId: createResult.data.id,
  action: 'approve',
  reason: 'Budget approved, supplier verified',
  approvedBy: 'manager-789'
});

// 4. Process partial receipt
await processPartialReceipt({
  purchaseOrderId: createResult.data.id,
  items: [{
    productId: 'prod-456',
    productName: 'Widget A',
    sku: 'WID-001',
    orderedQuantity: 100,
    receivedQuantity: 75,
    condition: 'good'
  }],
  receivedBy: 'warehouse-staff',
  notes: 'First shipment - 75 units received'
});

// 5. Complete final receipt
await processPartialReceipt({
  purchaseOrderId: createResult.data.id,
  items: [{
    productId: 'prod-456',
    productName: 'Widget A',
    sku: 'WID-001',
    orderedQuantity: 100,
    receivedQuantity: 25,
    condition: 'good'
  }],
  receivedBy: 'warehouse-staff',
  notes: 'Final shipment - order complete'
});
```

### Error Handling Example

```javascript
try {
  const result = await processPartialReceipt({
    purchaseOrderId: 'po-123',
    items: [{
      productId: 'prod-456',
      receivedQuantity: 150, // More than ordered
      condition: 'good'
    }],
    receivedBy: 'user-789'
  });
  
  if (result.error) {
    console.error('Receipt processing failed:', result.error.message);
    // Handle validation errors
  }
} catch (error) {
  console.error('Network or system error:', error);
  // Handle system errors
}
```

### Pagination Example

```javascript
// Get paginated results
const page1 = await getPendingReceipts(20, 0);
const page2 = await getPendingReceipts(20, 20);

// Process all pages
let offset = 0;
const limit = 50;
let hasMore = true;

while (hasMore) {
  const result = await getPendingApprovals(limit, offset);
  
  if (result.data && result.data.length > 0) {
    // Process batch
    await processPendingApprovals(result.data);
    offset += limit;
    hasMore = result.data.length === limit;
  } else {
    hasMore = false;
  }
}
```

---

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Standard endpoints**: 100 requests per minute per user
- **Bulk operations**: 10 requests per minute per user
- **Approval operations**: 50 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

## Webhook Support

The API supports webhooks for real-time notifications:

### Available Events
- `purchase_order.created`
- `purchase_order.status_changed`
- `purchase_order.approved`
- `purchase_order.rejected`
- `purchase_order.received`
- `purchase_order.overdue`

### Webhook Payload Example
```json
{
  "event": "purchase_order.approved",
  "timestamp": "2024-01-16T09:15:00Z",
  "data": {
    "purchaseOrder": {
      "id": "po-123",
      "poNumber": "PO-2024-001",
      "status": "approved",
      "total": 1680.00
    },
    "approvedBy": {
      "id": "user-789",
      "name": "John Smith",
      "role": "manager"
    }
  }
}
```

## Security Considerations

### Authentication
- All endpoints require valid authentication tokens
- Tokens expire after 24 hours and must be refreshed
- Use HTTPS for all API communications

### Authorization
- Users can only access purchase orders they have permission to view
- Approval operations are restricted based on user roles and approval limits
- Audit logs track all sensitive operations

### Data Validation
- All input is validated and sanitized
- SQL injection and XSS protection is implemented
- File uploads are scanned for malware

## Migration Guide

### From Legacy API
If migrating from the legacy purchase order API:

1. **Status Mapping**: Legacy statuses map to enhanced statuses as follows:
   - `draft` → `draft`
   - `sent` → `sent_to_supplier`
   - `partial` → `partially_received`
   - `received` → `fully_received`
   - `cancelled` → `cancelled`

2. **New Required Fields**: Some endpoints now require additional fields:
   - `receivedBy` field is required for receipt operations
   - `reason` field is required for status transitions and approvals

3. **Response Format**: All responses now use consistent `{data, error}` format

4. **Breaking Changes**:
   - Batch operations now return detailed success/failure information
   - Validation errors include field-specific error messages
   - Date fields are now consistently ISO 8601 formatted

### Backwards Compatibility
Legacy endpoints remain available with deprecation warnings until version 3.0:
- `/api/legacy/purchase-orders/*` (deprecated)
- Use `X-API-Version: legacy` header for legacy behavior

---

## Support

For API support and questions:
- Documentation: [API Docs Portal](https://docs.example.com/api)
- Support Email: api-support@example.com
- Developer Forum: [Developer Community](https://community.example.com)
- Status Page: [API Status](https://status.example.com)