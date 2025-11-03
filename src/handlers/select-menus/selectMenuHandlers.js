import QuizConfigurationSessionManager from '../../utils/QuizConfigurationSessionManager.js';

export async function handleQuizTypeSelectMenu(interaction) {
  // acknowledge interaction to update UI
  await interaction.deferUpdate();

  // get selected quiz type value
  const selectedQuizTypeValue = interaction.values[0];
  // get selected quiz type label
  const selectedQuizTypeLabel = interaction.component.options.find(
    (option) => option.value === selectedQuizTypeValue
  ).label;

  // update quiz configuration session data
  const sessionID = interaction.customId.replace('select-quiz-type-', '');

  QuizConfigurationSessionManager.set(sessionID, {
    quizTypeValue: selectedQuizTypeValue,
    quizTypeText: selectedQuizTypeLabel
  });
}

export async function handleQuizDurationSelectMenu(interaction) {
  // acknowledge interaction to update UI
  await interaction.deferUpdate();

  // get selected quiz duration value
  const selectedDuration = interaction.values[0];

  // update quiz configuration session data
  const sessionID = interaction.customId.replace('select-quiz-duration-', '');

  QuizConfigurationSessionManager.set(sessionID, {
    durationValue: selectedDuration
  });
}
