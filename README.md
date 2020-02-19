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
they both try to do kind of the same thing at the same time. This script
 actually was born because the original feature is kind of a mess, imo 
(like when you use the stop command it gets a new song from the playlist
 and keeps going). If the feature ever becomes good, this script will 
become obsolete.
