const Donation = require("../models/Donation");

/**
 * Calculates the next eligible donation date by adding exactly 3 calendar months.
 * For example: 08 October 2026 -> 08 January 2027.
 * Handles month-end overflow safely (e.g. 31 Nov -> 28/29 Feb).
 *
 * @param {Date|string|number} donationDate
 * @returns {Date|null}
 */
const calculateNextEligibleDate = (donationDate) => {
    if (!donationDate) return null;
    const d = new Date(donationDate);
    if (isNaN(d.getTime())) return null;

    const nextDate = new Date(d);
    const originalDay = d.getUTCDate();
    const targetMonth = (d.getUTCMonth() + 3) % 12;
    const targetYear = d.getUTCFullYear() + Math.floor((d.getUTCMonth() + 3) / 12);

    // Set to 1st of target month first to avoid premature month overflow
    nextDate.setUTCFullYear(targetYear);
    nextDate.setUTCMonth(targetMonth, 1);

    // Find max days in target month
    const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const finalDay = Math.min(originalDay, daysInTargetMonth);

    nextDate.setUTCDate(finalDay);
    nextDate.setUTCHours(d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());

    return nextDate;
};

/**
 * Formats a date into "DD Mon YYYY" (e.g., "08 Jan 2027").
 *
 * @param {Date|string} date
 * @returns {string}
 */
const formatEligibleDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};

/**
 * Retrieves the latest completed donation record for a donor.
 *
 * @param {string|mongoose.Types.ObjectId} donorId
 * @returns {Promise<Object|null>}
 */
const getDonorLatestDonation = async (donorId) => {
    if (!donorId) return null;
    try {
        return await Donation.findOne({
            donorId,
            status: "collected"
        }).sort({ donationDate: -1, createdAt: -1 });
    } catch (err) {
        console.error("Error fetching latest donation for donor:", donorId, err.message);
        return null;
    }
};

/**
 * Resolves the true latest donation date by cross-referencing completed
 * Donation collection records and any recorded lastDonationDate.
 *
 * @param {string|mongoose.Types.ObjectId} donorId
 * @param {Date|string|null} fallbackDate
 * @returns {Promise<Date|null>}
 */
const getDonorLatestDonationDate = async (donorId, fallbackDate = null) => {
    const latestDonation = await getDonorLatestDonation(donorId);
    let resolvedDate = null;

    if (latestDonation && latestDonation.donationDate) {
        resolvedDate = new Date(latestDonation.donationDate);
    }

    if (fallbackDate) {
        const fallback = new Date(fallbackDate);
        if (!isNaN(fallback.getTime())) {
            if (!resolvedDate || fallback > resolvedDate) {
                resolvedDate = fallback;
            }
        }
    }

    return resolvedDate;
};

/**
 * Evaluates donor eligibility using actual completed donations as single source of truth.
 * Enforces the 3-calendar-month deferral rule.
 *
 * @param {Object} donor Donor mongoose document or plain object
 * @param {Date|string|null} [explicitDonationDate] Optional known donation date to avoid DB query
 * @param {Date} [referenceDate] Date against which to compare (defaults to now)
 * @returns {Promise<{
 *   isEligible: boolean,
 *   isDeferred: boolean,
 *   eligibilityStatus: "eligible"|"ineligible"|"pending",
 *   lastDonationDate: Date|null,
 *   nextEligibleDate: Date|null,
 *   formattedNextEligibleDate: string,
 *   deferralReason: string|null
 * }>}
 */
const evaluateDonorEligibility = async (donor, explicitDonationDate = undefined, referenceDate = new Date()) => {
    if (!donor) {
        return {
            isEligible: false,
            isDeferred: false,
            eligibilityStatus: "ineligible",
            lastDonationDate: null,
            nextEligibleDate: null,
            formattedNextEligibleDate: "",
            deferralReason: "Donor not found"
        };
    }

    const donorId = donor._id || donor.id;
    let trueLastDonationDate = explicitDonationDate;

    if (trueLastDonationDate === undefined) {
        trueLastDonationDate = await getDonorLatestDonationDate(donorId, donor.lastDonationDate);
    } else if (trueLastDonationDate) {
        trueLastDonationDate = new Date(trueLastDonationDate);
        if (isNaN(trueLastDonationDate.getTime())) {
            trueLastDonationDate = null;
        }
    }

    const nextEligibleDate = calculateNextEligibleDate(trueLastDonationDate);
    const formattedNextEligibleDate = formatEligibleDate(nextEligibleDate);

    let isDeferred = false;
    if (nextEligibleDate && referenceDate < nextEligibleDate) {
        isDeferred = true;
    }

    // Dynamic eligibility status: if currently deferred, status is strictly 'ineligible'
    let dynamicStatus = donor.eligibilityStatus || "pending";
    if (isDeferred) {
        dynamicStatus = "ineligible";
    }

    let deferralReason = null;
    if (isDeferred) {
        deferralReason = `In 3-month deferral period until ${formattedNextEligibleDate}`;
    }

    const isEligible = !isDeferred && dynamicStatus === "eligible";

    return {
        isEligible,
        isDeferred,
        eligibilityStatus: dynamicStatus,
        lastDonationDate: trueLastDonationDate,
        nextEligibleDate,
        formattedNextEligibleDate,
        deferralReason
    };
};

module.exports = {
    calculateNextEligibleDate,
    formatEligibleDate,
    getDonorLatestDonation,
    getDonorLatestDonationDate,
    evaluateDonorEligibility
};
