<p align="center">
  <img src="https://user-images.githubusercontent.com/your-logo-here.png" width="120" alt="PDF Editor Logo"/>
</p>

<h1 align="center" style="font-size:3.2rem; font-weight:900; background: linear-gradient(90deg,#9d4edd,#6a11cb,#5f5fff); color:transparent; -webkit-background-clip:text; background-clip:text; text-shadow:0 4px 32px #9d4edd55; letter-spacing:2px;">
  🚀 PDF Editor <span style="font-size:2.2rem;">(React)</span>
</h1>

<p align="center" style="font-size:1.2rem; color:#6c2bd7; font-weight:600;">
  <img src="https://img.shields.io/badge/React-18.0+-61dafb?style=for-the-badge&logo=react"/>
  <img src="https://img.shields.io/badge/pdf--lib-%239d4edd?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Glassmorphic%20UI-%236a11cb?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Responsive-Yes-5f5fff?style=for-the-badge"/>
</p>

<p align="center" style="font-size:1.1rem; color:#fff; background:rgba(40,30,70,0.55); border-radius:18px; padding:12px 32px; box-shadow:0 8px 32px #9d4edd55;">
  <b>✨ The Ultimate Modern PDF Editor for the Web ✨</b><br/>
  <i>Upload, reorder, enhance, and download PDFs with a stunning, glassy, futuristic UI.</i>
</p>

---

<div align="center">
  <img src="https://user-images.githubusercontent.com/your-demo-gif-here.gif" width="700" alt="PDF Editor Demo" style="border-radius:18px;box-shadow:0 8px 32px #9d4edd55;"/>
</div>

---

## 🌌 Features at a Glance

<table>
<tr>
  <td>🌈 <b>Glassy, Neon UI</b></td>
  <td>📤 <b>Seamless PDF Upload</b></td>
  <td>🖼️ <b>Live Preview</b></td>
  <td>🧩 <b>Drag-and-Drop Reorder</b></td>
</tr>
<tr>
  <td>🗑️ <b>Delete Pages</b></td>
  <td>🔄 <b>Rotate Pages</b></td>
  <td>🖊️ <b>Text & Highlight Tools</b></td>
  <td>🪄 <b>Enhance (B&W Filter)</b></td>
</tr>
<tr>
  <td>💾 <b>Download PDF</b></td>
  <td>⚡ <b>Instant Feedback</b></td>
  <td>📱 <b>Responsive Design</b></td>
  <td>🎨 <b>Customizable</b></td>
</tr>
</table>

---

## 🛠️ How It Works

- <b>PDF Rendering:</b> [react-pdf](https://github.com/wojtekmaj/react-pdf) for fast, accurate PDF rendering.
- <b>PDF Manipulation:</b> [pdf-lib](https://github.com/Hopding/pdf-lib) for page reordering, rotation, and deletion.
- <b>State Management:</b> All edits are managed in React state for instant feedback.

---

## 🚦 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Open your browser
# Visit http://localhost:5173 (or the port shown in your terminal)
```

---

## 🗂️ Project Structure

```
src/pages/PDF-Editor/editor.jsx      # Main editor logic and UI
src/pages/PDF-Editor/editor.css      # Editor and modal styles
src/pages/PDF-Editor/EditToolbar.jsx # Edit toolbar component
public/pdf.worker.js                 # PDF.js worker for react-pdf
```

---

## 🧑‍💻 Customization

- <b>Add/Remove Tools:</b> Edit <code>EditToolbar.jsx</code> and the toolbar logic in <code>editor.jsx</code>.
- <b>Styling:</b> Tweak <code>editor.css</code> for layout, colors, and modal appearance.

---

## ⚠️ Known Limitations

- Large PDFs may load slowly in the browser.

---

## 🙏 Credits

- [react-pdf](https://github.com/wojtekmaj/react-pdf)
- [pdf-lib](https://github.com/Hopding/pdf-lib)
- [React Icons](https://react-icons.github.io/react-icons/)

---

<p align="center" style="font-size:1.1rem; color:#9d4edd; font-weight:700; letter-spacing:1px;">
  Made with 💜 using React, Vite, and a love for beautiful UIs.<br/>
</p>

