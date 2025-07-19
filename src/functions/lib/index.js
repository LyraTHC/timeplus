
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = exports.getPsychologistDetails = exports.getPsychologists = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Robust initialization to prevent re-initialization errors on the server
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
// --- Callable Functions ---
/**
 * Fetches a list of all users with the 'Psicólogo' role.
 * This is a robust implementation that fetches all users and then filters,
 * avoiding potential Firestore index errors.
 */
exports.getPsychologists = functions.https.onCall(async (data, context) => {
    try {
        const usersSnapshot = await db.collection("users").where("role", "==", "Psicólogo").get();
        if (usersSnapshot.empty) {
            return { psychologists: [] };
        }
        const psychologists = usersSnapshot.docs
            .map((doc) => (Object.assign({ id: doc.id }, doc.data())))
            .map((psycho) => {
            // Basic validation to ensure essential profile data exists
            if (!psycho.name ||
                !psycho.professionalProfile ||
                !psycho.professionalProfile.specialties ||
                typeof psycho.professionalProfile.rate !== "number") {
                functions.logger.warn(`Psychologist ${psycho.id} has an incomplete profile, skipping.`);
                return null;
            }
            return {
                id: psycho.id,
                name: psycho.name,
                image: psycho.avatarUrl || "https://placehold.co/400x400.png",
                imageHint: "psychologist professional",
                specialties: psycho.professionalProfile.specialties,
                rate: psycho.professionalProfile.rate,
                rating: psycho.professionalProfile.rating || 0,
                reviewsCount: psycho.professionalProfile.reviewsCount || 0,
                availability: psycho.availability, // Ensure availability is always returned
            };
        })
            .filter((p) => p !== null); // Type guard to remove nulls safely
        return { psychologists };
    }
    catch (error) {
        functions.logger.error("Error in getPsychologists:", error);
        throw new functions.https.HttpsError("internal", "An internal error occurred while fetching psychologists.", error);
    }
});
/**
 * Fetches detailed information for a single psychologist.
 */
exports.getPsychologistDetails = functions.https.onCall(async (data, context) => {
    const { psychologistId } = data;
    if (!psychologistId) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'psychologistId'.");
    }
    try {
        const psychoDoc = await db.collection("users").doc(psychologistId).get();
        const psychologistData = psychoDoc.data();
        if (!psychoDoc.exists || (psychologistData === null || psychologistData === void 0 ? void 0 : psychologistData.role) !== "Psicólogo") {
            throw new functions.https.HttpsError("not-found", "No psychologist found with the provided ID.");
        }
        // Fetch all sessions for this psychologist to get booked slots AND reviews
        const sessionsSnapshot = await db
            .collection("sessions")
            .where("psychologistId", "==", psychologistId)
            .get();
        const bookedSlots = sessionsSnapshot.docs.map((doc) => doc.data().sessionTimestamp.toMillis());
        const reviews = sessionsSnapshot.docs
            .filter(doc => doc.data().reviewed === true && doc.data().rating) // Filter for reviewed sessions
            .map(doc => {
            const reviewData = doc.data();
            return {
                id: doc.id,
                rating: reviewData.rating,
                comment: reviewData.reviewComment,
                date: reviewData.sessionTimestamp.toDate().toLocaleDateString('pt-BR'),
            };
        });
        const totalRating = reviews.reduce((acc, r) => acc + r.rating, 0);
        const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
        if (psychologistData.professionalProfile) {
            psychologistData.professionalProfile.rating = averageRating;
            psychologistData.professionalProfile.reviewsCount = reviews.length;
        }
        return {
            psychologist: Object.assign(Object.assign({}, psychologistData), { id: psychoDoc.id, reviews }),
            bookedSlots,
        };
    }
    catch (error) {
        functions.logger.error("Error in getPsychologistDetails:", error);
        throw new functions.https.HttpsError("internal", "Failed to fetch psychologist details.", error);
    }
});
/**
 * Creates a new session document in Firestore after a successful payment.
 * NOTE: THIS FUNCTION IS NOW DEPRECATED AND WILL BE REMOVED.
 * Session creation is handled by the /api/mp-webhook route for robustness.
 */
exports.createSession = functions.https.onCall(async (data, context) => {
    functions.logger.warn("The 'createSession' callable function is deprecated and should not be used. Session creation is handled by the webhook.");
    throw new functions.https.HttpsError("unimplemented", "This function is deprecated.");
});
//# sourceMappingURL=index.js.map
