import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, addDoc, updateDoc, doc, writeBatch, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Button, Card, Input, Badge } from '../components/UI';
import { Search, ShoppingCart, Plus, Minus, Trash2, Printer, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
export const POSPage = () => {
  const { user } = useAuth();
  const isDemo = user?.uid === 'demo-user-id';
  const { t } = useTranslation();

  const [products, setProducts] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isDemo) {
      setProducts([
        { id: 'p1', name: 'Titanium Scaffold Tubing', sku: 'TST-8992', sellingPrice: 1450 },
        { id: 'p2', name: 'Heavy Duty Connectors', sku: 'HDC-109X', sellingPrice: 1780 }
      ]);
      setInventory([
        { id: 'i1', productId: 'p1', containerId: 'c1', quantity: 40, createdAt: { toMillis: () => 1 } },
        { id: 'i2', productId: 'p2', containerId: 'c2', quantity: 5, createdAt: { toMillis: () => 1 } }
      ]);
      return;
    }
    const unsubP = onSnapshot(query(collection(db, 'products')), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubI = onSnapshot(query(collection(db, 'inventory'), where('quantity', '>', 0)), (s) => setInventory(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubC = onSnapshot(query(collection(db, 'containers')), (s) => setContainers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubP(); unsubI(); unsubC(); };
  }, [isDemo]);

  const getStockForProduct = (productId: string) => {
    return inventory
      .filter(i => i.productId === productId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  const addToCart = (product: any) => {
    const existing = cart.find(c => c.productId === product.id);
    const stock = getStockForProduct(product.id);
    
    if (existing) {
      if (existing.quantity >= stock) return;
      setCart(cart.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if (stock <= 0) return;
      setCart([...cart, { productId: product.id, name: product.name, price: product.sellingPrice, quantity: 1, sku: product.sku }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(c => c.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    const item = cart.find(c => c.productId === productId);
    const stock = getStockForProduct(productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(productId);
    } else if (newQty <= stock) {
      setCart(cart.map(c => c.productId === productId ? { ...c, quantity: newQty } : c));
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || processing) return;
    setProcessing(true);
    try {
      if (isDemo) {
        // Simulate network delay
        await new Promise(r => setTimeout(r, 1000));
        setCart([]);
        setCustomerName('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        return;
      }
      
      const batch = writeBatch(db);
      const saleItems = [];

      // FIFO Logic for each cart item
      for (const item of cart) {
        let remainingToDeduct = item.quantity;
        // Sort inventory by creation date (FIFO)
        const productInventory = inventory
          .filter(i => i.productId === item.productId)
          .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());

        for (const inv of productInventory) {
          if (remainingToDeduct <= 0) break;
          
          const deductAmount = Math.min(inv.quantity, remainingToDeduct);
          const invRef = doc(db, 'inventory', inv.id);
          
          batch.update(invRef, {
            quantity: inv.quantity - deductAmount
          });

          saleItems.push({
            productId: item.productId,
            containerId: inv.containerId,
            quantity: deductAmount,
            sellingPrice: item.price,
            sku: item.sku
          });

          remainingToDeduct -= deductAmount;
        }
      }

      // Create Sale Record
      const saleRef = doc(collection(db, 'sales'));
      batch.set(saleRef, {
        items: saleItems,
        totalAmount: total,
        customerName: customerName || 'Walk-in Customer',
        agentId: auth.currentUser?.uid,
        timestamp: serverTimestamp(),
      });

      // Log Audit Trail
      const logRef = doc(collection(db, 'audit_logs'));
      batch.set(logRef, {
        userId: auth.currentUser?.uid,
        action: 'CREATED_INVOICE',
        details: `Invoice created for ${customerName || 'Walk-in'} - Total: $${total}`,
        timestamp: serverTimestamp(),
      });

      await batch.commit();
      setCart([]);
      setCustomerName('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Checkout failed:", error);
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-160px)] lg:h-[calc(100vh-160px)]">
      {/* Product Selection */}
      <div className="flex-1 space-y-4 flex flex-col min-h-[500px] lg:min-h-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t('New Sale', 'New Sale')}</h2>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            {t('Live Terminals', 'Live Terminals')}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            className="ps-12 h-14 text-lg shadow-sm rounded-xl" 
            placeholder="Scan SKU or Search Products..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 lg:overflow-y-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
          {filteredProducts.map(product => {
            const stock = getStockForProduct(product.id);
            return (
              <Card 
                key={product.id} 
                className={cn(
                  "p-5 cursor-pointer hover:border-indigo-300 transition-all border-2",
                  stock > 0 ? "border-transparent" : "opacity-60 border-slate-100 grayscale hover:grayscale-0"
                )}
                onClick={() => stock > 0 && addToCart(product)}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge variant={stock > 0 ? 'success' : 'neutral'}>
                    {stock > 0 ? `${stock} available` : 'Depleted'}
                  </Badge>
                  <p className="text-[10px] font-mono text-slate-400 border border-slate-100 px-1.5 py-0.5 rounded">{product.sku}</p>
                </div>
                <h3 className="font-bold text-slate-900 uppercase tracking-tight line-clamp-1">{product.name}</h3>
                <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-50">
                   <p className="text-xl font-bold text-indigo-600">${product.sellingPrice}</p>
                   {stock > 0 && <Plus size={16} className="text-indigo-400 mb-1" />}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Cart / Checkout */}
      <div className="w-full lg:w-96 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col min-h-[500px] border-indigo-100/50 shadow-indigo-500/[0.02] shadow-xl">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart size={18} className="text-indigo-600" />
              Checkout Terminal
            </h3>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">{cart.length} SKUs</span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-dashed border-slate-200">
                  <ShoppingCart size={24} strokeWidth={1.5} />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Scan items to begin</p>
              </div>
            ) : (
              cart.map(item => (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={item.productId} className="flex justify-between items-center gap-4 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate uppercase tracking-tighter">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">${item.price} UNIT</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 rounded-lg px-1 py-1">
                      <button onClick={() => updateQuantity(item.productId, -1)} className="p-2 w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded transition-all text-slate-500">
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-mono w-6 text-center font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, 1)} className="p-2 w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded transition-all text-slate-500">
                        <Plus size={14} />
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(item.productId)} className="p-2 w-8 h-8 flex items-center justify-center hover:bg-red-50 text-red-400 rounded-lg group-hover:opacity-100 opacity-60 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          <div className="p-6 bg-slate-50/80 border-t border-slate-200 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ms-1">Customer Name (Optional)</label>
              <Input 
                placeholder="Walk-in / Named Customer" 
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="bg-white border-slate-200"
              />
            </div>
            
            <div className="flex justify-between items-center border-t border-slate-200 pt-6">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grand Total</p>
                <p className="text-3xl font-bold text-slate-900 tracking-tighter">${total.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                <ShoppingCart size={24} className="text-slate-400" />
              </div>
            </div>

            <Button 
               className="w-full py-4 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-transform active:scale-95"
               disabled={cart.length === 0 || processing}
               onClick={handleCheckout}
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : success ? (
                <><CheckCircle2 /> Print Receipt</>
              ) : (
                <><Printer size={18} /> Finalize Order</>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
