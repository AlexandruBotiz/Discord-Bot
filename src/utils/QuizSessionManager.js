/**
 * @typedef {Object} QuizContent
 * @property {string} quizText - The quiz question text
 * @property {string[]} options - Array of possible answers
 * @property {string} answer - The correct answer
 */

/**
 * @typedef {Object} QuizMetadata
 * @property {QuizContent} quiz - The quiz contents (question, options, correct answer, image)
 * @property {string} type - The type of the quiz (e.g. "Historical", "Computer Trivia", etc.)
 * @property {string} endTime - ISO string of when the quiz expires/times out
 * @property {string} channelID - The ID of the channel where the quiz was posted
 * @property {string} messageTS - The Slack message timestamp of the quiz message, used for updating the message later
 * @property {string} usersAnswered - Set of user IDs who have answered the quiz
 * @property {string} [creatorUserID] - (Optional) User ID of the quiz creator (if not created with the auto-post service)
 */

class QuizSessionManager {
    static map = new Map();

    static insert(quizId, quizMetadata) {
        this.map.set(quizId, quizMetadata);
    }

    /**
     * Fetches the quiz session metadata for a given quiz ID.
     * @param quizId
     * @return {QuizMetadata | undefined} The quiz session metadata, or undefined if not found
     */
    static getQuizSessionMetadata(quizId) {
        return this.map.get(quizId);
    }

    static clear(quizId) {
        this.map.delete(quizId);
    }
}

export default QuizSessionManager;