import dynamic from 'next/dynamic'

const ReviziaForm = dynamic(() => import('@/components/ReviziaForm'), {
  ssr: false,
  loading: () => <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Načítavam...</div>,
})

export default function ReviziaPage() {
  return <ReviziaForm />
}
