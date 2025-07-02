import React, { useState, useEffect } from 'react';
import { 
  X, 
  Edit, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Calendar, 
  Star, 
  DollarSign,
  TrendingUp,
  Award,
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Tag,
  CreditCard
} from 'lucide-react';
import { Customer, CustomerContact, CustomerTransaction } from '../../types/business';
import { getCustomerAnalytics, getCustomerContacts, createCustomerContact } from '../../api/customers';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

interface CustomerProfileProps {
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
}

interface CustomerAnalytics {
  customer: Customer;
  totalSales: number;
  totalTransactions: number;
  averageOrderValue: number;
  lastTransactionDate?: Date;
  lifetimeValue: number;
  loyaltyTier: string;
  transactions: CustomerTransaction[];
}

const CustomerProfile: React.FC<CustomerProfileProps> = ({ customer, onClose, onEdit }) => {
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'contacts'>('overview');
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    type: 'note' as CustomerContact['type'],
    subject: '',
    content: '',
    followUpDate: ''
  });

  const { addToast } = useToastStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchCustomerData();
  }, [customer.id]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const [analyticsResult, contactsResult] = await Promise.all([
        getCustomerAnalytics(customer.id),
        getCustomerContacts(customer.id)
      ]);

      if (analyticsResult.data) {
        setAnalytics(analyticsResult.data);
      }

      if (contactsResult.data) {
        setContacts(contactsResult.data);
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load customer data'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!contactForm.subject.trim() || !contactForm.content.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Subject and content are required'
      });
      return;
    }

    try {
      const contactData = {
        customerId: customer.id,
        type: contactForm.type,
        subject: contactForm.subject,
        content: contactForm.content,
        followUpDate: contactForm.followUpDate ? new Date(contactForm.followUpDate) : undefined,
        status: 'completed' as const,
        createdBy: user?.id || 'system'
      };

      const result = await createCustomerContact(contactData);
      if (result.error) {
        throw result.error;
      }

      addToast({
        type: 'success',
        title: 'Contact Added',
        message: 'Customer contact has been recorded'
      });

      setContactForm({
        type: 'note',
        subject: '',
        content: '',
        followUpDate: ''
      });
      setShowAddContact(false);
      fetchCustomerData();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add contact'
      });
    }
  };

  const getLoyaltyTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'text-purple-600 bg-purple-100';
      case 'Gold': return 'text-yellow-600 bg-yellow-100';
      case 'Silver': return 'text-gray-600 bg-gray-100';
      default: return 'text-orange-600 bg-orange-100';
    }
  };

  const getContactTypeIcon = (type: CustomerContact['type']) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'complaint': return <AlertCircle className="h-4 w-4" />;
      case 'inquiry': return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <LoadingSpinner message="Loading customer profile..." size="lg" className="min-h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-lg font-bold text-blue-600">
                {customer.firstName[0]}{customer.lastName[0]}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {customer.firstName} {customer.lastName}
              </h2>
              {customer.businessName && (
                <p className="text-sm text-gray-600">{customer.businessName}</p>
              )}
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  customer.customerType === 'individual' ? 'bg-blue-100 text-blue-800' :
                  customer.customerType === 'business' ? 'bg-green-100 text-green-800' :
                  customer.customerType === 'vip' ? 'bg-purple-100 text-purple-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {customer.customerType}
                </span>
                {analytics && (
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getLoyaltyTierColor(analytics.loyaltyTier)}`}>
                    <Award className="h-3 w-3 mr-1" />
                    {analytics.loyaltyTier}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onEdit}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'transactions', label: 'Transactions', icon: DollarSign },
              { id: 'contacts', label: 'Communications', icon: MessageSquare }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 inline mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Lifetime Value</p>
                        <p className="text-2xl font-bold text-blue-900">
                          ₱{analytics.lifetimeValue.toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Total Orders</p>
                        <p className="text-2xl font-bold text-green-900">
                          {analytics.totalTransactions}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Average Order</p>
                        <p className="text-2xl font-bold text-purple-900">
                          ₱{analytics.averageOrderValue.toLocaleString()}
                        </p>
                      </div>
                      <Star className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">Loyalty Points</p>
                        <p className="text-2xl font-bold text-orange-900">
                          {customer.loyaltyPoints.toLocaleString()}
                        </p>
                      </div>
                      <Award className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    {customer.email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-3" />
                        <span className="text-sm text-gray-600">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-3" />
                        <span className="text-sm text-gray-600">{customer.phone}</span>
                      </div>
                    )}
                    {(customer.address || customer.city || customer.province) && (
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                        <div className="text-sm text-gray-600">
                          {customer.address && <div>{customer.address}</div>}
                          <div>
                            {[customer.city, customer.province, customer.zipCode].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      </div>
                    )}
                    {customer.birthday && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                        <span className="text-sm text-gray-600">
                          {customer.birthday.toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Financial Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Credit Limit:</span>
                      <span className="text-sm font-medium text-gray-900">
                        ₱{customer.creditLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Current Balance:</span>
                      <span className={`text-sm font-medium ${
                        customer.currentBalance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        ₱{customer.currentBalance.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Discount Percentage:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {customer.discountPercentage}%
                      </span>
                    </div>
                    {customer.preferredPaymentMethod && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Preferred Payment:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {customer.preferredPaymentMethod.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags and Notes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {customer.tags.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Tag className="h-5 w-5 mr-2" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {customer.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {customer.notes && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Notes
                    </h3>
                    <p className="text-sm text-gray-600">{customer.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'transactions' && analytics && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
                </div>
                {analytics.transactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                    <p className="text-gray-600">This customer hasn't made any purchases yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reference
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {analytics.transactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {transaction.createdAt.toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                transaction.type === 'sale' ? 'bg-green-100 text-green-800' :
                                transaction.type === 'payment' ? 'bg-blue-100 text-blue-800' :
                                transaction.type === 'refund' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {transaction.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {transaction.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {transaction.referenceNumber || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                              ₱{transaction.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-6">
              {/* Add Contact Form */}
              {showAddContact ? (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add Communication Record</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                      <select
                        value={contactForm.type}
                        onChange={(e) => setContactForm(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="note">Note</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone Call</option>
                        <option value="meeting">Meeting</option>
                        <option value="complaint">Complaint</option>
                        <option value="inquiry">Inquiry</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Date (Optional)</label>
                      <input
                        type="date"
                        value={contactForm.followUpDate}
                        onChange={(e) => setContactForm(prev => ({ ...prev, followUpDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                      <input
                        type="text"
                        value={contactForm.subject}
                        onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter subject"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                      <textarea
                        value={contactForm.content}
                        onChange={(e) => setContactForm(prev => ({ ...prev, content: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter details"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-4 mt-4">
                    <button
                      onClick={() => setShowAddContact(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddContact}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Record
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Communication History</h3>
                  <button
                    onClick={() => setShowAddContact(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Record
                  </button>
                </div>
              )}

              {/* Contact History */}
              <div className="space-y-4">
                {contacts.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No communication records</h3>
                    <p className="text-gray-600">Start building a communication history with this customer.</p>
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <div key={contact.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            {getContactTypeIcon(contact.type)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">{contact.subject}</h4>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(contact.createdAt, { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{contact.content}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              contact.type === 'email' ? 'bg-blue-100 text-blue-800' :
                              contact.type === 'phone' ? 'bg-green-100 text-green-800' :
                              contact.type === 'meeting' ? 'bg-purple-100 text-purple-800' :
                              contact.type === 'complaint' ? 'bg-red-100 text-red-800' :
                              contact.type === 'inquiry' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {contact.type}
                            </span>
                            {contact.followUpDate && (
                              <span className="text-xs text-orange-600 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Follow-up: {contact.followUpDate.toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;