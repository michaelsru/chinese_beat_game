# Live Chinese Translator 🎙️🇨🇳➡️🇺🇸

A simple tool that listens to Chinese speech and translates it to English in real-time.

## 👋 Start Here: What do I need?

To run this on your computer, you only need one piece of free software called **Node.js**.

### Step 1: Install the "Engine" (Node.js)
1.  Go to the official website: [https://nodejs.org/](https://nodejs.org/)
2.  Download the **"LTS"** version (Long Term Support) for your computer (Windows or macOS).
3.  Run the installer and click "Next" through the setup. You don't need to change any settings.

---

## 🚀 How to Run the App

Once Node.js is installed, follow these steps to start the translator.

### 1. Open your Terminal
-   **On Mac**: Press `Command + Space`, type `Terminal`, and hit Enter.
-   **On Windows**: Press `Windows Key`, type `PowerShell`, and hit Enter.

### 2. Go to the project folder
Typing `cd` means "Change Directory". You need to tell the computer where you downloaded this folder.
-   Type `cd` followed by a space.
-   **Drag and drop** the `chinese_beat_game` folder from your Finder/Explorer right into the Terminal window. It will automatically paste the correct path.
-   Hit **Enter**.

### 3. Install the parts (One time only)
Copy and paste this command into the terminal and hit **Enter**:
```bash
npm install
```
*You'll see some text scrolling by. Wait until it stops.*

### 4. Start the App!
Copy and paste this command and hit **Enter**:
```bash
npm run dev
```

### 5. Open it in your Browser
You will see a link in the terminal that looks like: `http://localhost:5173/`
-   Hold `Command` (Mac) or `Ctrl` (Windows) and **click that link**.
-   Or simply open Chrome/Edge and type `http://localhost:5173` in the address bar.

---

## 🎤 Using the Translator
1.  Click the big **"Start Listening"** button.
2.  **Allow Microphone Access** if the browser asks.
3.  Speak Chinese into your microphone.
4.  You will see yellow text (what it hears) turn into green text (English translation)!

## ❓ Troubleshooting
-   **"Microphone off"**: Make sure you clicked "Allow" in the browser popup.
-   **No text appearing?**: Try refreshing the page. Ensure your microphone is selected in your system settings.
-   **"npm is not recognized"**: This means Node.js wasn't installed correctly. Try restarting your computer after installing Node.js.
