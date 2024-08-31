import { wetToast } from 'bsdweb'

export default function send(event: string, payload: unknown, callback: (response: unknown) => void = () => {}) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { event, payload }, callback)
    } else wetToast('No active tab found')
  })
}

type Listeners = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (payload: any, sendMessage: (response: any) => void) => void
}

const listeners: Listeners = {}

chrome.runtime.onMessage.addListener(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (request: { event: string; payload: any }, _: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    const { event, payload } = request
    if (!listeners[event]) console.log('No listener found')
    listeners[event](payload, sendResponse)
  }
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function on(event: string, listener: (payload: any, sendMessage: (response: any) => void) => void) {
  listeners[event] = listener
  return () => {
    delete listeners[event]
  }
}
