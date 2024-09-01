"use strict";
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
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
let autoSpeakOn = false;
let autoSendOn = false;
let autoListenOn = false;
// Check if the browser supports SpeechRecognition
// @ts-ignore
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
recognition.onend = () => {
    console.log('Speech recognition stopped, restarting...');
    startRecognition();
};
const debouncedSendMessage = debounce(() => {
    chrome.runtime.sendMessage({ event: 'send', payload: autoSpeakOn });
}, 300);
// Handle recognition results
// @ts-ignore
recognition.onresult = (event) => {
    const lastIndex = event.results.length - 1;
    // Get the transcript from the latest result
    const transcript = event.results[lastIndex][0].transcript;
    console.log('Transcript:', transcript);
    // Send the recognized text to the background or popup
    const commands = ['send', 'speak', 'listen', 'nevermind', 'never mind', 'stop'];
    const compoundCommands = [
        ['turn', 'speak', 'on'],
        ['turn', 'speak', 'off'],
        ['turn', 'send', 'on'],
        ['turn', 'send', 'off'],
        ['turn', 'listen', 'on'],
        ['turn', 'listen', 'off'],
        ['turn', 'commands', 'on'],
        ['turn', 'commands', 'off'],
    ];
    if (listening &&
        !commands.some((command) => transcript.toLowerCase().includes(command.toLowerCase())) &&
        !compoundCommands.some((compound) => compound.every((part) => transcript.toLowerCase().includes(part)))) {
        chrome.runtime.sendMessage({ event: 'speech-result', payload: transcript });
        appendTextArea(transcript);
    }
    else {
        const compound = compoundCommands.find((compound) => compound.every((part) => transcript.toLowerCase().includes(part)));
        if (compound) {
            const [_, command, on] = compound;
            chrome.runtime.sendMessage({ event: `turn-auto-${command}`, payload: on === 'on' });
        }
        else if (transcript.toLowerCase().includes('nevermind') || transcript.toLowerCase().includes('never mind')) {
            chrome.runtime.sendMessage({ event: 'nevermind', payload: null });
            const textarea = document.getElementById('prompt-textarea');
            if (textarea) {
                textarea.value = '';
                const event = new Event('input', { bubbles: true });
                textarea.dispatchEvent(event);
            }
        }
        else {
            if (transcript.toLowerCase().includes('listen')) {
                chrome.runtime.sendMessage({ event: 'okay', payload: null });
            }
            if (transcript.toLowerCase().includes('speak')) {
                setTimeout(() => {
                    chrome.runtime.sendMessage({ event: 'speak', payload: null });
                });
            }
            if (transcript.toLowerCase().includes('send')) {
                setTimeout(() => {
                    chrome.runtime.sendMessage({ event: 'send', payload: autoSpeakOn });
                });
            }
            if (transcript.toLowerCase().includes('stop')) {
                const button = document.querySelector('button[aria-label="Stop streaming"]');
                const button2 = document.querySelector('button[aria-label="Stop"]');
                if (button)
                    button.click();
                if (button2)
                    button2.click();
            }
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
function speak() {
    const btns = Array.from(document.querySelectorAll('button[aria-label="Read Aloud"]'));
    const button = btns[btns.length - 1];
    if (button)
        button.click();
    speaking = true;
    chrome.runtime.sendMessage({ event: 'speaking', payload: true });
    setTimeout(() => {
        const i = setInterval(() => {
            const badButton = document.querySelector('button[aria-label="Stop"]');
            if (badButton)
                return;
            speaking = false;
            chrome.runtime.sendMessage({ event: 'speaking', payload: false });
            clearInterval(i);
            if (autoListenOn) {
                recognition.abort();
                setTimeout(() => {
                    chrome.runtime.sendMessage({ event: 'okay', payload: null });
                }, 100);
            }
        }, 100);
    }, 1500);
}
on('listen', (bool) => {
    listening = bool;
    console.log('Listening:', bool);
});
on('auto-listen', (bool) => {
    autoListenOn = bool;
    console.log('Auto-Listen:', bool);
});
on('auto-send', (autoSend) => {
    autoSendOn = autoSend;
    console.log('Auto-sending:', autoSend);
});
function send() {
    const button = document.querySelector('button[data-testid="send-button"]');
    if (button)
        button.click();
    if (!autoSpeakOn)
        return;
    setTimeout(() => {
        const i = setInterval(() => {
            const badButton = document.querySelector('button[aria-label="Stop streaming"]');
            if (badButton)
                return;
            clearInterval(i);
            setTimeout(() => {
                chrome.runtime.sendMessage({ event: 'speak', payload: null });
            }, 100);
        }, 100);
    }, 1500);
}
on('send', (autoSpeak) => {
    autoSpeakOn = autoSpeak;
    console.log('Sending prompt...');
    send();
});
let speaking = false;
on('speak', () => {
    console.log('Speaking response...');
    speak();
});
function appendTextArea(text) {
    const textarea = document.getElementById('prompt-textarea');
    if (textarea) {
        textarea.value = textarea.value.trim() + ' ' + text.trim();
        const event = new Event('input', { bubbles: true });
        textarea.dispatchEvent(event);
        if (autoSendOn)
            debouncedSendMessage();
    }
}
on('send-files', ({ files }) => {
    console.log('Received files:', files);
    files.forEach(({ path, content }) => {
        appendTextArea('The following file content is in this path `' + path + '`');
        appendTextArea('```' + content + '```');
    });
});
on('send-files-with-query', ({ files, query }) => {
    console.log('Received files:', files);
    files.forEach(({ path, content }) => {
        appendTextArea('The following file content is in this path `' + path + '`');
        appendTextArea('```' + content + '```');
        appendTextArea(query);
    });
    debouncedSendMessage();
});
on('send-selection', ({ code }) => {
    console.log('Received selection:', code);
    appendTextArea('```' + code + '```');
});
on('send-selection-with-query', ({ code, query }) => {
    console.log('Received selection:', code, query);
    appendTextArea('```' + code + '```');
    appendTextArea(query);
    debouncedSendMessage();
});
