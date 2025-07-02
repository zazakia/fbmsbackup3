import React, { useEffect } from 'react';
import { useBusinessStore } from '../../store/businessStore';

const CustomerList: React.FC = () => {
  const { customers, fetchCustomers, deleteCustomer, isLoading, error } = useBusinessStore();

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  if (isLoading) return <div>Loading customers...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Customer List</h2>
      <ul className="divide-y divide-gray-200">
        {customers.map((c) => (
          <li key={c.id} className="py-2 flex justify-between items-center">
            <span>{c.firstName} {c.lastName} ({c.email})</span>
            <button
              onClick={() => deleteCustomer(c.id)}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CustomerList; 