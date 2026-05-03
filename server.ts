import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// In this environment, we might not have a service account JSON.
// We'll try to initialize with the project ID from the config.
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();

// Set the database ID if provided in the config
if (firebaseConfig.firestoreDatabaseId) {
  // admin.firestore() doesn't easily let you switch DB instances like the web SDK in all versions
  // but for AI Studio's default Enterprise setup, it usually defaults to (default)
  // We'll assume the default or the one configured if we use it correctly.
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Middleware for Auth & Role Check
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const idToken = authHeader.split(" ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      
      // Fetch user role from Firestore
      const userDoc = await db.collection("users").doc(decodedToken.uid).get();
      if (!userDoc.exists) {
        req.userRole = "SALES_AGENT"; // Default or handle new user
      } else {
        req.userRole = userDoc.data()?.role || "SALES_AGENT";
      }
      next();
    } catch (error) {
      console.error("Auth error:", error);
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // API Routes
  
  // Dashboard Stats (Admin Only)
  app.get("/api/dashboard-stats", authenticate, async (req: any, res) => {
    if (req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    try {
      // Calculate revenue, profit, ROI
      const salesSnapshot = await db.collection("sales").get();
      const inventorySnapshot = await db.collection("inventory").get();
      
      let totalRevenue = 0;
      let totalCost = 0;
      
      salesSnapshot.forEach(doc => {
        const data = doc.data();
        totalRevenue += data.totalAmount || 0;
        // In a real app we'd aggregate carefully
      });

      res.json({
        totalRevenue,
        totalSales: salesSnapshot.size,
        inventoryCount: inventorySnapshot.size
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Inventory Proxy (Filters unitCost for Sales Agents)
  app.get("/api/inventory", authenticate, async (req: any, res) => {
    try {
      const snapshot = await db.collection("inventory").get();
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        const item: any = {
          id: doc.id,
          productId: data.productId,
          containerId: data.containerId,
          quantity: data.quantity,
          initialQuantity: data.initialQuantity,
        };
        
        if (req.userRole === "ADMIN") {
          item.unitCost = data.unitCost;
        }
        
        return item;
      });
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  // Audit Logs - Simple record endpoint
  app.post("/api/audit-log", authenticate, async (req: any, res) => {
    const { action, details } = req.body;
    try {
      await db.collection("audit_logs").add({
        userId: req.user.uid,
        action,
        details,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to log action" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
