const pool = require('../config/database');

/**
 * Match a job against all active job alerts
 * Uses keyword matching on job title/description vs worker job_title and services
 * @param {Object} job - Job object with title, description, location, budget
 * @returns {Promise<Array>} Array of matching alert objects
 */
async function matchJobToAlerts(job) {
    try {
        // Extract keywords from job title and description
        const jobKeywords = extractKeywords(job.title, job.description);

        // Get all active job alerts with worker details
        const { rows: alerts } = await pool.query(`
            SELECT
                ja.id,
                ja.worker_id,
                ja.name,
                ja.skills,
                ja.location,
                ja.min_budget,
                ja.max_budget,
                ja.notification_frequency,
                u.job_title,
                u.services
            FROM job_alerts ja
            JOIN users u ON ja.worker_id = u.id
            WHERE ja.is_active = true
        `);

        // Score and filter matching alerts
        const matchingAlerts = alerts
            .map(alert => {
                const matchScore = calculateMatchScore(
                    jobKeywords,
                    alert.job_title,
                    alert.services,
                    alert.location,
                    job.location,
                    job.budget,
                    alert.min_budget,
                    alert.max_budget
                );

                return {
                    ...alert,
                    matchScore
                };
            })
            .filter(alert => alert.matchScore > 0)
            .sort((a, b) => b.matchScore - a.matchScore);

        console.log(`[Job Matching] Job "${job.title}" matched ${matchingAlerts.length} alerts`);
        return matchingAlerts;
    } catch (error) {
        console.error('[Job Matching Error]', error.message);
        return [];
    }
}

/**
 * Extract keywords from job title and description
 * @param {string} title - Job title
 * @param {string} description - Job description
 * @returns {Array<string>} Array of lowercase keywords
 */
function extractKeywords(title, description) {
    const text = `${title} ${description || ''}`.toLowerCase();

    // Remove common words, split by whitespace and special characters
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'need', 'want', 'get', 'set', 'please', 'thank', 'thanks']);

    const keywords = text
        .split(/[\s\-,.;:!?()]+/)
        .filter(word => word.length > 2 && !commonWords.has(word))
        .map(word => word.trim());

    return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Calculate match score based on multiple criteria
 * @returns {number} Match score (0 = no match)
 */
function calculateMatchScore(jobKeywords, workerJobTitle, workerServices, alertLocation, jobLocation, jobBudget, minBudget, maxBudget) {
    let score = 0;

    // 1. Check skill/service matching (PRIMARY) - Weight: 70
    const skillMatchScore = matchSkills(jobKeywords, workerJobTitle, workerServices);
    score += skillMatchScore * 70;

    // 2. Check location matching (SECONDARY) - Weight: 20
    if (alertLocation && jobLocation) {
        const locationMatch = matchLocations(alertLocation, jobLocation);
        score += locationMatch ? 20 : 0;
    }

    // 3. Check budget matching (OPTIONAL) - Weight: 10
    if (minBudget || maxBudget) {
        const budgetMatch = checkBudgetRange(jobBudget, minBudget, maxBudget);
        score += budgetMatch ? 10 : 0;
    }

    return score;
}

/**
 * Check if job keywords match worker skills
 * @returns {number} Match ratio (0-1)
 */
function matchSkills(jobKeywords, workerJobTitle, workerServices) {
    const workerSkillKeywords = [];

    // Add job title keywords
    if (workerJobTitle) {
        workerSkillKeywords.push(...extractKeywords(workerJobTitle, ''));
    }

    // Add services keywords
    if (Array.isArray(workerServices)) {
        workerServices.forEach(service => {
            workerSkillKeywords.push(...extractKeywords(service, ''));
        });
    }

    if (workerSkillKeywords.length === 0) return 0;

    // Count matching keywords
    const matches = jobKeywords.filter(keyword =>
        workerSkillKeywords.some(skill =>
            skill.includes(keyword) || keyword.includes(skill)
        )
    ).length;

    return matches / Math.max(jobKeywords.length, workerSkillKeywords.length);
}

/**
 * Check if job location matches alert location
 * Simple string matching for now (can upgrade to radius-based)
 * @returns {boolean}
 */
function matchLocations(alertLocation, jobLocation) {
    if (!alertLocation || !jobLocation) return false;

    const normalizeLocation = (loc) => loc.toLowerCase().trim();
    const alert = normalizeLocation(alertLocation);
    const job = normalizeLocation(jobLocation);

    // Exact or partial match
    return job.includes(alert) || alert.includes(job);
}

/**
 * Check if job budget falls within alert budget range
 * Handles string budget (e.g., "5000 CFA")
 * @returns {boolean}
 */
function checkBudgetRange(jobBudget, minBudget, maxBudget) {
    try {
        // Extract numeric value from budget string
        const extractNumeric = (str) => {
            if (!str) return null;
            const match = str.match(/\d+/);
            return match ? parseInt(match[0]) : null;
        };

        const jobAmount = extractNumeric(jobBudget);
        const minAmount = extractNumeric(minBudget);
        const maxAmount = extractNumeric(maxBudget);

        if (!jobAmount) return true; // Can't verify, assume match

        if (minAmount && jobAmount < minAmount) return false;
        if (maxAmount && jobAmount > maxAmount) return false;

        return true;
    } catch (error) {
        console.error('[Budget Check Error]', error.message);
        return true; // Default to match on error
    }
}

module.exports = {
    matchJobToAlerts,
    extractKeywords,
    calculateMatchScore
};
