# Reversing contactor circuit (Wendeschützschaltung) – wiring animation

`wendeschuetz_4k.mp4`: 60 s, 3840×2160, 30 fps. Shows a reversing contactor circuit wired step by step on a training wall, ending with a function test.

The scene is built in three.js (`web/scene.js`). Each frame is rendered in headless Chromium (Playwright) and encoded with ffmpeg.

## Re-render

```sh
npm install
node render.js --w 1920 --h 1080 --frames 0,600,1350 --out stills      # preview stills
node render.js --w 3840 --h 2160 --from 0 --to 1800 --video video.mp4 --timeline timeline.json
node audio.js timeline.json sound.wav
ffmpeg -i video.mp4 -i sound.wav -c:v copy -c:a aac -b:a 192k -shortest final.mp4
```

You can split `--from`/`--to` across several processes and join the parts with the ffmpeg concat demuxer.
