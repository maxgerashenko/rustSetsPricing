import { Routes, Route, useNavigate, useSearchParams, useLocation, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import styles from './app.module.css'
import InputView from './views/input_view/input_view.jsx'
import ListView from './views/list_view/list_view.jsx'
import SetsList from './views/sets_list/sets_list.jsx'

function ListViewPage() {
  const [list, setList] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // Check if list was passed via state (from input form submission)
    if (location.state?.list) {
      setList(location.state.list)
      setLoading(false)
      return
    }

    // Otherwise, try to load from set hash parameter
    const setHash = searchParams.get('set')
    const loc = searchParams.get('loc') || 'eng'

    if (setHash) {
      fetch(`/api/sets/${setHash}?loc=${loc}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.items) {
            setList(data.items.join('\n'))
          } else {
            setList('')
          }
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
        })
    } else {
      setList('')
      setLoading(false)
    }
  }, [location.state, searchParams])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <ListView
      rawList={list}
      onBack={() => navigate('/')}
    />
  )
}

export default function App() {
  const navigate = useNavigate()

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

        <Routes>
          <Route
            path="/"
            element={
              <InputView
                onSubmit={(list) => {
                  navigate('/list', { state: { list } })
                }}
                onViewSets={() => navigate('/sets')}
              />
            }
          />
          <Route
            path="/list"
            element={<ListViewPage />}
          />
          <Route
            path="/sets"
            element={<SetsList onBack={() => navigate('/')} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}
