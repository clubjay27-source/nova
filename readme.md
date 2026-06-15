# Studio Dashboard Clone

A generic, mobile-first dashboard inspired by creator studio apps, built with pure HTML, CSS, and Vanilla JavaScript.

## Features
- **Dashboard**: View channel stats, analytics, and latest videos.
- **Admin Panel**: Edit channel info, update analytics numbers, and manage videos.
- **Offline Capable**: Uses `localStorage` to save all data. No backend required.
- **Responsive**: key mobile-first design (max-width 480px).

## How to Run
1.  Open the folder `c:\Users\King No 1\Desktop\Youtube`.
2.  Double-click `index.html` to open it in your browser.
3.  No server is needed.

## Usage
- **Navigation**: Click the circular profile icon in the top right to go to the **Admin Panel**.
- **Admin**:
    - Change channel name, subscribers, and upload a new logo.
    - Add new videos with thumbnails.
    - Uploaded images are converted to Base64 and saved in your browser's LocalStorage.
- **Reset**: To clear data, scroll to the bottom of the dashboard and click "Reset data".

## Notes
- Images are stored in LocalStorage strings, so keep them under 2MB to avoid hitting storage quotas.
- Default placeholders are provided as SVGs for crisp rendering.
