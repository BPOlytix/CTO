import React from 'react';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

const ReviewQueue = () => {
  const items = [
    { id: 1, date: '2023-10-27', description: 'Amazon Web Services', amount: '$450.00', status: 'pending', confidence: '85%' },
    { id: 2, date: '2023-10-26', description: 'Starbucks Coffee', amount: '$12.50', status: 'flagged', confidence: '40%' },
    { id: 3, date: '2023-10-25', description: 'Office Depot', amount: '$89.99', status: 'matched', confidence: '100%' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Review Queue</h2>
          <p className="text-slate-500 text-sm">Review transactions flagged for manual verification.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-lg flex items-center gap-2">
            <Clock className="text-amber-600" size={18} />
            <span className="text-sm font-medium text-amber-900">2 Pending</span>
          </div>
          <div className="bg-rose-50 border border-rose-100 px-4 py-2 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-rose-600" size={18} />
            <span className="text-sm font-medium text-rose-900">1 Flagged</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Date</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Description</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Amount</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Confidence</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{item.date}</td>
                <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{item.description}</div>
                    <div className="text-xs text-slate-500">Transaction ID: TXN-{item.id}00349</div>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-900">{item.amount}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    item.status === 'matched' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    item.status === 'flagged' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                    'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          parseInt(item.confidence) > 80 ? 'bg-emerald-500' :
                          parseInt(item.confidence) > 50 ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`}
                        style={{ width: item.confidence }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-slate-600 w-8">{item.confidence}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReviewQueue;
