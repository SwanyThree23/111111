# SeeWhy Live SPA

A premium, neon-styled, high-performance streaming and gaming dashboard application built dynamically for the **SeeWhy Live** brand.

## 🚀 Tech Stack

* **Core Framework**: React 18, Vite, TypeScript
* **Routing**: React Router DOM v6
* **Design System**: Custom CSS Variables, Glassmorphism, Neon Modularity
* **Icons**: Lucide React
* **Real-time (Ready)**: Socket.io-client integrated for Chat Sidebar

## 🛠️ Getting Started

To launch the project locally, run the following commands:

```bash
# 1. Install Dependencies
npm install

# 2. Run the Development Server
npm run dev
```

## ✨ Quick Features Overview

* **Dynamic SPA Routing**: Seamless transitions between the `Home`, `Stream View`, `Library`, and `Settings` dashboards.
* **Stream Hub**: Simulated dashboard rendering live metrics, gaming tags, and streamer details.
* **Component-ready Chat**: Interactive mock chat interface that autoscrolls and accepts mock inputs, prepped for backend Socket.io injections.
* **AI-Generated Artifacts**: Custom-generated cyberpunk streaming thumbnails and profile avatars uniquely crafted for realistic demonstration without relying on generic external placeholders.

## 📁 Architecture

* `src/pages/Home.tsx` - Main discover / explore layout
* `src/pages/StreamView.tsx` - Live player container and Socket chat
* `src/pages/Library.tsx` - Saved stream history module
* `src/pages/Settings.tsx` - Custom mock form profile configurations
* `src/index.css` - Atomic level, global modern styling system
