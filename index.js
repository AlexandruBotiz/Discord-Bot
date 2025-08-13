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

dotenv.config();

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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

client.login(process.env.DISCORD_TOKEN);

const activeQuizzes = new Map();

client.on("interactionCreate", async (interaction) => {
    // Slash command
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === "brainbuzz") {
            const quizTypeSelect = new StringSelectMenuBuilder()
                .setCustomId('select_quiz_type')
                .setPlaceholder('Selectează tipul quiz-ului')
                .addOptions(
                    { label: 'Historical', value: 'historical' },
                    { label: 'Funny Stuff / Icebreakers', value: 'funny' },
                    { label: 'Movie Quote Identification', value: 'movie' }
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
                return interaction.reply({ content: 'Timp invalid!', ephemeral: true });
            }

            const startButton = new ButtonBuilder()
                .setCustomId(`start_quiz_${quizType}_${durationSeconds}`)
                .setLabel('Start Quiz')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(startButton);

            if (delivery === 'privat') {
                await interaction.user.send({
                    content: `Tip quiz: ${quizType}\nDurată: ${durationSeconds} secunde`,
                    components: [row]
                });
                await interaction.reply({ content: 'Ți-am trimis quiz-ul în privat! 📩', ephemeral: true });
            } else if (delivery === 'canal') {
                const channel = client.channels.cache.find(c => c.name === channelName);
                if (channel) {
                    await channel.send({
                        content: `Tip quiz: ${quizType}`,
                        components: [row]
                    });
                    await interaction.reply({ content: `Am trimis quiz-ul în canalul #${channelName}! 📢`, ephemeral: true });
                } else {
                    await interaction.reply({ content: `Nu am găsit canalul #${channelName}`, ephemeral: true });
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
            const quizType = parts[0];
            const durationSeconds = parseInt(parts[1]);
            const quiz = quizzes[quizType];

            if (!quiz) {
                return interaction.reply({ content: "Nu am găsit quiz-ul!", ephemeral: true });
            }

            // Buton "Răspunde"
            const answerButton = new ButtonBuilder()
                .setCustomId(`answer_quiz_button_${quizType}`)
                .setLabel('Răspunde')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(answerButton);

            let remaining = durationSeconds;

            // salvăm momentul de final în map
            activeQuizzes.set(quizType, Date.now() + durationSeconds * 1000);

            const quizMessage = await interaction.channel.send({
                content: `**${quiz.quizText}**\n\n` +
                        quiz.options.map((opt, i) => `**${i + 1}.** ${opt}`).join("\n") +
                        `\n\n⏳ Timp rămas: ${remaining}s`,
                components: [row]
            });

            await interaction.reply({ content: 'Quiz-ul a început! 📢', ephemeral: true });

            const timerId = setInterval(async () => {
                remaining--;
                if (remaining <= 0) {
                    clearInterval(timerId);
                    const disabledButton = ButtonBuilder.from(answerButton).setDisabled(true);
                    const disabledRow = new ActionRowBuilder().addComponents(disabledButton);
                    await quizMessage.edit({
                        content: `**${quiz.quizText}**\n\n` +
                                quiz.options.map((opt, i) => `**${i + 1}.** ${opt}`).join("\n") +
                                `\n\n⏳ Timpul a expirat!`,
                        components: [disabledRow]
                    });
                    return;
                }
                await quizMessage.edit({
                    content: `**${quiz.quizText}**\n\n` +
                            quiz.options.map((opt, i) => `**${i + 1}.** ${opt}`).join("\n") +
                            `\n\n⏳ Timp rămas: ${remaining}s`,
                    components: [row]
                });
            }, 1000);
        }
    }



    // --- Buton "Răspunde" ---
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('answer_quiz_button_')) {
            const quizType = interaction.customId.replace('answer_quiz_button_', '');
            const quiz = quizzes[quizType];

            const modal = new ModalBuilder()
                .setCustomId(`answer_quiz_${quizType}`)
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
            const quizType = interaction.customId.replace('answer_quiz_', '');
            const quiz = quizzes[quizType];
            const answer = interaction.fields.getTextInputValue('answer');

            const endTime = activeQuizzes.get(quizType);
            if (!endTime || Date.now() > endTime) {
                return interaction.reply({
                    content: '⏳ Timpul a expirat, nu mai poți răspunde.',
                    ephemeral: true
                });
            }

            if (answer.trim().toLowerCase() === quiz.correctAnswer.toLowerCase()) {
                await interaction.reply({ content: '✅ Corect!', ephemeral: true });
            } else {
                await interaction.reply({ content: `❌ Greșit! Răspunsul corect era: ${quiz.correctAnswer}`, ephemeral: true });
            }
        }
    }

});
