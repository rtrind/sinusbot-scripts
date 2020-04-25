/**
 * @author margaret.iinteranfac96@animalzero.com
 * @license MIT
 * 
 * MIT License
 * 
 * Copyright (c) 2019-2020 margaret.iinteranfac96@animalzero.com
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
registerPlugin({
    name: 'Autoplaylist',
    version: '1.2.2',
    description: 'Plays random music from the catalog if nothing is playing/queued. For this first version, you need all desired songs in a list name Autoplaylist.',
    author: 'Ricardo Trindade <hattie.walker82@animalzero.com>',
    vars: [{
        name: "INITIAL_MODE",
        title: "Autoplaylist initial mode",
        type: "select",
        options: ["ON", "OFF"],
        default: 1,
    },
    {
        name: "YTDL_VOLUME_LEVEL",
        title: "Sets the volume automatically for ytdl songs. Use both volume controls or none at all. (-1 to disable)",
        type: "number",
        default: -1,
    },
    {
        name: "JUKE_VOLUME_LEVEL",
        title: "Sets the volume automatically for autoplaylist songs. Use both volume controls or none at all. (-1 to disable)",
        type: "number",
        default: -1,
    },
    ],    
    backends: ["discord"],
}, function(_, { INITIAL_MODE, YTDL_VOLUME_LEVEL, JUKE_VOLUME_LEVEL }, meta) {
    const audio = require('audio');
    const backend = require('backend');
    const command = require('command');
    const engine = require('engine');
    const event = require('event');
    const helpers = require('helpers');
    const media = require('media');
    
    const prefix = engine.getCommandPrefix();

    const REACTION_SUCCESS = '✅';
    const ON = 0;
    const OFF = 1;
    const AUTOPLAY_TIMEOUT = 5000;    

    /********* privileges *********/
    const PLAYBACK          = 1 << 12;

    let engaged;                               // Autoplay is ON/OFF
    let ytdl_volume_level;                     // Auto volume for external songs                     
    let juke_volume_level;                     // Auto volume for internal songs

    event.on('load', () => {
        engaged = (INITIAL_MODE == ON);
        ytdl_volume_level = YTDL_VOLUME_LEVEL;
        juke_volume_level = JUKE_VOLUME_LEVEL;
        if (engaged) {
            engine.log('[DEBUG] Autoplaylist mode ON.');
            checkIfEligibleForAutoplayMode();
        }
    });

    // Check if we are alone in the channel
    function botIsAlone() {
        let currentChannel = backend.getCurrentChannel();
        let clients = currentChannel ? currentChannel.getClientCount() : 0;
        return (clients <= 1) 
    }

    /**
     * Returns a formatted string from a Track (or PlaylistTrack).
     *
     * @param {Track} track
     * @returns {string} formatted string
     */
    function formatTrack(track) {
        let title = track.tempTitle() || track.title();
        let artist = track.tempArtist() || track.artist();
        return artist ? `${artist} - ${title}` : title;
    }

    /**
     * Returns alls users that match the clients UID and ServerGroups.
     *
     * @param {Client} client
     * @returns {User[]} Users that match the clients UID and ServerGroups.
     */
    function getUsersByClient(client) {
        return engine.getUsers().filter(user =>
            // does the UID match?
            client.uid() == user.uid() ||
            // does a group ID match?
            client.getServerGroups().map(group => group.id()).includes(user.groupId()) ||
            // group ID '-1' matches everyone
            user.groupId() == '-1'
        );
    }

    /**
     * Returns a function that checks if a given user has all of the required privileges.
     * @param {...number} privileges If at least one privilege matches the returned function will return true.
     */
    function requirePrivileges(...privileges) {
        return (/** @type {Client} */ client) => {
            // check if at least one user has the required privileges
            return getUsersByClient(client).some(user => {
                // check if at least one privilege is found
                return privileges.some(priv => {
                    return ((user.privileges()|user.instancePrivileges()) & priv) === priv;
                });
            });
        };
    }

    // Nothing is playing, select something and play
    function autoplay() {
        engine.log('[DEBUG] Checking for autoplay oportunity...');
        if (!engaged) {
            engine.log('[DEBUG] Autoplaylist mode is disengaged. Exiting...');
            return;    
        }

        // Find Autoplaylist
        let playlist = media.getPlaylists().find(playlist => {
            return playlist.name() == 'Autoplaylist';
        });
        if (!playlist) {
            engine.log('[DEBUG] No Autoplaylist found, disengaging jukebox mode.');
            return;
        }

        // Select a random song and play it
        engine.log('[DEBUG] Autoplay engaged. Playing something from the catalog...');
        let tracks = playlist.getTracks();
        if (tracks.length == 0) {
            engine.log('[DEBUG] No songs in the Autoplaylist, disengaging jukebox mode.');
            return;
        }
        let selectedTrack = tracks[helpers.getRandom(tracks.length)];
        engine.log('[DEBUG] Song selected!')
        selectedTrack.play();
    }

    function checkIfEligibleForAutoplayMode() {
        if (botIsAlone()) {
            engine.log('[DEBUG] Bot is alone, exiting...');
            return;
        }
        if (media.getQueue().length > 0) {
            engine.log('[DEBUG] The queue is not empty, exiting...');
            return;
        }
        if (media.getActivePlaylist() && audio.isShuffle()) {
            engine.log('[DEBUG] Playlist in shuffle mode is engaged, exiting...');
            return;
        }
            
        // Workaround for end of unshuffled playlist or "invisible queue"
        setTimeout(() => {
            if( audio.isPlaying() ) {
                engine.log('[DEBUG] Song is playing, exiting...');
            } else {
                autoplay();
            }
        }, AUTOPLAY_TIMEOUT);
    }

    // Track the song starting, so we can use the autovolume function, if activated
    event.on('track', function(track) {
        engine.log(`[DEBUG] Track started (${track.url()}) '${formatTrack(track)}'`)
        if (track.url()) {
            // Jukebox song
            volume_level = juke_volume_level;
        } else {
            // Other source
            volume_level = ytdl_volume_level;
        }

        if (volume_level != -1) {
            engine.log(`[DEBUG] Setting volume to ${volume_level}...`);
            audio.setVolume(volume_level);
        }
    });

    // Track the song ending (naturally or by skipping/stopping the bot)
    event.on('trackEnd', function(track, callback) {
        engine.log(`[DEBUG] Music '${formatTrack(track)}' stopped/ended.`);
        checkIfEligibleForAutoplayMode();
    });

    // We could be alone (stop) or the first human entered (start), check
    event.on('clientMove', () => {
        engine.log('[DEBUG] Client moved...');
        checkIfEligibleForAutoplayMode();
    });

    // Disable autoplaylist after receiving the stop command
    event.on('chat', function(msg) {
        possibleCommand = msg.text.trim();
        if (possibleCommand == prefix + 'stop' || 
            possibleCommand == prefix + prefix + 'stop') {
            
            msg.channel.chat('Disengaging autoplay mod. Use the command ' + prefix + 'autoplay to start it again later.');
            engaged = false;
        }
    });

    // Allows a way to engage autoplay again after its stopped somehow
    command.createCommand('autoplay')
    .alias('ap')
    .help('Start playing back the playlist Autoplaylist')
    .manual('starts playing back the playlist Autoplaylist.')
    .checkPermission(requirePrivileges(PLAYBACK))
    .exec((client, args, reply, ev) => {
        engaged = true;

        if (audio.isPlaying()) {
            reply('Autoplay mode engaged in background.');
            return;
        }

        if (botIsAlone()) {
            reply('Autoplay mode engaged but since no one is listening, no song will start now.');
            return;
        }

        ev.message.createReaction(REACTION_SUCCESS)
        autoplay();
    });
});
