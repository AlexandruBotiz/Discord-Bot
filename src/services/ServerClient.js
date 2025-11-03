import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const axiosClient = axios.create({
  baseURL: process.env.BACKEND_URL,
  headers: {
    Authorization: `Bearer ${process.env.BACKEND_KEY}`
  },
  timeout: 15000 // 15 seconds timeout
});

class ServerClient {
  static async getQuiz(type, duration) {
    const response = await axiosClient.get('/quiz', {
      params: {
        type: type,
        duration: duration
      }
    });

    return response.data;
  }

  static async sendUserAnswer(quizId, userId, userData, isCorrectAnswer) {
    const response = await axiosClient.post('/answers', {
      quiz_id: quizId,
      user_id: userId,
      user_data: userData,
      correct: isCorrectAnswer
    });

    return response.data;
  }

  static async getResults(quizId) {
    const response = await axiosClient.post('/results', {
      quizId: quizId
    });

    return response.data;
  }

  static async getQuizTypes() {
    // get quiz types from backend endpoint
    const response = await axiosClient.get('/quiz-types', {
      params: {
        // TODO: support multiple languages
        lang: 'en'
      }
    });

    // map quiz types to slack select menu options format
    return response.data.quizTypes.map((quizType) => {
      return {
        text: {
          type: 'plain_text',
          text: quizType.value
        },
        value: quizType.key
      };
    });
  }
}

export default ServerClient;
