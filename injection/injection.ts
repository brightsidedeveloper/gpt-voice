type Listeners = {
  [key: string]: (payload: any, sendMessage: (response: any) => void) => void
}

const listeners: Listeners = {}

chrome.runtime.onMessage.addListener(
  (request: { event: string; payload: any }, _: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    const { event, payload } = request
    if (!listeners[event]) return sendResponse('No listener found')
    listeners[event](payload, sendResponse)
  }
)

function on(event: string, listener: (payload: any, sendMessage: (response: any) => void) => void) {
  listeners[event] = listener
  return () => delete listeners[event]
}

let listening = false
let autoReadOn = false
let autoSendOn = false

on('listen', (bool) => {
  listening = bool
  console.log('Listening:', bool)
})

on('auto-send', (autoSend) => {
  autoSendOn = autoSend
  console.log('Auto-sending:', autoSend)
})

on('send', (autoRead) => {
  autoReadOn = autoRead
  console.log('Sending prompt...')
  const button = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement | null
  if (button) button.click()
  if (!autoRead) return
  setTimeout(() => {
    const i = setInterval(() => {
      const badButton = document.querySelector('button[aria-label="Stop streaming"]') as HTMLButtonElement | null
      if (badButton) return
      clearInterval(i)
      setTimeout(() => {
        chrome.runtime.sendMessage({ event: 'read', payload: null })
      }, 100)
    }, 100)
  }, 1500)
})

on('read', () => {
  console.log('Reading prompt...')
  const btns = Array.from(document.querySelectorAll('button[aria-label="Read Aloud"]')) as HTMLButtonElement[]
  const button = btns[btns.length - 1]
  if (button) button.click()
})

// Check if the browser supports SpeechRecognition
// @ts-ignore
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

if (SpeechRecognition) {
  // Create a new instance of SpeechRecognition
  const recognition = new SpeechRecognition()

  // Configure recognition settings
  recognition.lang = 'en-US' // Set language
  recognition.interimResults = false // Get final results only
  recognition.continuous = true // Stop after one result

  // Start recognition on button click or another trigger
  const startRecognition = () => {
    recognition.start()
  }

  // Handle recognition results
  // @ts-ignore
  recognition.onresult = (event) => {
    const lastIndex = event.results.length - 1

    // Get the transcript from the latest result
    const transcript = event.results[lastIndex][0].transcript
    console.log('Transcript:', transcript)
    // Send the recognized text to the background or popup
    const commands = ['send', 'read', 'listen', 'nevermind', 'never mind']

    if (listening && !commands.some((command) => transcript.toLowerCase().includes(command.toLowerCase()))) {
      chrome.runtime.sendMessage({ event: 'speech-result', payload: transcript })
      const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement | null
      if (textarea) {
        textarea.value = textarea.value.trim() + ' ' + transcript.trim()
        const event = new Event('input', { bubbles: true })
        textarea.dispatchEvent(event)
        setTimeout(() => {
          chrome.runtime.sendMessage({ event: 'send', payload: autoReadOn })
        }, 10)
      }
    } else {
      if (transcript.toLowerCase().includes('nevermind') || transcript.toLowerCase().includes('never mind')) {
        chrome.runtime.sendMessage({ event: 'nevermind', payload: null })
        const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement | null
        if (textarea) {
          textarea.value = ''
          const event = new Event('input', { bubbles: true })
          textarea.dispatchEvent(event)
        }
      } else if (transcript.toLowerCase().includes('listen')) {
        chrome.runtime.sendMessage({ event: 'okay', payload: null })
      } else if (transcript.toLowerCase().includes('read')) {
        setTimeout(() => {
          chrome.runtime.sendMessage({ event: 'read', payload: null })
        })
      } else if (transcript.toLowerCase().includes('send')) {
        setTimeout(() => {
          chrome.runtime.sendMessage({ event: 'send', payload: autoReadOn })
        })
      }
    }
  }

  // Handle errors
  // @ts-ignore
  recognition.onerror = (event) => {
    if (listening) console.error('Speech recognition error:', event.error)
  }

  // Trigger recognition
  startRecognition()
} else {
  console.error('SpeechRecognition not supported in this browser.')
}

console.log('Injection script loaded!')
