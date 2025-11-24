#!/usr/bin/env bash
# Load Balancer Testing Script
# Usage: bash test_lb.sh <LB_IP>

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get load balancer IP
LB_IP=$1

if [ -z "$LB_IP" ]; then
    echo -e "${YELLOW}Usage: bash test_lb.sh <LOAD_BALANCER_IP>${NC}"
    echo -e "${YELLOW}Example: bash test_lb.sh 192.168.1.100${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Load Balancer Testing${NC}"
echo -e "${BLUE}Testing: ${LB_IP}${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Basic connectivity
echo -e "${GREEN}Test 1: Basic Connectivity${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://${LB_IP}/skill-analyzer | grep -q "200"; then
    echo -e "${GREEN}✓ Load balancer is responding (HTTP 200)${NC}\n"
else
    echo -e "${RED}✗ Load balancer is not responding${NC}\n"
    exit 1
fi

# Test 2: Round-robin distribution
echo -e "${GREEN}Test 2: Round-Robin Distribution${NC}"
echo -e "${YELLOW}Making 10 requests to check server alternation...${NC}\n"

declare -A server_counts
for i in {1..10}; do
    SERVER=$(curl -sI http://${LB_IP}/skill-analyzer | grep -i "X-Served-By" | awk '{print $2}' | tr -d '\r\n')
    
    if [ -n "$SERVER" ]; then
        server_counts[$SERVER]=$((${server_counts[$SERVER]:-0} + 1))
        echo -e "  Request $i: ${GREEN}${SERVER}${NC}"
    else
        echo -e "  Request $i: ${RED}No X-Served-By header${NC}"
    fi
    sleep 0.2
done

echo -e "\n${YELLOW}Server distribution:${NC}"
for server in "${!server_counts[@]}"; do
    echo -e "  ${GREEN}${server}:${NC} ${server_counts[$server]} requests"
done

# Check if both servers responded
if [ ${#server_counts[@]} -ge 2 ]; then
    echo -e "\n${GREEN}✓ Load balancing is working! Both servers responded.${NC}\n"
else
    echo -e "\n${YELLOW}⚠ Warning: Only one server responded. Check backend configuration.${NC}\n"
fi

# Test 3: Application functionality
echo -e "${GREEN}Test 3: Application Functionality${NC}"
if curl -s http://${LB_IP}/skill-analyzer | grep -q "Job Market Skill Gap Analyzer"; then
    echo -e "${GREEN}✓ Application is accessible and serving content${NC}\n"
else
    echo -e "${RED}✗ Application content not found${NC}\n"
fi

# Test 4: Response time
echo -e "${GREEN}Test 4: Response Time${NC}"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" http://${LB_IP}/skill-analyzer)
echo -e "${GREEN}Average response time: ${RESPONSE_TIME}s${NC}\n"

# Test 5: Headers check
echo -e "${GREEN}Test 5: Headers Check${NC}"
echo -e "${YELLOW}Checking response headers...${NC}"
curl -sI http://${LB_IP}/skill-analyzer | grep -E "(X-Served-By|Content-Type|Server)" | while read line; do
    echo -e "  ${GREEN}${line}${NC}"
done

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✅ TESTING COMPLETE${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "\n${YELLOW}For demo video, run:${NC}"
echo -e "  curl -I http://${LB_IP}/skill-analyzer | grep X-Served-By"
echo -e "\n${YELLOW}To see stats dashboard:${NC}"
echo -e "  Open http://${LB_IP}:8080/stats in browser"
echo -e "  Username: admin, Password: skillanalyzer123"
echo -e "${BLUE}========================================${NC}\n"