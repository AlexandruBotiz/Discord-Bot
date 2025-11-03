/**
 * @typedef {Object} QuizConfigurationData
 * @property {string} quizTypeValue - The value (key) of the selected quiz type
 * @property {string} quizTypeText - The text (display name) of the selected quiz type
 * @property {string} channelId - The ID of the channel where the quiz will be posted
 * @property {string} durationValue - The value (in seconds) of the selected quiz duration
 * @property {boolean} completed - Whether the configuration is complete. This is used
 * to prevent multiple submissions.
 */

class QuizConfigurationSessionManager {
  // TODO: add 15 minute cleanup of old sessions

  static map = new Map();

  /**
   * Sets the quiz configuration data for a given session ID. If the session ID is
   * already a key in the map, it updates the existing configuration data with the new data.
   * @param sessionID
   * @param configData
   */
  static set(sessionID, configData) {
    if (!this.map.has(sessionID)) {
      this.map.set(sessionID, configData);
    } else {
      this.map.set(sessionID, {
        ...this.map.get(sessionID),
        ...configData
      });
    }
  }

  /**
   * Fetches the quiz configuration data for a given session ID.
   * Every time a user triggers the `/brainbuzz` command, a new
   * quiz configuration session is created with a unique ID, to store the options
   * (type, channel, duration)
   * the user selects for the quiz they intend to create.
   * This way, the 'Submit' button handler can retrieve all the options
   * and create the quiz.
   * @param sessionID
   * @return {QuizConfigurationData}
   */
  static getConfigData(sessionID) {
    return this.map.get(sessionID);
  }

  static clear(sessionID) {
    this.map.set(sessionID, {
      ...this.map.get(sessionID),
      completed: true
    });
  }
}

export default QuizConfigurationSessionManager;