// src/utils/streaks.js

const LAST_READ_KEY = 'tracker_last_read_date';
const CURRENT_STREAK_KEY = 'tracker_current_streak';
const MAX_STREAK_KEY = 'tracker_max_streak';

export const recordReadingDay = () => {
    const today = new Date().toDateString();
    const lastRead = localStorage.getItem(LAST_READ_KEY);
    
    // If they already read today, do nothing
    if (lastRead === today) return;

    let currentStreak = parseInt(localStorage.getItem(CURRENT_STREAK_KEY) || '0', 10);
    let maxStreak = parseInt(localStorage.getItem(MAX_STREAK_KEY) || '0', 10);

    if (lastRead) {
        const lastReadDate = new Date(lastRead);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastReadDate.toDateString() === yesterday.toDateString()) {
            // Read yesterday! Increment streak.
            currentStreak += 1;
        } else {
            // Missed a day. Reset streak to 1.
            currentStreak = 1;
        }
    } else {
        // First time reading ever
        currentStreak = 1;
    }

    if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        localStorage.setItem(MAX_STREAK_KEY, maxStreak.toString());
    }

    localStorage.setItem(CURRENT_STREAK_KEY, currentStreak.toString());
    localStorage.setItem(LAST_READ_KEY, today);
};

export const getStreakData = () => {
    const today = new Date().toDateString();
    const lastRead = localStorage.getItem(LAST_READ_KEY);
    let currentStreak = parseInt(localStorage.getItem(CURRENT_STREAK_KEY) || '0', 10);
    const maxStreak = parseInt(localStorage.getItem(MAX_STREAK_KEY) || '0', 10);

    // If they missed yesterday, their current streak is actually 0 right now,
    // until they read today.
    if (lastRead) {
        const lastReadDate = new Date(lastRead);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastRead !== today && lastReadDate < yesterday) {
            currentStreak = 0;
            // Note: we don't save the 0 to localStorage yet because they might not read today at all.
            // If they read today, it will save as 1.
        }
    }

    return {
        currentStreak,
        maxStreak,
        readToday: lastRead === today
    };
};
