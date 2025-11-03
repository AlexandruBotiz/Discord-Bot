import ordinal from 'ordinal';
import { MediaGalleryBuilder } from 'discord.js';
import { client } from '../index.js';
import axios from 'axios';
import ServerClient from '../services/ServerClient.js';
import QuizSessionManager from './QuizSessionManager.js';

export async function handleQuizTimeout(quizId, quizEndTime) {
  const remainingTimeInMilliseconds = quizEndTime - Date.now();

  let top3 = [];
  let others = [];

  setTimeout(async () => {
    // on timeout

    console.info(`Quiz with ID ${quizId} has timed out.`);

    // fetch results from the guiz engine
    try {
      const results = await ServerClient.getResults(quizId);

      if (results.topUsers) {
        // no one responded to the quiz correctly
        // OR no one responded at all
        top3 = [];
        others = [];
      } else {
        top3 = results.topUsersWithImages;
        others = results.otherUsers;
      }
    } catch (error) {
      console.error(`Failed to fetch results for quiz ID ${quizId}:`, error.message);
      return;
    }

    // fetch results from quiz engine and send rewards to top 3 users
    await sendResultsToTopUsers(quizId, top3, others);

    const session = QuizSessionManager.getQuizSessionMetadata(quizId);

    if (!session) {
      console.warn(`No session found for quiz ${quizId}, skipping summary post.`);
      return;
    }

    const totalParticipants = session?.usersAnswered?.length || 0;

    let summaryContent = `**🏁 The quiz is over!**\n` +
      `❔ ${session.quiz.quizText}\n` +
      `✅ Correct answer: *${session.quiz.answer}*\n\n`

    if (!top3 || top3.length === 0) {
      if (totalParticipants === 0) {
        summaryContent += `No one participated in the quiz... :pensive:`;
      } else {
        summaryContent += `No one answered correctly, but ${totalParticipants} ${totalParticipants > 1 ? 'participants' : 'participant'} tried!`;
      }
    } else {
      // list top 3 users
      top3?.slice(0, 3).forEach((user, i) => {
        const userId = user.userId || user.user_id;

        summaryContent += `\n*${ordinal(i + 1)}* place: <@${userId}>`;
      });

      // also write the total number of participants
      summaryContent += `\n\n🎉 A total of **${totalParticipants}** user(s) participated in the quiz.`;
    }

    // get creator's display name
    const guild = await session.quizStartMessage.guild;
    const creator = await guild.members.fetch(session.creatorUserID);

    // start a thread from start quiz message with results
    const thread = await session.quizStartMessage.startThread({
      name: `${creator.displayName}'s ${session.type} quiz results`,
      autoArchiveDuration: 10080, // 7 days
      reason: 'Posting quiz results and creating a discussion thread'
    })
    // only include embeds if all top users have reward images
    await thread.send({
      content: summaryContent,
      ...(top3.every((user) => user.rewardImage)
        ? {
            embeds: top3.map((user) => {
              return {
                image: { url: user.rewardImage }
              };
            })
          }
        : {
            embeds: top3.map((user) => {
              return {
                image: { url: user.user_data.profile_picture_url }
              };
            })
          })
    });

    console.info(`Deleting quiz session with ID ${quizId} from the map.`);
    QuizSessionManager.clear(quizId);
  }, remainingTimeInMilliseconds);
}

async function sendResultsToTopUsers(quizId, topUsers) {
  if (!topUsers || topUsers.length === 0) {
    console.info(`No users answered quiz ID ${quizId}.`);
    return;
  }

  // send a DM to the top users with their reward images (if any)
  for (let i = 0; i < topUsers.length; i++) {
    const userId = topUsers[i].user_id;
    const rewardImage = topUsers[i].rewardImage || null;

    await sendRewardToUser(userId, i + 1, rewardImage);
  }

  console.info('Sent the rewards to the top users successfully.');
}

async function sendRewardToUser(userId, placement, rewardImage) {
  const user = await client.users.fetch(userId);
  await user.send({
    content: `🎉 Congrats <@${userId}>! You came ${ordinal(placement)}! Thanks for participating!${rewardImage ? '\nHere is your **reward**! Looking good!' : ''}`, // we use ordinal to add suffix (st, nd, rd, th)
    ...(rewardImage && {
      embeds: [
        {
          title: 'Your Reward',
          image: { url: rewardImage }
        }
      ]
    })
  });
}
