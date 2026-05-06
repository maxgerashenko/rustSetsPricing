import { useState, useEffect } from 'react'
import styles from './app.module.css'
import InputView from './views/input_view/input_view.jsx'
import ListView from './views/list_view/list_view.jsx'

export default function App() {
  const [list, setList] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const setHash = params.get('set')
    const loc = params.get('loc') || 'eng'

    if (setHash) {
      fetch(`/api/sets/${setHash}?loc=${loc}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.items) {
            setList(data.items.join('\n'))
          }
        })
        .catch(() => {})
    }
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <span className={styles.tag}>
          <span className={styles.tagDot} />
          Junkpile · Skin Pricer
        </span>
        <h1 className={styles.headline}>
          Price your
          <span className={styles.accent}>skin set</span>
        </h1>

        {list
          ? <ListView rawList={list} onBack={() => setList(null)} />
          : <InputView onSubmit={setList} />
        }
      </div>
    </div>
  )
}
