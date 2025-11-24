// Store data globally
let jobsData = [];
let skillsAnalysis = {};
let userSkills = [];
let learningResources = [];
let lastSearchQuery = '';

// API Configuration - TWO APIS USED
// API 1: Arbeitnow - Job listings (FREE, no key needed)
const JOBS_API_URL = 'https://www.arbeitnow.com/api/job-board-api';

// API 2: Udemy Free Courses - Learning resources (requires RapidAPI key)
const COURSES_API_CONFIG = {
    url: 'https://paid-udemy-course-for-free.p.rapidapi.com',
    key: 'YOUR_RAPIDAPI_KEY_HERE', // Replace with your RapidAPI key
    host: 'paid-udemy-course-for-free.p.rapidapi.com'
};

// Error handling function
function showErrorOld(message) {
    const errorEl = document.getElementById('errorMsg');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

// Loading state management
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('analyzeBtn').disabled = show;
}

// Results visibility management
function showResults(show) {
    document.getElementById('results').style.display = show ? 'block' : 'none';
}

// Main analysis function - calls both APIs
async function analyzeSkillGap() {
    const jobTitle = document.getElementById('jobTitle').value.trim();
    const skillsInput = document.getElementById('currentSkills').value.trim();

    // Input validation
    if (!jobTitle) {
        showError('Please enter a job title or keywords');
        return;
    }

    if (!skillsInput) {
        showError('Please enter your current skills');
        return;
    }

    // Parse user skills
    userSkills = skillsInput.split(',').map(s => s.trim().toLowerCase()).filter(s => s);

    showLoading(true);
    showResults(false);

    try {
        // API 1: Fetch job data from Arbeitnow API with timeout
        const url = `${JOBS_API_URL}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('Failed to fetch job data from API. Please try again.');
        }

        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            throw new Error('No jobs found. Please try again.');
        }

        // Filter jobs based on search term
        const searchTerm = jobTitle.toLowerCase();
        jobsData = data.data.filter(job => {
            const jobText = `${job.title} ${job.description || ''}`.toLowerCase();
            return jobText.includes(searchTerm) || 
                   job.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
        });

        // If filtered list is too small, use all jobs
        if (jobsData.length < 10) {
            jobsData = data.data;
        }

        // Analyze skills from job postings
        analyzeSkills(jobsData);
        
        // API 2: Fetch learning resources for missing skills
        await fetchLearningResources();
        
        // Display results
        displayStats();
        displaySkills();
        displayJobs(jobsData);
        displayLearningResources();
        
        showResults(true);

    } catch (error) {
        if (error.name === 'AbortError') {
            showError('Request timed out. Please check your connection and try again.');
        } else {
            showError(error.message || 'An error occurred. Please try again.');
        }
        console.error('Error:', error);
    } finally {
        showLoading(false);
    }
}

// Analyze skills from job postings
function analyzeSkills(jobs) {
    const allSkills = new Set();
    const skillFrequency = {};

    // Common skills to look for across all job categories
    const commonSkills = [
        // Programming Languages
        'javascript', 'python', 'java', 'typescript', 'c++', 'c#', 'php', 'ruby', 
        'golang', 'swift', 'kotlin', 'rust', 'scala', 'r',
        
        // Web Technologies
        'react', 'angular', 'vue', 'node.js', 'html', 'css', 'next.js', 'express',
        'django', 'flask', 'spring', 'laravel', 'rails',
        
        // Databases
        'sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'dynamodb',
        
        // Cloud & DevOps
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform',
        'ansible', 'linux', 'git', 'github', 'gitlab',
        
        // Data & AI
        'machine learning', 'data analysis', 'tensorflow', 'pytorch', 'pandas', 
        'numpy', 'scikit-learn', 'tableau', 'power bi', 'excel', 'spark',
        
        // APIs & Architecture
        'rest api', 'graphql', 'microservices', 'api design', 'system design',
        
        // Design & Product
        'figma', 'sketch', 'photoshop', 'illustrator', 'ui/ux', 'product management',
        'wireframing', 'prototyping', 'user research',
        
        // Business & Soft Skills
        'project management', 'agile', 'scrum', 'kanban', 'leadership', 
        'communication', 'problem solving', 'team collaboration', 'analytical thinking',
        'salesforce', 'sap', 'jira', 'confluence',
        
        // Marketing & Content
        'seo', 'content marketing', 'google analytics', 'social media', 'copywriting',
        'email marketing', 'sem', 'ppc'
    ];

    // Extract skills from job descriptions and tags
    jobs.forEach(job => {
        const text = `${job.title} ${job.description || ''} ${job.tags?.join(' ') || ''}`.toLowerCase();
        
        commonSkills.forEach(skill => {
            if (text.includes(skill) || job.tags?.some(tag => tag.toLowerCase().includes(skill))) {
                allSkills.add(skill);
                skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
            }
        });
    });

    // Categorize skills
    skillsAnalysis = {
        has: [],
        missing: [],
        recommended: []
    };

    allSkills.forEach(skill => {
        const hasSkill = userSkills.some(us => 
            us === skill || 
            skill.includes(us) || 
            us.includes(skill) ||
            levenshteinDistance(us, skill) <= 2
        );

        const frequency = skillFrequency[skill];
        const demandPercentage = (frequency / jobs.length) * 100;

        const skillData = {
            name: skill,
            frequency: frequency,
            demand: demandPercentage.toFixed(0) + '%'
        };

        if (hasSkill) {
            skillsAnalysis.has.push(skillData);
        } else {
            skillsAnalysis.missing.push(skillData);
            // High demand skills (appear in 30%+ of jobs)
            if (demandPercentage >= 30) {
                skillsAnalysis.recommended.push(skillData);
            }
        }
    });

    // Sort by frequency
    Object.keys(skillsAnalysis).forEach(key => {
        skillsAnalysis[key].sort((a, b) => b.frequency - a.frequency);
    });
}

// Simple Levenshtein distance for fuzzy matching
function levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[str2.length][str1.length];
}

// Display statistics dashboard
function displayStats() {
    const totalSkillsInMarket = skillsAnalysis.has.length + skillsAnalysis.missing.length;
    const matchPercentage = totalSkillsInMarket > 0 
        ? ((skillsAnalysis.has.length / totalSkillsInMarket) * 100).toFixed(0)
        : 0;

    const statsHTML = `
        <div class="stat-card">
            <div class="stat-number">${matchPercentage}%</div>
            <div class="stat-label">Skill Match Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${skillsAnalysis.has.length}</div>
            <div class="stat-label">Skills You Have</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${skillsAnalysis.missing.length}</div>
            <div class="stat-label">Skills to Learn</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${jobsData.length}</div>
            <div class="stat-label">Jobs Analyzed</div>
        </div>
    `;

    document.getElementById('statsGrid').innerHTML = statsHTML;
}

// Display skills with filtering
function displaySkills() {
    const filter = document.getElementById('filterSkills').value;
    let skillsToDisplay = [];

    if (filter === 'all') {
        skillsToDisplay = [
            ...skillsAnalysis.has.map(s => ({...s, status: 'has'})),
            ...skillsAnalysis.missing.map(s => ({...s, status: 'missing'}))
        ];
    } else {
        skillsToDisplay = skillsAnalysis[filter].map(s => ({...s, status: filter}));
    }

    if (skillsToDisplay.length === 0) {
        document.getElementById('skillsGrid').innerHTML = 
            '<p class="empty-state">No skills found in this category. Try analyzing different jobs!</p>';
        return;
    }

    const skillsHTML = skillsToDisplay.slice(0, 30).map(skill => `
        <div class="skill-card ${skill.status}" onclick="handleSkillClick('${skill.name.replace(/'/g, "\\'")}', '${skill.status}')">
            <div class="skill-name">${capitalize(skill.name)}</div>
            <div class="skill-status">
                ${skill.status === 'has' ? '✓ You have this' : 
                  skill.status === 'recommended' ? '⭐ High Demand' : '✗ Missing'}
            </div>
            <div class="skill-status">Found in ${skill.demand} of jobs</div>
            <div style="font-size: 0.8em; color: #999; margin-top: 5px;">Click to filter jobs</div>
        </div>
    `).join('');

    document.getElementById('skillsGrid').innerHTML = skillsHTML;
}

// Handle skill card click to filter jobs by that skill
function handleSkillClick(skillName, status) {
    const filteredJobs = jobsData.filter(job => {
        const text = `${job.title} ${job.description || ''} ${job.tags?.join(' ') || ''}`.toLowerCase();
        return text.includes(skillName.toLowerCase());
    });
    
    if (filteredJobs.length > 0) {
        displayJobs(filteredJobs);
        // Scroll to jobs section
        document.querySelector('.jobs-section').scrollIntoView({ behavior: 'smooth' });
        // Show notification
        const notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #667eea; color: white; padding: 15px 25px; border-radius: 8px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
        notification.textContent = `Showing ${filteredJobs.length} jobs requiring "${capitalize(skillName)}"`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

// Display job listings
function displayJobs(jobs) {
    const jobsHTML = jobs.slice(0, 15).map(job => {
        // Extract skills from tags
        const jobSkills = job.tags || [];
        const matchedSkills = jobSkills.filter(tag => 
            userSkills.some(us => 
                tag.toLowerCase().includes(us) || 
                us.includes(tag.toLowerCase())
            )
        );

        return `
            <div class="job-card">
                <div class="job-title">${job.title}</div>
                <div class="job-company">${job.company_name}</div>
                <div class="job-meta">
                    <span>📍 ${job.location || 'Remote'}</span>
                    ${job.remote ? '<span>🏠 Remote</span>' : ''}
                    <span>📅 ${formatDate(job.created_at)}</span>
                </div>
                <div class="job-description">${truncate(job.description, 250)}</div>
                ${jobSkills.length > 0 ? `
                    <div class="job-skills">
                        ${jobSkills.slice(0, 10).map(skill => `
                            <span class="skill-tag ${matchedSkills.includes(skill) ? 'has-skill' : ''}">${skill}</span>
                        `).join('')}
                    </div>
                ` : ''}
                <a href="${job.url}" target="_blank" style="color: #667eea; margin-top: 15px; display: inline-block;">View Job →</a>
            </div>
        `;
    }).join('');

    document.getElementById('jobsContainer').innerHTML = jobsHTML || 
        '<p class="empty-state">No jobs available at the moment.</p>';
}

// API 2 Function: Fetch learning resources from Udemy API
async function fetchLearningResources() {
    // Get top 5 missing skills to search for courses
    const topMissingSkills = skillsAnalysis.missing.slice(0, 5).map(s => s.name);
    
    if (topMissingSkills.length === 0) {
        learningResources = [];
        return;
    }

    try {
        // Build search query from missing skills
        const searchQuery = topMissingSkills.join(' ');
        const url = `${COURSES_API_CONFIG.url}/search?s=${encodeURIComponent(searchQuery)}`;

        // Only call API if user has provided a valid key
        if (COURSES_API_CONFIG.key === 'YOUR_RAPIDAPI_KEY_HERE') {
            console.log('Udemy API key not configured. Skipping course recommendations.');
            learningResources = [];
            return;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': COURSES_API_CONFIG.key,
                'X-RapidAPI-Host': COURSES_API_CONFIG.host
            }
        });

        if (response.ok) {
            const data = await response.json();
            learningResources = data.courses || data || [];
        } else {
            console.log('Could not fetch courses. API may be unavailable.');
            learningResources = [];
        }
    } catch (error) {
        console.log('Error fetching courses:', error);
        learningResources = [];
    }
}

// Display learning resources
function displayLearningResources() {
    const container = document.getElementById('coursesContainer');
    
    if (learningResources.length === 0) {
        container.innerHTML = `
            <div class="job-card" style="text-align: center;">
                <p>📘 To see personalized course recommendations, add your RapidAPI key for the Udemy API.</p>
                <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
                    Get it free at: 
                    <a href="https://rapidapi.com/tetrahedral786/api/paid-udemy-course-for-free" 
                       target="_blank" style="color: #667eea;">RapidAPI Udemy Courses</a>
                </p>
            </div>
        `;
        return;
    }

    const coursesHTML = learningResources.slice(0, 6).map(course => `
        <div class="job-card">
            <div class="job-title" style="font-size: 1.2em;">${course.title || course.courseName || 'Course'}</div>
            <div class="job-company" style="color: #f59e0b;">⭐ ${course.rating || 'N/A'} Rating</div>
            <div class="job-meta">
                <span>👥 ${course.students || course.enrolled || 'N/A'} students</span>
                <span>⏱️ ${course.duration || 'Self-paced'}</span>
                ${course.level ? `<span>📊 ${course.level}</span>` : ''}
            </div>
            <div class="job-description">${truncate(course.description || 'Learn essential skills for your career growth', 150)}</div>
            <div style="margin-top: 15px;">
                <span class="skill-tag" style="background: #10b981; color: white;">🎓 FREE Course</span>
            </div>
            ${course.url ? `<a href="${course.url}" target="_blank" style="color: #667eea; margin-top: 15px; display: inline-block;">Enroll Now →</a>` : ''}
        </div>
    `).join('');

    container.innerHTML = coursesHTML;
}

// Filter results handler
function filterResults() {
    displaySkills();
}

// Sort results handler
function sortResults() {
    const sortBy = document.getElementById('sortJobs').value;
    
    if (sortBy === 'date') {
        jobsData.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
    } else if (sortBy === 'relevance') {
        // Compute matched-skill count per job and sort descending
        jobsData.sort((a, b) => {
            const aMatches = (a.tags || []).filter(tag => userSkills.some(us => tag.toLowerCase().includes(us) || us.includes(tag.toLowerCase()))).length;
            const bMatches = (b.tags || []).filter(tag => userSkills.some(us => tag.toLowerCase().includes(us) || us.includes(tag.toLowerCase()))).length;
            return bMatches - aMatches;
        });
    }
    
    displayJobs(jobsData);
}

// Utility: Capitalize strings
function capitalize(str) {
    return str.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Utility: Truncate text
function truncate(str, length) {
    if (!str) return 'No description available';
    return str.length > length ? str.substring(0, length) + '...' : str;
}

// Utility: Format date
function formatDate(dateString) {
    if (!dateString) return 'Recently posted';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

// Event Listeners
document.getElementById('analyzeBtn').addEventListener('click', analyzeSkillGap);
document.getElementById('clearBtn').addEventListener('click', clearAndReset);
document.getElementById('filterSkills').addEventListener('change', filterResults);
document.getElementById('sortJobs').addEventListener('change', sortResults);

// Add enter key support
document.getElementById('jobTitle').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') analyzeSkillGap();
});

// Clear and reset function
function clearAndReset() {
    document.getElementById('jobTitle').value = '';
    document.getElementById('currentSkills').value = '';
    document.getElementById('results').style.display = 'none';
    document.getElementById('errorMsg').style.display = 'none';
    jobsData = [];
    skillsAnalysis = {};
    userSkills = [];
    learningResources = [];
    lastSearchQuery = '';
}

// Add retry capability on error
function showError(message) {
    const errorEl = document.getElementById('errorMsg');
    errorEl.innerHTML = `
        <strong>Error:</strong> ${message}
        <br><br>
        <button onclick="analyzeSkillGap()" style="padding: 8px 16px; margin-top: 10px;">
            Retry Analysis
        </button>
    `;
    errorEl.style.display = 'block';
}