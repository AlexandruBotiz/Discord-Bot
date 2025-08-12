import axios from 'axios';

export async function getQuiz(quizType, durationSec) {
  try {
    const response = await axios.get(
      `http://localhost:3000/quiz?type=${quizType}&duration=${durationSec}`
    );

    return response.data;
  } catch (error) {
    console.error('❌ Error fetching quiz: ', error.message);
    return null;
  }
}

export async function sendUserAnswer(userId, quizId, correct, userData) {
  const response = await axios.post('http://localhost:3000/answers', {
    user_id: userId,
    quiz_id: quizId,
    correct: correct,
    user_data: {
      display_name: userData.display_name,
      profile_picture_url: userData.profile_picture_url
    }
  });

  return response.data;
}