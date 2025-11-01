import supabaseClient from '../services/supabaseClient.js';
import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

/**
 * If no active quiz, shows an in-chat (not modal) select menu
 * to choose a quiz type
 */
export async function handleCommand(interaction) {
  if (interaction.commandName === 'brainbuzz') {
    try {
      // check the database if there is an active quiz
      const { data: activeQuiz, error } = await supabaseClient
        .from('quizzes')
        .select('*')
        .eq('is_active', true)
        .single();
    } catch (error) {
      console.error('Error checking active quiz:', error);
      return;
    }

    // // TODO: better error handling
    // //  PGRST116 is hard coded; not good!
    // if (error && error.code !== 'PGRST116') {
    //   // PGRST116 = no rows found
    //   console.error('Error checking active quiz:', error);
    //   return;
    // }

    // if there is an active quiz, send an ephemeral message and return
    // if (activeQuiz) {
    //   await interaction.reply({
    //     content: ":warning: There is already an active quiz!",
    //     ephemeral: true
    //   })
    //   return;
    // }

    // create a select menu for selecting quiz type
    const quizTypeSelectMenu = new StringSelectMenuBuilder()
      .setCustomId('quiz_type_select_menu')
      .setPlaceholder('What quiz would you like to play?')
      .addOptions(
        { label: 'Historical', value: 'historical' },
        { label: 'Funny Stuff / Icebreakers', value: 'icebreaker' },
        { label: 'Movie Quote Identification', value: 'movie_quote' },
        { label: 'Computer Trivia', value: 'computer_trivia' }
      );

    const actionRow = new ActionRowBuilder().addComponents(quizTypeSelectMenu);

    return await interaction.reply({
      content: 'Choose the type of quiz you want to create:',
      components: [actionRow],
      ephemeral: true
    });
  }
}
