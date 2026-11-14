# ADHD Reader

Original repository: https://github.com/julyseaweed/adhd-reader-chrome
Commit: 297fb002c8197352ec53afba3a9b6e1f1d1c1538 (v0.1.21)

The app bundle is built from the upstream source with portfolio performance fixes retained in `reader-src/`. Reader controls, reading order, text-selection geometry, annotations, dictionary and PDF.js assets follow the original app. The portfolio opens the bundled paper through the original `url` query parameter.

Performance changes: keep the page bitmap, selectable text, and annotations in one fixed coordinate system. Zoom transforms that page in the next frame without rerasterizing or blocking line navigation. Page navigation moves to the target as soon as requested; a page image can appear before its selectable text is attached.

The bundled paper has pre-rendered page images and compressed reading geometry in `openvla-pages/`. These assets are selected only for the exact bundled PDF fingerprint. The original PDF is still used for export, annotations, and document metadata. Other PDFs use the regular PDF.js pipeline. Build with `node reader-src/build.mjs` after installing dependencies in `reader-src/`.

Sample paper: Moo Jin Kim et al., *OpenVLA: An Open-Source Vision-Language-Action Model* (2024), https://arxiv.org/abs/2406.09246v3. Original unmodified PDF from https://arxiv.org/pdf/2406.09246v3, distributed under https://creativecommons.org/licenses/by/4.0/. The project cover is a screenshot of the reader displaying this paper.
