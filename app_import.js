
// ====== RESUME IMPORT PDF/DOCX ======
const localUid = () => 'imported_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

async function importResume(event) {
    const file = event.target.files[0];
    if (!file) return;

    const indicator = document.getElementById('saveIndicator');
    const originalHtml = indicator.innerHTML;
    indicator.className = 'save-indicator saving';
    indicator.innerHTML = '<div class="spinner"></div> Processing...';

    try {
        let text = '';
        if (file.type === 'application/pdf') {
            text = await readPDF(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.name.endsWith('.docx')) {
            text = await readDOCX(file);
        } else {
            throw new Error('Unsupported file format. Please upload PDF or DOCX.');
        }

        if (!text.trim()) throw new Error('Could not extract text from file.');

        parseResumeText(text);
        showToast('Resume imported! Please review and edit.', 'success');
    } catch (err) {
        console.error('Import error:', err);
        showToast(err.message || 'Error processing file', 'error');
    } finally {
        indicator.className = 'save-indicator';
        indicator.innerHTML = '<i class="fa-solid fa-cloud"></i> <span>Ready</span>';
        event.target.value = ''; // Reset input
    }
}

// Read PDF Text
async function readPDF(file) {
    if (!window.pdfjsLib) throw new Error('PDF library not loaded');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }
    return fullText;
}

// Read DOCX Text
async function readDOCX(file) {
    if (!window.mammoth) throw new Error('DOCX library not loaded');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value;
}

// Parse Extracted Text (Heuristic)
function parseResumeText(text) {
    // Normalize text
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    const fullText = lines.join('\n');

    // 1. Basic Info
    // Assume generic structure: Name first, then contact details
    // Heuristic: Name is usually the first non-empty line, commonly 2-3 words
    const potentialName = lines[0];
    if (potentialName && potentialName.split(' ').length < 5) {
        state.fullName = potentialName;
    }

    // extract email
    const emailMatch = fullText.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/);
    if (emailMatch) state.email = emailMatch[0];

    // extract phone
    // Common formats: +1-555-555-5555, (555) 555-5555, 555 555 5555
    const phoneMatch = fullText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) state.phone = phoneMatch[0];

    // extract links
    const linkedinMatch = fullText.match(/linkedin\.com\/in\/[\w-]+/);
    if (linkedinMatch) state.linkedin = 'https://' + linkedinMatch[0];

    const githubMatch = fullText.match(/github\.com\/[\w-]+/);
    if (githubMatch) state.github = 'https://' + githubMatch[0];

    // 2. Sections
    // Define keywords to identify sections
    const sectionKeywords = {
        education: ['education', 'academic history', 'studies'],
        projects: ['projects', 'personal projects', 'key projects'],
        experience: ['experience', 'work history', 'employment', 'professional experience'],
        skills: ['skills', 'technical skills', 'competencies', 'technologies'],
        certifications: ['certifications', 'certificates'],
        objective: ['objective', 'summary', 'profile', 'about me']
    };

    // Map text to sections
    let currentSection = null;
    let sectionContent = {
        education: [],
        projects: [],
        experience: [], // Not used in current state but good for parsing logic
        skills: [],
        certifications: [],
        objective: []
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();

        // Check if line is a section header (short lines matching keywords)
        let isHeader = false;
        if (line.length < 50) { // Headers are usually short
            for (const [section, keywords] of Object.entries(sectionKeywords)) {
                if (keywords.some(k => line.includes(k) && line.length < k.length + 10)) {
                    currentSection = section;
                    isHeader = true;
                    break;
                }
            }
        }

        if (!isHeader && currentSection) {
            sectionContent[currentSection].push(lines[i]);
        }
    }

    // 3. Populate State from Section Content

    // Objective
    if (sectionContent.objective.length) {
        state.objective = sectionContent.objective.join(' ').substring(0, 500); // Limit length
    }

    // Skills
    // Parsing skills is hard without a database. We'll dump them into a "General" category.
    if (sectionContent.skills.length) {
        const rawSkills = sectionContent.skills.join(', ');
        // Split by comma if possible, else just use the whole line
        const skillList = rawSkills.split(/[,|•]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 30);

        // Check if we already have a category, or create one
        if (skillList.length > 0) {
            // Clear existing sample skills if any
            if (state.skillCategories.length === 1 && state.skillCategories[0].name === 'Programming') {
                state.skillCategories = [];
            }

            state.skillCategories.push({
                id: localUid(),
                name: 'Imported Skills',
                skills: [...new Set(skillList)].slice(0, 15) // Limit to 15 unique skills
            });
        }
    }

    // Certifications
    if (sectionContent.certifications.length) {
        state.certifications = [];
        sectionContent.certifications.forEach(line => {
            // Heuristic: longer lines might be title + org
            if (line.length > 10) {
                state.certifications.push({
                    id: localUid(),
                    name: line,
                    org: '',
                    year: ''
                });
            }
        });
    }

    // Projects - Very hard to parse structure. 
    // We will create one project with the raw text if found, or try to split by bullet points.
    if (sectionContent.projects.length) {
        state.projects = [];
        let currentProj = null;

        sectionContent.projects.forEach(line => {
            // Assumption: Project titles are short, descriptions are long or start with bullets
            const isBullet = line.trim().match(/^[-•*]/);

            if (!isBullet && line.length < 50) {
                // New project title?
                currentProj = {
                    id: localUid(),
                    title: line,
                    technologies: [],
                    bullets: [],
                    impact: ''
                };
                state.projects.push(currentProj);
            } else if (currentProj) {
                currentProj.bullets.push(line.replace(/^[-•*]\s*/, ''));
            }
        });

        // If we couldn't structure it, just dump it into one generic project
        if (state.projects.length === 0 && sectionContent.projects.length > 0) {
            state.projects.push({
                id: localUid(),
                title: 'Imported Project Data',
                technologies: [],
                bullets: sectionContent.projects.slice(0, 5), // Limit lines
                impact: ''
            });
        }
    }

    // Education - Similar to projects, hard to parse structure correctly.
    if (sectionContent.education.length) {
        state.education = [];
        // Try to find years, degrees
        // Just a basic dump for now
        state.education.push({
            id: localUid(),
            degree: sectionContent.education[0] || 'Degree Name',
            college: sectionContent.education[1] || 'University Name',
            year: '',
            cgpa: '',
            coursework: []
        });
    }

    // Update Input Fields
    ['fullName', 'location', 'phone', 'email', 'linkedin', 'github', 'objective'].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = state[f] || '';
    });

    if (state.objective) updateCharCount(document.getElementById('objective'));

    renderAll();
    updateProgress();
    scheduleAutoSave();
}
