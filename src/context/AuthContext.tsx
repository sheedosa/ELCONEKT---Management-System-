import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | { uid: string; email: string; displayName: string } | null;
  role: 'ADMIN' | 'SALES_AGENT' | null;
  loading: boolean;
  isAdmin: boolean;
  loginAsDemo: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  isAdmin: false,
  loginAsDemo: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | { uid: string; email: string; displayName: string } | null>(null);
  const [role, setRole] = useState<'ADMIN' | 'SALES_AGENT' | null>(null);
  const [loading, setLoading] = useState(true);

  const loginAsDemo = () => {
    setUser({
      uid: 'demo-user-id',
      email: 'demo@elconekt.com',
      displayName: 'Demo Administrator'
    });
    setRole('ADMIN');
    setLoading(false);
  };

  const logout = async () => {
    await auth.signOut();
    setUser(null);
    setRole(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role as any);
        } else {
          setRole('SALES_AGENT'); // Fallback
        }
      } else if (!user) { // Only clear if not in demo mode
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, role, loading, isAdmin: role === 'ADMIN', loginAsDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
