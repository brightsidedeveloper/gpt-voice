"use strict";
const listeners = {};
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    const { event, payload } = request;
    if (!listeners[event])
        return sendResponse('No listener found');
    listeners[event](payload, sendResponse);
});
function on(event, listener) {
    listeners[event] = listener;
    return () => delete listeners[event];
}
let listening = false;
on('listen', (bool) => {
    listening = bool;
    console.log('Listening:', bool);
});
on('send', () => {
    console.log('Sending prompt...');
    const button = document.querySelector('button[data-testid="send-button"]');
    if (button)
        button.click();
});
on('read', () => {
    console.log('Reading prompt...');
    const btns = Array.from(document.querySelectorAll('button[aria-label="Read Aloud"]'));
    const button = btns[btns.length - 1];
    if (button)
        button.click();
});
// Check if the browser supports SpeechRecognition
// @ts-ignore
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    // Create a new instance of SpeechRecognition
    const recognition = new SpeechRecognition();
    // Configure recognition settings
    recognition.lang = 'en-US'; // Set language
    recognition.interimResults = false; // Get final results only
    recognition.continuous = true; // Stop after one result
    // Start recognition on button click or another trigger
    const startRecognition = () => {
        recognition.start();
    };
    // Handle recognition results
    // @ts-ignore
    recognition.onresult = (event) => {
        const lastIndex = event.results.length - 1;
        // Get the transcript from the latest result
        const transcript = event.results[lastIndex][0].transcript;
        console.log('Transcript:', transcript);
        // Send the recognized text to the background or popup
        const commands = ['send', 'read', 'GPT', 'nevermind', 'never mind'];
        if (listening && !commands.some((command) => transcript.toLowerCase().includes(command.toLowerCase()))) {
            chrome.runtime.sendMessage({ event: 'speech-result', payload: transcript });
            const textarea = document.getElementById('prompt-textarea');
            if (textarea) {
                textarea.value = textarea.value.trim() + ' ' + transcript.trim();
                const event = new Event('input', { bubbles: true });
                textarea.dispatchEvent(event);
            }
        }
        else {
            if (transcript.toLowerCase().includes('nevermind') || transcript.toLowerCase().includes('never mind')) {
                chrome.runtime.sendMessage({ event: 'nevermind', payload: null });
            }
            else if (transcript.toLowerCase().includes('gpt')) {
                chrome.runtime.sendMessage({ event: 'okay', payload: null });
            }
            else if (transcript.toLowerCase().includes('read')) {
                setTimeout(() => {
                    chrome.runtime.sendMessage({ event: 'read', payload: null });
                });
            }
            else if (transcript.toLowerCase().includes('send')) {
                setTimeout(() => {
                    chrome.runtime.sendMessage({ event: 'send', payload: null });
                });
            }
        }
    };
    // Handle errors
    // @ts-ignore
    recognition.onerror = (event) => {
        if (listening)
            console.error('Speech recognition error:', event.error);
    };
    // Trigger recognition
    startRecognition();
}
else {
    console.error('SpeechRecognition not supported in this browser.');
}
console.log('Injection script loaded!');
