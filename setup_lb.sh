#!/usr/bin/env bash
# Load Balancer Setup Script
# Run this on lb-01

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Load Balancer Configuration${NC}"
echo -e "${BLUE}Job Market Skill Gap Analyzer${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run with sudo: sudo bash setup_lb.sh${NC}"
    exit 1
fi

# Get web server IPs
echo -e "${YELLOW}Enter the IP addresses of your web servers:${NC}"
read -p "Web-01 IP: " WEB01_IP
read -p "Web-02 IP: " WEB02_IP

if [ -z "$WEB01_IP" ] || [ -z "$WEB02_IP" ]; then
    echo -e "${RED}Error: Both IP addresses are required${NC}"
    exit 1
fi

echo -e "\n${GREEN}[1/6] Installing HAProxy...${NC}"
apt-get update -qq
apt-get install -y haproxy > /dev/null 2>&1
echo -e "${GREEN}✓ HAProxy installed${NC}"

echo -e "${GREEN}[2/6] Backing up existing configuration...${NC}"
if [ -f /etc/haproxy/haproxy.cfg ]; then
    cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.backup.$(date +%s)
    echo -e "${GREEN}✓ Backup created${NC}"
fi

echo -e "${GREEN}[3/6] Creating HAProxy configuration...${NC}"

cat > /etc/haproxy/haproxy.cfg <<EOF
global
    log /dev/log    local0
    log /dev/log    local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

# Frontend - accepts incoming requests
frontend skill_analyzer_frontend
    bind *:80
    mode http
    default_backend skill_analyzer_backend

# Backend - distributes to web servers
backend skill_analyzer_backend
    mode http
    balance roundrobin
    option httpclose
    option forwardfor
    
    # Health checks
    option httpchk GET /skill-analyzer
    
    # Web servers
    server web-01 ${WEB01_IP}:80 check
    server web-02 ${WEB02_IP}:80 check

# Stats page (optional)
listen stats
    bind *:8080
    stats enable
    stats uri /stats
    stats refresh 30s
    stats auth admin:skillanalyzer123
EOF

echo -e "${GREEN}✓ Configuration created${NC}"

echo -e "${GREEN}[4/6] Testing HAProxy configuration...${NC}"
if haproxy -c -f /etc/haproxy/haproxy.cfg > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Configuration valid${NC}"
else
    echo -e "${RED}✗ Configuration error${NC}"
    haproxy -c -f /etc/haproxy/haproxy.cfg
    exit 1
fi

echo -e "${GREEN}[5/6] Enabling and starting HAProxy...${NC}"
systemctl enable haproxy > /dev/null 2>&1
systemctl restart haproxy
sleep 2

if systemctl is-active --quiet haproxy; then
    echo -e "${GREEN}✓ HAProxy is running${NC}"
else
    echo -e "${RED}✗ HAProxy failed to start${NC}"
    systemctl status haproxy
    exit 1
fi

echo -e "${GREEN}[6/6] Verifying load balancer...${NC}"
LB_IP=$(hostname -I | awk '{print $1}')

# Test if load balancer responds
if curl -s http://localhost/skill-analyzer > /dev/null; then
    echo -e "${GREEN}✓ Load balancer is serving traffic${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify load balancer response${NC}"
fi

# Show backend status
echo -e "\n${YELLOW}Checking backend servers...${NC}"
sleep 1

# Final summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✅ LOAD BALANCER CONFIGURED!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Load Balancer IP:${NC} ${LB_IP}"
echo -e "${GREEN}Web-01:${NC} ${WEB01_IP}"
echo -e "${GREEN}Web-02:${NC} ${WEB02_IP}"
echo -e "\n${GREEN}Application URL:${NC} http://${LB_IP}/skill-analyzer"
echo -e "${GREEN}Stats Dashboard:${NC} http://${LB_IP}:8080/stats"
echo -e "  ${YELLOW}Username: admin, Password: skillanalyzer123${NC}"
echo -e "\n${YELLOW}Test load balancing with:${NC}"
echo -e "  bash test_lb.sh ${LB_IP}"
echo -e "${BLUE}========================================${NC}\n"