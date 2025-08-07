// Web Worker for CSV Processing and Data Operations
// This runs in a separate thread to keep UI responsive

// Import Papa Parse for CSV parsing
importScripts('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js');

// Worker state
let workerData = {
    occupations: [],
    groups: [],
    skills: [],
    skillGroups: [],
    skillsMaster: {},
    stats: {}
};

// Progress tracking
let currentProgress = {
    phase: '',
    completed: 0,
    total: 0,
    message: ''
};

// Message handler for commands from main thread
self.onmessage = function(e) {
    const { command, data } = e.data;
    
    try {
        switch (command) {
            case 'PROCESS_CSV_BATCH':
                processCsvBatch(data);
                break;
            case 'BUILD_SKILLS_MASTER':
                buildSkillsMaster(data);
                break;
            case 'CALCULATE_STATS':
                calculateStats();
                break;
            case 'FILTER_DATA':
                filterData(data);
                break;
            case 'SEARCH_DATA':
                searchData(data);
                break;
            default:
                postMessage({ type: 'ERROR', error: `Unknown command: ${command}` });
        }
    } catch (error) {
        postMessage({ 
            type: 'ERROR', 
            error: error.message,
            stack: error.stack 
        });
    }
};

// Process CSV files in batches to prevent blocking
function processCsvBatch({ csvData, dataType, options, batchId }) {
    updateProgress(`Processing ${dataType}`, 0, 1, `Parsing CSV data...`);
    
    // Parse CSV with Papa Parse
    const parseOptions = {
        header: true,
        dynamicTyping: (field) => {
            const codeFields = ['CODE', 'OCCUPATIONGROUPCODE', 'PARENTID', 'CHILDID', 'OCCUPATIONID', 'SKILLID'];
            return !codeFields.includes(field);
        },
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        chunk: (results, parser) => {
            // Process chunk immediately to keep memory usage low
            processDataChunk(results.data, dataType, batchId);
        },
        complete: (results) => {
            // Send completion message
            postMessage({
                type: 'CSV_BATCH_COMPLETE',
                batchId: batchId,
                dataType: dataType,
                rowCount: results.data.length,
                errors: results.errors
            });
            
            updateProgress(`${dataType} complete`, 1, 1, `Processed ${results.data.length} rows`);
        }
    };
    
    Papa.parse(csvData, parseOptions);
}

// Process individual chunks of data
function processDataChunk(chunk, dataType, batchId) {
    const processedChunk = [];
    
    chunk.forEach(row => {
        let processedRow = null;
        
        switch (dataType) {
            case 'occupations':
                processedRow = processOccupationRow(row);
                break;
            case 'groups':
                processedRow = processGroupRow(row);
                break;
            case 'skills':
                processedRow = processSkillRow(row);
                break;
            case 'skillGroups':
                processedRow = processSkillGroupRow(row);
                break;
            case 'hierarchy':
                processedRow = processHierarchyRow(row);
                break;
            case 'skillHierarchy':
                processedRow = processSkillHierarchyRow(row);
                break;
            case 'occupationToSkills':
                processedRow = processOccupationToSkillRow(row);
                break;
        }
        
        if (processedRow) {
            processedChunk.push(processedRow);
        }
    });
    
    // Send processed chunk back to main thread
    if (processedChunk.length > 0) {
        postMessage({
            type: 'DATA_CHUNK_PROCESSED',
            batchId: batchId,
            dataType: dataType,
            chunk: processedChunk
        });
    }
}

// Process individual row types
function processOccupationRow(row) {
    if (!row.CODE || !row.PREFERREDLABEL) return null;
    
    const code = row.CODE.toString().trim();
    const isUnseen = code.startsWith('I');
    
    return {
        id: row.ID,
        code: code,
        label: row.PREFERREDLABEL.trim(),
        description: row.DESCRIPTION ? row.DESCRIPTION.substring(0, 300).trim() : '',
        altLabels: row.ALTLABELS ? row.ALTLABELS.trim() : '',
        type: isUnseen ? 'unseen' : 'seen',
        groupCode: row.OCCUPATIONGROUPCODE ? row.OCCUPATIONGROUPCODE.toString().trim() : '',
        occupationType: row.OCCUPATIONTYPE || '',
        ISLOCALIZED: row.ISLOCALIZED || false
    };
}

function processGroupRow(row) {
    if (!row.CODE || !row.PREFERREDLABEL) return null;
    
    const code = row.CODE.toString().trim();
    const isUnseen = code.startsWith('I');
    
    let level = 1;
    if (isUnseen) {
        if (code.includes('_')) {
            const parts = code.split('_');
            level = parts.length + 1;
        } else if (code.length > 2) {
            level = 2;
        }
    } else {
        const cleanCode = code.replace(/^0+/, '');
        level = Math.max(1, cleanCode.length);
    }
    
    return {
        id: row.ID,
        code: code,
        label: row.PREFERREDLABEL.trim(),
        description: row.DESCRIPTION ? row.DESCRIPTION.substring(0, 400).trim() : '',
        altLabels: row.ALTLABELS ? row.ALTLABELS.trim() : '',
        type: isUnseen ? 'unseen' : 'seen',
        level: level,
        groupType: row.GROUPTYPE || '',
        ISLOCALIZED: row.ISLOCALIZED || false
    };
}

function processSkillRow(row) {
    if (!row.ID) return null;
    
    return {
        id: row.ID,
        label: row.PREFERREDLABEL?.trim() || 'Unknown Skill',
        description: row.DESCRIPTION?.substring(0, 300).trim() || '',
        altLabels: row.ALTLABELS?.trim() || '',
        skillType: row.SKILLTYPE || 'General',
        reuseLevel: row.REUSELEVEL || '',
        ISLOCALIZED: row.ISLOCALIZED || false
    };
}

function processSkillGroupRow(row) {
    if (!row.ID) return null;
    
    let code = row.CODE?.toString().trim() || row.ID;
    let category = 'Other';
    
    if (code.startsWith('S')) {
        category = 'Skills and competencies';
    } else if (code.startsWith('L')) {
        category = 'Language';
    } else if (code.startsWith('T')) {
        category = 'Transversal skills';
    } else if (row.ORIGINURI?.includes('isced-f')) {
        category = 'Knowledge';
        const match = row.ORIGINURI.match(/isced-f\/(\d+)/);
        if (match) {
            code = match[1];
        }
    }
    
    return {
        id: row.ID,
        code: code,
        label: row.PREFERREDLABEL?.trim() || 'Unknown Group',
        description: row.DESCRIPTION?.substring(0, 300).trim() || '',
        altLabels: row.ALTLABELS?.trim() || '',
        category: category,
        ISLOCALIZED: row.ISLOCALIZED || false
    };
}

function processHierarchyRow(row) {
    if (!row.PARENTID || !row.CHILDID) return null;
    
    return {
        parentId: row.PARENTID,
        childId: row.CHILDID
    };
}

function processSkillHierarchyRow(row) {
    if (!row.PARENTID || !row.CHILDID) return null;
    
    return {
        parentId: row.PARENTID,
        childId: row.CHILDID
    };
}

function processOccupationToSkillRow(row) {
    const hasOccId = row.OCCUPATIONID && row.OCCUPATIONID.toString().trim();
    const hasSkillId = row.SKILLID && row.SKILLID.toString().trim();
    
    if (!hasOccId || !hasSkillId) return null;
    
    return {
        occupationId: row.OCCUPATIONID.toString().trim(),
        skillId: row.SKILLID.toString().trim(),
        relationType: row.RELATIONTYPE || 'related',
        signallingValue: row.SIGNALLINGVALUE || 0,
        signallingValueLabel: row.SIGNALLINGVALUELABEL || ''
    };
}

// Optimized Skills Master builder
async function buildSkillsMaster({ skillHierarchy, skills, skillGroups }) {
    updateProgress('Building Skills Master', 0, 1, 'Creating hierarchy maps...');
    
    // Pre-allocate Maps for better performance
    const skillHierarchyMap = new Map();
    const skillParentMap = new Map();
    const skillDataById = new Map();
    const skillGroupDataById = new Map();
    const skillsMaster = new Map();
    
    // Build hierarchy maps
    skillHierarchy.forEach(rel => {
        const parentId = rel.parentId;
        const childId = rel.childId;
        
        if (!skillHierarchyMap.has(parentId)) {
            skillHierarchyMap.set(parentId, []);
        }
        skillHierarchyMap.get(parentId).push(childId);
        skillParentMap.set(childId, parentId);
    });
    
    // Index skills and skill groups by ID for fast lookup
    skills.forEach(skill => {
        if (skill.id) skillDataById.set(skill.id, skill);
    });
    
    skillGroups.forEach(group => {
        if (group.id) skillGroupDataById.set(group.id, group);
    });
    
    // Process all child IDs efficiently
    const allChildIds = Array.from(skillParentMap.keys());
    const total = allChildIds.length;
    
    updateProgress('Building Skills Master', 0, total, 'Processing hierarchy items...');
    
    // Process in batches to avoid blocking
    const BATCH_SIZE = 500;
    let processed = 0;
    
    for (let i = 0; i < allChildIds.length; i += BATCH_SIZE) {
        const batch = allChildIds.slice(i, i + BATCH_SIZE);
        
        batch.forEach(childId => {
            const enrichedItem = createEnrichedSkillItem(
                childId,
                skillParentMap,
                skillHierarchyMap,
                skillDataById,
                skillGroupDataById
            );
            
            if (enrichedItem) {
                skillsMaster.set(childId, enrichedItem);
            }
            processed++;
        });
        
        // Update progress and yield occasionally
        if (i % (BATCH_SIZE * 4) === 0) {
            updateProgress('Building Skills Master', processed, total, 
                `Processed ${processed}/${total} items...`);
            
            // Yield to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    // Convert Map to Object for JSON serialization
    const skillsMasterObj = Object.fromEntries(skillsMaster);
    
    updateProgress('Building Skills Master', total, total, 'Complete!');
    
    // Send completed Skills Master back to main thread
    postMessage({
        type: 'SKILLS_MASTER_COMPLETE',
        skillsMaster: skillsMasterObj,
        hierarchyMap: Object.fromEntries(skillHierarchyMap),
        parentMap: Object.fromEntries(skillParentMap)
    });
}

// Optimized skill item creation
function createEnrichedSkillItem(childId, skillParentMap, skillHierarchyMap, skillDataById, skillGroupDataById) {
    const parentId = skillParentMap.get(childId);
    const childrenIds = skillHierarchyMap.get(childId) || [];
    
    let enrichedItem = {
        id: childId,
        parentId: parentId,
        childrenIds: childrenIds
    };
    
    const skillData = skillDataById.get(childId);
    const skillGroupData = skillGroupDataById.get(childId);
    
    if (skillData) {
        // Individual skill
        Object.assign(enrichedItem, {
            type: 'skill',
            label: skillData.label,
            description: skillData.description,
            altLabels: skillData.altLabels,
            skillType: skillData.skillType,
            reuseLevel: skillData.reuseLevel,
            isClickable: true,
            isSearchable: false,
            ISLOCALIZED: skillData.ISLOCALIZED
        });
    } else if (skillGroupData) {
        // Skill group
        Object.assign(enrichedItem, {
            type: 'skillgroup',
            code: skillGroupData.code,
            label: skillGroupData.label,
            description: skillGroupData.description,
            altLabels: skillGroupData.altLabels,
            category: skillGroupData.category,
            isClickable: true,
            isSearchable: true,
            ISLOCALIZED: skillGroupData.ISLOCALIZED
        });
    } else {
        // Orphaned item
        Object.assign(enrichedItem, {
            type: 'unknown',
            label: `Unknown Item (${childId})`,
            isClickable: false,
            isSearchable: false
        });
    }
    
    return enrichedItem;
}

// Calculate comprehensive statistics
function calculateStats() {
    updateProgress('Calculating Statistics', 0, 1, 'Computing data metrics...');
    
    const stats = {
        totalOccupations: workerData.occupations.length,
        totalGroups: workerData.groups.length,
        totalSkills: workerData.skills.length,
        totalSkillGroups: workerData.skillGroups.length,
        totalItems: 0,
        unseenOccupations: 0,
        unseenGroups: 0,
        unseenTotal: 0,
        seenOccupations: 0,
        seenGroups: 0,
        seenTotal: 0,
        occupationSkillRelations: 0
    };
    
    // Count by type
    workerData.occupations.forEach(occ => {
        if (occ.type === 'unseen') stats.unseenOccupations++;
        else stats.seenOccupations++;
    });
    
    workerData.groups.forEach(group => {
        if (group.type === 'unseen') stats.unseenGroups++;
        else stats.seenGroups++;
    });
    
    stats.unseenTotal = stats.unseenOccupations + stats.unseenGroups;
    stats.seenTotal = stats.seenOccupations + stats.seenGroups;
    stats.totalItems = stats.totalOccupations + stats.totalGroups + stats.totalSkills;
    
    workerData.stats = stats;
    
    updateProgress('Calculating Statistics', 1, 1, 'Statistics complete!');
    
    postMessage({
        type: 'STATS_COMPLETE',
        stats: stats
    });
}

// Fast filtering operations
function filterData({ filterType, criteria }) {
    const results = [];
    
    switch (filterType) {
        case 'seen-occupations':
            results.push(
                ...workerData.occupations.filter(item => item.type === 'seen'),
                ...workerData.groups.filter(item => item.type === 'seen')
            );
            break;
        case 'unseen-occupations':
            results.push(
                ...workerData.occupations.filter(item => item.type === 'unseen'),
                ...workerData.groups.filter(item => item.type === 'unseen')
            );
            break;
        case 'skills':
            results.push(...workerData.skills, ...workerData.skillGroups);
            break;
    }
    
    postMessage({
        type: 'FILTER_COMPLETE',
        results: results,
        filterType: filterType
    });
}

// Optimized search with scoring
function searchData({ query, searchType, limit = 100 }) {
    const queryLower = query.toLowerCase().trim();
    const results = [];
    
    let searchItems = [];
    if (searchType === 'skills') {
        searchItems = [...workerData.skills, ...workerData.skillGroups];
    } else if (searchType === 'seen-occupations') {
        searchItems = [
            ...workerData.occupations.filter(item => item.type === 'seen'),
            ...workerData.groups.filter(item => item.type === 'seen')
        ];
    } else if (searchType === 'unseen-occupations') {
        searchItems = [
            ...workerData.occupations.filter(item => item.type === 'unseen'),
            ...workerData.groups.filter(item => item.type === 'unseen')
        ];
    }
    
    // Score and rank results
    searchItems.forEach(item => {
        const score = calculateSearchScore(item, queryLower);
        if (score > 0) {
            results.push({ item, score });
        }
    });
    
    // Sort by score and limit results
    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, limit).map(r => r.item);
    
    postMessage({
        type: 'SEARCH_COMPLETE',
        results: limitedResults,
        query: query,
        totalFound: results.length
    });
}

// Search scoring algorithm
function calculateSearchScore(item, query) {
    let score = 0;
    
    // Exact code match (highest score)
    if (item.code && item.code.toLowerCase() === query) {
        score += 1000;
    }
    
    // Code starts with query
    if (item.code && item.code.toLowerCase().startsWith(query)) {
        score += 500;
    }
    
    // Exact label match
    if (item.label.toLowerCase() === query) {
        score += 800;
    }
    
    // Label starts with query
    if (item.label.toLowerCase().startsWith(query)) {
        score += 400;
    }
    
    // Label contains query
    if (item.label.toLowerCase().includes(query)) {
        score += 200;
    }
    
    // Description contains query
    if (item.description && item.description.toLowerCase().includes(query)) {
        score += 100;
    }
    
    // Alt labels contain query
    if (item.altLabels && item.altLabels.toLowerCase().includes(query)) {
        score += 150;
    }
    
    return score;
}

// Progress update helper
function updateProgress(phase, completed, total, message) {
    currentProgress = { phase, completed, total, message };
    
    postMessage({
        type: 'PROGRESS_UPDATE',
        progress: {
            phase: phase,
            completed: completed,
            total: total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            message: message
        }
    });
}

// Error handling
self.onerror = function(error) {
    postMessage({
        type: 'ERROR',
        error: error.message,
        filename: error.filename,
        lineno: error.lineno
    });
};

// Initialization complete
postMessage({ type: 'WORKER_READY' });