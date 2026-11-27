# Podcast speaker tracking

Podcast analyzes only the requested excerpt locally. FFmpeg creates synchronized 25 fps video and 16 kHz mono audio for analysis. A frontal-face detector finds candidates. Light-ASD scores each tracked face together with the audio. The output encoder still reads the original source. Only one analysis worker runs at a time. Each render computes a fresh plan in its temporary directory.

## Optional installation for another machine

From the project directory, install the worker dependencies in the same Python environment that runs Stan Clips:

    python -m pip install torch opencv-python-headless==4.11.0.86 python_speech_features scipy

Download the [upstream AVA checkpoint](https://github.com/Junhua-Liao/Light-ASD/raw/ed38c232de5efe0261dbd68627c0ade7cdfe14eb/weight/pretrain_AVA_CVPR.model) to `models/light-asd-ava.model`. The loader checks its SHA-256 before reading it. The checkpoint is 4,175,289 bytes. It is installed locally and excluded from Git.

The network source in `studio/light_asd` is adapted from [Light-ASD](https://github.com/Junhua-Liao/Light-ASD/tree/ed38c232de5efe0261dbd68627c0ade7cdfe14eb) under the included MIT license. The upstream README requests citation for use of the code or weights. Separate redistribution permission for the AVA checkpoint has not been confirmed. The detector is the frontal-face Haar cascade supplied by OpenCV, with its own notice in the cascade XML.

With missing audio, unavailable dependencies, missing weights or no confident visible speaker, Podcast keeps the full scene. Profile faces, heavy occlusion, dubbing and weak synchronization can reduce tracking accuracy. The model is loaded only for this layout.
