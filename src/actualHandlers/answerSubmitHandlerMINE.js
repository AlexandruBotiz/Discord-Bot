import QuizSessionManager from '../utils/QuizSessionManager.js';
import ServerClient from '../services/ServerClient.js';

/**
 * Handles the submission of an answer to a quiz (submission of the quiz answer modal).
 */
export async function handleAnswerSubmit(interaction) {
  const quizId = interaction.customId.replace('answer_quiz_', '');

  const session = QuizSessionManager.getQuizSessionMetadata(quizId);

  // if no active session found
  if (!session) {
    return interaction.reply({
      content:
        ':warning: This quiz is no longer active.\n(ERROR: session has expired or does not exist).',
      ephemeral: true
    });
  }

  // check if user already answered the quiz
  if (session.usersAnswered?.includes(interaction.user.id)) {
    return interaction.reply({
      content: ":warning: You have already answered this quiz! You can't answer twice!",
      ephemeral: true
    });
  }

  const answer = interaction.fields.getTextInputValue('answer').trim();
  const isCorrectAnswer = answer.toLowerCase() === session.quiz.answer.toLowerCase();

  // store user answer in backend
  try {
    await ServerClient.sendUserAnswer(
      quizId,
      interaction.user.id,
      {
        display_name: interaction.user.username,
        profile_picture_url: interaction.user.displayAvatarURL()
      },
      isCorrectAnswer
    );

    session.usersAnswered.push(interaction.user.id);

    interaction.deferUpdate();
    return interaction.user.send({
      content: `✅ I've registered your answer to the quiz created by <@${session.creatorUserID}>!\\nCheck back in <#${session.channelID}> to see the results when the quiz ends.`
    });
  } catch (error) {
    console.error('❌ Failed to send answer to backend:', error.message);
    return interaction.reply({
      content: ':warning: There was an error registering your answer. Please try again later.',
      ephemeral: true
    });
  }
}
