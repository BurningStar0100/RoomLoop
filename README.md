# RoomLoop – The Drop-In Events & Micro-Meetup Platform

RoomLoop is a casual, presence-first coordination tool designed to make quick virtual events and micro-meetups effortless. No links buried in chats or bloated calendar invites — just create a temporary room with a vibe and time, invite friends or open it publicly, and people can drop in to chat.

---

## 🚀 Project Overview

RoomLoop enables users to create and join scheduled virtual rooms for focused collaboration, casual hangouts, or spontaneous sessions. It’s not a video call app — instead, it focuses on presence and asynchronous-friendly interaction through text chat and reactions.

---

## 🎯 Features

### 1. Room Creation
- Create rooms with:
  - Title (e.g., Friday Night Doodles)
  - Description
  - Room Type: Private or Public
  - Time Window (start and end time)
  - Max Participants (optional)
  - Tags (Hangout, Work, Brainstorm, Wellness, etc.)
- Automatic room status transitions:
  - Scheduled → Live → Closed

### 2. Invitations & Access
- Private rooms: Invite users via username or email
- Public rooms: Open to anyone on the explore page
- Invitations appear in user dashboard or notifications
- Access control scoped by:
  - Room creator
  - Invited users
  - Public access for open rooms
- Room access only valid during active time window

### 3. Join & Interact in Live Rooms
- View current participants
- Text-based chat with ephemeral or thread-style messaging
- React with emojis
- View pinned ideas or shared topics
- Leave anytime
- No audio or video calls to keep it minimal and async-friendly

### 4. Room History & Stats
- Dashboard displays all created/joined rooms
- Shows status, timing, participants, and outcomes
- Past rooms remain viewable but closed to joining

### 5. Explore Public Rooms
- Browse currently live public rooms
- Filter by tag or status (Live, Starting Soon)
- See trending rooms based on participation
- Join open slots if available

---

## 🛠 Tech Stack

- *Frontend:* React
- *Backend:* Node.js + Express
- *Database:* MongoDB
- *Authentication:* JWT 
- *Hosting:* Vercel  (frontend),  Render  (backend)

---

## 🔐 Authentication & Authorization

- Secure signup/login using email or username
- Authorization checks for room access based on role and invitations
- Access allowed only during the room’s scheduled time window

---

## 🎨 UI/UX Highlights

- Minimalist, mobile-friendly design with casual, creative vibes
- Room cards with intuitive color-coded status badges
- Countdown timers for rooms about to go live
- Simple and clean interface for seamless quick access

---
