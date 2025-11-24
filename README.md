Job Market Skill Gap Analyzer

A web application that helps job seekers identify skill gaps by analyzing real-time job market data and comparing required skills with their current skill s
 Project Purpose

This application addresses a genuine need in the job market: helping professionals understand what skills they need to develop to be competitive for their desired roles. Unlike basic job search tools, this analyzer provides actionable insights by:

- Analyzing multiple job postings to identify trending skills
- Comparing user skills against market demands
- Providing personalized skill gap analysis
- Highlighting high-demand skills to prioritize learning

 Features

Core Functionality
- Real-time Job Market Analysis: Fetches live job data from multiple sources
- Skill Gap Identification: Compares your skills against job requirements
- Interactive Filtering: Sort and filter skills by category
- Statistics Dashboard: Visual representation of skill match percentage
- Job Recommendations: Shows relevant job opportunities with skill matching

User Interactions
- Search & Filter: Find jobs by title or keywords
- Skill Sorting: View skills you have vs. skills to learn
- Job Sorting: Sort jobs by relevance or date
- Visual Indicators: Color-coded skill cards showing match status
- Responsive Design: Works on desktop, tablet, and mobile devices

 Technologies Used

- Frontend: HTML5, CSS3, JavaScript (ES6+)
- API: Arbeitnow Job Board API (free, no authentication required)
- Styling: Custom CSS with modern gradient designs
- Architecture: Single-page application (SPA)

API Information

This application integrates TWO external APIs to provide comprehensive career development insights:

API 1: Arbeitnow Job Board API
- Purpose: Real-time job market data and listings
- Documentation: https://www.arbeitnow.com/blog/job-board-api
- Endpoint: `https://www.arbeitnow.com/api/job-board-api`
- Authentication: None required 
- Rate Limit: Reasonable use policy
- Data Sources: Greenhouse, SmartRecruiters, Join.com, Team Tailor, Recruitee, Comeet

Why this API?
- Free and open access
- No API key registration required
- Real job data from trusted ATS platforms
- Regular updates with fresh job postings

API 2: Udemy Free Courses API (via RapidAPI)
- Purpose: Learning resources and course recommendations for skill gaps
- Documentation: https://rapidapi.com/tetrahedral786/api/paid-udemy-course-for-free
- Endpoint: `https://paid-udemy-course-for-free.p.rapidapi.com`
- Authentication: RapidAPI key required
- Free Tier: Available (Basic plan)
- Features: Search courses, get course details, find free Udemy courses

Why this API?
- Provides actionable learning paths for missing skills
- Free courses updated regularly
- Easy integration via RapidAPI
- Enhances user value by offering solutions, not just problems

API Credit: Both APIs are properly credited in the application footer and this documentation.

 Running Locally

 Prerequisites
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Optional: RapidAPI account for course recommendations (can skip and still use job analysis)

 Get API Keys (Optional for Enhanced Features)

 For Udemy Course Recommendations (Optional):
1. Go to [RapidAPI](https://rapidapi.com/)
2. Create a free account
3. Subscribe to [Udemy Free Courses API](https://rapidapi.com/tetrahedral786/api/paid-udemy-course-for-free)
4. Choose the FREE Basic plan
5. Copy your API key from the dashboard
6. Open `app.js` (NOT index.html) and find line ~14:
   ```javascript
   key: 'YOUR_RAPIDAPI_KEY_HERE', // Replace with your RapidAPI key
   ```
7. Replace `YOUR_RAPIDAPI_KEY_HERE` with your actual key
8. Save the file

Note: The app works WITHOUT this API key - you'll just see a message about adding it for course recommendations.

Steps

1. Clone the repository
   ```bash
   git clone <your-repo-url>
   cd job-skill-analyzer
   ```

2. Optional: Add your RapidAPI key
   - Edit `app.js`(line ~14)
   - Replace `YOUR_RAPIDAPI_KEY_HERE` with your actual key
   - Save the file

3. Open the application
   - Simply open `index.html` in your web browser
   - Or use a local server:
     ```bash
     # Python 3
     python -m http.server 8000
     
     # Python 2
     python -m SimpleHTTPServer 8000
     
     # Node.js
     npx http-server
     ```

4. Use the application
   - Enter a job title or keywords (e.g., "Software Engineer", "Data Analyst")
   - List your current skills, separated by commas
   - Click "Analyze Skill Gap"
   - Explore jobs, skills, and (optionally) course recommendations!

Deployment Instructions

Quick Deployment (Using Scripts)

We provide automated scripts for easy deployment:

Files:
- `deploy.sh` - Deploys application to web servers
- `setup_lb.sh` - Configures load balancer
- `test_lb.sh` - Verifies load balancing
- `haproxy.cfg` - HAProxy configuration template

Part 1: Deploy to Web Servers

1. Transfer files to web-01
   ```bash
   # Copy files to server
   scp -i ~/.ssh/school index.html style.css app.js deploy.sh ubuntu@3.95.223.149:~/
   
   # SSH to server
   ssh -i ~/.ssh/school ubuntu@3.95.223.149
   ```

2. Run deployment script
   ```bash
   sudo bash deploy.sh
   ```

3. Verify deployment
   ```bash
   curl -I http://localhost/skill-analyzer/ | grep X-Served-By
   # Should output: X-Served-By: 6894-web-01
   ```

4. Repeat for web-02
   ```bash
   # From local machine
   scp -i ~/.ssh/school index.html style.css app.js deploy.sh ubuntu@3.95.222.140:~/
   ssh -i ~/.ssh/school ubuntu@3.95.222.140
   
   # On server
   sudo bash deploy.sh
   
   # Verify
   curl -I http://localhost/skill-analyzer/ | grep X-Served-By
   # Should output: X-Served-By: 6894-web-02
   ```

 Part 2: Configure Load Balancer

1. SSH to load balancer
   ```bash
   ssh -i ~/.ssh/school ubuntu@13.220.198.133
   ```

2. Install nginx
   ```bash
   sudo apt update
   sudo apt install nginx -y
   ```

3. Configure nginx as load balancer
   ```bash
   sudo nano /etc/nginx/sites-available/load-balancer
   ```
   
   Add this configuration:
   ```nginx
   upstream backend_servers {
       server 3.95.223.149;      # Web01
       server 3.95.222.140;      # Web02
   }

   server {
       listen 80;
       server_name _;

       location /skill-analyzer/ {
           proxy_pass http://backend_servers/skill-analyzer/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

4. Enable configuration
   ```bash
   sudo ln -s /etc/nginx/sites-available/load-balancer /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   ```

5. Test and restart
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

 Part 3: Verification

Test Commands:
```bash
# Test individual servers
curl http://3.95.223.149/skill-analyzer/ | head -20
curl http://3.95.222.140/skill-analyzer/ | head -20

# Test load balancer distribution
for i in {1..10}; do
  curl -sI http://13.220.198.133/skill-analyzer/ | grep X-Served-By
done

# Should show alternating: 6894-web-01, 6894-web-02, 6894-web-01, 6894-web-02...
```

Browser Testing:
1. Open: `http://13.220.198.133/skill-analyzer/` (note the trailing slash)
2. Complete a skill gap analysis
3. Verify all features work through load balancer
4. Check browser's developer tools (Network tab) for `X-Served-By` header to see which server handled the request

 Accessing the Application

Important: URL Format

The application must be accessed with a trailing slash:

Correct: `http://<server-ip>/skill-analyzer/`  
 Incorrect: `http://<server-ip>/skill-analyzer` (will cause a redirect)

 Access Points

Via Load Balancer (Recommended):
```
http://13.220.198.133/skill-analyzer/
```

Direct Server Access (For Testing):
```
Web01: http://3.95.223.149/skill-analyzer/
Web02: http://3.95.222.140/skill-analyzer/
```

 Verification

To verify which server is handling your request:
1. Open browser's Developer Tools (F12)
2. Go to the Network tab
3. Reload the page
4. Click on the main document request
5. Look for the `X-Served-By` header
6. It will show either `6894-web-01` or `6894-web-02`

With multiple refreshes, you should see the header alternate between the two servers, confirming load balancing is working.

 Manual Deployment (Alternative)

If you prefer manual deployment without scripts, follow these steps:

1. On web-01 and web-02:
   ```bash
   sudo apt-get update
   sudo apt-get install -y nginx
   sudo mkdir -p /var/www/html/skill-analyzer
   sudo cp index.html style.css app.js /var/www/html/skill-analyzer/
   sudo chown -R www-data:www-data /var/www/html/skill-analyzer
   ```

2. Configure Nginx:
   ```bash
   sudo nano /etc/nginx/sites-available/default
   ```
   
   Add:
   ```nginx
   server {
       listen 80 default_server;
       listen [::]:80 default_server;

       root /var/www/html;
       index index.html;

       server_name _;

       add_header X-Served-By $hostname;

       location /skill-analyzer {
           alias /var/www/html/skill-analyzer;
           try_files $uri $uri/ /skill-analyzer/index.html;
           index index.html;
       }

       location / {
           try_files $uri $uri/ =404;
       }
   }
   ```

3. Restart nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. Repeat for both servers

How It Works

1. Data Collection: Application fetches job listings from Arbeitnow API
2. Skill Extraction: Analyzes job descriptions and tags to identify required skills
3. Comparison: Matches user skills against job requirements using fuzzy matching
4. Analysis: Calculates skill match percentage and identifies gaps
5. Visualization: Presents results in an intuitive, color-coded interface

Demo Video

[Link to demo video - to be added]

The demo video showcases:
- Local application usage
- Skill gap analysis workflow
- Filtering and sorting features
- Accessing via load balancer
- Real-time job matching
Error Handling

The application includes comprehensive error handling for:
- API connection failures
- Invalid user input
- Empty search results
- Network timeouts
- Malformed API responses

Users receive clear, actionable error messages and can retry operations.

 Future Enhancements (Optional)

- User authentication and profile saving
- Skill learning resource recommendations
- Historical skill trend analysis
- Email notifications for matching jobs
- Advanced data visualizations with charts
- Integration with multiple job APIs
- Machine learning for better skill matching
 Credits

- API Provider: Arbeitnow (https://www.arbeitnow.com)
- Job Data Sources: Greenhouse, SmartRecruiters, Join.com, Team Tailor, Recruitee, Comeet
- Developer: [Your Name]
- Course: ALU System Engineering & DevOps

Challenges & Solutions

Challenge 1: API Selection
Problem: Many job APIs require paid subscriptions or complex authentication.  
Solution: Found Arbeitnow API which is free and requires no authentication, perfect for this project.

Challenge 2: Skill Extraction
Problem: Job descriptions use varied terminology for the same skills.  
Solution: Implemented fuzzy matching algorithm using Levenshtein distance to handle skill variations.

 Challenge 3: Load Balancer Testing
Problem: Difficult to verify traffic distribution without proper tools.  
Solution: Added custom X-Served-By headers to identify which server handled each request.

 Challenge 4: Nginx URL Routing
Problem: Application would return 404 errors when accessed without trailing slash.  
Solution: Configured nginx with proper `alias` directive and `try_files` to handle URL variations correctly.


Link to web app: http://3.95.223.149/skill-analyzer/
                 

 License

This project is created for educational purposes as part of the ALU System Engineering & DevOps curriculum.

Contact

For questions or feedback, please contact: m.keira@alustudent.com


---

Note: This application uses publicly available job data and should be used responsibly. Rate limiting and caching should be implemented for production use.
