let germanVoice: SpeechSynthesisVoice | null = null

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? []
  germanVoice = voices.find((v) => v.lang.startsWith('de')) ?? null
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickVoice()
  window.speechSynthesis.addEventListener('voiceschanged', pickVoice)
}

export function speak(text: string, rate = 0.9) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'de-DE'
  utterance.rate = rate
  if (germanVoice) utterance.voice = germanVoice
  window.speechSynthesis.speak(utterance)
}

export function hasGermanVoice() {
  return germanVoice !== null
}
