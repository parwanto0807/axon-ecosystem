import axios from 'axios';
import { format } from 'date-fns';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''; // Default to empty to avoid localhost leakage in prod if missing

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Aggregate sales data by month for the last 12 months
export const getSalesData = async (): Promise<{ monthlySales: number[], months: string[], rawData: any[] }> => {
  try {
    const response = await api.get('/api/invoices');
    const sales = response.data;

    const monthlySales = Array(12).fill(0);
    const months: string[] = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.unshift(format(date, 'MMM yyyy'));
    }

    sales.forEach((invoice: any) => {
      const invoiceDate = new Date(invoice.createdAt);
      const monthDiff = (today.getFullYear() - invoiceDate.getFullYear()) * 12 + (today.getMonth() - invoiceDate.getMonth());
      if (monthDiff >= 0 && monthDiff < 12) {
        monthlySales[11 - monthDiff] += invoice.totalAmount;
      }
    });

    return { monthlySales, months, rawData: sales };
  } catch (error) {
    console.error('Error fetching sales data:', error);
    throw error;
  }
};

export const getExpensesData = async (): Promise<{ categories: string[], amounts: number[], rawData: any[] }> => {
  try {
    const response = await api.get('/api/finance/operational-expenses');
    const expenses = response.data;

    const expensesByCategory = expenses.reduce((acc: any, expense: any) => {
      const category = expense.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {});

    return { 
      categories: Object.keys(expensesByCategory), 
      amounts: Object.values(expensesByCategory) as number[], 
      rawData: expenses 
    };
  } catch (error) {
    console.error('Error fetching expenses data:', error);
    throw error;
  }
};

// Example: Fetch inventory stock
export const getInventoryStock = async () => {
  try {
    const response = await api.get('/api/inventory/stock');
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory stock:', error);
    throw error;
  }
};

// Example: Fetch low stock items
export const getLowStockItems = async () => {
  try {
    const response = await api.get('/api/inventory/low-stock');
    return response.data;
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    throw error;
  }
};

// Example: Fetch Profit & Loss Report
export const getProfitLossReport = async (startDate: string, endDate: string) => {
  try {
    const response = await api.get(`/api/reports/profit-loss`, {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Profit & Loss report:', error);
    throw error;
  }
};

// Example: Fetch Cash Flow Report
export const getCashFlowReport = async (startDate: string, endDate: string) => {
  try {
    const response = await api.get(`/api/reports/cash-flow`, {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Cash Flow report:', error);
    throw error;
  }
};

// Fetch Sales by Business Category
export const getSalesByCategory = async (startDate: string, endDate: string): Promise<{ category: string, amount: number }[]> => {
  try {
    const response = await api.get(`/api/reports/sales-by-category`, {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching sales by category:', error);
    throw error;
  }
};

// Example: Fetch Recent Activity (Unifies multiple sources)
export const getRecentActivity = async () => {
  try {
    const [invoices, quotations, workOrders, proposals] = await Promise.all([
      api.get('/api/invoices').then(res => res.data.slice(0, 5)),
      api.get('/api/quotations').then(res => res.data.slice(0, 5)),
      api.get('/api/work-orders').then(res => res.data.slice(0, 5)),
      api.get('/api/proposals').then(res => res.data.slice(0, 5)),
    ]);

    const unified = [
      ...invoices.map((inv: any) => ({
        id: inv.id,
        type: 'INVOICE',
        title: `Invoice ${inv.number}`,
        subtitle: inv.customer?.name || 'Customer',
        amount: inv.totalAmount,
        date: inv.createdAt ? new Date(inv.createdAt) : new Date(),
        status: inv.status,
      })),
      ...quotations.map((quo: any) => ({
        id: quo.id,
        type: 'QUOTATION',
        title: `Quotation ${quo.number}`,
        subtitle: quo.customer?.name || 'Customer',
        amount: quo.grandTotal,
        date: quo.createdAt ? new Date(quo.createdAt) : new Date(),
        status: quo.status,
      })),
      ...workOrders.map((wo: any) => ({
        id: wo.id,
        type: 'WORK_ORDER',
        title: `Work Order ${wo.number}`,
        subtitle: wo.title,
        date: wo.createdAt ? new Date(wo.createdAt) : new Date(),
        status: wo.status,
      })),
      ...proposals.map((prop: any) => ({
        id: prop.id,
        type: 'PROPOSAL',
        title: `Proposal ${prop.number}`,
        subtitle: prop.subject,
        date: prop.createdAt ? new Date(prop.createdAt) : new Date(),
        status: prop.status,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

    return unified;
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return []; // Return empty array on error to prevent dashboard crash
  }
};

export default api;
