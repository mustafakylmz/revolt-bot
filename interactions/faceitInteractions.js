// faceitInteractions.js
import { InteractionResponseType, InteractionResponseFlags, MessageComponentTypes, InteractionType } from 'discord-interactions';
import { Routes } from 'discord-api-types/v10';

/**
 * Handles Faceit-related interactions, including showing a modal for nickname input
 * and processing the submitted nickname to assign a Faceit level role.
 * @param {object} interaction - The Discord interaction object.
 * @param {object} res - The Express response object.
 * @param {object} rest - The Discord REST API client.
 * @param {string} applicationId - The Discord bot's application ID.
 * @param {object} env - Environment variables (e.g., FACEIT_API_KEY).
 * @param {object} db - The MongoDB database instance.
 */
export async function handleFaceitInteraction(interaction, res, rest, applicationId, env, db) {
    const { custom_id } = interaction.data;
    const memberId = interaction.member.user.id;
    const guildId = interaction.guild_id;

    // Handle the initial button click to request Faceit nickname
    if (interaction.type === InteractionType.MESSAGE_COMPONENT && custom_id === 'faceit_role_request_button') {
        return res.send({
            type: InteractionResponseType.MODAL, // Respond with a modal
            data: {
                custom_id: 'modal_faceit_nickname_submit', // Custom ID for the modal submission
                title: 'Faceit Nickname Gir', // Title of the modal
                components: [
                    {
                        type: MessageComponentTypes.ACTION_ROW, // Action row for components
                        components: [
                            {
                                type: 4, // Text Input component type
                                custom_id: 'faceit_nickname_input', // Custom ID for the text input
                                style: 1, // Short text input style
                                label: 'Faceit Kullanıcı Adınız:', // Label for the input field
                                placeholder: 'shroud', // Placeholder text
                                required: true, // Make the input required
                                min_length: 3, // Minimum length for the nickname
                                max_length: 30, // Maximum length for the nickname
                            }
                        ]
                    }
                ]
            }
        });
    }

    // Handle the submission of the Faceit nickname modal
    if (interaction.type === InteractionType.MODAL_SUBMIT && custom_id === 'modal_faceit_nickname_submit') {
        // Immediately defer the response to prevent token expiration
        await res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL // Still ephemeral
            }
        });

        // Extract the nickname from the modal submission data
        const nickname = interaction.data.components[0].components[0].value;
        let responseMessage = '';
        let faceitLevel = null;
        let roleIdToAssign = null; // Variable to hold the role ID to be assigned

        try {
            // Fetch Faceit player data using the provided nickname
            const faceitRes = await fetch(`https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nickname)}`, {
                headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}` } // Use Faceit API key from environment variables
            });
            const faceitData = await faceitRes.json();

            if (!faceitRes.ok) {
                // Handle API errors (e.g., nickname not found, other errors)
                responseMessage = faceitRes.status === 404
                    ? `Faceit nickname "${nickname}" bulunamadı.`
                    : `Faceit API hatası: ${faceitData.message || 'Bilinmeyen hata'}.`;
            } else {
                // Extract Faceit skill level for CSGO
                faceitLevel = faceitData?.games?.csgo?.skill_level;
                if (!faceitLevel) {
                    responseMessage = `Faceit verisi eksik veya CSGO seviyesi tespit edilemedi.`;
                }
            }
        } catch (e) {
            // Catch network or other fetch-related errors
            responseMessage = 'Faceit API ile bağlantı hatası oluştu. Lütfen tekrar deneyiniz.';
            console.error('Faceit API hatası:', e);
        }

        // Proceed to assign role if Faceit level was successfully retrieved
        if (faceitLevel !== null) {
            try {
                // Fetch guild configuration from MongoDB to get Faceit level roles
                const guildConfig = await db.collection('guild_configs').findOne({ guildId });
                // Determine the role ID based on the Faceit level
                roleIdToAssign = guildConfig?.faceitLevelRoles?.[String(faceitLevel)] ?? null;

                if (roleIdToAssign) {
                    // Assign the role to the member
                    await rest.put(Routes.guildMemberRole(guildId, memberId, roleIdToAssign));
                    responseMessage = `Faceit seviyeniz ${faceitLevel} ve rol başarıyla atandı.`;
                } else {
                    responseMessage = `Faceit seviyesi ${faceitLevel} için tanımlı rol bulunamadı.`;
                }
            } catch (e) {
                console.error('Rol atama hatası:', e);
                responseMessage = 'Rol atanırken bir hata oluştu.';
            }
        } else {
            // If faceitLevel is null, it means there was an issue fetching Faceit data.
            // The responseMessage should already reflect this.
            if (!responseMessage) { // Fallback if for some reason responseMessage is empty
                responseMessage = 'Faceit seviyeniz belirlenemediği için rol atanamadı.';
            }
        }

        // Save or update Faceit user data in MongoDB
        try {
            await db.collection('faceit_users').updateOne(
                { discordId: memberId, guildId }, // Query to find the document
                {
                    $set: { // Fields to set or update
                        discordId: memberId,
                        guildId,
                        faceitNickname: nickname,
                        faceitLevel,
                        assignedRoleId: roleIdToAssign, // Store the role that was attempted to be assigned
                        lastUpdated: new Date()
                    }
                },
                { upsert: true } // Create a new document if one doesn't exist
            );
        } catch (e) {
            console.error('MongoDB veri kayıt hatası:', e);
            // Append to response message if saving data fails, but don't override success message
            if (!responseMessage.includes("hata oluştu")) { // Avoid redundant error messages
                responseMessage += ' Ancak verileriniz kaydedilirken bir sorun oluştu.';
            }
        }

        // Send the final response back to Discord by editing the deferred message
        return await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
            body: {
                content: responseMessage,
                flags: InteractionResponseFlags.EPHEMERAL // Only visible to the user who triggered it
            }
        });
    }

    // Default response for any unhandled Faceit interactions
    return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: 'Bilinmeyen Faceit etkileşimi.',
            flags: InteractionResponseFlags.EPHEMERAL
        }
    });
}
