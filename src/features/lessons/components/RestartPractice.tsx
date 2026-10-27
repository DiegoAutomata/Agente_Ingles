'use client'

export default function RestartPractice({ isChallenge }: { isChallenge: boolean }) {
  return <button className="btn-primary flex-1 text-center" onClick={() => window.location.assign(isChallenge ? '/challenge' : '/lesson')}>
    {isChallenge ? 'Otro desafío ⚔️' : 'Continuar →'}
  </button>
}
