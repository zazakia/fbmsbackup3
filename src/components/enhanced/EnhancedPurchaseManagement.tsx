import React from 'react';
import { PurchaseOrderModule } from '../../modules/purchases/PurchaseOrderModule';

const EnhancedPurchaseManagement: React.FC = () => {
  return (
    <div className="h-full">
      <PurchaseOrderModule />
    </div>
  );
};

export default EnhancedPurchaseManagement;