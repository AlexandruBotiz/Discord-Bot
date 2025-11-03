import QuizSessionManager from '../../utils/QuizSessionManager.js';
import ServerClient from '../../services/ServerClient.js';

export async function handleQuizAnswerButton(interaction) {
  // extract quiz ID and selected answer index from customId
  const quizIdAndAnswer = interaction.customId.replace('quiz_answer_button_', '').split('_');
  const quizId = quizIdAndAnswer[0];
  const selectedAnswerIndex = parseInt(quizIdAndAnswer[1], 10);

  // get quiz session metadata using quiz ID
  const session = QuizSessionManager.getQuizSessionMetadata(quizId);

  if (!session) {
    return await interaction.reply({
      content: `:warning: This quiz has expired. Better luck next time!`,
      flags: 'Ephemeral'
    });
  }

  if (session.usersAnswered?.includes(interaction.user.id)) {
    return await interaction.reply({
      content: ":warning: Nice try, but you can only answer a quiz once!",
      flags: 'Ephemeral'
    });
  }

  const correctAnswerIndex = session.quiz.options.findIndex(
    option => option.toLowerCase() === session.quiz.answer.toLowerCase()
  );
  const isCorrectAnswer = session.quiz.options[selectedAnswerIndex] === session.quiz.options[correctAnswerIndex];

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
      content: `✅ I've registered your answer to the quiz created by <@${session.creatorUserID}>!\nCheck back in <#${session.channelID}> to see the results when the quiz ends.`
    });
  } catch (error) {
    console.error('Failed to send answer to backend:', error.message);
    return interaction.reply({
      content: ':warning: There was an error registering your answer. Please try again.',
      flags: 'Ephemeral'
    });
  }
}