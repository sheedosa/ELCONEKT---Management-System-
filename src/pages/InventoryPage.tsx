import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { Card, Badge, Input } from '../components/UI';
import { Package, Search, Filter, History, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export const InventoryPage = () => {
  const { isAdmin, user } = useAuth();
  const { t } = useTranslation();
  const [inventory, setInventory] = useState<any[]>([]);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [containers, setContainers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInventory = async () => {
    try {
      if (user?.uid === 'demo-user-id') {
         setInventory([
           { id: 'i1', productId: 'p1', containerId: 'c1', quantity: 40, initialQuantity: 50, unitCost: 800 },
           { id: 'i2', productId: 'p2', containerId: 'c2', quantity: 5, initialQuantity: 20, unitCost: 1000 }
         ]);
         setLoading(false);
         return;
      }
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    if (user?.uid === 'demo-user-id') {
       setProducts({
         p1: { name: 'Titanium Scaffold Tubing', sku: 'TST-8992' },
         p2: { name: 'Heavy Duty Connectors', sku: 'HDC-109X' }
       });
       setContainers({
         c1: { name: 'CN-8902-NY' },
         c2: { name: 'CN-4431-EU' }
       });
       return;
    }
    // We can use firestore directly for public metadata
    const { collection, getDocs } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');
    
    const pSnap = await getDocs(collection(db, 'products'));
    const cSnap = await getDocs(collection(db, 'containers'));
    
    const pMap: any = {};
    pSnap.docs.forEach(d => pMap[d.id] = d.data());
    const cMap: any = {};
    cSnap.docs.forEach(d => cMap[d.id] = d.data());
    
    setProducts(pMap);
    setContainers(cMap);
  };

  useEffect(() => {
    fetchInventory();
    fetchMetadata();
  }, []);

  const filteredInventory = inventory.filter(item => {
    const product = products[item.productId];
    if (!product) return false;
    return product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           product.sku.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('Inventory Management', 'Inventory Management')}</h2>
          <p className="text-sm text-neutral-500">{t('Track stock levels across all active containers.', 'Track stock levels across all active containers.')}</p>
        </div>
        <div className="flex gap-2">
           <div className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
             <Filter size={14} />
             {t('All Locations', 'All Locations')}
           </div>
           <div className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
             <History size={14} />
             {t('Stock History', 'Stock History')}
           </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
        <Input 
          className="ps-10 h-12 text-lg shadow-sm" 
          placeholder="Search by product name or sku..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="border border-neutral-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-start border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('Product', 'Product')}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('Container', 'Container')}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('Initial Stock', 'Initial Stock')}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('Current Stock', 'Current Stock')}</th>
              {isAdmin && <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-end">{t('Unit Cost', 'Unit Cost')}</th>}
              <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-end">{t('Status', 'Status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredInventory.map((item) => (
              <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-bold text-neutral-900 uppercase text-xs">{products[item.productId]?.name || 'Unknown'}</p>
                  <p className="text-[10px] text-neutral-400 font-mono">{products[item.productId]?.sku}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-sm text-neutral-600 font-medium">{containers[item.containerId]?.name || 'Transit'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-neutral-400">{item.initialQuantity}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{item.quantity}</span>
                    <div className="flex-1 min-w-[60px] h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.quantity / item.initialQuantity) * 100}%` }}
                        className={cn(
                          "h-full rounded-full",
                          (item.quantity / item.initialQuantity) < 0.2 ? "bg-red-500" : "bg-emerald-500"
                        )}
                      />
                    </div>
                  </div>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-end">
                    <span className="text-sm font-bold text-emerald-600 font-mono">${item.unitCost?.toFixed(2)}</span>
                  </td>
                )}
                <td className="px-6 py-4 text-end">
                  <Badge variant={item.quantity > 0 ? 'success' : 'neutral'}>
                    {item.quantity > 0 ? t('In Stock', 'In Stock') : t('Sold Out', 'Sold Out')}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filteredInventory.length === 0 && !loading && (
          <div className="p-12 text-center space-y-2">
            <Package size={48} className="mx-auto text-neutral-200" />
            <p className="text-neutral-400">No inventory matches your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};
