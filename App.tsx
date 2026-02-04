
import React, { useState, useMemo } from 'react';
import { User, UserRole, Complaint, ComplaintStatus, Category, Priority } from './types';
import { MOCK_USERS, MOCK_COMPLAINTS, Icons } from './constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { analyzeComplaint } from './services/geminiService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>(MOCK_COMPLAINTS);
  const [view, setView] = useState<'dashboard' | 'complaints' | 'users' | 'reports'>('dashboard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setView('dashboard');
  };

  const handleLogout = () => setCurrentUser(null);

  const raiseComplaint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const description = formData.get('description') as string;
    
    const aiResult = await analyzeComplaint(description);
    
    const newComplaint: Complaint = {
      id: `c${Date.now()}`,
      residentId: currentUser.id,
      residentName: currentUser.name,
      unitNumber: currentUser.unitNumber || 'N/A',
      category: (aiResult?.category as Category) || (formData.get('category') as Category),
      description,
      priority: (aiResult?.priority as Priority) || (formData.get('priority') as Priority),
      status: ComplaintStatus.PENDING,
      createdAt: Date.now(),
    };

    setComplaints(prev => [newComplaint, ...prev]);
    setIsSubmitting(false);
    setShowModal(false);
  };

  const updateStatus = (id: string, status: ComplaintStatus) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const submitFeedback = (id: string, rating: number, feedback: string) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, rating, feedback } : c));
  };

  const assignWorker = (id: string, workerId: string) => {
    const worker = MOCK_USERS.find(u => u.id === workerId);
    if (!worker) return;
    setComplaints(prev => prev.map(c => c.id === id ? { 
      ...c, 
      workerId: worker.id, 
      workerName: worker.name, 
      status: ComplaintStatus.ASSIGNED 
    } : c));
  };

  const filteredComplaints = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.ADMIN) return complaints;
    if (currentUser.role === UserRole.RESIDENT) return complaints.filter(c => c.residentId === currentUser.id);
    if (currentUser.role === UserRole.WORKER) return complaints.filter(c => c.workerId === currentUser.id);
    return [];
  }, [currentUser, complaints]);

  if (!currentUser) return <LoginView onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row text-[#3C4043]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col pt-4 sticky top-0 h-screen overflow-y-auto">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1a73e8] rounded-lg flex items-center justify-center text-white font-bold text-lg">A</div>
          <h1 className="text-xl font-medium tracking-tight text-[#5F6368]">AptCare</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <SidebarLink active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Icons.Dashboard />} label="Dashboard" />
          <SidebarLink active={view === 'complaints'} onClick={() => setView('complaints')} icon={<Icons.Complaint />} label="Tickets" />
          {currentUser.role === UserRole.ADMIN && (
            <>
              <SidebarLink active={view === 'users'} onClick={() => setView('users')} icon={<Icons.Users />} label="Community" />
              <SidebarLink active={view === 'reports'} onClick={() => setView('reports')} icon={<Icons.Reports />} label="Insights" />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-[#F8F9FA] flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
              {currentUser.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser.name}</p>
              <button onClick={handleLogout} className="text-xs text-[#1a73e8] hover:underline">Sign out</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-[72px] lg:pb-0">
        <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-8 bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="lg:hidden w-8 h-8 bg-[#1a73e8] rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
            <h2 className="text-lg lg:text-xl text-[#3C4043] font-normal capitalize">{view}</h2>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <button className="p-2 text-[#5F6368] hover:bg-slate-100 rounded-full transition-colors relative">
              <Icons.Bell />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            {currentUser.role === UserRole.RESIDENT && (
              <button 
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white px-4 lg:px-5 py-2 lg:py-2.5 rounded-full text-sm font-medium transition-shadow shadow-md hover:shadow-lg"
              >
                <Icons.Add />
                <span className="hidden sm:inline">New Request</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {view === 'dashboard' && (
            <DashboardSwitcher 
              user={currentUser} 
              complaints={complaints} 
              onUpdateStatus={updateStatus}
              onSubmitFeedback={submitFeedback}
            />
          )}
          {view === 'complaints' && (
            <ComplaintsListView 
              user={currentUser} 
              complaints={filteredComplaints} 
              onAssign={assignWorker}
              onUpdateStatus={updateStatus}
            />
          )}
          {view === 'users' && <CommunityView users={MOCK_USERS} />}
          {view === 'reports' && <InsightsView complaints={complaints} />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 flex justify-around items-center z-40 h-[72px] pb-safe">
        <MobileNavLink active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Icons.Dashboard />} label="Home" />
        <MobileNavLink active={view === 'complaints'} onClick={() => setView('complaints')} icon={<Icons.Complaint />} label="Tickets" />
        {currentUser.role === UserRole.ADMIN ? (
          <MobileNavLink active={view === 'users'} onClick={() => setView('users')} icon={<Icons.Users />} label="Community" />
        ) : (
          <button onClick={handleLogout} className="flex flex-col items-center gap-1 p-2 text-[#5F6368] min-w-[70px]">
            <div className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </div>
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        )}
      </nav>

      {/* Modal - Adaptive Design */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] lg:rounded-[28px] w-full max-w-lg p-6 lg:p-8 shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 lg:top-6 lg:right-6 p-2 hover:bg-slate-100 rounded-full">✕</button>
            <h3 className="text-xl lg:text-2xl font-normal text-[#202124] mb-2">Request Maintenance</h3>
            <p className="text-sm text-[#5F6368] mb-6 lg:mb-8 text-pretty">Tell us what needs fixing. Our AI will automatically prioritize it for you.</p>
            
            <form onSubmit={raiseComplaint} className="space-y-4 lg:space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#3C4043]">What's the issue?</label>
                <textarea 
                  name="description" 
                  required 
                  className="w-full bg-[#F1F3F4] border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#1a73e8] min-h-[100px] lg:min-h-[120px] outline-none text-sm lg:text-base"
                  placeholder="e.g., Water leaking from the AC..."
                ></textarea>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs lg:text-sm font-medium">Category</label>
                  <select name="category" className="w-full bg-[#F1F3F4] border-none rounded-xl p-3 outline-none text-sm appearance-none">
                    {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs lg:text-sm font-medium">Priority</label>
                  <select name="priority" className="w-full bg-[#F1F3F4] border-none rounded-xl p-3 outline-none text-sm appearance-none">
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <button 
                disabled={isSubmitting}
                className="w-full bg-[#1a73e8] text-white py-3.5 lg:py-4 rounded-full font-medium hover:bg-[#1557b0] disabled:bg-slate-300 transition-colors mt-2 text-sm lg:text-base shadow-lg shadow-blue-200"
              >
                {isSubmitting ? 'AI is analyzing...' : 'Post Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- View Switcher Logic ---

const DashboardSwitcher = ({ user, complaints, onUpdateStatus, onSubmitFeedback }: any) => {
  if (user.role === UserRole.ADMIN) return <AdminDashboard complaints={complaints} />;
  if (user.role === UserRole.WORKER) return <WorkerDashboard user={user} complaints={complaints} onUpdateStatus={onUpdateStatus} />;
  return <ResidentDashboard user={user} complaints={complaints} onSubmitFeedback={onSubmitFeedback} />;
};

const ResidentDashboard = ({ user, complaints, onSubmitFeedback }: any) => {
  const userComplaints = complaints.filter((c: any) => c.residentId === user.id);
  const active = userComplaints.filter((c: any) => c.status !== ComplaintStatus.COMPLETED);
  const resolved = userComplaints.filter((c: any) => c.status === ComplaintStatus.COMPLETED);

  return (
    <div className="space-y-6 lg:space-y-10 max-w-5xl mx-auto">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 lg:p-10 rounded-[28px] lg:rounded-[40px] border border-blue-100 shadow-sm">
        <h2 className="text-2xl lg:text-4xl font-normal text-slate-800 mb-1 lg:mb-2 text-balance">Hello, {user.name.split(' ')[0]}</h2>
        <p className="text-sm lg:text-base text-slate-600">Your unit <span className="font-semibold text-blue-600">{user.unitNumber}</span> is looking good.</p>
      </div>

      <section>
        <h3 className="text-lg lg:text-xl font-medium mb-4 lg:mb-6 flex items-center gap-2 px-1">
          Active Tickets
          <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">{active.length}</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {active.map((c: any) => (
            <Card key={c.id}>
              <div className="flex justify-between items-start mb-3 lg:mb-4 gap-2">
                <StatusChip status={c.status} />
                <PriorityChip priority={c.priority} />
              </div>
              <p className="text-sm lg:text-base text-[#202124] font-medium mb-2 leading-relaxed">{c.description}</p>
              <div className="flex items-center gap-2 text-[10px] lg:text-xs text-[#5F6368] pt-3 lg:pt-4 border-t border-slate-100 mt-auto">
                <Icons.Complaint />
                <span>Ticket #{c.id.slice(-4)}</span>
                <span className="mx-0.5">•</span>
                <span>{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
          {active.length === 0 && <EmptyState label="Everything looks good! No active requests." />}
        </div>
      </section>

      {resolved.length > 0 && (
        <section>
          <h3 className="text-lg lg:text-xl font-medium mb-4 lg:mb-6 px-1">Resolved History</h3>
          <div className="space-y-3 lg:space-y-4">
            {resolved.map((c: any) => (
              <div key={c.id} className="bg-white p-4 lg:p-6 rounded-[20px] lg:rounded-[24px] border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-blue-200 transition-all shadow-sm">
                <div className="flex gap-3 lg:gap-4 items-center min-w-0">
                  <div className="p-2 lg:p-3 bg-green-50 text-green-600 rounded-full shrink-0"><Icons.CheckIcon /></div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm lg:text-base text-[#202124] truncate">{c.description}</p>
                    <p className="text-[10px] lg:text-xs text-[#5F6368]">Fixed by {c.workerName || 'Staff'}</p>
                  </div>
                </div>
                {!c.rating ? (
                  <button 
                    onClick={() => {
                      const r = prompt('Rate service (1-5)?');
                      if (r) onSubmitFeedback(c.id, Number(r), 'Completed');
                    }}
                    className="w-full sm:w-auto text-xs lg:text-sm font-medium text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-full border border-blue-200 active:scale-95 transition-transform"
                  >
                    Rate Service
                  </button>
                ) : (
                  <div className="flex items-center gap-1 self-end sm:self-center bg-slate-50 px-3 py-1.5 rounded-full">
                    {[1,2,3,4,5].map(star => <Icons.Star key={star} fill={star <= (c.rating || 0)} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const AdminDashboard = ({ complaints }: any) => {
  const stats = {
    total: complaints.length,
    unassigned: complaints.filter((c: any) => c.status === ComplaintStatus.PENDING).length,
    overdue: complaints.filter((c: any) => c.priority === Priority.URGENT && c.status !== ComplaintStatus.COMPLETED).length,
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        <MetricCard label="Tickets" value={stats.total} trend="Total requests" color="blue" />
        <MetricCard label="Queue" value={stats.unassigned} trend="Awaiting dispatch" color="orange" />
        <MetricCard label="Urgent" value={stats.overdue} trend="High priority action" color="red" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <Card className="flex flex-col h-[380px] lg:h-[450px]">
          <h3 className="text-base lg:text-lg font-medium mb-6">Service Distribution</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Electrical', count: complaints.filter((c: any) => c.category === Category.ELECTRICAL).length },
                { name: 'Plumbing', count: complaints.filter((c: any) => c.category === Category.PLUMBING).length },
                { name: 'Cleaning', count: complaints.filter((c: any) => c.category === Category.CLEANING).length },
                { name: 'Lifts', count: complaints.filter((c: any) => c.category === Category.LIFT).length },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#5F6368' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#5F6368' }} />
                <Tooltip cursor={{ fill: '#F8F9FA' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#1A73E8" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col h-[380px] lg:h-[450px]">
          <h3 className="text-base lg:text-lg font-medium mb-6">Staff Monitor</h3>
          <div className="space-y-4 overflow-y-auto pr-2">
            {MOCK_USERS.filter(u => u.role === UserRole.WORKER).map(w => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase text-sm">{w.name[0]}</div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs lg:text-sm truncate text-slate-900">{w.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{w.workerType}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Online</span>
                  <p className="text-[9px] text-slate-400 mt-1">{complaints.filter((c: any) => c.workerId === w.id && c.status !== ComplaintStatus.COMPLETED).length} tasks</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const WorkerDashboard = ({ user, complaints, onUpdateStatus }: any) => {
  const myTasks = complaints.filter((c: any) => c.workerId === user.id);
  const current = myTasks.find((c: any) => c.status === ComplaintStatus.IN_PROGRESS);
  const queue = myTasks.filter((c: any) => c.status === ComplaintStatus.ASSIGNED);

  return (
    <div className="space-y-6 lg:space-y-8 max-w-4xl mx-auto">
      <div className="bg-[#1a73e8] text-white p-6 lg:p-10 rounded-[28px] lg:rounded-[40px] shadow-xl shadow-blue-200 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-lg lg:text-2xl font-light mb-1">Worker Console</h2>
          <h3 className="text-3xl lg:text-4xl font-medium">{user.name}</h3>
          <div className="mt-4 flex items-center gap-2 text-sm bg-white/10 w-fit px-3 py-1 rounded-full border border-white/20">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Active • {user.workerType}
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
      </div>

      {current ? (
        <section className="bg-white border-2 border-blue-600 p-6 lg:p-8 rounded-[24px] lg:rounded-[32px] relative overflow-hidden shadow-lg animate-in slide-in-from-bottom duration-300">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-blue-600 text-white text-[9px] lg:text-[10px] font-bold uppercase tracking-widest rounded-bl-xl">Work In Progress</div>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div className="min-w-0">
              <p className="text-[10px] lg:text-xs text-slate-500 uppercase tracking-widest mb-1 font-bold">Resident at {current.unitNumber}</p>
              <h4 className="text-xl lg:text-2xl font-medium text-[#202124] break-words leading-tight">{current.description}</h4>
            </div>
            <PriorityChip priority={current.priority} />
          </div>
          <button 
            onClick={() => onUpdateStatus(current.id, ComplaintStatus.COMPLETED)}
            className="w-full py-3.5 lg:py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl lg:rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95"
          >
            <Icons.CheckIcon />
            Complete Mission
          </button>
        </section>
      ) : (
        <div className="bg-slate-50 border-2 border-slate-200 border-dashed p-12 text-center rounded-[24px] lg:rounded-[32px]">
          <p className="text-slate-500 italic text-sm">No task in progress. Grab one from your queue!</p>
        </div>
      )}

      <section>
        <h4 className="text-lg font-medium mb-4 lg:mb-6 px-1">Job Queue ({queue.length})</h4>
        <div className="space-y-3 lg:space-y-4">
          {queue.map((c: any) => (
            <div key={c.id} className="bg-white p-5 lg:p-6 rounded-[20px] lg:rounded-[24px] border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-shadow active:bg-slate-50">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold tracking-tight">Flat {c.unitNumber} • {new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                <p className="font-medium text-sm lg:text-base text-[#202124] leading-relaxed">{c.description}</p>
              </div>
              <button 
                onClick={() => onUpdateStatus(c.id, ComplaintStatus.IN_PROGRESS)}
                className="w-full sm:w-auto bg-blue-50 text-blue-600 px-8 py-2.5 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors shadow-sm"
              >
                Accept
              </button>
            </div>
          ))}
          {queue.length === 0 && !current && <EmptyState label="Queue is clear. Enjoy your break!" />}
        </div>
      </section>
    </div>
  );
};

const ComplaintsListView = ({ user, complaints, onAssign, onUpdateStatus }: any) => (
  <div className="bg-white rounded-[24px] lg:rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
    {/* Desktop Table */}
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-[#F8F9FA] text-[#5F6368] text-[11px] lg:text-[12px] uppercase tracking-wider font-semibold border-b border-slate-200">
          <tr>
            <th className="px-6 lg:px-8 py-4 lg:py-5">Description</th>
            <th className="px-6 lg:px-8 py-4 lg:py-5">Unit</th>
            <th className="px-6 lg:px-8 py-4 lg:py-5">Priority</th>
            <th className="px-6 lg:px-8 py-4 lg:py-5">Status</th>
            <th className="px-6 lg:px-8 py-4 lg:py-5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {complaints.map((c: any) => (
            <tr key={c.id} className="hover:bg-[#F8F9FA] transition-colors">
              <td className="px-6 lg:px-8 py-5 lg:py-6">
                <p className="text-sm font-medium text-[#202124] line-clamp-1">{c.description}</p>
                <p className="text-[10px] text-[#5F6368] mt-1 uppercase font-bold">{c.category}</p>
              </td>
              <td className="px-6 lg:px-8 py-5 lg:py-6 text-sm text-[#5F6368]">{c.unitNumber}</td>
              <td className="px-6 lg:px-8 py-5 lg:py-6"><PriorityChip priority={c.priority} /></td>
              <td className="px-6 lg:px-8 py-5 lg:py-6"><StatusChip status={c.status} /></td>
              <td className="px-6 lg:px-8 py-5 lg:py-6 text-right">
                <ComplaintActions user={user} complaint={c} onAssign={onAssign} onUpdateStatus={onUpdateStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile Card Layout */}
    <div className="md:hidden divide-y divide-slate-100">
      {complaints.map((c: any) => (
        <div key={c.id} className="p-4 flex flex-col gap-4">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Unit {c.unitNumber} • {c.category}</p>
              <h4 className="text-sm font-medium text-[#202124] leading-relaxed line-clamp-3">{c.description}</h4>
            </div>
            <StatusChip status={c.status} />
          </div>
          <div className="flex justify-between items-center pt-2 gap-2">
            <PriorityChip priority={c.priority} />
            <div className="flex-1 text-right">
              <ComplaintActions user={user} complaint={c} onAssign={onAssign} onUpdateStatus={onUpdateStatus} />
            </div>
          </div>
        </div>
      ))}
    </div>

    {complaints.length === 0 && (
      <div className="p-20 text-center">
        <div className="mx-auto w-16 h-16 text-slate-100 mb-4"><Icons.Complaint /></div>
        <p className="text-slate-400 text-sm font-medium">No results to show.</p>
      </div>
    )}
  </div>
);

// --- Component Fragments ---

const ComplaintActions = ({ user, complaint, onAssign, onUpdateStatus }: any) => {
  if (user.role === UserRole.ADMIN && complaint.status === ComplaintStatus.PENDING) {
    return (
      <select 
        onChange={(e) => onAssign(complaint.id, e.target.value)}
        className="w-full sm:w-auto bg-white border border-slate-200 text-[10px] lg:text-xs rounded-lg px-2 lg:px-3 py-1.5 outline-none hover:border-blue-500 shadow-sm appearance-none"
      >
        <option value="">Dispatch...</option>
        {MOCK_USERS.filter(u => u.role === UserRole.WORKER).map(w => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>
    );
  }
  if (user.role === UserRole.WORKER && complaint.status === ComplaintStatus.ASSIGNED) {
    return (
      <button 
        onClick={() => onUpdateStatus(complaint.id, ComplaintStatus.IN_PROGRESS)} 
        className="text-[10px] lg:text-xs font-bold text-blue-600 px-4 py-1.5 bg-blue-50 rounded-full hover:bg-blue-100 shadow-sm"
      >
        Grab Task
      </button>
    );
  }
  if (complaint.status === ComplaintStatus.COMPLETED) {
    return <span className="text-[10px] lg:text-xs text-green-600 font-bold uppercase tracking-widest px-2 py-1 bg-green-50 rounded-md">Resolved</span>;
  }
  return <span className="text-[10px] text-slate-300 font-medium italic">Handled</span>;
};

const CommunityView = ({ users }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 max-w-7xl mx-auto">
    {users.map((u: any) => (
      <Card key={u.id} className="flex items-center gap-4 hover:shadow-lg transition-all border-slate-100">
        <div className="w-12 h-12 lg:w-14 lg:h-14 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg lg:text-xl shadow-inner">{u.name[0]}</div>
        <div className="min-w-0">
          <h4 className="font-medium text-slate-900 text-sm lg:text-base truncate leading-none">{u.name}</h4>
          <p className="text-[10px] lg:text-xs text-slate-500 my-1.5 truncate">{u.email}</p>
          <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg text-slate-500">{u.role}</span>
        </div>
      </Card>
    ))}
  </div>
);

const InsightsView = ({ complaints }: any) => (
  <Card className="max-w-4xl mx-auto h-[400px] lg:h-[600px] flex flex-col p-6 lg:p-10">
    <h3 className="text-lg lg:text-xl font-medium mb-8 text-center">Service Performance</h3>
    <div className="flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[
              { name: 'Pending', value: complaints.filter((c: any) => c.status === ComplaintStatus.PENDING).length },
              { name: 'Doing', value: complaints.filter((c: any) => c.status === ComplaintStatus.IN_PROGRESS || c.status === ComplaintStatus.ASSIGNED).length },
              { name: 'Fixed', value: complaints.filter((c: any) => c.status === ComplaintStatus.COMPLETED).length },
            ]}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            paddingAngle={6}
            dataKey="value"
            animationBegin={0}
            animationDuration={1500}
          >
            <Cell fill="#F87171" stroke="none" />
            <Cell fill="#60A5FA" stroke="none" />
            <Cell fill="#34D399" stroke="none" />
          </Pie>
          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
    <div className="flex justify-center gap-6 pt-6 text-[10px] lg:text-xs font-bold uppercase tracking-wider">
      <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-400 rounded-full"></span> Pending</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-400 rounded-full"></span> In Work</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-400 rounded-full"></span> Fixed</div>
    </div>
  </Card>
);

const LoginView = ({ onLogin }: { onLogin: (u: User) => void }) => (
  <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
    <div className="bg-white rounded-[32px] p-8 lg:p-12 w-full max-w-md shadow-2xl shadow-slate-200 border border-white">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-[#1a73e8] rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-blue-300/50 mb-6">A</div>
        <h1 className="text-2xl lg:text-3xl font-normal text-slate-900">AptCare Terminal</h1>
        <p className="text-slate-500 mt-2 text-sm font-medium">Community Service Management</p>
      </div>
      
      <div className="space-y-3 lg:space-y-4 max-h-[50vh] overflow-y-auto px-1 scrollbar-hide">
        {MOCK_USERS.map(u => (
          <button
            key={u.id}
            onClick={() => onLogin(u)}
            className="w-full flex items-center gap-4 p-4 lg:p-5 rounded-2xl border border-slate-50 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group active:scale-95"
          >
            <div className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center font-bold text-base lg:text-lg shadow-sm ${
              u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' :
              u.role === UserRole.WORKER ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {u.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm lg:text-base group-hover:text-blue-700 truncate">{u.name}</p>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{u.role} {u.unitNumber ? `• FLAT ${u.unitNumber}` : ''}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// --- Styled Components ---

const SidebarLink = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-full transition-all text-sm font-medium ${
      active ? 'bg-[#E8F0FE] text-[#1A73E8] shadow-sm' : 'text-[#5F6368] hover:bg-[#F1F3F4]'
    }`}
  >
    <span className={active ? 'text-[#1A73E8]' : 'text-[#5F6368]'}>{icon}</span>
    {label}
  </button>
);

const MobileNavLink = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 p-2 transition-all min-w-[70px] ${
      active ? 'text-[#1A73E8]' : 'text-[#5F6368]'
    }`}
  >
    <div className={`w-12 h-8 flex items-center justify-center rounded-2xl transition-all ${active ? 'bg-[#E8F0FE]' : 'hover:bg-slate-100'}`}>
      {icon}
    </div>
    <span className={`text-[10px] tracking-tight ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
  </button>
);

const MetricCard = ({ label, value, trend, color }: any) => {
  const themes = {
    blue: 'border-blue-100 bg-blue-50/30 text-blue-700',
    red: 'border-red-100 bg-red-50/30 text-red-700',
    orange: 'border-orange-100 bg-orange-50/30 text-orange-700',
  };
  return (
    <div className={`p-6 lg:p-8 rounded-[28px] border ${themes[color as keyof typeof themes]} shadow-sm flex flex-col`}>
      <p className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-4xl lg:text-5xl font-medium mb-4 font-roboto">{value}</p>
      <p className="text-[10px] lg:text-xs font-bold opacity-70 mt-auto truncate">{trend}</p>
    </div>
  );
};

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white p-5 lg:p-8 rounded-[24px] lg:rounded-[32px] border border-slate-200 shadow-sm flex flex-col ${className}`}>
    {children}
  </div>
);

const EmptyState = ({ label }: any) => (
  <div className="w-full py-12 px-6 border-2 border-dashed border-slate-100 rounded-[32px] text-center bg-slate-50/30">
    <p className="text-slate-400 italic text-sm font-medium">{label}</p>
  </div>
);

const StatusChip = ({ status }: { status: ComplaintStatus }) => {
  const colors = {
    [ComplaintStatus.PENDING]: 'bg-red-50 text-red-600 border-red-100',
    [ComplaintStatus.ASSIGNED]: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    [ComplaintStatus.IN_PROGRESS]: 'bg-blue-50 text-blue-600 border-blue-100',
    [ComplaintStatus.COMPLETED]: 'bg-green-50 text-green-700 border-green-100',
  };
  return <span className={`px-3 lg:px-4 py-1.5 rounded-full text-[9px] lg:text-[10px] font-black uppercase tracking-widest border ${colors[status]} shrink-0`}>
    {status === ComplaintStatus.IN_PROGRESS ? 'Ongoing' : status.replace('_', ' ')}
  </span>;
};

const PriorityChip = ({ priority }: { priority: Priority }) => {
  const colors = {
    [Priority.LOW]: 'bg-slate-100 text-slate-500',
    [Priority.MEDIUM]: 'bg-blue-100 text-blue-600',
    [Priority.HIGH]: 'bg-orange-100 text-orange-700',
    [Priority.URGENT]: 'bg-red-600 text-white animate-pulse shadow-md',
  };
  return <span className={`px-3 lg:px-4 py-1.5 rounded-full text-[9px] lg:text-[10px] font-black uppercase tracking-widest ${colors[priority]} shrink-0`}>
    {priority}
  </span>;
};

export default App;
