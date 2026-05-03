import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button, Card, Input } from '../components/UI';
import { Plus, Search, Tag, DollarSign, Fingerprint } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
export const ProductsPage = () => {
  const { user } = useAuth();
  const isDemo = user?.uid === 'demo-user-id';
  const { t } = useTranslation();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    modelNumber: '',
    category: '',
    sellingPrice: 0,
  });

  useEffect(() => {
    if (isDemo) {
      setProducts([
        { id: 'p1', name: 'Titanium Scaffold Tubing', sku: 'TST-8992', modelNumber: 'M-1200', category: 'Hardware', sellingPrice: 1450 },
        { id: 'p2', name: 'Heavy Duty Connectors', sku: 'HDC-109X', modelNumber: 'M-1300', category: 'Hardware', sellingPrice: 1780 }
      ]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isDemo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isDemo) {
        setShowAdd(false);
        setFormData({ name: '', sku: '', modelNumber: '', category: '', sellingPrice: 0 });
        return;
      }
      await addDoc(collection(db, 'products'), {
        ...formData,
        sellingPrice: Number(formData.sellingPrice),
        createdAt: serverTimestamp(),
      });
      setShowAdd(false);
      setFormData({ name: '', sku: '', modelNumber: '', category: '', sellingPrice: 0 });
    } catch (error) {
      console.error("Error adding product:", error);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">{t('Product Catalog', 'Product Catalog')}</h2>
          <p className="text-sm text-neutral-500">{t('Manage door lock models and their retail prices.', 'Manage items and their retail prices.')}</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2">
          <Plus size={18} />
          {showAdd ? t('Cancel', 'Cancel') : t('Add Product', 'Add Product')}
        </Button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Product Name</label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Smart Lock X1" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">SKU / Barcode</label>
                <Input value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} placeholder="e.g. SLX1-BLK" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Model Number</label>
                <Input value={formData.modelNumber} onChange={e => setFormData({ ...formData, modelNumber: e.target.value })} placeholder="e.g. MODEL-001" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Category</label>
                <Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Biometric" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Selling Price ($)</label>
                <Input type="number" step="0.01" value={formData.sellingPrice} onChange={e => setFormData({ ...formData, sellingPrice: Number(e.target.value) })} required />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">Create Product</Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
        <Input 
          className="ps-10 h-12 text-lg shadow-sm" 
          placeholder="Search items by name or SKU..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <motion.div key={product.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="group hover:border-emerald-200 transition-all">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <Fingerprint size={24} />
                  </div>
                  <div className="text-end">
                    <p className="text-xs text-neutral-400 font-mono uppercase">{product.sku}</p>
                    <p className="text-sm font-bold text-neutral-900">${product.sellingPrice}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-neutral-500 mt-1">{product.category || 'General'}</p>
                </div>
                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                   <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                     <Tag size={12} />
                     <span>{product.modelNumber || 'N/A'}</span>
                   </div>
                   <Button variant="outline" className="px-2 py-1 text-xs">Edit</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
