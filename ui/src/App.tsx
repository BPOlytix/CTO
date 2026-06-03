import React from 'react';
import ReviewQueue from './components/ReviewQueue';
import Terminal from './components/Terminal';
import { LayoutDashboard, Receipt, FileText, Settings, LogOut, ShieldCheck } from 'lucide-react';

function App() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-400 flex flex-col border-r border-slate-800">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-sky-500 p-2 rounded-lg">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Accrue AI</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-white bg-slate-800 rounded-lg group transition-all">
            <LayoutDashboard size={20} className="text-sky-400" />
            <span className="font-medium">Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 hover:text-white hover:bg-slate-800 rounded-lg group transition-all">
            <Receipt size={20} />
            <span className="font-medium">Transactions</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 hover:text-white hover:bg-slate-800 rounded-lg group transition-all">
            <FileText size={20} />
            <span className="font-medium">Reports</span>
          </a>
          <div className="pt-4 pb-2 px-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Settings</span>
          </div>
          <a href="#" className="flex items-center gap-3 px-3 py-2 hover:text-white hover:bg-slate-800 rounded-lg group transition-all">
            <Settings size={20} />
            <span className="font-medium">Configuration</span>
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800 mt-auto">
          <button className="flex items-center gap-3 px-3 py-2 w-full hover:text-white hover:bg-slate-800 rounded-lg transition-all text-left">
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-semibold text-slate-500">Command Center</h1>
            <div className="h-4 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-medium text-slate-700">Xero Connected</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm">
              Process All
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Dashboard Main View */}
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <ReviewQueue />
          </div>

          {/* Super User Terminal Side Panel */}
          <div className="w-[400px] bg-slate-100 border-l border-slate-200 flex flex-col p-4 shadow-inner">
            <div className="flex-1">
              <Terminal />
            </div>
            <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-500 leading-relaxed shadow-sm">
              <p className="font-bold text-slate-700 mb-1">Super User Quick Tips:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Type <code className="bg-slate-50 px-1 py-0.5 rounded border border-slate-100 text-sky-600">/reconcile [date]</code> to trigger manual sync</li>
                <li>Type <code className="bg-slate-50 px-1 py-0.5 rounded border border-slate-100 text-sky-600">/match --confidence 90</code> to auto-approve high confidence</li>
                <li>Type <code className="bg-slate-50 px-1 py-0.5 rounded border border-slate-100 text-sky-600">/help</code> for full command list</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
