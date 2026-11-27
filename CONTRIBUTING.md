# Contributing to StanClip

Thank you for your interest in contributing to **StanClip**! We welcome bug reports, improvements, documentation updates, and new features from the community.

---

## 1. Ground Rules & Code of Conduct

All contributors are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please be respectful and constructive in all interactions.

### Non-Negotiable Architectural Principles
When submitting pull requests, please respect the core architecture:
* **Privacy & Local Processing**: Do not introduce mandatory external cloud speech-to-text or mandatory paid cloud services. Audio transcription must remain capable of running entirely locally.
* **Preserve Aesthetics & Styling**: Do not redesign the glassmorphism interface, dark-first color scheme, or existing component architecture without prior consensus in an issue discussion.
* **Security**: Never commit personal API keys, tokens, user data, or developer credentials.

---

## 2. Development Setup

### Prerequisites
* **Python 3.10 or newer**
* **FFmpeg** installed and accessible in your system PATH (`ffmpeg -version`)
* **Node.js 18+** and `npm` (for frontend asset compilation)

### Getting Started

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/eswarmadapani/StanClips.git
   cd StanClip
   ```

2. **Set up a Python virtual environment:**
   ```bash
   # On Windows
   python -m venv .venv
   .\.venv\Scripts\activate

   # On Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install frontend dependencies & build assets:**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

5. **Start the local development server:**
   ```bash
   python -m studio.server
   ```
   Open `http://127.0.0.1:8765` in your browser.

---

## 3. Making Changes

1. **Create a descriptive feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Follow existing coding conventions:**
   * **Backend**: Follow PEP 8 guidelines. Keep functions focused and well-typed.
   * **Frontend**: Write clean TypeScript with strict typing, utilizing Tailwind CSS for styling.
3. **Run automated tests before committing:**
   ```bash
   python tests/test_captions.py
   python tests/test_layouts.py
   python tests/test_games.py
   ```
4. **Commit with clear, imperative messages:**
   ```bash
   git commit -m "Add custom boundary validation to Layout Studio"
   ```

---

## 4. Submitting a Pull Request

1. Push your branch to your GitHub fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against the `main` branch of StanClip.
3. Complete the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md) checklist.
4. Ensure all CI automated checks pass.

Thank you for helping make StanClip the premier open-source video clipping suite!
