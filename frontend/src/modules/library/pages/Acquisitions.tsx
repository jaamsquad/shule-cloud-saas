import React, { useState } from 'react';
import { Plus, Check, X, Clock, DollarSign, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export const Acquisitions = () => {
  const [activeTab, setActiveTab] = useState<'wishlist' | 'orders'>('wishlist');
  const [requests, setRequests] = useState([
    { id: 1, title: 'The Martian', author: 'Andy Weir', requestedBy: 'Alice Johnson', date: '2026-03-20', status: 'Pending', votes: 12 },
    { id: 2, title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', requestedBy: 'Prof. Smith', date: '2026-03-25', status: 'Approved', votes: 5 },
    { id: 3, title: 'Dune', author: 'Frank Herbert', requestedBy: 'Bob Smith', date: '2026-03-28', status: 'Pending', votes: 8 },
  ]);

  const [orders, setOrders] = useState([
    { id: 'PO-2026-001', vendor: 'Pearson Education', items: 45, total: 1250.00, status: 'Delivered', date: '2026-03-10' },
    { id: 'PO-2026-002', vendor: 'Amazon Books', items: 12, total: 340.50, status: 'Processing', date: '2026-03-26' },
    { id: 'PO-2026-003', vendor: 'Oxford Press', items: 25, total: 890.00, status: 'Pending', date: '2026-03-29' },
  ]);

  const approveRequest = (id: number) => {
    setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
    toast.success("Book request approved for purchase!");
  };

  const rejectRequest = (id: number) => {
    setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: 'Rejected' } : r));
    toast.info("Book request declined.");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Acquisitions & Wishlists</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage book requests and track purchase orders.</p>
        </div>
        <button 
          onClick={() => toast.info("Mock feature: Open new purchase order modal")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <ShoppingCart size={20} /> New Purchase Order
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">Annual Budget</p>
            <p className="text-3xl font-black text-emerald-900 dark:text-emerald-400 mt-1">$5,000.00</p>
          </div>
          <DollarSign size={40} className="text-emerald-500 opacity-50" />
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-widest">Money Spent</p>
            <p className="text-3xl font-black text-blue-900 dark:text-blue-400 mt-1">$1,590.50</p>
          </div>
          <TrendingUp size={40} className="text-blue-500 opacity-50" />
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-widest">Pending Requests</p>
            <p className="text-3xl font-black text-amber-900 dark:text-amber-400 mt-1">
              {requests.filter(r => r.status === 'Pending').length}
            </p>
          </div>
          <Plus size={40} className="text-amber-500 opacity-50" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button 
            onClick={() => setActiveTab('wishlist')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'wishlist' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            Wishlist & Requests
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'orders' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            Purchase Orders
          </button>
        </div>
        
        <div className="p-0">
          {activeTab === 'wishlist' && (
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 font-medium">
                <tr>
                  <th className="px-6 py-4">Title & Author</th>
                  <th className="px-6 py-4">Requested By</th>
                  <th className="px-6 py-4 flex items-center gap-1">Votes</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{req.title}</p>
                      <p className="text-xs text-gray-500">{req.author}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{req.requestedBy}</p>
                      <p className="text-xs text-gray-500">{new Date(req.date).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">{req.votes}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-bold uppercase rounded-md ${
                        req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                        req.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'Pending' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => approveRequest(req.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Approve">
                            <Check size={18} />
                          </button>
                          <button onClick={() => rejectRequest(req.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg" title="Reject">
                            <X size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'orders' && (
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 font-medium">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <p className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">{order.id}</p>
                      <p className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{order.vendor}</td>
                    <td className="px-6 py-4"><span className="flex items-center gap-1"><Package size={14}/> {order.items}</span></td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">${order.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-1 text-xs font-bold uppercase rounded-md inline-block ${
                        order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 
                        order.status === 'Processing' ? 'bg-blue-100 text-blue-700' : 
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
