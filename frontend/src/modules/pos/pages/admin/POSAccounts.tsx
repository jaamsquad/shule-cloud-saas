import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import posApi from '../../lib/posApi'
import { format } from 'date-fns'
import { Search, Plus, Loader2, X } from 'lucide-react'

export default function POSAccounts() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [topupAmount, setTopupAmount] = useState(0)
  const [topupNote, setTopupNote] = useState('')

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['pos-accounts', search],
    queryFn: () => posApi.get('/accounts', { params: { search: search || undefined } }).then(r => r.data.data),
  })

  const { data: accountDetail } = useQuery({
    queryKey: ['pos-account-detail', selectedAccount?.id],
    queryFn: () => posApi.get(`/accounts/${selectedAccount.id}`).then(r => r.data.data),
    enabled: !!selectedAccount?.id,
  })

  const { mutate: topup, isPending } = useMutation({
    mutationFn: (data: any) => posApi.post(`/accounts/${selectedAccount.id}/topup`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['pos-account-detail', selectedAccount?.id] })
      toast.success('Account topped up successfully')
      setTopupAmount(0); setTopupNote('')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  })

  return (
    <div className="p-6 space-y-6 bg-gray-950 min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-white">Student Accounts</h1>
        <p className="text-gray-400 text-sm mt-0.5">Manage student store credit balances</p>
      </div>

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" placeholder="Search by name or admission no…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admission No.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Limit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {accounts.map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{a.user?.name}</p>
                    <p className="text-xs text-gray-500">{a.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{a.user?.studentId || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold text-sm ${Number(a.balance) < 0 ? 'text-red-400' : Number(a.balance) === 0 ? 'text-gray-400' : 'text-emerald-400'}`}>
                      KES {Number(a.balance).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">KES {Number(a.creditLimit).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelectedAccount(a)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 text-xs transition-colors ml-auto">
                      <Plus size={12} /> Top Up
                    </button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No student accounts found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Top-up Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-base font-bold text-white">Top Up Account</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedAccount.user?.name}</p>
              </div>
              <button onClick={() => setSelectedAccount(null)} className="text-gray-500 hover:text-white text-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-gray-400">Current Balance:</span>
              <span className={`text-lg font-bold ${Number(selectedAccount.balance) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                KES {Number(selectedAccount.balance).toLocaleString()}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Top-up Amount (KES)</label>
                <input type="number" min={1} value={topupAmount} onChange={e => setTopupAmount(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Note (optional)</label>
                <input type="text" value={topupNote} onChange={e => setTopupNote(e.target.value)} placeholder="e.g. Parent cash deposit"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            {/* Transaction history */}
            {accountDetail?.transactions?.length > 0 && (
              <div className="border-t border-gray-800 pt-3">
                <p className="text-xs text-gray-500 uppercase font-medium mb-2">Recent Transactions</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {accountDetail.transactions.slice(0, 5).map((t: any) => (
                    <div key={t.id} className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">{t.note || t.type}</span>
                      <span className={t.type === 'CREDIT' ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                        {t.type === 'CREDIT' ? '+' : '-'} KES {Number(t.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setSelectedAccount(null)} className="flex-1 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:text-white transition-colors">Cancel</button>
              <button onClick={() => topup({ amount: topupAmount, note: topupNote })} disabled={isPending || topupAmount <= 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-60">
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Top Up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
