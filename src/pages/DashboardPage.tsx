import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button, Card, Badge } from '../components/UI';
import { TrendingUp, Users, DollarSign, Box, Target, ArrowUpRight, Ship, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export const DashboardPage = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const isDemo = user?.uid === 'demo-user-id';
  const { t } = useTranslation();

  useEffect(() => {
    if (isDemo) {
       setSales([
         { id: '1', totalAmount: 14500, items: [{ productId: 'p1', containerId: 'c1', quantity: 10, sellingPrice: 1450 }] },
         { id: '2', totalAmount: 8900, items: [{ productId: 'p2', containerId: 'c2', quantity: 5, sellingPrice: 1780 }] }
       ]);
       setContainers([
         { id: 'c1', name: 'CN-8902-NY', totalLandedCost: 8000 },
         { id: 'c2', name: 'CN-4431-EU', totalLandedCost: 5000 }
       ]);
       setInventory([
         { id: 'i1', containerId: 'c1', productId: 'p1', unitCost: 800, quantity: 40 },
         { id: 'i2', containerId: 'c2', productId: 'p2', unitCost: 1000, quantity: 20 }
       ]);
       setLoading(false);
       return;
    }

    const unsubSales = onSnapshot(query(collection(db, 'sales')), (s) => setSales(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubContainers = onSnapshot(query(collection(db, 'containers')), (s) => setContainers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubInv = onSnapshot(query(collection(db, 'inventory')), (s) => setInventory(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    return () => { unsubSales(); unsubContainers(); unsubInv(); };
  }, [isDemo]);

  // calculations
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  
  // Profit calculation logic: Sale Item Selling Price - Inventory Unit Cost
  let totalProfit = 0;
  sales.forEach(sale => {
    (sale.items || []).forEach((item: any) => {
      const invItem = inventory.find(i => i.containerId === item.containerId && i.productId === item.productId);
      if (invItem) {
        totalProfit += (item.sellingPrice - invItem.unitCost) * item.quantity;
      }
    });
  });

  const stats = [
    { name: t('Total Revenue', 'Total Revenue'), value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: t('Gross Profit', 'Gross Profit'), value: `$${totalProfit.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: t('Total Sales', 'Total Sales'), value: sales.length, icon: ShoppingCart, color: 'text-slate-600', bg: 'bg-slate-100' },
    { name: t('Active Containers', 'Active Containers'), value: containers.length, icon: Ship, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const containerROI = containers.map(container => {
    const containerSales = sales.flatMap(s => s.items).filter(item => item.containerId === container.id);
    const revenue = containerSales.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    const itemInventory = inventory.filter(i => i.containerId === container.id);
    const landedCost = container.totalLandedCost || 0;
    const profit = revenue - (containerSales.reduce((sum, item) => {
        const inv = itemInventory.find(i => i.productId === item.productId);
        return sum + (inv ? inv.unitCost * item.quantity : 0);
    }, 0));
    
    return {
      name: container.name,
      revenue,
      profit,
      roi: landedCost > 0 ? (profit / landedCost) * 100 : 0
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t('Executive Dashboard')}</h2>
          <p className="text-slate-500">{t('Real-time financial performance and supply chain analytics.')}</p>
        </div>
        <div className="flex gap-2">
           <Badge variant="info">Global Pulse</Badge>
           <Badge variant="success">Market High</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
            <Card className="p-6 h-full border-t-2 border-t-indigo-500/10">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <div className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                   <ArrowUpRight size={12} className="me-0.5" />
                   12.4%
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.name}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-800">{t('Revenue Performance')}</h3>
              <p className="text-xs text-slate-400">{t('Comparing profitability across active containers')}</p>
            </div>
            <select className="bg-slate-50 border border-slate-200 text-xs font-bold p-2 rounded-lg outline-none">
               <option>{t('Last 30 Days')}</option>
               <option>{t('All Time')}</option>
            </select>
          </div>
          <div className="h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={containerROI}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                 <Tooltip 
                    cursor={{ fill: '#f8fafc' }} 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                 />
                 <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name={t('Gross Revenue')} />
                 <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name={t('Net Profit')} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-800">{t('ROI Analytics')}</h3>
              <p className="text-xs text-slate-400">{t('Return on invested landed cost')}</p>
            </div>
            <Target size={20} className="text-indigo-400" />
          </div>
          <div className="space-y-8">
            {containerROI.map((data, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-600 uppercase tracking-tighter">{data.name}</span>
                  <span className="font-mono text-indigo-600 font-bold">+{data.roi.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(data.roi, 100)}%` }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                  />
                </div>
              </div>
            ))}
            {containerROI.length === 0 && (
              <div className="py-20 text-center space-y-2 opacity-40 grayscale">
                 <Box size={40} className="mx-auto" />
                 <p className="text-xs uppercase font-bold tracking-widest">{t('No Shipment Data')}</p>
              </div>
            )}
            <Button variant="outline" className="w-full mt-4 text-[11px] uppercase tracking-widest py-3 border-dashed">
               {t('Download Full Audit Trail')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
