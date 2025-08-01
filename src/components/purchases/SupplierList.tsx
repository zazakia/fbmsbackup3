import React from 'react';
import { Edit, Trash2, Building, Mail, Phone, MapPin } from 'lucide-react';
import { Supplier } from '../../types/business';
import { useBusinessStore } from '../../store/businessStore';

interface SupplierListProps {
  suppliers: Supplier[];
  onEdit: (supplierId: string) => void;
}

const SupplierList: React.FC<SupplierListProps> = ({ suppliers, onEdit }) => {
  const { deleteSupplier } = useBusinessStore();

  const handleDelete = (supplierId: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      deleteSupplier(supplierId);
    }
  };

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-12">
        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No suppliers found</h3>
        <p className="text-gray-500">Add your first supplier to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Supplier
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact Person
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact Info
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {suppliers.map((supplier) => (
            <tr key={supplier.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <Building className="h-5 w-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {supplier.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {supplier.id}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {supplier.contactPerson || 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="space-y-1">
                  {supplier.email && (
                    <div className="flex items-center text-sm text-gray-900">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      {supplier.email}
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center text-sm text-gray-900">
                      <Phone className="h-4 w-4 text-gray-400 mr-2" />
                      {supplier.phone}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-900">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                  <div>
                    {supplier.city && supplier.province ? (
                      <>
                        <div>{supplier.city}</div>
                        <div className="text-gray-500">{supplier.province}</div>
                      </>
                    ) : (
                      <span className="text-gray-500">No address</span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  supplier.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {supplier.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onEdit(supplier.id)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SupplierList;  