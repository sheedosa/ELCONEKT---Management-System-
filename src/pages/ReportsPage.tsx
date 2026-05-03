import React, { useState } from 'react';
import { Card, Badge, Button } from '../components/UI';
import { FileText, Download, Filter, TrendingUp, DollarSign, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export const ReportsPage = () => {
  const [reportType, setReportType] = useState('financial');
  const { t } = useTranslation();

  const reportModules = [
    { id: 'financial', name: t('Financial Overview'), icon: DollarSign, description: t('Revenue, Profit Margins, and ROI analytics.') },
    { id: 'inventory', name: t('Inventory Valuation'), icon: Package, description: t('Landed costs matching and stock valuations.') },
    { id: 'sales', name: t('Sales Performance'), icon: TrendingUp, description: t('Agent performance, top SKUs, and sales velocity.') },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t('Reporting Engine')}</h2>
          <p className="text-slate-500">{t('Generate and export system analytics.')}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4">
           <Button variant="outline" className="text-xs bg-white text-slate-600 font-bold border-slate-200">
             <Filter size={14} className="me-2" />
             {t('Apply Filters', 'Apply Filters')}
           </Button>
           <Button className="text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md">
             <Download size={14} />
             {t('Export to CSV', 'Export to CSV')}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportModules.map((module) => (
          <Card 
            key={module.id} 
            className={`p-6 cursor-pointer transition-all border-2 ${reportType === module.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent hover:border-slate-200'}`}
            onClick={() => setReportType(module.id)}
          >
            <div className={`p-3 rounded-xl inline-block mb-4 ${reportType === module.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
               <module.icon size={20} />
            </div>
            <h3 className="font-bold text-slate-900 tracking-tight">{module.name}</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{module.description}</p>
          </Card>
        ))}
      </div>

      <Card className="p-8 min-h-[400px] flex flex-col items-center justify-center text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
         <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4">
            <FileText size={24} className="text-indigo-400" />
         </div>
         <h4 className="font-bold text-slate-800 text-lg">{t('Report Generation Standby')}</h4>
         <p className="text-slate-500 text-sm max-w-sm mt-2">
            {t('Select a reporting module above and configure your date range to generate analytical insights.')}
         </p>
         <Button variant="outline" className="mt-6 border-slate-300 text-slate-700 bg-white shadow-sm font-bold active:scale-95 transition-all">
            {t('Execute Query')}
         </Button>
      </Card>
    </div>
  );
};
