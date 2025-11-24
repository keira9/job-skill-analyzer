#!/usr/bin/env bash
# Deployment script for Job Market Skill Gap Analyzer
# Run this on BOTH web-01 and web-02

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Job Market Skill Gap Analyzer${NC}"
echo -e "${BLUE}Deployment Script v2.0${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run with sudo: sudo bash deploy.sh${NC}"
    exit 1
fi

# Get hostname for verification
HOSTNAME=$(hostname)
echo -e "${YELLOW}Deploying to server: ${HOSTNAME}${NC}\n"

# Step 1: Update and install Nginx
echo -e "${GREEN}[1/8] Installing/Updating Nginx...${NC}"
apt-get update -qq
apt-get install -y nginx > /dev/null 2>&1
echo -e "${GREEN}✓ Nginx ready${NC}"

# Step 2: Create application directory
echo -e "${GREEN}[2/8] Creating application directory...${NC}"
mkdir -p /var/www/html/skill-analyzer
echo -e "${GREEN}✓ Directory created${NC}"

# Step 3: Copy application files
echo -e "${GREEN}[3/8] Copying application files...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -f "$SCRIPT_DIR/index.html" ]; then
    cp "$SCRIPT_DIR/index.html" /var/www/html/skill-analyzer/
    cp "$SCRIPT_DIR/style.css" /var/www/html/skill-analyzer/
    cp "$SCRIPT_DIR/app.js" /var/www/html/skill-analyzer/
    echo -e "${GREEN}✓ Files copied${NC}"
else
    echo -e "${RED}✗ Error: Application files not found${NC}"
    echo "  Make sure index.html, style.css, and app.js are in: $SCRIPT_DIR"
    exit 1
fi

# Step 4: Set permissions
echo -e "${GREEN}[4/8] Setting permissions...${NC}"
chown -R www-data:www-data /var/www/html/skill-analyzer
chmod -R 755 /var/www/html/skill-analyzer
echo -e "${GREEN}✓ Permissions set${NC}"

# Step 5: Configure Nginx with custom header
echo -e "${GREEN}[5/8] Configuring Nginx...${NC}"

# Backup existing config
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%s)

# Create new config with X-Served-By header
cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;

    server_name _;

    # Custom header showing which server responded
    add_header X-Served-By \$hostname;

    # Skill analyzer application
    location /skill-analyzer {
        alias /var/www/html/skill-analyzer;
        index index.html;
        try_files \$uri \$uri/ =404;
        
        # CORS headers for API calls
        add_header Access-Control-Allow-Origin *;
        add_header X-Served-By \$hostname;
    }

    # Default location
    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

echo -e "${GREEN}✓ Nginx configured with X-Served-By: ${HOSTNAME}${NC}"

# Step 6: Test configuration
echo -e "${GREEN}[6/8] Testing Nginx configuration...${NC}"
if nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓ Configuration valid${NC}"
else
    echo -e "${RED}✗ Configuration error${NC}"
    nginx -t
    exit 1
fi

# Step 7: Restart Nginx
echo -e "${GREEN}[7/8] Restarting Nginx...${NC}"
systemctl restart nginx
systemctl enable nginx > /dev/null 2>&1
sleep 2
echo -e "${GREEN}✓ Nginx restarted${NC}"

# Step 8: Verify deployment
echo -e "${GREEN}[8/8] Verifying deployment...${NC}"
IP_ADDRESS=$(hostname -I | awk '{print $1}')

# Test local access
if curl -s http://localhost/skill-analyzer | grep -q "Job Market Skill Gap Analyzer"; then
    echo -e "${GREEN}✓ Application accessible locally${NC}"
else
    echo -e "${RED}✗ Warning: Could not verify application${NC}"
fi

# Test header
HEADER=$(curl -sI http://localhost/skill-analyzer | grep X-Served-By | awk '{print $2}' | tr -d '\r')
if [ -n "$HEADER" ]; then
    echo -e "${GREEN}✓ X-Served-By header: ${HEADER}${NC}"
else
    echo -e "${YELLOW}⚠ X-Served-By header not found${NC}"
fi

# Final summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Server:${NC} ${HOSTNAME}"
echo -e "${GREEN}IP Address:${NC} ${IP_ADDRESS}"
echo -e "${GREEN}Application URL:${NC} http://${IP_ADDRESS}/skill-analyzer"
echo -e "\n${YELLOW}Test commands:${NC}"
echo -e "  curl http://${IP_ADDRESS}/skill-analyzer"
echo -e "  curl -I http://${IP_ADDRESS}/skill-analyzer | grep X-Served-By"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "  1. Deploy to the other web server"
echo -e "  2. Configure load balancer"
echo -e "  3. Test load balancing"
echo -e "${BLUE}========================================${NC}\n"