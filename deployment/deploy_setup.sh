#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Define variables
APP_DIR="/var/www/contact-manager"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
SYSTEMD_SERVICE_FILE="/etc/systemd/system/contact-manager.service"
NGINX_CONF_FILE="/etc/nginx/sites-available/contact-manager"
NGINX_LINK_FILE="/etc/nginx/sites-enabled/contact-manager"

# Formatting helpers
INFO='\033[0;34m[INFO]\033[0m'
SUCCESS='\033[0;32m[SUCCESS]\033[0m'
ERROR='\033[0;31m[ERROR]\033[0m'

echo -e "$INFO Starting Contact Manager WebApp deployment script..."

# 1. Check if run as root
if [ "$EUID" -ne 0 ]; then
  echo -e "$ERROR Please run this script as root (sudo ./deploy_setup.sh)"
  exit 1
fi

# 2. Check if running from correct directory
if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
  echo -e "$ERROR Script must be run from a directory where files are placed in $APP_DIR."
  echo -e "Please ensure you have cloned the repo to $APP_DIR."
  exit 1
fi

# 3. Setup Python Backend Virtual Environment
echo -e "$INFO Configuring backend Python virtual environment..."
cd "$BACKEND_DIR"

if [ ! -d "env1" ]; then
  python3 -m venv env1
fi

# Activate virtualenv and install dependencies
source env1/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

# Create backend .env if it does not exist
if [ ! -f ".env" ]; then
  echo -e "$INFO Creating backend .env file..."
  SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  cat <<EOT > .env
SECRET_KEY=$SECRET_KEY
DATABASE_URL=sqlite:///database.db
EOT
  echo -e "$SUCCESS Created backend .env file with a secure, randomized SECRET_KEY."
fi

# 4. Setup React Frontend
echo -e "$INFO Configuring React frontend..."
cd "$FRONTEND_DIR"

# Create frontend .env with relative API url to route through Nginx proxy
echo -e "$INFO Setting frontend environment variables..."
cat <<EOT > .env
VITE_API_URL=/api
EOT

# Install npm modules and build static assets
echo -e "$INFO Installing Node.js packages and building application..."
npm install
npm run build
echo -e "$SUCCESS Frontend successfully built to $FRONTEND_DIR/dist"

# 5. Set ownership and permissions
echo -e "$INFO Setting permissions for www-data..."
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"
# SQLite database needs write access for the user running the service
chmod -R g+w "$BACKEND_DIR"

# 6. Install systemd service
echo -e "$INFO Registering systemd service..."
if [ -f "$APP_DIR/deployment/backend.service" ]; then
  cp "$APP_DIR/deployment/backend.service" "$SYSTEMD_SERVICE_FILE"
  systemctl daemon-reload
  systemctl enable contact-manager
  systemctl restart contact-manager
  echo -e "$SUCCESS systemd service 'contact-manager' is enabled and running."
else
  echo -e "$ERROR Service template file not found at $APP_DIR/deployment/backend.service"
  exit 1
fi

# 7. Configure Nginx
echo -e "$INFO Configuring Nginx server block..."
if [ -f "$APP_DIR/deployment/nginx.conf" ]; then
  cp "$APP_DIR/deployment/nginx.conf" "$NGINX_CONF_FILE"
  
  # Enable the site if not already enabled
  if [ ! -f "$NGINX_LINK_FILE" ]; then
    ln -s "$NGINX_CONF_FILE" "$NGINX_LINK_FILE"
  fi

  # Remove default Nginx site if it exists to avoid port conflicts
  if [ -f "/etc/nginx/sites-enabled/default" ]; then
    rm "/etc/nginx/sites-enabled/default"
    echo -e "$INFO Removed default Nginx site link."
  fi

  # Test Nginx configuration
  if nginx -t; then
    systemctl restart nginx
    echo -e "$SUCCESS Nginx configuration verified and service restarted."
  else
    echo -e "$ERROR Nginx configuration test failed. Please review Nginx logs."
    exit 1
  fi
else
  echo -e "$ERROR Nginx configuration template not found at $APP_DIR/deployment/nginx.conf"
  exit 1
fi

echo -e "\n$SUCCESS Deployment completed successfully!"
echo -e "Ensure your domain is configured with your DNS provider to point to this server's IP address."
echo -e "You can then secure your domain with Let's Encrypt by running:"
echo -e "  sudo apt install certbot python3-certbot-nginx"
echo -e "  sudo certbot --nginx -d <your-domain.com>"
