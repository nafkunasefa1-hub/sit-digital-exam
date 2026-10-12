# 🚀 Free Cloud Deployment Guide — Shegger Institute of Technology (SIT)

You can host this entire system online **100% for free** without running your local PC as a server.

---

## 🌟 Recommended Free Host: Render.com

[Render.com](https://render.com) provides a free cloud tier that natively supports **Node.js + WebSockets** and gives you a free secure HTTPS & WSS domain (e.g., `https://sit-exam.onrender.com`).

### Step 1: Create a GitHub Repository
1. Go to [github.com](https://github.com) and create a free account if you don't have one.
2. Create a new repository named `sit-digital-exam`.
3. In your project directory (`c:\Users\BBO\Desktop\Digital Exam`), push the code:
   ```bash
   git init
   git add .
   git commit -m "SIT Digital Exam Ecosystem"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/sit-digital-exam.git
   git push -u origin main
   ```

### Step 2: Deploy on Render.com (2 Minutes)
1. Go to [render.com](https://render.com) and sign up with your GitHub account.
2. Click **New +** in the top right and select **Web Service**.
3. Choose your repository: `sit-digital-exam`.
4. Configure the settings (all free):
   * **Name**: `sit-exam`
   * **Environment**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Instance Type**: `Free`
5. Click **Create Web Service**.
6. Render will build and deploy your application in ~60 seconds.
7. Your official URL will be ready:
   * **Students**: `https://sit-exam.onrender.com/student`
   * **Teachers**: `https://sit-exam.onrender.com/teacher`
   * **Admins**: `https://sit-exam.onrender.com/admin`

---

## 🔒 Alternative Free Hosts Supporting WebSockets

1. **Railway.app**:
   * Connect GitHub -> One-click deploy -> Free starter credit.
2. **Fly.io**:
   * Free tier with 3 shared-CPU VMs.

---

## 📶 Important Consideration for Online Cloud Hosting
When hosted on cloud servers (like Render or Railway), students can access the URL from outside the campus if they have the PIN.
To restrict access strictly to students sitting in the exam hall:
* Use the **Dynamic 6-Digit PIN** which the professor only shows on the exam hall projector 2 minutes before the exam begins.
* We have also added the **Campus Subnet / IP Check** option in the Teacher settings so you can restrict access to the university's public IP range if desired.
