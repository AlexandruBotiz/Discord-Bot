import ServerClient from '../services/ServerClient.js';
import { handleQuizTimeout } from './handleQuizTimeout.js';
import moment from 'moment';
import getQuizStartMessage from '../ui/quizStartMessage.js';
import QuizSessionManager from './QuizSessionManager.js';

export async function fetchAndPostQuiz(
  interaction,
  quizTypeValue,
  quizTypeText,
  channel,
  durationInSeconds
) {
  // fetch quiz
  let quiz;

  try {
    quiz = await ServerClient.getQuiz(quizTypeValue, durationInSeconds);
  } catch (error) {
    console.error('Error fetching quiz: ', error);
    return await interaction.followUp({
      content: ":cross-mark: I can't think of a quiz right now... Try again later.",
      ephemeral: true
    });
  }

  // compute end time
  const durationInMilliseconds = durationInSeconds * 1000;
  const endTime = Date.now() + durationInMilliseconds;

  // get quiz creator ID
  const creatorID = interaction.user.id;

  // start timeout
  // NOTE: do not use `await` since it will block the event loop
  //  i.e. the code after will not run until the timeout is over
  handleQuizTimeout(quiz.quiz_id, endTime);

  // delete deferred reply placeholder
  await interaction.deleteReply();

  // compute remaining time in seconds
  // to include in the quiz post message
  const duration = moment.duration(durationInSeconds, 'seconds');
  const remainingCountdown = moment.utc(duration.asMilliseconds()).format('mm:ss');

  // post quiz start message
  const quizStartMessage = await channel.send(
    getQuizStartMessage(quiz.quiz_id, creatorID, quizTypeText, remainingCountdown)
  );

  // store quiz metadata in quiz session manager
  QuizSessionManager.insert(quiz.quiz_id, {
    quiz,
    type: quizTypeText,
    endTime,
    channelID: channel.id,
    quizStartMessage,
    usersAnswered: [],
    creatorUserID: creatorID
  });

  // start updating message with countdown
  const intervalID = setInterval(async () => {
    // evaluate remaining time
    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));

    // if quiz has ended/timed out
    if (remaining <= 0) {
      // clear interval so countdown stops
      clearInterval(intervalID);

      // edit message to indicate quiz has ended
      // remove button
      await quizStartMessage.edit({
        content: `The **${quizTypeText}** quiz created by <@${creatorID}> has ended! ⏰ Check out the results thread.`,
        components: []
      });

      return;
    }

    // compute remaining time in seconds
    const duration = moment.duration(remaining, 'seconds');
    const remainingCountdown = moment.utc(duration.asMilliseconds()).format('mm:ss');

    // edit message to update remaining time countdown
    await quizStartMessage.edit(
      getQuizStartMessage(quiz.quiz_id, creatorID, quizTypeText, remainingCountdown)
    );
  }, 1000);
}
