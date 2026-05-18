import { Home, Search, Printer, FileText, Download, RotateCcw, Trash2, ChevronDown, Calendar, Loader2 } from "lucide-react";
import { useItems } from "@/hooks/useItems";

export default function AccountStatement() {
    const { items: income, isLoading: loadingIncome } = useItems("income");
    const { items: expenses, isLoading: loadingExpenses } = useItems("expenses");

    const isLoading = loadingIncome || loadingExpenses;

    // Combine and sort by date
    const statement = [
        ...income.map((i: any) => ({ ...i, type: 'income' })),
        ...expenses.map((e: any) => ({ ...e, type: 'expense' }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalIncome = income.reduce((acc: number, i: any) => acc + (parseFloat(i.amount) || 0), 0);
    const totalExpense = expenses.reduce((acc: number, e: any) => acc + (parseFloat(e.amount) || 0), 0);
    const netBalance = totalIncome - totalExpense;

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-lg mr-2">Accounts</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">
                    - Account statement
                </span>
            </div>

            <div className="p-6 pt-0 w-full mt-4">
                
                {/* Filters & Actions Bar */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-wrap items-center gap-6">
                    {/* Date Picker Pill */}
                    <div className="bg-[#5C67F2] text-white px-6 py-2.5 rounded-full flex items-center gap-3 shadow-md cursor-pointer hover:bg-[#4a54c4] transition-colors">
                        <Calendar className="w-5 h-5" />
                        <span className="font-bold text-sm">May 1, 2026 - May 15, 2026</span>
                        <ChevronDown className="w-4 h-4" />
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-5 bg-gray-200 rounded-full relative cursor-pointer">
                                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                            </div>
                            <span className="text-sm font-bold text-gray-600">Show References</span>
                        </div>

                        <button className="h-10 px-6 border-2 border-[#5C67F2] text-[#5C67F2] font-bold rounded-xl hover:bg-[#5C67F2] hover:text-white transition-all flex items-center gap-2">
                            <RotateCcw className="w-4 h-4" /> Reset Profit
                        </button>

                        <button className="h-10 px-6 border-2 border-[#ff5e6c] text-[#ff5e6c] font-bold rounded-xl hover:bg-[#ff5e6c] hover:text-white transition-all flex items-center gap-2">
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    </div>
                </div>

                {/* Main Table Area */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                        <div className="flex gap-2">
                            {['Copy', 'CSV', 'Excel', 'PDF', 'Print'].map(btn => (
                                <button key={btn} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-full transition-colors">
                                    {btn}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 font-bold">Search:</span>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className="h-10 px-4 pr-10 border border-gray-200 rounded-full focus:outline-none focus:border-[#5C67F2] text-sm w-64"
                                />
                                <Search className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-100/50">
                                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider rounded-l-2xl">Date</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Debt</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Credit</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider rounded-r-2xl">Net Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#5C67F2]" />
                                        </td>
                                    </tr>
                                ) : statement.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                                            No data available in table
                                        </td>
                                    </tr>
                                ) : (
                                    statement.map((row: any, idx) => (
                                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors text-sm text-gray-600 font-medium">
                                            <td className="px-6 py-4">{new Date(row.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">{row.description}</td>
                                            <td className="px-6 py-4 text-rose-500">{row.type === 'expense' ? `$ ${row.amount}` : '-'}</td>
                                            <td className="px-6 py-4 text-emerald-500">{row.type === 'income' ? `$ ${row.amount}` : '-'}</td>
                                            <td className="px-6 py-4 font-bold">$ {row.amount}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-gray-100 font-black text-gray-800">
                                    <td colSpan={2} className="px-6 py-4">TOTALS</td>
                                    <td className="px-6 py-4 text-rose-600">$ {totalExpense}</td>
                                    <td className="px-6 py-4 text-emerald-600">$ {totalIncome}</td>
                                    <td className="px-6 py-4 bg-gray-50/50">$ {netBalance}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="mt-8 flex justify-between items-center text-sm text-gray-500 font-bold">
                        <p>Showing {statement.length} entries</p>
                        <div className="flex gap-4">
                            <button className="text-gray-300">Previous</button>
                            <button className="text-gray-300">Next</button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
