# 🌐 Debian Server Deployment Guide

This guide describes how to deploy the **Contact Manager WebApp** to a Debian server, point your custom domain, set up the backend systemd service, configure Nginx, and install SSL (HTTPS) certificates.

---

## 📋 Prerequisites

Ensure your Debian server has the following installed:
*   **Git**: `sudo apt update && sudo apt install git -y`
*   **Python 3 & venv**: `sudo apt install python3 python3-venv python3-pip -y`
*   **Node.js & NPM**:
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    ```
*   **Nginx**: `sudo apt install nginx -y`

---

## 🛠️ Step-by-Step Deployment

### Step 1: Configure Your Domain DNS (A Record)
1. Log in to your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare).
2. Access the DNS Management page for your domain.
3. Add or update the **A Record**:
   *   **Type**: `A`
   *   **Name / Host**: `@` (or `www` or your subdomain like `contacts`)
   *   **Value / IP**: Point to your Debian server's **Public IP Address**.
   *   **TTL**: Automatic or 3600 seconds.
4. *Note: DNS changes can take anywhere from a few minutes to 24 hours to propagate.*

---

### Step 2: Clone the Project
On your server, clone the repository directly into `/var/www/contact-manager`:
```bash
sudo git clone https://github.com/AYazdan21/Contact-Manager-WebApp.git /var/www/contact-manager
```

---

### Step 3: Configure Domain in Templates
1. Edit the Nginx configuration template to match your domain:
   ```bash
   sudo nano /var/www/contact-manager/deployment/nginx.conf
   ```
2. Find the line:
   ```nginx
   server_name <your-domain.com>;
   ```
3. Replace `<your-domain.com>` with your actual domain (e.g., `server_name mycontacts.com www.mycontacts.com;`). Save (`Ctrl + O`, `Enter`) and exit (`Ctrl + X`).

---

### Step 4: Run the Deployment Automation Script
The repository includes a helper script `deploy_setup.sh` that automates backend environment setup, React compilation, permissions, Nginx integration, and systemd service registration.

1. Navigate to the deployment folder:
   ```bash
   cd /var/www/contact-manager/deployment
   ```
2. Make the script executable:
   ```bash
   sudo chmod +x deploy_setup.sh
   ```
3. Run the script:
   ```bash
   sudo ./deploy_setup.sh
   ```
4. Verify that the script completes with a `[SUCCESS]` message.

---

### Step 5: Secure with SSL (HTTPS)
To secure your application and ensure all traffic is encrypted, use Let's Encrypt and Certbot to obtain free SSL certificates.

1. Install Certbot and the Nginx plugin:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```
2. Run Certbot to generate and configure the SSL certificates for Nginx:
   ```bash
   sudo certbot --nginx -d <your-domain.com>
   ```
   *(If you configured `www.your-domain.com` in Nginx as well, run `sudo certbot --nginx -d your-domain.com -d www.your-domain.com`)*
3. Certbot will ask for your email address and request you to accept terms. Once complete, it will automatically update your Nginx configuration to enable SSL and handle automatic redirects from HTTP to HTTPS.
4. Verify the auto-renewal timer is active:
   ```bash
   sudo systemctl status certbot.timer
   ```

---

## 🛠️ Management & Maintenance

### How to Check Logs
*   **FastAPI Backend Logs**:
    ```bash
    sudo journalctl -u contact-manager.service -n 50 -f
    ```
*   **Nginx Error Logs**:
    ```bash
    sudo tail -f /var/log/nginx/error.log
    ```

### Restarting Services
*   Restart Backend Service:
    ```bash
    sudo systemctl restart contact-manager
    ```
*   Restart Nginx:
    ```bash
    sudo systemctl restart nginx
    ```
