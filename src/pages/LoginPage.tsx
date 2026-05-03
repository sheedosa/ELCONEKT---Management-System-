import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button, Card } from '../components/UI';
import { Lock, LogIn, Monitor } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

export const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginAsDemo } = useAuth();
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguage();

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in DB, if not create as Sales Agent
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          role: 'SALES_AGENT', // Default role
          createdAt: new Date(),
        });
      }
      navigate('/');
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative font-sans p-6 text-slate-900">
      <div className="absolute top-6 end-6">
        <button
          onClick={toggleLanguage}
          className="text-xs font-bold bg-white border border-neutral-200 hover:bg-neutral-50 text-slate-700 px-4 py-2 rounded-full transition-colors font-mono shadow-sm"
        >
          {language === 'en' ? 'عربي' : 'English'}
        </button>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 border border-neutral-200 bg-white shadow-lg space-y-8">
          <div className="flex flex-col items-center">
            <img src="https://drive.google.com/thumbnail?id=1YXwxPZklx6AQDdW0mAz9TIL3jR7a5CnT&sz=w500" referrerPolicy="no-referrer" alt="Elconekt Systems" className="h-16 w-auto object-contain mb-6" />
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('Elconekt Systems')}</h1>
            <p className="text-neutral-500 text-sm mt-1">{t('Management Terminal')}</p>
          </div>

          <div className="space-y-6">
            <Button 
               onClick={handleGoogleLogin} 
               disabled={loading}
               className="w-full h-12 bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-3 font-semibold text-sm shadow-sm transition-colors border-none"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
              {loading ? t('Authenticating...') : t('Sign in with Google')}
            </Button>

            <Button 
               onClick={() => {
                 loginAsDemo();
                 navigate('/');
               }}
               variant="outline"
               className="w-full h-12 border-neutral-300 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 flex items-center justify-center gap-3 font-semibold text-sm transition-colors"
            >
              <Monitor size={18} />
              {t('Demo Mode')}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
