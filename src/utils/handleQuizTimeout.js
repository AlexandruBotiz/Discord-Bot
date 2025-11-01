import ordinal from 'ordinal';
import { MediaGalleryBuilder } from 'discord.js';
import { client } from '../index.js';
import axios from 'axios';
import ServerClient from '../services/ServerClient.js';
import QuizSessionManager from './QuizSessionManager.js';

export async function handleQuizTimeout(quizId, quizEndTime) {
  const remainingMs = quizEndTime - Date.now();

  let topUsersWithImages = [];
  let otherUsers = [];

  setTimeout(async () => {
    // on timeout

    console.info(`Quiz with ID ${quizId} has timed out.`);

    // fetch results from the guiz engine
    try {
      const results = await ServerClient.getResults(quizId);
      console.log(results);

      if (results.topUsers) {
        // no one responded to the quiz
        topUsersWithImages = [];
        otherUsers = [];
      } else {
        topUsersWithImages = results.topUsersWithImages;
        otherUsers = results.otherUsers;
      }
    } catch (error) {
      console.error(`Failed to fetch results for quiz ID ${quizId}:`, error.message);
      return;
    }

    // fetch results from quiz engine and send rewards to top 3 users
    await sendResultsToTopUsers(quizId, topUsersWithImages, otherUsers);

    const session = QuizSessionManager.getQuizSessionMetadata(quizId);

    if (!session) {
      console.warn(`No session found for quiz ${quizId}, skipping summary post.`);
      return;
    }

    // NOTE: can we not just use session.channelID directly?
    const destination = await client.channels.fetch(session.channelID);

    const totalParticipants = session?.usersAnswered?.length || 0;

    let summaryContent = `*🏁 The quiz is over!*\n`;

    if (!topUsersWithImages || topUsersWithImages.length === 0) {
      if (totalParticipants === 0) {
        summaryContent += `No one participated in the quiz.`;
      } else {
        summaryContent += `No one answered correctly, but ${totalParticipants} ${totalParticipants > 1 ? 'participants' : 'participant'} tried!`;
      }
    } else {
      // list top 3 users
      topUsersWithImages?.slice(0, 3).forEach((user, i) => {
        const userId = user.userId || user.user_id;

        summaryContent += `\n*${ordinal(i + 1)}* place: <@${userId}>`;
      });

      // also write the total number of participants
      summaryContent += `\n\n🎉 A total of *${totalParticipants}* user(s) participated in the quiz.`;
    }

    // send results summary to the channel
    // only include embeds if all top users have reward images
    await destination.send({
      content: summaryContent,
      ...(topUsersWithImages.every((user) => user.rewardImage)
        ? {
            embeds: topUsersWithImages.map((user) => {
              return {
                image: { url: user.rewardImage }
              };
            })
          }
        : {
            embeds: topUsersWithImages.map((user) => {
              return {
                image: { url: user.user_data.profile_picture_url }
              };
            })
          })
    });

    console.info(`Deleting quiz session with ID ${quizId} from the map.`);
    QuizSessionManager.clear(quizId);
  }, remainingMs);
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
    content: `🎉 Congrats <@${userId}>! You came ${ordinal(placement)}! Thanks for participating!${rewardImage ? '\nHere is your *reward*! Looking good!' : ''}`, // we use ordinal to add suffix (st, nd, rd, th)
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
