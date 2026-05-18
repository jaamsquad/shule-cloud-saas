import { Home, Eye, Save, Mail } from "lucide-react";

export default function StaffManageLogin() {
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-lg mr-2">Employees</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">
                    - Staff Login
                </span>
            </div>

            <div className="p-6 pt-0 w-full flex flex-col lg:flex-row gap-6 mt-4">
                
                {/* Search Card */}
                <div className="w-full lg:w-80 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex-shrink-0 self-start">
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex items-center gap-2 text-xl font-bold text-gray-800 tracking-tight">
                            <span className="text-gray-400">⚲</span> Search
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="relative">
                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                Search Employee*
                            </div>
                            <input 
                                type="text" 
                                placeholder="Search Employee"
                                className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 placeholder-gray-400 text-sm" 
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                Select Role*
                            </div>
                            <select className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 bg-white appearance-none cursor-pointer text-sm">
                                <option>Select*</option>
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        <div className="text-center">
                            <button className="text-[#5C67F2] hover:underline font-bold text-sm tracking-wide">or, Reload All</button>
                        </div>
                    </div>
                </div>

                {/* Table Card */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 overflow-x-auto self-start">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-2">
                            {['Copy', 'CSV', 'Excel', 'PDF', 'Print'].map(btn => (
                                <button key={btn} className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold rounded-full transition-colors shadow-sm">{btn}</button>
                            ))}
                            <button className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold rounded-full transition-colors shadow-sm flex items-center gap-1">
                                Column visibility <span className="text-[8px]">▼</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-sm font-medium">Search:</span>
                            <input type="text" className="h-9 px-4 border border-gray-300 rounded-full focus:outline-none focus:border-[#5C67F2] w-48 text-sm" />
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl mb-4">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100/50 text-gray-600 border-b-2 border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold">ID <span className="text-gray-400 ml-1">↑↓</span></th>
                                    <th className="px-6 py-4 font-bold">Staff Name <span className="text-gray-400 ml-1">↑↓</span></th>
                                    <th className="px-6 py-4 font-bold">Role <span className="text-gray-400 ml-1">↑↓</span></th>
                                    <th className="px-6 py-4 font-bold w-48">Username <span className="text-gray-400 ml-1">↑↓</span></th>
                                    <th className="px-6 py-4 font-bold w-48">Password <span className="text-gray-400 ml-1">↑↓</span></th>
                                    <th className="px-6 py-4 font-bold text-center">Actions <span className="text-gray-400 ml-1">↑↓</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-5 text-gray-500 font-medium">243722</td>
                                    <td className="px-6 py-5 text-gray-800 font-bold">Muzamil mohamed</td>
                                    <td className="px-6 py-5 text-gray-500 font-medium">Teacher</td>
                                    <td className="px-6 py-5">
                                        <div className="relative">
                                            <div className="absolute -top-2 left-4 w-4 h-4 bg-[#868DF4] rounded-full flex items-center justify-center z-10 text-white">
                                                <UserIcon />
                                            </div>
                                            <input 
                                                type="text" 
                                                defaultValue="1661490WdrE1"
                                                className="w-full h-10 px-4 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 text-sm"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="relative">
                                            <div className="absolute -top-2 left-4 w-4 h-4 bg-[#868DF4] rounded-full flex items-center justify-center z-10 text-white">
                                                <LockIcon />
                                            </div>
                                            <input 
                                                type="password" 
                                                defaultValue="password"
                                                className="w-full h-10 px-4 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 text-sm pr-8 tracking-widest"
                                            />
                                            <Eye className="w-3.5 h-3.5 text-gray-800 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button className="text-gray-500 hover:text-[#5C67F2] transition-colors"><Save className="w-5 h-5" /></button>
                                            <button className="text-gray-500 hover:text-[#5C67F2] transition-colors"><Mail className="w-5 h-5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-500 mt-6">
                        <div>Showing 1 to 1 of 1 entries</div>
                        <div className="flex items-center gap-2">
                            <button className="text-gray-400 hover:text-gray-600 font-medium px-2">Previous</button>
                            <button className="w-8 h-8 rounded-md bg-[#868DF4] text-white font-bold flex items-center justify-center shadow-sm">1</button>
                            <button className="text-[#868DF4] hover:text-[#5C67F2] font-medium px-2">Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function UserIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    )
}

function LockIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    )
}
