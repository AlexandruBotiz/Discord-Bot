import QuizSessionManager from '../../utils/QuizSessionManager.js';
import { quizAnswerMessage } from '../../ui/quizAnswerMessage.js';

export async function handleStartQuizButton(interaction) {
  // get quiz ID
  const quizId = interaction.customId.replace('start-quiz-button-', '');

  // get quiz session metadata
  const session = QuizSessionManager.getQuizSessionMetadata(quizId);

  if (!session) {
    return await interaction.reply({
      content: `:warning: This quiz has expired. Better luck next time!`,
      flags: 'Ephemeral'
    });
  }

  // send message with quiz question and answer buttons
  return await interaction.reply(
    quizAnswerMessage(quizId, session.quiz)
  )
}
