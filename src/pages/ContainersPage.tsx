import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button, Card, Input, Badge } from '../components/UI';
import { Ship, Plus, DollarSign, Calendar, Boxes, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
export const ContainersPage = () => {
  const { user } = useAuth();
  const isDemo = user?.uid === 'demo-user-id';
  const { t } = useTranslation();

  const [containers, setContainers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  
  // Form State
  const [containerForm, setContainerForm] = useState({
    name: '',
    arrivalDate: format(new Date(), "yyyy-MM-dd"),
    shippingCosts: 0,
    customsFees: 0,
    items: [{ productId: '', quantity: 0 }]
  });

  useEffect(() => {
    if (isDemo) {
      setContainers([
        { id: 'c1', name: 'CN-8902-NY', arrivalDate: '2023-10-14', shippingCosts: 1500, customsFees: 3500, totalLandedCost: 8000, status: 'ARRIVED' },
        { id: 'c2', name: 'CN-4431-EU', arrivalDate: '2023-11-02', shippingCosts: 1200, customsFees: 3800, totalLandedCost: 5000, status: 'ARRIVED' }
      ]);
      setProducts([
        { id: 'p1', name: 'Titanium Scaffold Tubing', sku: 'TST-8992' }
      ]);
      return;
    }
    const unsubC = onSnapshot(query(collection(db, 'containers')), (s) => setContainers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubP = onSnapshot(query(collection(db, 'products')), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubC(); unsubP(); };
  }, [isDemo]);

  const totalItemCount = containerForm.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalLandedCost = Number(containerForm.shippingCosts) + Number(containerForm.customsFees);
  const unitCostAvg = totalItemCount > 0 ? (totalLandedCost / totalItemCount) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isDemo) {
        setShowAdd(false);
        setContainerForm({
          name: '',
          arrivalDate: format(new Date(), "yyyy-MM-dd"),
          shippingCosts: 0,
          customsFees: 0,
          items: [{ productId: '', quantity: 0 }]
        });
        return;
      }
      const batch = writeBatch(db);
      
      // 1. Create Container
      const containerRef = await addDoc(collection(db, 'containers'), {
        name: containerForm.name,
        arrivalDate: containerForm.arrivalDate,
        shippingCosts: Number(containerForm.shippingCosts),
        customsFees: Number(containerForm.customsFees),
        totalLandedCost,
        status: 'ARRIVED',
        createdAt: serverTimestamp(),
      });

      // 2. Create Inventory Items for this container
      for (const item of containerForm.items) {
        if (!item.productId || item.quantity <= 0) continue;
        
        const invRef = doc(collection(db, 'inventory'));
        batch.set(invRef, {
          productId: item.productId,
          containerId: containerRef.id,
          quantity: Number(item.quantity),
          initialQuantity: Number(item.quantity),
          unitCost: unitCostAvg, // Simplified: even distribution. Realistically might vary by product weight/value.
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      setShowAdd(false);
      setContainerForm({
        name: '',
        arrivalDate: format(new Date(), "yyyy-MM-dd"),
        shippingCosts: 0,
        customsFees: 0,
        items: [{ productId: '', quantity: 0 }]
      });
    } catch (error) {
      console.error("Error creating container:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">{t('Shipments & Containers')}</h2>
          <p className="text-sm text-neutral-500">{t('Track arrivals and calculate landed costs.')}</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2">
          <Ship size={18} />
          {showAdd ? t('Cancel') : t('New Container')}
        </Button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">{t('Container Name / ID')}</label>
                    <Input value={containerForm.name} onChange={e => setContainerForm({ ...containerForm, name: e.target.value })} placeholder={t('e.g. MAY-BATCH-01')} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">{t('Arrival Date')}</label>
                    <Input type="date" value={containerForm.arrivalDate} onChange={e => setContainerForm({ ...containerForm, arrivalDate: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">{t('Shipping Costs ($)')}</label>
                    <Input type="number" value={containerForm.shippingCosts} onChange={e => setContainerForm({ ...containerForm, shippingCosts: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">{t('Customs Fees ($)')}</label>
                    <Input type="number" value={containerForm.customsFees} onChange={e => setContainerForm({ ...containerForm, customsFees: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                      <Boxes size={18} className="text-emerald-500" />
                      {t('Manifest Items')}
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => setContainerForm({ ...containerForm, items: [...containerForm.items, { productId: '', quantity: 0 }] })}>
                      {t('Add Product Row')}
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {containerForm.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 items-end">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-neutral-400">{t('Product')}</label>
                          <select 
                            className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm"
                            value={item.productId}
                            onChange={e => {
                              const newItems = [...containerForm.items];
                              newItems[idx].productId = e.target.value;
                              setContainerForm({ ...containerForm, items: newItems });
                            }}
                          >
                            <option value="">{t('Select a product...')}</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                          </select>
                        </div>
                        <div className="w-32 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-neutral-400">{t('Quantity')}</label>
                          <Input type="number" value={item.quantity} onChange={e => {
                            const newItems = [...containerForm.items];
                            newItems[idx].quantity = Number(e.target.value);
                            setContainerForm({ ...containerForm, items: newItems });
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                   <div className="flex gap-8">
                     <div>
                       <p className="text-[10px] uppercase font-bold text-emerald-600">{t('Total Items')}</p>
                       <p className="text-xl font-bold">{totalItemCount}</p>
                     </div>
                     <div>
                       <p className="text-[10px] uppercase font-bold text-emerald-600">{t('Total Costs')}</p>
                       <p className="text-xl font-bold">${totalLandedCost.toFixed(2)}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="text-end">
                       <p className="text-[10px] uppercase font-bold text-neutral-500">{t('Derived Per-Unit Cost')}</p>
                       <p className="text-xl font-bold text-emerald-700">${unitCostAvg.toFixed(2)}</p>
                     </div>
                     <div className="p-3 bg-white rounded-lg shadow-sm">
                       <Calculator className="text-emerald-500" />
                     </div>
                   </div>
                </div>

                <Button type="submit" className="w-full py-3 text-lg">{t('Process Container Arrival')}</Button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {containers.map((container) => (
          <Card key={container.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-500">
                <Ship size={24} />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900">{container.name}</h3>
                <p className="text-xs text-neutral-400 flex items-center gap-1">
                  <Calendar size={12} />
                  {t('Arrived on')} {format(new Date(container.arrivalDate), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
            
            <div className="flex gap-8">
               <div className="text-center">
                 <p className="text-[10px] font-bold text-neutral-400 uppercase">{t('Shipping')}</p>
                 <p className="text-sm font-semibold">${container.shippingCosts}</p>
               </div>
               <div className="text-center">
                 <p className="text-[10px] font-bold text-neutral-400 uppercase">{t('Customs')}</p>
                 <p className="text-sm font-semibold">${container.customsFees}</p>
               </div>
               <div className="text-center">
                 <p className="text-[10px] font-bold text-neutral-400 uppercase">{t('Landed Cost')}</p>
                 <p className="text-sm font-bold text-emerald-600">${container.totalLandedCost}</p>
               </div>
            </div>
            
            <Badge variant={container.status === 'ARRIVED' ? 'success' : 'neutral'}>
              {t(container.status)}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
};
