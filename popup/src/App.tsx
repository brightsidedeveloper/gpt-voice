import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar'
import { ThemeToggle } from './components/ui/ThemeToggle'
import { tw, wetToast } from 'bsdweb'
import send, { on } from './api/send'
import { Label } from './components/ui/shadcn/ui/label'
import { Switch } from './components/ui/shadcn/ui/switch'
import { atomWithStorage } from 'jotai/utils'
import { useAtom } from 'jotai/react'
import { BrightBaseRealtime, initBrightBase } from 'bsdweb'

initBrightBase(
  'https://ybpjdhzaqaogrojgsjxh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicGpkaHphcWFvZ3JvamdzanhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDYzNzMyOTYsImV4cCI6MjAyMTk0OTI5Nn0.CWTPdwYlV1g6Zif2dKRfVJHK8xwxNhS8gb9Sg3EY4Dg'
)

type Events = {
  'send-files': {
    files: { path: string; content: string }[]
  }
}
const realtime = new BrightBaseRealtime<Events>('chrome-gpt-fire')

const autoSpeakAtom = atomWithStorage('auto-speak', false)
const autoSendAtom = atomWithStorage('auto-send', false)
const autoListenAtom = atomWithStorage('auto-listen', false)
const showInstructionsAtom = atomWithStorage('show-instructions', false)

export default function App() {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeakOn, setAutoSpeakOn] = useAtom(autoSpeakAtom)
  const [autoSendOn, setAutoSendOn] = useAtom(autoSendAtom)
  const [autoListenOn, setAutoListenOn] = useAtom(autoListenAtom)
  const [showInstructions, setShowInstructions] = useAtom(showInstructionsAtom)

  useEffect(() => realtime.subscribe(), [])
  useEffect(() => realtime.on('send-files', (payload) => send('send-files', payload)), [])

  useEffect(() => {
    send('auto-send', autoSendOn)
  }, [autoSendOn])

  useEffect(() => {
    send('auto-listen', autoListenOn)
  }, [autoListenOn])

  useEffect(() => on('turn-auto-speak', (payload) => setAutoSpeakOn(payload)), [setAutoSpeakOn])
  useEffect(() => on('turn-auto-send', (payload) => setAutoSendOn(payload)), [setAutoSendOn])
  useEffect(() => on('turn-auto-listen', (payload) => setAutoListenOn(payload)), [setAutoListenOn])
  useEffect(() => on('turn-auto-commands', (payload) => setShowInstructions(payload)), [setShowInstructions])

  useEffect(() => on('speech-result', (payload) => console.log(payload)), [])

  useEffect(
    () =>
      on('speak', () => {
        wetToast('Speaking Prompt', { icon: '📖' })
        setIsListening(false)
        send('listen', false)
        send('speak', null)
      }),
    []
  )
  useEffect(
    () =>
      on('send', () => {
        wetToast('Sending Prompt', { icon: '📤' })
        send('send', autoSpeakOn)
        setIsListening(false)
        send('listen', false)
      }),
    [autoSpeakOn]
  )
  useEffect(
    () =>
      on('okay', () => {
        wetToast('Listening', { icon: '🎤' })
        send('listen', true)
        setIsListening(true)
      }),
    []
  )
  useEffect(
    () =>
      on('nevermind', () => {
        wetToast('Nevermind', { icon: '👌' })
        setIsListening(false)
        send('listen', false)
      }),
    []
  )

  useEffect(
    () =>
      on('speaking', (payload) => {
        setIsSpeaking(payload)
      }),
    []
  )

  return (
    <div className={tw('max-h-[250px] size-full transition-all duration-500', showInstructions ? 'min-w-[550px]' : 'min-w-[280px]')}>
      <header className="h-12 border-b shadow-sm flex items-center justify-center">
        <div className="px-2 flex items-center justify-between w-full [max-width:1920px]">
          <span className="font-semibold text-xl">Real Chat AI</span>
          <div className="w-fit flex items-center gap-3">
            <ThemeToggle />
            <a
              href="https://github.com/brightsidedeveloper/gpt-voice"
              target="_blank"
              className="size-6 rounded-full overflow-hidden border-border shadow-md"
            >
              <Avatar>
                <AvatarImage src="https://github.com/brightsidedeveloper.png" alt="name" />
                <AvatarFallback>NAME</AvatarFallback>
              </Avatar>
            </a>
          </div>
        </div>
      </header>
      <div className="p-6 w-full flex justify-between items-center gap-4 @container">
        <div className="w-[200px] flex justify-center items-center flex-col gap-3">
          <div
            className={tw(
              'flex justify-between items-center gap-2 transition-all duration-500',
              showInstructions ? 'min-w-full' : 'min-w-[105%] translate-x-[8px]'
            )}
          >
            <Label>Auto Send:</Label>
            <Switch checked={autoSendOn} onCheckedChange={() => setAutoSendOn((curr) => !curr)} />
          </div>
          <div
            className={tw(
              'flex justify-between items-center gap-2 transition-all duration-500',
              showInstructions ? 'min-w-full' : 'min-w-[105%] translate-x-[8px]'
            )}
          >
            <Label>Auto Speak:</Label>
            <Switch checked={autoSpeakOn} onCheckedChange={() => setAutoSpeakOn((curr) => !curr)} />
          </div>
          <div
            className={tw(
              'flex justify-between items-center gap-2 transition-all duration-500',
              showInstructions ? 'min-w-full' : 'min-w-[105%] translate-x-[8px]'
            )}
          >
            <Label>Auto Listen:</Label>
            <Switch checked={autoListenOn} onCheckedChange={() => setAutoListenOn((curr) => !curr)} />
          </div>
          <div
            className={tw(
              'flex justify-between items-center gap-2 transition-all duration-500',
              showInstructions ? 'min-w-full' : 'min-w-[105%] translate-x-[8px]'
            )}
          >
            <Label>Commands:</Label>
            <Switch checked={showInstructions} onCheckedChange={() => setShowInstructions((curr) => !curr)} />
          </div>
        </div>
        <div
          className={tw(
            'flex justify-center flex-col gap-1.5 w-full text-left transition-all duration-500 overflow-hidden [&_p]:whitespace-nowrap translate-x-[8px]',
            showInstructions ? 'max-w-[250px]' : 'max-w-0'
          )}
        >
          <p>"Turn [on/off] [send/speak/listen/commands]"</p>
          <p>"Speak" - Will speak the last response</p>
          <p>"Listen" - Will activate auto type</p>
          <p>"Nevermind" - Will clear and stop listening</p>
          <p>"Stop" - Stops generating or speech</p>
        </div>
      </div>
      <div className="w-full flex justify-center items-center">
        <p
          className={tw(
            'text-lg transition-colors',
            isSpeaking ? 'animate-bounce text-fuchsia-500' : isListening ? 'text-green-500 animate-pulse' : 'text-amber-500'
          )}
        >
          {isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'On Standby'}
        </p>
      </div>
      <a
        href="https://brightsidedevelopers.com"
        target="_blank"
        className="py-2 block underline text-foreground/50 text-[10px] mt-auto w-full text-center"
      >
        BrightSide Developers
      </a>
    </div>
  )
}
