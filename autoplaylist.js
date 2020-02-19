registerPlugin({
    name: 'Autoplaylist',
    version: '1.0',
    description: 'Plays random music from the catalog if nothing is playing/queued. For this first version, you need all desired songs in a list name Autoplaylist.',
    author: 'Ricardo Trindade <hattie.walker82@animalzero.com>',
    vars: [{
        name: "INITIAL_MODE",
        title: "Autoplaylist initial mode",
        type: "select",
        options: ["ON", "OFF"],
        default: 1
    }],    
    backends: ["discord"]
}, function(_, { INITIAL_MODE }, meta) {
    const REACTION_SUCCESS = '✅';

    const audio = require('audio');
    const backend = require('backend');
    const command = require('command');
    const engine = require('engine');
    const event = require('event');
    const helpers = require('helpers');
    const media = require('media');

    const ON = 0;
    const OFF = 1;

    let prefix = engine.getCommandPrefix();
    let engaged;

    event.on('load', () => {
        engaged = (INITIAL_MODE == ON);
        if (engaged) {
            engine.log('[DEBUG] Autoplaylist mode ON.');
            checkIfEligibleForAutoplayMode();
        }
    });

    // Check if we are alone (alonemode script does not cover situations where the admin)
    function botIsAlone() {
        let currentChannel = backend.getCurrentChannel();
        let clients = currentChannel ? currentChannel.getClientCount() : 0;
        return (clients <= 1) 
    }

    // Nothing is playing, select something and play
    function autoplay() {
        if (!engaged) return;
        engine.log('[DEBUG] Checking for empty queue/playlist...');

        // Find Autoplaylist
        let playlist = media.getPlaylists().find(playlist => {
            return playlist.name() == 'Autoplaylist';
        });
        if (!playlist) {
            engine.log('[DEBUG] No Autoplaylist found, disengaging jukebox mode.');
            return;
        }

        engine.log('[DEBUG] Autoplay engaged. Playing something from the catalog...');
        // Select a random song and play it
        let tracks = playlist.getTracks();
        let selectedTrack = tracks[helpers.getRandom(tracks.length)];
        selectedTrack.play();
    }

    function checkIfEligibleForAutoplayMode() {
        if (botIsAlone()) return;

        if (media.getQueue().length > 0) return;
        if (media.getActivePlaylist() && audio.isShuffle()) return;  // The playlist never ends if shuffle is engaged
            
        // Workaround for end of unshuffled playlist or "invisible queue"
        setTimeout(() => { 
            if( !audio.isPlaying() ) autoplay(); 
        }, 5000);
    }

    // Track the song ending (naturally or by skipping/stopping the bot)
    event.on('trackEnd', function(track, callback) {
        engine.log('[DEBUG] Music ' + track.title() + ' ended...');
        checkIfEligibleForAutoplayMode();
    });

    // Workaround for alone mode not yet engaged (first time after loading bot)
    event.on('clientMove', () => {
        engine.log('[DEBUG] Client moved...');
        checkIfEligibleForAutoplayMode();
    });

    // Disable autoplaylist after receiving the stop command
    event.on('chat', function(msg) {
        possibleCommand = msg.text.trim();
        if (possibleCommand == prefix + 'stop' || 
            possibleCommand == prefix + prefix + 'stop') {
            
            msg.channel.chat('Disengaging autoplay mode. Use the command ' + prefix + ' to start it againg later.');
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