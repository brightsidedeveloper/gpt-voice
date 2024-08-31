import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar'
import { ThemeToggle } from './components/ui/ThemeToggle'
import { tw, wetToast } from 'bsdweb'
import send, { on } from './api/send'
import { Button } from './components/ui/shadcn/ui/button'
import { Label } from './components/ui/shadcn/ui/label'
import { Switch } from './components/ui/shadcn/ui/switch'

export default function App() {
  const [isListening, setIsListening] = useState(false)
  const [autoReadOn, setAutoReadOn] = useState(false)
  const [autoSendOn, setAutoSendOn] = useState(false)

  const handleButtonClick = async () => {
    send('listen', !isListening)
    setIsListening(!isListening)
  }

  useEffect(() => {
    send('auto-send', autoSendOn)
  }, [autoSendOn])

  const sendMessage = () => send('send', null)

  useEffect(() => on('speech-result', (payload) => console.log(payload)), [])

  useEffect(
    () =>
      on('read', () => {
        wetToast('Reading Prompt', { icon: '📖' })
        setIsListening(false)
        send('listen', false)
        send('read', null)
      }),
    []
  )
  useEffect(
    () =>
      on('send', () => {
        wetToast('Sending Prompt', { icon: '📤' })
        send('send', autoReadOn)
      }),
    [autoReadOn]
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

  return (
    <div className="min-w-[300px] min-h-[475px] size-full">
      <header className="h-12 border-b shadow-sm flex items-center justify-center">
        <div className="px-2 flex items-center justify-between w-full [max-width:1920px]">
          <span className="font-semibold text-xl">GPT Voice Mode</span>
          <div className="w-fit flex items-center gap-3">
            <ThemeToggle />
            <Avatar className="size-6 rounded-full overflow-hidden">
              <AvatarImage src="https://github.com/brightsidedeveloper.png" alt="name" />
              <AvatarFallback>NAME</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
      <div className="p-10 pt-5 w-full flex justify-center items-center flex-col gap-4 @container">
        <div className="flex justify-end items-center gap-2">
          <Label>Auto Send:</Label>
          <Switch checked={autoSendOn} onCheckedChange={() => setAutoSendOn((curr) => !curr)} />
        </div>
        <div className="flex justify-end items-center gap-2">
          <Label>Auto Read:</Label>
          <Switch checked={autoReadOn} onCheckedChange={() => setAutoReadOn((curr) => !curr)} />
        </div>
        <button
          onClick={handleButtonClick}
          className={tw(
            'my-2 p-8 rounded-full border transition-colors duration-300 shadow-md dark:shadow-xl w-full aspect-square',
            isListening ? 'bg-red-500' : 'bg-primary'
          )}
        ></button>
        <div className="flex gap-4 item-center">
          <Button onClick={sendMessage}>Send</Button>
          <Button onClick={() => send('read', null)}>Read</Button>
        </div>
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
