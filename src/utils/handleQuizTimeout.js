import ordinal from 'ordinal';
import { MediaGalleryBuilder } from 'discord.js';
import { client } from '../index.js';
import axios from 'axios';

/**
 * Fetches the destination (channel or user) based on the provided type and ID.
 * @param destinationType The type of the destination: 'channel' or 'user'
 * @param destinationId The ID of the destination, which can be a channel ID or a user ID
 * @return A Channel or User object that can be used to call the `send()` method on
 */
async function getDestination(destinationType, destinationId) {
  switch (destinationType) {
    case 'channel':
      return await client.channels.fetch(destinationId);
    case 'private':
      return await client.users.fetch(destinationId);
  }
}

export async function handleQuizTimeout(quizId, quizEndTime, quizSessionMap) {
  const now = new Date();
  const remainingMs = quizEndTime - now;

  if (remainingMs <= 0) {
    // TODO: is this check necessary?
    console.log(`Quiz with ID ${quizId} has already expired.`);
    return;
  }

  console.log(`Setting timeout for quiz with ID ${quizId} for ${remainingMs} ms.`);

  let topUsersWithImages = [];
  let otherUsers = [];

  setTimeout(async () => {
    console.log(`Quiz with ID ${quizId} has timed out.`);

    // fetch results from the guiz engine
    try {
      const response = await axios.post('http://localhost:3000/results', {
        quizId: quizId
      })

      if (response.data.topUsers) {
        // no one responded to the quiz
        topUsersWithImages = [];
        otherUsers = [];
      } else {
        topUsersWithImages = response.data.topUsersWithImages;
        otherUsers = response.data.otherUsers;
      }

    } catch (error) {
      console.error(`Failed to fetch results for quiz ID ${quizId}:`, error.message);
      return;
    }

    // fetch results from quiz engine and send rewards to top 3 users
    await sendRewardsToTopUsers(quizId, topUsersWithImages, otherUsers);

    const session = quizSessionMap.get(quizId);
    if (!session) {
      console.warn(`No session found for quiz ${quizId}, skipping summary post.`);
      return;
    }

    const { destinationType, destinationId } = quizSessionMap.get(quizId);
    const destination = await getDestination(destinationType, destinationId);

    const totalParticipants = session?.usersAnswered?.length || 0;

    let summaryContent = `*🏁 The quiz is over!*\n`

    if (!topUsersWithImages || topUsersWithImages.length === 0) {
      if (totalParticipants === 0) {
        summaryContent += `No one participated in the quiz.`;
      } else {
        summaryContent += `No one answered correctly, but ${totalParticipants} ${totalParticipants > 1 ? 'participants' : 'participant'} tried!`;
      }

      await destination.send({
        content: summaryContent,
      })

      console.log(`Deleting quiz session with ID ${quizId} from the map.`);
      quizSessionMap.delete(quizId);
      return;
    }

    // 1️⃣ Listează primele 3 locuri
    topUsersWithImages?.slice(0, 3).forEach((user, i) => {
      const userId = user.userId || user.user_id;
      const username = user.user_data.display_name;
      const imageUrl = user.rewardImage;

      summaryContent += `\n*${ordinal(i + 1)}* place: <@${userId}>`;
    });

    // 2️⃣ Adaugă footer-ul cu numărul de participanți
    summaryContent += `\n\n🎉 A total of *${totalParticipants}* user(s) participated in the quiz.`;

    await destination.send({
      content: summaryContent,
      embeds: topUsersWithImages.map((user) => {
          return {
            title: `${user.user_data.display_name}'s reward`,
            image: { url: user.rewardImage },
          }
        })
    });

    console.log(`Deleting quiz session with ID ${quizId} from the map.`);
    quizSessionMap.delete(quizId);
  }, 30000);
}

async function sendRewardsToTopUsers(quizId, topUsersWithImages, otherUsers){
  if (!topUsersWithImages || topUsersWithImages.length === 0) {
    console.log(`No users answered quiz ID ${quizId}.`);
    return;
  }

  // send a DM to the top users with their reward images
  for (let i = 0; i < topUsersWithImages.length; i++) {
    const userId = topUsersWithImages[i].user_id;
    const username = topUsersWithImages[i].user_data.display_name;
    const rewardImage = topUsersWithImages[i].rewardImage;

    await sendRewardToUser(userId, username, i+1, rewardImage);
  }

  console.log("Sent the rewards to the top users successfully.");

  // send a DM to the other users (who did not rank in top 3)
  // but first check not null
  if (!otherUsers) {
    return;
  }

  for (const user of otherUsers) {
    const userId = user.user_id;
    const displayName = user.user_data.display_name || '';
    const placement = user.placement;

    const user = await client.users.fetch(userId);
    await user.send({
      content: `😢 Salut ${displayName}, ai ieșit pe locul ${placement} și nu ai primit un reward de data asta. Mult succes data viitoare!`,
    });
  }
}

async function sendRewardToUser(userId, username, placement, rewardImage) {

  const user = await client.users.fetch(userId);
  await user.send({
    content: `🎉 Congrats ${username}! You came ${ordinal(placement)} in the quiz!`,
    embeds: [{
      title: "Your Reward",
      image: { url: rewardImage }
    }],

  });
}