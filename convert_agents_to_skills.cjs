const fs = require('fs');
const path = require('path');

const agentsDir = path.join(__dirname, 'agents');
const outputDir = path.join(__dirname, 'plugin', 'skills');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));

console.log(`Found ${files.length} agents in ${agentsDir}`);

const currentSkillNames = new Set();

files.forEach(file => {
    try {
        const filePath = path.join(agentsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Extract frontmatter
        const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!frontmatterMatch) {
            console.error(`No frontmatter in ${file}`);
            return;
        }

        const frontmatterLines = frontmatterMatch[1].split(/\r?\n/);
        const frontmatter = {};
        frontmatterLines.forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
                frontmatter[key.trim()] = valueParts.join(':').trim();
            }
        });

        const rawName = frontmatter.name || path.basename(file, '.md');
        const description = frontmatter.description || '';
        
        // Normalize name: "builder-spring-feature" -> "builder-spring"
        // Also ensure it's hyphen-case
        let normalizedName = rawName.replace(/-feature$/, '').toLowerCase().replace(/[^a-z0-h0-9-]/g, '-');
        currentSkillNames.add(normalizedName);

        console.log(`Processing ${file} -> ${normalizedName}`);

        const skillFolderPath = path.join(outputDir, normalizedName);
        if (!fs.existsSync(skillFolderPath)) {
            fs.mkdirSync(skillFolderPath, { recursive: true });
        }

        const skillMdPath = path.join(skillFolderPath, 'SKILL.md');

        // Extract content after frontmatter
        const mainContent = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').trim();
        
        // Gemini SKILL.md requires name and description in frontmatter
        const skillFileContent = `---
name: ${normalizedName}
description: ${description}
---

${mainContent}`;

        fs.writeFileSync(skillMdPath, skillFileContent);
    } catch (err) {
        console.error(`Error processing ${file}:`, err);
    }
});

// Cleanup: remove skills that no longer have a corresponding agent
const existingSkills = fs.readdirSync(outputDir);
existingSkills.forEach(skill => {
    if (!currentSkillNames.has(skill)) {
        const skillPath = path.join(outputDir, skill);
        console.log(`Removing obsolete skill: ${skill}`);
        fs.rmSync(skillPath, { recursive: true, force: true });
    }
});

console.log('\nSuccessfully created skills in plugin/skills/');
console.log('You can now install them individually using:');
console.log('gemini skills install <repoURL> --path plugin/skills/<skill-name>');
console.log('Or link all of them locally using:');
console.log('gemini skills link . --path plugin/skills');
