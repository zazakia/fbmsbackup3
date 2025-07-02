import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useBusinessStore } from '../../store/businessStore';

interface ReportField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'currency';
  source: 'sales' | 'products' | 'customers' | 'journalEntries';
  field: string;
}

interface CustomReport {
  id: string;
  name: string;
  description: string;
  fields: ReportField[];
  chartType: 'bar' | 'line' | 'pie' | 'table';
  filters: any[];
  created: Date;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const CustomReportBuilder: React.FC = () => {
  const { sales, products, customers, journalEntries } = useBusinessStore();
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [currentReport, setCurrentReport] = useState<CustomReport | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFields, setSelectedFields] = useState<ReportField[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'table'>('bar');

  // Available fields for different data sources
  const availableFields: Record<string, ReportField[]> = {
    sales: [
      { id: 'sales-id', name: 'Sale ID', type: 'text', source: 'sales', field: 'id' },
      { id: 'sales-date', name: 'Date', type: 'date', source: 'sales', field: 'date' },
      { id: 'sales-customer', name: 'Customer', type: 'text', source: 'sales', field: 'customerName' },
      { id: 'sales-total', name: 'Total Amount', type: 'currency', source: 'sales', field: 'total' },
      { id: 'sales-payment', name: 'Payment Method', type: 'text', source: 'sales', field: 'paymentMethod' },
      { id: 'sales-items', name: 'Items Count', type: 'number', source: 'sales', field: 'items' }
    ],
    products: [
      { id: 'products-id', name: 'Product ID', type: 'text', source: 'products', field: 'id' },
      { id: 'products-name', name: 'Product Name', type: 'text', source: 'products', field: 'name' },
      { id: 'products-category', name: 'Category', type: 'text', source: 'products', field: 'category' },
      { id: 'products-price', name: 'Price', type: 'currency', source: 'products', field: 'price' },
      { id: 'products-stock', name: 'Stock', type: 'number', source: 'products', field: 'stock' },
      { id: 'products-cost', name: 'Cost', type: 'currency', source: 'products', field: 'cost' }
    ],
    customers: [
      { id: 'customers-id', name: 'Customer ID', type: 'text', source: 'customers', field: 'id' },
      { id: 'customers-name', name: 'Customer Name', type: 'text', source: 'customers', field: 'name' },
      { id: 'customers-email', name: 'Email', type: 'text', source: 'customers', field: 'email' },
      { id: 'customers-phone', name: 'Phone', type: 'text', source: 'customers', field: 'phone' },
      { id: 'customers-address', name: 'Address', type: 'text', source: 'customers', field: 'address' }
    ],
    journalEntries: [
      { id: 'entries-id', name: 'Entry ID', type: 'text', source: 'journalEntries', field: 'id' },
      { id: 'entries-date', name: 'Date', type: 'date', source: 'journalEntries', field: 'date' },
      { id: 'entries-description', name: 'Description', type: 'text', source: 'journalEntries', field: 'description' },
      { id: 'entries-amount', name: 'Amount', type: 'currency', source: 'journalEntries', field: 'amount' }
    ]
  };

  // Generate data based on selected fields
  const generateReportData = (report: CustomReport) => {
    if (!report.fields.length) return [];

    const dataSource = report.fields[0].source;
    let data: any[] = [];

    switch (dataSource) {
      case 'sales':
        data = sales.map(sale => {
          const row: any = {};
          report.fields.forEach(field => {
            row[field.name] = sale[field.field as keyof typeof sale];
          });
          return row;
        });
        break;
      case 'products':
        data = products.map(product => {
          const row: any = {};
          report.fields.forEach(field => {
            row[field.name] = product[field.field as keyof typeof product];
          });
          return row;
        });
        break;
      case 'customers':
        data = customers.map(customer => {
          const row: any = {};
          report.fields.forEach(field => {
            row[field.name] = customer[field.field as keyof typeof customer];
          });
          return row;
        });
        break;
      case 'journalEntries':
        data = journalEntries.map(entry => {
          const row: any = {};
          report.fields.forEach(field => {
            row[field.name] = entry[field.field as keyof typeof entry];
          });
          return row;
        });
        break;
    }

    return data.slice(0, 20); // Limit to 20 rows for performance
  };

  const addField = (field: ReportField) => {
    if (!selectedFields.find(f => f.id === field.id)) {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const removeField = (fieldId: string) => {
    setSelectedFields(selectedFields.filter(f => f.id !== fieldId));
  };

  const saveReport = () => {
    if (!currentReport || !selectedFields.length) return;

    const report: CustomReport = {
      ...currentReport,
      fields: selectedFields,
      chartType,
      created: new Date()
    };

    if (isEditing) {
      setReports(reports.map(r => r.id === report.id ? report : r));
    } else {
      setReports([...reports, { ...report, id: Date.now().toString() }]);
    }

    setCurrentReport(null);
    setSelectedFields([]);
    setIsEditing(false);
  };

  const deleteReport = (reportId: string) => {
    setReports(reports.filter(r => r.id !== reportId));
  };

  const editReport = (report: CustomReport) => {
    setCurrentReport(report);
    setSelectedFields(report.fields);
    setChartType(report.chartType);
    setIsEditing(true);
  };

  const renderChart = (report: CustomReport) => {
    const data = generateReportData(report);
    if (!data.length) return <div className="text-gray-500">No data available</div>;

    const dataKey = report.fields[0]?.name || 'value';

    switch (report.chartType) {
      case 'bar':
        return (
          <BarChart width={400} height={300} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dataKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={report.fields[1]?.name || 'value'} fill="#8884d8" />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart width={400} height={300} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dataKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={report.fields[1]?.name || 'value'} stroke="#8884d8" />
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart width={400} height={300}>
            <Pie
              data={data}
              cx={200}
              cy={150}
              labelLine={false}
              label={({ [dataKey]: name, [report.fields[1]?.name || 'value']: value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={report.fields[1]?.name || 'value'}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );
      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  {report.fields.map(field => (
                    <th key={field.id} className="px-4 py-2 text-left">{field.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="border-b">
                    {report.fields.map(field => (
                      <td key={field.id} className="px-4 py-2">
                        {field.type === 'currency' 
                          ? `₱${Number(row[field.name]).toLocaleString()}`
                          : row[field.name]
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return <div>Select a chart type</div>;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Custom Report Builder</h1>
        <p className="text-gray-600">Create personalized reports with drag-and-drop functionality</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Fields Panel */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Available Fields</h3>
          
          {Object.entries(availableFields).map(([source, fields]) => (
            <div key={source} className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2 capitalize">{source}</h4>
              <div className="space-y-1">
                {fields.map(field => (
                  <button
                    key={field.id}
                    onClick={() => addField(field)}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border"
                  >
                    {field.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Report Builder */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Report Builder</h3>
          
          {/* Report Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Name</label>
            <input
              type="text"
              value={currentReport?.name || ''}
              onChange={(e) => setCurrentReport(prev => prev ? { ...prev, name: e.target.value } : { id: '', name: e.target.value, description: '', fields: [], chartType: 'bar', filters: [], created: new Date() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter report name"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={currentReport?.description || ''}
              onChange={(e) => setCurrentReport(prev => prev ? { ...prev, description: e.target.value } : { id: '', name: '', description: e.target.value, fields: [], chartType: 'bar', filters: [], created: new Date() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter report description"
            />
          </div>

          {/* Selected Fields */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Selected Fields</label>
            <div className="space-y-1">
              {selectedFields.map(field => (
                <div key={field.id} className="flex justify-between items-center px-3 py-2 bg-blue-50 rounded border">
                  <span className="text-sm">{field.name}</span>
                  <button
                    onClick={() => removeField(field.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Chart Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="table">Table</option>
            </select>
          </div>

          {/* Save Button */}
          <button
            onClick={saveReport}
            disabled={!currentReport?.name || !selectedFields.length}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isEditing ? 'Update Report' : 'Save Report'}
          </button>
        </div>

        {/* Preview */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          {currentReport && selectedFields.length > 0 ? (
            <div>
              <h4 className="font-medium mb-2">{currentReport.name}</h4>
              {renderChart({ ...currentReport, fields: selectedFields, chartType })}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              Select fields and configure report to see preview
            </div>
          )}
        </div>
      </div>

      {/* Saved Reports */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Saved Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(report => (
            <div key={report.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">{report.name}</h4>
                <div className="flex gap-1">
                  <button
                    onClick={() => editReport(report)}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteReport(report.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{report.description}</p>
              <div className="text-xs text-gray-500">
                Created: {report.created.toLocaleDateString()}
              </div>
              <div className="mt-3">
                {renderChart(report)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomReportBuilder; 