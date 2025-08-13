import dotenv from 'dotenv';
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { getQuiz, sendUserAnswer } from './utils/backendServices.js';
import { handleQuizTimeout } from './utils/handleQuizTimeout.js';

dotenv.config();

const quizSessionMap = new Map(); // to store quiz sessions in memory
const activeQuizzes = new Map();

const quizzes = {
  historical: {
    quizText: "Cine a fost primul președinte al SUA?",
    options: ["George Washington", "Thomas Jefferson", "Abraham Lincoln", "John Adams"],
    correctAnswer: "George Washington"
  },
  funny: {
    quizText: "Care este animalul preferat al unui programator?",
    options: ["Bug", "Python", "Cat", "Octocat"],
    correctAnswer: "Bug"
  },
  movie: {
    quizText: "Completează citatul: 'May the ____ be with you'",
    options: ["Force", "Horse", "Source", "Course"],
    correctAnswer: "Force"
  }
};

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

(async () => {
  client.login(process.env.DISCORD_TOKEN)
})();

client.on("interactionCreate", async (interaction) => {
  // Slash command
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "brainbuzz") {
      const quizTypeSelect = new StringSelectMenuBuilder()
        .setCustomId('select_quiz_type')
        .setPlaceholder('Selectează tipul quiz-ului')
        .addOptions(
          { label: 'Historical', value: 'historical' },
          { label: 'Funny Stuff / Icebreakers', value: 'icebreaker' },
          { label: 'Movie Quote Identification', value: 'movie_quote' }
        );

      const row = new ActionRowBuilder().addComponents(quizTypeSelect);

      await interaction.reply({
        content: 'Alege tipul quiz-ului:',
        components: [row],
        ephemeral: true
      });
    }
  }

  // Select menu handler
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'select_quiz_type') {
      const selectedType = interaction.values[0];

      const modal = new ModalBuilder()
        .setCustomId(`quiz_setup_${selectedType}`)
        .setTitle('Configurare Quiz');

      const deliveryInput = new TextInputBuilder()
        .setCustomId('delivery')
        .setLabel('Mod livrare (privat/canal)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const channelInput = new TextInputBuilder()
        .setCustomId('channel')
        .setLabel('Numele canalului (dacă ai ales canal)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const durationInput = new TextInputBuilder()
        .setCustomId('duration')
        .setLabel('Durata quiz-ului (mm:ss sau secunde)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(deliveryInput),
        new ActionRowBuilder().addComponents(channelInput),
        new ActionRowBuilder().addComponents(durationInput)
      );

      await interaction.showModal(modal);
    }
  }

  // Modal submission handler
  if (interaction.type === InteractionType.ModalSubmit) {
    if (interaction.customId.startsWith('quiz_setup_')) {
      // acknowledge the modal submission
      await interaction.deferReply();
      const quizType = interaction.customId.replace('quiz_setup_', '');
      const delivery = interaction.fields.getTextInputValue('delivery').toLowerCase();
      const channelName = interaction.fields.getTextInputValue('channel');
      let durationInput = interaction.fields.getTextInputValue('duration');

      // Convertim durata în secunde
      let durationSeconds = 0;
      if (durationInput.includes(':')) {
        const [min, sec] = durationInput.split(':').map(Number);
        durationSeconds = (min * 60) + sec;
      } else {
        durationSeconds = Number(durationInput);
      }
      if (isNaN(durationSeconds) || durationSeconds <= 0) {
        return interaction.reply({ content: 'Timp invalid!', flags: 'Ephemeral' });
      }

      /**
       * The type of destination for the quiz.
       * Either a user (private message) or a channel.
       */
      let destinationType;
      /**
       * The ID of either the channel or the user. This ID is used to fetch a `Channel` or a `User` object
       * that can be used to send messages in/to using the `send()` method.
       */
      let destinationId;
      switch (delivery) {
        case 'canal':
          if (!channelName) {
            return interaction.reply({ content: "❌ Te rog să specifici un nume de canal.", ephemeral: true });
          }

          // get selected channel id
          // GUILD = SERVER (Discord server)
          const guild = client.guilds.cache.get(interaction.guildId);
          const channel = guild.channels.cache.find(channel => channel.name.toLowerCase() === channelName.toLowerCase());

          // if no channel with the given name found
          if (!channel) {
            return interaction.reply({ content: `❌ Nu am găsit canalul #${channelName}.`, flags: 'Ephemeral' });
          }

          const channelId = channel.id;

          destinationType = 'channel';
          destinationId = channelId;

          break;

        case 'privat':
          destinationType = 'private';
          destinationId = interaction.user.id;

          break;
      }
      if (delivery === 'canal' && !channelName) {
        return interaction.reply({ content: "❌ Te rog să specifici un nume de canal.", ephemeral: true });
      }

      // generate quiz and store locally
      const quiz = await getQuiz(quizType, durationSeconds);

      if (!quiz) {
        return interaction.reply({ content: "❌ Can't think of a quiz right now. Try later.", ephemeral: true });
      }

      // print correct answer
      console.log('Quiz correct answer:', quiz.answer);

      // compute endTime
      const now = Date.now();
      const endTime = now + durationSeconds * 1000; // convert seconds to milliseconds

      // store quiz in db
      const creatorName = interaction.user.globalName || interaction.user.username;
      const quizSessionData = {
        quiz,
        endTime,
        usersAnswered: [],
        creatorName,
        type: quizType,
        question: quiz.quizText,
        destinationType,
        destinationId
      }
      quizSessionMap.set(quiz.quiz_id, quizSessionData);

      // start timeout
      // NOTE: do not use `await` since it will block the event loop
      handleQuizTimeout(quiz.quiz_id, endTime, quizSessionMap);

      const startButton = new ButtonBuilder()
        .setCustomId(`start_quiz_${quiz.quiz_id}_${quizType}_${durationSeconds}`)
        .setLabel('Start Quiz')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(startButton);

      const sentReply = await interaction.fetchReply();
      await sentReply.delete();

      if (delivery === 'privat') {
        await interaction.user.send({
          content: `You have started a new quiz!\nClick the "Start Quiz" button below to give it a try. You have ${durationSeconds} seconds.`,
          components: [row],
          embeds: [
            {
              image: { url: quiz.imageUrl }
            }
          ]
        });
      } else if (delivery === 'canal') {
        // get the channel name from the input
        const channel = client.channels.cache.find(c => c.name === channelName);
        if (channel) {
          await channel.send({
            content: `${creatorName} started a new ${quizType.toLowerCase()} quiz!\nClick the "Start Quiz" button below to give it a try. You have ${durationSeconds} seconds.`,
            components: [row]
          });
        } else {
          await interaction.reply({ content: `Could not find #${channelName}`, ephemeral: true });
        }
      } else {
        await interaction.reply({ content: 'Mod de livrare invalid. Scrie "privat" sau "canal".', ephemeral: true });
      }
    }
  }

  // --- Buton "Start Quiz" ---
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('start_quiz_')) {
      const parts = interaction.customId.replace('start_quiz_', '').split('_');
      const quizId = parts[0]
      const quizType = parts[1];
      const durationSeconds = parseInt(parts[2]);
      const { quiz } = quizSessionMap.get(quizId);

      if (!quiz) {
        return interaction.reply({ content: "Nu am găsit quiz-ul!", ephemeral: true });
      }

      // Buton "Răspunde"
      const answerButton = new ButtonBuilder()
        .setCustomId(`answer_quiz_button_${quizId}`)
        .setLabel('Răspunde')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(answerButton);

      let remaining = durationSeconds

      // salvăm momentul de final în map
      activeQuizzes.set(quizId, Date.now() + durationSeconds * 1000);

      // Mesaj cu întrebarea + opțiunile
      const quizMessage = await interaction.reply({
        content: `**${quiz.quizText}**\n\n` +
          quiz.options.map((opt, i) => `**${i + 1}.** ${opt}`).join("\n") +
          `\n\n⏳ Timp rămas: ${remaining}s`,
        components: [row],
        flags: 'Ephemeral'
      });

      // update countdown number each second
      const timerId = setInterval(async () => {
        remaining--;

        // if countdown is over
        if (remaining <= 0) {
          clearInterval(timerId);

          // disable button
          const disabledButton = ButtonBuilder.from(answerButton).setDisabled(true);
          const disabledRow = new ActionRowBuilder().addComponents(disabledButton);

          // update quizMessage with updated content and disabled button
          await quizMessage.edit({
            content: `**${quiz.quizText}**\n\n` +
              quiz.options.map((opt, i) => `**${i + 1}.** ${opt}`).join("\n") +
              `\n\n⏳ Time out!`,
            components: [disabledRow]
          });
          return;
        }

        // if countdown is not over
        // update quizMessage with updated content (countdown text)
        await quizMessage.edit({
          content: `**${quiz.quizText}**\n\n` +
            quiz.options.map((opt, i) => `**${i + 1}.** ${opt}`).join("\n") +
            `\n\n⏳ Time remaining: ${remaining}s`,
          components: [row]
        });
      }, 1000);
    }
  }

// --- Buton "Răspunde" ---
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('answer_quiz_button_')) {
      const quizId = interaction.customId.replace('answer_quiz_button_', '');
      const { quiz } = quizSessionMap.get(quizId);

      const modal = new ModalBuilder()
        .setCustomId(`answer_quiz_${quizId}`)
        .setTitle('Răspunde la quiz');

      const optionsInput = new TextInputBuilder()
        .setCustomId('answer')
        .setLabel('Răspunsul tău (exact cum apare)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(optionsInput));

      await interaction.showModal(modal);
    }
  }

// --- Procesare răspuns din modal ---
  if (interaction.type === InteractionType.ModalSubmit) {
    if (interaction.customId.startsWith('answer_quiz_')) {
      const quizId = interaction.customId.replace('answer_quiz_', '');
      const { quiz, creatorName, type, question } = quizSessionMap.get(quizId);
      const answer = interaction.fields.getTextInputValue('answer').trim();

      // check if quiz is over
      const endTime = activeQuizzes.get(quizId);
      if (!endTime || Date.now() > endTime) {
        return interaction.reply({
          content: '⏳ Quiz has timed out. You cannot answer.',
          flags: 'Ephemeral'
        });
      }

      const correct = answer.toLowerCase() === quiz.answer.toLowerCase()

      let text;
      if (correct) {
        text = [
          '🎉 Well done! That’s the correct answer.',
          `This quiz was created by: *${creatorName}*`,
          `Quiz type: *${type}*`,
          `Question: _${question}_`
        ].join('\n');
      } else {
        text = [
          '❌ Oops, that was incorrect.',
          `The correct answer was: *${quiz.answer}*`,
          `You selected: *${answer}*`,
          `This quiz was created by: *${creatorName}*`,
          `Quiz type: *${type}*quiz.`,
          `Question: _${question}_`
        ].join('\n');
      }

      await interaction.reply({ content: text, flags: 'Ephemeral' })

      // send answer to backend
      const userId = interaction.user.id;
      const userData = {
        display_name: interaction.user.username,
        profile_picture_url: interaction.user.displayAvatarURL()
      };

      try {
        await sendUserAnswer(userId, quizId, correct, userData)

        console.log('✅ Answer sent to backend successfully.');

      } catch (error) {
        console.error('❌ Failed to send answer to backend:', error.message)
      }

      // update session with user answer
      quizSessionMap.get(quizId).usersAnswered.push(userId);

      console.log('Updated session with user answer: ', quizSessionMap.get(quizId).usersAnswered);

    }
  }
});
