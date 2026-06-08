import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import posApi from '../../lib/posApi'
import { Search, Sliders, ShoppingBag, Eye } from 'lucide-react'

export default function StoreProducts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const categoryFilter = searchParams.get('category') || ''

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => posApi.get('/categories').then(r => r.data.data),
  })

  const { data: products, isLoading } = useQuery({
    queryKey: ['store-products', search, categoryFilter],
    queryFn: () => posApi.get('/store/products', { params: { search: search || undefined, category: categoryFilter || undefined } }).then(r => r.data.data),
  })

  const handleCategorySelect = (id: string) => {
    if (id) setSearchParams({ category: id })
    else setSearchParams({})
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8 bg-gray-950 min-h-screen text-gray-100">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 space-y-6 shrink-0">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders size={16} /> Departments
          </h2>
          <div className="flex flex-col gap-1.5 text-sm">
            <button
              onClick={() => handleCategorySelect('')}
              className={`text-left px-3 py-2 rounded-lg transition-all ${
                !categoryFilter ? 'bg-indigo-500/10 text-indigo-400 font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              All Items
            </button>
            {cats?.map((c: any) => (
              <button
                key={c.id}
                onClick={() => handleCategorySelect(c.id)}
                className={`text-left px-3 py-2 rounded-lg transition-all ${
                  categoryFilter === c.id ? 'bg-indigo-500/10 text-indigo-400 font-semibold' : 'text-gray-400 hover:text-white'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Products Display */}
      <div className="flex-1 space-y-6">
        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search uniforms, stationery..."
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-11 pr-4 py-3 text-base text-white focus:outline-none focus:border-indigo-500 transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : products?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <ShoppingBag size={48} className="mb-4 opacity-20" />
            <p>No products found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products?.map((p: any) => {
              const prices = p.variants.map((v: any) => Number(v.price))
              const minPrice = prices.length ? Math.min(...prices) : 0
              const totalStock = p.variants.reduce((s: number, v: any) => s + v.stock, 0)
              const outOfStock = totalStock === 0

              return (
                <div key={p.id} className="bg-gray-900 border border-gray-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between overflow-hidden rounded-2xl group">
                  {/* Image banner */}
                  <div className="h-44 bg-gray-800 flex items-center justify-center overflow-hidden relative">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                    ) : (
                      <span className="text-5xl">🛍️</span>
                    )}
                    {outOfStock && (
                      <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs font-bold text-red-400 uppercase tracking-widest">
                        Out of stock
                      </span>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">{p.category?.name || 'Store Item'}</p>
                      <h3 className="font-bold text-white text-base mt-1 line-clamp-1">{p.name}</h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.description || 'Official item'}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">From</p>
                        <p className="text-indigo-400 font-extrabold text-base">KES {minPrice.toLocaleString()}</p>
                      </div>
                      <Link to={`/store/products/${p.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold transition-all">
                        <Eye size={13} /> View Details
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
