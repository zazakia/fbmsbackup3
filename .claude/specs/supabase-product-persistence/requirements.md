# Requirements Document: Supabase Product Persistence

## Introduction

This document outlines the requirements for ensuring that product management operations (adding new products and displaying products) work exclusively with Supabase persistence, removing any mock data dependencies and ensuring all data persists properly in the database. The FBMS (Filipino Business Management System) currently has a robust product management system with API layers and store management, but needs to be completely isolated from any mock data fallbacks to ensure data integrity and persistence.

The product management system includes product CRUD operations, category management, stock tracking, and inventory movements. This feature focuses specifically on making the core product operations (create and read) completely dependent on Supabase database persistence with no mock data alternatives.

## Requirements

### Requirement 1: Product Creation Database-Only Persistence

**User Story:** As a business user, I want to add new products that are immediately and exclusively saved to the Supabase database, so that my product data is permanently stored and accessible across all sessions and devices.

#### Acceptance Criteria

1. WHEN a user submits a new product form THEN the system SHALL create the product record exclusively in the Supabase products table
2. WHEN product creation succeeds THEN the system SHALL return the database-generated product ID and timestamps from Supabase
3. WHEN product creation fails due to database issues THEN the system SHALL display specific error messages and SHALL NOT fall back to any mock data storage
4. WHERE product data validation occurs THEN it SHALL be enforced both at the client level and database constraint level
5. WHEN a product is successfully created THEN the system SHALL log an initial stock movement record in the product_history table
6. WHILE creating products THEN the system SHALL use proper database transactions to ensure data consistency

### Requirement 2: Product Display Database-Only Retrieval

**User Story:** As a business user, I want to view all products that are loaded exclusively from the Supabase database, so that I see the most current and accurate product information without any mock data contamination.

#### Acceptance Criteria

1. WHEN the product list page loads THEN the system SHALL fetch all products exclusively from the Supabase products table
2. WHEN product data is retrieved THEN it SHALL include all necessary fields (id, name, description, sku, barcode, category, price, cost, stock, minStock, unit, isActive, createdAt, updatedAt)
3. WHEN database connection fails during product retrieval THEN the system SHALL display appropriate error messages and empty state without showing mock products
4. WHERE product filtering or searching occurs THEN all operations SHALL be performed against the live Supabase database
5. WHEN products are displayed THEN the system SHALL show real-time stock levels and accurate pricing from the database
6. WHILE loading product data THEN the system SHALL display proper loading states and handle pagination if necessary

### Requirement 3: Product Store State Management

**User Story:** As a developer, I want the business store to manage product state exclusively through Supabase operations, so that all product data in the application state reflects the true database state.

#### Acceptance Criteria

1. WHEN the business store initializes THEN it SHALL only populate product state through the fetchProducts API call to Supabase
2. WHEN addProduct is called THEN it SHALL exclusively use the createProduct API and update local state only upon successful database insertion
3. WHEN product state is updated THEN it SHALL immediately reflect the response data from Supabase including server-generated fields
4. WHERE product operations fail THEN the store SHALL maintain consistent error state and SHALL NOT add mock or temporary data to the products array
5. WHEN local state becomes inconsistent THEN the system SHALL provide mechanisms to refresh state from the database
6. WHILE managing product state THEN all mutations SHALL go through database operations first before updating local state

### Requirement 4: Product API Service Database Integration

**User Story:** As a system architect, I want all product API services to exclusively communicate with Supabase, so that there are no alternative data sources that could cause inconsistencies.

#### Acceptance Criteria

1. WHEN createProduct API is called THEN it SHALL only execute Supabase insert operations without any fallback mechanisms
2. WHEN getProducts API is called THEN it SHALL only query the Supabase products table with proper transformation of database fields to application models
3. WHEN API operations encounter errors THEN they SHALL return specific Supabase error information without masking as mock data responses
4. WHERE database schema mapping occurs THEN it SHALL properly transform between database column names (snake_case) and application field names (camelCase)
5. WHEN successful database operations complete THEN the API SHALL return properly typed responses matching the Product interface
6. WHILE handling API responses THEN all database-generated fields (id, created_at, updated_at) SHALL be properly included and transformed

### Requirement 5: Product Category Integration

**User Story:** As a business user, I want product categories to be managed exclusively through the database, so that category assignments are persistent and consistent across all product operations.

#### Acceptance Criteria

1. WHEN products are created with categories THEN the category references SHALL be validated against the Supabase categories table
2. WHEN product lists are displayed THEN category information SHALL be fetched from the database and properly associated with products
3. WHEN category operations occur THEN they SHALL use the dedicated category API services that interact exclusively with Supabase
4. WHERE category validation fails THEN the system SHALL prevent product creation and display appropriate database constraint errors
5. WHEN categories are updated THEN all associated products SHALL reflect the changes through database relationships
6. WHILE managing categories THEN the system SHALL maintain referential integrity between products and categories tables

### Requirement 6: Stock Movement Tracking

**User Story:** As an inventory manager, I want all product stock changes to be tracked in the database, so that I have a complete audit trail of inventory movements.

#### Acceptance Criteria

1. WHEN a new product is created THEN the system SHALL automatically create an initial stock movement record in the product_history table
2. WHEN stock levels change THEN the system SHALL log the movement through the createProductMovement API
3. WHEN stock movements are recorded THEN they SHALL include product details, movement type, quantities, user information, and timestamps
4. WHERE stock validation occurs THEN it SHALL be based on current database stock levels rather than any cached or mock values
5. WHEN stock movements fail to log THEN the system SHALL handle the error gracefully but SHALL NOT prevent the primary operation
6. WHILE tracking inventory THEN all stock-related operations SHALL maintain consistency between the products table and stock_movements table

### Requirement 7: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when product operations fail, so that I understand what went wrong and can take appropriate corrective action.

#### Acceptance Criteria

1. WHEN database connection is unavailable THEN the system SHALL display clear connectivity error messages for product operations
2. WHEN product creation fails due to validation errors THEN the system SHALL show specific field-level error messages from database constraints
3. WHEN duplicate products are attempted THEN the system SHALL display meaningful error messages about SKU or barcode conflicts
4. WHERE network timeouts occur THEN the system SHALL provide retry options for product operations
5. WHEN permissions errors happen THEN the system SHALL display appropriate authorization error messages
6. WHILE handling errors THEN the system SHALL log detailed error information for debugging while showing user-friendly messages

### Requirement 8: Performance and Loading States

**User Story:** As a user, I want responsive product operations with clear loading indicators, so that I understand when the system is working and when operations are complete.

#### Acceptance Criteria

1. WHEN product operations are in progress THEN the system SHALL display appropriate loading states and disable form controls
2. WHEN product lists are loading THEN the system SHALL show skeleton screens or loading spinners
3. WHEN large numbers of products are being fetched THEN the system SHALL implement pagination or virtual scrolling for performance
4. WHERE product operations complete THEN the system SHALL provide clear success feedback to users
5. WHEN database queries are slow THEN the system SHALL implement appropriate timeout handling and user feedback
6. WHILE optimizing performance THEN the system SHALL cache frequently accessed product data appropriately without compromising data freshness

### Requirement 9: Data Validation and Integrity

**User Story:** As a business owner, I want product data to be validated and consistent, so that my inventory information is accurate and reliable.

#### Acceptance Criteria

1. WHEN product data is submitted THEN the system SHALL validate all required fields before attempting database operations
2. WHEN SKU or barcode values are provided THEN the system SHALL enforce uniqueness constraints at the database level
3. WHEN numeric values are entered THEN the system SHALL validate proper formats for prices, costs, and stock quantities
4. WHERE data transformation occurs THEN the system SHALL maintain data integrity between application models and database schema
5. WHEN product updates happen THEN the system SHALL preserve data relationships and update timestamps appropriately
6. WHILE ensuring consistency THEN all product operations SHALL use database transactions where multiple table updates are required

### Requirement 10: Real-time Data Synchronization

**User Story:** As a multi-user business, I want product changes to be reflected across all user sessions, so that everyone sees the most current product information.

#### Acceptance Criteria

1. WHEN products are added by one user THEN other active sessions SHALL see the new products without manual refresh
2. WHEN product information is updated THEN all user interfaces SHALL reflect the changes in real-time
3. WHEN stock levels change THEN the system SHALL update all relevant displays and prevent overselling scenarios
4. WHERE concurrent modifications occur THEN the system SHALL handle conflicts appropriately with proper conflict resolution
5. WHEN real-time subscriptions are established THEN they SHALL be managed efficiently to prevent performance issues
6. WHILE maintaining synchronization THEN the system SHALL handle connection drops and re-establishment gracefully

## Non-Functional Requirements

### Performance Requirements
- Product creation operations SHALL complete within 2 seconds under normal conditions
- Product list loading SHALL display initial results within 1 second for up to 1000 products
- Real-time product updates SHALL be propagated to all clients within 500ms

### Security Requirements
- All product operations SHALL require authenticated Supabase sessions
- Database access SHALL respect row-level security policies configured in Supabase
- Product data SHALL only be accessible to authorized business users

### Reliability Requirements
- Product operations SHALL have 99.5% success rate when Supabase is available
- Failed product operations SHALL be retryable without data loss
- System SHALL maintain product data consistency across all concurrent operations

### Maintainability Requirements
- Product API services SHALL follow consistent error handling patterns
- Database schema changes SHALL be managed through Supabase migrations
- Product operations SHALL be thoroughly logged for debugging and audit purposes

### Compatibility Requirements
- Product operations SHALL work with existing Supabase database schema
- Integration SHALL not break existing product-related functionality in other modules
- API interfaces SHALL remain compatible with existing product consumers (POS, Inventory, etc.)

## Technical Considerations

### Database Schema Requirements
- Ensure products table has all required columns with proper constraints
- Verify categories table exists and has proper foreign key relationships
- Confirm stock_movements table is properly configured for audit trails
- Validate that all necessary indexes exist for performance

### API Service Architecture
- Maintain clean separation between API layer and business logic
- Implement proper error propagation from Supabase to UI components
- Ensure consistent data transformation between database and application models
- Use proper TypeScript typing for all API responses

### State Management Updates
- Update business store to handle database-only operations
- Implement proper loading and error states for all product operations
- Ensure optimistic updates are handled correctly with rollback capability
- Maintain consistency between local state and database state

### Integration Points
- Ensure product operations integrate properly with POS module
- Verify inventory tracking continues to work with database-only products
- Confirm purchase order workflows can access database product information
- Validate that reporting modules can access product data correctly

### Testing Strategy
- Create integration tests that verify database operations
- Test error scenarios with proper mock Supabase client configurations
- Validate data consistency across concurrent product operations
- Ensure proper cleanup of test data to prevent pollution