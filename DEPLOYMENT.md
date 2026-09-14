# 🚀 Mailo AI — Production Deployment Guide

Mailo AI is architected as a **unified full-stack application** where the Node.js/Express backend serves both the REST API endpoints (/api/*) and the high-performance React (Vite) Single Page Application on a single port.

---

## 🌟 Quick Overview of Deployment Options

| Platform / Method | Best For | Deploy Command / Config |
| :--- | :--- | :--- |
| **Render** | 1-Click Free/Paid Cloud Hosting | render.yaml (Pre-configured Blueprint) |
| **Railway** | Instant Container / Cloud App | railway.json / Procfile |
| **Docker / Compose** | Any VPS, Cloud VM, or Local Container | docker compose up --build -d |
| **Fly.io** | Global Edge Deployment | fly launch / Dockerfile |
| **Linux VPS / AWS EC2** | Dedicated Ubuntu / Debian Server | npm run build && pm2 start npm --name "mailo-ai" -- start |
| **Vercel** | Serverless / Frontend Edge Hosting | vercel.json |

---

## 🛠️ Environment Variables

Before deploying, configure the following environment variables on your platform:

| Variable | Description | Example / Default | Required |
| :--- | :--- | :--- | :--- |
| NODE_ENV | Environment mode | production | Recommended |
| PORT | Listening port for the application | 4000 (auto-injected by most cloud hosts) | Optional |
| DATABASE_URL | SQLite / PostgreSQL connection URI | ile:./dev.db (or PostgreSQL URI) | Yes |
| ANTHROPIC_API_KEY | Optional Claude API key for live AI scoring | sk-ant-... | Optional |

---

## 📦 Option 1: 1-Click Deploy on Render (Recommended)

Render offers zero-configuration deployment using the included [ender.yaml](./render.yaml) blueprint:

1. Push your repository to **GitHub** or **GitLab**.
2. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** → **Blueprint**.
3. Connect your MailRadar repository. Render will automatically detect ender.yaml:
   - **Build Command**: 
pm run build
   - **Start Command**: 
pm start
   - **Health Check**: /health
4. Click **Apply**. Your application will be live with a free https://mailradar-xxxx.onrender.com URL.

---

## 🚂 Option 2: Deploy on Railway

Railway supports automatic Nixpacks / Docker builds with the included [ailway.json](./railway.json) & [Procfile](./Procfile):

1. Go to [railway.app](https://railway.app/) and create a **New Project**.
2. Select **Deploy from GitHub repo** and pick your repository.
3. Railway will execute 
pm run build and launch 
pm start.
4. In Railway Settings, click **Generate Domain** to get your public URL.

---

## 🐳 Option 3: Docker & Docker Compose

Deploy on any Docker-capable server (VPS, DigitalOcean Droplet, AWS EC2, GCP, or Local Server) using the multi-stage [Dockerfile](./Dockerfile) and [docker-compose.yml](./docker-compose.yml):

`ash
# 1. Clone your repository
git clone https://github.com/your-username/mail-radar.git
cd mail-radar

# 2. Build and start the container in the background
docker compose up --build -d

# 3. View container logs
docker compose logs -f
`

The app will be running at http://localhost:4000 (or http://YOUR_SERVER_IP:4000).

---

## 🖥️ Option 4: Linux VPS (Ubuntu / Debian / AWS EC2) with PM2 & Nginx

### 1. Install Node.js (v20+), Git & PM2
`ash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2
`

### 2. Clone & Build
`ash
git clone https://github.com/your-username/mail-radar.git
cd mail-radar
npm install
npm run build
`

### 3. Start with PM2 Process Manager
`ash
# Launch MailRadar with auto-restart
pm2 start npm --name "mailradar" -- start

# Configure PM2 to restart on system boot
pm2 startup
pm2 save
`

### 4. (Optional) Setup Nginx Reverse Proxy with SSL
Create /etc/nginx/sites-available/mailradar:
`
ginx
server {
    listen 80;
    server_name mailradar.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade ;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host System.Management.Automation.Internal.Host.InternalHost;
        proxy_cache_bypass ;
        proxy_set_header X-Forwarded-For ;
        proxy_set_header X-Forwarded-Proto ;
    }
}
`
Enable the site and obtain a free SSL certificate via Certbot:
`ash
sudo ln -s /etc/nginx/sites-available/mailradar /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mailradar.yourdomain.com
`

---

## ⚡ Option 5: Local Production Run

To test or run the unified production build locally on your machine:

`ash
# 1. Build client and server bundles
npm run build

# 2. Start the unified production server
npm start
`

Open http://localhost:4000 in your browser!
