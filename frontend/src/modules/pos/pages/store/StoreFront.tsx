import { Link } from 'react-router-dom'
import { ShoppingBag, ArrowRight, ShieldCheck, Truck, RefreshCcw, Shirt, BookOpen, Trophy } from 'lucide-react'

export default function StoreFront() {
  return (
    <div className="space-y-16 py-10 bg-gray-950 min-h-screen text-gray-100">
      {/* Hero Banner */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-950 to-gray-900 border border-gray-800 p-8 md:p-16 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
          {/* Decorative blur balls */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/8 rounded-full blur-3xl" />

          <div className="flex-1 space-y-6 relative z-10 text-center md:text-left">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">Official School Store</span>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
              Get Your School <br className="hidden md:inline" /> Supplies & Uniforms
            </h1>
            <p className="text-gray-400 text-sm md:text-base max-w-lg">
              Order official school uniforms, high-quality textbooks, stationery kits, and custom sports gear online. Direct pickup or classroom delivery.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Link to="/store/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xl shadow-indigo-600/20 transition-all">
                Shop Catalog <ArrowRight size={16} />
              </Link>
              <Link to="/pos/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 font-semibold transition-all">
                Cashier Portal
              </Link>
            </div>
          </div>

          <div className="flex-1 max-w-sm md:max-w-md select-none relative z-10">
            <div className="bg-gray-900/60 backdrop-blur border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <Shirt className="w-8 h-8 text-slate-400" />
                <div>
                  <p className="text-xs text-gray-500">Official Wear</p>
                  <p className="text-sm font-bold text-white">Prefect & Regular Uniforms</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-slate-400" />
                <div>
                  <p className="text-xs text-gray-500">Classroom Sets</p>
                  <p className="text-sm font-bold text-white">Full Textbooks & Exercise Kits</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-slate-400" />
                <div>
                  <p className="text-xs text-gray-500">Sportswear</p>
                  <p className="text-sm font-bold text-white">Tracksuits, Shorts & Socks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Spotlight */}
      <section className="max-w-7xl mx-auto px-4 space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Shop By Department</h2>
            <p className="text-gray-500 text-xs mt-1">Curated catalogs for quick browsing.</p>
          </div>
          <Link to="/store/products" className="text-indigo-400 text-xs font-semibold flex items-center gap-1 hover:text-indigo-300 transition-colors">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'School Uniforms', label: 'Blazers, shirts, skirts, trousers', icon: Shirt, id: '1' },
            { title: 'Books & Stationery', label: 'Exercise notebooks, textbooks, geometry kits', icon: BookOpen, id: '2' },
            { title: 'Sportswear & Badges', label: 'Tracksuits, sports socks, active shorts', icon: Trophy, id: '3' },
          ].map(c => (
            <Link
              key={c.title}
              to={`/store/products?category=${c.id}`}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-indigo-500 transition-all flex items-center gap-4 hover:-translate-y-0.5 duration-150"
            >
              <c.icon className="w-9 h-9 text-slate-400 shrink-0" />
              <div>
                <h3 className="font-bold text-white text-base">{c.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{c.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="max-w-7xl mx-auto px-4 border-t border-gray-800 pt-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400"><ShieldCheck size={20} /></div>
            <h4 className="font-bold text-white text-sm">Official Standards</h4>
            <p className="text-xs text-gray-500 max-w-xs">Verified school colors, emblems, and quality standards for all wear.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400"><Truck size={20} /></div>
            <h4 className="font-bold text-white text-sm">Flexible Pickups</h4>
            <p className="text-xs text-gray-500 max-w-xs">Pick up from the main store window, or request direct classroom delivery.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400"><RefreshCcw size={20} /></div>
            <h4 className="font-bold text-white text-sm">Easy Returns</h4>
            <p className="text-xs text-gray-500 max-w-xs">Size doesn't fit? Exchange within 7 days at the main school store office.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
