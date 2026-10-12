import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import QRCode from 'react-qr-code'
import { Html5QrcodeScanner } from 'html5-qrcode'

const api = axios.create({ baseURL: 'http://localhost:8080/api' })
const empty = { name: '', rollNo: '', department: '', section: '', course: '', contact: '', email: '' }

function App() {
  const [loggedIn, setLoggedIn] = useState(sessionStorage.getItem('studentAdmin') === 'yes')
  const [credentials, setCredentials] = useState({ username: 'admin', password: 'admin123' })
  const [students, setStudents] = useState([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState(null)
  const [scanText, setScanText] = useState('')
  const [scannerOn, setScannerOn] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return students.filter(s => [s.name, s.rollNo, s.department, s.section].some(v => (v || '').toLowerCase().includes(q)))
  }, [students, search])

  async function loadStudents() {
    try { const { data } = await api.get('/students'); setStudents(data) }
    catch { setMessage('Could not load students. Check that the backend and MySQL are running.') }
  }

  useEffect(() => { if (loggedIn) loadStudents() }, [loggedIn])

  async function login(e) {
    e.preventDefault()
    try {
      await api.post('/auth/login', credentials)
      sessionStorage.setItem('studentAdmin', 'yes')
      setLoggedIn(true); setMessage('Welcome, administrator.')
    } catch { setMessage('Invalid login. Use admin / admin123 for this demo.') }
  }

  async function saveStudent(e) {
    e.preventDefault()
    try {
      if (editing) await api.put(`/students/${editing}`, form)
      else await api.post('/students', form)
      setMessage(editing ? 'Student record updated.' : 'Student added successfully.')
      setForm(empty); setEditing(null); await loadStudents()
    } catch (err) { setMessage(err.response?.data?.detail || err.response?.data?.message || err.response?.data?.title || 'Save failed. Check required fields and roll number.') }
  }

  function editStudent(s) {
    setEditing(s.id)
    setForm({ name: s.name || '', rollNo: s.rollNo || '', department: s.department || '', section: s.section || '', course: s.course || '', contact: s.contact || '', email: s.email || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteStudent(s) {
    if (!window.confirm(`Delete ${s.name} (${s.rollNo})?`)) return
    try { await api.delete(`/students/${s.id}`); setMessage('Student deleted.'); if (selected?.id === s.id) setSelected(null); await loadStudents() }
    catch { setMessage('Could not delete student.') }
  }

  async function lookupRoll(raw) {
    const value = (raw || '').trim().replace(/^STUDENT_ROLL:/i, '')
    if (!value) { setMessage('Enter or scan a student QR code / roll number.'); return }
    try { const { data } = await api.get(`/students/roll/${encodeURIComponent(value)}`); setSelected(data); setMessage(`Verified student: ${data.name}`) }
    catch { setSelected(null); setMessage(`No student record found for: ${value}`) }
  }

  useEffect(() => {
    if (!loggedIn || !scannerOn) return
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 220, height: 220 } }, false)
    scanner.render(decoded => {
      setScanText(decoded)
      lookupRoll(decoded)
      scanner.clear().catch(() => {})
      setScannerOn(false)
    }, () => {})
    return () => { scanner.clear().catch(() => {}) }
  }, [loggedIn, scannerOn])

  if (!loggedIn) return <main className="login-page">
    <form className="login-card" onSubmit={login}>
      <div className="brand-mark">QR</div>
      <p className="eyebrow">STUDENT SERVICES</p><h1>Student Information System</h1>
      <p className="muted">Sign in to manage student records and QR codes.</p>
      <label>Username<input value={credentials.username} onChange={e => setCredentials({ ...credentials, username: e.target.value })} required /></label>
      <label>Password<input type="password" value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })} required /></label>
      <button className="primary full">Sign in</button>
      <p className="hint">Demo: admin / admin123</p>{message && <p className="notice">{message}</p>}
    </form>
  </main>

  return <div className="app-shell">
    <header className="topbar"><div className="logo">QR</div><div><p className="eyebrow">CAMPUS DIGITAL TOOLS</p><h1>Student Information Management</h1></div><button className="secondary logout" onClick={() => { sessionStorage.removeItem('studentAdmin'); setLoggedIn(false) }}>Log out</button></header>
    <section className="hero"><div><p className="eyebrow light">QR CODE-BASED STUDENT INFORMATION MANAGEMENT SYSTEM</p><h2>Every student record, one scan away.</h2><p>Manage student profiles, create QR codes, and verify records quickly.</p></div><div className="hero-art"><span>▦</span><small>SCAN · VERIFY · MANAGE</small></div></section>
    {message && <div className="notice message">{message}<button onClick={() => setMessage('')} aria-label="Dismiss">×</button></div>}
    <div className="stats"><div className="stat"><span>Total students</span><strong>{students.length}</strong></div><div className="stat"><span>Matching search</span><strong>{filtered.length}</strong></div><div className="stat"><span>QR verification</span><strong>Ready</strong></div></div>
    <div className="main-grid">
      <section className="panel"><div className="panel-heading"><div><p className="eyebrow">RECORD MANAGEMENT</p><h2>{editing ? 'Edit student' : 'Add a student'}</h2></div><span className="step">{editing ? 'EDIT' : '01'}</span></div>
        <form className="student-form" onSubmit={saveStudent}>
          {[['name','Full name'],['rollNo','Roll number'],['department','Department / Branch'],['section','Section'],['course','Course'],['contact','Contact number'],['email','Email address']].map(([key,label]) => <label key={key}>{label}{key === 'email' ? <input type="email" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /> : <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required={['name','rollNo','department'].includes(key)} />}</label>)}
          <div className="form-actions"><button className="primary">{editing ? 'Save changes' : 'Add student'}</button><button type="button" className="secondary" onClick={() => { setForm(empty); setEditing(null) }}>Clear</button></div>
        </form>
      </section>
      <section className="panel scan-panel"><div className="panel-heading"><div><p className="eyebrow">QUICK VERIFICATION</p><h2>Scan student QR</h2></div><span className="step">02</span></div>
        <p className="muted">Scan a student QR code with your camera, or enter the roll number manually.</p>
        <div className="scan-entry"><input value={scanText} onChange={e => setScanText(e.target.value)} placeholder="Roll number or STUDENT_ROLL:..." onKeyDown={e => e.key === 'Enter' && lookupRoll(scanText)} /><button className="primary" onClick={() => lookupRoll(scanText)}>Verify</button></div>
        <button className="secondary camera-button" onClick={() => setScannerOn(v => !v)}>{scannerOn ? 'Stop camera scanner' : 'Open camera scanner'}</button>
        {scannerOn && <div id="qr-reader" className="qr-reader" />}
        {selected && <div className="verified-card"><div className="verified-head"><span className="check">✓</span><div><small>VERIFIED STUDENT</small><h3>{selected.name}</h3></div></div><div className="details">{[['Roll number',selected.rollNo],['Department',selected.department],['Section',selected.section],['Course',selected.course],['Contact',selected.contact],['Email',selected.email]].map(([k,v]) => <div key={k}><span>{k}</span><strong>{v || '—'}</strong></div>)}</div><button className="secondary" onClick={() => setSelected(null)}>Close details</button></div>}
      </section>
    </div>
    <section className="panel records-panel"><div className="panel-heading records-heading"><div><p className="eyebrow">STUDENT DIRECTORY</p><h2>All student records</h2></div><input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, roll no, branch..." /></div>
      {filtered.length === 0 ? <div className="empty"><span>▤</span><h3>No student records yet</h3><p>Add a student using the form above.</p></div> : <div className="table-wrap"><table><thead><tr><th>Student</th><th>Roll number</th><th>Department</th><th>Section</th><th>QR code</th><th>Actions</th></tr></thead><tbody>{filtered.map(s => <tr key={s.id}><td><strong>{s.name}</strong><small>{s.email || 'No email added'}</small></td><td>{s.rollNo}</td><td>{s.department}</td><td>{s.section || '—'}</td><td><button className="text-button" onClick={() => setSelected(s)}>Preview QR</button></td><td><div className="row-actions"><button className="text-button" onClick={() => editStudent(s)}>Edit</button><button className="text-button danger" onClick={() => deleteStudent(s)}>Delete</button></div></td></tr>)}</tbody></table></div>}
    </section>
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="qr-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)}>×</button><p className="eyebrow">STUDENT QR CODE</p><h2>{selected.name}</h2><p className="muted">{selected.rollNo}</p><div className="qr-image"><QRCode value={`STUDENT_ROLL:${selected.rollNo}`} size={190} /></div><p className="hint">Scan to look up the student's record in this application.</p><button className="primary" onClick={() => window.print()}>Print QR / Save as PDF</button></div></div>}
    <footer>Student QR Management · React · Spring Boot · MySQL</footer>
  </div>
}
export default App
