import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Ship, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  User as UserIcon
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SidebarLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, isAdmin, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: t('Dashboard'), path: '/', icon: LayoutDashboard, show: isAdmin },
    { name: t('POS Module'), path: '/pos', icon: ShoppingCart, show: true },
    { name: t('Inventory'), path: '/inventory', icon: Package, show: true },
    { name: t('Containers'), path: '/containers', icon: Ship, show: isAdmin },
    { name: t('Products'), path: '/products', icon: Settings, show: isAdmin },
    { name: t('Reports'), path: '/reports', icon: BarChart3, show: isAdmin },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans lg:flex-row">
      <aside className={cn(
        "fixed inset-y-0 start-0 z-50 w-64 bg-white flex flex-col transition-transform duration-300 border-e border-slate-200 lg:static lg:translate-x-0 lg:z-0",
        !isOpen && "-translate-x-full rtl:translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <img src="https://drive.google.com/thumbnail?id=1YXwxPZklx6AQDdW0mAz9TIL3jR7a5CnT&sz=w500" referrerPolicy="no-referrer" alt="Elconekt Systems" className="h-8 w-auto object-contain" />
            </div>
            <button 
              className="lg:hidden text-slate-400 hover:text-slate-600 focus:outline-none"
              onClick={() => setIsOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
            {navItems.filter(item => item.show).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border border-transparent",
                  isActive 
                    ? "bg-blue-50 text-blue-700 border-blue-100" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
                onClick={() => setIsOpen(false)}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={18} className={cn("transition-opacity", isActive ? "text-blue-600" : "text-slate-400")} />
                    {item.name}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 mt-auto border-t border-slate-100">
            <div className="flex items-center gap-3 px-2 mb-6">
              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                <UserIcon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{role?.replace('_', ' ')}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
            >
              <LogOut size={18} />
              {t('Sign Out')}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-slate-50 w-full min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <button 
               className="lg:hidden p-2 text-slate-500 hover:text-slate-800 focus:outline-none"
               onClick={() => setIsOpen(true)}
             >
               <Menu size={20} />
             </button>
             <h2 className="text-lg font-semibold text-slate-800 tracking-tight leading-none">{t('System Terminal')}</h2>
          </div>
          <div className="flex items-center gap-4">
             <button
               onClick={toggleLanguage}
               className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors font-mono"
             >
               {language === 'en' ? 'عربي' : 'English'}
             </button>
             <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               Cloud Secure
             </div>
          </div>
        </header>
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
