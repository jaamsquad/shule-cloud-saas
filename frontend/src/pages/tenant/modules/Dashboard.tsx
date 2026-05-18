import { 
    User, Briefcase, DollarSign, ChevronLeft, ChevronRight, Gift, 
    Frown, Calendar as CalendarIcon, Smartphone, Monitor 
} from "lucide-react";

export default function Dashboard() {
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            
            {/* Top 4 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-[#4e4bb2] rounded-3xl p-6 text-white shadow-sm flex flex-col justify-between h-36">
                    <h3 className="font-bold text-sm tracking-wide">Total Students</h3>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-3">
                            <User className="w-8 h-8 opacity-80" strokeWidth={1.5} />
                            <span className="text-sm opacity-80">This Month</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-4xl font-bold">1</span>
                            <span className="text-sm font-medium opacity-90">1</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#8b91db] rounded-3xl p-6 text-white shadow-sm flex flex-col justify-between h-36">
                    <h3 className="font-bold text-sm tracking-wide">Total Employees</h3>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-3">
                            <Briefcase className="w-8 h-8 opacity-80" strokeWidth={1.5} />
                            <span className="text-sm opacity-80">This Month</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-4xl font-bold">1</span>
                            <span className="text-sm font-medium opacity-90">1</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#ff808b] rounded-3xl p-6 text-white shadow-sm flex flex-col justify-between h-36">
                    <h3 className="font-bold text-sm tracking-wide">Revenue</h3>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-3">
                            <DollarSign className="w-8 h-8 opacity-80" strokeWidth={1.5} />
                            <span className="text-sm opacity-80">This Month</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-4xl font-bold">0</span>
                            <span className="text-sm font-medium opacity-90">$ 0</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#6b8cff] rounded-3xl p-6 text-white shadow-sm flex flex-col justify-between h-36">
                    <h3 className="font-bold text-sm tracking-wide">Total Profit</h3>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-3">
                            <DollarSign className="w-8 h-8 opacity-80" strokeWidth={1.5} />
                            <span className="text-sm opacity-80">This Month</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-4xl font-bold">0</span>
                            <span className="text-sm font-medium opacity-90">$ 0</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Banners */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 bg-[#ffe7e9] rounded-2xl p-6 flex justify-between items-center shadow-sm relative overflow-hidden">
                    <div className="z-10 relative">
                        <h3 className="text-[#ff5e6c] font-bold text-lg mb-1">Welcome to Admin Dashboard</h3>
                        <p className="text-gray-600 font-medium">
                            Your Account is not Verified yet!<br />
                            Please Verify your email address. <a href="#" className="text-[#5C67F2] hover:underline">Verify now!</a>
                        </p>
                    </div>
                    {/* Mock Illustration */}
                    <div className="w-32 h-32 absolute right-8 -bottom-4 bg-white/40 rounded-full flex items-center justify-center pointer-events-none">
                       <User className="w-16 h-16 text-[#ff5e6c] opacity-50" />
                    </div>
                </div>

                <div className="bg-[#e9efff] rounded-2xl p-6 flex justify-between items-center shadow-sm">
                    <div>
                        <div className="flex gap-1 mb-1">
                            {[1,2,3,4,5].map(i => <svg key={i} className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                        </div>
                        <h3 className="text-[#3a3f9e] font-bold text-lg mb-1">Review & earn</h3>
                        <p className="text-gray-600 text-xs font-medium w-48">
                            Receive $10 as a reward plus Chance to win a Desktop plan.
                        </p>
                    </div>
                    <Gift className="w-12 h-12 text-[#5C67F2] opacity-70" strokeWidth={1.5} />
                </div>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column (Main) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Statistics Cards */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[#8b91db] font-bold">Statistics</h3>
                            <ChevronLeft className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" />
                        </div>
                        
                        {/* Mock Chart 1 */}
                        <div className="flex justify-center gap-4 mb-4 text-xs font-bold text-gray-500">
                            <div className="flex items-center gap-1"><div className="w-8 h-3 bg-[#ff808b] rounded-sm"></div> Expenses</div>
                            <div className="flex items-center gap-1"><div className="w-8 h-3 bg-[#6b8cff] rounded-sm"></div> Income</div>
                        </div>
                        <div className="w-full h-40 border-l border-b border-gray-200 relative mb-10">
                            <div className="absolute -left-6 bottom-0 text-[10px] text-gray-400">-0.2</div>
                            <div className="absolute -left-6 top-1/2 text-[10px] text-gray-400">0.4</div>
                            <div className="absolute -left-6 top-0 text-[10px] text-gray-400">1.0</div>
                            {/* Line */}
                            <div className="absolute bottom-6 left-0 w-full h-[2px] bg-[#ff808b] flex justify-between items-center">
                                {[1,2,3,4,5,6].map(i => <div key={i} className="w-2 h-2 rounded-full bg-[#ff808b]"></div>)}
                            </div>
                        </div>

                        {/* Mock Chart 2 */}
                        <div className="flex justify-center gap-4 mb-4 text-xs font-bold text-gray-500">
                            <div className="flex items-center gap-1"><div className="w-8 h-3 bg-[#6b8cff] rounded-sm"></div> Students</div>
                        </div>
                        <div className="w-full h-40 border-l border-b border-gray-200 relative">
                            <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">4 West</div>
                            {/* Bar */}
                            <div className="absolute bottom-0 left-0 w-full h-24 bg-[#6b8cff]"></div>
                            
                            {/* X-Axis labels */}
                            <div className="absolute -bottom-6 left-0 w-full flex justify-between text-[10px] text-gray-400 px-2">
                                <span>0</span><span>0.1</span><span>0.2</span><span>0.3</span><span>0.4</span><span>0.5</span><span>0.6</span><span>0.7</span><span>0.8</span><span>0.9</span><span>1.0</span>
                            </div>
                        </div>
                        <div className="h-6"></div>
                    </div>

                    {/* Today Absent Students */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[#ff5e6c] font-bold">Today Absent Students</h3>
                            <ChevronLeft className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" />
                        </div>
                        <div className="flex flex-col items-center justify-center py-6 text-[#ff5e6c]">
                            <Frown className="w-8 h-8 mb-2 opacity-50" strokeWidth={1.5} />
                            <p className="font-medium text-sm">Attendance Not Marked Yet !</p>
                        </div>
                    </div>

                    {/* Today Present Employees */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[#6b8cff] font-bold">Today Present Employees</h3>
                            <ChevronLeft className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" />
                        </div>
                        <div className="flex flex-col items-center justify-center py-6 text-[#ff5e6c]">
                            <Frown className="w-8 h-8 mb-2 opacity-50" strokeWidth={1.5} />
                            <p className="font-medium text-sm">Attendance Not Marked Yet !</p>
                        </div>
                    </div>

                    {/* New Admissions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[#8b91db] font-bold">New Admissions</h3>
                            <ChevronLeft className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" />
                        </div>
                        <div className="flex flex-col items-center py-4 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full border-4 border-[#8b91db]/30 flex items-center justify-center mb-2 overflow-hidden">
                                <div className="w-full h-full bg-[#1e293b] flex flex-col items-center pt-2">
                                    <div className="w-5 h-5 bg-[#fcd34d] rounded-full"></div>
                                    <div className="w-10 h-8 bg-[#5C67F2] mt-1 rounded-t-lg"></div>
                                </div>
                            </div>
                            <p className="text-xs font-bold text-gray-500 mb-0.5">S17046124</p>
                            <p className="text-sm font-bold text-gray-800 leading-tight">Muzamil mohamed</p>
                            <p className="text-xs font-medium text-gray-500">4 West</p>
                        </div>
                    </div>
                </div>

                {/* Right Column (Sidebar) */}
                <div className="space-y-6">
                    
                    {/* Estimated Fee */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                        <h3 className="text-gray-700 font-bold mb-6 text-sm">Estimated Fee This Month</h3>
                        <p className="text-[#ff5e6c] text-xs font-bold mb-1 flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full border border-[#ff5e6c]"></span> Estimation
                        </p>
                        <h2 className="text-[#ff5e6c] text-2xl font-bold tracking-tight mb-8">$ 44,550</h2>
                        
                        <div className="w-32 h-32 rounded-full border-[16px] border-gray-100 mx-auto mb-8"></div>
                        
                        <div className="flex justify-between border-t border-gray-100 pt-6">
                            <div className="font-bold text-lg text-gray-800">$ 0</div>
                            <div className="font-bold text-lg text-gray-800">$ 44,550</div>
                        </div>
                    </div>

                    {/* Free SMS Gateway Banner */}
                    <div className="bg-[#5654a8] rounded-2xl p-6 text-white shadow-sm flex items-center justify-between relative overflow-hidden">
                        <div className="z-10">
                            <h3 className="font-bold text-lg mb-1">Free SMS Gateway</h3>
                            <p className="text-sm text-indigo-200">Send Unlimited Free SMS<br/>on Mobile Numbers.</p>
                        </div>
                        <Smartphone className="w-16 h-16 text-white/20 absolute right-4 bottom-4" />
                    </div>

                    {/* Quick Stats List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Today Present Students</span>
                            <span className="text-sm font-bold text-[#6b8cff]">0%</span>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Today Present Employees</span>
                            <span className="text-sm font-bold text-[#ff5e6c]">0%</span>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">This Month Fee Collection</span>
                            <span className="text-sm font-bold text-[#5C67F2]">0%</span>
                        </div>
                    </div>

                    {/* Desktop Version Banner */}
                    <div className="bg-[#ff808b] rounded-2xl p-6 text-white shadow-sm flex items-center justify-between relative overflow-hidden">
                        <div className="z-10 w-full">
                            <h3 className="font-bold text-lg mb-1">Desktop Version</h3>
                            <p className="text-xs text-white/80 mb-4">*Download & Install eSkooly<br/>on your PC.</p>
                            <div className="flex gap-2">
                                <button className="bg-white text-[#ff808b] text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-1"><Monitor className="w-3 h-3" /> Download</button>
                                <button className="bg-white text-[#ff808b] text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-1"><Monitor className="w-3 h-3" /> Download</button>
                            </div>
                        </div>
                    </div>

                    {/* Calendar Widget */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <button className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
                            <div className="text-center">
                                <h3 className="text-[#ff5e6c] font-bold text-sm">MAY , 2026</h3>
                                <p className="text-[#ff5e6c] text-[10px] font-bold opacity-80">THU MAY 14 2026</p>
                            </div>
                            <button className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                <div key={d} className={`text-[9px] font-bold ${d === 'SUN' || d === 'SAT' ? 'text-[#ff5e6c]' : 'text-[#8b91db]'}`}>{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-[#8b91db]">
                            <div className="py-1">26</div><div className="py-1">27</div><div className="py-1">28</div><div className="py-1">29</div><div className="py-1">30</div><div className="py-1 text-[#ff5e6c]">1</div><div className="py-1 text-[#ff5e6c]">2</div>
                            <div className="py-1 text-[#ff5e6c]">3</div><div className="py-1">4</div><div className="py-1">5</div><div className="py-1">6</div><div className="py-1">7</div><div className="py-1">8</div><div className="py-1 text-[#ff5e6c]">9</div>
                            <div className="py-1 text-[#ff5e6c]">10</div><div className="py-1">11</div><div className="py-1">12</div><div className="py-1">13</div>
                            <div className="py-1 border border-[#ff5e6c] text-[#ff5e6c] bg-[#ff5e6c]/5 font-bold">14</div>
                            <div className="py-1">15</div><div className="py-1 text-[#ff5e6c]">16</div>
                            <div className="py-1 text-[#ff5e6c]">17</div><div className="py-1">18</div><div className="py-1">19</div><div className="py-1">20</div><div className="py-1">21</div><div className="py-1">22</div><div className="py-1 text-[#ff5e6c]">23</div>
                            <div className="py-1 text-[#ff5e6c]">24</div><div className="py-1">25</div><div className="py-1">26</div><div className="py-1">27</div><div className="py-1">28</div><div className="py-1">29</div><div className="py-1 text-[#ff5e6c]">30</div>
                            <div className="py-1 text-[#ff5e6c]">31</div><div className="py-1">1</div><div className="py-1">2</div><div className="py-1">3</div><div className="py-1">4</div><div className="py-1">5</div><div className="py-1 text-[#ff5e6c]">6</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
