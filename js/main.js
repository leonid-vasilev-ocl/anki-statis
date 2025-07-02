/**
 * Main entry point for Anki Stats Dashboard
 * Uses proper ES6 imports for Vite
 */

import Chart from 'chart.js/auto';

// Make Chart available globally for the existing code
window.Chart = Chart;

// Import and initialize the application
async function initializeApp() {
    console.log('Starting AnkiStatsApp...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    // Check if elements exist
    const levelChart = document.getElementById('levelChart');
    const deckChart = document.getElementById('deckChart');
    const timelineChart = document.getElementById('timelineChart');
    const heatmapChart = document.getElementById('heatmapChart');
    
    console.log('DOM Elements check:', {
        levelChart: !!levelChart,
        deckChart: !!deckChart,
        timelineChart: !!timelineChart,
        heatmapChart: !!heatmapChart
    });
    
    if (!levelChart || !deckChart || !timelineChart || !heatmapChart) {
        console.error('Chart elements not found in DOM');
        console.log('Available elements with ID:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
        return;
    }
    
    // Initialize the app
    window.app = new AnkiStatsApp();
    await window.app.init();
}

// Start the application
initializeApp().catch(console.error);