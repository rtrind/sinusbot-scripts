registerPlugin({
    name: 'Autoplaylist',
    version: '1.1',
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
        name: "AUTO_VOLUME_LEVEL",
        title: "The volume will be 100 for all autoplay songs and the number you configure here for all others (-1 to disable)",
        type: "number",
        default: -1,
    },
    ],    
    backends: ["discord"],
}, function(_, { INITIAL_MODE, AUTO_VOLUME_LEVEL }, meta) {
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

    let engaged;                               // Autoplay is ON/OFF
    let auto_volume_level;                     // Volume level (or OFF)
    let songJustStartedIsFromAutoplay = false; // Control variable to not lower volume for autoplay songs

    event.on('load', () => {
        engaged = (INITIAL_MODE == ON);
        auto_volume_level = AUTO_VOLUME_LEVEL;
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

    // Nothing is playing, select something and play
    function autoplay() {
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
        let selectedTrack = tracks[helpers.getRandom(tracks.length)];
        if (auto_volume_level != -1) {
            engine.log('[DEBUG] Setting volume to 100...');
            audio.setVolume(100);  // All the musics are normalized, set volume at max.
        }
        selectedTrack.play();
        songJustStartedIsFromAutoplay = true;

        setTimeout(() => {
            songJustStartedIsFromAutoplay = false;
        }, 5000);
    }

    function checkIfEligibleForAutoplayMode() {
        if (botIsAlone()) {
            engine.log('[DEBUG] Bot is alone. Exiting...');
            return;
        }
        if (media.getQueue().length > 0) {
            engine.log('[DEBUG] The queue is not empty. Exiting...');
            return;
        }
        if (media.getActivePlaylist() && audio.isShuffle()) {
            engine.log('[DEBUG] Playlist in shuffle mode is engaged. Exiting...');
            return;
        }
            
        // Workaround for end of unshuffled playlist or "invisible queue"
        setTimeout(() => {
            engine.log('[DEBUG] Checking for autoplay availability...');
            if( !audio.isPlaying() ) autoplay(); 
        }, 5000);
    }

    // Track the song starting, so we can use the autovolume function, if activated
    event.on('track', function(track) {
        if (!songJustStartedIsFromAutoplay) {
            if (auto_volume_level != -1) {
                engine.log('[DEBUG] Setting volume to ' + auto_volume_level + '...');
                audio.setVolume(auto_volume_level);  // Use the volume from the config
            }
        }
    });

    // Track the song ending (naturally or by skipping/stopping the bot)
    event.on('trackEnd', function(track, callback) {
        engine.log('[DEBUG] Music ' + track.title() + ' stopped/ended.');
        checkIfEligibleForAutoplayMode();
    });

    // We could be alone (stop) or the first human entered (start), check
    event.on('clientMove', () => {
        engine.log('[DEBUG] Client moved.');
        checkIfEligibleForAutoplayMode();
    });

    // Disable autoplaylist after receiving the stop command
    event.on('chat', function(msg) {
        possibleCommand = msg.text.trim();
        if (possibleCommand == prefix + 'stop' || 
            possibleCommand == prefix + prefix + 'stop') {
            
            msg.channel.chat('Disengaging autoplay mod. Use the command ' + prefix + 'autoplay to start it againg later.');
            engaged = false;
        }
    });

    // Allows a way to engage autoplay again after its stopped somehow
    command.createCommand('autoplay')
    .help('Start playing back the playlist Autoplaylist')
    .manual('starts playing back the playlist Autoplaylist.')
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
