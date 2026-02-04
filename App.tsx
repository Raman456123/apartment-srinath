
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

  // Core Actions
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
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 flex justify-around items-center z-40">
        <MobileNavLink active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Icons.Dashboard />} label="Home" />
        <MobileNavLink active={view === 'complaints'} onClick={() => setView('complaints')} icon={<Icons.Complaint />} label="Tickets" />
        {currentUser.role === UserRole.ADMIN ? (
          <MobileNavLink active={view === 'users'} onClick={() => setView('users')} icon={<Icons.Users />} label="Community" />
        ) : (
          <button onClick={handleLogout} className="flex flex-col items-center gap-1 p-2 text-[#5F6368]">
            <div className="w-5 h-5 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </div>
            <span className="text-[10px] font-medium">Exit</span>
          </button>
        )}
      </nav>

      {/* New Complaint Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] lg:rounded-[28px] w-full max-w-lg p-6 lg:p-8 shadow-2xl overflow-hidden relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 lg:top-6 lg:right-6 p-2 hover:bg-slate-100 rounded-full">✕</button>
            <h3 className="text-xl lg:text-2xl font-normal text-[#202124] mb-2">Request Maintenance</h3>
            <p className="text-sm text-[#5F6368] mb-6 lg:mb-8 text-pretty">Tell us what needs fixing. Our AI will automatically prioritize it for you.</p>
            
            <form onSubmit={raiseComplaint} className="space-y-4 lg:space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#3C4043]">What's the issue?</label>
                <textarea 
                  name="description" 
                  required 
                  className="w-full bg-[#F1F3F4] border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#1a73e8] min-h-[100px] lg:min-h-[120px] outline-none text-sm"
                  placeholder="e.g., Water leaking from the AC..."
                ></textarea>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs lg:text-sm font-medium">Category</label>
                  <select name="category" className="w-full bg-[#F1F3F4] border-none rounded-xl p-3 outline-none text-sm">
                    {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs lg:text-sm font-medium">Priority</label>
                  <select name="priority" className="w-full bg-[#F1F3F4] border-none rounded-xl p-3 outline-none text-sm">
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <button 
                disabled={isSubmitting}
                className="w-full bg-[#1a73e8] text-white py-3 lg:py-4 rounded-full font-medium hover:bg-[#1557b0] disabled:bg-slate-300 transition-colors mt-2"
              >
                {isSubmitting ? 'Analyzing...' : 'Post Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Responsive View Components ---

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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 lg:p-10 rounded-[28px] lg:rounded-[40px] border border-blue-100">
        <h2 className="text-2xl lg:text-4xl font-normal text-slate-800 mb-1 lg:mb-2 text-balance">Hello, {user.name.split(' ')[0]}</h2>
        <p className="text-sm lg:text-base text-slate-600">Your unit <span className="font-semibold text-blue-600">{user.unitNumber}</span> is looking good. You have {active.length} active maintenance requests.</p>
      </div>

      <section>
        <h3 className="text-lg lg:text-xl font-medium mb-4 lg:mb-6 flex items-center gap-2">
          Ongoing Support
          <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">{active.length}</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {active.map((c: any) => (
            <Card key={c.id}>
              <div className="flex justify-between items-start mb-3 lg:mb-4">
                <StatusChip status={c.status} />
                <PriorityChip priority={c.priority} />
              </div>
              <p className="text-sm lg:text-base text-[#202124] font-medium mb-2">{c.description}</p>
              <div className="flex items-center gap-2 text-[10px] lg:text-xs text-[#5F6368] pt-3 lg:pt-4 border-t border-slate-100">
                <Icons.Complaint />
                <span>#{c.id.slice(-4)}</span>
                <span className="mx-0.5">•</span>
                <span>{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
          {active.length === 0 && <EmptyState label="No active requests. Everything is working perfectly!" />}
        </div>
      </section>

      {resolved.length > 0 && (
        <section>
          <h3 className="text-lg lg:text-xl font-medium mb-4 lg:mb-6">Recently Resolved</h3>
          <div className="space-y-3 lg:space-y-4">
            {resolved.map((c: any) => (
              <div key={c.id} className="bg-white p-4 lg:p-6 rounded-[20px] lg:rounded-[24px] border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-blue-200 transition-colors shadow-sm">
                <div className="flex gap-3 lg:gap-4 items-center">
                  <div className="p-2 lg:p-3 bg-green-50 text-green-600 rounded-full shrink-0"><Icons.CheckIcon /></div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm lg:text-base text-[#202124] truncate">{c.description}</p>
                    <p className="text-[10px] lg:text-xs text-[#5F6368]">Resolved • {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {!c.rating ? (
                  <button 
                    onClick={() => {
                      const r = prompt('Rate service (1-5)?');
                      const f = prompt('Any feedback?');
                      if (r) onSubmitFeedback(c.id, Number(r), f);
                    }}
                    className="w-full sm:w-auto text-xs lg:text-sm font-medium text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-full border border-blue-200"
                  >
                    Rate Service
                  </button>
                ) : (
                  <div className="flex items-center gap-1 self-end sm:self-center">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <MetricCard label="System Load" value={stats.total} trend="+2 today" color="blue" />
        <MetricCard label="Awaiting Action" value={stats.unassigned} trend="-5% from last week" color="orange" />
        <MetricCard label="Urgent Alerts" value={stats.overdue} trend="Requires immediate attention" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white p-6 lg:p-8 rounded-[28px] lg:rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-base lg:text-lg font-medium mb-6">Service Health Index</h3>
          <div className="h-64 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Electric', count: complaints.filter((c: any) => c.category === Category.ELECTRICAL).length },
                { name: 'Plumbing', count: complaints.filter((c: any) => c.category === Category.PLUMBING).length },
                { name: 'Clean', count: complaints.filter((c: any) => c.category === Category.CLEANING).length },
                { name: 'Other', count: complaints.filter((c: any) => c.category === Category.OTHER).length },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip cursor={{ fill: '#F8F9FA' }} />
                <Bar dataKey="count" fill="#1A73E8" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 lg:p-8 rounded-[28px] lg:rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-base lg:text-lg font-medium mb-6">Staff Performance</h3>
          <div className="space-y-5 lg:space-y-6">
            {MOCK_USERS.filter(u => u.role === UserRole.WORKER).map(w => (
              <div key={w.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 lg:w-10 lg:h-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase text-sm">{w.name[0]}</div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs lg:text-sm truncate">{w.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{w.workerType}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] lg:text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">Active</span>
                  <p className="text-[9px] lg:text-[10px] text-slate-400 mt-0.5">{complaints.filter((c: any) => c.workerId === w.id && c.status !== ComplaintStatus.COMPLETED).length} tasks</p>
                </div>
              </div>
            ))}
          </div>
        </div>
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
      <div className="bg-[#1a73e8] text-white p-6 lg:p-10 rounded-[28px] lg:rounded-[40px] shadow-xl shadow-blue-200">
        <h2 className="text-lg lg:text-2xl font-light mb-1">Terminal</h2>
        <h3 className="text-3xl lg:text-4xl font-medium">{user.name}</h3>
        <p className="mt-3 lg:mt-4 text-blue-100 flex items-center gap-2 text-sm lg:text-base">
          <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></span>
          Ready for service • {user.workerType}
        </p>
      </div>

      {current ? (
        <section className="bg-white border-2 border-blue-600 p-6 lg:p-8 rounded-[24px] lg:rounded-[32px] relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-blue-600 text-white text-[9px] lg:text-[10px] font-bold uppercase tracking-widest rounded-bl-xl">In Progress</div>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div className="min-w-0">
              <p className="text-[10px] lg:text-xs text-slate-500 uppercase tracking-widest mb-1 font-bold">Resident at {current.unitNumber}</p>
              <h4 className="text-xl lg:text-2xl font-medium text-[#202124] break-words">{current.description}</h4>
            </div>
            <PriorityChip priority={current.priority} />
          </div>
          <button 
            onClick={() => onUpdateStatus(current.id, ComplaintStatus.COMPLETED)}
            className="w-full py-3.5 lg:py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl lg:rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <Icons.CheckIcon />
            Complete Task
          </button>
        </section>
      ) : (
        <div className="bg-slate-50 border-2 border-slate-200 border-dashed p-10 text-center rounded-[24px] lg:rounded-[32px]">
          <p className="text-slate-500 italic text-sm">No task in progress. Grab one from the queue below.</p>
        </div>
      )}

      <section>
        <h4 className="text-lg font-medium mb-4 lg:mb-6 px-1">Task Queue ({queue.length})</h4>
        <div className="space-y-3 lg:space-y-4">
          {queue.map((c: any) => (
            <div key={c.id} className="bg-white p-5 lg:p-6 rounded-[20px] lg:rounded-[24px] border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold tracking-tight">Unit {c.unitNumber} • {new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                <p className="font-medium text-sm lg:text-base text-[#202124]">{c.description}</p>
              </div>
              <button 
                onClick={() => onUpdateStatus(c.id, ComplaintStatus.IN_PROGRESS)}
                className="w-full sm:w-auto bg-blue-50 text-blue-600 px-6 py-2 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                Start
              </button>
            </div>
          ))}
          {queue.length === 0 && !current && <EmptyState label="Queue is clear. Great job today!" />}
        </div>
      </section>
    </div>
  );
};

const ComplaintsListView = ({ user, complaints, onAssign, onUpdateStatus }: any) => (
  <div className="bg-white rounded-[24px] lg:rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
    {/* Desktop View Table */}
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-[#F8F9FA] text-[#5F6368] text-[11px] lg:text-[12px] uppercase tracking-wider font-semibold border-b border-slate-200">
          <tr>
            <th className="px-6 lg:px-8 py-4 lg:py-5">Issue</th>
            <th className="px-6 lg:px-8 py-4 lg:py-5">Unit</th>
            <th className="px-6 lg:px-8 py-4 lg:py-5">Priority</th>
            <th className="px-6 lg:px-8 py-4 lg:py-5">Status</th>
            <th className="px-6 lg:px-8 py-4 lg:py-5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {complaints.map((c: any) => (
            <tr key={c.id} className="hover:bg-[#F8F9FA] transition-colors group">
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

    {/* Mobile View Card List */}
    <div className="md:hidden divide-y divide-slate-100">
      {complaints.map((c: any) => (
        <div key={c.id} className="p-4 flex flex-col gap-3">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400 mb-1">UNIT {c.unitNumber} • {c.category}</p>
              <h4 className="text-sm font-medium text-[#202124] line-clamp-2">{c.description}</h4>
            </div>
            <StatusChip status={c.status} />
          </div>
          <div className="flex justify-between items-center gap-2">
            <PriorityChip priority={c.priority} />
            <ComplaintActions user={user} complaint={c} onAssign={onAssign} onUpdateStatus={onUpdateStatus} />
          </div>
        </div>
      ))}
    </div>

    {complaints.length === 0 && (
      <div className="p-16 text-center">
        <div className="mx-auto w-12 h-12 text-slate-200 mb-4"><Icons.Complaint /></div>
        <p className="text-slate-500 text-sm">No tickets found.</p>
      </div>
    )}
  </div>
);

const ComplaintActions = ({ user, complaint, onAssign, onUpdateStatus }: any) => {
  if (user.role === UserRole.ADMIN && complaint.status === ComplaintStatus.PENDING) {
    return (
      <select 
        onChange={(e) => onAssign(complaint.id, e.target.value)}
        className="w-full sm:w-auto bg-white border border-slate-200 text-[10px] lg:text-xs rounded-lg px-2 lg:px-3 py-1.5 outline-none hover:border-blue-500 shadow-sm"
      >
        <option value="">Dispatch to...</option>
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
        className="text-[10px] lg:text-xs font-bold text-blue-600 px-3 py-1 bg-blue-50 rounded-full"
      >
        Accept Task
      </button>
    );
  }
  if (complaint.status === ComplaintStatus.COMPLETED) {
    return <span className="text-[10px] lg:text-xs text-green-600 font-bold uppercase tracking-wider">Resolved</span>;
  }
  return <span className="text-[10px] text-slate-300 font-medium italic">Processing</span>;
};

const CommunityView = ({ users }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 max-w-7xl mx-auto">
    {users.map((u: any) => (
      <div key={u.id} className="bg-white p-5 lg:p-6 rounded-[24px] lg:rounded-[28px] border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 lg:w-14 lg:h-14 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg lg:text-xl">{u.name[0]}</div>
        <div className="min-w-0">
          <h4 className="font-medium text-slate-900 text-sm lg:text-base truncate">{u.name}</h4>
          <p className="text-[10px] lg:text-xs text-slate-500 mb-2 truncate">{u.email}</p>
          <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600">{u.role}</span>
        </div>
      </div>
    ))}
  </div>
);

const InsightsView = ({ complaints }: any) => (
  <div className="space-y-6 lg:space-y-8 max-w-5xl mx-auto">
    <div className="bg-white p-6 lg:p-10 rounded-[28px] lg:rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
      <h3 className="text-lg lg:text-xl font-medium mb-6 lg:mb-10 text-center lg:text-left">Operational Distribution</h3>
      <div className="h-64 lg:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: 'Pending', value: complaints.filter((c: any) => c.status === ComplaintStatus.PENDING).length },
                { name: 'Work', value: complaints.filter((c: any) => c.status === ComplaintStatus.IN_PROGRESS || c.status === ComplaintStatus.ASSIGNED).length },
                { name: 'Done', value: complaints.filter((c: any) => c.status === ComplaintStatus.COMPLETED).length },
              ]}
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="90%"
              paddingAngle={5}
              dataKey="value"
            >
              <Cell fill="#F87171" />
              <Cell fill="#60A5FA" />
              <Cell fill="#34D399" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const LoginView = ({ onLogin }: { onLogin: (u: User) => void }) => (
  <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
    <div className="bg-white rounded-[24px] lg:rounded-[32px] p-6 lg:p-12 w-full max-w-lg shadow-xl shadow-slate-200 border border-slate-100">
      <div className="text-center mb-8 lg:mb-10">
        <div className="w-14 h-14 lg:w-16 lg:h-16 bg-[#1a73e8] rounded-2xl mx-auto flex items-center justify-center text-white text-2xl lg:text-3xl font-bold shadow-lg shadow-blue-200 mb-4 lg:mb-6">A</div>
        <h1 className="text-2xl lg:text-3xl font-normal text-slate-900">Sign in to AptCare</h1>
        <p className="text-slate-500 mt-2 text-sm">Apartment Management Terminal</p>
      </div>
      
      <div className="space-y-3 lg:space-y-4 max-h-[60vh] overflow-y-auto px-1">
        {MOCK_USERS.map(u => (
          <button
            key={u.id}
            onClick={() => onLogin(u)}
            className="w-full flex items-center gap-3 lg:gap-4 p-4 lg:p-5 rounded-2xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left group"
          >
            <div className={`w-10 h-10 lg:w-12 lg:h-12 shrink-0 rounded-full flex items-center justify-center font-bold text-base lg:text-lg shadow-sm ${
              u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' :
              u.role === UserRole.WORKER ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {u.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 text-sm lg:text-base group-hover:text-blue-600 truncate">{u.name}</p>
              <p className="text-[9px] lg:text-[10px] text-slate-400 uppercase font-bold tracking-tight">{u.role} {u.unitNumber ? `• UNIT ${u.unitNumber}` : ''}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// --- Adaptive UI Elements ---

const SidebarLink = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-full transition-all text-sm font-medium ${
      active ? 'bg-[#E8F0FE] text-[#1A73E8]' : 'text-[#5F6368] hover:bg-[#F1F3F4]'
    }`}
  >
    <span className={active ? 'text-[#1A73E8]' : 'text-[#5F6368]'}>{icon}</span>
    {label}
  </button>
);

const MobileNavLink = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 transition-colors min-w-[70px] ${
      active ? 'text-[#1A73E8]' : 'text-[#5F6368]'
    }`}
  >
    <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${active ? 'bg-[#E8F0FE]' : ''}`}>
      {icon}
    </div>
    <span className={`text-[10px] font-medium ${active ? 'font-bold' : ''}`}>{label}</span>
  </button>
);

const MetricCard = ({ label, value, trend, color }: any) => {
  const themes = {
    blue: 'border-blue-100 bg-blue-50/20 text-blue-600',
    red: 'border-red-100 bg-red-50/20 text-red-600',
    orange: 'border-orange-100 bg-orange-50/20 text-orange-600',
  };
  return (
    <div className={`p-5 lg:p-8 rounded-[24px] lg:rounded-[32px] border ${themes[color as keyof typeof themes]} shadow-sm`}>
      <p className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl lg:text-5xl font-medium mb-3 lg:mb-4">{value}</p>
      <p className="text-[10px] lg:text-xs font-medium opacity-80 line-clamp-1">{trend}</p>
    </div>
  );
};

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white p-5 lg:p-8 rounded-[24px] lg:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow ${className}`}>
    {children}
  </div>
);

const EmptyState = ({ label }: any) => (
  <div className="w-full py-10 lg:py-12 px-6 border-2 border-dashed border-slate-100 rounded-[28px] text-center">
    <p className="text-slate-400 italic text-xs lg:text-sm">{label}</p>
  </div>
);

const StatusChip = ({ status }: { status: ComplaintStatus }) => {
  const colors = {
    [ComplaintStatus.PENDING]: 'bg-red-50 text-red-700',
    [ComplaintStatus.ASSIGNED]: 'bg-yellow-50 text-yellow-700',
    [ComplaintStatus.IN_PROGRESS]: 'bg-blue-50 text-blue-700',
    [ComplaintStatus.COMPLETED]: 'bg-green-50 text-green-700',
  };
  return <span className={`px-2.5 lg:px-4 py-1 lg:py-1.5 rounded-full text-[9px] lg:text-[10px] font-bold uppercase tracking-wider ${colors[status]} shrink-0`}>
    {status === ComplaintStatus.IN_PROGRESS ? 'Doing' : status.replace('_', ' ')}
  </span>;
};

const PriorityChip = ({ priority }: { priority: Priority }) => {
  const colors = {
    [Priority.LOW]: 'bg-slate-50 text-slate-500',
    [Priority.MEDIUM]: 'bg-blue-50 text-blue-600',
    [Priority.HIGH]: 'bg-orange-50 text-orange-600',
    [Priority.URGENT]: 'bg-red-600 text-white animate-pulse shadow-md',
  };
  return <span className={`px-2.5 lg:px-4 py-1 lg:py-1.5 rounded-full text-[9px] lg:text-[10px] font-bold uppercase tracking-wider ${colors[priority]} shrink-0`}>
    {priority}
  </span>;
};

export default App;
