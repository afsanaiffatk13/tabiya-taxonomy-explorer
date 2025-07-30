/**
 * Spanish ESCO Data Converter for Tabiya Taxonomy
 * 
 * This script converts Spanish ESCO CSV files to match Tabiya's data structure.
 * It analyzes the unique identifiers and extracts Spanish translations for:
 * - preferredLabel, altLabels, description
 * 
 * Run this in Node.js environment with csv-parser and csv-writer packages
 */

const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');

// Configuration
const INPUT_DIR = './spanish-esco-raw/';  // Your downloaded Spanish ESCO files
const OUTPUT_DIR = './data/es/';          // Output directory for processed files
const ENGLISH_DIR = './data/en/';         // English files for comparison

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🔄 Starting Spanish ESCO Data Conversion...');

/**
 * STEP 1: Analyze unique identifiers across datasets
 */
async function analyzeIdentifiers() {
    console.log('\n📊 Analyzing unique identifiers...');
    
    try {
        // Check if input files exist
        if (!fs.existsSync(INPUT_DIR)) {
            throw new Error(`Input directory ${INPUT_DIR} does not exist. Please create it and add Spanish ESCO files.`);
        }
        
        if (!fs.existsSync(ENGLISH_DIR)) {
            throw new Error(`English directory ${ENGLISH_DIR} does not exist. Please ensure your English CSV files are in data/en/`);
        }
        
        // Read a sample of each file to understand structure
        const spanishOccupations = await readCsvSample(`${INPUT_DIR}occupations.csv`);
        const spanishOccGroups = await readCsvSample(`${INPUT_DIR}occupation_groups.csv`);
        const spanishSkills = await readCsvSample(`${INPUT_DIR}skills.csv`);
        const spanishSkillGroups = await readCsvSample(`${INPUT_DIR}skill_groups.csv`);
        
        const englishOccupations = await readCsvSample(`${ENGLISH_DIR}occupations.csv`);
        const englishSkills = await readCsvSample(`${ENGLISH_DIR}skills.csv`);
        
        console.log('\n🔍 SPANISH ESCO Structure Analysis:');
        console.log('Occupations columns:', Object.keys(spanishOccupations[0] || {}));
        console.log('Occupation Groups columns:', Object.keys(spanishOccGroups[0] || {}));
        console.log('Skills columns:', Object.keys(spanishSkills[0] || {}));
        console.log('Skill Groups columns:', Object.keys(spanishSkillGroups[0] || {}));
        
        console.log('\n🔍 ENGLISH TABIYA Structure:');
        console.log('English Occupations columns:', Object.keys(englishOccupations[0] || {}));
        console.log('English Skills columns:', Object.keys(englishSkills[0] || {}));
        
        // Analyze identifier patterns
        console.log('\n🔑 Identifier Analysis:');
        
        // For occupations: ESCO uses conceptUri, Tabiya likely uses ESCO codes
        if (spanishOccupations.length > 0) {
            console.log('Spanish Occupation sample:');
            console.log('- conceptUri:', spanishOccupations[0].conceptUri);
            console.log('- code:', spanishOccupations[0].code);
            console.log('- preferredLabel:', spanishOccupations[0].preferredLabel);
        }
        
        if (englishOccupations.length > 0) {
            console.log('English Occupation sample:');
            console.log('- CODE:', englishOccupations[0].CODE);
            console.log('- PREFERREDLABEL:', englishOccupations[0].PREFERREDLABEL);
        }
        
        // For skills: Need to find common identifier
        if (spanishSkills.length > 0) {
            console.log('Spanish Skill sample:');
            console.log('- conceptUri:', spanishSkills[0].conceptUri);
            console.log('- preferredLabel:', spanishSkills[0].preferredLabel);
        }
        
        return {
            spanishOccupations,
            spanishOccGroups,
            spanishSkills,
            spanishSkillGroups,
            englishOccupations,
            englishSkills
        };
    } catch (error) {
        console.error('❌ Error during analysis:', error.message);
        throw error;
    }
}

/**
 * STEP 2: Create mapping between English and Spanish data
 */
async function createMappings() {
    console.log('\n🗺️ Creating identifier mappings...');
    
    try {
        // Load full datasets for mapping
        const englishOccupations = await readFullCsv(`${ENGLISH_DIR}occupations.csv`);
        const englishOccGroups = await readFullCsv(`${ENGLISH_DIR}occupation_groups.csv`);
        const englishSkills = await readFullCsv(`${ENGLISH_DIR}skills.csv`);
        const englishSkillGroups = await readFullCsv(`${ENGLISH_DIR}skill_groups.csv`);
        
        const spanishOccupations = await readFullCsv(`${INPUT_DIR}occupations.csv`);
        const spanishOccGroups = await readFullCsv(`${INPUT_DIR}occupation_groups.csv`);
        const spanishSkills = await readFullCsv(`${INPUT_DIR}skills.csv`);
        const spanishSkillGroups = await readFullCsv(`${INPUT_DIR}skill_groups.csv`);
        
        // Create mappings based on ESCO codes/URIs
        const occupationMapping = createOccupationMapping(englishOccupations, spanishOccupations);
        const occupationGroupMapping = createOccupationGroupMapping(englishOccGroups, spanishOccGroups);
        const skillMapping = createSkillMapping(englishSkills, spanishSkills);
        const skillGroupMapping = createSkillGroupMapping(englishSkillGroups, spanishSkillGroups);
        
        console.log(`✅ Created mappings:`);
        console.log(`- Occupations: ${occupationMapping.size} matches`);
        console.log(`- Occupation Groups: ${occupationGroupMapping.size} matches`);
        console.log(`- Skills: ${skillMapping.size} matches`);
        console.log(`- Skill Groups: ${skillGroupMapping.size} matches`);
        
        return {
            occupationMapping,
            occupationGroupMapping,
            skillMapping,
            skillGroupMapping
        };
    } catch (error) {
        console.error('❌ Error creating mappings:', error.message);
        throw error;
    }
}

/**
 * STEP 3: Generate Spanish CSV files in Tabiya format
 */
async function generateSpanishFiles(mappings) {
    console.log('\n📝 Generating Spanish CSV files in Tabiya format...');
    
    try {
        // Load English files to get structure
        const englishOccupations = await readFullCsv(`${ENGLISH_DIR}occupations.csv`);
        const englishOccGroups = await readFullCsv(`${ENGLISH_DIR}occupation_groups.csv`);
        const englishSkills = await readFullCsv(`${ENGLISH_DIR}skills.csv`);
        const englishSkillGroups = await readFullCsv(`${ENGLISH_DIR}skill_groups.csv`);
        
        // Generate Spanish occupations.csv
        const spanishOccupationsData = englishOccupations.map(engOcc => {
            const spanishData = mappings.occupationMapping.get(engOcc.CODE);
            return {
                ID: engOcc.ID,
                ORIGINURI: engOcc.ORIGINURI,
                UUIDHISTORY: engOcc.UUIDHISTORY,
                OCCUPATIONGROUPCODE: engOcc.OCCUPATIONGROUPCODE,
                CODE: engOcc.CODE,
                DEFINITION: spanishData?.definition || engOcc.DEFINITION || '',
                SCOPENOTE: spanishData?.scopeNote || engOcc.SCOPENOTE || '',
                REGULATEDPROFESSIONNOTE: spanishData?.regulatedProfessionNote || engOcc.REGULATEDPROFESSIONNOTE || '',
                OCCUPATIONTYPE: engOcc.OCCUPATIONTYPE,
                ISLOCALIZED: engOcc.ISLOCALIZED,
                PREFERREDLABEL: spanishData?.preferredLabel || engOcc.PREFERREDLABEL,
                ALTLABELS: spanishData?.altLabels || engOcc.ALTLABELS || '',
                DESCRIPTION: spanishData?.description || engOcc.DESCRIPTION || '',
                CREATEDAT: engOcc.CREATEDAT,
                UPDATEDAT: engOcc.UPDATEDAT
            };
        });
        
        // Generate Spanish occupation_groups.csv
        const spanishOccGroupsData = englishOccGroups.map(engGroup => {
            const spanishData = mappings.occupationGroupMapping.get(engGroup.CODE);
            return {
                ID: engGroup.ID,
                CODE: engGroup.CODE,
                PREFERREDLABEL: spanishData?.preferredLabel || engGroup.PREFERREDLABEL,
                ALTLABELS: spanishData?.altLabels || engGroup.ALTLABELS || '',
                DESCRIPTION: spanishData?.description || engGroup.DESCRIPTION || '',
                GROUPTYPE: engGroup.GROUPTYPE,
                CREATEDAT: engGroup.CREATEDAT,
                UPDATEDAT: engGroup.UPDATEDAT
            };
        });
        
        // Generate Spanish skills.csv
        const spanishSkillsData = englishSkills.map(engSkill => {
            const spanishData = mappings.skillMapping.get(engSkill.ID);
            return {
                ID: engSkill.ID,
                ORIGINURI: engSkill.ORIGINURI,
                UUIDHISTORY: engSkill.UUIDHISTORY,
                DEFINITION: spanishData?.definition || engSkill.DEFINITION || '',
                SCOPENOTE: spanishData?.scopeNote || engSkill.SCOPENOTE || '',
                REUSELEVEL: engSkill.REUSELEVEL,
                SKILLTYPE: engSkill.SKILLTYPE,
                PREFERREDLABEL: spanishData?.preferredLabel || engSkill.PREFERREDLABEL,
                ALTLABELS: spanishData?.altLabels || engSkill.ALTLABELS || '',
                DESCRIPTION: spanishData?.description || engSkill.DESCRIPTION || '',
                ISLOCALIZED: engSkill.ISLOCALIZED,
                CREATEDAT: engSkill.CREATEDAT,
                UPDATEDAT: engSkill.UPDATEDAT
            };
        });
        
        // Generate Spanish skill_groups.csv
        const spanishSkillGroupsData = englishSkillGroups.map(engSkillGroup => {
            const spanishData = mappings.skillGroupMapping.get(engSkillGroup.ID);
            return {
                ID: engSkillGroup.ID,
                ORIGINURI: engSkillGroup.ORIGINURI,
                UUIDHISTORY: engSkillGroup.UUIDHISTORY,
                CODE: engSkillGroup.CODE,
                SCOPENOTE: spanishData?.scopeNote || engSkillGroup.SCOPENOTE || '',
                PREFERREDLABEL: spanishData?.preferredLabel || engSkillGroup.PREFERREDLABEL,
                ALTLABELS: spanishData?.altLabels || engSkillGroup.ALTLABELS || '',
                DESCRIPTION: spanishData?.description || engSkillGroup.DESCRIPTION || '',
                CREATEDAT: engSkillGroup.CREATEDAT,
                UPDATEDAT: engSkillGroup.UPDATEDAT
            };
        });
        
        // Write CSV files with complete column sets
        await writeCsvFile(`${OUTPUT_DIR}occupations.csv`, spanishOccupationsData, [
            'ID', 'ORIGINURI', 'UUIDHISTORY', 'OCCUPATIONGROUPCODE', 'CODE', 'DEFINITION', 
            'SCOPENOTE', 'REGULATEDPROFESSIONNOTE', 'OCCUPATIONTYPE', 'ISLOCALIZED',
            'PREFERREDLABEL', 'ALTLABELS', 'DESCRIPTION', 'CREATEDAT', 'UPDATEDAT'
        ]);
        
        await writeCsvFile(`${OUTPUT_DIR}occupation_groups.csv`, spanishOccGroupsData, [
            'ID', 'CODE', 'PREFERREDLABEL', 'ALTLABELS', 'DESCRIPTION', 
            'GROUPTYPE', 'CREATEDAT', 'UPDATEDAT'
        ]);
        
        await writeCsvFile(`${OUTPUT_DIR}skills.csv`, spanishSkillsData, [
            'ID', 'ORIGINURI', 'UUIDHISTORY', 'DEFINITION', 'SCOPENOTE', 'REUSELEVEL',
            'SKILLTYPE', 'PREFERREDLABEL', 'ALTLABELS', 'DESCRIPTION', 'ISLOCALIZED', 
            'CREATEDAT', 'UPDATEDAT'
        ]);
        
        await writeCsvFile(`${OUTPUT_DIR}skill_groups.csv`, spanishSkillGroupsData, [
            'ID', 'ORIGINURI', 'UUIDHISTORY', 'CODE', 'SCOPENOTE', 
            'PREFERREDLABEL', 'ALTLABELS', 'DESCRIPTION', 'CREATEDAT', 'UPDATEDAT'
        ]);
        
        // Copy hierarchy and relation files (these don't need translation)
        await copyFile(`${ENGLISH_DIR}occupation_hierarchy.csv`, `${OUTPUT_DIR}occupation_hierarchy.csv`);
        await copyFile(`${ENGLISH_DIR}skill_hierarchy.csv`, `${OUTPUT_DIR}skill_hierarchy.csv`);
        await copyFile(`${ENGLISH_DIR}occupation_to_skill_relations.csv`, `${OUTPUT_DIR}occupation_to_skill_relations.csv`);
        
        console.log('✅ All Spanish CSV files generated successfully!');
    } catch (error) {
        console.error('❌ Error generating files:', error.message);
        throw error;
    }
}

// Helper functions
function createOccupationMapping(englishOccs, spanishOccs) {
    const mapping = new Map();
    
    // Create Spanish lookup by ESCO code
    const spanishByCode = new Map();
    spanishOccs.forEach(spOcc => {
        if (spOcc.code) {
            spanishByCode.set(spOcc.code.toString(), spOcc);
        }
    });
    
    // Map English occupations to Spanish translations
    englishOccs.forEach(engOcc => {
        const spanishMatch = spanishByCode.get(engOcc.CODE?.toString());
        if (spanishMatch) {
            mapping.set(engOcc.CODE, {
                preferredLabel: spanishMatch.preferredLabel || '',
                altLabels: spanishMatch.altLabels || '',
                description: spanishMatch.description || '',
                definition: spanishMatch.definition || '',
                scopeNote: spanishMatch.scopeNote || '',
                regulatedProfessionNote: spanishMatch.regulatedProfessionNote || ''
            });
        }
    });
    
    console.log(`🔍 Occupations mapping details: ${mapping.size} matches found`);
    
    return mapping;
}

function createOccupationGroupMapping(englishGroups, spanishGroups) {
    const mapping = new Map();
    
    // Create Spanish lookup by ESCO code
    const spanishByCode = new Map();
    spanishGroups.forEach(spGroup => {
        if (spGroup.code) {
            spanishByCode.set(spGroup.code.toString(), spGroup);
        }
    });
    
    // Map English groups to Spanish translations
    englishGroups.forEach(engGroup => {
        const spanishMatch = spanishByCode.get(engGroup.CODE?.toString());
        if (spanishMatch) {
            mapping.set(engGroup.CODE, {
                preferredLabel: spanishMatch.preferredLabel || '',
                altLabels: spanishMatch.altLabels || '',
                description: spanishMatch.description || ''
            });
        }
    });
    
    console.log(`🔍 Occupation Groups mapping details: ${mapping.size} matches found`);
    
    return mapping;
}

function createSkillMapping(englishSkills, spanishSkills) {
    const mapping = new Map();
    
    // Create Spanish lookup by conceptUri (full URI)
    const spanishByUri = new Map();
    spanishSkills.forEach(spSkill => {
        if (spSkill.conceptUri) {
            spanishByUri.set(spSkill.conceptUri, spSkill);
        }
    });
    
    // Map English skills to Spanish translations using ORIGINURI
    englishSkills.forEach(engSkill => {
        if (engSkill.ORIGINURI) {
            const spanishMatch = spanishByUri.get(engSkill.ORIGINURI);
            if (spanishMatch) {
                mapping.set(engSkill.ID, {
                    preferredLabel: spanishMatch.preferredLabel,
                    altLabels: spanishMatch.altLabels || '',
                    description: spanishMatch.description || '',
                    definition: spanishMatch.definition || '',
                    scopeNote: spanishMatch.scopeNote || ''
                });
            }
        }
    });
    
    console.log(`🔍 Skills mapping details: ${mapping.size} matches found`);
    if (mapping.size === 0 && englishSkills.length > 0 && spanishSkills.length > 0) {
        console.log('Sample English ORIGINURI:', englishSkills[0].ORIGINURI);
        console.log('Sample Spanish conceptUri:', spanishSkills[0].conceptUri);
    }
    
    return mapping;
}

function createSkillGroupMapping(englishSkillGroups, spanishSkillGroups) {
    const mapping = new Map();
    
    // Create Spanish lookup by conceptUri (full URI)
    const spanishByUri = new Map();
    spanishSkillGroups.forEach(spSkillGroup => {
        if (spSkillGroup.conceptUri) {
            spanishByUri.set(spSkillGroup.conceptUri, spSkillGroup);
        }
    });
    
    // Map English skill groups to Spanish translations using ORIGINURI
    englishSkillGroups.forEach(engSkillGroup => {
        if (engSkillGroup.ORIGINURI) {
            const spanishMatch = spanishByUri.get(engSkillGroup.ORIGINURI);
            if (spanishMatch) {
                mapping.set(engSkillGroup.ID, {
                    preferredLabel: spanishMatch.preferredLabel,
                    altLabels: spanishMatch.altLabels || '',
                    description: spanishMatch.description || '',
                    scopeNote: spanishMatch.scopeNote || ''
                });
            }
        }
    });
    
    console.log(`🔍 Skill Groups mapping details: ${mapping.size} matches found`);
    if (mapping.size === 0 && englishSkillGroups.length > 0 && spanishSkillGroups.length > 0) {
        console.log('Sample English ORIGINURI:', englishSkillGroups[0].ORIGINURI);
        console.log('Sample Spanish conceptUri:', spanishSkillGroups[0].conceptUri);
    }
    
    return mapping;
}

function extractIdFromUri(uri) {
    // Extract ID from ESCO URI
    const match = uri.match(/\/([^\/]+)$/);
    return match ? match[1] : uri;
}

async function readCsvSample(filePath, limit = 5) {
    return new Promise((resolve, reject) => {
        const results = [];
        let count = 0;
        
        if (!fs.existsSync(filePath)) {
            reject(new Error(`File not found: ${filePath}`));
            return;
        }
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                if (count < limit) {
                    results.push(data);
                    count++;
                }
            })
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

async function readFullCsv(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        
        if (!fs.existsSync(filePath)) {
            reject(new Error(`File not found: ${filePath}`));
            return;
        }
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

async function writeCsvFile(filePath, data, headers) {
    const csvWriter = createCsvWriter({
        path: filePath,
        header: headers.map(h => ({ id: h, title: h }))
    });
    
    await csvWriter.writeRecords(data);
    console.log(`✅ Written: ${filePath} (${data.length} records)`);
}

async function copyFile(src, dest) {
    if (!fs.existsSync(src)) {
        throw new Error(`Source file not found: ${src}`);
    }
    fs.copyFileSync(src, dest);
    console.log(`✅ Copied: ${path.basename(dest)}`);
}

// Main execution
async function main() {
    try {
        console.log('🚀 Spanish ESCO Data Converter for Tabiya\n');
        
        // Step 1: Analyze identifiers
        const analysis = await analyzeIdentifiers();
        
        // Step 2: Create mappings
        const mappings = await createMappings();
        
        // Step 3: Generate Spanish files
        await generateSpanishFiles(mappings);
        
        console.log('\n🎉 Spanish data conversion completed successfully!');
        console.log(`📁 Spanish files are ready in: ${OUTPUT_DIR}`);
        console.log('\nNext steps:');
        console.log('1. Verify the generated files have correct Spanish translations');
        console.log('2. Test the multi-language taxonomy explorer');
        console.log('3. Handle any missing translations manually');
        
    } catch (error) {
        console.error('❌ Error during conversion:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Ensure Spanish ESCO files are in ./spanish-esco-raw/');
        console.log('2. Ensure English files are in ./data/en/');
        console.log('3. Check that all required CSV files are present');
        process.exit(1);
    }
}

// Run the converter
main();