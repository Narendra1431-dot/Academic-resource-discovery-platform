# 🚀 PRODUCTION DEPLOYMENT GUIDE

## 🎯 **PROBLEM FIXED**: Netlify frontend → Render backend API errors

## 📋 **Detected Issues & Solutions**

### 1. **API Calls Fixed**
- `frontend/dashboard.html`: `API_BASE = window.location.hostname === 'localhost' ? 'localhost:5000/api' : '/api'`
- All other files use relative `/api` ✅

### 2. **CORS Configured** (server.js)
```
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-netlify-site.netlify.app'
  ],
  credentials: true
}));
```

### 3. **Environment Variables Ready**
`.env.example` created:
```
MONGODB_URI=your_atlas_connection
OPENAI_API_KEY=sk-...
JWT_SECRET=supersecretkey123
PORT=5000
```

## 🛠 **DEPLOYMENT STEPS**

### **1. MongoDB Atlas (5 min)**
1. [MongoDB Atlas](https://cloud.mongodb.com) → New Cluster (free M0)
2. Network Access → Add IP `0.0.0.0/0`
3. Database → Connect → Drivers → Copy connection string
4. Replace in `.env`: `MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/db"`

### **2. Backend → Render (10 min)**
1. Duplicate `.env` → `.env` with Atlas URI
2. [Render.com](https://render.com) → New Web Service → GitHub repo
3. Build: `npm install`
4. Start: `npm start`
5. Env Vars: Add all from `.env`
6. **Copy Backend URL**: `https://your-app.onrender.com`

### **3. Frontend → Netlify (5 min)**
1. [Netlify](https://netlify.com/drop) → Drag `frontend/` folder
2. `_redirects` (Netlify auto-proxy):
```
/api/*  https://your-render-app.onrender.com/:splat  200
```

### **4. Local Test**
```bash
npm install
npm start
localhost:5000/frontend/student-dashboard.html
```

**Login**: `jane@student.com` / `student123`

## 🔧 **Production Architecture**
```
Netlify (Frontend) → Render (Backend) → MongoDB Atlas
       ↓                    ↓                  ↓
   SPA + SPA Proxy   Express API       Production DB
```

## ✅ **Final Checklist**
- [x] localhost → relative APIs
- [x] CORS production origins
- [x] .env.example
- [x] Render-ready server.js
- [x] Netlify proxy rules

**Repo ready for production! 🚀**

