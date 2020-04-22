# sinusbot-scripts
## Autoplaylist.js
This script plays random music from the catalog if nothing is playing/queued.

### Installation
Just copy the autoplaylist.js file to your sinusbot installation "scripts" folder and restart the program.

### Usage
1) Install the script and reboot the program;
2) Create a playlist named Autoplaylist and add songs to it. Only the 
songs in this playlist are going to be played by this script;
3) Activate it on the Scripts GUI page;
4) Configure your preference for the starting mode when the instance starts (ON or OFF).
5) Configure your preference for the auto volume setting (one for songs from the catalog, another for external ones). Usually you should use both or none of these settings.

### New Commands
!autoplay - Starts the autoplay mode, in case it's off for any reason (initial configuration or disable by other commands);

### Modified Original Commands
!stop - Besides stopping the current song, it also disables the autoplay mode;
!!stop - Besides stopping the current song and clearing the idle queue, it also disables the autoplay mode.

### Attention Points
Please do not use this script together with the native "Play when idle" 
feature. They are incompatible and things will break if you try it.

This is my first attempt at a script at my free time, so don't expect it
to be super stable. Tested only on SinusBot v1.0.0-beta.10-202ee4d with
the Discord backend.
