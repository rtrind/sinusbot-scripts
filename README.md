# sinusbot-scripts
## Autoplaylist.js
This is my first attempt at a script at my free time, so don't expect it
to be super stable. Tested only on SinusBot v1.0.0-beta.10-202ee4d with
the Discord backend.

For now, the playlist used for the bot needs to be named Autoplaylist, otherwise the script won't work.

It adds a command !autoplay to start the mode, in case it's configured 
to be off in the settings or the command !stop is used (which cancels 
it). 

This script does not play well with the "Play when idle" feature, since 
they both try to do kind of the same thing at the same time. This script will be obsolete when Sinusbot changes 2 behaviors on the original feature:

1) The !stop command does not stop the queue. It will immediately start 
another song. Since there is no pause command yet, there is no way to 
temporarily stop the functionality;

2) The !!stop command clears the queue permanently, so we need to go to 
the GUI and add the desired songs to the feature again, which for me 
goes against the spirit of the functionality. 
