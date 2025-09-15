# ChatFlow

[![Vercel](https://vercelbadge.vercel.app/api/edogola4/chat-flow)](https://chat-flow.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Last Commit](https://img.shields.io/github/last-commit/edogola4/chat-flow)](https://github.com/edogola4/chat-flow/commits/main)
[![GitHub Issues](https://img.shields.io/github/issues/edogola4/chat-flow)](https://github.com/edogola4/chat-flow/issues)
[![GitHub PRs](https://img.shields.io/github/issues-pr/edogola4/chat-flow)](https://github.com/edogola4/chat-flow/pulls)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/edogola4/chat-flow/graphs/commit-activity)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

A modern, real-time chat application built with Angular and WebSockets, featuring end-to-end encrypted messaging, multiple chat rooms, and a responsive design with dark/light theme support.

![ChatFlow Logo](https://via.placeholder.com/150)  <!-- Replace with actual logo -->

## ✨ Features

- **Real-time Messaging**: Instant message delivery using WebSockets
- **User Authentication**: Secure login and registration system
- **Multiple Chat Rooms**: Create and join different chat rooms
- **Online Status**: See who's online in real-time
- **Message History**: View and search through chat history
- **File Sharing**: Share files within conversations
- **Themes**: Switch between light and dark mode
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm (v8 or later) or yarn
- Angular CLI (v19 or later)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/chat-flow.git
   cd chat-flow
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Configure environment variables:
   Create a `src/environments/environment.ts` file based on `environment.example.ts`

4. Start the development server:
   ```bash
   ng serve
   ```

5. Open your browser and navigate to `http://localhost:4200/`

## 🛠 Tech Stack

[![Angular](https://img.shields.io/badge/Angular-19.1.7-DD0031?logo=angular&logoColor=white)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![RxJS](https://img.shields.io/badge/RxJS-7.8.0-B7178C?logo=reactivex&logoColor=white)](https://rxjs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18.16.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Jasmine](https://img.shields.io/badge/Jasmine-4.6.0-8A4182?logo=jasmine&logoColor=white)](https://jasmine.github.io/)
[![Karma](https://img.shields.io/badge/Karma-6.4.0-EB3E3E?logo=karma&logoColor=white)](https://karma-runner.github.io/)

## 🛠 Development

### Project Structure

```
src/
├── app/
│   ├── core/               # Core functionality and services
│   ├── features/           # Feature modules
│   │   ├── auth/           # Authentication
│   │   ├── chat/           # Chat functionality
│   │   └── profile/        # User profiles
│   ├── layouts/            # Layout components
│   └── shared/             # Shared components and utilities
└── assets/                 # Static assets
```

### Available Scripts

- `ng serve` - Start development server
- `ng build` - Build for production
- `ng test` - Run unit tests
- `ng e2e` - Run end-to-end tests
- `ng lint` - Run linter

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Angular](https://angular.io/)
- Real-time functionality powered by [Socket.IO](https://socket.io/)
- Icons from [Material Icons](https://material.io/resources/icons/)
- Styled with [Angular Material](https://material.angular.io/)

---

<div align="center">
  Made with ❤️ by Your Name
</div>
