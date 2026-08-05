'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Button from '@/components/ui/Button'
import {
  IconCamera, IconGallery, IconSearch, IconEdit, IconTrash, IconCheck,
  IconInfo, IconAlertCircle,
} from '@/components/ui/icons'
import { CaptureContext, MEAL_SAVED_EVENT } from './CaptureContext'

type Dish = {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

type AnalysisResult = {
  dishes: Dish[]
  total: { calories: number; protein: number; carbs: number; fat: number }
  notes: string
  healthScore?: number
  assessment?: string
}

type Step = 'idle' | 'analyzing' | 'error' | 'result'

const inputClass = 'w-full box-border h-[38px] rounded-md bg-surface shadow-hairline border-none outline-none px-3 text-base text-primary mb-2'

export default function CaptureProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [imgBase64, setImgBase64] = useState('')
  const [imgMime, setImgMime] = useState('image/jpeg')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const [savedMealId, setSavedMealId] = useState<string | null>(null)
  const [autoSaving, setAutoSaving] = useState(false)

  const [showKoreksi, setShowKoreksi] = useState(false)
  const [koreksiText, setKoreksiText] = useState('')
  const [reanalyzing, setReanalyzing] = useState(false)

  const [showFullEdit, setShowFullEdit] = useState(false)
  const [editResult, setEditResult] = useState<AnalysisResult | null>(null)
  const [patchingManual, setPatchingManual] = useState(false)

  function authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${localStorage.getItem('nl_token') ?? ''}` }
  }

  function handle401() {
    localStorage.removeItem('nl_token')
    localStorage.removeItem('nl_user')
    router.replace('/login')
  }

  function compressImage(file: File): Promise<{ base64: string; mime: string }> {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = e => {
        const img = new Image()
        img.onload = () => {
          const maxW = 1280
          const scale = img.width > maxW ? maxW / img.width : 1
          const canvas = document.createElement('canvas')
          canvas.width = img.width * scale
          canvas.height = img.height * scale
          const ctx = canvas.getContext('2d')
          if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg' })
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  function makeThumbnail(dataUrl: string): Promise<string> {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const maxW = 300
        const scale = img.width > maxW ? maxW / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.5))
      }
      img.src = dataUrl
    })
  }

  function resetState() {
    setStep('idle')
    setImgBase64('')
    setImgMime('image/jpeg')
    setImageDataUrl('')
    setResult(null)
    setError('')
    setSavedMealId(null)
    setAutoSaving(false)
    setShowKoreksi(false)
    setKoreksiText('')
    setReanalyzing(false)
    setShowFullEdit(false)
    setEditResult(null)
    setPatchingManual(false)
  }

  function closeOverlay() {
    if (savedMealId) window.dispatchEvent(new Event(MEAL_SAVED_EVENT))
    resetState()
  }

  function openCaptureMenu() {
    setMenuOpen(true)
  }

  function closeCaptureMenu() {
    setMenuOpen(false)
  }

  function pickCamera() {
    closeCaptureMenu()
    cameraRef.current?.click()
  }

  function pickGallery() {
    closeCaptureMenu()
    galleryRef.current?.click()
  }

  async function handleFile(file: File) {
    resetState()
    const reader = new FileReader()
    reader.onload = async e => {
      const preview = e.target?.result as string
      setImageDataUrl(preview)
      const { base64, mime } = await compressImage(file)
      setImgBase64(base64)
      setImgMime(mime)
      setStep('analyzing')
      await doAnalyze(base64, mime, preview)
    }
    reader.readAsDataURL(file)
  }

  function recalc(dishes: Dish[]) {
    return {
      calories: dishes.reduce((s, d) => s + d.calories, 0),
      protein: dishes.reduce((s, d) => s + d.protein, 0),
      carbs: dishes.reduce((s, d) => s + d.carbs, 0),
      fat: dishes.reduce((s, d) => s + d.fat, 0),
    }
  }

  async function autoSaveNew(analysis: AnalysisResult, imgDataUrl: string) {
    setAutoSaving(true)
    try {
      const thumbnail = imgDataUrl ? await makeThumbnail(imgDataUrl) : null
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, imageDataUrl: thumbnail }),
      })
      if (res.status === 401) { handle401(); return }
      if (!res.ok) { toast.error('Gagal menyimpan ke riwayat'); return }
      const data = await res.json() as { meal?: { id: string } }
      setSavedMealId(data.meal?.id ?? null)
      toast.success('Tersimpan otomatis ke riwayat')
    } catch {
      toast.error('Gagal menyimpan ke riwayat')
    } finally {
      setAutoSaving(false)
    }
  }

  async function patchMeal(analysis: AnalysisResult) {
    if (!savedMealId) return
    const res = await fetch(`/api/history?id=${savedMealId}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis }),
    })
    if (res.status === 401) { handle401(); return }
    if (!res.ok) throw new Error('patch failed')
  }

  async function analyzeWithCorrection() {
    if (!imgBase64 || !koreksiText.trim()) return
    setReanalyzing(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imgBase64, mimeType: imgMime, correction: koreksiText }),
      })
      const data = await res.json() as { analysis?: AnalysisResult; error?: string }
      if (res.status === 401) { handle401(); return }
      if (res.status === 429) { toast.error(data.error ?? 'Batas analisa harian tercapai'); return }
      if (!res.ok) { toast.error(data.error ?? 'Analisa ulang gagal'); return }
      if (!data.analysis) { toast.error('Analisa ulang gagal'); return }

      const analysis: AnalysisResult = data.analysis
      setResult(analysis)
      setShowKoreksi(false)
      setKoreksiText('')
      await patchMeal(analysis)
      toast.success('Hasil koreksi diperbarui')
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setReanalyzing(false)
    }
  }

  async function applyManualEdit() {
    if (!editResult) return
    setPatchingManual(true)
    try {
      const total = recalc(editResult.dishes)
      const updated: AnalysisResult = { ...editResult, total }
      setResult(updated)
      setShowFullEdit(false)
      setEditResult(null)
      await patchMeal(updated)
      toast.success('Menu & nutrisi diperbarui')
    } catch {
      toast.error('Gagal memperbarui riwayat')
    } finally {
      setPatchingManual(false)
    }
  }

  async function doAnalyze(base64: string, mime: string, dataUrl: string) {
    setError('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: mime }),
      })
      const data = await res.json() as { analysis?: AnalysisResult; error?: string }
      if (res.status === 401) { handle401(); return }
      if (res.status === 429) { setError(data.error ?? 'Batas analisa harian tercapai'); setStep('error'); return }
      if (!res.ok || !data.analysis) { setError(data.error ?? 'Analisa gagal'); setStep('error'); return }

      const analysis: AnalysisResult = data.analysis
      setResult(analysis)
      setStep('result')
      await autoSaveNew(analysis, dataUrl)
    } catch {
      setError('Tidak dapat terhubung ke server')
      setStep('error')
    }
  }

  function retryAnalyze() {
    if (!imgBase64) { closeOverlay(); return }
    setStep('analyzing')
    doAnalyze(imgBase64, imgMime, imageDataUrl)
  }

  function openFullEdit() {
    if (!result) return
    setEditResult(JSON.parse(JSON.stringify(result)) as AnalysisResult)
    setShowFullEdit(true)
    setShowKoreksi(false)
  }

  function healthScoreInfo(score: number) {
    const color = score >= 8 ? 'var(--color-success)' : score >= 6 ? 'var(--color-warning)' : 'var(--color-danger)'
    const label = score >= 8 ? 'Sangat Baik' : score >= 6 ? 'Cukup Baik' : 'Kurang Baik'
    return { color, label }
  }

  const macroBadge = (label: string, value: string, color: string) => (
    <div key={label} className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xl font-semibold" style={{ color }}>{value}</span>
      <span className="text-2xs text-secondary uppercase tracking-[0.4px]">{label}</span>
    </div>
  )

  return (
    <CaptureContext.Provider value={{ openCaptureMenu }}>
      {children}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {menuOpen && (
        <div
          onClick={closeCaptureMenu}
          className="absolute inset-0 z-[250]"
          style={{ background: 'var(--color-bg-scrim)' }}
        >
          <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 182 }}>
            <button
              onClick={e => { e.stopPropagation(); pickCamera() }}
              aria-label="Ambil Foto"
              className="w-[52px] h-[52px] rounded-full bg-surface shadow-md flex items-center justify-center cursor-pointer"
            >
              <IconCamera size={20} color="var(--color-text-primary)" />
            </button>
            <span className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-sm font-medium text-primary bg-surface shadow-sm px-3 py-1.5 rounded-sm" style={{ right: 'calc(100% + 12px)' }}>
              Ambil Foto
            </span>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 114 }}>
            <button
              onClick={e => { e.stopPropagation(); pickGallery() }}
              aria-label="Pilih dari Galeri"
              className="w-[52px] h-[52px] rounded-full bg-surface shadow-md flex items-center justify-center cursor-pointer"
            >
              <IconGallery size={20} color="var(--color-text-primary)" />
            </button>
            <span className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-sm font-medium text-primary bg-surface shadow-sm px-3 py-1.5 rounded-sm" style={{ right: 'calc(100% + 12px)' }}>
              Pilih dari Galeri
            </span>
          </div>
        </div>
      )}

      {step !== 'idle' && (
        <div className="absolute inset-0 z-[260] bg-page flex flex-col">
          {step !== 'analyzing' && (
            <ScreenHeader
              title={step === 'result' ? 'Hasil Analisa' : 'Analisis Gagal'}
              onBack={closeOverlay}
            />
          )}

          <div className="flex-1 overflow-auto px-4 pt-4 pb-10">
            {step === 'analyzing' && (
              <div className="flex flex-col items-center justify-center gap-3.5 text-center py-16 h-full">
                <div
                  className="w-16 h-16 rounded-full animate-spin"
                  style={{ border: '3px solid var(--color-border-default)', borderTopColor: 'var(--color-bg-brand)' }}
                />
                <div className="text-lg font-semibold text-primary mt-2">Menganalisis makanan…</div>
                <div className="text-sm text-secondary">AI sedang menghitung kandungan gizi</div>
              </div>
            )}

            {step === 'error' && (
              <div className="flex flex-col items-center justify-center gap-3 text-center py-14 px-4">
                <IconAlertCircle size={40} color="var(--color-danger)" />
                <div className="text-lg font-semibold text-primary">Analisis Gagal</div>
                <div className="text-sm text-secondary leading-normal max-w-[280px]">{error}</div>
                <div className="w-full max-w-[260px] mt-2 flex flex-col gap-2.5">
                  <Button onClick={retryAnalyze}>Analisis Ulang Makanan</Button>
                  <Button variant="outline" onClick={closeOverlay}>Tutup</Button>
                </div>
              </div>
            )}

            {step === 'result' && result && (
              <>
                {imageDataUrl && (
                  <div className="relative rounded-2xl overflow-hidden mb-[18px]" style={{ maxHeight: 220 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageDataUrl} alt="Foto makanan" className="w-full block object-cover" style={{ maxHeight: 220 }} />
                    <div
                      className="absolute bottom-2.5 right-2.5 rounded-md px-2.5 py-1 text-xs font-semibold"
                      style={{
                        background: autoSaving ? 'rgba(36,30,25,.6)' : 'var(--color-bg-brand-tint)',
                        color: autoSaving ? '#fff' : 'var(--color-text-brand)',
                      }}
                    >
                      {autoSaving ? 'Menyimpan...' : 'Tersimpan'}
                    </div>
                  </div>
                )}

                {showFullEdit && editResult && (
                  <div className="bg-surface shadow-hairline rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-start mb-3.5">
                      <div>
                        <div className="text-base font-semibold text-primary">Edit Menu</div>
                        <div className="text-xs text-secondary mt-0.5">Nutrisi dihitung ulang otomatis setelah disimpan</div>
                      </div>
                      <button
                        onClick={() => { setShowFullEdit(false); setEditResult(null) }}
                        className="text-xs font-medium text-secondary bg-muted px-3 py-1.5 rounded-sm cursor-pointer shrink-0"
                      >
                        ✕ Batal
                      </button>
                    </div>

                    {editResult.dishes.map((dish, i) => (
                      <div key={i} className="bg-sunken rounded-lg p-3 mb-2.5">
                        <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-2">Menu {i + 1}</div>
                        <div className="text-2xs text-secondary mb-1">Nama</div>
                        <input className={inputClass} value={dish.name}
                          onChange={e => {
                            const dishes = editResult.dishes.map((d, j) => j === i ? { ...d, name: e.target.value } : d)
                            setEditResult({ ...editResult, dishes })
                          }} />
                        <div className="text-2xs text-secondary mb-1">Porsi</div>
                        <input className={inputClass} value={dish.portion}
                          onChange={e => {
                            const dishes = editResult.dishes.map((d, j) => j === i ? { ...d, portion: e.target.value } : d)
                            setEditResult({ ...editResult, dishes })
                          }} />
                        <div className="flex flex-wrap gap-2">
                          {(['calories', 'protein', 'carbs', 'fat'] as const).map(key => (
                            <div key={key} style={{ width: 'calc(50% - 4px)' }}>
                              <div className="text-2xs text-secondary mb-1">
                                {key === 'calories' ? 'Kalori (kkal)' : key === 'protein' ? 'Protein (g)' : key === 'carbs' ? 'Karbo (g)' : 'Lemak (g)'}
                              </div>
                              <input type="number" inputMode="decimal" className={inputClass} value={dish[key]}
                                onChange={e => {
                                  const dishes = editResult.dishes.map((d, j) => j === i ? { ...d, [key]: parseFloat(e.target.value) || 0 } : d)
                                  setEditResult({ ...editResult, dishes })
                                }} />
                            </div>
                          ))}
                        </div>
                        {editResult.dishes.length > 1 && (
                          <button
                            onClick={() => setEditResult({ ...editResult, dishes: editResult.dishes.filter((_, j) => j !== i) })}
                            className="flex items-center gap-1.5 mt-2.5 cursor-pointer"
                          >
                            <IconTrash size={13} color="var(--color-danger)" />
                            <span className="text-xs" style={{ color: 'var(--color-danger)' }}>Hapus menu ini</span>
                          </button>
                        )}
                      </div>
                    ))}

                    <div className="mb-3">
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => setEditResult({ ...editResult, dishes: [...editResult.dishes, { name: '', portion: '', calories: 0, protein: 0, carbs: 0, fat: 0 }] })}
                      >
                        + Tambah Menu
                      </Button>
                    </div>

                    <Button onClick={applyManualEdit} loading={patchingManual} icon={<IconCheck size={16} color="#fff" />}>
                      Terapkan & Simpan
                    </Button>
                  </div>
                )}

                {!showFullEdit && (
                  <>
                    <div className="bg-surface shadow-hairline rounded-lg px-4 py-3.5 mb-4">
                      <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-3.5">Total Kandungan Gizi</div>
                      <div className="flex justify-between gap-2 mb-3.5">
                        {macroBadge('Kalori', String(result.total.calories), 'var(--color-kcal)')}
                        {macroBadge('Protein', `${result.total.protein.toFixed(1)}g`, 'var(--color-protein)')}
                        {macroBadge('Karbo', `${result.total.carbs.toFixed(1)}g`, 'var(--color-carbs)')}
                        {macroBadge('Lemak', `${result.total.fat.toFixed(1)}g`, 'var(--color-fat)')}
                      </div>
                      {!!result.healthScore && (
                        <div className="flex items-center gap-2 bg-muted rounded-sm px-3 py-2 mb-2.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: healthScoreInfo(result.healthScore).color }} />
                          <span className="text-xs font-semibold" style={{ color: healthScoreInfo(result.healthScore).color }}>
                            Health Score {result.healthScore}/10
                          </span>
                          <span className="text-xs text-secondary">· {healthScoreInfo(result.healthScore).label}</span>
                        </div>
                      )}
                      {result.assessment && <div className="text-sm text-secondary leading-normal">{result.assessment}</div>}
                    </div>

                    <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-2.5">
                      Menu Terdeteksi ({result.dishes.length})
                    </div>
                    {result.dishes.map((dish, i) => (
                      <div key={i} className="bg-surface shadow-hairline rounded-lg px-3.5 py-3 mb-2">
                        <div className="flex justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-base font-medium text-primary">{dish.name}</div>
                            <div className="text-xs text-secondary mt-0.5">{dish.portion}</div>
                          </div>
                          <div className="text-base font-semibold whitespace-nowrap" style={{ color: 'var(--color-kcal)' }}>{dish.calories} Kkal</div>
                        </div>
                        <div className="flex gap-3.5 mt-2">
                          <span className="text-xs" style={{ color: 'var(--color-protein)' }}>P: {dish.protein}g</span>
                          <span className="text-xs" style={{ color: 'var(--color-carbs)' }}>K: {dish.carbs}g</span>
                          <span className="text-xs" style={{ color: 'var(--color-fat)' }}>L: {dish.fat}g</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <div className="flex gap-2.5 bg-muted rounded-md px-3.5 py-3 my-3.5 mb-5">
                  <IconInfo size={16} color="var(--color-text-secondary)" className="shrink-0 mt-0.5" />
                  <span className="text-xs text-secondary leading-normal">
                    <b className="text-primary">Disclaimer:</b> Hasil analisa foto ini sepenuhnya dihasilkan oleh AI dan dapat mengandung ketidaktepatan.
                  </span>
                </div>

                {!showFullEdit && (
                  <div className="flex flex-col gap-2.5">
                    {!showKoreksi ? (
                      <button
                        onClick={() => setShowKoreksi(true)}
                        className="w-full h-12 rounded-md bg-brand-tint flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <IconEdit size={16} color="var(--color-text-brand)" />
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-brand)' }}>Koreksi Hasil Analisa</span>
                      </button>
                    ) : (
                      <div className="bg-surface shadow-hairline rounded-lg p-4 mb-2.5">
                        <div className="flex justify-between items-start mb-3">
                          <div className="text-base font-semibold text-primary">Koreksi Hasil Analisa</div>
                          <button onClick={() => { setShowKoreksi(false); setKoreksiText('') }} className="text-xs text-secondary bg-muted px-2.5 py-1 rounded-sm cursor-pointer">✕</button>
                        </div>

                        <div className="bg-sunken rounded-lg p-3.5 mb-2.5">
                          <div className="mb-2.5">
                            <div className="text-sm font-semibold text-primary">Nama/deskripsi makanan salah?</div>
                            <div className="text-xs text-secondary">AI akan analisa ulang berdasarkan koreksimu</div>
                          </div>
                          <textarea
                            value={koreksiText}
                            onChange={e => setKoreksiText(e.target.value)}
                            placeholder="Contoh: Ini nasi goreng kampung dengan telur, bukan nasi putih biasa..."
                            className="w-full box-border rounded-md bg-surface shadow-hairline border-none outline-none px-3 py-2.5 text-base text-primary resize-none mb-2.5"
                            style={{ minHeight: 70 }}
                          />
                          {koreksiText.trim() && (
                            <Button size="md" loading={reanalyzing} icon={<IconSearch size={16} color="#fff" />} onClick={analyzeWithCorrection}>
                              Analisis Ulang
                            </Button>
                          )}
                        </div>

                        <div className="bg-sunken rounded-lg p-3.5">
                          <div className="mb-2.5">
                            <div className="text-sm font-semibold text-primary">Edit menu &amp; angka nutrisi manual</div>
                            <div className="text-xs text-secondary">Ubah nama, porsi, kalori, protein, karbo, lemak langsung</div>
                          </div>
                          <Button variant="outline" size="md" onClick={openFullEdit}>Buka Editor Manual</Button>
                        </div>
                      </div>
                    )}

                    <Button variant="outline" onClick={closeOverlay}>Foto Makanan Lain</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </CaptureContext.Provider>
  )
}
