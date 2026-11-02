# Module tracker

Status as of 2026-11-02 (branch `rowan`). We need **14 points**: Major = 2, Minor = 1.

Only modules that are done or started are tagged. Everything else has nothing in the repo yet.

| Tag | Meaning |
|---|---|
| ✅ **FULLY** | In the code on our branch |
| 🟡 **PARTLY** | Started, stubbed, or only on an unmerged branch |

## Summary

| Module | Type | Status |
|---|---|---|
| Frontend + backend framework | Major | ✅ FULLY |
| WebSockets | Major | ✅ FULLY |
| Complete web game | Major | ✅ FULLY |
| Multiplayer (3+ players) | Major | ✅ FULLY |
| User interaction (chat, profile, friends) | Major | 🟡 PARTLY |
| Standard user management | Major | 🟡 PARTLY |
| Remote players | Major | 🟡 PARTLY |
| ORM | Minor | 🟡 PARTLY |
| Game statistics and match history | Minor | 🟡 PARTLY |

---

## IV.1 Web

### ✅ Major: Use a framework for both the frontend and backend
> Angular 22 + NestJS 11.

- Use a frontend framework (React, Vue, Angular, Svelte, etc.).
- Use a backend framework (Express, NestJS, Django, Flask, Ruby on Rails, etc.).
- Full-stack frameworks (Next.js, Nuxt.js, SvelteKit) count as both if you use both their frontend and backend capabilities.

### Minor: Use a frontend framework (React, Vue, Angular, Svelte, etc.)
> Already counted by the major framework module above. Cannot be claimed separately.

### Minor: Use a backend framework (Express, Fastify, NestJS, Django, etc.)
> Already counted by the major framework module above. Cannot be claimed separately.

### ✅ Major: Implement real-time features using WebSockets or similar technology
> Socket.IO gateway, room broadcast, disconnect cleanup. Reconnection is not handled yet.

- Real-time updates across clients.
- Handle connection/disconnection gracefully.
- Efficient message broadcasting.

### 🟡 Major: Allow users to interact with other users
> Profile page exists but shows fake data. No chat, no friends system.

The minimum requirements are:

- A basic chat system (send/receive messages between users).
- A profile system (view user information).
- A friends system (add/remove friends, see friends list).

### Major: A public API to interact with the database

With a secured API key, rate limiting, documentation, and at least 5 endpoints:

- `GET /api/{something}`
- `POST /api/{something}`
- `PUT /api/{something}`
- `DELETE /api/{something}`

### 🟡 Minor: Use an ORM for the database
> Drizzle + Postgres only on `origin/feat/auth-drizzle-repositories`, not merged yet.

### Minor: A complete notification system for all creation, update, and deletion actions

### Minor: Real-time collaborative features
Shared workspaces, live editing, collaborative drawing, etc.

### Minor: Server-Side Rendering (SSR) for improved performance and SEO

### Minor: Progressive Web App (PWA) with offline support and installability

### Minor: Custom-made design system with reusable components
Including a proper color palette, typography, and icons (minimum: 10 reusable components).

### Minor: Implement advanced search functionality with filters, sorting, and pagination

### Minor: File upload and management system

- Support multiple file types (images, documents, etc.).
- Client-side and server-side validation (type, size, format).
- Secure file storage with proper access control.
- File preview functionality where applicable.
- Progress indicators for uploads.
- Ability to delete uploaded files.

---

## IV.2 Accessibility and Internationalization

### Major: Complete accessibility compliance (WCAG 2.1 AA)
With screen reader support, keyboard navigation, and assistive technologies.

### Minor: Support for multiple languages (at least 3 languages)

- Implement i18n (internationalization) system.
- At least 3 complete language translations.
- Language switcher in the UI.
- All user-facing text must be translatable.

### Minor: Right-to-left (RTL) language support

- Support for at least one RTL language (Arabic, Hebrew, etc.).
- Complete layout mirroring (not just text direction).
- RTL-specific UI adjustments where needed.
- Seamless switching between LTR and RTL.

### Minor: Support for additional browsers

- Full compatibility with at least 2 additional browsers (Firefox, Safari, Edge, etc.).
- Test and fix all features in each browser.
- Document any browser-specific limitations.
- Consistent UI/UX across all supported browsers.

---

## IV.3 User Management

### 🟡 Major: Standard user management and authentication
> Login/register pages exist but `AuthService` is a fake (any email + `password`). No backend auth endpoints on `main`, no avatar upload, no friends.

- Users can update their profile information.
- Users can upload an avatar (with a default avatar if none provided).
- Users can add other users as friends and see their online status.
- Users have a profile page displaying their information.

### 🟡 Minor: Game statistics and match history
> `StatsService` returns hardcoded data. No real stats, match history, achievements or leaderboard.

- Track user game statistics (wins, losses, ranking, level, etc.).
- Display match history (1v1 games, dates, results, opponents).
- Show achievements and progression.
- Leaderboard integration.

**Requires a functional game** (see IV.6). You cannot claim this module without one.

### Minor: Remote authentication with OAuth 2.0 (Google, GitHub, 42, etc.)

### Major: Advanced permissions system

- View, edit, and delete users (CRUD).
- Roles management (admin, user, guest, moderator, etc.).
- Different views and actions based on user role.

### Major: An organization system

- Create, edit, and delete organizations.
- Add users to organizations.
- Remove users from organizations.
- View organizations and allow users to perform specific actions within an organization (minimum: create, read, update).

### Minor: A complete 2FA (Two-Factor Authentication) system for the users

### Minor: User activity analytics and insights dashboard

---

## IV.4 Artificial Intelligence

### Major: Introduce an AI Opponent for games

- The AI must be challenging and able to win occasionally.
- The AI should simulate human-like behavior (not perfect play).
- If you implement game customization options, the AI must be able to use them.
- You must be able to explain your AI implementation during evaluation.

**Requires a game.** The AI must be able to play your game competently.

### Major: Implement a complete RAG (Retrieval-Augmented Generation) system

- Interact with a large dataset of information.
- Users can ask questions and get relevant answers.
- Implement proper context retrieval and response generation.

### Major: Implement a complete LLM system interface

- Generate text and/or images based on user input.
- Handle streaming responses properly.
- Implement error handling and rate limiting.

### Major: Recommendation system using machine learning

- Personalized recommendations based on user behavior.
- Collaborative filtering or content-based filtering.
- Continuously improve recommendations over time.

### Minor: Content moderation AI
Auto moderation, auto deletion, auto warning, etc.

### Minor: Voice/speech integration for accessibility or interaction

### Minor: Sentiment analysis for user-generated content

### Minor: Image recognition and tagging system

---

## IV.5 Cybersecurity

### Major: WAF/ModSecurity (hardened) + HashiCorp Vault for secrets

- Configure strict ModSecurity/WAF.
- Manage secrets in Vault (API keys, credentials, environment variables), encrypted and isolated.

---

## IV.6 Gaming and user experience

### ✅ Major: Implement a complete web-based game where users can play against each other
> agar.io clone with server-authoritative rooms and Pixi rendering. Win/loss conditions not verified.

- The game can be real-time multiplayer (e.g., Pong, Chess, Tic-Tac-Toe, Card games, etc.).
- Players must be able to play live matches.
- The game must have clear rules and win/loss conditions.
- The game can be 2D or 3D.

### 🟡 Major: Remote players
> Remote play works over Socket.IO. No reconnection logic or latency handling.

Enable two players on separate computers to play the same game in real-time.

- Handle network latency and disconnections gracefully.
- Provide a smooth user experience for remote gameplay.
- Implement reconnection logic.

### ✅ Major: Multiplayer game (more than two players)
> Room capacity defaults to 10 (`ROOM_CAPACITY`).

- Support for three or more players simultaneously.
- Fair gameplay mechanics for all participants.
- Proper synchronization across all clients.

**Requires a game.** You are extending your game to support three or more players.

### Major: Add another game with user history and matchmaking

- Implement a second distinct game.
- Track user history and statistics for this game.
- Implement a matchmaking system.
- Maintain performance and responsiveness.

**Requires a first game.** You cannot claim this module without a functional first game.

### Major: Implement advanced 3D graphics using a library like Three.js or Babylon.js

- Create an immersive 3D environment.
- Implement advanced rendering techniques.
- Ensure smooth performance and user interaction.

### Minor: Advanced chat features
Enhances the basic chat from the "Allow users to interact" module.

- Ability to block users from messaging you.
- Invite users to play games directly from chat.
- Game/tournament notifications in chat.
- Access to user profiles from chat interface.
- Chat history persistence.
- Typing indicators and read receipts.

**Requires the basic chat first.**

### Minor: Implement a tournament system

- Clear matchup order and bracket system.
- Track who plays against whom.
- Matchmaking system for tournament participants.
- Tournament registration and management.

**Requires a game.**

### Minor: Game customization options

- Power-ups, attacks, or special abilities.
- Different maps or themes.
- Customizable game settings.
- Default options must be available.

**Requires a game.** You are adding customization to an existing game.

### Minor: A gamification system to reward users for their actions

- Implement at least 3 of the following: achievements, badges, leaderboards, XP/level system, daily challenges, rewards.
- System must be persistent (stored in database).
- Visual feedback for users (notifications, progress bars, etc.).
- Clear rules and progression mechanics.

Focus on quality over quantity: three well-implemented features are better than six poorly done ones.

### Minor: Implement spectator mode for games

- Allow users to watch ongoing games.
- Real-time updates for spectators.
- Optional: spectator chat.

**Requires a game.** Spectators need a game to watch.

---

## IV.7 DevOps

### Major: Infrastructure for log management using ELK (Elasticsearch, Logstash, Kibana)

- Elasticsearch to store and index logs.
- Logstash to collect and transform logs.
- Kibana for visualization and dashboards.
- Implement log retention and archiving policies.
- Secure access to all components.

### Major: Monitoring system with Prometheus and Grafana

- Set up Prometheus to collect metrics.
- Configure exporters and integrations.
- Create custom Grafana dashboards.
- Set up alerting rules.
- Secure access to Grafana.

### Major: Backend as microservices

- Design loosely-coupled services with clear interfaces.
- Use REST APIs or message queues for communication.
- Each service should have a single responsibility.

### Minor: Health check and status page system
With automated backups and disaster recovery procedures.

---

## IV.8 Data and Analytics

### Major: Advanced analytics dashboard with data visualization

- Interactive charts and graphs (line, bar, pie, etc.).
- Real-time data updates.
- Export functionality (PDF, CSV, etc.).
- Customizable date ranges and filters.

### Minor: Data export and import functionality

- Export data in multiple formats (JSON, CSV, XML, etc.).
- Import data with validation.
- Bulk operations support.

### Minor: GDPR compliance features

- Allow users to request their data.
- Data deletion with confirmation.
- Export user data in a readable format.
- Confirmation emails for data operations.

---

## IV.9 Blockchain

### Major: Store tournament scores on the Blockchain

- Use Avalanche and Solidity smart contracts on a test blockchain.
- Implement smart contracts to record, manage, and retrieve tournament scores.
- Ensure data integrity and immutability.

### Minor: Use ICP (Internet Computer Protocol) for a backend that runs on a blockchain
Incompatible with SSR.

---

## IV.10 Modules of choice

### Major: Implement a custom module that is not listed above

- The module must be substantial and demonstrate technical complexity.
- You must provide proper justification in `README.md` explaining:
  - Why you chose this module.
  - What technical challenges it addresses.
  - How it adds value to your project.
  - Why it deserves Major module status (2 points).
- Taking shortcuts or implementing trivial features will result in rejection.
- Be creative and think outside the box.
- The module should be relevant to your project context.

### Minor: Same as the major module but smaller in scope and less complexity

- Must still demonstrate technical skill and creativity.
- Should add meaningful value to your project.
- Requires justification in `README.md` (similar to Major, but for 1 point).
